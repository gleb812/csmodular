// editor/ModulePropertiesWindow.js
import { ColorPicker } from '../src/ui/ColorPicker.js';

export class ModulePropertiesWindow {
    constructor(app) {
        this.app = app;
        this.windowElement = null;
        this.isVisible = false;
        this.colorPicker = null;
        
        this.createWindow();
        this.setupEventListeners();
    }

    // editor/ModulePropertiesWindow.js - добавляем drag

    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'module-properties-window';
        this.windowElement.style.cssText = `
            position: fixed;
            left: 210px;
            top: 10px;
            width: 260px;
            background: rgba(30, 30, 30, 0.95);
            padding: 15px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            border: 1px solid #444;
            z-index: 1001;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
            user-select: none;
            display: none;
            cursor: default;
        `;

        // ⭐ Добавляем заголовок-ручку для перетаскивания
        this.windowElement.innerHTML = `
            <div id="properties-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: move; padding: 4px 0;">
                <span style="color: #0af; font-weight: bold; font-size: 13px;">📦 Module Properties</span>
                <button id="close-properties-btn" style="background: transparent; border: none; color: #666; cursor: pointer; font-size: 16px; padding: 0 4px;">✕</button>
            </div>
            
            <!-- Название модуля -->
            <div style="margin-bottom: 10px;">
                <label style="color: #888; font-size: 10px; display: block; margin-bottom: 3px;">Module Name</label>
                <input id="module-name-input" type="text" value="New Module" 
                       style="width: 100%; padding: 4px 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 3px; color: white; font-size: 12px; box-sizing: border-box;">
            </div>
            
            <!-- Размер -->
            <div style="margin-bottom: 10px;">
                <label style="color: #888; font-size: 10px; display: block; margin-bottom: 3px;">Size (grid cells)</label>
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1;">
                        <label style="color: #666; font-size: 9px;">Width (1-3)</label>
                        <input id="module-width-input" type="number" min="1" max="3" value="1"
                               style="width: 100%; padding: 4px 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 3px; color: white; font-size: 12px; box-sizing: border-box;">
                    </div>
                    <div style="flex: 1;">
                        <label style="color: #666; font-size: 9px;">Height (3-10)</label>
                        <input id="module-height-input" type="number" min="3" max="10" value="3"
                               style="width: 100%; padding: 4px 8px; background: #1a1a1a; border: 1px solid #444; border-radius: 3px; color: white; font-size: 12px; box-sizing: border-box;">
                    </div>
                </div>
            </div>
            
            <!-- Цвет -->
            <div style="margin-bottom: 12px;">
                <label style="color: #888; font-size: 10px; display: block; margin-bottom: 3px;">Panel Color</label>
                <div id="color-picker-container"></div>
            </div>
            
            <!-- Кнопка Save -->
            <button id="save-module-btn" style="width: 100%; padding: 8px; background: linear-gradient(to bottom, #0a5, #083); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; font-size: 12px;">
                💾 Save Module
            </button>
            
            <div style="margin-top: 8px; font-size: 9px; color: #555; text-align: center;">
                Module will be saved to user_modules/js/
            </div>
        `;

        document.body.appendChild(this.windowElement);

        // ⭐ Добавляем drag функциональность
        this.makeDraggable();

        // Инициализируем ColorPicker
        this.initColorPicker();

        // Обработчики
        this.windowElement.querySelector('#close-properties-btn').onclick = () => this.hide();
        
        this.windowElement.querySelector('#module-name-input').onchange = () => {
            if (this.app.module) {
                this.app.module.title = this.windowElement.querySelector('#module-name-input').value;
            }
        };

        this.windowElement.querySelector('#module-width-input').onchange = () => {
            this.updateModuleSize();
        };

        this.windowElement.querySelector('#module-height-input').onchange = () => {
            this.updateModuleSize();
        };

