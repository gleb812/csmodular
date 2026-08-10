// src/managers/EventManager.js
export class EventManager {
    constructor(canvas, system) {
        this.canvas = canvas;
        this.system = system;
        
        // Состояние для обработки событий
        this.lastMouseX = null;
        this.lastMouseY = null;
        
        // Настройка обработчиков
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
        this.canvas.addEventListener('contextmenu', (e) => this.handleContextMenu(e));
    }
    
    // === ОСНОВНЫЕ ОБРАБОТЧИКИ СОБЫТИЙ ===
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const worldX = (x - this.system.offsetX) / this.system.scale;
        const worldY = (y - this.system.offsetY) / this.system.scale;

        // === ШАГ 1: ПРОВЕРКА ВЫСШИХ ПРИОРИТЕТОВ ===
        
        // 1A. Если уже перетаскиваем кабель - завершаем его
        if (this.system.patchManager.draggingCable) {
            this.system.patchManager.endCableDrag(this.system.patchManager.hoverJack);
            e.preventDefault();
            return;
        }

        // 1B. Разделитель между зонами
        const screenY = y;
        if (this.system.layerManager.checkDividerClick(screenY)) {
            this.system.layerManager.startDividerDrag(screenY);
            e.preventDefault();
            return;
        }

        // 1C. Удаление кабелей (Shift+клик)
        if (e.shiftKey) {
            const clickedCable = this.system.patchManager.checkCableClick(worldX, worldY);
            if (clickedCable) {
                this.system.patchManager.removeCable(clickedCable);
                e.preventDefault();
                return;
            }
        }

        // === ШАГ 2: ДЖЕК-ПОРТЫ (входы/выходы) ===
        
        // Проверяем клик на джеках для создания кабелей
        let jackClicked = false;
        for (let panel of this.system.components) {
            const jack = panel.checkJackClick(worldX, worldY);
            if (jack) {
                this.system.patchManager.startCableDrag(jack, worldX, worldY);
                jackClicked = true;
                e.preventDefault();
                break;
            }
        }
        if (jackClicked) return;

        // === ШАГ 3: ПАНЕЛИ И ИХ ЭЛЕМЕНТЫ ===
        
        // Проверяем панели сверху вниз (последние нарисованные - сверху)
        for (let i = this.system.components.length - 1; i >= 0; i--) {
            const panel = this.system.components[i];
            
            // Если клик внутри панели
            if (panel.isPointInsidePanel(worldX, worldY)) {
              
                // === ШАГ 3A: ПРОВЕРКА ЭЛЕМЕНТОВ ПАНЕЛИ ===
                
                // Проверяем элементы панели (сверху вниз)
                let elementClicked = false;
                
                for (let j = panel.components.length - 1; j >= 0; j--) {
                    const element = panel.components[j];
                    
                    // Пропускаем джеки (они уже обработаны выше)
                    const isJack = element.constructor?.name === 'Input' || 
                                  element.constructor?.name === 'Output';
                    if (isJack) continue;
                    
                    // Проверяем, кликнули ли на элементе
                    if (element.isPointInside(worldX, worldY)) {
                        
                        // Если элемент имеет handleClick - вызываем его
                        if (element.handleClick) {
                            const result = element.handleClick(worldX, worldY);
                            elementClicked = true;
                            
                            // Если элемент вернул drag-объект (например, ручка)
                            if (result && typeof result === 'object' && result.type === 'component-drag') {
                                this.system.draggingComponent = result;
                            }
                            
                            // Клик обработан элементом - выходим
                            e.preventDefault();
                            return;
                        }
                    }
                }
                
                // === ШАГ 3B: КЛИК НА ФОНЕ ПАНЕЛИ ===
                
                // Если не кликнули на элементе, но клик внутри панели
                if (!elementClicked) {
                    
                    // Снимаем старое выделение
                    this.system.deselectModule();
                    
                    // Выделяем эту панель
                    this.system.selectModule(panel);
                    
                    // Начинаем перетаскивание ПАНЕЛИ
                    const dragResult = panel.startDrag(worldX, worldY, this.system);
                    if (dragResult) {
                        this.system.draggingComponent = dragResult;
                    }
                    
                    e.preventDefault();
                    return;
                }
                
                break; // Не проверяем другие панели
            }
        }

