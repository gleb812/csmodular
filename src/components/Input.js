// src/components/Input.js
import { BaseJack } from './BaseJack.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class Input extends BaseJack {
    constructor(x, y, config = {}) {
        super(x, y, {
            ...config,
            direction: 'input'
        });
    }
    
    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const center = this.center;
        const style = theme.getJackStyle(this.type);

        // === ВНЕШНИЙ КРУГ ===
        if (isLcd) {
            // LCD: аудио — залито, остальные — только контур
            if (style.fill) {
                ctx.fillStyle = style.fill;
                theme.applyGlow(ctx);
                ctx.beginPath();
                ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
                ctx.fill();
                theme.clearGlow(ctx);
            }

            // Контур — всегда
            ctx.strokeStyle = style.stroke;
            ctx.lineWidth = style.strokeWidth;
            if (style.glow) theme.applyGlow(ctx);
            ctx.beginPath();
            ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
            ctx.stroke();
            theme.clearGlow(ctx);
        } else {
            // Classic
            const outerColor = this.typeColors[this.type] || this.typeColors.other;
            ctx.fillStyle = outerColor;
            ctx.beginPath();
            ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // === ЦЕНТР (там где кабель) ===
        if (isLcd) {
            // В LCD: центр рисуем ТОЛЬКО если джек подключён
            if (this.connected) {
                ctx.fillStyle = style.centerFill;
                theme.applyGlow(ctx);
                ctx.beginPath();
                ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                theme.clearGlow(ctx);
            }
            // Если не подключён — НЕ рисуем центр (остаётся прозрачная дырка)
        } else {
            // Classic: центр всегда есть
            ctx.fillStyle = this.centerColor;
            ctx.beginPath();
            ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Обводка центра
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }
    
    // Фабричные методы для удобства
    static audio(x, y, label = '', config = {}) {
        return new Input(x, y, { jackType: 'audio', label, ...config });
    }
    
    static control(x, y, label = '', config = {}) {
        return new Input(x, y, { jackType: 'control', label, ...config });
    }
    
    static logic(x, y, label = '', config = {}) {
        return new Input(x, y, { jackType: 'logic', label, ...config });
    }
    
    static other(x, y, label = '', config = {}) {
        return new Input(x, y, { jackType: 'other', label, ...config });
    }

}