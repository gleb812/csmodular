// editor/CodeViewerWindow.js
import { getCsoundPorts, isParametric } from './ComponentRegistry.js';

export class CodeViewerWindow {
    constructor(app) {
        this.app = app;
        this.windowElement = null;
        this.isVisible = true;   // в dock панель всегда видна
        this.codeContent = '';
        this.isDirty = false;
        this.saveTimeout = null;
        this.autoSaveInterval = null;

        // Раскраска
        this.highlightEnabled = true;

        this.createWindow();
        this.setupEventListeners();
    }

    // ─────────────────────────── DOM ────────────────────────────────

    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'code-viewer-window';
        this.windowElement.style.cssText = `
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: #0a0a0f;
            color: white;
            font-family: 'Consolas', 'Courier New', monospace;
            overflow: hidden;
        `;

        this.windowElement.innerHTML = `
            <div id="code-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 10px;
                background: rgba(20, 20, 30, 0.95);
                border-bottom: 1px solid #222;
                flex-shrink: 0;
            ">
                <span style="color: #0af; font-weight: bold; font-size: 11px;">
                    🎵 Csound Code
                </span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button id="font-smaller-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px; padding: 1px 6px; font-weight: bold;" title="Smaller font">A</button>
                    <button id="font-larger-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 13px; padding: 1px 6px; font-weight: bold;" title="Larger font">A</button>
                    <span id="font-size-display" style="color: #555; font-size: 9px; min-width: 30px; text-align: center; font-family: Arial;">12px</span>
                    <span id="code-status" style="color: #4a4; font-size: 9px; font-family: Arial;">● Saved</span>
                    <button id="refresh-code-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px; padding: 1px 8px;" title="Sync with module">⟳</button>
                    <button id="copy-code-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 9px; padding: 2px 10px; font-family: Arial;">📋</button>
                    <label style="display: flex; align-items: center; gap: 4px; color: #888; font-size: 10px; cursor: pointer; font-family: Arial;">
                        <input id="line-numbers-cb" type="checkbox" style="accent-color: #0af; cursor: pointer;" checked>
                        #
                    </label>
                    <label style="display: flex; align-items: center; gap: 4px; color: #888; font-size: 10px; cursor: pointer; font-family: Arial;">
                        <input id="highlight-cb" type="checkbox" style="accent-color: #0af; cursor: pointer;" checked>
                        🎨
                    </label>
                </div>
            </div>
            
            <div id="code-editor-wrap" style="
                flex: 1;
                display: flex;
                position: relative;
                overflow: hidden;
                min-height: 0;
            ">
                <div id="code-gutter" style="
                    width: 44px;
                    flex-shrink: 0;
                    padding: 10px 8px 10px 0;
                    background: #06060a;
                    color: #3a3a3a;
                    font-size: 12px;
                    line-height: 1.6;
                    font-family: 'Consolas', 'Courier New', monospace;
                    text-align: right;
                    overflow: hidden;
                    user-select: none;
                    border-right: 1px solid #1a1a1a;
                "></div>
                
                <div id="code-highlight-layer" style="
                    position: absolute;
                    left: 44px;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    padding: 10px;
                    font-size: 12px;
                    line-height: 1.6;
                    font-family: 'Consolas', 'Courier New', monospace;
                    white-space: pre;
                    overflow: auto;
                    pointer-events: none;
                    color: #8f8;
                    box-sizing: border-box;
                    z-index: 1;
                "></div>
                
                <textarea id="code-editor" style="
                    position: absolute;
                    left: 44px;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    margin: 0;
                    padding: 10px;
                    background: transparent;
                    color: transparent;
                    caret-color: #8f8;
                    font-size: 12px;
                    line-height: 1.6;
                    font-family: 'Consolas', 'Courier New', monospace;
                    border: none;
                    outline: none;
                    resize: none;
                    tab-size: 4;
                    white-space: pre;
                    overflow: auto;
                    box-sizing: border-box;
                    z-index: 2;
                " spellcheck="false"></textarea>
            </div>
        `;

        this.fontSizes = [8, 10, 12, 14, 16];
        this.currentFontIndex = 2;

