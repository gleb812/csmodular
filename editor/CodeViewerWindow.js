// editor/CodeViewerWindow.js - с редактируемым кодом Csound

export class CodeViewerWindow {
    constructor(app) {
        this.app = app;
        this.windowElement = null;
        this.isVisible = false;
        this.codeContent = '';
        this.isDirty = false;
        this.saveTimeout = null;
        this.autoSaveInterval = null; // ← интервал для автосохранения
        
        this.createWindow();
        this.setupEventListeners();
    }

    // ⭐ Обновлённый createWindow() - убираем лишние подписи внизу
    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'code-viewer-window';
        this.windowElement.style.cssText = `
            position: fixed;
            right: 20px;
            top: 10px;
            width: 520px;
            height: 600px;
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
            <div id="code-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; cursor: move; padding: 4px 0; flex-shrink: 0;">
                <span style="color: #0af; font-weight: bold; font-size: 13px;">🎵 Csound Code</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <!-- ⭐ Кнопки размера шрифта -->
                    <button id="font-smaller-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px; padding: 2px 6px; font-weight: bold;" title="Smaller font">A</button>
                    <button id="font-larger-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 13px; padding: 2px 6px; font-weight: bold;" title="Larger font">A</button>
                    <span id="font-size-display" style="color: #555; font-size: 9px; min-width: 30px; text-align: center; font-family: Arial;">12px</span>
                    <span id="code-status" style="color: #4a4; font-size: 9px; font-family: Arial;">● Saved</span>
                    <button id="refresh-code-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px; padding: 2px 8px;" title="Sync with module">⟳</button>
                    <button id="close-code-btn" style="background: transparent; border: none; color: #666; cursor: pointer; font-size: 16px; padding: 0 4px;">✕</button>
                </div>
            </div>
            
            <!-- Редактируемый textarea -->
            <div style="flex: 1; display: flex; flex-direction: column; min-height: 0; background: #0a0a0f; border: 1px solid #333; border-radius: 4px; overflow: hidden;">
                <textarea id="code-editor" style="
                    margin: 0;
                    padding: 10px;
                    width: 100%;
                    height: 100%;
                    background: transparent;
                    color: #8f8;
                    font-size: 12px;
                    line-height: 1.6;
                    font-family: 'Consolas', 'Courier New', monospace;
                    border: none;
                    outline: none;
                    resize: none;
                    tab-size: 4;
                    white-space: pre;
                    overflow: auto;
                " spellcheck="false"></textarea>
            </div>
            
            <!-- Футер с кнопкой Copy -->
            <div style="display: flex; justify-content: flex-end; margin-top: 6px; flex-shrink: 0;">
                <button id="copy-code-btn" style="
                    background: transparent;
                    border: 1px solid #555;
                    color: #aaa;
                    border-radius: 3px;
                    cursor: pointer;
                    font-size: 9px;
                    padding: 2px 10px;
                    font-family: Arial;
                ">📋 Copy</button>
            </div>
        `;

        document.body.appendChild(this.windowElement);
        this.fontSizes = [8, 10, 12, 14, 16]; // 5 размеров
        this.currentFontIndex = 2; // Индекс 2 = 12px (средний)

        this.makeDraggable();

        // Обработчики
        this.windowElement.querySelector('#close-code-btn').onclick = () => this.hide();
        this.windowElement.querySelector('#refresh-code-btn').onclick = () => this.syncFromModule();
        this.windowElement.querySelector('#copy-code-btn').onclick = () => this.copyCode();
        this.windowElement.querySelector('#font-smaller-btn').onclick = () => this.changeFontSize(-1);
        this.windowElement.querySelector('#font-larger-btn').onclick = () => this.changeFontSize(1);

        this.editor = this.windowElement.querySelector('#code-editor');
        this.statusDisplay = this.windowElement.querySelector('#code-status');

