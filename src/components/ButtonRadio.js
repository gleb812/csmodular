import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';
export class ButtonRadio extends BaseComponent {
    constructor(x, y, buttonCount = 4, buttonWidth = 40, text = 'One,Two,Three,Four', orientation = 'horizontal') {
        const height = 14;
        const totalWidth = buttonCount * buttonWidth;
        
        // Пересчитываем размеры в зависимости от ориентации
        let width, finalHeight;
        if (orientation === 'horizontal') {
            width = totalWidth;
            finalHeight = height;
        } else {
            // Для вертикальной ориентации меняем ширину и высоту местами
            width = buttonWidth;
            finalHeight = buttonCount * height;
        }
        
        super(x, y, width, finalHeight);
        
        this.isInteractive = true;
        this.supportsDrag = false;
        
        this.buttonCount = buttonCount;
        this.buttonWidth = buttonWidth;
        this.buttonHeight = height;
        this.orientation = orientation;
        this.labels = text.split(',');
        
        // Ограничиваем количество меток по количеству кнопок
        if (this.labels.length > buttonCount) {
            this.labels = this.labels.slice(0, buttonCount);
        }
        
        // Дополняем метки, если их недостаточно
        while (this.labels.length < buttonCount) {
            this.labels.push(`Btn ${this.labels.length + 1}`);
        }
        
        this.selectedIndex = 0;
        
        // Csound-интеграция
        this.csoundChannel = null;
        this.onChange = null;
        
        // Для отслеживания состояния нажатия отдельных кнопок
        this.buttonPressedStates = new Array(buttonCount).fill(false);
        
        // Тултип
        this.showTooltip = false;
        this.tooltipTimeout = null;
        this.tooltipDelay = 300;
        
        // Анимация
        this.animationProgress = new Array(buttonCount).fill(0);
        this.animationDuration = 150;
    }
    
    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const accent = theme.getAccentColor();

        ctx.save();

        // === ОБЩИЙ ФОН ===
        if (isLcd) {
            ctx.fillStyle = theme.getAccentAlpha(0.03);
        } else {
            ctx.fillStyle = '#1a202c';
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);

        // === КНОПКИ ===
        for (let i = 0; i < this.buttonCount; i++) {
            ctx.save();

            let buttonX, buttonY, buttonCenterX, buttonCenterY;
            if (this.orientation === 'horizontal') {
                buttonX = this.x + i * this.buttonWidth;
                buttonY = this.y;
            } else {
                buttonX = this.x;
                buttonY = this.y + i * this.buttonHeight;
            }
            buttonCenterX = buttonX + this.buttonWidth / 2;
            buttonCenterY = buttonY + this.buttonHeight / 2;

            // Анимация нажатия (визуальный отклик на клик)
            let scale = 1, offsetY = 0;
            if (this.buttonPressedStates[i]) {
                const progress = this.animationProgress[i] / this.animationDuration;
                scale = 1 - 0.05 * Math.sin(progress * Math.PI);
                offsetY = 0.5 * Math.sin(progress * Math.PI);
            }

            const drawX = buttonCenterX - (this.buttonWidth * scale) / 2;
            const drawY = buttonCenterY - (this.buttonHeight * scale) / 2 + offsetY;
            const drawWidth = this.buttonWidth * scale;
            const drawHeight = this.buttonHeight * scale;

            const isSelected = i === this.selectedIndex;
            const isPressed = this.buttonPressedStates[i];

            // === ФОН КНОПКИ ===
            if (isLcd) {
                let intensity;
                if (isSelected) {
                    intensity = isPressed ? 0.25 : 0.15;
                } else {
                    intensity = isPressed ? 0.08 : 0.03;
                }
                ctx.fillStyle = theme.getAccentAlpha(intensity);
            } else {
                if (isSelected) {
                    ctx.fillStyle = isPressed ? '#3730a3' : '#4f46e5';
                } else {
                    ctx.fillStyle = isPressed ? '#111827' : '#2d3748';
                }
            }

            // Скругления
            const radius = 2;
            let tl = 0, tr = 0, br = 0, bl = 0;
            if (this.orientation === 'horizontal') {
                if (i === 0) tl = bl = radius;
                if (i === this.buttonCount - 1) tr = br = radius;
            } else {
                if (i === 0) tl = tr = radius;
                if (i === this.buttonCount - 1) bl = br = radius;
            }

            this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, tl, tr, br, bl);
            ctx.fill();