        // Ссылки
        this.editor = this.windowElement.querySelector('#code-editor');
        this.statusDisplay = this.windowElement.querySelector('#code-status');
        this.gutter = this.windowElement.querySelector('#code-gutter');
        this.highlightLayer = this.windowElement.querySelector('#code-highlight-layer');
        this.lineNumbersCb = this.windowElement.querySelector('#line-numbers-cb');
        this.highlightCb = this.windowElement.querySelector('#highlight-cb');

        // Обработчики кнопок
        this.windowElement.querySelector('#refresh-code-btn').onclick = () => this.syncFromModule();
        this.windowElement.querySelector('#copy-code-btn').onclick = () => this.copyCode();
        this.windowElement.querySelector('#font-smaller-btn').onclick = () => this.changeFontSize(-1);
        this.windowElement.querySelector('#font-larger-btn').onclick = () => this.changeFontSize(1);

        // События редактора
        this.editor.addEventListener('input', () => this.onEditorInput());
        this.editor.addEventListener('scroll', () => this._syncScroll());
        this.editor.addEventListener('keydown', (e) => this._onKeyDown(e));

        // Номера строк
        this.lineNumbersCb.onchange = () => {
            this.gutter.style.display = this.lineNumbersCb.checked ? 'block' : 'none';
            this._updateGutter();
        };

        // Раскраска
        this.highlightCb.onchange = () => {
            this.highlightEnabled = this.highlightCb.checked;
            this._updateHighlight();
        };

