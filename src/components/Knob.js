// components/Knob.js
import { BaseComponent } from './BaseComponent.js';

export class Knob extends BaseComponent {
    static SIZES = {
        SMALL: 'small',
        MEDIUM: 'medium', 
        BIG: 'big'
    };
    
    static SIZE_VALUES = {
        small: 18,
        medium: 20,
        big: 22
    };

    constructor(x, y, size = 'medium', min = 0, max = 100, value = 50, showZeroIndicator = false, infoFunc = 0) {
        let actualSize;
        
        if (typeof size === 'string') {
            actualSize = Knob.SIZE_VALUES[size] || Knob.SIZE_VALUES.medium;
        } else {
            actualSize = size;
        }
        
        super(x, y, actualSize, actualSize);

        this.supportsDrag = true;
        this.isInteractive = true;
        
        this.sizeParam = size;
        this.actualSize = actualSize;
        this.min = min;
        this.max = max;
        this.value = value;
        this.showZeroIndicator = showZeroIndicator;
        this.infoFunc = infoFunc;
        
        // Улучшенное состояние перетаскивания
        this.isDragging = false;
        this.startAngle = 0;
        this.startValue = 0;
        this.startMouseY = 0; // Добавляем для вертикального драга
        this.verticalSensitivity = 1.5; // Чувствительность по вертикали
        this.angularSensitivity = 3.0; // Множитель для угловой чувствительности
        
        this.onChange = null;
        this._changeListeners = [];

        // Тултип
        this.showTooltip = false;
        this.tooltipTimeout = null;
        this.tooltipDelay = 300;

        console.log(`🌀 Knob created: value = ${this.value}, infoFunc = ${this.infoFunc}`);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        
        // Фон ручки
        ctx.beginPath();
        ctx.arc(0, 0, this.width/2, 0, Math.PI * 2);
        ctx.fillStyle = this.isDragging ? '#e0e0e0' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = this.isHovered ? '#0af' : '#666';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Угол поворота на основе значения
        const angle = -Math.PI * 0.75 + (this.value - this.min) / (this.max - this.min) * Math.PI * 1.5;
        
        // Метка ручки
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -this.width/2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
        
        // Индикатор нуля
        if (this.showZeroIndicator) {
            this.drawZeroIndicator(ctx);
        }
        
        // Тултип с текущим значением
        if (this.showTooltip || this.isDragging) {
            this.drawTooltip(ctx);
        }
    }

