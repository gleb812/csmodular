// components/GraphSimple.js
import { BaseComponent } from './BaseComponent.js';

export class Graph extends BaseComponent {
    constructor(x, y, width = 200, height = 150) {
        super(x, y, width, height);
    }
    
    draw(ctx) {
        // Темный фон
        ctx.fillStyle = '#111';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Текст-заглушка
        ctx.fillStyle = '#444';
        ctx.font = '8px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            'GRAPH',
            this.x + this.width/2,
            this.y + this.height/2
        );
        
        // Рамка
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}