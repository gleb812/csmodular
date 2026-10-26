// components/MiniVU.js
import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class MiniVU extends BaseComponent {
    constructor(x, y, width = 6, height = 15) {
        super(x, y, width, height);

        // ⭐ Связь с источником (только Output или Input модуля)
        this.sourceComponentId = null;
        this.sourceChannel = null;   // Csound-канал (генерируется)

        // ⭐ Пороги зон (0..1 по уровню RMS)
        // TODO: сопоставить с NM2
        this.thresholdGreen = 0.5;   // ниже — зелёная
        this.thresholdYellow = 0.8;  // ниже — жёлтая, выше — красная

        // ⭐ Сглаживание отображения (0..1)
        this.smoothing = 0.3;
        this._displayLevel = 0;

        this.isInteractive = true;
        this.supportsDrag = false;
    }

    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;

        // ⭐ Читаем уровень из CsoundEngine
        let targetLevel = 0;
        if (this.sourceChannel && window.modularSystem?.csoundEngine) {
            const v = window.modularSystem.csoundEngine.getLedValue?.(this.sourceChannel) || 0;
            targetLevel = Math.max(0, Math.min(1, v));
        }
        // Сглаживание
        this._displayLevel += (targetLevel - this._displayLevel) * this.smoothing;

        // === ФОН ===
        if (isLcd) {
            ctx.fillStyle = theme.getAccentAlpha(0.05);
            ctx.fillRect(this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = '#111';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        // === ЗАЛИВКА ПО УРОВНЮ (снизу вверх) ===
        const fillH = this.height * this._displayLevel;
        if (fillH > 0) {
            const fillY = this.y + this.height - fillH;

            if (isLcd) {
                // LCD: монохром — просто закраска accent-цветом
                ctx.fillStyle = theme.getAccentColor();
                theme.applyGlow(ctx);
                ctx.fillRect(this.x, fillY, this.width, fillH);
                theme.clearGlow(ctx);
            } else {
                // Classic: три зоны
                const greenH  = this.height * this.thresholdGreen;
                const yellowH = this.height * this.thresholdYellow;
                const redH    = this.height;

                // Сколько залить в каждой зоне
                const fillGreen  = Math.min(fillH, greenH);
                const fillYellow = Math.min(Math.max(fillH - greenH, 0), yellowH - greenH);
                const fillRed    = Math.max(fillH - yellowH, 0);

                // Зелёная (снизу)
                if (fillGreen > 0) {
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(this.x, this.y + this.height - fillGreen,
                                 this.width, fillGreen);
                }
                // Жёлтая (середина)
                if (fillYellow > 0) {
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(this.x, this.y + this.height - greenH - fillYellow,
                                 this.width, fillYellow);
                }
                // Красная (сверху)
                if (fillRed > 0) {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(this.x, this.y + this.height - yellowH - fillRed,
                                 this.width, fillRed);
                }
            }
        }

        // === РАМКА ===
        if (isLcd) {
            ctx.strokeStyle = theme.getAccentColor();
            ctx.lineWidth = theme.lineWidth(1);
            theme.applyGlow(ctx);
            ctx.strokeRect(this.x, this.y, this.width, this.height);
            theme.clearGlow(ctx);
        } else {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }

    getPropertiesForExport() {
        const props = {
            width: this.width,
            height: this.height,
        };
        if (this.sourceComponentId !== null && this.sourceComponentId !== undefined) {
            props.sourceComponentId = String(this.sourceComponentId);
        }
        return props;
    }

    static getPropertySchema() {
        return [
            {
                key: 'sourceComponentId',
                label: 'Source',
                type: 'select',
                optionsFrom: 'ioComponents',
                help: 'Which input or output this VU monitors (audio only)',
            },
            {
                key: 'thresholdGreen',
                label: 'Green up to',
                type: 'number',
                min: 0, max: 1, step: 0.01,
                help: 'Level (0..1) below which the bar is green',
            },
            {
                key: 'thresholdYellow',
                label: 'Yellow up to',
                type: 'number',
                min: 0, max: 1, step: 0.01,
                help: 'Level (0..1) below which the bar is yellow; above — red',
            },
        ];
    }
}