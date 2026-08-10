// components/ButtonIncDec.js
import { BaseComponent } from './BaseComponent.js';

export class ButtonIncDec extends BaseComponent {
    constructor(x, y, width = 40, items = 'Item1,Item2,Item3,Item4', initialIndex = 0) {
        // Высота фиксированная как у ButtonText
        super(x, y, width, 13);
        
        this.isInteractive = true;
        this.supportsDrag = false;
        
        // Парсим строку элементов (как в ButtonRadio)
        this.items = items.split(',');
        this.currentIndex = Math.max(0, Math.min(initialIndex, this.items.length - 1));
        this.currentItem = this.items[this.currentIndex];
        
        // Размеры стрелок
        this.arrowWidth = 10;
        this.arrowHeight = 4;
        this.arrowPadding = 0;
        
        this.leftOffset = -5;

        // Csound-интеграция
        this.csoundChannel = null;
        this.onChange = null;
        
        console.log(`ButtonIncDec created: ${this.items.length} items, current: "${this.currentItem}"`);
    }
    
    draw(ctx) {
        ctx.save();
        // === 1. ОСНОВНОЙ ПРЯМОУГОЛЬНИК ===
        const radius = 2;
        
        // Фон
        if (this.isPressed) {
            ctx.fillStyle = '#4f46e5';
        } else if (this.isHovered) {
            ctx.fillStyle = '#4a5568';
        } else {
            ctx.fillStyle = '#2d3748';
        }
        
        // Всегда используем drawRoundedRect (без roundRect)
        this.drawRoundedRect(ctx, this.x, this.y, this.width, 13, radius);
        ctx.fill();
        
        // Рамка
        ctx.strokeStyle = this.isHovered ? '#0af' : '#666';
        ctx.lineWidth = 1;
        this.drawRoundedRect(ctx, this.x, this.y, this.width, 13, radius);
        ctx.stroke();
        
        // === 2. ТЕКСТ ТЕКУЩЕГО ЭЛЕМЕНТА ===
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Текст с отступом слева
        const textX = this.x + 3;
        const textY = this.y + 13 / 2;
        ctx.fillText(this.currentItem, textX, textY);
        
        // === 3. СТРЕЛКИ ВВЕРХ/ВНИЗ (справа) ===
        const arrowsX = this.x + this.width - this.arrowWidth - 4;
        const upY = this.y + 1;
        const downY = this.y + 13 - this.arrowHeight - 1;
        
        // Стрелка вверх
        this.drawArrow(ctx, arrowsX, upY, 'up', 
            this.isArrowUpHovered ? '#0af' : '#888');
        
        // Стрелка вниз
        this.drawArrow(ctx, arrowsX, downY, 'down', 
            this.isArrowDownHovered ? '#0af' : '#888');
        
        // === 4. ИНДИКАТОР ПОЗИЦИИ (как в ButtonFlat) ===
        if (this.items.length > 1) {
            ctx.save(); // ← Изолируем индикатор
            
            const indicatorWidth = this.width / this.items.length;
            ctx.fillStyle = this.isHovered ? '#0af' : '#4f46e5';
            ctx.fillRect(
                this.x + this.currentIndex * indicatorWidth,
                this.y + 13 - 2,
                indicatorWidth,
                2
            );
            
            ctx.restore(); // ← Восстанавливаем
        }
        
        ctx.restore(); // ← Восстанавливаем контекст
    }
    
