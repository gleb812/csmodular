// components/TextEdit.js
import { BaseComponent } from './BaseComponent.js';

export class TextEdit extends BaseComponent {
    constructor(x, y, width = 43, text = 'Ch 1', initialState = false) {
        // Фиксированная высота как у ButtonText
        super(x, y, width, 13);
        
        this.isInteractive = true;
        this.supportsDrag = false;
        
        this.text = text;
        this.isActive = initialState; // Вкл/Выкл состояние
        this.isEditing = false; // Режим редактирования текста
        
        // Csound-интеграция
        this.csoundChannel = null;
        this.onToggle = null;
        this.onTextChange = null; // Новый колбэк для изменения текста
        
        console.log(`TextEdit created: "${text}", active: ${initialState}, width: ${width}`);
    }
    
    draw(ctx) {
        // === ПРОСТОЙ ФОН ===
        const radius = 2;
        
        if (this.isActive) {
            // Активный - синий
            ctx.fillStyle = this.isPressed ? '#4f46e5' : 
                           this.isHovered ? '#4338ca' : '#4f46e5';
        } else {
            // Неактивный - серый
            ctx.fillStyle = this.isPressed ? '#6b7280' : 
                           this.isHovered ? '#4b5563' : '#374151';
        }
        
        if (ctx.roundRect) {
            ctx.roundRect(this.x, this.y, this.width, 13, radius);
            ctx.fill();
        } else {
            this.drawRoundedRect(ctx, this.x, this.y, this.width, 13, radius);
            ctx.fill();
        }
        
        // === РАМКА ===
        ctx.strokeStyle = this.isActive ? 
            (this.isHovered ? '#0af' : '#6366f1') : 
            (this.isHovered ? '#9ca3af' : '#4b5563');
        ctx.lineWidth = 1;
        
        if (ctx.roundRect) {
            ctx.roundRect(this.x, this.y, this.width, 13, radius);
            ctx.stroke();
        } else {
            this.drawRoundedRect(ctx, this.x, this.y, this.width, 13, radius);
            ctx.stroke();
        }
        
        // === ТЕКСТ ===
        ctx.fillStyle = this.isActive ? '#ffffff' : '#d1d5db';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Обрезаем текст если не помещается
        let displayText = this.text;
        const maxWidth = this.width - 10; // Отступы по 5px с каждой стороны
        
        // Простая проверка ширины текста
        const textWidth = ctx.measureText(displayText).width;
        if (textWidth > maxWidth) {
            // Если текст не помещается, добавляем "..."
            while (ctx.measureText(displayText + '...').width > maxWidth && displayText.length > 1) {
                displayText = displayText.slice(0, -1);
            }
            displayText = displayText + '...';
        }
        
        ctx.fillText(
            displayText,
            this.x + this.width / 2,
            this.y + 13 / 2
        );
        
        // === ИНДИКАТОР РЕДАКТИРОВАНИЯ (мигающий курсор) ===
        if (this.isEditing) {
            // Мигающий курсор (каждые 500мс)
            const shouldShowCursor = Math.floor(Date.now() / 500) % 2 === 0;
            
            if (shouldShowCursor) {
                // Вычисляем позицию конца текста для курсора
                const textMetrics = ctx.measureText(displayText);
                const cursorX = this.x + this.width / 2 + textMetrics.width / 2 + 1;
                const cursorY1 = this.y + 4;
                const cursorY2 = this.y + 13 - 4;
                
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cursorX, cursorY1);
                ctx.lineTo(cursorX, cursorY2);
                ctx.stroke();
            }
            
            // Подсветка фона в режиме редактирования
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            if (ctx.roundRect) {
                ctx.roundRect(this.x, this.y, this.width, 13, radius);
                ctx.fill();
            } else {
                this.drawRoundedRect(ctx, this.x, this.y, this.width, 13, radius);
                ctx.fill();
            }
        }
        
