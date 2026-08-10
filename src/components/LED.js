// components/LED.js
import { BaseComponent } from './BaseComponent.js';

export class LED extends BaseComponent {
    constructor(x, y, width = 20, height = 10) {
        super(x, y, width, height);
        this.state = false;
    }

    draw(ctx) {
        // Определяем цвета в зависимости от состояния
        let fillColor, strokeColor;
        
        if (this.state) {
            fillColor = '#0f0';     // ярко-зеленый заливка
            strokeColor = '#002200';   // чуть темнее зеленый для контура
        } else {
            fillColor = '#003300';  // темно-зеленый заливка
            strokeColor = '#002200'; // еще темнее для контура
        }
        
        // Рисуем заливку (тело LED)
        ctx.fillStyle = fillColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Рисуем контур (тоже зеленый, немного другой оттенок)
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }

    setState(state) {
        this.state = Boolean(state);
    }

    toggle() {
        this.state = !this.state;
        return this.state;
    }
    
    isOn() {
        return this.state;
    }
}