            // === РАМКА КНОПКИ ===
            if (isLcd) {
                ctx.strokeStyle = accent;
                ctx.lineWidth = isSelected
                    ? theme.lineWidth(2)
                    : theme.lineWidth(0.8);
                if (isSelected) theme.applyGlow(ctx);
            } else {
                ctx.strokeStyle = '#666';
                ctx.lineWidth = 1;
            }
            this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, tl, tr, br, bl);
            ctx.stroke();
            theme.clearGlow(ctx);

            // === РАЗДЕЛИТЕЛЬ ===
            if (i < this.buttonCount - 1) {
                ctx.beginPath();
                if (this.orientation === 'horizontal') {
                    ctx.moveTo(buttonX + this.buttonWidth, buttonY);
                    ctx.lineTo(buttonX + this.buttonWidth, buttonY + this.buttonHeight);
                } else {
                    ctx.moveTo(buttonX, buttonY + this.buttonHeight);
                    ctx.lineTo(buttonX + this.buttonWidth, buttonY + this.buttonHeight);
                }
                ctx.strokeStyle = isLcd ? theme.getAccentAlpha(0.3) : '#666';
                ctx.lineWidth = isLcd ? theme.lineWidth(0.6) : 1;
                ctx.stroke();
            }

            // === ТЕКСТ ===
            if (isLcd) {
                ctx.fillStyle = accent;
                ctx.font = isSelected
                    ? 'bold 8px Arial, sans-serif'
                    : '8px Arial, sans-serif';
                if (isSelected) theme.applyGlow(ctx);
            } else {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 8px Arial, sans-serif';
            }
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.labels[i], buttonCenterX, buttonCenterY + offsetY);
            theme.clearGlow(ctx);

            ctx.restore();
        }

        // === ИНДИКАТОР ВЫБРАННОЙ КНОПКИ ===
        ctx.save();

        let selectedX, selectedY, indicatorWidth, indicatorHeight;
        if (this.orientation === 'horizontal') {
            selectedX = this.x + this.selectedIndex * this.buttonWidth;
            selectedY = this.y + this.buttonHeight - 2;
            indicatorWidth = this.buttonWidth;
            indicatorHeight = 2;
        } else {
            selectedX = this.x + this.buttonWidth - 2;
            selectedY = this.y + this.selectedIndex * this.buttonHeight;
            indicatorWidth = 2;
            indicatorHeight = this.buttonHeight;
        }

        if (isLcd) {
            ctx.fillStyle = accent;
            theme.applyGlow(ctx);
        } else {
            ctx.fillStyle = '#0af';
        }
        ctx.fillRect(selectedX, selectedY, indicatorWidth, indicatorHeight);
        theme.clearGlow(ctx);

        ctx.restore();
        ctx.restore();
    }


    drawRoundedRect(ctx, x, y, width, height, tl, tr, br, bl) {
        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + width - tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
        ctx.lineTo(x + width, y + height - br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
        ctx.lineTo(x + bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
        ctx.lineTo(x, y + tl);
        ctx.quadraticCurveTo(x, y, x + tl, y);
        ctx.closePath();
    }
    
    // === ОБРАБОТКА СОБЫТИЙ ===
    
    handleClick(x, y) {
        if (this.isPointInside(x, y)) {
            console.log(`🔘 ButtonRadio.handleClick at (${x}, ${y})`);
            
            // Определяем, по какой кнопке кликнули
            let clickedIndex;
            if (this.orientation === 'horizontal') {
                clickedIndex = Math.floor((x - this.x) / this.buttonWidth);
            } else {
                clickedIndex = Math.floor((y - this.y) / this.buttonHeight);
            }
            
            // Проверяем, что индекс в пределах
            if (clickedIndex >= 0 && clickedIndex < this.buttonCount) {
                // Если кнопка уже выбрана, не делаем ничего
                if (clickedIndex === this.selectedIndex) {
                    console.log(`ButtonRadio: button ${clickedIndex} already selected`);
                    return {
                        type: 'component-click',
                        component: this,
                        componentType: 'button-radio',
                        buttonIndex: clickedIndex,
                        alreadySelected: true
                    };
                }
                
                // Устанавливаем новую выбранную кнопку
                this.setSelected(clickedIndex);
                
                return {
                    type: 'component-click',
                    component: this,
                    componentType: 'button-radio',
                    buttonIndex: clickedIndex,
                    alreadySelected: false
                };
            }
        }
        return false;
    }
    
    setSelected(index) {
        const oldIndex = this.selectedIndex;
        
        if (index >= 0 && index < this.buttonCount && index !== oldIndex) {
            this.selectedIndex = index;
            
            // Визуальная обратная связь для нажатой кнопки
            this.buttonPressedStates[index] = true;
            this.startAnimation(index);
            
            // Отправляем в Csound
            if (window.csound && this.csoundChannel) {
                window.csound.setControlChannel(this.csoundChannel, index)
                    .then(() => {}, () => {});
            }
            
            // Вызываем обработчик
            if (this.onChange) {
                this.onChange(index, this.labels[index], oldIndex, this.labels[oldIndex]);
            }
            
            console.log(`ButtonRadio selected: ${this.labels[index]} (index: ${index})`);
        }
    }
    
    startAnimation(buttonIndex) {
        this.animationProgress[buttonIndex] = this.animationDuration;
        const animate = () => {
            this.animationProgress[buttonIndex] -= 16; // ~60 FPS
            
            if (this.animationProgress[buttonIndex] <= 0) {
                this.animationProgress[buttonIndex] = 0;
                this.buttonPressedStates[buttonIndex] = false;
            } else {
                requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    // === СОСТОЯНИЕ  ===
    
    handleMouseMove(x, y) {
        super.handleMouseMove(x, y);

        // Определяем, над какой кнопкой находится мышь
        // (нужно для курсора и, возможно, будущей логики)
        if (this.isHovered) {
            let idx;
            if (this.orientation === 'horizontal') {
                idx = Math.floor((x - this.x) / this.buttonWidth);
            } else {
                idx = Math.floor((y - this.y) / this.buttonHeight);
            }
            if (idx >= 0 && idx < this.buttonCount) {
                this.hoveredButtonIndex = idx;
            } else {
                this.hoveredButtonIndex = null;
            }
        } else {
            this.hoveredButtonIndex = null;
        }
    }
    
    // === УПРАВЛЕНИЕ СОСТОЯНИЕМ ===
    
    setState(state) {
        const oldIndex = this.selectedIndex;
        
        if (typeof state === 'number') {
            this.setSelected(Math.max(0, Math.min(this.buttonCount - 1, state)));
        } else if (typeof state === 'string') {
            const index = this.labels.indexOf(state);
            if (index !== -1) {
                this.setSelected(index);
            }
        }
    }
    
    setStateDirect(state) {
        if (typeof state === 'number') {
            this.selectedIndex = Math.max(0, Math.min(this.buttonCount - 1, state));
        } else if (typeof state === 'string') {
            const index = this.labels.indexOf(state);
            if (index !== -1) {
                this.selectedIndex = index;
            }
        }
    }
    
    getState() {
        return {
            selectedIndex: this.selectedIndex,
            selectedLabel: this.labels[this.selectedIndex],
            labels: [...this.labels],
            buttonCount: this.buttonCount,
            orientation: this.orientation
        };
    }
    
    // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ===
    
    getSelectedLabel() {
        return this.labels[this.selectedIndex];
    }
    
    getSelectedIndex() {
        return this.selectedIndex;
    }
    
    // === Csound-ИНТЕГРАЦИЯ ===
    
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }
    
    static getPropertySchema() {
        return [
            {
                key: 'labels',
                label: 'Labels (comma-separated)',
                type: 'list',
                afterChange: (comp, arr) => {
                    comp.buttonCount = arr.length;
                    if (comp.selectedIndex >= arr.length) comp.selectedIndex = 0;
                    if (typeof comp.width === 'number' && typeof comp.buttonWidth === 'number') {
                        comp.width = arr.length * comp.buttonWidth;
                    }
                },
            },
            {
                key: 'buttonCount',
                label: 'Button Count',
                type: 'number',
                min: 1,
                max: 16,
                step: 1,
                afterChange: (comp, v) => {
                    const n = Math.max(1, Math.min(16, Math.round(v)));
                    comp.buttonCount = n;
                    while (comp.labels.length < n) comp.labels.push(`Btn ${comp.labels.length + 1}`);
                    if (comp.labels.length > n) comp.labels = comp.labels.slice(0, n);
                    if (comp.selectedIndex >= n) comp.selectedIndex = 0;
                    if (typeof comp.width === 'number' && typeof comp.buttonWidth === 'number') {
                        comp.width = n * comp.buttonWidth;
                    }
                },
            },
            {
                key: 'selectedIndex',
                label: 'Default Index',
                type: 'number',
                min: 0,
                max: 16,
                step: 1,
                afterChange: (comp, v) => {
                    const maxIdx = (comp.buttonCount ?? 1) - 1;
                    comp.selectedIndex = Math.max(0, Math.min(maxIdx, v));
                },
            },
        ];
    }
}