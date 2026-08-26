// editor/CodeViewerWindow.js - с двумя сворачиваемыми секциями

export class CodeViewerWindow {
    constructor(app) {
        this.app = app;
        this.windowElement = null;
        this.isVisible = false;
        this.codeContent = '';
        
        this.createWindow();
        this.setupEventListeners();
    }

    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'code-viewer-window';
        this.windowElement.style.cssText = `
            position: fixed;
            right: 20px;
            top: 10px;
            width: 480px;
            height: 580px;
            background: rgba(10, 10, 20, 0.95);
            padding: 15px;
            border-radius: 8px;
            color: white;
            font-family: 'Consolas', 'Courier New', monospace;
            border: 1px solid #0af;
            z-index: 1002;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
            user-select: none;
            display: none;
            flex-direction: column;
        `;

        this.windowElement.innerHTML = `
            <div id="code-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; cursor: move; padding: 4px 0; flex-shrink: 0;">
                <span style="color: #0af; font-weight: bold; font-size: 13px;">🎵 Csound Code</span>
                <div style="display: flex; gap: 8px;">
                    <button id="refresh-code-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px; padding: 2px 8px;">⟳</button>
                    <button id="close-code-btn" style="background: transparent; border: none; color: #666; cursor: pointer; font-size: 16px; padding: 0 4px;">✕</button>
                </div>
            </div>
            
            <!-- ⭐ СЕКЦИЯ 1: ПОЗИЦИИ И ПАРАМЕТРЫ -->
            <div style="flex-shrink: 0; margin-bottom: 6px;">
                <div id="params-header" style="display: flex; justify-content: space-between; align-items: center; background: #1a1a2a; padding: 4px 10px; border-radius: 4px; cursor: pointer; border: 1px solid #333;">
                    <span style="color: #888; font-size: 11px;">📐 Component Positions & Parameters</span>
                    <span id="params-arrow" style="color: #666; font-size: 12px;">▼</span>
                </div>
                <div id="params-content" style="background: #0a0a0f; border: 1px solid #333; border-radius: 4px; padding: 8px 10px; margin-top: 4px; overflow: auto; max-height: 140px;">
                    <pre id="params-display" style="margin: 0; color: #888; font-size: 11px; line-height: 1.5; white-space: pre; font-family: 'Consolas', 'Courier New', monospace;"></pre>
                </div>
            </div>
            
            <!-- ⭐ СЕКЦИЯ 2: OPCODE -->
            <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                <div id="code-header-section" style="display: flex; justify-content: space-between; align-items: center; background: #1a1a2a; padding: 4px 10px; border-radius: 4px; cursor: pointer; border: 1px solid #333; flex-shrink: 0;">
                    <span style="color: #888; font-size: 11px;">🎵 Csound Opcode</span>
                    <span id="code-arrow" style="color: #666; font-size: 12px;">▼</span>
                </div>
                <div id="code-content" style="flex: 1; background: #0a0a0f; border: 1px solid #333; border-radius: 4px; padding: 10px; margin-top: 4px; overflow: auto;">
                    <pre id="code-display" style="margin: 0; color: #8f8; font-size: 12px; line-height: 1.6; white-space: pre; font-family: 'Consolas', 'Courier New', monospace; tab-size: 4;"></pre>
                </div>
            </div>
            
            <div style="margin-top: 8px; font-size: 9px; color: #555; text-align: center; flex-shrink: 0;">
                Auto-generated Csound code · Updates in real-time
            </div>
        `;

        document.body.appendChild(this.windowElement);

        this.makeDraggable();

        // Обработчики
        this.windowElement.querySelector('#close-code-btn').onclick = () => this.hide();
        this.windowElement.querySelector('#refresh-code-btn').onclick = () => this.updateCode();
        
        // ⭐ Сворачивание секции параметров
        const paramsHeader = this.windowElement.querySelector('#params-header');
        const paramsContent = this.windowElement.querySelector('#params-content');
        const paramsArrow = this.windowElement.querySelector('#params-arrow');
        let paramsVisible = true;
        
