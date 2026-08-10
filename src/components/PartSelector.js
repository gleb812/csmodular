// components/PartSelector.js
import { BaseComponent } from './BaseComponent.js';

export class PartSelector extends BaseComponent {
    constructor(x, y, width = 100, height = 30, imageCount = 5, menuOffset = 0, menuItems = null) {

        super(x, y, width, height);
        
        this.isInteractive = true;
        this.supportsDrag = false;
        
        // Сохраняем оригинальные параметры для совместимости
        this.imageCount = imageCount;
        this.menuOffset = menuOffset;
        
        // Обрабатываем menuItems в разных форматах
        if (menuItems && Array.isArray(menuItems)) {
            if (typeof menuItems[0] === 'string') {
                // Формат: ["mee", "wee"]
                this.menuItems = menuItems.slice(0, imageCount).map((label, index) => ({
                    id: index + menuOffset,
                    label: label,
                    value: index + menuOffset
                }));
            } else if (typeof menuItems[0] === 'object' && menuItems[0].label) {
                // Формат: [{label: "mee", value: 0}, ...]
                this.menuItems = menuItems.slice(0, imageCount);
            }
        } else {
            // Старый формат - создаем массив по imageCount
            this.menuItems = new Array(imageCount).fill(null).map((_, i) => ({
                id: i + menuOffset,
                label: `Item ${i + 1}`,
                value: i + menuOffset
            }));
        }
        
        this.selectedIndex = menuOffset || 0;
        this.isExpanded = false;
        this.isPressed = false;
        this.onSelect = null;
        this.hoveredItemIndex = -1;
        
        // Csound-интеграция
        this.csoundChannel = null;
        
        // Новые свойства для стиля как у ButtonFlat
        this.bgColor = '#2d3748';
        this.hoverBgColor = '#4a5568';
        this.pressedBgColor = '#4f46e5';
        this.textColor = '#fff';
        this.borderColor = '#666';
        this.hoverBorderColor = '#0af';
        
        // Параметры меню
        this.itemHeight = 16;
        this.menuMaxHeight = 120;
        this.menuWidth = width;
        
        // Анимация
        this.animationProgress = 0;
        this.animationDuration = 150;
        
        // Глобальный обработчик кликов
        this.globalClickHandler = null;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.lineWidth = 1;
        
        // Анимация нажатия
        let scale = 1;
        let offsetY = 0;
        if (this.isPressed) {
            const progress = this.animationProgress / this.animationDuration;
            scale = 1 - 0.05 * Math.sin(progress * Math.PI);
            offsetY = 0.5 * Math.sin(progress * Math.PI);
        }
        
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const drawX = centerX - (this.width * scale) / 2;
        const drawY = centerY - (this.height * scale) / 2 + offsetY;
        const drawWidth = this.width * scale;
        const drawHeight = this.height * scale;
        
        // Фон с градиентом как у ButtonFlat
        const gradient = ctx.createLinearGradient(
            drawX, drawY,
            drawX, drawY + drawHeight
        );
        
        if (this.isPressed) {
            gradient.addColorStop(0, '#4f46e5');
            gradient.addColorStop(1, '#3730a3');
        } else if (this.isHovered) {
            gradient.addColorStop(0, '#4a5568');
            gradient.addColorStop(1, '#2d3748');
        } else {
            gradient.addColorStop(0, '#2d3748');
            gradient.addColorStop(1, '#1a202c');
        }
        
        // Рисуем фон с скруглёнными углами
        ctx.fillStyle = gradient;
        const radius = 4;
        
        if (ctx.roundRect) {
            ctx.roundRect(drawX, drawY, drawWidth, drawHeight, radius);
            ctx.fill();
        } else {
            this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
            ctx.fill();
        }
        
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
        
        // Текст выбранного элемента
        if (this.menuItems[this.selectedIndex]) {
            const item = this.menuItems[this.selectedIndex];
            const text = item.label || `Item ${this.selectedIndex + 1}`;
            
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 8px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Обрезаем текст если слишком длинный
            const maxChars = Math.floor(this.width / 5);
            const displayText = text.length > maxChars ? 
                text.substring(0, maxChars - 2) + '..' : text;
            
            ctx.fillText(displayText, centerX, centerY + offsetY);
        }
        
        // Стрелка вниз/вверх
        ctx.fillStyle = this.isHovered ? '#0af' : '#ccc';
        const arrowSize = 3;
        const arrowX = drawX + drawWidth - 10;
        const arrowY = centerY + offsetY;
        
        ctx.beginPath();
        if (this.isExpanded) {
            // Стрелка вверх при открытом меню
            ctx.moveTo(arrowX - arrowSize, arrowY + arrowSize);
            ctx.lineTo(arrowX + arrowSize, arrowY + arrowSize);
            ctx.lineTo(arrowX, arrowY - arrowSize);
        } else {
            // Стрелка вниз при закрытом меню
            ctx.moveTo(arrowX - arrowSize, arrowY - arrowSize);
            ctx.lineTo(arrowX + arrowSize, arrowY - arrowSize);
            ctx.lineTo(arrowX, arrowY + arrowSize);
        }
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // Рисуем меню если раскрыто
        if (this.isExpanded) {
            this.drawMenu(ctx);
        }
    }
    
