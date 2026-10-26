// src/midi/OscManager.js
//
// WebSocket-клиент к csp-bridge. Принимает OSC через мост (UDP → WS),
// отправляет OSC обратно (WS → UDP). Также принимает управляющие
// команды /csp/... (type: 'csp-cmd'), которые исполняет main.js.
//
// Состояние: 'idle' | 'connecting' | 'ready' | 'error'.

const DEFAULT_URL = 'ws://127.0.0.1:8765/ws';
const MAX_HISTORY = 50;
const RECONNECT_MS = 3000;

export class OscManager {
    constructor(opts = {}) {
        this.url = opts.url || DEFAULT_URL;
        this.state = 'idle';

        this.ws = null;
        this.history = [];
        this._lastMessage = null;
        this._lastMessageTime = 0;

        this._messageSubs = new Set();
        this._stateSubs   = new Set();
        this._controlSubs = new Set();   // csp-cmd

        this._autoReconnect = opts.autoReconnect !== false;
        this._reconnectTimer = null;
        this._manualClose = false;
    }

    // ---------- подписки ----------

    onMessage(cb)  { this._messageSubs.add(cb); return () => this._messageSubs.delete(cb); }
    onStateChange(cb){ this._stateSubs.add(cb); return () => this._stateSubs.delete(cb); }
    onControl(cb)  { this._controlSubs.add(cb); return () => this._controlSubs.delete(cb); }

    _setState(s) {
        if (this.state === s) return;
        this.state = s;
        this._stateSubs.forEach(cb => {
            try { cb(s, this.getInfo()); } catch (e) { console.error(e); }
        });
    }

    // ---------- подключение ----------

    async connect(url = this.url) {
        this.url = url;
        this._manualClose = false;

        if (this.ws && this.ws.readyState <= 1) return true;  // CONNECTING/OPEN

        this._setState('connecting');

        return new Promise((resolve) => {
            let ws;
            try {
                ws = new WebSocket(url);
            } catch (err) {
                console.error('[OscManager] WebSocket create failed:', err);
                this._setState('error');
                this._scheduleReconnect();
                return resolve(false);
            }
            this.ws = ws;

            ws.onopen = () => {
                console.log('[OscManager] ✓ connected:', url);
                this._setState('ready');
                resolve(true);
            };

            ws.onclose = () => {
                console.log('[OscManager] closed:', url);
                this.ws = null;
                if (this._manualClose) {
                    this._setState('idle');
                } else {
                    this._setState('error');
                    this._scheduleReconnect();
                }
                resolve(false);
            };

            ws.onerror = (err) => {
                console.warn('[OscManager] ws error', err);
                // onclose вызовется следом
            };

            ws.onmessage = (e) => this._onWsMessage(e);
        });
    }

    disconnect() {
        this._manualClose = true;
        if (this._reconnectTimer) {
            clearTimeout(this._reconnectTimer);
            this._reconnectTimer = null;
        }
        if (this.ws) {
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        this._setState('idle');
    }

    _scheduleReconnect() {
        if (!this._autoReconnect || this._manualClose) return;
        if (this._reconnectTimer) return;
        this._reconnectTimer = setTimeout(() => {
            this._reconnectTimer = null;
            this.connect(this.url);
        }, RECONNECT_MS);
    }

    // ---------- приём ----------

    _onWsMessage(event) {
        let msg;
        try { msg = JSON.parse(event.data); } catch { return; }

        if (msg.type === 'osc') {
            const evt = {
                time: performance.now(),
                address: msg.address,
                args: msg.args || [],
            };
            this.history.push(evt);
            if (this.history.length > MAX_HISTORY) this.history.shift();
            this._lastMessage = evt;
            this._lastMessageTime = performance.now();

            this._messageSubs.forEach(cb => {
                try { cb(evt); } catch (e) { console.error(e); }
            });
        } else if (msg.type === 'csp-cmd') {
            this._controlSubs.forEach(cb => {
                try { cb(msg); } catch (e) { console.error(e); }
            });
        }
    }

    // ---------- отправка ----------

    /**
     * Отправить OSC-сообщение через мост.
     * @returns {boolean} true, если WS открыт и сообщение ушло
     */
    send(address, args = []) {
        if (!this.ws || this.ws.readyState !== 1) return false;
        try {
            this.ws.send(JSON.stringify({ type: 'osc-out', address, args }));
            return true;
        } catch (err) {
            console.warn('[OscManager] send failed', err);
            return false;
        }
    }

    // ---------- инфо ----------

    getInfo() {
        return {
            state: this.state,
            url: this.url,
            historyLen: this.history.length,
            lastMessage: this._lastMessage,
            lastMessageTime: this._lastMessageTime,
        };
    }
}