        paramsHeader.onclick = () => {
            paramsVisible = !paramsVisible;
            paramsContent.style.display = paramsVisible ? 'block' : 'none';
            paramsArrow.textContent = paramsVisible ? '▼' : '▶';
        };
        
        // ⭐ Сворачивание секции opcode
        const codeHeader = this.windowElement.querySelector('#code-header-section');
        const codeContent = this.windowElement.querySelector('#code-content');
        const codeArrow = this.windowElement.querySelector('#code-arrow');
        let codeVisible = true;
        
        codeHeader.onclick = () => {
            codeVisible = !codeVisible;
            codeContent.style.display = codeVisible ? 'block' : 'none';
            codeArrow.textContent = codeVisible ? '▼' : '▶';
        };
    }

    makeDraggable() {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        const header = this.windowElement.querySelector('#code-header');
        
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
            
            const maxX = window.innerWidth - this.windowElement.offsetWidth;
            const maxY = window.innerHeight - this.windowElement.offsetHeight;
            
            this.windowElement.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            this.windowElement.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
            this.windowElement.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.windowElement.style.cursor = '';
            }
        });
    }

    // ⭐ ГЕНЕРАЦИЯ КОММЕНТАРИЕВ С ПОЗИЦИЯМИ И ПАРАМЕТРАМИ
    generateParamsComment() {
        const module = this.app.module;
        if (!module) return '';
        
        const components = this.app.components.filter(c => !c._isNewDragging);
        
        // ⭐ Информация о панели
        let result = '';
        const width = module.gridWidth || 1;
        const height = module.gridHeight || 3;
        const color = module.customColor || module.color || '#2a2a2a';
        const colorName = this.getColorName(color);
        result += `; PANEL ${width} ${height} ${colorName}\n`;
        result += `; \n`;
        
        if (components.length === 0) {
            result += `; No components`;
            return result;
        }
        
        for (const comp of components) {
            const type = comp.constructor.name;
            const name = comp.label || comp.text || type;
            const x = Math.round(comp.relX !== undefined ? comp.relX : (comp.x || 0));
            const y = Math.round(comp.relY !== undefined ? comp.relY : (comp.y || 0));
            
            let line = `; ${type} ${name} ${x} ${y}`;
            
            // Добавляем параметры в зависимости от типа
            if (type === 'Knob') {
                line += ` min:${comp.min || 0} max:${comp.max || 127} val:${Math.round(comp.value || 0)}`;
            } else if (type === 'Slider') {
                line += ` min:${comp.min || 0} max:${comp.max || 127} val:${Math.round(comp.value || 0)}`;
            } else if (type === 'ButtonFlat') {
                line += ` positions:${comp.positions ? comp.positions.join(',') : 'Off,On'}`;
            } else if (type === 'ButtonRadio') {
                line += ` labels:${comp.labels ? comp.labels.join(',') : 'One,Two,Three,Four'}`;
            } else if (type === 'ButtonText') {
                line += ` text:${comp.text || 'M'} active:${comp.isActive ? '1' : '0'}`;
            } else if (type === 'ButtonIncDec') {
                line += ` items:${comp.items ? comp.items.join(',') : 'Item1,Item2,Item3,Item4'}`;
            } else if (type === 'LevelShift') {
                line += ` position:${comp.position || 0}`;
            } else if (type === 'LED') {
                line += ` state:${comp.state ? '1' : '0'}`;
            } else if (type === 'Input' || type === 'Output') {
                line += ` jackType:${comp.type || 'audio'}`;
            } else if (type === 'PartSelector') {
                line += ` selected:${comp.selectedIndex || 0}`;
            } else if (type === 'TextLabel') {
                line += ` text:"${comp.text || 'Label'}"`;
            } else if (type === 'TextField') {
                line += ` format:${comp.format || 'number'}`;
            } else if (type === 'TextEdit') {
                line += ` text:"${comp.text || 'Edit'}" active:${comp.isActive ? '1' : '0'}`;
            }
            
            result += line + '\n';
        }
        
        return result;
    }

    // ⭐ Вспомогательный метод для получения имени цвета
    getColorName(hexColor) {
        if (!hexColor) return 'Gray';
        
        const colorMap = {
            '#2a2a2a': 'Gray',
            '#606060': 'Gray',
            '#ff0000': 'Red',
            '#ff4444': 'Red',
            '#00ff00': 'Green',
            '#44ff44': 'Green',
            '#0000ff': 'Blue',
            '#4444ff': 'Blue',
            '#ffff00': 'Yellow',
            '#ff8800': 'Orange',
            '#ff00ff': 'Magenta',
            '#00ffff': 'Cyan',
            '#ffffff': 'White',
            '#000000': 'Black',
            '#8800ff': 'Purple',
            '#ff0066': 'Pink',
            '#00ff88': 'Teal'
        };
        
        const hex = hexColor.toLowerCase();
        return colorMap[hex] || 'Custom';
    }

    generateCsoundCode() {
        const module = this.app.module;
        if (!module) return '';
        
        let moduleName = module.title || 'NewModule';
        moduleName = moduleName.replace(/\s/g, '');
        if (moduleName.match(/^[0-9]/)) {
            moduleName = 'M' + moduleName;
        }
        moduleName = moduleName.replace(/[^a-zA-Z0-9_]/g, '');
        
        const components = this.app.components.filter(c => !c._isNewDragging);
        
        const controllers = [];
        const inputs = [];
        const outputs = [];
        
        let knobCount = 0;
        let sliderCount = 0;
        let buttonCount = 0;
        let levelCount = 0;
        let inputCount = 0;
        let outputCount = 0;
        
        for (const comp of components) {
            const type = comp.constructor.name;
            
            if (type === 'Knob') {
                knobCount++;
                controllers.push({ name: `kKnob${knobCount}`, type: 'knob' });
            } else if (type === 'Slider') {
                sliderCount++;
                controllers.push({ name: `kSlider${sliderCount}`, type: 'slider' });
            } else if (type === 'ButtonFlat' || type === 'ButtonText' || type === 'ButtonIncDec') {
                buttonCount++;
                controllers.push({ name: `kButton${buttonCount}`, type: 'button' });
            } else if (type === 'ButtonRadio') {
                buttonCount++;
                controllers.push({ name: `kRadio${buttonCount}`, type: 'radio' });
            } else if (type === 'LevelShift') {
                levelCount++;
                controllers.push({ name: `kLevel${levelCount}`, type: 'level' });
            } else if (type === 'Input') {
                inputCount++;
                inputs.push({ name: `kIn${inputCount}`, type: 'input' });
            } else if (type === 'Output') {
                outputCount++;
                outputs.push({ name: `kOut${outputCount}`, type: 'output' });
            }
        }
        
        const allParams = [...controllers, ...inputs, ...outputs];
        const paramStr = 'k'.repeat(allParams.length);
        const xinStr = allParams.map(p => p.name).join(', ');
        
        let code = `opcode ${moduleName}, 0, ${paramStr}\n`;
        
        if (allParams.length > 0) {
            code += `${xinStr} xin\n`;
        }
        
        for (const output of outputs) {
            const audioName = output.name.replace('k', 'a');
            code += `${audioName} init 0\n`;
        }
        
        for (const input of inputs) {
            const audioName = input.name.replace('k', 'a');
            code += `${audioName} zar ${input.name}\n`;
        }
        
        code += `\n; --- module body ---\n`;
        code += `; Add your DSP code here\n`;
        
        for (const output of outputs) {
            const audioName = output.name.replace('k', 'a');
            code += `zaw ${audioName}, ${output.name}\n`;
        }
        
        code += `endop\n`;
        
        return code;
    }

    updateCode() {
        // ⭐ Обновляем секцию параметров
        const paramsDisplay = this.windowElement.querySelector('#params-display');
        if (paramsDisplay) {
            paramsDisplay.textContent = this.generateParamsComment();
        }
        
        // ⭐ Обновляем секцию opcode
        const code = this.generateCsoundCode();
        this.codeContent = code;
        
        const display = this.windowElement.querySelector('#code-display');
        if (display) {
            display.textContent = code;
        }
    }

    show() {
        this.isVisible = true;
        this.windowElement.style.display = 'flex';
        this.updateCode();
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

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
}