    drawMenu(ctx) {
        ctx.save();
        
        // Рассчитываем позицию меню
        const menuHeight = Math.min(
            this.menuItems.length * this.itemHeight,
            this.menuMaxHeight
        );
        
        // Проверяем, где больше места - внизу или вверху
        const canvas = ctx.canvas;
        const spaceBelow = canvas.height - (this.y + this.height);
        const spaceAbove = this.y;
        
        let menuX = this.x;
        let menuY;
        
        if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
            // Открываем вниз
            menuY = this.y + this.height + 2;
        } else {
            // Открываем вверх
            menuY = this.y - menuHeight - 2;
        }
        
        // Фон меню с прозрачностью
        ctx.fillStyle = 'rgba(26, 32, 44, 0.95)';
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 1;
        
        if (ctx.roundRect) {
            ctx.roundRect(menuX, menuY, this.menuWidth, menuHeight, 4);
            ctx.fill();
            ctx.stroke();
        } else {
            this.drawRoundedRect(ctx, menuX, menuY, this.menuWidth, menuHeight, 4);
            ctx.fill();
            ctx.stroke();
        }
        
        // Тень/обводка для эффекта "поверх всего"
        ctx.strokeStyle = 'rgba(0, 170, 255, 0.3)';
        ctx.lineWidth = 2;
        
        if (ctx.roundRect) {
            ctx.roundRect(menuX, menuY, this.menuWidth, menuHeight, 4);
            ctx.stroke();
        } else {
            this.drawRoundedRect(ctx, menuX, menuY, this.menuWidth, menuHeight, 4);
            ctx.stroke();
        }
        
        // Пункты меню
        const visibleItems = Math.min(
            this.menuItems.length,
            Math.floor(this.menuMaxHeight / this.itemHeight)
        );
        
