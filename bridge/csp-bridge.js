// bridge/csp-bridge.js
//
// Единый мост: HTTP (REST /csp/...) + WebSocket + UDP OSC in/out.
// Запуск:  node bridge/csp-bridge.js
// Пакеты:  ws, osc, express
//
// Порты:
//   HTTP+WS  :8765   (фиксированный — чтобы URL был предсказуем)
//   OSC in   :9000   (UDP, настраивается)
//   OSC out  :9001   (UDP, настраивается)

import express from 'express';
import { WebSocketServer } from 'ws';
import osc from 'osc';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

// ---------- config ----------

const HTTP_PORT = 8765;
let cfg = {
    inPort: 9000,
    outPort: 9001,
    outHost: '127.0.0.1',
};

// ---------- HTTP + WS ----------

const app = express();
app.use(express.json());

app.use((req, res, next) => {
    // CORS — разрешаем всё (локальный инструмент)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
    console.log('[WS] client connected');
    ws.on('message', (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }

        if (msg.type === 'osc-out' && udpOut) {
            try {
                udpOut.send(
                    { address: msg.address, args: (msg.args || []).map(_oscArg) },
                    '127.0.0.1',
                    cfg.outPort,
                );
            } catch (e) {
                console.warn('[WS] osc-out failed:', e.message);
            }
        }
    });
    ws.on('close', () => console.log('[WS] client disconnected'));
});

// ---------- OSC UDP ----------

let udpIn = null;
let udpOut = null;

function _oscArg(a) {
    // JSON → OSC-arg. Если уже объект { type, value } — оставить как есть.
    if (a && typeof a === 'object' && 'type' in a && 'value' in a) return a;
    if (typeof a === 'number') {
        return Number.isInteger(a)
            ? { type: 'i', value: a }
            : { type: 'f', value: a };
    }
    if (typeof a === 'string') return { type: 's', value: a };
    if (typeof a === 'boolean') return { type: 'T', value: a };  // True
    return { type: 's', value: String(a) };
}

function startOsc() {
    // --- IN ---
    if (udpIn) {
        try { udpIn.close(); } catch {}
        udpIn = null;
    }
    udpIn = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: cfg.inPort,
        metadata: true,
    });
    udpIn.on('error', (e) => console.error('[OSC in] error:', e.message));
    udpIn.on('ready', () => console.log(`[OSC in] listening on udp://0.0.0.0:${cfg.inPort}`));
    udpIn.on('message', (m, timeTag, info) => {
        const payload = JSON.stringify({
            type: 'osc',
            address: m.address,
            args: (m.args || []).map(a => a.value),
            from: `${info.address}:${info.port}`,
        });
        for (const c of wss.clients) {
            if (c.readyState === 1) c.send(payload);
        }
        // ⭐ параллельно — маппинг известных OSC-адресов на /csp/... команды
        _dispatchOscAsCsp(m);
    });
    udpIn.open();

    // --- OUT ---
    if (udpOut) {
        try { udpOut.close(); } catch {}
        udpOut = null;
    }
    udpOut = new osc.UDPPort({
        localAddress: '0.0.0.0',
        localPort: 0,
        remoteAddress: cfg.outHost,
        remotePort: cfg.outPort,
        metadata: true,
    });
    udpOut.on('error', (e) => console.error('[OSC out] error:', e.message));
    udpOut.on('ready', () => console.log(`[OSC out] → udp://${cfg.outHost}:${cfg.outPort}`));
    udpOut.open();
}

// OSC → csp-cmd (для известных адресов)
function _dispatchOscAsCsp(m) {
    const map = {
        '/csp/main/reset':    { cmd: 'main.reset' },
        '/csp/main/new':      { cmd: 'main.new' },
        '/csp/main/csound/start': { cmd: 'main.csound.start' },
        '/csp/main/csound/stop':  { cmd: 'main.csound.stop' },
    };
    const known = map[m.address];
    if (known) return broadcast({ type: 'csp-cmd', ...known });

    if (m.address === '/csp/module/add' && m.args.length >= 1) {
        return broadcast({
            type: 'csp-cmd', cmd: 'module.add',
            args: { type: String(m.args[0].value), layer: String(m.args[1]?.value || 'voice') },
        });
    }
    if (m.address === '/csp/midi/send' && m.args.length >= 3) {
        return broadcast({
            type: 'csp-cmd', cmd: 'midi.send',
            args: {
                status: m.args[0].value | 0,
                data1:  m.args[1].value | 0,
                data2:  m.args[2].value | 0,
            },
        });
    }
    if (m.address === '/csp/osc/send' && m.args.length >= 1) {
        return broadcast({
            type: 'csp-cmd', cmd: 'osc.send',
            args: {
                address: String(m.args[0].value),
                args: m.args.slice(1).map(a => a.value),
            },
        });
    }
}

// ---------- REST /csp ----------

function broadcast(obj) {
    let n = 0;
    const payload = JSON.stringify(obj);
    for (const c of wss.clients) {
        if (c.readyState === 1) { c.send(payload); n++; }
    }
    return { ok: true, queued: n };
}

// System
app.get('/csp/ping', (req, res) => res.json({ ok: true, ts: Date.now() }));
app.get('/csp/osc/config', (req, res) => res.json(cfg));
app.post('/csp/osc/config', (req, res) => {
    const { inPort, outPort, outHost } = req.body || {};
    if (Number.isInteger(inPort))   cfg.inPort  = inPort;
    if (Number.isInteger(outPort))  cfg.outPort = outPort;
    if (typeof outHost === 'string') cfg.outHost = outHost;
    startOsc();
    res.json({ ok: true, cfg });
});

// Main
app.post('/csp/main/reset',         (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'main.reset' })));
app.post('/csp/main/new',           (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'main.new' })));
app.post('/csp/main/save',          (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'main.save',  args: req.body || {} })));
app.post('/csp/main/load',          (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'main.load',  args: req.body || {} })));
app.post('/csp/main/csound/start',  (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'main.csound.start' })));
app.post('/csp/main/csound/stop',   (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'main.csound.stop' })));
app.get ('/csp/main/state',         (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'main.state' })));

// Modules
app.post('/csp/module/add',    (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'module.add',    args: req.body || {} })));
app.post('/csp/module/remove', (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'module.remove', args: req.body || {} })));
app.post('/csp/module/move',   (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'module.move',   args: req.body || {} })));
app.post('/csp/module/layer',  (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'module.layer',  args: req.body || {} })));

// Cables
app.post('/csp/cable/connect', (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'cable.connect', args: req.body || {} })));
app.post('/csp/cable/remove',  (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'cable.remove',  args: req.body || {} })));

// MIDI / OSC out
app.post('/csp/midi/send', (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'midi.send', args: req.body || {} })));
app.post('/csp/osc/send',  (req, res) => res.json(broadcast({ type: 'csp-cmd', cmd: 'osc.send',  args: req.body || {} })));

// ---------- start ----------

server.listen(HTTP_PORT, () => {
    console.log(`[HTTP] http://127.0.0.1:${HTTP_PORT}/csp/ping`);
    console.log(`[WS]   ws://127.0.0.1:${HTTP_PORT}/ws`);
});
startOsc();