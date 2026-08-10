// components/Line.js - Минимальные изменения
import { BaseComponent } from './BaseComponent.js';

export class Line extends BaseComponent {
    constructor(x, y, length = 50, orientation = 'Horizontal', thickness = 1, color = '#666666') {
        const width = orientation === 'Horizontal' ? length : thickness;
        const height = orientation === 'Vertical' ? length : thickness;
        
        super(x, y, width, height);
        
        this.isInteractive = false;
        this.supportsDrag = false;
        
        this.orientation = orientation;
        this.length = length;
        this.thickness = thickness;
        this.color = color;
        
        // Устанавливаем низкий zIndex, чтобы рисовался ПОД другими элементами
        this.zIndex = -10; // Отрицательное значение для фоновых элементов
    }
    
    draw(ctx) {
        ctx.save();
        
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.thickness;
        
        // Тонкая настройка позиционирования
        let startX, startY, endX, endY;
        
        if (this.orientation === 'Horizontal') {
            // Центрируем по вертикали
            startX = this.x;
            startY = this.y + this.thickness / 2;
            endX = this.x + this.length;
            endY = startY;
        } else {
            // Центрируем по горизонтали
            startX = this.x + this.thickness / 2;
            startY = this.y;
            endX = startX;
            endY = this.y + this.length;
        }
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        ctx.restore();
    }
}