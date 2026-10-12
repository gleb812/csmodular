// src/components/Output.js
import { BaseJack } from './BaseJack.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class Output extends BaseJack {
    constructor(x, y, config = {}) {
        super(x, y, {
            ...config,
            direction: 'output'
        });
    }
    
    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const center = this.center;
        const style = theme.getJackStyle(this.type);
        const squareSize = 10;
        const squareX = center.x - squareSize / 2;
        const squareY = center.y - squareSize / 2;

        // === ВНЕШНИЙ КВАДРАТ ===
        if (isLcd) {
            // LCD: аудио — залито, остальные — только контур
            if (style.fill) {
                ctx.fillStyle = style.fill;
                theme.applyGlow(ctx);
                ctx.fillRect(squareX, squareY, squareSize, squareSize);
                theme.clearGlow(ctx);
            }

            // Контур — всегда
            ctx.strokeStyle = style.stroke;
            ctx.lineWidth = style.strokeWidth;
            if (style.glow) theme.applyGlow(ctx);
            ctx.strokeRect(squareX, squareY, squareSize, squareSize);
            theme.clearGlow(ctx);
        } else {
            // Classic
            const outerColor = this.typeColors[this.type];
            ctx.fillStyle = outerColor;
            ctx.fillRect(squareX, squareY, squareSize, squareSize);

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(squareX, squareY, squareSize, squareSize);
        }

        // === ЦЕНТР (там где кабель) ===
        if (isLcd) {
            // LCD: настоящая дырка в заливке внешнего квадрата.
            // Под джеком — прозрачный канвас, через который виден parallax-фон.
            ctx.save();
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            if (this.connected) {
                // Подключён — светящаяся точка в центре (перекрывает дырку)
                ctx.fillStyle = style.centerFill;
                theme.applyGlow(ctx);
                ctx.beginPath();
                ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
                ctx.fill();
                theme.clearGlow(ctx);
            } else {
                // Не подключён — тонкий ободок центрального кружка
                ctx.strokeStyle = style.stroke;
                ctx.lineWidth = style.strokeWidth;
                if (style.glow) theme.applyGlow(ctx);
                ctx.beginPath();
                ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
                ctx.stroke();
                theme.clearGlow(ctx);
            }
        } else {
            // Classic: подключён → цвет кабеля, отключён → чёрная дырка
            ctx.fillStyle = this.connected
                ? (this.centerColor || '#000000')
                : '#000000';
            ctx.beginPath();
            ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.5;
            ctx.stroke();
        }
    }
    
    // Фабричные методы для удобства
    static audio(x, y, label = '', config = {}) {
        return new Output(x, y, { jackType: 'audio', label, ...config });
    }
    
    static control(x, y, label = '', config = {}) {
        return new Output(x, y, { jackType: 'control', label, ...config });
    }
    
    static logic(x, y, label = '', config = {}) {
        return new Output(x, y, { jackType: 'logic', label, ...config });
    }
    
    static other(x, y, label = '', config = {}) {
        return new Output(x, y, { jackType: 'other', label, ...config });
    }

}