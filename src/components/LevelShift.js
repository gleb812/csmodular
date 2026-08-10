import { BaseComponent } from './BaseComponent.js';

export class LevelShift extends BaseComponent {
    static SIZES = {
        SMALL: 'small',
        MEDIUM: 'medium',
        LARGE: 'large'
    };
    
    static SIZE_VALUES = {
        small: { width: 10, height: 15 },
        medium: { width: 40, height: 60 },
        large: { width: 50, height: 75 }
    };
    
    constructor(x, y, size = 'small') {
        let width, height;
        
        // if (typeof size === 'string') {
        //     const sizeObj = LevelShift.SIZE_VALUES[size] || LevelShift.SIZE_VALUES.medium;
        //     width = sizeObj.width;
        //     height = sizeObj.height;
        // } else if (typeof size === 'object') {
        //     width = size.width || 40;
        //     height = size.height || 60;
        // } else {
        //    width = 40;
        //    height = 60;
        // }
        width = 15;
        height = 12;
        super(x, y, width, height);
        
        this.isInteractive = true;
        this.supportsDrag = false;
        this.sizeParam = size;
        
        this.position = 0; // 0-3: Top▲, Top▼, Bottom▲, Bottom▼
        
        // Csound-интеграция
        this.csoundChannel = null;
        this.onChange = null;
        
        // Тултип
        this.showTooltip = false;
        this.tooltipTimeout = null;
        this.tooltipDelay = 300;
        
        // Анимация
        this.animationProgress = 0;
        this.animationDuration = 150;
    }
    
    draw(ctx) {
        ctx.save();
        
        // Анимация нажатия
        let scale = 1;
        if (this.isPressed) {
            const progress = this.animationProgress / this.animationDuration;
            scale = 1 - 0.05 * Math.sin(progress * Math.PI);
        }
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const drawX = centerX - (this.width * scale) / 2;
        const drawY = centerY - (this.height * scale) / 2;
        const drawWidth = this.width * scale;
        const drawHeight = this.height * scale;
        
        // Основной фон с градиентом
        const bgGradient = ctx.createLinearGradient(
            drawX, drawY,
            drawX, drawY + drawHeight
        );
        
        if (this.isPressed) {
            bgGradient.addColorStop(0, '#777');
            bgGradient.addColorStop(1, '#555');
        } else if (this.isHovered) {
            bgGradient.addColorStop(0, '#999');
            bgGradient.addColorStop(1, '#777');
        } else {
            bgGradient.addColorStop(0, '#999');
            bgGradient.addColorStop(1, '#666');
        }
        
        // Фон с скруглёнными углами
        ctx.fillStyle = bgGradient;
        const radius = 3;
        if (ctx.roundRect) {
            ctx.roundRect(drawX, drawY, drawWidth, drawHeight, radius);
            ctx.fill();
        } else {
            this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
            ctx.fill();
        }
        
        // Разделительная линия посередине
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(drawX, drawY + drawHeight/2);
        ctx.lineTo(drawX + drawWidth, drawY + drawHeight/2);
        ctx.stroke();
        
        // Рисуем активную половину
        this.drawActiveHalf(ctx, drawX, drawY, drawWidth, drawHeight);
        
        // Рисуем большой треугольник
        this.drawTriangle(ctx, drawX, drawY, drawWidth, drawHeight);
        
        // Рамка
        ctx.strokeStyle = this.isHovered ? '#0af' : '#666';
        ctx.lineWidth = 1;
        
        if (ctx.roundRect) {
            ctx.roundRect(drawX, drawY, drawWidth, drawHeight, radius);
            ctx.stroke();
        } else {
            this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
            ctx.stroke();
        }
        
        // Индикатор положения (маленькая точка в углу)
        // ctx.fillStyle = '#22c55e';
        // ctx.beginPath();
        // const dotX = drawX + (this.position < 2 ? 4 : drawWidth - 4);
        // const dotY = drawY + (this.position % 2 === 0 ? 4 : drawHeight - 4);
        // ctx.arc(dotX, dotY, 1.5, 0, Math.PI * 2);
        // ctx.fill();
        
        ctx.restore();
        
        // // Тултип
        // if (this.showTooltip) {
        //     this.drawTooltip(ctx);
        // }
    }
    
    drawActiveHalf(ctx, x, y, width, height) {
        // Яркий теплый зеленый цвет с градиентом
        const activeGradient = ctx.createLinearGradient(
            x, y,
            x, y + height/2
        );
        
        if (this.isPressed) {
            activeGradient.addColorStop(0, '#16a34a');
            activeGradient.addColorStop(1, '#15803d');
        } else {
            activeGradient.addColorStop(0, '#22c55e');
            activeGradient.addColorStop(1, '#16a34a');
        }
        
        if (this.position === 0 || this.position === 1) {
            // Верхняя половина активна
            ctx.fillStyle = activeGradient;
            ctx.fillRect(x, y, width, height/2);
        } else {
            // Нижняя половина активна
            const bottomGradient = ctx.createLinearGradient(
                x, y + height/2,
                x, y + height
            );
            
            if (this.isPressed) {
                bottomGradient.addColorStop(0, '#16a34a');
                bottomGradient.addColorStop(1, '#15803d');
            } else {
                bottomGradient.addColorStop(0, '#22c55e');
                bottomGradient.addColorStop(1, '#16a34a');
            }
            
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(x, y + height/2, width, height/2);
        }
    }
    
