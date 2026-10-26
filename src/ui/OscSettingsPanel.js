// src/ui/OscSettingsPanel.js
//
// Мини-панель настроек OSC-моста.
// Хранит { url, inPort, outPort } в localStorage 'csmodular:osc'.
// При Apply — POST /csp/osc/config на мост и reconnect WS.

import { getCurrentTheme } from '../theme/currentTheme.js';

const LS_KEY = 'csmodular:osc';
const DEFAULTS = {
    url: 'ws://127.0.0.1:8765/ws',
    inPort: 9000,
    outPort: 9001,
};

export class OscSettingsPanel {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.settings = this._load();
        this.element = null;
        this._create();
    }

    _load() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return { ...DEFAULTS };
            const obj = JSON.parse(raw);
            return { ...DEFAULTS, ...obj };
        } catch { return { ...DEFAULTS }; }
    }

    _save() {
        try { localStorage.setItem(LS_KEY, JSON.stringify(this.settings)); } catch {}
    }

    _create() {
        const theme = getCurrentTheme();
        const accent = theme.isLcd
            ? (theme.getAccentColor() || '#8fbc8f')
            : '#0af';

        const el = document.createElement('div');
        el.id = 'osc-settings-panel';
        el.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            min-width: 300px;
            background: rgba(20,20,25,0.95);
            border: 1px solid ${this._rgba(accent, 0.3)};
            border-radius: 10px;
            padding: 14px 16px;
            color: #ccc;
            font-family: 'JetBrains Mono','Consolas',monospace;
            font-size: 11px;
            z-index: 14500;
            backdrop-filter: blur(10px);
            display: none;
            user-select: none;
        `;

        const row = (label, input) => {
            const r = document.createElement('div');
            r.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px;';
            const l = document.createElement('span');
            l.textContent = label;
            l.style.cssText = 'flex:0 0 90px;color:#888;';
            r.appendChild(l);
            r.appendChild(input);
            return r;
        };

        const mkInput = (value, type = 'text', width = '160px') => {
            const i = document.createElement('input');
            i.type = type;
            i.value = value;
            i.style.cssText = `
                width:${width};padding:4px 6px;background:rgba(255,255,255,0.05);
                border:1px solid ${this._rgba(accent, 0.3)};border-radius:4px;
                color:#eee;font-family:inherit;font-size:11px;outline:none;
            `;
            return i;
        };

        // Header
        const header = document.createElement('div');
        header.textContent = '● OSC / CSP-BRIDGE';
        header.style.cssText = `
            color:${accent};font-weight:bold;margin-bottom:10px;padding-bottom:6px;
            border-bottom:1px solid ${this._rgba(accent, 0.2)};
        `;
        el.appendChild(header);

        this._urlInput = mkInput(this.settings.url, 'text', '220px');
        this._inInput  = mkInput(this.settings.inPort, 'number', '90px');
        this._outInput = mkInput(this.settings.outPort, 'number', '90px');

        el.appendChild(row('Bridge URL', this._urlInput));
        el.appendChild(row('OSC In port', this._inInput));
        el.appendChild(row('OSC Out port', this._outInput));

        // Status line
        this._status = document.createElement('div');
        this._status.style.cssText =
            'color:#888;font-size:10px;margin:8px 0 10px;min-height:14px;';
        el.appendChild(this._status);

        // Buttons
        const btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';

        const mkBtn = (label, onClick, primary = false) => {
            const b = document.createElement('button');
            b.textContent = label;
            b.style.cssText = `
                padding:5px 12px;border-radius:5px;cursor:pointer;
                font-family:inherit;font-size:11px;font-weight:600;
                background:${primary ? this._rgba(accent, 0.25) : 'transparent'};
                border:1px solid ${this._rgba(accent, primary ? 0.6 : 0.3)};
                color:${primary ? accent : '#aaa'};
            `;
            b.onclick = onClick;
            return b;
        };

        btnRow.appendChild(mkBtn('Close', () => this.hide()));
        btnRow.appendChild(mkBtn('Reconnect', () => this._reconnect()));
        btnRow.appendChild(mkBtn('Apply', () => this._apply(), true));
        el.appendChild(btnRow);

        document.body.appendChild(el);
        this.element = el;
    }

    _readInputs() {
        const url = (this._urlInput.value || '').trim() || DEFAULTS.url;
        const inPort  = parseInt(this._inInput.value, 10);
        const outPort = parseInt(this._outInput.value, 10);
        return {
            url,
            inPort:  Number.isFinite(inPort)  ? inPort  : DEFAULTS.inPort,
            outPort: Number.isFinite(outPort) ? outPort : DEFAULTS.outPort,
        };
    }

    async _apply() {
        const s = this._readInputs();
        this.settings = s;
        this._save();

        // 1. POST на мост — новые порты
        try {
            const base = this._httpBaseFromWs(s.url);
            const r = await fetch(`${base}/csp/osc/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inPort: s.inPort, outPort: s.outPort }),
            });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            this._setStatus('✓ bridge updated', '#0f0');
        } catch (err) {
            console.warn('[OscSettingsPanel] config POST failed:', err);
            this._setStatus('⚠ bridge unavailable, settings saved locally', '#fa0');
        }

        // 2. Reconnect WS
        await this._reconnect();
    }

    async _reconnect() {
        const s = this._readInputs();
        this.settings = s;
        this._save();

        const mgr = this.system?.oscManager;
        if (!mgr) { this._setStatus('✗ OscManager not initialized', '#f44'); return; }

        mgr.disconnect();
        this._setStatus('connecting…', '#fa0');
        const ok = await mgr.connect(s.url);
        if (ok) this._setStatus('✓ connected', '#0f0');
        else    this._setStatus('✗ connection failed', '#f44');
    }

    _httpBaseFromWs(wsUrl) {
        // ws://host:port/ws  →  http://host:port
        try {
            const u = new URL(wsUrl);
            const proto = u.protocol === 'wss:' ? 'https:' : 'http:';
            return `${proto}//${u.host}`;
        } catch {
            return 'http://127.0.0.1:8765';
        }
    }

    _setStatus(text, color = '#888') {
        if (!this._status) return;
        this._status.textContent = text;
        this._status.style.color = color;
    }

    show() { this.element.style.display = 'block'; this.isVisible = true; this.system?.bottomBar?.refreshState?.(); }
    hide() { this.element.style.display = 'none'; this.isVisible = false; this.system?.bottomBar?.refreshState?.(); }
    toggle() { this.isVisible ? this.hide() : this.show(); }

    _rgba(hex, alpha) {
        let h = String(hex || '#ffffff').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}