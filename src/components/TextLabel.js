// components/TextLabel.js
import { BaseComponent } from './BaseComponent.js';

export class TextLabel extends BaseComponent {
    static ALIGN = {
        LEFT: 'left',
        CENTER: 'center',
        RIGHT: 'right'
    };
    
    static BASELINE = {
        TOP: 'top',
        MIDDLE: 'middle',
        BOTTOM: 'bottom'
    };
    
    constructor(x, y, text, fontSize = 12, color = '#ffffff', align = 'left', baseline = 'top') {
        // Сначала создаём с нулевыми размерами
        super(x, y, 0, 0);
        
        this.isInteractive = false; // Текст не интерактивен
        this.supportsDrag = false;
        
        this.text = text;
        this.fontSize = fontSize;
        this.color = color;
        this.align = align;
        this.baseline = baseline;
        this.fontFamily = 'Arial, sans-serif';
        
        // Csound-интеграция (только если текст будет динамическим)
        this.csoundChannel = null;
        this.onChange = null;
        
        // Вычисляем реальные размеры текста
        this.updateDimensions();
    }
    
    updateDimensions() {
        // Временно создаём контекст для измерения текста
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        
        const metrics = ctx.measureText(this.text);
        this.width = metrics.width;
        
        // Приблизительная высота текста
        this.height = this.fontSize * 1.2;
        
        // Корректируем позицию в зависимости от выравнивания
        if (this.align === 'center') {
            this.originalX = this.x - this.width / 2;
        } else if (this.align === 'right') {
            this.originalX = this.x - this.width;
        } else {
            this.originalX = this.x;
        }
        
        // Корректируем позицию в зависимости от baseline
        if (this.baseline === 'middle') {
            this.originalY = this.y - this.height / 2;
        } else if (this.baseline === 'bottom') {
            this.originalY = this.y - this.height;
        } else {
            this.originalY = this.y;
        }
    }
    
    draw(ctx) {
        ctx.save();
        
        // Устанавливаем стиль текста
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = this.color;
        ctx.textAlign = this.align;
        ctx.textBaseline = this.baseline;
        
        // Рисуем текст
        ctx.fillText(this.text, this.x, this.y);
        
        // Дебаг-режим: показываем bounding box
        if (window.DEBUG_TEXT_LABEL) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            
            let drawX = this.x;
            let drawY = this.y;
            
            // Корректируем для отрисовки bounding box
            if (this.align === 'center') {
                drawX = this.x - this.width / 2;
            } else if (this.align === 'right') {
                drawX = this.x - this.width;
            }
            
            if (this.baseline === 'middle') {
                drawY = this.y - this.height / 2;
            } else if (this.baseline === 'bottom') {
                drawY = this.y - this.height;
            }
            
            ctx.strokeRect(drawX, drawY, this.width, this.height);
        }
        
        ctx.restore();
    }
    
    // === ОБРАБОТКА СОБЫТИЙ ===
    
    // TextLabel не интерактивен, но для совместимости с системой
    handleMouseMove(x, y) {
        // Можно добавить логику для тултипов или подсказок
    }
    
    // === УПРАВЛЕНИЕ СОСТОЯНИЕМ ===
    
    setText(newText) {
        const oldText = this.text;
        if (newText !== oldText) {
            this.text = newText;
            this.updateDimensions();
            
            // Отправляем в Csound (если текстовый канал используется)
            if (window.csound && this.csoundChannel) {
                // Для текста можно отправлять числовое значение или хэш
                const textHash = this.text.split('').reduce((hash, char) => {
                    return hash * 31 + char.charCodeAt(0);
                }, 0);
                window.csound.setControlChannel(this.csoundChannel, textHash)
                    .then(() => {}, () => {});
            }
            
            // Вызываем обработчик, если есть
            if (this.onChange) {
                this.onChange(this.text, oldText);
            }
        }
    }
    
    setState(state) {
        if (typeof state === 'string') {
            this.setText(state);
        } else if (typeof state === 'object' && state.text) {
            this.setText(state.text);
            if (state.color) this.color = state.color;
            if (state.fontSize) {
                this.fontSize = state.fontSize;
                this.updateDimensions();
            }
        }
    }
    
    setStateDirect(state) {
        if (typeof state === 'string') {
            this.text = state;
            this.updateDimensions();
        } else if (typeof state === 'object' && state.text) {
            this.text = state.text;
            if (state.color) this.color = state.color;
            if (state.fontSize) {
                this.fontSize = state.fontSize;
                this.updateDimensions();
            }
        }
    }
    
    getState() {
        return {
            text: this.text,
            fontSize: this.fontSize,
            color: this.color,
            align: this.align,
            baseline: this.baseline,
            fontFamily: this.fontFamily
        };
    }
    
    // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ===
    
    setColor(newColor) {
        this.color = newColor;
    }
    
    setFontSize(newSize) {
        this.fontSize = newSize;
        this.updateDimensions();
    }
    
    setAlign(newAlign) {
        this.align = newAlign;
        this.updateDimensions();
    }
    
    setBaseline(newBaseline) {
        this.baseline = newBaseline;
        this.updateDimensions();
    }
    
    // === Csound-ИНТЕГРАЦИЯ ===
    
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }
    
    // === ОЧИСТКА ===
    
    destroy() {
        // TextLabel не требует специальной очистки
    }
}

// Статические методы для быстрого создания
TextLabel.create = function(x, y, text, fontSize = 12, color = '#ffffff', align = 'left', baseline = 'top') {
    return new TextLabel(x, y, text, fontSize, color, align, baseline);
};

// Статический метод для заголовков
TextLabel.createHeader = function(x, y, text, color = '#ffffff') {
    return new TextLabel(x, y, text, 14, color, 'center', 'middle');
};

// Статический метод для мелкого текста
TextLabel.createSmall = function(x, y, text, color = '#cccccc') {
    return new TextLabel(x, y, text, 10, color, 'left', 'top');
};