    drawTriangle(ctx, x, y, width, height) {

        // Черный цвет
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        
        const centerX = x + width / 2;
        const triWidth = width * 0.6;
        const triHeight = height * 0.3;
        
        // Определяем направление и позицию
        const isUp = (this.position === 0 || this.position === 2);
        const triY = y + (this.position < 2 ? height * 0.25 : height * 0.75);
        
        if (isUp) {
            // Вверх
            ctx.moveTo(centerX, triY - triHeight / 2);
            ctx.lineTo(centerX + triWidth / 2, triY + triHeight / 2);
            ctx.lineTo(centerX - triWidth / 2, triY + triHeight / 2);
        } else {
            // Вниз
            ctx.moveTo(centerX, triY + triHeight / 2);
            ctx.lineTo(centerX + triWidth / 2, triY - triHeight / 2);
            ctx.lineTo(centerX - triWidth / 2, triY - triHeight / 2);
        }
        
        ctx.closePath();
        ctx.fill();

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
    
    drawTooltip(ctx) {
        const positionName = this.getPositionName();
        const tooltipText = `Level: ${positionName}`;
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
    }
    
    // === ОБРАБОТКА СОБЫТИЙ ===
    
    handleClick(x, y) {
        if (this.isPointInside(x, y)) {
            console.log(`🔼 LevelShift.handleClick at (${x}, ${y})`);
            
            // Переключаем на следующую позицию
            this.toggle();
            
            // Запускаем анимацию
            this.startAnimation();
            
            return {
                type: 'component-click',
                component: this,
                componentType: 'level-shift'
            };
        }
        return false;
    }
    
    toggle() {
        const oldPosition = this.position;
        this.position = (this.position + 1) % 4;
        
        // Отправляем в Csound
        if (window.csound && this.csoundChannel) {
            window.csound.setControlChannel(this.csoundChannel, this.position)
                .then(() => {}, () => {});
        }
        
        // Вызываем обработчик
        if (this.onChange) {
            this.onChange(this.position, this.getPositionName(), oldPosition, this.getPositionName(oldPosition));
        }
        
        console.log(`LevelShift toggled: ${this.getPositionName()} (position: ${this.position})`);
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
    
    setPosition(pos) {
        const oldPosition = this.position;
        
        if (pos >= 0 && pos <= 3 && pos !== oldPosition) {
            this.position = pos;
            
            // Отправляем в Csound
            if (window.csound && this.csoundChannel) {
                window.csound.setControlChannel(this.csoundChannel, pos)
                    .then(() => {}, () => {});
            }
            
            // Вызываем обработчик
            if (this.onChange) {
                this.onChange(pos, this.getPositionName(), oldPosition, this.getPositionName(oldPosition));
            }
            
            return true;
        }
        return false;
    }
    
    setState(state) {
        if (typeof state === 'number') {
            this.setPosition(Math.max(0, Math.min(3, state)));
        } else if (typeof state === 'string') {
            const positionNames = ['Top ▲', 'Top ▼', 'Bottom ▲', 'Bottom ▼'];
            const index = positionNames.indexOf(state);
            if (index !== -1) {
                this.setPosition(index);
            }
        }
    }
    
    setStateDirect(state) {
        if (typeof state === 'number') {
            this.position = Math.max(0, Math.min(3, state));
        } else if (typeof state === 'string') {
            const positionNames = ['Top ▲', 'Top ▼', 'Bottom ▲', 'Bottom ▼'];
            const index = positionNames.indexOf(state);
            if (index !== -1) {
                this.position = index;
            }
        }
    }
    
    getState() {
        return {
            position: this.position,
            positionName: this.getPositionName(),
            size: this.sizeParam
        };
    }
    
    getPositionName(position = null) {
        const pos = position !== null ? position : this.position;
        const names = [
            'Top ▲',
            'Top ▼', 
            'Bottom ▲',
            'Bottom ▼'
        ];
        return names[pos];
    }
    
    // === Csound-ИНТЕГРАЦИЯ ===
    
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }
    
    // === СТАТИЧЕСКИЕ МЕТОДЫ ===
    
    static create(x, y, size = 'medium') {
        return new LevelShift(x, y, size);
    }
    
    // === ОЧИСТКА ===
    
    destroy() {
        this.clearTooltipTimeout();
    }
}