        // Первый рендер
        this._updateGutter();
    }

    // ─────────────────────────── SCROLL / KEYS ──────────────────────

    _syncScroll() {
        this.gutter.scrollTop = this.editor.scrollTop;
        this.highlightLayer.scrollTop = this.editor.scrollTop;
        this.highlightLayer.scrollLeft = this.editor.scrollLeft;
    }

    _onKeyDown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.editor.selectionStart;
            const end = this.editor.selectionEnd;
            this.editor.value =
                this.editor.value.substring(0, start) + '    ' +
                this.editor.value.substring(end);
            this.editor.selectionStart = this.editor.selectionEnd = start + 4;
            this.onEditorInput();
        }
    }

    // ─────────────────────────── GUTTER ─────────────────────────────

    _updateGutter() {
        if (!this.lineNumbersCb.checked) return;
        const lines = this.editor.value.split('\n').length;

        // Каждое число — отдельный <div> с той же высотой строки,
        // чтобы совпадало с line-height текста.
        let html = '';
        for (let i = 1; i <= lines; i++) {
            html += `<div>${i}</div>`;
        }
        this.gutter.innerHTML = html;
        this._syncScroll();
    }

    // ─────────────────────────── HIGHLIGHT ──────────────────────────

    _escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    _highlightCsound(code) {
        const escapeHtml = (s) => s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Собираем всё за один проход через альтернативы.
        // Порядок в regex = приоритет.
        const tokenRe = new RegExp(
            [
                // 1. ;@ map ... (до конца строки)
                '^(;@\\s*map)(.*)$',
                // 2. Комментарий ;... до конца строки
                '(;.*)$',
                // 3. Строки в кавычках
                '("[^"\\n]*")',
                // 4. Ключевые слова
                '\\b(opcode|endop|instr|endin|xin|init|ftgen|zar|zkr|zaw|zkw|table|goto|if|then|endif|else|while|do|od)\\b',
                // 5. Числа (целые и с плавающей точкой)
                '\\b(\\d+(?:\\.\\d+)?)\\b',
                // 6. Переменные kFoo/aFoo/iFoo/gkFoo/giFoo/gaFoo
                '\\b([kiga][A-Za-z_][A-Za-z0-9_]*)\\b',
            ].join('|'),
            'gm'
        );

        // Мы идём построчно, потому что некоторые правила привязаны к началу/концу строки
        const lines = code.split('\n');
        const out = [];

        for (const rawLine of lines) {
            const line = escapeHtml(rawLine);

            // Заменяем за ОДИН проход — никаких вложенных замен
            const result = line.replace(tokenRe, (match, mMap, mComment, mString, mKeyword, mNumber, mVar) => {
                if (mMap !== undefined) {
                    // mMap — группа 1, а группа 2 (после ;@ map) — остаток.
                    // Найдём её отдельно:
                    const idx = match.indexOf(mMap) + mMap.length;
                    const rest = match.slice(idx);
                    return `<span style="color:#f0e;font-weight:bold;">${mMap}</span>` +
                           `<span style="color:#fd79a8;">${rest}</span>`;
                }
                if (mComment !== undefined) {
                    return `<span style="color:#666;font-style:italic;">${mComment}</span>`;
                }
                if (mString !== undefined) {
                    return `<span style="color:#4a9eff;">${mString}</span>`;
                }
                if (mKeyword !== undefined) {
                    return `<span style="color:#0af;font-weight:bold;">${mKeyword}</span>`;
                }
                if (mNumber !== undefined) {
                    return `<span style="color:#ffd93d;">${mNumber}</span>`;
                }
                if (mVar !== undefined) {
                    return `<span style="color:#c792ea;">${mVar}</span>`;
                }
                return match;
            });

            out.push(result);
        }

        return out.join('\n');
    }

    _updateHighlight() {
        if (!this.highlightEnabled) {
            this.highlightLayer.textContent = '';
            return;
        }
        this.highlightLayer.innerHTML = this._highlightCsound(this.editor.value) + '\n';
        this._syncScroll();
    }

    // ─────────────────────────── FONT SIZE ──────────────────────────

    changeFontSize(delta) {
        const newIndex = this.currentFontIndex + delta;
        if (newIndex < 0 || newIndex >= this.fontSizes.length) return;

        this.currentFontIndex = newIndex;
        const size = this.fontSizes[newIndex];
        const lh = `${size * 1.6}px`;

        this.editor.style.fontSize = `${size}px`;
        this.editor.style.lineHeight = lh;
        this.highlightLayer.style.fontSize = `${size}px`;
        this.highlightLayer.style.lineHeight = lh;
        this.gutter.style.fontSize = `${size}px`;
        this.gutter.style.lineHeight = lh;

        const display = this.windowElement.querySelector('#font-size-display');
        if (display) display.textContent = `${size}px`;

        this._updateGutter();
        this._syncScroll();
    }

    // ─────────────────────────── CODE GEN ───────────────────────────

    generateCsoundCode() {
        const module = this.app.module;
        if (!module) return '';

        let moduleName = module.title || 'NewModule';
        moduleName = moduleName.replace(/\s/g, '');
        if (moduleName.match(/^[0-9]/)) moduleName = 'M' + moduleName;
        moduleName = moduleName.replace(/[^a-zA-Z0-9_]/g, '');

        const components = this.app.components.filter(c => !c._isNewDragging);

        const audioInputs = [];
        const controlInputs = [];
        const audioOutputs = [];
        const controlOutputs = [];

        let inputIndex = 0;
        let outputIndex = 0;

        const paramComponents = [];
        const typeCounters = { Knob: 0, Slider: 0, Button: 0, Level: 0, TextEdit: 0 };

        for (const comp of components) {
            const type = comp.constructor.name;

            const port = getCsoundPorts(comp);
            if (port) {
                if (port.dir === 'in') {
                    inputIndex++;
                    const entry = { param: `kIn${inputIndex}`, varName: `in${inputIndex}` };
                    if (port.kind === 'audio') audioInputs.push(entry);
                    else controlInputs.push(entry);
                } else if (port.dir === 'out') {
                    outputIndex++;
                    const entry = { param: `kOut${outputIndex}`, varName: `out${outputIndex}` };
                    if (port.kind === 'audio') audioOutputs.push(entry);
                    else controlOutputs.push(entry);
                }
                continue;
            }

            if (!isParametric(comp)) continue;

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
            } else if (type === 'TextEdit') {
                typeCounters.TextEdit++;
                paramComponents.push({ comp, paramName: `kText${typeCounters.TextEdit}` });
            }
        }

        const allParams = [];
        paramComponents.forEach(({ paramName }) => allParams.push(paramName));

        const totalInputs = audioInputs.length + controlInputs.length;
        for (let i = 1; i <= totalInputs; i++) allParams.push(`kIn${i}`);

        const totalOutputs = audioOutputs.length + controlOutputs.length;
        for (let i = 1; i <= totalOutputs; i++) allParams.push(`kOut${i}`);

        const paramStr = 'k'.repeat(allParams.length);
        const xinStr = allParams.join(', ');

        const uniqueMappings = [];
        const seenMappings = new Set();
        paramComponents.forEach(({ comp }) => {
            if (comp.mappingTable && !seenMappings.has(comp.mappingTable)) {
                seenMappings.add(comp.mappingTable);
                uniqueMappings.push(comp.mappingTable);
            }
        });

        let code = '';

        if (uniqueMappings.length > 0) {
            code += `;@ map ${uniqueMappings.join(' ')}\n`;
        }

        code += `opcode ${moduleName}, 0, ${paramStr}\n`;

        if (allParams.length > 0) {
            code += `${xinStr} xin\n`;
        }

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

        for (const inp of audioInputs) code += `a${inp.varName} zar ${inp.param}\n`;
        for (const inp of controlInputs) code += `k${inp.varName} zkr ${inp.param}\n`;
        for (const out of audioOutputs) code += `a${out.varName} init 0\n`;
        for (const out of controlOutputs) code += `k${out.varName} init 0\n`;

        code += `\n; --- module body ---\n`;
        code += `; Add your DSP code here\n`;

        for (const out of audioOutputs) code += `zaw a${out.varName}, ${out.param}\n`;
        for (const out of controlOutputs) code += `zkw k${out.varName}, ${out.param}\n`;

        code += `endop\n`;

        return code;
    }

    // ─────────────────────────── SYNC / UPDATE ──────────────────────

    syncFromModule() {
        const code = this.generateCsoundCode();
        this.codeContent = code;
        this.editor.value = code;
        this.isDirty = false;
        this.updateStatus('saved');
        this._updateGutter();
        this._updateHighlight();
        this.app.uiManager.showNotification('🔄 Synced from module');
    }

    updateCode() {
        if (this.isDirty) {
            this.updateStatus('modified');
            return;
        }

        const code = this.generateCsoundCode();
        this.codeContent = code;
        this.editor.value = code;
        this.isDirty = false;
        this.updateStatus('saved');
        this._updateGutter();
        this._updateHighlight();
    }

    getCode() {
        if (this.editor) return this.editor.value;
        return this.codeContent || this.generateCsoundCode();
    }

    onEditorInput() {
        this.codeContent = this.editor.value;
        this.isDirty = true;
        this.updateStatus('modified');

        this._updateGutter();
        this._updateHighlight();

        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveCodeToModule(), 60000);
    }

    saveCodeToModule() {
        if (!this.isDirty) return;
        const code = this.editor.value;
        this.codeContent = code;
        if (this.app.module) this.app.module._userCsoundCode = code;
        this.isDirty = false;
        this.updateStatus('saved');
        console.log('💾 Csound code auto-saved');
    }

    updateStatus(state) {
        if (state === 'saved') {
            this.statusDisplay.textContent = '● Saved';
            this.statusDisplay.style.color = '#4a4';
        } else if (state === 'modified') {
            this.statusDisplay.textContent = '● Modified';
            this.statusDisplay.style.color = '#fa4';
        } else if (state === 'error') {
            this.statusDisplay.textContent = '⚠ Error';
            this.statusDisplay.style.color = '#f44';
        }
    }

    copyCode() {
        navigator.clipboard.writeText(this.editor.value).then(() => {
            this.app.uiManager.showNotification('📋 Code copied');
        }).catch(() => {
            this.editor.select();
            document.execCommand('copy');
            this.app.uiManager.showNotification('📋 Code copied');
        });
    }

    // ─────────────────────────── SHOW / HIDE ────────────────────────

    show() {
        this.isVisible = true;
        this.windowElement.style.display = 'flex';

        if (this.app.module && this.app.module._userCsoundCode) {
            this.editor.value = this.app.module._userCsoundCode;
            this.codeContent = this.app.module._userCsoundCode;
        } else {
            this.syncFromModule();
        }

        this.isDirty = false;
        this.updateStatus('saved');
        this._updateGutter();
        this._updateHighlight();

        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = setInterval(() => {
            if (this.isVisible && this.isDirty) this.saveCodeToModule();
        }, 60000);
    }

    hide() {
        if (this.isDirty) this.saveCodeToModule();
        this.isVisible = false;
        this.windowElement.style.display = 'none';

        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && this.isVisible) {
                e.preventDefault();
                this.saveCodeToModule();
            }
        });
    }
}