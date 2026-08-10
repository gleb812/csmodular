// components/Slider.js
import { BaseComponent } from './BaseComponent.js';

export class Slider extends BaseComponent {
    constructor(x, y, width = 12, height = 80, min = 0, max = 100, value = 50) {
        super(x, y, width, height);
        
        this.supportsDrag = true;
        this.isInteractive = true;
        
        this.min = min;
        this.max = max;
        this.value = value;
        
        // Просто прямоугольник для начала
        this.trackColor = '#475569';
        this.trackBorderColor = '#94a3b8';
        this.thumbColor = '#1e293b';
        this.thumbHeight = 6;
        
        // Перетаскивание
        this.isDragging = false;
        this.startValue = 0;
        this.startMouseY = 0;
        
        // Ховер
        this.isHovered = false;
        
        // Тултип
        this.showTooltip = false;
        this.tooltipTimeout = null;
    }
    
    // === ПРОСТОЙ DRAW ===
    draw(ctx) {
        // 1. Просто рисуем прямоугольник (трек)
        ctx.fillStyle = this.isHovered ? '#5a6b7e' : this.trackColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // 2. Обводка
        ctx.strokeStyle = this.trackBorderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // 3. Позиция ползунка (просто закрашенная часть)
        const normalizedValue = (this.value - this.min) / (this.max - this.min);
        const thumbY = this.y + (1 - normalizedValue) * (this.height - this.thumbHeight);
        
        // 4. Ползунок - просто темный прямоугольник
        ctx.fillStyle = this.isDragging ? '#2d3748' : this.thumbColor;
        ctx.fillRect(this.x + 1, thumbY, this.width - 2, this.thumbHeight);
        
        // 5. Тултип если нужно
        if (this.showTooltip || this.isDragging) {
            this.drawSimpleTooltip(ctx, thumbY);
        }
    }
    
    drawSimpleTooltip(ctx, thumbY) {
        const valueText = Math.round(this.value).toString();
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(valueText).width;
        
        const tooltipX = this.x + this.width / 2;
        const tooltipY = thumbY - 15;
        const tooltipWidth = textWidth + 10;
        const tooltipHeight = 20;
        
        // Фон
        ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.fillRect(
            tooltipX - tooltipWidth / 2,
            tooltipY,
            tooltipWidth,
            tooltipHeight
        );
        
        // Текст
        ctx.fillStyle = '#fff';
        ctx.fillText(valueText, tooltipX, tooltipY + tooltipHeight / 2);
    }
    
    // === ПРОСТАЯ ПРОВЕРКА HOVER ===
    handleMouseMove(x, y) {
        // Простая проверка попадания в прямоугольник
        const wasHovered = this.isHovered;
        const nowHovered = this.isPointInside(x, y);
        
        //console.log(`Slider handleMouseMove: x=${x}, y=${y}, inside=${nowHovered}, was=${wasHovered}`);
        
        if (nowHovered !== this.isHovered) {
            this.isHovered = nowHovered;
            
            if (this.isHovered && !wasHovered) {
                console.log("Slider: Mouse entered");
                this.clearTooltipTimeout();
                this.tooltipTimeout = setTimeout(() => {
                    this.showTooltip = true;
                }, 300);
            } else if (!this.isHovered && wasHovered) {
                console.log("Slider: Mouse left");
                this.hideTooltip();
            }
        }
        
        return this.isHovered;
    }
    
    // === ПРОСТОЙ CLICK И DRAG ===
    handleClick(x, y) {
        console.log(`Slider handleClick: x=${x}, y=${y}, inside=${this.isPointInside(x, y)}`);
        
        if (this.isPointInside(x, y)) {
            this.startDrag(x, y);
            
            // Сразу обновляем значение
            this.updateFromMouse(x, y);
            
            return {
                handleDrag: (x, y) => this.handleDrag(x, y),
                endDrag: () => this.endDrag(),
                type: 'component-drag',
                component: this,
                componentType: 'slider'
            };
        }
        return false;
    }
    
    startDrag(x, y) {
        console.log("Slider startDrag");
        this.isDragging = true;
        this.startValue = this.value;
        this.startMouseY = y;
        this.showTooltip = true;
        this.clearTooltipTimeout();
    }
    
    handleDrag(x, y) {
        if (!this.isDragging) return;
        console.log(`Slider handleDrag: y=${y}`);
        this.updateFromMouse(x, y);
    }
    
    updateFromMouse(x, y) {
        // Простая логика: мышь внизу = min, мышь вверху = max
        const relativeY = y - this.y;
        const normalized = 1 - Math.max(0, Math.min(1, relativeY / this.height));
        const newValue = this.min + normalized * (this.max - this.min);
        
        console.log(`Slider update: relativeY=${relativeY}, normalized=${normalized.toFixed(2)}, newValue=${newValue.toFixed(2)}`);
        
        this.setValue(newValue);
    }
    
    endDrag() {
        console.log("Slider endDrag");
        this.isDragging = false;
        
        // Через 0.5 сек скрываем тултип если не ховер
        setTimeout(() => {
            if (!this.isHovered) {
                this.showTooltip = false;
            }
        }, 500);
    }
    
    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
    hideTooltip() {
        this.clearTooltipTimeout();
        if (!this.isDragging) {
            this.showTooltip = false;
        }
    }
    
    clearTooltipTimeout() {
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }
    
    setValue(newValue) {
        const oldValue = this.value;
        const clampedValue = Math.max(this.min, Math.min(this.max, newValue));
        
        if (Math.abs(clampedValue - oldValue) > 0.001) {
            this.value = clampedValue;
            
            // Csound
            if (window.csound && this.csoundChannel) {
                window.csound.setControlChannel(this.csoundChannel, this.value)
                    .then(() => {}, () => {});
            }
            
            // Колбэк
            if (this.onChange) {
                this.onChange(this.value);
            }
        }
    }
    
    destroy() {
        this.clearTooltipTimeout();
    }
}