        this.windowElement.querySelector('#save-module-btn').onclick = () => {
            this.saveModule();
        };
    }

    // ⭐ НОВЫЙ МЕТОД - делает окно перетаскиваемым
    makeDraggable() {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        const header = this.windowElement.querySelector('#properties-header');
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            
            isDragging = true;
            const rect = this.windowElement.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            this.windowElement.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            
            // Ограничиваем, чтобы окно не выходило за экран
            const maxX = window.innerWidth - this.windowElement.offsetWidth;
            const maxY = window.innerHeight - this.windowElement.offsetHeight;
            
            this.windowElement.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            this.windowElement.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.windowElement.style.cursor = '';
            }
        });
    }

    initColorPicker() {
        const container = this.windowElement.querySelector('#color-picker-container');
        
        this.colorPicker = new ColorPicker({
            columns: 8,
            rows: 4,
            cellSize: 16,
            showReset: true,
            resetText: '↺ Default',
            onSelect: (color) => {
                if (this.app.module) {
                    this.app.module.color = color;
                    this.app.module.customColor = color;
                }
            },
            onReset: () => {
                if (this.app.module) {
                    this.app.module.color = '#2a2a2a';
                    this.app.module.customColor = null;
                }
            }
        });

        const pickerElement = this.colorPicker.create();
        container.appendChild(pickerElement);
    }

    updateModuleSize() {
        const widthInput = this.windowElement.querySelector('#module-width-input');
        const heightInput = this.windowElement.querySelector('#module-height-input');
        
        let newWidth = parseInt(widthInput.value) || 1;
        let newHeight = parseInt(heightInput.value) || 3;
        
        newWidth = Math.max(1, Math.min(3, newWidth));
        newHeight = Math.max(3, Math.min(10, newHeight));
        
        widthInput.value = newWidth;
        heightInput.value = newHeight;
        
        if (this.app.module) {
            this.app.module.gridWidth = newWidth;
            this.app.module.gridHeight = newHeight;
            this.app.module.width = newWidth * 260;
            this.app.module.height = newHeight * 15;
            this.app.centerModuleInGrid();
        }
    }

    show() {
        if (!this.app.module) return;
        
        this.isVisible = true;
        this.windowElement.style.display = 'block';
        
        // Заполняем данными
        this.windowElement.querySelector('#module-name-input').value = this.app.module.title || 'New Module';
        this.windowElement.querySelector('#module-width-input').value = this.app.module.gridWidth || 1;
        this.windowElement.querySelector('#module-height-input').value = this.app.module.gridHeight || 3;
        
        // Устанавливаем цвет в ColorPicker
        const currentColor = this.app.module.color || this.app.module.customColor || '#2a2a2a';
        if (this.colorPicker) {
            this.colorPicker.setColor(currentColor);
        }
    }

    hide() {
        this.isVisible = false;
        this.windowElement.style.display = 'none';
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // editor/ModulePropertiesWindow.js - добавляем метод сохранения на сервер

    // editor/ModulePropertiesWindow.js - исправленный saveModuleToServer

    async saveModuleToServer(code, name) {
        console.log('📤 Sending to server:', { name, codeLength: code.length });
        
        try {
            const response = await fetch('/api/save-module', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    code: code
                })
            });
            
            console.log('📥 Response status:', response.status);
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Server response:', result);
                this.app.uiManager.showNotification(`✅ Module "${name}" saved to user_modules/js/`);
                return true;
            } else {
                const error = await response.json();
                console.error('❌ Server error:', error);
                this.app.uiManager.showNotification(`❌ Error: ${error.error || 'Unknown error'}`);
                return false;
            }
        } catch (error) {
            console.error('💥 Save error:', error);
            this.app.uiManager.showNotification(`❌ Server error: ${error.message}`);
            return false;
        }
    }


    // editor/ModulePropertiesWindow.js - исправленный saveModule

    async saveModule() {
        if (!this.app.module) return;
        
        // Собираем данные модуля
        const moduleData = this.collectModuleData();
        
        // Генерируем код
        const code = this.generateModuleCode(moduleData);
        const name = moduleData.name;
        
        console.log('📦 Saving module:', { name, codeLength: code.length });
        console.log('📦 Module data:', moduleData);
        
        // Пробуем сохранить на сервер
        const saved = await this.saveModuleToServer(code, name);
        
        if (!saved) {
            // Если не получилось - скачиваем локально
            this.downloadModule(code, name);
            this.app.uiManager.showNotification(`⬇️ Module "${name}" downloaded (server unavailable)`);
        }
    }

