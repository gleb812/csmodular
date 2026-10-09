import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class ButtonText extends BaseComponent {
    static FIXED_HEIGHT = 13; // 13
    
    constructor(x, y, width = 40, text = 'M', initialState = true) {
        super(x, y, width, ButtonText.FIXED_HEIGHT);
        
        this.isInteractive = true;
        this.supportsDrag = false;
        
        this.text = text;
        this.isActive = initialState; // latch состояние
        
        // Csound-интеграция
        this.csoundChannel = null;
        this.onToggle = null;
        
        // Тултип
        this.showTooltip = false;
        this.tooltipTimeout = null;
        this.tooltipDelay = 300;
        
        // Анимация
        this.animationProgress = 0;
        this.animationDuration = 150;
    }
    
    // Метод для получения высоты
    getActualHeight() {
        return ButtonText.FIXED_HEIGHT;
    }
    

    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const accent = theme.getAccentColor();

        ctx.save();

        // Анимация нажатия
        let scale = 1;
        let offsetY = 0;
        if (this.isPressed) {
            const progress = this.animationProgress / this.animationDuration;
            scale = 1 - 0.1 * Math.sin(progress * Math.PI);
            offsetY = 1 * Math.sin(progress * Math.PI);
        }

        const centerX = this.x + this.width / 2;
        const centerY = this.y + ButtonText.FIXED_HEIGHT / 2;
        const drawX = centerX - (this.width * scale) / 2;
        const drawY = centerY - (ButtonText.FIXED_HEIGHT * scale) / 2 + offsetY;
        const drawWidth = this.width * scale;
        const drawHeight = ButtonText.FIXED_HEIGHT * scale;

        // === ФОН ===
        if (isLcd) {
            // LCD: ярче при active, слабее при inactive
            const intensity = this.isActive
                ? (this.isPressed ? 0.4 : this.isHovered ? 0.3 : 0.2)
                : (this.isPressed ? 0.15 : this.isHovered ? 0.1 : 0.03);
            ctx.fillStyle = theme.getAccentAlpha(intensity);
        } else {
            // Classic: как было
            if (this.isActive) {
                if (this.isPressed)        ctx.fillStyle = '#3730a3';
                else if (this.isHovered)   ctx.fillStyle = '#3730a3';
                else                       ctx.fillStyle = '#4f46e5';
            } else {
                if (this.isPressed)        ctx.fillStyle = '#4b5563';
                else if (this.isHovered)   ctx.fillStyle = '#374151';
                else                       ctx.fillStyle = '#1f2937';
            }
        }

        const radius = 2;
        this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
        ctx.fill();

        // === РАМКА ===
        if (isLcd) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = theme.lineWidth(this.isActive ? 1.5 : 1);
            theme.applyGlow(ctx);
        } else {
            ctx.strokeStyle = this.isActive
                ? (this.isHovered ? '#0af' : '#6366f1')
                : (this.isHovered ? '#9ca3af' : '#4b5563');
            ctx.lineWidth = 1;
        }
        this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
        ctx.stroke();
        theme.clearGlow(ctx);

        // === ТЕКСТ ===
        if (isLcd) {
            ctx.fillStyle = accent;
            theme.applyGlow(ctx);
        } else {
            ctx.fillStyle = this.isActive ? '#ffffff' : '#d1d5db';
        }
        ctx.font = 'bold 10px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, centerX, centerY + offsetY);
        theme.clearGlow(ctx);

        ctx.restore();
    }
    
    drawTooltip(ctx) {
        ctx.save();
        const stateText = this.isActive ? 'ON' : 'OFF';
        const tooltipText = `${this.text}: ${stateText}`;
        const padding = 10;
        const tooltipHeight = 25;
        const tooltipX = this.x + this.width / 2;
        const tooltipY = this.y - tooltipHeight - 10;
        
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textWidth = ctx.measureText(tooltipText).width;
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
        ctx.fillText(tooltipText, tooltipX, tooltipY + tooltipHeight / 2);
        ctx.restore(); // ← ДОБАВИТЬ ВОТ ЭТО
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
            console.log(`🟩 ButtonText.handleClick at (${x}, ${y})`);
            
            // Переключаем состояние
            this.toggle();
            
            // Запускаем анимацию
            this.startAnimation();
            
            return {
                type: 'component-click',
                component: this,
                componentType: 'button-text'
            };
        }
        return false;
    }
    
    toggle() {
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
        
        console.log(`ButtonText toggled: ${this.text} = ${this.isActive ? 'ON' : 'OFF'}`);
    }
    
    startAnimation() {
        this.animationProgress = this.animationDuration;
        const animate = () => {
            this.animationProgress -= 16; // ~60 FPS
            
            if (this.animationProgress <= 0) {
                this.animationProgress = 0;
                this.isPressed = false;
            } else {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    // === СОСТОЯНИЕ И ТУЛТИПЫ ===
    
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
        this.showTooltip = false;
    }
    
    clearTooltipTimeout() {
        if (this.tooltipTimeout) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }
    }
    
    // === УПРАВЛЕНИЕ СОСТОЯНИЕМ ===
    
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
    
    setStateDirect(state) {
        this.isActive = Boolean(state);
    }
    
    getState() {
        return {
            active: this.isActive,
            text: this.text
        };
    }
    
    // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ===
    
    isButtonActive() {
        return this.isActive;
    }
    
    setText(newText) {
        this.text = newText;
    }
    
    getText() {
        return this.text;
    }
    
    // === Csound-ИНТЕГРАЦИЯ ===
    
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }
    
    // === ОЧИСТКА ===
    
    destroy() {
        this.clearTooltipTimeout();
    }
}