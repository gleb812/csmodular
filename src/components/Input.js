// src/components/Input.js
import { BaseJack } from './BaseJack.js';

export class Input extends BaseJack {
    constructor(x, y, config = {}) {
        super(x, y, {
            ...config,
            direction: 'input'
        });
    }
    
    draw(ctx) {
        const center = this.center;
        const outerColor = this.typeColors[this.type] || this.typeColors.other;
        
        // Внешний круг
        ctx.fillStyle = outerColor;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Обводка
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Центр (цвет кабеля)
        ctx.fillStyle = this.centerColor;
        ctx.beginPath();
        ctx.arc(center.x, center.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Обводка центра
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.5;
        ctx.stroke();
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