        // События редактора
        this.editor.addEventListener('input', () => this.onEditorInput());
        this.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.editor.selectionStart;
                const end = this.editor.selectionEnd;
                this.editor.value = this.editor.value.substring(0, start) + '    ' + this.editor.value.substring(end);
                this.editor.selectionStart = this.editor.selectionEnd = start + 4;
                this.onEditorInput();
            }
        });
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

    changeFontSize(delta) {
        const newIndex = this.currentFontIndex + delta;
        if (newIndex < 0 || newIndex >= this.fontSizes.length) return;
        
        this.currentFontIndex = newIndex;
        const size = this.fontSizes[newIndex];
        this.editor.style.fontSize = `${size}px`;
        this.editor.style.lineHeight = `${size * 1.6}px`;
        
        // Обновляем отображение
        const display = this.windowElement.querySelector('#font-size-display');
        if (display) {
            display.textContent = `${size}px`;
        }
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
        
        const audioInputs = [];
        const controlInputs = [];
        const audioOutputs = [];
        const controlOutputs = [];
        
        let inputIndex = 0;
        let outputIndex = 0;
        
        // ⭐ Единый проход: собираем параметры и их имена синхронно
        const paramComponents = [];   // [{ comp, paramName }]
        const typeCounters = { Knob: 0, Slider: 0, Button: 0, Level: 0 };
        
        for (const comp of components) {
            const type = comp.constructor.name;
            
            if (type === 'Knob') {
                typeCounters.Knob++;
                paramComponents.push({ comp, paramName: `kKnob${typeCounters.Knob}` });
            } else if (type === 'Slider') {
                typeCounters.Slider++;
                paramComponents.push({ comp, paramName: `kSlider${typeCounters.Slider}` });
            } else if (type === 'ButtonFlat' || type === 'ButtonText'
                       || type === 'ButtonIncDec' || type === 'ButtonRadio') {
                typeCounters.Button++;
                paramComponents.push({ comp, paramName: `kButton${typeCounters.Button}` });
            } else if (type === 'LevelShift') {
                typeCounters.Level++;
                paramComponents.push({ comp, paramName: `kLevel${typeCounters.Level}` });
            } else if (type === 'Input') {
                inputIndex++;
                const jackType = comp._jackType || comp.type || 'audio';
                if (jackType === 'audio') {
                    audioInputs.push({ param: `kIn${inputIndex}`, varName: `in${inputIndex}` });
                } else {
                    controlInputs.push({ param: `kIn${inputIndex}`, varName: `in${inputIndex}` });
                }
            } else if (type === 'Output') {
                outputIndex++;
                const jackType = comp._jackType || comp.type || 'audio';
                if (jackType === 'audio') {
                    audioOutputs.push({ param: `kOut${outputIndex}`, varName: `out${outputIndex}` });
                } else {
                    controlOutputs.push({ param: `kOut${outputIndex}`, varName: `out${outputIndex}` });
                }
            }
        }
        
        // ⭐ allParams: параметры + входы + выходы
        const allParams = [];
        paramComponents.forEach(({ paramName }) => allParams.push(paramName));
        
        const totalInputs = audioInputs.length + controlInputs.length;
        for (let i = 1; i <= totalInputs; i++) allParams.push(`kIn${i}`);
        
        const totalOutputs = audioOutputs.length + controlOutputs.length;
        for (let i = 1; i <= totalOutputs; i++) allParams.push(`kOut${i}`);
        
        const paramStr = 'k'.repeat(allParams.length);
        const xinStr = allParams.join(', ');
        
        // ⭐ Mapping-таблицы (по порядку компонентов)
        const uniqueMappings = [];
        const seenMappings = new Set();
        
        paramComponents.forEach(({ comp }) => {
            if (comp.mappingTable && !seenMappings.has(comp.mappingTable)) {
                seenMappings.add(comp.mappingTable);
                uniqueMappings.push(comp.mappingTable);
            }
        });
        
        let code = '';
        
        // ⭐ Строка ;@ map
        if (uniqueMappings.length > 0) {
            code += `;@ map ${uniqueMappings.join(' ')}\n`;
        }
        
        code += `opcode ${moduleName}, 0, ${paramStr}\n`;
        
        if (allParams.length > 0) {
            code += `${xinStr} xin\n`;
        }
        
        // ⭐ Автоматическое применение mapping-таблиц
        // Идём по paramComponents — индекс совпадает с позицией в allParams
        const mappingLines = [];
        
        paramComponents.forEach(({ comp, paramName }) => {
            if (!comp.mappingTable) return;
            mappingLines.push(`    ${paramName} table ${paramName}, gi${comp.mappingTable}`);
        });
        
        if (mappingLines.length > 0) {
            code += `\n    ; --- mapping tables ---\n`;
            code += mappingLines.join('\n') + '\n';
            code += `    ; ----------------------\n\n`;
        }
        
        // Входы
        for (const inp of audioInputs) {
            code += `a${inp.varName} zar ${inp.param}\n`;
        }
        for (const inp of controlInputs) {
            code += `k${inp.varName} zkr ${inp.param}\n`;
        }
        
        // Выходы
        for (const out of audioOutputs) {
            code += `a${out.varName} init 0\n`;
        }
        for (const out of controlOutputs) {
            code += `k${out.varName} init 0\n`;
        }
        
        code += `\n; --- module body ---\n`;
        code += `; Add your DSP code here\n`;
        
        for (const out of audioOutputs) {
            code += `zaw a${out.varName}, ${out.param}\n`;
        }
        for (const out of controlOutputs) {
            code += `zkw k${out.varName}, ${out.param}\n`;
        }
        
        code += `endop\n`;
        
        return code;
    }

    _isParametricComponent(type) {
        return [
            'Knob', 'Slider',
            'ButtonFlat', 'ButtonText', 'ButtonRadio', 'ButtonIncDec'
        ].includes(type);
    }

    // ⭐ Синхронизация с модулем (кнопка ⟳)
    syncFromModule() {
        const code = this.generateCsoundCode();
        this.codeContent = code;
        this.editor.value = code;
        this.isDirty = false;
        this.updateStatus('saved');
        this.app.uiManager.showNotification('🔄 Synced from module');
    }

    // ⭐ Обновление кода (вызывается при изменениях в модуле)
    updateCode() {
        // Если пользователь редактировал код — не перезаписываем!
        if (this.isDirty) {
            this.updateStatus('modified');
            return;
        }
        
        const code = this.generateCsoundCode();
        this.codeContent = code;
        this.editor.value = code;
        this.isDirty = false;
        this.updateStatus('saved');
    }

    // editor/CodeViewerWindow.js - добавить метод getCode()

    getCode() {
        // Возвращает текущий код из редактора или сохранённый
        if (this.isVisible && this.editor) {
            return this.editor.value;
        }
        return this.codeContent || this.generateCsoundCode();
    }

    // editor/CodeViewerWindow.js - обновлённый onEditorInput()

    onEditorInput() {
        // ⭐ Просто обновляем содержимое, без лишней магии
        this.codeContent = this.editor.value;
        this.isDirty = true;
        this.updateStatus('modified');
        
        // Очищаем старый таймер
        clearTimeout(this.saveTimeout);
        // Сохраняем через минуту
        this.saveTimeout = setTimeout(() => {
            this.saveCodeToModule();
        }, 60000);
    }

    // ⭐ Обновлённый saveCodeToModule - без нотификаций
    saveCodeToModule() {
        if (!this.isDirty) return;
        
        const code = this.editor.value;
        this.codeContent = code;
        
        if (this.app.module) {
            this.app.module._userCsoundCode = code;
        }
        
        this.isDirty = false;
        this.updateStatus('saved');
        
        // ⭐ Только консоль, без всплывающих окон
        console.log('💾 Csound code auto-saved');
    }

    // ⭐ Обновление статуса
    updateStatus(state) {
        if (state === 'saved') {
            this.statusDisplay.textContent = '● Saved';
            this.statusDisplay.style.color = '#4a4'; // зелёный
        } else if (state === 'modified') {
            this.statusDisplay.textContent = '● Modified';
            this.statusDisplay.style.color = '#fa4'; // оранжевый
        } else if (state === 'error') {
            this.statusDisplay.textContent = '⚠ Error';
            this.statusDisplay.style.color = '#f44'; // красный
        }
    }

    // ⭐ Копирование кода
    copyCode() {
        navigator.clipboard.writeText(this.editor.value).then(() => {
            this.app.uiManager.showNotification('📋 Code copied to clipboard');
        }).catch(() => {
            // Fallback
            this.editor.select();
            document.execCommand('copy');
            this.app.uiManager.showNotification('📋 Code copied');
        });
    }

    // ⭐ Обновлённый show() - запускаем интервал автосохранения
    show() {
        this.isVisible = true;
        this.windowElement.style.display = 'flex';
        
        if (this.app.module && this.app.module._userCsoundCode) {
            this.editor.value = this.app.module._userCsoundCode;
            this.codeContent = this.app.module._userCsoundCode;
            this.isDirty = false;
            this.updateStatus('saved');
        } else {
            this.syncFromModule();
        }
        
        // ⭐ Запускаем интервал автосохранения (каждую минуту)
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }
        this.autoSaveInterval = setInterval(() => {
            if (this.isVisible && this.isDirty) {
                this.saveCodeToModule();
            }
        }, 60000); // 60 секунд
    }

    // ⭐ Обновлённый hide() - очищаем интервал
    hide() {
        if (this.isDirty) {
            this.saveCodeToModule();
        }
        this.isVisible = false;
        this.windowElement.style.display = 'none';
        
        // ⭐ Останавливаем интервал автосохранения
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    // ⭐ Обновлённый setupEventListeners() - Ctrl+S без нотификации
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isVisible) {
                e.preventDefault();
                this.saveCodeToModule();
                // ⭐ Без всплывающего окна
            }
        });
    }
}