    drawZeroIndicator(ctx) {
        ctx.save();
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;
        const radius = this.width/2;
        const triangleY = centerY - radius - 6;
        const triangleSize = 5;
        const isAtZero = Math.abs(this.value) < 1;
        
        ctx.fillStyle = isAtZero ? '#00FF00' : '#003000';
        ctx.beginPath();
        ctx.moveTo(centerX, triangleY + triangleSize);
        ctx.lineTo(centerX - triangleSize, triangleY);
        ctx.lineTo(centerX + triangleSize, triangleY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawTooltip(ctx) {
        const valueText = this.min >= 0 && this.max <= 1 ? 
            this.value.toFixed(2) : Math.round(this.value).toString();
        const padding = 10;
        const tooltipHeight = 25;
        const tooltipX = this.x + this.width / 2;
        const tooltipY = this.y - tooltipHeight - 10;
        
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(valueText).width;
        const tooltipWidth = textWidth + padding * 2;
        
        ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(
                tooltipX - tooltipWidth / 2,
                tooltipY,
                tooltipWidth,
                tooltipHeight,
                5
            );
        } else {
            ctx.rect(tooltipX - tooltipWidth / 2, tooltipY, tooltipWidth, tooltipHeight);
        }
        ctx.fill();
        
        ctx.strokeStyle = '#666';
        ctx.stroke();
        
        ctx.fillStyle = '#fff';
        ctx.fillText(valueText, tooltipX, tooltipY + tooltipHeight / 2);
    }

    // === УЛУЧШЕННАЯ ЛОГИКА ВРАЩЕНИЯ ===
    
    handleClick(x, y) {
        if (this.isPointInside(x, y)) {
            console.log(`🌀 Knob clicked: infoFunc = ${this.infoFunc}`);
            
            // Начинаем перетаскивание
            this.startKnobDrag(x, y);
            
            // Возвращаем drag-объект для ModularSystem
            return {
                handleDrag: (x, y) => this.handleKnobDrag(x, y),
                endDrag: () => this.endKnobDrag(),
                type: 'component-drag',
                component: this,
                componentType: 'knob'
            };
        }
        return false;
    }

    // Улучшенный метод начала перетаскивания
    startKnobDrag(x, y) {
        this.isDragging = true;
        
        // Сохраняем начальный угол (для углового вращения)
        this.startAngle = Math.atan2(
            y - (this.y + this.height/2),
            x - (this.x + this.width/2)
        );
        
        // Сохраняем начальное значение и позицию мыши
        this.startValue = this.value;
        this.startMouseY = y;
        this.startMouseX = x;
        
        // Для лучшей работы также сохраняем текущее значение в диапазоне 0-1
        this.normalizedStartValue = (this.startValue - this.min) / (this.max - this.min);
        
        this.showTooltip = true;
        this.clearTooltipTimeout();
    }

    // Улучшенный метод обработки перетаскивания
    handleKnobDrag(x, y) {
        if (!this.isDragging) return;
        
        // СПОСОБ 1: Простое вертикальное управление (наиболее интуитивное)
        const deltaY = this.startMouseY - y; // Обратите внимание: вверх = увеличение
        const range = this.max - this.min;
        
        // Чувствительность: полный диапазон за ~200 пикселей
        const pixelRange = 200;
        const sensitivity = range / pixelRange * this.verticalSensitivity;
        
        let newValue = this.startValue + deltaY * sensitivity;
        
        // СПОСОБ 2: Угловое вращение (альтернатива, можно переключать)
        // Раскомментируйте для углового вращения и закомментируйте строки выше
        /*
        const currentAngle = Math.atan2(
            y - (this.y + this.height/2),
            x - (this.x + this.width/2)
        );
        
        let angleDiff = currentAngle - this.startAngle;
        
        // Нормализуем разницу углов
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        
        const angleSensitivity = range / (Math.PI * 2) * this.angularSensitivity;
        let newValue = this.startValue + angleDiff * angleSensitivity;
        */
        
        // Применяем новое значение
        this.setValue(newValue);
        
        // ОБНОВЛЯЕМ: Фиксируем текущее положение как новую стартовую точку
        // Это предотвращает скачки при быстром движении
        this.startValue = this.value;
        this.startMouseY = y;
        this.startMouseX = x;
    }

    // Еще более простая альтернатива - линейное управление
    handleKnobDragLinear(x, y) {
        if (!this.isDragging) return;
        
        // Простое вертикальное управление
        const deltaY = this.startMouseY - y;
        const range = this.max - this.min;
        
        // Очень чувствительное управление: полный диапазон за 100 пикселей
        const pixelRange = 100;
        const sensitivity = range / pixelRange;
        
        const newValue = this.startValue + deltaY * sensitivity;
        this.setValue(newValue);
    }

    // Завершение перетаскивания
    endKnobDrag() {
        this.isDragging = false;
        
        // Плавно скрываем тултип
        setTimeout(() => {
            if (!this.isHovered) {
                this.showTooltip = false;
            }
        }, 500);
    }

    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===
    
    handleMouseMove(x, y) {
        const wasHovered = this.isHovered;
        super.handleMouseMove(x, y);
        
        if (!wasHovered && this.isHovered) {
            this.clearTooltipTimeout();
            this.tooltipTimeout = setTimeout(() => {
                this.showTooltip = true;
            }, this.tooltipDelay);
        } else if (wasHovered && !this.isHovered) {
            this.hideTooltip();
        }
    }

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
        
        if (clampedValue !== oldValue) {
            this.value = clampedValue;


            // 1. Вызываем всех слушателей из _changeListeners
            if (this._changeListeners && this._changeListeners.length > 0) {
                this._changeListeners.forEach((listener, i) => {
                    listener(this.value);
                });
            }
            
            // 2. Вызываем основной onChange (для совместимости)
            if (this.onChange && typeof this.onChange === 'function') {
                this.onChange(this.value);
            }
            
            // Отправляем в Csound
            if (window.csound && this.csoundChannel) {
                window.csound.setControlChannel(this.csoundChannel, this.value)
                    .then(() => {}, () => {});
            }
        }
    }

    // Метод для быстрой установки значения (например, для загрузки из JSON)
    setValueDirect(value) {
        this.value = Math.max(this.min, Math.min(this.max, value));
    }

    getValue() {
        return this.value;
    }

    addChangeListener(callback) {
        if (!this._changeListeners) {
            this._changeListeners = [];
        }
        this._changeListeners.push(callback);
    }

    destroy() {
        this.clearTooltipTimeout();
    }
}

// Полифил для roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        
        this.beginPath();
        this.moveTo(x + radius, y);
        this.arcTo(x + width, y, x + width, y + height, radius);
        this.arcTo(x + width, y + height, x, y + height, radius);
        this.arcTo(x, y + height, x, y, radius);
        this.arcTo(x, y, x + width, y, radius);
        this.closePath();
        return this;
    };
}