// src/ui/IndicatorLamp.js
//
// Маленькая лампочка-индикатор для BottomBar (MIDI IN, MIDI OUT, OSC).
// 10×10 canvas, стиль берётся из темы (правило 11 из AI Context).

import { getCurrentTheme } from '../theme/currentTheme.js';

const PULSE_MS = 80;

export class IndicatorLamp {
    /**
     * @param {{ label?: string, color?: string, size?: number, title?: string }} opts
     */
    constructor(opts = {}) {
        this.label = opts.label || '';
        this.color = opts.color || '#3f3';
        this.size  = opts.size  || 10;
        this.title = opts.title || this.label;

        this.state = 'idle';            // 'idle' | 'ok' | 'error'
        this._pulseUntil = 0;

        this._canvas = document.createElement('canvas');
        this._canvas.width  = this.size;
        this._canvas.height = this.size;
        this._canvas.style.cssText =
            'display:block;image-rendering:pixelated;pointer-events:none;';
        this._canvas.title = this.title;

        this._el = document.createElement('div');
        this._el.style.cssText =
            'display:flex;align-items:center;gap:4px;padding:0 2px;';
        this._el.appendChild(this._canvas);

        if (this.label) {
            const t = document.createElement('span');
            t.textContent = this.label;
            t.style.cssText =
                "font:9px 'JetBrains Mono','Consolas',monospace;" +
                'opacity:.55;user-select:none;letter-spacing:.4px;';
            this._el.appendChild(t);
        }

        this.draw();
    }

    get element() { return this._el; }

    setState(s) {
        if (this.state === s) return;
        this.state = s;
        this.draw();
    }

    blink(ms = PULSE_MS) {
        this._pulseUntil = performance.now() + ms;
        this.draw();
    }

    isPulsing() {
        return performance.now() < this._pulseUntil;
    }

    draw() {
        const ctx = this._canvas.getContext('2d');
        const size = this.size;
        const theme = getCurrentTheme();
        const accent = theme.isLcd
            ? (theme.getAccentColor() || '#8fbc8f')
            : null;

        const active = this.isPulsing();

        let base;
        if (this.state === 'error') base = '#f44';
        else if (this.state === 'ok') base = this.color;
        else base = '#555';

        // LCD-тема — если активен, используем accent
        if (theme.isLcd && active) base = accent;

        const alpha = active
            ? 1
            : (this.state === 'idle' ? 0.25 : 0.55);

        ctx.clearRect(0, 0, size, size);

        if (theme.isLcd && (active || this.state === 'ok')) {
            ctx.shadowColor = base;
            ctx.shadowBlur = active ? 6 : 3;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = alpha;
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }
}