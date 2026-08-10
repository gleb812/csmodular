// components/MiniVU.js
import { BaseComponent } from './BaseComponent.js';

export class MiniVU extends BaseComponent {
    constructor(x, y, width = 200, height = 150) {
        super(x, y, width, height);
    }
    
    draw(ctx) {
        // Темный фон
        ctx.fillStyle = '#111';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Рамка
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}