    drawArrow(ctx, x, y, direction, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        
        if (direction === 'up') {
            // Стрелка вверх: ▼ (но перевернутая)
            ctx.moveTo(x + this.arrowWidth/2, y);
            ctx.lineTo(x + this.arrowWidth, y + this.arrowHeight);
            ctx.lineTo(x, y + this.arrowHeight);
        } else {
            // Стрелка вниз: ▲
            ctx.moveTo(x, y);
            ctx.lineTo(x + this.arrowWidth, y);
            ctx.lineTo(x + this.arrowWidth/2, y + this.arrowHeight);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
    
    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
    
    // === ОБРАБОТКА СОБЫТИЙ ===
    
    handleClick(x, y) {
        if (this.isPointInside(x, y)) {
            console.log(`🔼🔽 ButtonIncDec.handleClick at (${x}, ${y})`);
            
            // Проверяем, по какой стрелке кликнули
            const arrowsX = this.x + this.width - this.arrowWidth - 4;
            const upY = this.y + 1;
            const downY = this.y + 13 - this.arrowHeight - 1;
            
            // Область стрелки вверх
            const isUpArrow = x >= arrowsX && x <= arrowsX + this.arrowWidth &&
                             y >= upY && y <= upY + this.arrowHeight;
            
            // Область стрелки вниз
            const isDownArrow = x >= arrowsX && x <= arrowsX + this.arrowWidth &&
                               y >= downY && y <= downY + this.arrowHeight;
            
            if (isUpArrow) {
                this.increment();
                this.isArrowUpPressed = true;
            } else if (isDownArrow) {
                this.decrement();
                this.isArrowDownPressed = true;
            } else {
                // Клик по текстовой части - переключаем на следующее
                this.increment();
                this.isPressed = true;
            }
            
            // Сбрасываем состояние нажатия
            setTimeout(() => {
                this.isPressed = false;
                this.isArrowUpPressed = false;
                this.isArrowDownPressed = false;
            }, 150);
            
            return {
                type: 'component-click',
                component: this,
                componentType: 'button-incdec'
            };
        }
        return false;
    }
    
    handleMouseMove(x, y) {
        const wasHovered = this.isHovered;
        this.isHovered = this.isPointInside(x, y);
        
        // Определяем hover над стрелками
        const arrowsX = this.x + this.width - this.arrowWidth - 4;
        const upY = this.y + 1;
        const downY = this.y + 13 - this.arrowHeight - 1;
        
        this.isArrowUpHovered = x >= arrowsX && x <= arrowsX + this.arrowWidth &&
                               y >= upY && y <= upY + this.arrowHeight;
        
        this.isArrowDownHovered = x >= arrowsX && x <= arrowsX + this.arrowWidth &&
                                 y >= downY && y <= downY + this.arrowHeight;
        
        // Логируем изменение состояния
        if (wasHovered !== this.isHovered) {
            console.log(`🎯 ButtonIncDec "${this.currentItem}":`, {
                state: this.isHovered ? 'HOVERED' : 'UNHOVERED',
                index: `${this.currentIndex + 1}/${this.items.length}`,
                arrowUpHover: this.isArrowUpHovered ? '✅' : '❌',
                arrowDownHover: this.isArrowDownHovered ? '✅' : '❌'
            });
        }
        
        return wasHovered !== this.isHovered;
    }
    
    // === МЕТОДЫ ИНКРЕМЕНТА/ДЕКРЕМЕНТА ===
    
    increment() {
        const oldIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex + 1) % this.items.length;
        this.currentItem = this.items[this.currentIndex];
        
        this.sendToCsound();
        this.callOnChange(oldIndex);
        
        console.log(`🔼 Increment: "${this.currentItem}" (${this.currentIndex + 1}/${this.items.length})`);
    }
    
    decrement() {
        const oldIndex = this.currentIndex;
        this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
        this.currentItem = this.items[this.currentIndex];
        
        this.sendToCsound();
        this.callOnChange(oldIndex);
        
        console.log(`🔽 Decrement: "${this.currentItem}" (${this.currentIndex + 1}/${this.items.length})`);
    }
    
    sendToCsound() {
        if (window.csound && this.csoundChannel) {
            window.csound.setControlChannel(this.csoundChannel, this.currentIndex)
                .then(() => {}, () => {});
        }
    }
    
    callOnChange(oldIndex) {
        if (this.onChange && this.currentIndex !== oldIndex) {
            this.onChange(this.currentIndex, this.currentItem, oldIndex);
        }
    }
    
    // === МЕТОДЫ УПРАВЛЕНИЯ СОСТОЯНИЕМ ===
    
    setIndex(index) {
        const oldIndex = this.currentIndex;
        this.currentIndex = Math.max(0, Math.min(this.items.length - 1, index));
        this.currentItem = this.items[this.currentIndex];
        
        if (this.currentIndex !== oldIndex) {
            this.sendToCsound();
            if (this.onChange) {
                this.onChange(this.currentIndex, this.currentItem, oldIndex);
            }
        }
    }
    
    setValueDirect(index) {
        this.currentIndex = Math.max(0, Math.min(this.items.length - 1, index));
        this.currentItem = this.items[this.currentIndex];
    }
    
    setItem(itemName) {
        const index = this.items.indexOf(itemName);
        if (index !== -1) {
            this.setIndex(index);
        }
    }
    
    getState() {
        return {
            index: this.currentIndex,
            item: this.currentItem,
            items: [...this.items]
        };
    }
    
    // === Csound-ИНТЕГРАЦИЯ ===
    
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }
}

