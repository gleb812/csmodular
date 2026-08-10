// Panel.js
export const GRID_UNITS = {
    X: 260,
    Y: 15
};

export class Panel {
    constructor(gridX, gridY, gridWidth, gridHeight, title, bgImage = null) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.pixelX = null; // будет вычисляться
        this.pixelY = null; // будет вычисляться
        
        // Pixel координаты из grid
        this.width = gridWidth * GRID_UNITS.X;
        this.height = gridHeight * GRID_UNITS.Y;
        
        this.title = title;
        this.components = [];
        this.bgImage = bgImage;
        this.originalWidth = this.width;
        this.originalHeight = this.height;

        this.opacity = 1.0;
        this.bgOpacity = 1.0;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.isResizing = false;
        this.resizeHandleSize = 10;

        this.lastValidGridX = gridX;  // Добавь это
        this.lastValidGridY = gridY;  // Добавь это
        this.dragOffsetGridX = 0;  // Добавь это
        this.dragOffsetGridY = 0;  // Добавь это
        this.isSelected = false; 

        this.customColor = null;  // ← ДОБАВЛЯЕМ! null = использовать дефолт '#606060'
        this.defaultColor = '#606060';  // дефолтный серый
    }

    addComponent(component) {
        this.components.push(component);
        // Сортируем компоненты по zIndex
        this.sortComponentsByZIndex();
        return component;
    }

    sortComponentsByZIndex() {
        if (this.components.length === 0) return;          
        // Сортируем от меньшего к большему (от фона к переднему плану)
        this.components.sort((a, b) => {
            const aZ = a.zIndex || 0;
            const bZ = b.zIndex || 0;
            // Если zIndex одинаковые, сохраняем исходный порядок
            if (aZ === bZ) {
                return this.components.indexOf(a) - this.components.indexOf(b);
            }
            return aZ - bZ;
        });
    }

    // Метод для установки выделения
    setSelected(selected) {
        this.isSelected = selected;
    }

    setPixelPosition(x, y) {
        this.pixelX = x;
        this.pixelY = y;
        
        if (this.components) {
            this.components.forEach((comp, idx) => {
                if (comp.relX !== undefined && comp.relY !== undefined) {
                    // ВАЖНО: x, y должны быть мировыми координатами!
                    comp.x = x + comp.relX;
                    comp.y = y + comp.relY;
                    
                }
            });
        }
    }

    // Panel.js - измени метод draw (компоненты уже отсортированы)
    draw(ctx) {
        if (this.pixelX === null || this.pixelY === null) return;

        ctx.save();
        ctx.globalAlpha = this.opacity;

        const bgColor = this.customColor || this.defaultColor || '#606060';
        //console.log(`🎨 Drawing panel ${this.title} with color: ${bgColor}`); // ← отладка!
        ctx.fillStyle = bgColor;
        ctx.fillRect(this.pixelX, this.pixelY, this.width, this.height);
            // рамка
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.pixelX, this.pixelY, this.width, this.height);

        
        // === ТОЛЬКО БЕЛЫЙ ТЕКСТ (без обводки) ===
        ctx.fillStyle = '#fff';
        ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(this.title, this.pixelX + 4, this.pixelY + 12);

        // === ТЕКСТ ПРОЗРАЧНОСТИ ===
        if (this.bgImage) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.font = '10px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(
                `UI: ${Math.round(this.opacity * 100)}%`,
                this.pixelX + 5,
                this.pixelY + this.height - 8
            );
        }
        
        // Компоненты (уже отсортированы по zIndex)
        this.components.forEach(comp => comp.draw(ctx));
        
        ctx.restore();
    }

    setUIOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
    }

    // В Panel.js - добавь метод

    setDirty(dirty = true) {
        this.dirty = dirty;
        
        // Также помечаем все компоненты как dirty
        if (this.components) {
            this.components.forEach(comp => {
                if (comp.setDirty) {
                    comp.setDirty(dirty);
                } else {
                    comp.dirty = dirty;
                }
            });
        }
        
        // Если есть родительская система - говорим ей о необходимости перерисовки
        if (this.parentSystem) {
            this.parentSystem.needsRedraw = true;
        }
    }

    setBackground(image) {
        this.bgImage = image;
        if (image) {
            this.originalWidth = image.width;
            this.originalHeight = image.height;
            this.width = image.width;
            this.height = image.height;
        }
    }

    checkJackClick(x, y) {
        // Проверяем клик на джеках
        for (const component of this.components) {
            if ((component.constructor?.name === 'Input' || 
                 component.constructor?.name === 'Output') &&
                component.contains(x, y, this)) {
                
                // Добавляем ссылку на модуль
                component.module = this;
                component.moduleId = this.moduleId;
                
                return component;
            }
        }
        return null;
    }

    handleMouseMove(x, y) {
        this.components.forEach(comp => {
            if (comp.handleMouseMove) comp.handleMouseMove(x, y);
        });
    }

    // Panel.js - исправленный startDrag
    startDrag(startX, startY, systemRef) {       
        if (this.isPointInsidePanel(startX, startY)) {
            this.isDragging = true;
            
            // ВАЖНО: получаем позицию слоя из системы
            let layerX = 0;
            let layerY = 0;
            
            if (systemRef && this.layer && systemRef.layers[this.layer]) {
                const layer = systemRef.layers[this.layer];
                layerX = layer.x;
                layerY = layer.y;
            }
            
            // Вычисляем grid координаты ОТНОСИТЕЛЬНО СЛОЯ
            const relativeX = startX - layerX;
            const relativeY = startY - layerY;
            
            const mouseGridX = Math.floor(relativeX / GRID_UNITS.X);
            const mouseGridY = Math.floor(relativeY / GRID_UNITS.Y);
            
            // Запоминаем смещение
            this.dragOffsetGridX = mouseGridX - this.gridX;
            this.dragOffsetGridY = mouseGridY - this.gridY;       
            return {
                handleDrag: (x, y) => {
                    this.handlePanelDrag(x, y, systemRef);
                },
                endDrag: () => {
                    this.isDragging = false;
                },
                type: 'drag',
                module: this
            };
        }
        
        return null;
    }

    // Panel.js - измени startPanelDrag
    startPanelDrag(startX, startY, systemRef) {  // <-- Добавили третий параметр
        if (this.isPointInsidePanel(startX, startY)) {
            this.isDragging = true;
            
            const mouseGridX = Math.floor(startX / GRID_UNITS.X);
            const mouseGridY = Math.floor(startY / GRID_UNITS.Y);
            this.dragOffsetGridX = mouseGridX - this.gridX;
            this.dragOffsetGridY = mouseGridY - this.gridY;
            
            // Сохраняем ссылки для использования в замыкании
            const panelInstance = this;
            
            return {
                handleDrag: (x, y, systemRefFromCall, scale) => {
                    // Используем systemRef из параметра или из замыкания
                    const finalSystemRef = systemRefFromCall || systemRef;
                    panelInstance.handlePanelDrag(x, y, finalSystemRef, scale);
                },
                endDrag: () => {
                    panelInstance.endPanelDrag();
                },
                type: 'drag',
                module: this
            };
        }
        return null;
    }

    // Временная отладка в Panel.js
    isPointInsidePanel(px, py) {
        if (this.pixelX === null || this.pixelY === null) {
            return false;
        }
        
        const isInside = px >= this.pixelX && 
                         px <= this.pixelX + this.width && 
                         py >= this.pixelY && 
                         py <= this.pixelY + this.height;
        return isInside;
    }

    // Panel.js - исправленный handlePanelDrag
    handlePanelDrag(x, y, systemRef = null) {
        if (!this.isDragging) return;
        
        // Получаем позицию слоя
        let layerX = 0;
        let layerY = 0;
        
        if (systemRef && this.layer && systemRef.layers[this.layer]) {
            const layer = systemRef.layers[this.layer];
            layerX = layer.x;
            layerY = layer.y;
        }
        
        // Вычисляем grid координаты ОТНОСИТЕЛЬНО СЛОЯ
        const relativeX = x - layerX;
        const relativeY = y - layerY;
        
        const mouseGridX = Math.floor(relativeX / GRID_UNITS.X);
        const mouseGridY = Math.floor(relativeY / GRID_UNITS.Y);
        
        // Вычисляем целевую позицию
        const targetGridX = mouseGridX - this.dragOffsetGridX;
        const targetGridY = mouseGridY - this.dragOffsetGridY;
        
        // Проверяем коллизии
        if (systemRef && this.layer) {
            const canMove = systemRef.isGridCellFree(
                this.layer,
                targetGridX,
                targetGridY,
                this.gridWidth,
                this.gridHeight,
                this
            );
            
            if (canMove) {
                this.gridX = targetGridX;
                this.gridY = targetGridY;
            } else {
                console.log(`     ❌ Collision at: [${targetGridX}, ${targetGridY}]`);
            }
        } else {
            // Без проверки
            this.gridX = targetGridX;
            this.gridY = targetGridY;
        }
    }
    endPanelDrag() {
        this.isDragging = false;
        this.isResizing = false;
    }

    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
    }
}