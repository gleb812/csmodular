import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class ButtonText extends BaseComponent {
    static FIXED_HEIGHT = 13;

    constructor(
        x,
        y,
        width = 20,
        text = 'M',
        initialState = true,
        height = ButtonText.FIXED_HEIGHT,
        mode = 'toggle',           // 'toggle' | 'momentary'
        returnState = false,       // used only in 'momentary'
    ) {
        super(x, y, width, height);

        this.isInteractive = true;
        this.supportsDrag = false;

        this.text = text;
        this.isActive = initialState;
        this.mode = (mode === 'momentary') ? 'momentary' : 'toggle';
        this.returnState = Boolean(returnState);

        // Csound integration
        this.csoundChannel = null;
        this.onToggle = null;

        // Tooltip
        this.showTooltip = false;
        this.tooltipTimeout = null;
        this.tooltipDelay = 300;

        // Press animation
        this.animationProgress = 0;
        this.animationDuration = 150;
    }

    // --- helpers ---

    getActualHeight() {
        return this.height;
    }

    // --- draw ---

    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const accent = theme.getAccentColor();

        ctx.save();

        // Press animation (visual feedback only)
        let scale = 1;
        let offsetY = 0;
        if (this.isPressed) {
            const progress = this.animationProgress / this.animationDuration;
            scale = 1 - 0.1 * Math.sin(progress * Math.PI);
            offsetY = 1 * Math.sin(progress * Math.PI);
        }

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const drawX = centerX - (this.width * scale) / 2;
        const drawY = centerY - (this.height * scale) / 2 + offsetY;
        const drawWidth = this.width * scale;
        const drawHeight = this.height * scale;

        const radius = 2;

        // === FILL ===
        if (isLcd) {
            let intensity;
            if (this.isActive) {
                intensity = this.isPressed ? 0.25 : 0.15;
            } else {
                intensity = this.isPressed ? 0.08 : 0.03;
            }
            ctx.fillStyle = theme.getAccentAlpha(intensity);
        } else {
            if (this.isActive) {
                ctx.fillStyle = this.isPressed ? '#3730a3' : '#4f46e5';
            } else {
                ctx.fillStyle = this.isPressed ? '#111827' : '#1f2937';
            }
        }
        this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
        ctx.fill();

        // === BORDER ===
        if (isLcd) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = this.isActive
                ? theme.lineWidth(2)
                : theme.lineWidth(0.8);
            if (this.isActive) theme.applyGlow(ctx);
        } else {
            ctx.strokeStyle = this.isActive ? '#6366f1' : '#4b5563';
            ctx.lineWidth = 1;
        }
        this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
        ctx.stroke();
        theme.clearGlow(ctx);

        // === TEXT ===
        if (isLcd) {
            ctx.fillStyle = accent;
            ctx.font = this.isActive
                ? 'bold 10px Arial, sans-serif'
                : '9px Arial, sans-serif';
            if (this.isActive) theme.applyGlow(ctx);
        } else {
            ctx.fillStyle = this.isActive ? '#ffffff' : '#d1d5db';
            ctx.font = 'bold 10px Arial, sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, centerX, centerY + offsetY);
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

        ctx.restore();
    }

    drawTooltip(ctx) {
        ctx.save();
        const stateText = this.isActive ? 'ON' : 'OFF';
        const modeSuffix = this.mode === 'momentary' ? ' (momentary)' : '';
        const tooltipText = `${this.text}: ${stateText}${modeSuffix}`;
        const padding = 10;
        const tooltipHeight = 25;
        const tooltipX = this.x + this.width / 2;
        const tooltipY = this.y - tooltipHeight - 10;

        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(tooltipText).width;
        const tooltipWidth = textWidth + padding * 2;

        ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(
                tooltipX - tooltipWidth / 2,
                tooltipY,
                tooltipWidth,
                tooltipHeight,
                5,
            );
        } else {
            ctx.rect(tooltipX - tooltipWidth / 2, tooltipY, tooltipWidth, tooltipHeight);
        }
        ctx.fill();

        ctx.strokeStyle = '#666';
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.fillText(tooltipText, tooltipX, tooltipY + tooltipHeight / 2);
        ctx.restore();
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    // --- click / press ---

    handleClick(x, y) {
        if (!this.isPointInside(x, y)) return false;

        if (this.mode === 'toggle') {
            this.toggle();
            this.startAnimation();
            return {
                type: 'component-click',
                component: this,
                componentType: 'button-text',
            };
        }

        // ⭐ momentary: set active = !returnState while mouse is down,
        //    restore in handleMouseUp. No toggle on click.
        const pressedValue = !this.returnState;
        this.setActive(pressedValue);
        this.startAnimation();

        return {
            type: 'component-click',
            component: this,
            componentType: 'button-text',
            momentary: true,
        };
    }

    /**
     * Called by EventManager on mouseup (if `momentary`).
     * Restores state to `returnState`.
     */
    handleMouseUp() {
        if (this.mode !== 'momentary') return;
        this.setActive(this.returnState);
    }

    toggle() {
        const oldState = this.isActive;
        this.isActive = !this.isActive;

        if (window.csound && this.csoundChannel) {
            const csoundValue = this.isActive ? 1 : 0;
            window.csound.setControlChannel(this.csoundChannel, csoundValue)
                .then(() => {}, () => {});
        }
        if (this.onToggle) {
            this.onToggle(this.isActive, this.text, oldState);
        }
    }

    startAnimation() {
        this.isPressed = true;
        this.animationProgress = this.animationDuration;
        const animate = () => {
            this.animationProgress -= 16;
            if (this.animationProgress <= 0) {
                this.animationProgress = 0;
                this.isPressed = false;
            } else {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    // --- state / tooltip ---

    handleMouseMove(x, y) {
        const wasHovered = this.isHovered;
        super.handleMouseMove(x, y);

        if (!wasHovered && this.isHovered) {
            this.clearTooltipTimeout();
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltip = true;
            }, this.tooltipDelay);
        } else if (wasHovered && !this.isHovered) {
            this.hideTooltip();
        }
    }

    hideTooltip() {
        this.clearTooltipTimeout();
        this.showTooltip = false;
    }

    clearTooltipTimeout() {
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }

    // --- state control ---

    setActive(state) {
        const oldState = this.isActive;
        this.isActive = Boolean(state);

        if (this.isActive === oldState) return;

        if (window.csound && this.csoundChannel) {
            const csoundValue = this.isActive ? 1 : 0;
            window.csound.setControlChannel(this.csoundChannel, csoundValue)
                .then(() => {}, () => {});
        }
        if (this.onToggle) {
            this.onToggle(this.isActive, this.text, oldState);
        }
    }

    setStateDirect(state) {
        this.isActive = Boolean(state);
    }

    getState() {
        return {
            active: this.isActive,
            text: this.text,
            mode: this.mode,
            returnState: this.returnState,
        };
    }

    // --- helpers ---

    isButtonActive() {
        return this.isActive;
    }

    setText(newText) {
        this.text = newText;
    }

    getText() {
        return this.text;
    }

    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }

    destroy() {
        this.clearTooltipTimeout();
    }

    // --- MIDI Learn ---

    applyMidiValue(ccValue) {
        // In toggle mode: any CC > 63 → ON, else OFF.
        // In momentary mode: same, but external callers can ignore.
        this.setActive(Number(ccValue) > 63);
    }

    // --- editor schema ---

    static getPropertySchema() {
        return [
            {
                key: 'size',
                label: 'Size (W × H)',
                type: 'size',
                minWidth: 20, maxWidth: 300,
                minHeight: 10, maxHeight: 60,
            },
            {
                key: 'text',
                label: 'Text',
                type: 'text',
            },
            {
                key: 'mode',
                label: 'Mode',
                type: 'select',
                options: [
                    { value: 'toggle',    label: 'Toggle (click to flip)' },
                    { value: 'momentary', label: 'Momentary (hold to activate)' },
                ],
                afterChange: (comp, v) => {
                    comp.mode = (v === 'momentary') ? 'momentary' : 'toggle';
                },
            },
            {
                key: 'returnState',
                label: 'Return to (momentary)',
                type: 'checkbox',
                afterChange: (comp, v) => {
                    comp.returnState = Boolean(v);
                },
            },
            {
                key: 'isActive',
                label: 'Default (ON)',
                type: 'checkbox',
            },
        ];
    }
}