        // === ИНДИКАТОР АКТИВНОСТИ (тонкая линия снизу) ===
        if (this.isActive) {
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(
                this.x + 3,
                this.y + 13 - 2,
                this.width - 6,
                1
            );
        }
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
            console.log(`📝 TextEdit.handleClick at (${x}, ${y})`);
            
            // Если уже в режиме редактирования - завершаем
            if (this.isEditing) {
                this.stopEditing();
            } else {
                // Иначе переключаем активность
                this.toggleActive();
                
                // Можно также начать редактирование при двойном клике
                // или добавить отдельный режим
            }
            
            // Визуальная обратная связь
            this.isPressed = true;
            setTimeout(() => {
                this.isPressed = false;
            }, 150);
            
            return {
                type: 'component-click',
                component: this,
                componentType: 'text-edit'
            };
        }
        return false;
    }
    
    toggleActive() {
        const oldState = this.isActive;
        this.isActive = !this.isActive;
        
        // Отправляем в Csound
        if (window.csound && this.csoundChannel) {
            const csoundValue = this.isActive ? 1 : 0;
            window.csound.setControlChannel(this.csoundChannel, csoundValue)
                .then(() => {}, () => {});
        }
        
        // Вызываем обработчик
        if (this.onToggle) {
            this.onToggle(this.isActive, this.text, oldState);
        }
        
        console.log(`TextEdit toggled: "${this.text}" = ${this.isActive ? 'ON' : 'OFF'}`);
    }
    
    // === РЕЖИМ РЕДАКТИРОВАНИЯ ТЕКСТА ===
    
    startEditing() {
        if (!this.isEditing) {
            this.isEditing = true;
            console.log(`✏️ Start editing: "${this.text}"`);
            
            // Можно добавить фокус на input поле в UI
            // или начать слушать клавиатуру
        }
    }
    
    stopEditing() {
        if (this.isEditing) {
            this.isEditing = false;
            console.log(`💾 Stop editing: "${this.text}"`);
            
            // Вызываем обработчик изменения текста
            if (this.onTextChange) {
                this.onTextChange(this.text);
            }
        }
    }
    
    setText(newText) {
        const oldText = this.text;
        this.text = newText;
        
        // Если в режиме редактирования - выходим из него
        if (this.isEditing) {
            this.stopEditing();
        }
        
        // Вызываем обработчик
        if (this.onTextChange && newText !== oldText) {
            this.onTextChange(newText, oldText);
        }
        
        console.log(`TextEdit text changed: "${oldText}" → "${newText}"`);
    }
    
    // === ОБРАБОТКА МЫШИ ===
    
    handleMouseMove(x, y) {
        const wasHovered = this.isHovered;
        this.isHovered = this.isPointInside(x, y);
        
        if (wasHovered !== this.isHovered) {
            console.log(`🎯 TextEdit "${this.text}":`, {
                state: this.isHovered ? 'HOVERED' : 'UNHOVERED',
                active: this.isActive ? 'ON' : 'OFF',
                editing: this.isEditing ? '✏️' : '📄'
            });
        }
        
        return wasHovered !== this.isHovered;
    }
    
    // === МЕТОДЫ УПРАВЛЕНИЯ СОСТОЯНИЕМ ===
    
    setActive(state) {
        const oldState = this.isActive;
        this.isActive = Boolean(state);
        
        // Отправляем в Csound
        if (window.csound && this.csoundChannel && this.isActive !== oldState) {
            const csoundValue = this.isActive ? 1 : 0;
            window.csound.setControlChannel(this.csoundChannel, csoundValue)
                .then(() => {}, () => {});
        }
        
        // Вызываем обработчик
        if (this.onToggle && this.isActive !== oldState) {
            this.onToggle(this.isActive, this.text, oldState);
        }
    }
    
    // Для загрузки из JSON
    setStateDirect(state) {
        this.isActive = Boolean(state.active !== undefined ? state.active : state);
        if (state.text !== undefined) {
            this.text = state.text;
        }
    }
    
    getState() {
        return {
            active: this.isActive,
            text: this.text,
            editing: this.isEditing
        };
    }
    
    // === Csound-ИНТЕГРАЦИЯ ===
    
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
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