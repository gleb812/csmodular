// components/Jack.js
import { BaseComponent } from './BaseComponent.js';

export class Jack extends BaseComponent {
    constructor(x, y, config = {}) {
        super(x, y, 12, 12);
        
        this.direction = config.direction || 'input';
        this.jackType = config.jackType || 'audio';
        this.label = config.label || '';
        this.connected = false;
        this.wireColor = null;
        
        // Цвета для внешних фигур
        this.colors = {
            audio: { 
                input: '#10b981',  // Зеленый для аудиовходов
                output: '#ef4444'  // Красный для аудиовыходов
            },
            cv: { 
                input: '#3b82f6',  // Синий для CV входов
                output: '#8b5cf6'  // Фиолетовый для CV выходов
            },
            gate: { 
                input: '#f59e0b',  // Оранжевый для входов гейта/триггера
                output: '#f59e0b'  // Оранжевый для выходов гейта/триггера
            }
        };
        
        // Обработчик подключения/отключения
        this.onConnectionChange = config.onConnectionChange || null;
        this.onClick = config.onClick || null;
    }
    
    draw(ctx) {
        const x = this.x + this.width / 2;
        const y = this.y + this.height / 2;
        const color = this.colors[this.jackType]?.[this.direction] || '#94a3b8';
        
        if (this.direction === 'output') {
            this.drawOutputJack(ctx, x, y, color);
        } else {
            this.drawInputJack(ctx, x, y, color);
        }
        
        // Если есть ховер, показываем подсветку
        if (this.isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    drawOutputJack(ctx, x, y, color) {
        // ВНЕШНИЙ КВАДРАТ (цветной)
        const squareSize = 10;
        const squareX = x - squareSize/2;
        const squareY = y - squareSize/2;
        
        // Рисуем квадрат с обводкой
        ctx.fillStyle = color;
        ctx.fillRect(squareX, squareY, squareSize, squareSize);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(squareX, squareY, squareSize, squareSize);
        
        // Внутренний круг с обводкой
        this.drawInnerCircle(ctx, x, y);
    }

    drawInputJack(ctx, x, y, color) {
        // ВНЕШНИЙ КРУГ (цветной)
        const outerRadius = 6;
        
        // Рисуем круг с обводкой
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, outerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Внутренний круг с обводкой
        this.drawInnerCircle(ctx, x, y);
    }

    drawInnerCircle(ctx, x, y) {
        const innerRadius = 2.5;
        const centerColor = this.connected ? (this.wireColor || '#ffffff') : '#000000';
        
        // Рисуем внутренний круг с обводкой
        ctx.fillStyle = centerColor;
        ctx.beginPath();
        ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    contains(mouseX, mouseY) {
        const x = this.x + this.width / 2;
        const y = this.y + this.height / 2;
        const dist = Math.sqrt((mouseX - x) ** 2 + (mouseY - y) ** 2);
        
        // Радиус захвата
        return dist < 8;
    }
    
    handleClick() {
        console.log(`Jack "${this.label}" (${this.direction}, ${this.jackType}) clicked`);
        
        // Вызываем пользовательский обработчик
        if (this.onClick) {
            this.onClick(this);
        }
        
        return true;
    }
    
    // Метод для подключения провода
    connect(wireColor = null) {
        this.connected = true;
        this.wireColor = wireColor;
        
        if (this.onConnectionChange) {
            this.onConnectionChange(this, true);
        }
    }
    
    // Метод для отключения провода
    disconnect() {
        this.connected = false;
        this.wireColor = null;
        
        if (this.onConnectionChange) {
            this.onConnectionChange(this, false);
        }
    }
    
    // Метод для установки цвета провода
    setWireColor(color) {
        if (this.connected) {
            this.wireColor = color;
        }
    }
    
    // Геттер для получения центральной точки (удобно для рисования проводов)
    get center() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2
        };
    }
    
    // Статический метод для создания джека по типу
    static createInput(x, y, jackType = 'audio', config = {}) {
        return new Jack(x, y, {
            direction: 'input',
            jackType,
            ...config
        });
    }
    
    static createOutput(x, y, jackType = 'audio', config = {}) {
        return new Jack(x, y, {
            direction: 'output',
            jackType,
            ...config
        });
    }
}