        // === ШАГ 4: КЛИК НА ПУСТОМ МЕСТЕ ===
        if (e.button === 2 || e.ctrlKey) {
            // Предотвращаем стандартное поведение
            e.preventDefault();
            
            // Определяем что под курсором и открываем соответствующее меню
            this.openContextMenuAtPosition(e.clientX, e.clientY);
            
            // Также снимаем выделение модуля если было
            this.system.deselectModule();
            
            return;
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.lastMouseX = x;
        this.lastMouseY = y;
        this.updateMousePosition(x, y);
        
        const worldX = (x - this.system.offsetX) / this.system.scale;
        const worldY = (y - this.system.offsetY) / this.system.scale;

        // === ШАГ 1: ПЕРЕТАСКИВАНИЕ КАБЕЛЯ ===
        if (this.system.patchManager.draggingCable) {
            this.system.patchManager.updateCableDrag(worldX, worldY);
            
            // Проверяем, есть ли джек под курсором
            let hoverJack = null;
            for (let panel of this.system.components) {
                const jack = panel.checkJackClick(worldX, worldY);
                if (jack && jack !== this.system.patchManager.startJack) {
                    hoverJack = jack;
                    break;
                }
            }
            this.system.patchManager.hoverJack = hoverJack;
            
            this.canvas.style.cursor = hoverJack ? 'crosshair' : 'default';
            e.preventDefault();
            return;
        }

        // === ШАГ 2: ПЕРЕТАСКИВАНИЕ РАЗДЕЛИТЕЛЯ ===
        if (this.system.layerManager.divider.isDragging) {
            const updated = this.system.layerManager.updateDividerDrag(y);
            if (updated) {
                this.canvas.style.cursor = 'row-resize';
            }
            e.preventDefault();
            return;
        }

        // === ШАГ 3: ПЕРЕТАСКИВАНИЕ КОМПОНЕНТА (ручки и т.д.) ===
        if (this.system.draggingComponent && this.system.draggingComponent.type === 'component-drag') {
            if (this.system.draggingComponent.handleDrag) {
                this.system.draggingComponent.handleDrag(worldX, worldY);
            }
            e.preventDefault();
            return;
        }

        // === ШАГ 4: ПЕРЕТАСКИВАНИЕ ПАНЕЛИ ===
        if (this.system.draggingComponent && this.system.draggingComponent.type === 'drag' && this.system.draggingComponent.module) {
            if (this.system.draggingComponent.handleDrag) {
                this.system.draggingComponent.handleDrag(worldX, worldY);
            }
            e.preventDefault();
            return;
        }

        // === ШАГ 5: ПАНОРАМИРОВАНИЕ ===
        if (this.system.isPanning) {
            this.system.offsetX = this.system.startOffsetX + (x - this.system.startPanX);
            this.system.offsetY = this.system.startOffsetY + (y - this.system.startPanY);
            e.preventDefault();
            return;
        }


        // === ПРАВЫЙ КЛИК НА ДЖЕКЕ ===
        if (e.button === 2 || e.ctrlKey) { // Правый клик или Ctrl+клик
            // Ищем джек под курсором
            for (let panel of this.system.components) {
                const jack = panel.checkJackClick(worldX, worldY);
                if (jack) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Показываем меню для джека
                    if (this.system.jackContextMenu) {
                        this.system.jackContextMenu.show(jack, e.clientX, e.clientY);
                    }
                    return;
                }
            }
        }

        // === ШАГ 6: ОБНОВЛЕНИЕ СОСТОЯНИЯ ЭЛЕМЕНТОВ (hover) ===
        
        this.system.components.forEach(module => {
            if (module.handleMouseMove) {
                module.handleMouseMove(worldX, worldY);
            }
        });
        
        // Определяем что под курсором для изменения курсора
        const jack = this.getJackAtPosition(worldX, worldY);
        const module = this.getModuleAtPosition(worldX, worldY);
        
