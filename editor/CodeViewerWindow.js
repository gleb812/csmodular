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

// editor/CodeViewerWindow.js - упрощённый createWindow()

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
            
            <!-- ⭐ ТОЛЬКО СЕКЦИЯ OPCODE (без сворачивания) -->
            <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; background: #0a0a0f; border: 1px solid #333; border-radius: 4px; overflow: auto;">
                <pre id="code-display" style="margin: 0; padding: 10px; color: #8f8; font-size: 12px; line-height: 1.6; white-space: pre; font-family: 'Consolas', 'Courier New', monospace; tab-size: 4; min-height: 100%;"></pre>
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


// editor/CodeViewerWindow.js - обновлённый generateCsoundCode()

// editor/CodeViewerWindow.js - исправленный generateCsoundCode()

// editor/CodeViewerWindow.js - ИСПРАВЛЕННЫЙ generateCsoundCode()

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
        
        // ⭐ Собираем все компоненты по типам
        const audioInputs = [];
        const controlInputs = [];
        const audioOutputs = [];
        const controlOutputs = [];
        
        let knobCount = 0;
        let sliderCount = 0;
        let buttonCount = 0;
        let levelCount = 0;
        
        // ⭐ Сквозная нумерация для входов и выходов
        let inputIndex = 0;
        let outputIndex = 0;
        
        for (const comp of components) {
            const type = comp.constructor.name;
            
            if (type === 'Knob') {
                knobCount++;
            } else if (type === 'Slider') {
                sliderCount++;
            } else if (type === 'ButtonFlat' || type === 'ButtonText' || type === 'ButtonIncDec') {
                buttonCount++;
            } else if (type === 'ButtonRadio') {
                buttonCount++;
            } else if (type === 'LevelShift') {
                levelCount++;
            } else if (type === 'Input') {
                inputIndex++;
                const jackType = comp._jackType || comp.type || 'audio';
                if (jackType === 'audio') {
                    audioInputs.push({ 
                        param: `kIn${inputIndex}`,
                        varName: `in${inputIndex}`
                    });
                } else {
                    controlInputs.push({ 
                        param: `kIn${inputIndex}`,
                        varName: `in${inputIndex}`
                    });
                }
            } else if (type === 'Output') {
                outputIndex++;
                const jackType = comp._jackType || comp.type || 'audio';
                if (jackType === 'audio') {
                    audioOutputs.push({ 
                        param: `kOut${outputIndex}`,
                        varName: `out${outputIndex}`
                    });
                } else {
                    controlOutputs.push({ 
                        param: `kOut${outputIndex}`,
                        varName: `out${outputIndex}`
                    });
                }
            }
        }
        
        // ⭐ Формируем все параметры для xin
        const allParams = [];
        
        // Контроллеры
        for (let i = 1; i <= knobCount; i++) allParams.push(`kKnob${i}`);
        for (let i = 1; i <= sliderCount; i++) allParams.push(`kSlider${i}`);
        for (let i = 1; i <= buttonCount; i++) allParams.push(`kButton${i}`);
        for (let i = 1; i <= levelCount; i++) allParams.push(`kLevel${i}`);
        
        // Входы (все через kIn)
        const totalInputs = audioInputs.length + controlInputs.length;
        for (let i = 1; i <= totalInputs; i++) {
            allParams.push(`kIn${i}`);
        }
        
        // Выходы (все через kOut)
        const totalOutputs = audioOutputs.length + controlOutputs.length;
        for (let i = 1; i <= totalOutputs; i++) {
            allParams.push(`kOut${i}`);
        }
        
        const paramStr = 'k'.repeat(allParams.length);
        const xinStr = allParams.join(', ');
        
        let code = `opcode ${moduleName}, 0, ${paramStr}\n`;
        
        if (allParams.length > 0) {
            code += `${xinStr} xin\n`;
        }
        
        // ⭐ Чтение входов
        // Аудио входы → zar → a-сигнал
        for (const inp of audioInputs) {
            code += `a${inp.varName} zar ${inp.param}\n`;  // ain1 zar kIn1
        }
        
        // Контрольные входы → zkr → k-сигнал
        for (const inp of controlInputs) {
            code += `k${inp.varName} zkr ${inp.param}\n`;  // kin2 zkr kIn2
        }
        
        // ⭐ Инициализация выходных переменных
        for (const out of audioOutputs) {
            code += `a${out.varName} init 0\n`;  // aout1 init 0
        }
        
        for (const out of controlOutputs) {
            code += `k${out.varName} init 0\n`;  // kout1 init 0
        }
        
        code += `\n; --- module body ---\n`;
        code += `; Add your DSP code here\n`;
        
        // ⭐ Запись выходов
        // Аудио выходы → zaw → пишет a-сигнал
        for (const out of audioOutputs) {
            code += `zaw a${out.varName}, ${out.param}\n`;  // zaw aout1, kOut1
        }
        
        // Контрольные выходы → zkw → пишет k-сигнал
        for (const out of controlOutputs) {
            code += `zkw k${out.varName}, ${out.param}\n`;  // zkw kout1, kOut1
        }
        
        code += `endop\n`;
        
        return code;
    }

// editor/CodeViewerWindow.js - упрощённый updateCode()

    updateCode() {
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