// components/ButtonFlat.js
//
// Two-state toggle: 0 = OFF, 1 = ON.
// Click anywhere → toggles between OFF and ON.
// Csound: sends 0 / 1 to `csoundChannel`.
//
// Editor schema: offLabel / onLabel (strings), selectedIndex (0 | 1).
// Legacy compatibility: `positions: [...]` / `labels: [...]` — first two entries
// are mapped to offLabel / onLabel; extra entries ignored.

import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class ButtonFlat extends BaseComponent {
    constructor(x, y, width = 80, height = 30, offLabel = 'OFF', onLabel = 'ON', defaultIndex = 0) {
        super(x, y, width, height);

        this.isInteractive = true;
        this.supportsDrag = false;

        this.offLabel = offLabel;
        this.onLabel = onLabel;
        this.selectedIndex = (defaultIndex === 1) ? 1 : 0;   // 0 | 1

        // Csound integration
        this.csoundChannel = null;
        this.onChange = null;

        // Tooltip
        this.showTooltip = false;
        this.tooltipTimeout = null;
        this.tooltipDelay = 300;

        // Press animation (same as original)
        this.isPressed = false;
    }

    // --- helpers ---

    get label() {
        return this.selectedIndex === 1 ? this.onLabel : this.offLabel;
    }

    get isOn() {
        return this.selectedIndex === 1;
    }

    /** Virtual `positions` array — kept for legacy callers / old modules. */
    get positions() {
        return [this.offLabel, this.onLabel];
    }

    /** Virtual `currentIndex` — mirrors `selectedIndex`. */
    get currentIndex() {
        return this.selectedIndex;
    }

    get currentLabel() {
        return this.label;
    }

    // --- draw ---

    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const accent = theme.getAccentColor();

        // === FILL ===
        if (isLcd) {
            ctx.fillStyle = this.isPressed
                ? theme.getAccentAlpha(0.25)
                : theme.getAccentAlpha(0.05);
        } else {
            ctx.fillStyle = this.isPressed ? '#4f46e5' : '#2d3748';
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // === BORDER ===
        if (isLcd) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = this.isPressed
                ? theme.lineWidth(2)
                : theme.lineWidth(0.8);
            if (this.isPressed) theme.applyGlow(ctx);
        } else {
            ctx.strokeStyle = this.isOn ? '#6366f1' : '#666';
            ctx.lineWidth = 1;
        }
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        theme.clearGlow(ctx);

        // === LABEL ===
        if (isLcd) {
            ctx.fillStyle = accent;
            ctx.font = this.isPressed
                ? 'bold 8px Arial, sans-serif'
                : '8px Arial, sans-serif';
            if (this.isPressed) theme.applyGlow(ctx);
        } else {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px Arial, sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.label,
            this.x + this.width / 2,
            this.y + this.height / 2
        );
        theme.clearGlow(ctx);

        // === POSITION INDICATOR (bottom stripe, 2 segments) ===
        const segmentWidth = this.width / 2;   // ⭐ always 2 segments
        const segX = this.x + this.selectedIndex * segmentWidth;
        if (isLcd) {
            ctx.fillStyle = accent;
            if (this.isPressed) theme.applyGlow(ctx);
        } else {
            ctx.fillStyle = '#4f46e5';
        }
        ctx.fillRect(segX, this.y + this.height - 3, segmentWidth, 2);
        theme.clearGlow(ctx);

        // === MIDI Learn indicator ===
        if (this.midiMapping) {
            ctx.save();
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(this.x + this.width - 3, this.y + 3, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // --- click ---

    handleClick(x, y) {
        if (!this.isPointInside(x, y)) return false;

        const old = this.selectedIndex;
        this.selectedIndex = (this.selectedIndex === 0) ? 1 : 0;

        // Press animation (same as original)
        this.isPressed = true;
        setTimeout(() => { this.isPressed = false; }, 150);

        // Csound
        if (window.csound && this.csoundChannel) {
            window.csound.setControlChannel(this.csoundChannel, this.selectedIndex)
                .then(() => {}, () => {});
        }

        // onChange
        if (this.onChange) {
            this.onChange(this.selectedIndex, this.label, old);
        }

        return {
            type: 'component-click',
            component: this,
            componentType: 'button-flat',
        };
    }

    handleMouseMove(x, y) {
        const wasHovered = this.isHovered;
        this.isHovered = this.isPointInside(x, y);
        return wasHovered !== this.isHovered;
    }

    // --- state ---

    setState(state) {
        const old = this.selectedIndex;
        const next = (typeof state === 'number')
            ? (state === 1 ? 1 : 0)
            : (typeof state === 'string' && (state.toLowerCase() === 'on' || state.toLowerCase() === '1') ? 1 : 0);

        this.selectedIndex = next;

        if (window.csound && this.csoundChannel) {
            window.csound.setControlChannel(this.csoundChannel, this.selectedIndex)
                .then(() => {}, () => {});
        }
        if (this.onChange && old !== next) {
            this.onChange(next, this.label, old);
        }
    }

    setStateDirect(state) {
        this.selectedIndex = (typeof state === 'number')
            ? (state === 1 ? 1 : 0)
            : (typeof state === 'string' && (state.toLowerCase() === 'on' || state.toLowerCase() === '1') ? 1 : 0);
    }

    getState() {
        return {
            index: this.selectedIndex,
            label: this.label,
            offLabel: this.offLabel,
            onLabel: this.onLabel,
        };
    }

    // --- Csound ---

    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }

    // --- MIDI ---

    applyMidiValue(ccValue) {
        // CC > 63 → ON, else OFF
        const next = (Number(ccValue) > 63) ? 1 : 0;
        if (next !== this.selectedIndex) this.setState(next);
    }

    // --- editor schema ---

    static getPropertySchema() {
        return [
            {
                key: 'offLabel',
                label: 'OFF Label',
                type: 'text',
                afterChange: (comp, v) => { comp.offLabel = String(v ?? 'OFF'); },
            },
            {
                key: 'onLabel',
                label: 'ON Label',
                type: 'text',
                afterChange: (comp, v) => { comp.onLabel = String(v ?? 'ON'); },
            },
            {
                key: 'selectedIndex',
                label: 'Default State',
                type: 'number',
                min: 0,
                max: 1,
                step: 1,
                afterChange: (comp, v) => {
                    comp.selectedIndex = (v === 1) ? 1 : 0;
                },
            },
        ];
    }
}