        // Меняем курсор в зависимости от контекста
        if (jack) {
            this.canvas.style.cursor = 'pointer';
        } else if (module) {
            this.canvas.style.cursor = 'context-menu';
        } else {
            // Возвращаем стандартный курсор если не перетаскиваем что-то
            if (!this.system.patchManager.draggingCable && 
                !this.system.layerManager.divider.isDragging &&
                !this.system.isPanning) {
                this.canvas.style.cursor = 'default';
            }
        }
    }
    
    handleMouseUp(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const worldX = (x - this.system.offsetX) / this.system.scale;
        const worldY = (y - this.system.offsetY) / this.system.scale;

        // === ШАГ 1: ЗАВЕРШЕНИЕ ПЕРЕТАСКИВАНИЯ КАБЕЛЯ ===
        if (this.system.patchManager.draggingCable || this.system.patchManager.startJack) {
            
            let endJack = null;
            for (let panel of this.system.components) {
                const jack = panel.checkJackClick(worldX, worldY);
                if (jack && jack !== this.system.patchManager.startJack) {
                    endJack = jack;
                    break;
                }
            }
            
            const cableCreated = this.system.patchManager.endCableDrag(endJack);
            
            if (cableCreated) {
                console.log(`  ✅ Кабель создан`);
            } else if (endJack) {
                console.log(`  ❌ Не удалось создать кабель`);
            } else {
                //console.log(`  🚫 Отмена перетаскивания кабеля`);
                this.system.patchManager.cancelCableDrag();
            }
            
            e.preventDefault();
            return;
        }

        // === ШАГ 2: ЗАВЕРШЕНИЕ ПЕРЕТАСКИВАНИЯ КОМПОНЕНТА ===
        if (this.system.draggingComponent && this.system.draggingComponent.type === 'component-drag') {
            if (this.system.draggingComponent.endDrag) {
                this.system.draggingComponent.endDrag();
            }
            this.system.draggingComponent = null;
            e.preventDefault();
            return;
        }

        // === ШАГ 3: ЗАВЕРШЕНИЕ ПЕРЕТАСКИВАНИЯ ПАНЕЛИ ===
        if (this.system.draggingComponent && this.system.draggingComponent.type === 'drag') {
            if (this.system.draggingComponent.endDrag) {
                this.system.draggingComponent.endDrag();
            }
            this.system.draggingComponent = null;
            e.preventDefault();
            return;
        }

        // === ШАГ 4: ЗАВЕРШЕНИЕ ПЕРЕТАСКИВАНИЯ РАЗДЕЛИТЕЛЯ ===
        if (this.system.layerManager.divider.isDragging) {
            this.system.layerManager.endDividerDrag();
            this.canvas.style.cursor = 'default';
            e.preventDefault();
            return;
        }

        // === ШАГ 5: ЗАВЕРШЕНИЕ ПАНОРАМИРОВАНИЯ ===
        if (this.system.isPanning) {
            this.system.isPanning = false;
            this.canvas.style.cursor = 'default';
            e.preventDefault();
            return;
        }

        // Сбрасываем курсор по умолчанию
        this.canvas.style.cursor = 'default';
    }
    
    handleMouseWheel(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const y = e.clientY - rect.top;
        
        //console.log(`=== WHEEL === deltaY: ${e.deltaY}`);
        
        const scrolledLayer = this.system.layerManager.handleWheel(e.deltaY, y);
        //console.log(`  ${scrolledLayer === 'voice' ? '🔊' : '🎛️'} ${scrolledLayer} скролл`);
    }
    
    handleContextMenu(e) {
        // Всегда предотвращаем стандартное меню браузера
        e.preventDefault();
        
        // Открываем интеллектуальное меню
        this.openContextMenuAtPosition(e.clientX, e.clientY);
        
        // Также отменяем активное перетаскивание кабеля если было
        if (this.system.patchManager.startJack) {
            this.system.patchManager.cancelCableDrag();
        }
    }
    
    // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

    openContextMenuAtPosition(screenX, screenY) {
        // Конвертируем экранные координаты в мировые
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = screenX - rect.left;
        const canvasY = screenY - rect.top;
        
        const worldPos = this.getWorldPosition(canvasX, canvasY);
        
        // Определяем что под курсором в порядке приоритета:
        // 1. Джек (самый высокий приоритет)
        // 2. Модуль
        // 3. Пустое место
        
        const jack = this.getJackAtPosition(worldPos.x, worldPos.y);
        if (jack) {
            // Открываем меню джека
            if (this.system.jackContextMenu) {
                this.system.jackContextMenu.show(jack, screenX, screenY);
            }
            return 'jack';
        }
        
        const module = this.getModuleAtPosition(worldPos.x, worldPos.y);
        if (module) {
            // Открываем меню модуля
            if (this.system.moduleContextMenu) {
                this.system.moduleContextMenu.show(module, screenX, screenY);
            }
            return 'module';
        }
        
        // Если ничего не найдено - открываем основное меню
        if (this.system.contextMenu) {
            this.system.contextMenu.show(screenX, screenY);
        }
        return 'main';
    }

    updateMousePosition(x, y) {
        this.lastMouseX = x;
        this.lastMouseY = y;
    }

    getModuleAtPosition(worldX, worldY) {
        // Проверяем модули сверху вниз (последние нарисованные - сверху)
        for (let i = this.system.components.length - 1; i >= 0; i--) {
            const module = this.system.components[i];
            if (module.isPointInsidePanel && 
                module.isPointInsidePanel(worldX, worldY)) {
                return module;
            }
        }
        return null;
    }

    getJackAtPosition(worldX, worldY) {
        // Используем уже существующую логику
        for (let panel of this.system.components) {
            const jack = panel.checkJackClick(worldX, worldY);
            if (jack) {
                return jack;
            }
        }
        return null;
    }
   
    getMousePosition() {
        return { x: this.lastMouseX, y: this.lastMouseY };
    }
    
    getWorldPosition(canvasX, canvasY) {
        // canvasX, canvasY уже координаты на канвасе
        const worldX = (canvasX - this.system.offsetX) / this.system.scale;
        const worldY = (canvasY - this.system.offsetY) / this.system.scale;
        
        console.log(`🌍 Canvas (${canvasX}, ${canvasY}) → World (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) with offset (${this.system.offsetX}, ${this.system.offsetY}) scale ${this.system.scale}`);
        
        return { x: worldX, y: worldY };
    }
}