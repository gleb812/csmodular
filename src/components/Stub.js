// Stub.js - Компонент-заглушка для неподдерживаемых элементов
import { BaseComponent } from './BaseComponent.js';

export class Stub extends BaseComponent {
    constructor(x, y, width = 20, height = 20, originalType = 'Unknown', color = '#ff0000') {
        super(x, y, width, height);
        this.originalType = originalType;
        this.color = color;
    }
    
    draw(ctx) {
        // Красный квадрат
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Черная рамка
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Текст с типом компонента
        ctx.fillStyle = '#fff';
        ctx.font = '8px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Обрезаем текст если слишком длинный
        let text = this.originalType;
        if (text.length > 6) {
            text = text.substring(0, 6) + '...';
        }
        
        ctx.fillText(
            text,
            this.x + this.width/2,
            this.y + this.height/2
        );
    }
}
