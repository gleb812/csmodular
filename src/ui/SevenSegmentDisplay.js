// src/ui/SevenSegmentDisplay.js
// Семисегментный индикатор на canvas.
// Рисует строку цифр в стиле LED/LCD. Не интерактивен — только отображение.

const SEGMENTS = {
    // a,b,c,d,e,f,g
    '0': [1,1,1,1,1,1,0],
    '1': [0,1,1,0,0,0,0],
    '2': [1,1,0,1,1,0,1],
    '3': [1,1,1,1,0,0,1],
    '4': [0,1,1,0,0,1,1],
    '5': [1,0,1,1,0,1,1],
    '6': [1,0,1,1,1,1,1],
    '7': [1,1,1,0,0,0,0],
    '8': [1,1,1,1,1,1,1],
    '9': [1,1,1,1,0,1,1],
    '-': [0,0,0,0,0,0,1],
    ' ': [0,0,0,0,0,0,0],
};

export class SevenSegmentDisplay {
    constructor({ digits = 3, color = '#ff3b30', offColor = 'rgba(255,59,48,0.08)' } = {}) {
        this.digits = digits;
        this.color = color;
        this.offColor = offColor;
        this.canvas = document.createElement('canvas');
        this.canvas.style.display = 'block';
        this._text = '0'.repeat(digits);
        this._dpr = window.devicePixelRatio || 1;
        this._resize();
    }

    get element() { return this.canvas; }

    setText(text) {
        const s = String(text ?? '').padStart(this.digits, ' ').slice(-this.digits);
        if (s === this._text) return;
        this._text = s;
        this.draw();
    }

    setColor(color) {
        this.color = color;
        this.draw();
    }

    _resize() {
        const dpr = this._dpr;
        // Высота цифры ~ 40px, ширина ~ 24px, + gap
        const digitW = 22, digitH = 40, gap = 4, pad = 4;
        const w = this.digits * digitW + (this.digits - 1) * gap + pad * 2;
        const h = digitH + pad * 2;
        this.canvas.width  = Math.round(w * dpr);
        this.canvas.height = Math.round(h * dpr);
        this.canvas.style.width  = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this._ctx = this.canvas.getContext('2d');
        this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._geom = { digitW, digitH, gap, pad };
        this.draw();
    }

    draw() {
        const ctx = this._ctx;
        if (!ctx) return;
        const { digitW, digitH, gap, pad } = this._geom;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.digits; i++) {
            const ch = this._text[i] || ' ';
            const x = pad + i * (digitW + gap);
            const y = pad;
            this._drawDigit(ctx, x, y, digitW, digitH, SEGMENTS[ch] || SEGMENTS[' ']);
        }
    }

    _drawDigit(ctx, x, y, w, h, segs) {
        const t = Math.max(3, Math.round(h * 0.10));   // толщина сегмента
        const [a,b,c,d,e,f,g] = segs;
        const p = (on) => {
            ctx.fillStyle = on ? this.color : this.offColor;
            if (on) {
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 8;
            } else {
                ctx.shadowBlur = 0;
            }
        };
        const rect = (rx, ry, rw, rh) => { ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.fill(); };

        ctx.save();
        // a: верх
        p(a); rect(x + t,         y,                 w - 2*t, t);
        // b: правый верх
        p(b); rect(x + w - t,     y + t,             t,       h/2 - t - t/2);
        // c: правый низ
        p(c); rect(x + w - t,     y + h/2 + t/2,     t,       h/2 - t - t/2);
        // d: низ
        p(d); rect(x + t,         y + h - t,         w - 2*t, t);
        // e: левый низ
        p(e); rect(x,             y + h/2 + t/2,     t,       h/2 - t - t/2);
        // f: левый верх
        p(f); rect(x,             y + t,             t,       h/2 - t - t/2);
        // g: центр
        p(g); rect(x + t,         y + h/2 - t/2,     w - 2*t, t);
        ctx.restore();
    }
}