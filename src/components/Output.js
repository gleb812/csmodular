// src/components/Output.js
import { BaseJack } from './BaseJack.js';

export class Output extends BaseJack {
    constructor(x, y, config = {}) {
        super(x, y, {
            ...config,
            direction: 'output'
        });
    }
    
    draw(ctx) {
        const center = this.center;
        const outerColor = this.typeColors[this.type];
        const squareSize = 10;
        const squareX = center.x - squareSize / 2;
        const squareY = center.y - squareSize / 2;
        
        // Внешний квадрат
        ctx.fillStyle = outerColor;
        ctx.fillRect(squareX, squareY, squareSize, squareSize);
        
        // Обводка квадрата
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(squareX, squareY, squareSize, squareSize);
        
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