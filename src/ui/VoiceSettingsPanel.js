// src/ui/VoiceSettingsPanel.js
//
// Мини-панель настроек полифонии.
// Хранит { numVoices, mode } в localStorage 'csmodular:voices'.
// При Apply — system.setVoiceConfig() → stop + init Csound.

import { getCurrentTheme } from '../theme/currentTheme.js';

const LS_KEY = 'csmodular:voices';
const DEFAULTS = {
    numVoices: 8,
    mode: 'poly',   // 'poly' | 'unison'
};

export class VoiceSettingsPanel {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.settings = this._load();
        this.element = null;
        this._create();
    }

    static loadConfig() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return { ...DEFAULTS };
            const obj = JSON.parse(raw);
            const n = parseInt(obj.numVoices, 10);
            return {
                numVoices: Number.isFinite(n) ? Math.max(1, Math.min(8, n)) : DEFAULTS.numVoices,
                mode: (obj.mode === 'unison') ? 'unison' : 'poly',
            };
        } catch { return { ...DEFAULTS }; }
    }

    _load() {
        return VoiceSettingsPanel.loadConfig();
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
        el.id = 'voice-settings-panel';
        el.style.cssText = `
            position: fixed;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%);
            min-width: 280px;
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

        // Header
        const header = document.createElement('div');
        header.textContent = '● VOICES';
        header.style.cssText = `
            color:#fff;font-weight:bold;font-size:12px;
            margin-bottom:10px;padding-bottom:6px;
            border-bottom:1px solid rgba(255,255,255,0.15);
        `;
        el.appendChild(header);

        // Voices select 1..8
        const voicesSelect = document.createElement('select');
        for (let i = 1; i <= 8; i++) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = String(i);
            if (i === this.settings.numVoices) opt.selected = true;
            voicesSelect.appendChild(opt);
        }
        voicesSelect.style.cssText = `
            padding:4px 6px;background:#1a1a1a;
            border:1px solid ${this._rgba(accent, 0.3)};border-radius:4px;
            color:#eee;font-family:inherit;font-size:11px;outline:none;
            width:90px;
        `;
        this._voicesSelect = voicesSelect;
        el.appendChild(row('Voices', voicesSelect));

        // Mode select: Poly / Unison
        const modeSelect = document.createElement('select');
        [['poly', 'Poly'], ['unison', 'Unison']].forEach(([v, label]) => {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = label;
            if (v === this.settings.mode) opt.selected = true;
            modeSelect.appendChild(opt);
        });
        modeSelect.style.cssText = voicesSelect.style.cssText;
        this._modeSelect = modeSelect;
        el.appendChild(row('Mode', modeSelect));

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
            b.style.cssText = primary
                ? `
                padding:5px 14px;border-radius:5px;cursor:pointer;
                font-family:inherit;font-size:11px;font-weight:700;
                background:#fff;border:1px solid #fff;color:#000;
                `
                : `
                padding:5px 12px;border-radius:5px;cursor:pointer;
                font-family:inherit;font-size:11px;font-weight:600;
                background:#2a2a2a;border:1px solid #666;color:#eee;
                `;
            b.onclick = onClick;
            return b;
        };

        btnRow.appendChild(mkBtn('Close', () => this.hide()));
        btnRow.appendChild(mkBtn('Apply', () => this._apply(), true));
        el.appendChild(btnRow);

        document.body.appendChild(el);
        this.element = el;

        // Close on click outside
        document.addEventListener('pointerdown', (e) => {
            if (!this.isVisible) return;
            if (this.element.contains(e.target)) return;
            // Не закрывать, если клик по кнопке Vc (её переключение само закроет)
            if (e.target.closest('.bb-btn')?.textContent === 'Vc') return;
            this.hide();
        }, true);
    }

    _apply() {
        const numVoices = parseInt(this._voicesSelect.value, 10);
        const mode = (this._modeSelect.value === 'unison') ? 'unison' : 'poly';

        const next = { numVoices, mode };
        const prev = this.settings;

        // Если ничего не изменилось — просто закрываем
        if (prev.numVoices === numVoices && prev.mode === mode) {
            this._setStatus('no changes', '#888');
            this.hide();
            return;
        }

        this.settings = next;
        this._save();

        // Применяем
        if (typeof this.system.setVoiceConfig === 'function') {
            this._setStatus('restarting Csound…', '#fa0');
            this.system.setVoiceConfig(next)
                .then(() => {
                    this._setStatus('✓ applied', '#0f0');
                    setTimeout(() => this.hide(), 600);
                })
                .catch((err) => {
                    this._setStatus(`✗ ${err.message || 'failed'}`, '#f44');
                });
        } else {
            this._setStatus('✗ setVoiceConfig not available', '#f44');
        }
    }

    _setStatus(text, color = '#888') {
        if (!this._status) return;
        this._status.textContent = text;
        this._status.style.color = color;
    }

    show()   { this.element.style.display = 'block'; this.isVisible = true;  this.system?.bottomBar?.refreshState?.(); }
    hide()   { this.element.style.display = 'none';  this.isVisible = false; this.system?.bottomBar?.refreshState?.(); }
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