        for (let i = 0; i < visibleItems; i++) {
            const itemY = menuY + (i * this.itemHeight);
            const isHovered = this.hoveredItemIndex === i;
            const isSelected = this.selectedIndex === i;
            
            // Фон при наведении
            if (isHovered) {
                ctx.fillStyle = 'rgba(74, 85, 104, 0.7)';
                ctx.fillRect(menuX, itemY, this.menuWidth, this.itemHeight);
            }
            
            // Индикатор выбранного пункта
            if (isSelected) {
                ctx.fillStyle = '#4f46e5';
                ctx.fillRect(menuX, itemY, 3, this.itemHeight);
            }
            
            // Текст
            const item = this.menuItems[i];
            const text = item.label || `Item ${i + 1}`;
            
            ctx.fillStyle = isHovered ? '#fff' : '#ccc';
            ctx.font = '8px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            
            // Обрезаем текст если нужно
            const maxChars = Math.floor(this.menuWidth / 5);
            const displayText = text.length > maxChars ? 
                text.substring(0, maxChars - 2) + '..' : text;
            
            ctx.fillText(displayText, menuX + 8, itemY + this.itemHeight / 2);
            
            // Разделитель между пунктами (кроме последнего)
            if (i < visibleItems - 1) {
                ctx.beginPath();
                ctx.moveTo(menuX + 5, itemY + this.itemHeight);
                ctx.lineTo(menuX + this.menuWidth - 5, itemY + this.itemHeight);
                ctx.strokeStyle = '#4a5568';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
        
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
        console.log(`📋 PartSelector.handleClick at (${x}, ${y})`);
        
        // Проверяем клик по самому селектору
        if (this.isPointInside(x, y)) {
            if (this.isExpanded) {
                this.closeMenu();
            } else {
                this.openMenu();
            }
            
            this.startAnimation();
            
            return {
                type: 'component-click',
                component: this,
                componentType: 'part-selector'
            };
        }
        
        // Проверяем клик по пункту меню
        if (this.isExpanded) {
            const clickedIndex = this.getClickedMenuItemIndex(x, y);
            if (clickedIndex >= 0) {
                this.selectItem(clickedIndex);
                this.closeMenu();
                return true;
            } else {
                // Клик вне меню
                this.closeMenu();
            }
        }
        
        return false;
    }
    
    openMenu() {
        this.isExpanded = true;
        this.isPressed = true;
        
        // Регистрируем глобальный обработчик для закрытия по клику вне
        setTimeout(() => {
            this.globalClickHandler = (e) => this.handleGlobalClick(e);
            document.addEventListener('mousedown', this.globalClickHandler);
        }, 10);
        
        console.log('📋 PartSelector menu opened');
    }
    
    closeMenu() {
        this.isExpanded = false;
        this.hoveredItemIndex = -1;
        this.isPressed = false;
        
        // Убираем глобальный обработчик
        if (this.globalClickHandler) {
            document.removeEventListener('mousedown', this.globalClickHandler);
            this.globalClickHandler = null;
        }
        
        console.log('📋 PartSelector menu closed');
    }
    
    handleGlobalClick(e) {
        // Проверяем, был ли клик внутри нашего компонента
        const canvas = document.getElementById('modularCanvas');
        const rect = canvas.getBoundingClientRect();
        
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        // Конвертируем в мировые координаты
        const worldX = (clickX - modularSystem.offsetX) / modularSystem.scale;
        const worldY = (clickY - modularSystem.offsetY) / modularSystem.scale;
        
        // Проверяем, был ли клик внутри селектора или меню
        const isInSelector = this.isPointInside(worldX, worldY);
        const isInMenu = this.isExpanded && this.isPointInMenuArea(worldX, worldY);
        
        if (!isInSelector && !isInMenu) {
            this.closeMenu();
        }
    }
    
    selectItem(index) {
        if (index >= 0 && index < this.menuItems.length) {
            const oldIndex = this.selectedIndex;
            this.selectedIndex = index;
            
            // Отправляем в Csound
            if (window.csound && this.csoundChannel) {
                window.csound.setControlChannel(this.csoundChannel, index)
                    .then(() => {}, () => {});
            }
            
            // Вызываем обработчик
            if (this.onSelect) {
                const item = this.menuItems[index];
                this.onSelect(index, item, oldIndex);
            }
            
            console.log(`📋 PartSelector selected: ${index} (${this.menuItems[index]?.label || this.menuItems[index]})`);
        }
    }
    
    startAnimation() {
        this.animationProgress = this.animationDuration;
        const animate = () => {
            this.animationProgress -= 16;
            
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
        
        if (this.isExpanded) {
            // Обновляем hover для пунктов меню
            this.updateHoveredItem(x, y);
        }
    }
    
    updateHoveredItem(x, y) {
        if (!this.isExpanded) {
            this.hoveredItemIndex = -1;
            return;
        }
        
        if (this.isPointInMenuArea(x, y)) {
            const menuBounds = this.getMenuBounds();
            const relativeY = y - menuBounds.y;
            const itemIndex = Math.floor(relativeY / this.itemHeight);
            
            // Ограничиваем индекс видимыми пунктами
            const visibleItems = Math.min(
                this.menuItems.length,
                Math.floor(this.menuMaxHeight / this.itemHeight)
            );
            
            if (itemIndex >= 0 && itemIndex < visibleItems) {
                this.hoveredItemIndex = itemIndex;
            } else {
                this.hoveredItemIndex = -1;
            }
        } else {
            this.hoveredItemIndex = -1;
        }
    }
    
    isPointInMenuArea(x, y) {
        if (!this.isExpanded) return false;
        
        const menuBounds = this.getMenuBounds();
        return x >= menuBounds.x && 
               x <= menuBounds.x + menuBounds.width && 
               y >= menuBounds.y && 
               y <= menuBounds.y + menuBounds.height;
    }
    
    getMenuBounds() {
        if (!this.isExpanded) return { x: 0, y: 0, width: 0, height: 0 };
        
        const menuHeight = Math.min(
            this.menuItems.length * this.itemHeight,
            this.menuMaxHeight
        );
        
        const canvas = document.getElementById('modularCanvas');
        const spaceBelow = canvas.height - (this.y + this.height);
        const spaceAbove = this.y;
        
        let menuY;
        if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
            menuY = this.y + this.height + 2;
        } else {
            menuY = this.y - menuHeight - 2;
        }
        
        return {
            x: this.x,
            y: menuY,
            width: this.menuWidth,
            height: menuHeight
        };
    }
    
    getClickedMenuItemIndex(x, y) {
        if (!this.isPointInMenuArea(x, y)) return -1;
        
        const menuBounds = this.getMenuBounds();
        const relativeY = y - menuBounds.y;
        const itemIndex = Math.floor(relativeY / this.itemHeight);
        
        // Ограничиваем индекс видимыми пунктами
        const visibleItems = Math.min(
            this.menuItems.length,
            Math.floor(this.menuMaxHeight / this.itemHeight)
        );
        
        if (itemIndex >= 0 && itemIndex < visibleItems) {
            return itemIndex;
        }
        
        return -1;
    }
    
    // === УПРАВЛЕНИЕ СОСТОЯНИЕМ ===
    
    setSelectedIndex(index) {
        if (index >= 0 && index < this.menuItems.length) {
            this.selectedIndex = index;
        }
    }
    
    setMenuItems(items) {
        if (items && Array.isArray(items)) {
            if (typeof items[0] === 'string') {
                this.menuItems = items.map((label, index) => ({
                    id: index,
                    label: label,
                    value: index
                }));
            } else if (typeof items[0] === 'object') {
                this.menuItems = items;
            }
            
            if (this.selectedIndex >= this.menuItems.length) {
                this.selectedIndex = Math.max(0, this.menuItems.length - 1);
            }
        }
    }
    
    getState() {
        return {
            selectedIndex: this.selectedIndex,
            selectedItem: this.menuItems[this.selectedIndex],
            menuItems: [...this.menuItems]
        };
    }
    
    // === Csound-ИНТЕГРАЦИЯ ===
    
    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }
    
    // === СТАРЫЕ МЕТОДЫ ДЛЯ СОВМЕСТИМОСТИ ===
    
    // Для обратной совместимости со старым кодом
    onClick(x, y) {
        return this.handleClick(x, y);
    }
    
    onHover(x, y) {
        this.handleMouseMove(x, y);
        return this.isHovered;
    }
    
    getSelectedItem() {
        return this.menuItems[this.selectedIndex];
    }
    
    // === ОЧИСТКА ===
    
    destroy() {
        this.closeMenu();
    }
}