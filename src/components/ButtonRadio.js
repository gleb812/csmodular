import { BaseComponent } from './BaseComponent.js';

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
        this.buttonHoveredStates = new Array(buttonCount).fill(false);
        
        // Тултип
        this.showTooltip = false;
        this.tooltipTimeout = null;
        this.tooltipDelay = 300;
        
        // Анимация
        this.animationProgress = new Array(buttonCount).fill(0);
        this.animationDuration = 150;
    }
    
    draw(ctx) {
        ctx.save(); // ← ВАЖНО: изолируем весь компонент
        
        // Рисуем общий фон
        ctx.fillStyle = '#1a202c';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Рисуем каждую кнопку отдельно
        for (let i = 0; i < this.buttonCount; i++) {
            ctx.save(); // ← ИЗОЛИРУЕМ КАЖДУЮ КНОПКУ!
            
            let buttonX, buttonY, buttonCenterX, buttonCenterY;
            
            // Вычисляем координаты в зависимости от ориентации
            if (this.orientation === 'horizontal') {
                buttonX = this.x + i * this.buttonWidth;
                buttonY = this.y;
                buttonCenterX = buttonX + this.buttonWidth / 2;
                buttonCenterY = buttonY + this.buttonHeight / 2;
            } else {
                // Вертикальная ориентация
                buttonX = this.x;
                buttonY = this.y + i * this.buttonHeight;
                buttonCenterX = buttonX + this.buttonWidth / 2;
                buttonCenterY = buttonY + this.buttonHeight / 2;
            }
            
            // Анимация нажатия
            let scale = 1;
            let offsetY = 0;
            if (this.buttonPressedStates[i]) {
                const progress = this.animationProgress[i] / this.animationDuration;
                scale = 1 - 0.05 * Math.sin(progress * Math.PI);
                offsetY = 0.5 * Math.sin(progress * Math.PI);
            }
            
            const drawX = buttonCenterX - (this.buttonWidth * scale) / 2;
            const drawY = buttonCenterY - (this.buttonHeight * scale) / 2 + offsetY;
            const drawWidth = this.buttonWidth * scale;
            const drawHeight = this.buttonHeight * scale;
            
            // ПРОСТОЙ ФОН (без градиента!)
            if (i === this.selectedIndex) {
                // Выбранная кнопка
                if (this.buttonPressedStates[i]) {
                    ctx.fillStyle = '#3730a3'; // Нажатая
                } else if (this.buttonHoveredStates[i]) {
                    ctx.fillStyle = '#2d3748'; // Hover
                } else {
                    ctx.fillStyle = '#4f46e5'; // Обычная выбраная
                }
            } else {
                // Невыбранная кнопка
                if (this.buttonPressedStates[i]) {
                    ctx.fillStyle = '#2d3748'; // Нажатая
                } else if (this.buttonHoveredStates[i]) {
                    ctx.fillStyle = '#1a202c'; // Hover
                } else {
                    ctx.fillStyle = '#2d3748'; // Обычная
                }
            }
            
            // Обрабатываем скругления для первой и последней кнопки
            const radius = 2;
            let topLeftRadius = 0, topRightRadius = 0, bottomRightRadius = 0, bottomLeftRadius = 0;
            
            if (this.orientation === 'horizontal') {
                if (i === 0) topLeftRadius = bottomLeftRadius = radius; // Первая кнопка
                if (i === this.buttonCount - 1) topRightRadius = bottomRightRadius = radius; // Последняя кнопка
            } else {
                if (i === 0) topLeftRadius = topRightRadius = radius; // Первая кнопка (верхняя)
                if (i === this.buttonCount - 1) bottomLeftRadius = bottomRightRadius = radius; // Последняя кнопка (нижняя)
            }
            
            // Рисуем фон кнопки
            this.drawRoundedRect(
                ctx, 
                drawX, drawY, drawWidth, drawHeight, 
                topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius
            );
            ctx.fill();
            
            // Рамка кнопки
            ctx.strokeStyle = this.buttonHoveredStates[i] ? '#0af' : '#666';
            ctx.lineWidth = 1;
            this.drawRoundedRect(
                ctx, 
                drawX, drawY, drawWidth, drawHeight, 
                topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius
            );
            ctx.stroke();
            
            // Разделительная линия между кнопками
            if (i < this.buttonCount - 1) {
                ctx.beginPath();
                if (this.orientation === 'horizontal') {
                    ctx.moveTo(buttonX + this.buttonWidth, buttonY);
                    ctx.lineTo(buttonX + this.buttonWidth, buttonY + this.buttonHeight);
                } else {
                    ctx.moveTo(buttonX, buttonY + this.buttonHeight);
                    ctx.lineTo(buttonX + this.buttonWidth, buttonY + this.buttonHeight);
                }
                ctx.strokeStyle = '#666';
                ctx.stroke();
            }
            
            // Текст на кнопке
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
                this.labels[i],
                buttonCenterX,
                buttonCenterY + offsetY
            );
            
            ctx.restore(); // ← ВОССТАНАВЛИВАЕМ КОНТЕКСТ ДЛЯ СЛЕДУЮЩЕЙ КНОПКИ
        }
        
        // Индикатор выбранной кнопки (полоска) - рисуем ПОСЛЕ всех кнопок
        ctx.save(); // ← Изолируем индикатор
        
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
        
        ctx.fillStyle = '#0af';
        ctx.fillRect(
            selectedX,
            selectedY,
            indicatorWidth,
            indicatorHeight
        );
        
        ctx.restore(); // ← Восстанавливаем для индикатора
        ctx.restore(); // ← Восстанавливаем для всего компонента
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
        const wasHovered = this.isHovered;
        super.handleMouseMove(x, y);
        
        // Определяем, над какой кнопкой находится мышь
        let newHoveredIndex = null;
        if (this.isHovered) {
            if (this.orientation === 'horizontal') {
                newHoveredIndex = Math.floor((x - this.x) / this.buttonWidth);
            } else {
                newHoveredIndex = Math.floor((y - this.y) / this.buttonHeight);
            }
            
            if (newHoveredIndex >= 0 && newHoveredIndex < this.buttonCount) {
                // Обновляем состояние hover для всех кнопок
                this.buttonHoveredStates.fill(false);
                this.buttonHoveredStates[newHoveredIndex] = true;
            } else {
                newHoveredIndex = null;
            }
        } else {
            this.buttonHoveredStates.fill(false);
        }
        
        this.hoveredButtonIndex = newHoveredIndex;
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
    
    // === ОЧИСТКА ===
    
    // destroy() {
    //     this.clearTooltipTimeout();
    // }
}