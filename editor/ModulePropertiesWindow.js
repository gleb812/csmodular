// editor/ModulePropertiesWindow.js
import { ColorPicker } from '../src/ui/ColorPicker.js';
import { moduleStore } from '../src/api/index.js';
import {
    serializeComponents,
    collectParamIds,
    collectPorts,
} from './ComponentRegistry.js';
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
            let name = this.windowElement.querySelector('#module-name-input').value;

            name = name.replace(/\s/g, '');
            if (name.match(/^[0-9]/)) name = 'M' + name;
            name = name.replace(/[^a-zA-Z0-9_]/g, '');

            if (!name) return;

            if (this.app.module) {
                this.app.module.title = name;
                this.windowElement.querySelector('#module-name-input').value = name;

                if (this.app.codeViewerWindow) {
                    this.app.codeViewerWindow.updateCode();
                }
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
            if (this.app.codeViewerWindow) {
                this.app.codeViewerWindow.updateCode();
            }
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

    async saveModuleToServer(jsCode, dspCode, name) {
        console.log('📤 Saving module:', { name, jsLength: jsCode.length, dspLength: dspCode ? dspCode.length : 0 });
        
        try {
            const ok = await moduleStore.save(name, jsCode, dspCode);
            
            if (ok) {
                this.app.uiManager.showNotification(`✅ Module "${name}" saved`);
                return true;
            } else {
                this.app.uiManager.showNotification(`❌ Could not save module "${name}"`);
                return false;
            }
        } catch (error) {
            console.error('💥 Save error:', error);
            this.app.uiManager.showNotification(`❌ Error: ${error.message}`);
            return false;
        }
    }

    // ⭐ Новый метод для скачивания DSP
    downloadDSP(code, name) {
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }


    async saveModule() {
        if (!this.app.module) return;
        
        // Собираем данные модуля
        const moduleData = this.collectModuleData();
        
        // ⭐ Генерируем JS код
        const jsCode = this.generateModuleCode(moduleData);
        
        // ⭐ Получаем DSP код из CodeViewerWindow (если он есть)
        let dspCode = null;
        if (this.app.codeViewerWindow && this.app.codeViewerWindow.isVisible) {
            // Если окно открыто - берём из редактора
            dspCode = this.app.codeViewerWindow.editor.value;
        } else if (this.app.module && this.app.module._userCsoundCode) {
            // Если сохранён в модуле
            dspCode = this.app.module._userCsoundCode;
        } else if (this.app.codeViewerWindow) {
            // Или генерируем стандартный
            dspCode = this.app.codeViewerWindow.generateCsoundCode();
        }
        
        const name = moduleData.name;
        
        console.log('📦 Saving module:', { name, jsLength: jsCode.length, dspLength: dspCode ? dspCode.length : 0 });
        
        // ⭐ Отправляем оба файла на сервер
        const saved = await this.saveModuleToServer(jsCode, dspCode, name);
        
        if (!saved) {
            // Если не получилось - скачиваем локально
            this.downloadModule(jsCode, name);
            if (dspCode) {
                this.downloadDSP(dspCode, name);
            }
            this.app.uiManager.showNotification(`⬇️ Module "${name}" downloaded (server unavailable)`);
        }
    }

    collectModuleData() {
        const module = this.app.module;
        let name = module.title || 'NewModule';
        name = name.replace(/[^a-zA-Z0-9_]/g, '');

        if (!name || name.length === 0) {
            name = 'NewModule';
            const input = this.windowElement.querySelector('#module-name-input');
            if (input) input.value = name;
            module.title = name;
        }

        const components = serializeComponents(this.app.components);
        const params = collectParamIds(this.app.components);
        const ports = collectPorts(this.app.components);

        return {
            name: name,
            displayName: name,
            gridHeight: module.gridHeight || 3,
            type: name,
            typeID: null,
            defaultParams: [],
            tooltip: name,
            params: params,
            inputs: ports.inputs,
            outputs: ports.outputs,
            customColor: module.customColor || null,
            components: components,
        };
    }

    generateModuleCode(moduleData) {
        const name = moduleData.name || 'NewModule';
        const componentsJSON = JSON.stringify(moduleData.components, null, 8);
        
        // ⭐ Строка для params
        const paramsStr = moduleData.params && moduleData.params.length > 0
            ? `    params: [${moduleData.params.join(', ')}],`
            : '    params: [],';
        
        const inputsStr = moduleData.inputs && moduleData.inputs.length > 0 
            ? `    inputs: [${moduleData.inputs.join(', ')}],`
            : '    inputs: [],';
        
        const outputsStr = moduleData.outputs && moduleData.outputs.length > 0 
            ? `    outputs: [${moduleData.outputs.join(', ')}],`
            : '    outputs: [],';

        const customColorStr = moduleData.customColor 
            ? `    customColor: '${moduleData.customColor}',`
            : `    customColor: null,`;
        
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
        ${customColorStr}
        ${paramsStr}
        ${inputsStr}
        ${outputsStr}
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