// editor/ModulePropertiesWindow.js - исправленный collectModuleData()

    collectModuleData() {
        const module = this.app.module;
        let name = this.windowElement.querySelector('#module-name-input').value || 'NewModule';
        
        // ⭐ Очищаем имя от пробелов и спецсимволов
        name = name.replace(/[^a-zA-Z0-9_]/g, '');
        
        if (!name || name.length === 0) {
            name = 'NewModule';
            this.windowElement.querySelector('#module-name-input').value = name;
        }
        
        // Собираем компоненты
        const components = [];
        let nextId = 1;
        
        for (const comp of this.app.components) {
            if (comp._isNewDragging) continue;
            
            const compData = {
                componentType: comp.constructor.name,
                id: nextId.toString(),
                x: Math.round(comp.relX || comp.x - module.x),
                y: Math.round(comp.relY || comp.y - module.y),
            };
            
            // Добавляем специфичные свойства
            if (comp.constructor.name === 'Knob') {
                compData.size = comp.sizeParam || 'medium';
                compData.min = comp.min || 0;
                compData.max = comp.max || 127;
                compData.defaultValue = comp.value || 0;
                compData.infoFunc = comp.infoFunc || 0;
            } else if (comp.constructor.name === 'ButtonFlat') {
                compData.width = comp.width || 40;
                compData.height = comp.height || 13;
                compData.labels = comp.positions || ['Off', 'On'];
            } else if (comp.constructor.name === 'ButtonRadio') {
                compData.buttonCount = comp.buttonCount || 4;
                compData.buttonWidth = comp.buttonWidth || 40;
                compData.labels = comp.labels || ['One', 'Two', 'Three', 'Four'];
                compData.orientation = comp.orientation || 'horizontal';
            } else if (comp.constructor.name === 'ButtonText') {
                compData.width = comp.width || 40;
                compData.text = comp.text || 'M';
                compData.initialState = comp.isActive || true;
            } else if (comp.constructor.name === 'TextLabel') {
                compData.text = comp.text || 'Label';
                compData.fontSize = comp.fontSize || 10;
                compData.color = comp.color || '#888888';
                compData.align = comp.align || 'left';
            } else if (comp.constructor.name === 'Input' || comp.constructor.name === 'Output') {
                compData.jackType = comp.type || 'audio';
                compData.bandwidth = 'dynamic';
                compData.ConnectorName = comp.label || (comp.constructor.name === 'Input' ? 'In' : 'Out');
                compData.ConnectorIndex = this.app.components.filter(c => 
                    c.constructor.name === comp.constructor.name && c !== comp
                ).length;
            } else if (comp.constructor.name === 'Slider') {
                compData.width = comp.width || 10;
                compData.height = comp.height || 60;
                compData.min = comp.min || 0;
                compData.max = comp.max || 127;
                compData.defaultValue = comp.value || 0;
            } else if (comp.constructor.name === 'LED') {
                compData.width = comp.width || 20;
                compData.height = comp.height || 10;
            } else if (comp.constructor.name === 'LevelShift') {
                compData.size = comp.sizeParam || 'small';
            } else if (comp.constructor.name === 'PartSelector') {
                compData.width = comp.width || 60;
                compData.height = comp.height || 14;
                compData.imageCount = comp.imageCount || 5;
                compData.menuOffset = comp.menuOffset || 0;
                compData.menuItems = comp.menuItems || ['Item1', 'Item2', 'Item3', 'Item4', 'Item5'];
            }
            
            nextId++;
            components.push(compData);
        }
        
        return {
            name: name,
            displayName: name,
            gridHeight: module.gridHeight || 3,
            type: name,
            typeID: 999,
            defaultParams: [],
            tooltip: name,
            inputs: components.filter(c => c.componentType === 'Input').length || 0,
            outputs: components.filter(c => c.componentType === 'Output').length || 0,
            components: components
        };
    }

    // editor/ModulePropertiesWindow.js - исправленный generateModuleCode

    generateModuleCode(moduleData) {
        const name = moduleData.name || 'NewModule';
        const componentsJSON = JSON.stringify(moduleData.components, null, 8);
        
        return `// Автоматически сгенерированный модуль: ${name}
    // Создан в Module Editor

    export const ${name}Module = {
        type: '${name}',
        typeID: ${moduleData.typeID || 999},
        defaultParams: ${JSON.stringify(moduleData.defaultParams || [])},
        displayName: '${moduleData.displayName || name}',
        gridHeight: ${moduleData.gridHeight || 3},
        originalName: '${name}',
        tooltip: '${moduleData.tooltip || name}',
        inputs: ${moduleData.inputs || 0},
        outputs: ${moduleData.outputs || 0},
        components: ${componentsJSON}
    };`;
    }

    downloadModule(code, name) {
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.js`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
}