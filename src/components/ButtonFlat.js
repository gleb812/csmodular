// components/ButtonFlat.js
import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class ButtonFlat extends BaseComponent {
    constructor(x, y, width = 80, height = 30, positionsString = 'Off,On') {
        super(x, y, width, height);
        
        // МИНИМУМ свойств
        this.positions = positionsString.split(',');
        this.currentIndex = 0;
        this.currentLabel = this.positions[this.currentIndex];
        
        // ТОЛЬКО базовые флаги
        this.isInteractive = true;
        this.supportsDrag = false;
        
        // Csound-канал (если нужно)
        this.csoundChannel = null;
        this.onChange = null;
    }
    
    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;

        // === ФОН ===
        if (isLcd) {
            if (this.isPressed) {
                ctx.fillStyle = theme.getAccentAlpha(0.25);
            } else if (this.isHovered) {
                ctx.fillStyle = theme.getAccentAlpha(0.15);
            } else {
                ctx.fillStyle = theme.getAccentAlpha(0.05);
            }
        } else {
            if (this.isPressed) {
                ctx.fillStyle = '#4f46e5';
            } else if (this.isHovered) {
                ctx.fillStyle = '#4a5568';
            } else {
                ctx.fillStyle = '#2d3748';
            }
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // === РАМКА ===
        if (isLcd) {
            ctx.strokeStyle = theme.getAccentColor();
            ctx.lineWidth = theme.lineWidth(1);
            theme.applyGlow(ctx);
        } else {
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
        }
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        theme.clearGlow(ctx);

        // === ТЕКСТ ===
        if (isLcd) {
            ctx.fillStyle = theme.getTextColor();
            theme.applyGlow(ctx);
        } else {
            ctx.fillStyle = '#fff';
        }
        ctx.font = 'bold 8px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.currentLabel,
            this.x + this.width / 2,
            this.y + this.height / 2
        );
        theme.clearGlow(ctx);

        // === ИНДИКАТОР ПОЗИЦИИ ===
        if (this.positions.length > 1) {
            const segmentWidth = this.width / this.positions.length;
            if (isLcd) {
                ctx.fillStyle = theme.getActiveFillColor();
                theme.applyGlow(ctx);
            } else {
                ctx.fillStyle = this.isHovered ? '#0af' : '#4f46e5';
            }
            ctx.fillRect(
                this.x + this.currentIndex * segmentWidth,
                this.y + this.height - 3,
                segmentWidth,
                2
            );
            theme.clearGlow(ctx);
        }
    }
    
    // ПРОСТОЙ обработчик клика
    handleClick(x, y) {
        if (this.isPointInside(x, y)) {
            //console.log(`🟦 ButtonFlat.handleClick at (${x}, ${y})`);
            
            // Переключаем позицию
            this.currentIndex = (this.currentIndex + 1) % this.positions.length;
            this.currentLabel = this.positions[this.currentIndex];
            
            // Визуальная обратная связь
            this.isPressed = true;
            
            // Сбрасываем через время (как в старой версии)
            setTimeout(() => {
                this.isPressed = false;
            }, 150);
            
            // Отправляем в Csound
            if (window.csound && this.csoundChannel) {
                window.csound.setControlChannel(this.csoundChannel, this.currentIndex)
                    .then(() => {}, () => {});
            }
            
            // Вызываем обработчик
            if (this.onChange) {
                this.onChange(this.currentIndex, this.currentLabel);
            }
            
            //console.log(`ButtonFlat clicked: ${this.currentLabel} (index: ${this.currentIndex})`);
            
            // Возвращаем результат
            return {
                type: 'component-click',
                component: this,
                componentType: 'button-flat'
            };
        }
        return false;
    }
    
    // ПРОСТОЙ обработчик мыши
    handleMouseMove(x, y) {
        // Базовая логика hover из BaseComponent
        const wasHovered = this.isHovered;
        this.isHovered = this.isPointInside(x, y);
        
        // Логируем только изменение состояния
        // if (wasHovered !== this.isHovered) {
        //     console.log(`🎯 ButtonFlat "${this.currentLabel}":`, {
        //         state: this.isHovered ? 'HOVERED' : 'UNHOVERED',
        //         coordinates: `(${this.x}, ${this.y})`,
        //         mouse: `(${x}, ${y})`,
        //         isInside: this.isPointInside(x, y) ? '✅' : '❌'
        //     });
        // }
        
        return wasHovered !== this.isHovered;
    }
    
    // ПРОСТЫЕ методы управления состоянием
    setState(state) {
        const oldIndex = this.currentIndex;
        
        if (typeof state === 'number') {
            this.currentIndex = Math.max(0, Math.min(this.positions.length - 1, state));
        } else if (typeof state === 'string') {
            const index = this.positions.indexOf(state);
            if (index !== -1) {
                this.currentIndex = index;
            }
        }
        
        this.currentLabel = this.positions[this.currentIndex];
        
        // Отправляем в Csound
        if (window.csound && this.csoundChannel) {
            window.csound.setControlChannel(this.csoundChannel, this.currentIndex)
                .then(() => {}, () => {});
        }
        
        // Вызываем обработчик
        if (this.onChange && this.currentIndex !== oldIndex) {
            this.onChange(this.currentIndex, this.currentLabel, oldIndex);
        }
    }
    
    // Для загрузки из JSON (без вызова onChange)
    setStateDirect(state) {
        if (typeof state === 'number') {
            this.currentIndex = Math.max(0, Math.min(this.positions.length - 1, state));
        } else if (typeof state === 'string') {
            const index = this.positions.indexOf(state);
            if (index !== -1) {
                this.currentIndex = index;
            }
        }
        this.currentLabel = this.positions[this.currentIndex];
    }
    
    getState() {
        return {
            index: this.currentIndex,
            label: this.currentLabel,
            positions: [...this.positions]
        };
    }
    
    // ПРОСТАЯ Csound-интеграция
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }
}