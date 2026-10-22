// editor/CodeViewerWindow.js
import { getCsoundPorts, isParametric } from './ComponentRegistry.js';

const PROTECTED_COLOR = '#7a8a9a';
const PROTECTED_FLASH_COLOR = 'rgba(244, 68, 68, 0.18)';
const FORBIDDEN_KEYWORDS_RE = /\b(zaw|zkr|zar|zkw|xin|opcode|endop)\b/;

export class CodeViewerWindow {
    constructor(app) {
        this.app = app;
        this.windowElement = null;
        this.isVisible = true;
        this.codeContent = '';
        this.isDirty = false;
        this.saveTimeout = null;
        this.autoSaveInterval = null;

        this.highlightEnabled = true;

        // ── Структурный кэш ──
        this._structureCache = null;   // { lines, lineOffsets, bodyStart, bodyEnd, protectedRanges, protectedLineIndices }
        this._lastValidBody = null;    // последнее валидное тело (для отката)
        this._statusTimer = null;

        this.createWindow();
        this.setupEventListeners();

        // Первичное построение структуры
        this._rebuildStructure();
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
                    <button id="refresh-code-btn" style="background: transparent; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px; padding: 1px 8px;" title="Reset structure and body from module">⟳</button>
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
                    right: 20px;
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
                    right: 20px;
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

                <div id="code-right-gutter" style="
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 20px;
                    padding: 10px 0;
                    background: #06060a;
                    color: #4a5a6a;
                    font-size: 10px;
                    line-height: 1.6;
                    font-family: 'Consolas', 'Courier New', monospace;
                    text-align: center;
                    overflow: hidden;
                    user-select: none;
                    pointer-events: none;
                    border-left: 1px solid #1a1a1a;
                    box-sizing: border-box;
                "></div>
            </div>
        `;

        this.fontSizes = [8, 10, 12, 14, 16];
        this.currentFontIndex = 2;

        this.editor = this.windowElement.querySelector('#code-editor');
        this.statusDisplay = this.windowElement.querySelector('#code-status');
        this.gutter = this.windowElement.querySelector('#code-gutter');
        this.highlightLayer = this.windowElement.querySelector('#code-highlight-layer');
        this.rightGutter = this.windowElement.querySelector('#code-right-gutter');
        this.lineNumbersCb = this.windowElement.querySelector('#line-numbers-cb');
        this.highlightCb = this.windowElement.querySelector('#highlight-cb');

        this.windowElement.querySelector('#refresh-code-btn').onclick = () => this.syncFromModule();
        this.windowElement.querySelector('#copy-code-btn').onclick = () => this.copyCode();
        this.windowElement.querySelector('#font-smaller-btn').onclick = () => this.changeFontSize(-1);
        this.windowElement.querySelector('#font-larger-btn').onclick = () => this.changeFontSize(1);

        this.editor.addEventListener('input', () => this.onEditorInput());
        this.editor.addEventListener('scroll', () => this._syncScroll());
        this.editor.addEventListener('keydown', (e) => this._onKeyDown(e));
        this.editor.addEventListener('beforeinput', (e) => this._onBeforeInput(e));

        // Не даём курсору зайти в защищённую зону
        this.editor.addEventListener('selectionchange', () => this._clampCursorToEditable());
        this.editor.addEventListener('click', () => this._clampCursorToEditable());
        this.editor.addEventListener('keyup', () => this._clampCursorToEditable());
        this.editor.addEventListener('select', () => this._clampCursorToEditable());

        this.lineNumbersCb.onchange = () => {
            this.gutter.style.display = this.lineNumbersCb.checked ? 'block' : 'none';
            this._updateGutter();
        };

        this.highlightCb.onchange = () => {
            this.highlightEnabled = this.highlightCb.checked;
            this._updateHighlight();
        };

        this._updateGutter();
    }

    // ─────────────────────────── STRUCTURE ─────────────────────────

    /**
     * Генерирует эталонный код из модели и разбирает его на диапазоны.
     * Возвращает { lines, lineOffsets, bodyStart, bodyEnd, protectedRanges, protectedLineIndices }
     * или null, если структура не распознана.
     */
    _buildReferenceStructure() {
        const code = this.generateCsoundCode();
        if (!code) return null;

        const lines = code.split('\n');
        const lineOffsets = [];
        let off = 0;
        for (const line of lines) {
            lineOffsets.push(off);
            off += line.length + 1; // +1 за \n
        }

        // Ищем границы по индексам строк
        let headerEndLine = -1;
        let mappingStartLine = -1;
        let mappingEndLine = -1;
        let inputStartLine = -1;
        let inputEndLine = -1;
        let outputStartLine = -1;
        let outputEndLine = -1;
        let endopLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();

            if (/^\w+(\s*,\s*\w+)*\s+xin$/.test(t) || /^opcode\s+\w+\s*,\s*\d+\s*,\s*[kKaA]*\s*$/.test(t)) {
                headerEndLine = i;
            }

            if (/^;\s*---\s*mapping tables\s*---$/.test(t)) {
                mappingStartLine = i;
            }
            if (mappingStartLine >= 0 && mappingEndLine < 0 && /^;\s*-{2,}$/.test(t)) {
                mappingEndLine = i;
            }

            if (/^[aA]\w*\s+zar\s+k\w+$/.test(t) || /^[kK]\w*\s+zkr\s+k\w+$/.test(t) ||
                /^[aA]\w*\s+init\s+0$/.test(t) || /^[kK]\w*\s+init\s+0$/.test(t)) {
                if (inputStartLine < 0) inputStartLine = i;
                inputEndLine = i;
            }

            if (/^zaw\s+[aA]\w*\s*,\s*k\w+$/.test(t) || /^zkw\s+[kK]\w*\s*,\s*k\w+$/.test(t)) {
                if (outputStartLine < 0) outputStartLine = i;
                outputEndLine = i;
            }

            if (/^endop$/.test(t)) {
                endopLine = i;
            }
        }

        // Валидация: обязательны headerEndLine и endopLine
        if (headerEndLine < 0 || endopLine < 0) return null;

        // bodyStart = конец последнего input-init-блока (или конец header/mapping)
        let bodyStartLine;
        if (inputEndLine >= 0) bodyStartLine = inputEndLine + 1;
        else if (mappingEndLine >= 0) bodyStartLine = mappingEndLine + 1;
        else bodyStartLine = headerEndLine + 1;

        // bodyEnd = начало output-блока (или endop)
        let bodyEndLine;
        if (outputStartLine >= 0) bodyEndLine = outputStartLine;
        else bodyEndLine = endopLine;

        if (bodyStartLine > bodyEndLine) return null; // что-то не так

        // Символьные смещения
        const bodyStart = lineOffsets[bodyStartLine] ?? code.length;
        const bodyEnd = lineOffsets[bodyEndLine] ?? code.length;

        // Защищённые диапазоны (символьные)
        const protectedRanges = [];
        const protectedLineIndices = new Set();

        // Шапка: [0, bodyStart)
        if (bodyStart > 0) {
            protectedRanges.push({ start: 0, end: bodyStart });
            for (let i = 0; i < bodyStartLine; i++) protectedLineIndices.add(i);
        }

        // Хвост: [bodyEnd, конец]
        if (bodyEnd < code.length) {
            protectedRanges.push({ start: bodyEnd, end: code.length });
            for (let i = bodyEndLine; i < lines.length; i++) protectedLineIndices.add(i);
        }

        return {
            lines,
            lineOffsets,
            bodyStartLine,
            bodyEndLine,
            bodyStart,
            bodyEnd,
            protectedRanges,
            protectedLineIndices,
            totalLength: code.length,
        };
    }

    _rebuildStructure() {
        this._structureCache = this._buildReferenceStructure();
        if (!this._structureCache) {
            console.warn('⚠️ CodeViewerWindow: structure not recognized');
        }
    }

    _isCursorInEditable(pos) {
        const s = this._structureCache;
        if (!s) return true; // fallback: не блокируем
        return pos >= s.bodyStart && pos <= s.bodyEnd;
    }

    _clampCursorToEditable() {
        const s = this._structureCache;
        if (!s) return;

        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const len = this.editor.value.length;

        // Если курсор/выделение целиком в теле — ок
        if (start >= s.bodyStart && end <= s.bodyEnd) return;

        // Иначе — зажимаем
        let newStart = start;
        let newEnd = end;

        if (newStart < s.bodyStart) newStart = s.bodyStart;
        if (newStart > s.bodyEnd) newStart = s.bodyEnd;
        if (newEnd < s.bodyStart) newEnd = s.bodyStart;
        if (newEnd > s.bodyEnd) newEnd = s.bodyEnd;
        if (newStart > newEnd) newStart = newEnd;

        // Только если реально поменялось — чтобы не дёргать селект
        if (newStart !== start || newEnd !== end) {
            this.editor.selectionStart = newStart;
            this.editor.selectionEnd = newEnd;
        }
    }

    // ─────────────────────────── BEFOREINPUT ───────────────────────

    _onBeforeInput(e) {
        const s = this._structureCache;
        if (!s) return;

        const inputType = e.inputType;
        const selStart = this.editor.selectionStart;
        const selEnd = this.editor.selectionEnd;

        // Destructive-операции: проверяем, не затрагивают ли защищённую зону
        const destructive = [
            'deleteContentBackward', 'deleteContentForward',
            'deleteByCut', 'deleteByDrag',
            'insertLineBreak', 'insertParagraph',
            'insertFromPaste', 'insertFromDrop',
        ];

        if (destructive.includes(inputType)) {
            // Курсор/выделение считается «в защищённой зоне», если:
            //   - курсор до начала тела (selStart < bodyStart)
            //   - выделение заходит за конец тела (selEnd > bodyEnd)
            //   - курсор стоит ровно на bodyStart и это destructive влево
            //     (иначе Backspace в первой позиции тела удалит init-строку)
            // Enter в bodyEnd — разрешён: там начинается zaw, а тело может расти
            const cursorAtBodyStart = (selStart === selEnd && selStart === s.bodyStart);
            const affectsProtected =
                (selStart < s.bodyStart) ||
                (selEnd > s.bodyEnd) ||
                (cursorAtBodyStart && inputType === 'deleteContentBackward');

            if (affectsProtected) {
                e.preventDefault();
                this._flashProtectedBoundary(selStart, selEnd);
                return;
            }
        }

        // insertText / insertFromPaste: проверка на запрещённые слова
        if (inputType === 'insertText' || inputType === 'insertFromPaste') {
            const text = e.data || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : '');
            if (text && FORBIDDEN_KEYWORDS_RE.test(text)) {
                e.preventDefault();
                this._flashLine(this._lineIndexFromPos(selStart), PROTECTED_FLASH_COLOR);
                this.updateStatus('forbidden');
                return;
            }
        }
    }

    // ─────────────────────────── INPUT (страховка) ─────────────────

    onEditorInput() {
        const s = this._structureCache;
        if (!s) {
            this.codeContent = this.editor.value;
            this.isDirty = true;
            this.updateStatus('modified');
            this._updateGutter();
            this._updateHighlight();
            return;
        }

        const value = this.editor.value;
        const lines = value.split('\n');

        // ── 1. Пересобрать границы по текущему value ──
        const fresh = this._rebuildStructureFromCurrent();

        if (fresh) {
            // ── 2. Запрещённые слова в (новом) теле ──
            const bodyText = lines.slice(fresh.bodyStartLine, fresh.bodyEndLine).join('\n');
            if (FORBIDDEN_KEYWORDS_RE.test(bodyText)) {
                if (this._lastValidBody !== null) {
                    const before = lines.slice(0, fresh.bodyStartLine);
                    const after = lines.slice(fresh.bodyEndLine);
                    const bodyLines = this._lastValidBody.split('\n');
                    this.editor.value = [...before, ...bodyLines, ...after].join('\n');
                } else {
                    const filtered = lines.filter((ln, idx) => {
                        if (idx >= fresh.bodyStartLine && idx < fresh.bodyEndLine) {
                            return !FORBIDDEN_KEYWORDS_RE.test(ln);
                        }
                        return true;
                    });
                    this.editor.value = filtered.join('\n');
                }
                this._flashLine(fresh.bodyStartLine, PROTECTED_FLASH_COLOR);
                this.updateStatus('forbidden');
                this._updateGutter();
                this._updateHighlight();
                return;
            }

            // ── 3. Сверка защищённых строк с эталоном — ТОЛЬКО если число строк совпадает ──
            const reference = this._buildReferenceStructure();
            if (reference && reference.lines.length === lines.length) {
                let changed = false;
                for (let i = 0; i < lines.length; i++) {
                    if (fresh.protectedLineIndices.has(i) && lines[i] !== reference.lines[i]) {
                        lines[i] = reference.lines[i];
                        changed = true;
                    }
                }
                if (changed) {
                    const pos = this.editor.selectionStart;
                    this.editor.value = lines.join('\n');
                    this.editor.selectionStart = this.editor.selectionEnd =
                        Math.min(pos, this.editor.value.length);
                    this._clampCursorToEditable();
                    this._flashLine(0, PROTECTED_FLASH_COLOR);
                    this.updateStatus('protected');
                    this._updateGutter();
                    this._updateHighlight();
                    return;
                }
            }

            // ── 4. Всё ок ──
            this._structureCache = fresh;
            this._lastValidBody = bodyText;
            this.codeContent = value;
            this.isDirty = true;
            this.updateStatus('modified');
            this._updateGutter();
            this._updateHighlight();

            clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.saveCodeToModule(), 60000);
            return;
        }

        // ── 5. Fallback: fresh === null (структура не распознана) ──
        //      Значит, юзер как-то сломал защищённые строки.
        //      Восстанавливаем из эталона.
        const reference = this._buildReferenceStructure();
        if (reference) {
            this.editor.value = reference.lines.join('\n');
            this._structureCache = reference;
            this._flashLine(0, PROTECTED_FLASH_COLOR);
            this.updateStatus('protected');
        } else {
            // Эталон тоже не распознан — оставляем как есть
            this.codeContent = value;
            this.isDirty = true;
            this.updateStatus('modified');
        }
        this._updateGutter();
        this._updateHighlight();
    }

    // ─────────────────────────── SCROLL / KEYS ──────────────────────

    _syncScroll() {
        this.gutter.scrollTop = this.editor.scrollTop;
        this.rightGutter.scrollTop = this.editor.scrollTop;
        this.highlightLayer.scrollTop = this.editor.scrollTop;
        this.highlightLayer.scrollLeft = this.editor.scrollLeft;
    }

    _onKeyDown(e) {
        if (e.key === 'Tab') {
            // Tab в защищённой зоне — игнорируем
            if (!this._isCursorInEditable(this.editor.selectionStart)) {
                e.preventDefault();
                return;
            }
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
        if (!this.lineNumbersCb.checked) {
            this.gutter.innerHTML = '';
        } else {
            const lines = this.editor.value.split('\n').length;
            let html = '';
            for (let i = 1; i <= lines; i++) {
                html += `<div>${i}</div>`;
            }
            this.gutter.innerHTML = html;
        }

        // Правый gutter: 🔒 для защищённых строк
        const s = this._structureCache;
        if (!s) {
            this.rightGutter.innerHTML = '';
        } else {
            const lines = this.editor.value.split('\n').length;
            let html = '';
            for (let i = 0; i < lines; i++) {
                if (s.protectedLineIndices.has(i)) {
                    html += `<div>🔒</div>`;
                } else {
                    html += `<div>&nbsp;</div>`;
                }
            }
            this.rightGutter.innerHTML = html;
        }

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
        const escapeHtml = (s) => this._escapeHtml(s);
        const s = this._structureCache;

        const tokenRe = new RegExp(
            [
                '^(;@\\s*map)(.*)$',
                '(;.*)$',
                '("[^"\\n]*")',
                '\\b(opcode|endop|instr|endin|xin|init|ftgen|zar|zkr|zaw|zkw|table|goto|if|then|endif|else|while|do|od)\\b',
                '\\b(\\d+(?:\\.\\d+)?)\\b',
                '\\b([kiga][A-Za-z_][A-Za-z0-9_]*)\\b',
            ].join('|'),
            'gm'
        );

        const lines = code.split('\n');
        const out = [];

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const escaped = escapeHtml(rawLine);

            // Защищённая строка — единый бледно-серый цвет, без токенизации
            if (s && s.protectedLineIndices.has(i)) {
                out.push(`<span style="color:${PROTECTED_COLOR};">${escaped}</span>`);
                continue;
            }

            // Тело: подсветка токенов + проверка на запрещённые слова
            const result = escaped.replace(tokenRe, (match, mMap, mComment, mString, mKeyword, mNumber, mVar) => {
                if (mMap !== undefined) {
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
                    // Запрещённое слово в теле — красный фон (страховка)
                    const kw = mKeyword;
                    if (FORBIDDEN_KEYWORDS_RE.test(kw)) {
                        return `<span style="background:#3a1a1a;color:#f66;">${kw}</span>`;
                    }
                    return `<span style="color:#0af;font-weight:bold;">${kw}</span>`;
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

    // ─────────────────────────── FLASH ─────────────────────────────

    _flashLine(lineIdx, color = PROTECTED_FLASH_COLOR) {
        if (lineIdx < 0) return;

        const lineHeight = parseFloat(getComputedStyle(this.editor).lineHeight) || 19.2;
        const paddingTop = 10;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            left: 44px;
            right: 20px;
            top: ${paddingTop + lineIdx * lineHeight - this.editor.scrollTop}px;
            height: ${lineHeight}px;
            background: ${color};
            pointer-events: none;
            z-index: 3;
            transition: opacity 0.3s;
        `;
        this.windowElement.querySelector('#code-editor-wrap').appendChild(overlay);

        setTimeout(() => { overlay.style.opacity = '0'; }, 200);
        setTimeout(() => overlay.remove(), 500);
    }

    _flashProtectedBoundary(selStart, selEnd) {
        const s = this._structureCache;
        if (!s) return;
        // Мигаем строкой, ближайшей к курсору
        const lineIdx = this._lineIndexFromPos(Math.min(selStart, this.editor.value.length));
        this._flashLine(lineIdx, PROTECTED_FLASH_COLOR);
        this.updateStatus('protected');
    }

    _lineIndexFromPos(pos) {
        const before = this.editor.value.substring(0, pos);
        return before.split('\n').length - 1;
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
        this.rightGutter.style.fontSize = `${size}px`;
        this.rightGutter.style.lineHeight = lh;

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

    _rebuildStructureFromCurrent() {
        const value = this.editor.value;
        const lines = value.split('\n');
        const lineOffsets = [];
        let off = 0;
        for (const line of lines) {
            lineOffsets.push(off);
            off += line.length + 1;
        }

        let headerEndLine = -1;
        let mappingStartLine = -1, mappingEndLine = -1;
        let inputStartLine = -1, inputEndLine = -1;
        let outputStartLine = -1, outputEndLine = -1;
        let endopLine = -1;

        for (let i = 0; i < lines.length; i++) {
            const t = lines[i].trim();

            if (/^\w+(\s*,\s*\w+)*\s+xin$/.test(t) ||
                /^opcode\s+\w+\s*,\s*\d+\s*,\s*[kKaA]*\s*$/.test(t)) {
                headerEndLine = i;
            }
            if (/^;\s*---\s*mapping tables\s*---$/.test(t)) {
                mappingStartLine = i;
            }
            if (mappingStartLine >= 0 && mappingEndLine < 0 && /^;\s*-{2,}$/.test(t)) {
                mappingEndLine = i;
            }
            if (/^[aA]\w*\s+zar\s+k\w+$/.test(t) ||
                /^[kK]\w*\s+zkr\s+k\w+$/.test(t) ||
                /^[aA]\w*\s+init\s+0$/.test(t) ||
                /^[kK]\w*\s+init\s+0$/.test(t)) {
                if (inputStartLine < 0) inputStartLine = i;
                inputEndLine = i;
            }
            if (/^zaw\s+[aA]\w*\s*,\s*k\w+$/.test(t) ||
                /^zkw\s+[kK]\w*\s*,\s*k\w+$/.test(t)) {
                if (outputStartLine < 0) outputStartLine = i;
                outputEndLine = i;
            }
            if (/^endop$/.test(t)) {
                endopLine = i;
            }
        }

        if (headerEndLine < 0 || endopLine < 0) {
            console.warn('[CodeViewer] _rebuildStructureFromCurrent: no header/endop', {
                headerEndLine, endopLine, lines: lines.length,
            });
            return null;
        }

        let bodyStartLine;
        if (inputEndLine >= 0) bodyStartLine = inputEndLine + 1;
        else if (mappingEndLine >= 0) bodyStartLine = mappingEndLine + 1;
        else bodyStartLine = headerEndLine + 1;

        let bodyEndLine;
        if (outputStartLine >= 0) bodyEndLine = outputStartLine;
        else bodyEndLine = endopLine;

        if (bodyStartLine > bodyEndLine) {
            console.warn('[CodeViewer] _rebuildStructureFromCurrent: bodyStart > bodyEnd', {
                bodyStartLine, bodyEndLine,
            });
            return null;
        }

        const bodyStart = lineOffsets[bodyStartLine] ?? value.length;
        const bodyEnd = lineOffsets[bodyEndLine] ?? value.length;

        const protectedLineIndices = new Set();
        for (let i = 0; i < bodyStartLine; i++) protectedLineIndices.add(i);
        for (let i = bodyEndLine; i < lines.length; i++) protectedLineIndices.add(i);

        return {
            lines,
            lineOffsets,
            bodyStartLine,
            bodyEndLine,
            bodyStart,
            bodyEnd,
            protectedLineIndices,
            totalLength: value.length,
        };
    }

    // ─────────────────────────── SYNC / UPDATE ──────────────────────

    syncFromModule() {
        const code = this.generateCsoundCode();
        this.codeContent = code;
        this.editor.value = code;
        this.isDirty = false;
        this._lastValidBody = null;
        this.updateStatus('saved');
        this._rebuildStructure();
        this._updateGutter();
        this._updateHighlight();
        this.app.uiManager.showNotification('🔄 Synced from module');
    }

    updateCode() {
        const reference = this._buildReferenceStructure();
        if (!reference) {
            const code = this.generateCsoundCode();
            this.codeContent = code;
            this.editor.value = code;
            this.isDirty = false;
            this._lastValidBody = null;
            this.updateStatus('saved');
            this._structureCache = null;
            this._updateGutter();
            this._updateHighlight();
            return;
        }

        const oldStructure = this._structureCache;
        const currentValue = this.editor.value;

        // Курсор относительно начала тела
        let cursorInBody = null;
        if (oldStructure) {
            const sel = this.editor.selectionStart;
            if (sel >= oldStructure.bodyStart && sel <= oldStructure.bodyEnd) {
                cursorInBody = sel - oldStructure.bodyStart;
            }
        }

        // Тело — массив строк из текущего value (по СТАРЫМ границам)
        let bodyLines;
        if (oldStructure &&
            oldStructure.bodyStartLine <= oldStructure.bodyEndLine &&
            oldStructure.bodyEndLine <= currentValue.split('\n').length) {
            const currentLines = currentValue.split('\n');
            bodyLines = currentLines.slice(oldStructure.bodyStartLine, oldStructure.bodyEndLine);
        } else {
            bodyLines = reference.lines.slice(reference.bodyStartLine, reference.bodyEndLine);
        }

        // Склейка: before + body + after
        const before = reference.lines.slice(0, reference.bodyStartLine);
        const after = reference.lines.slice(reference.bodyEndLine);
        const fullLines = [...before, ...bodyLines, ...after];
        const newCode = fullLines.join('\n');

        if (newCode === currentValue) {
            // Текст не изменился — только обновляем кэш по текущему value
            const fresh = this._rebuildStructureFromCurrent();
            if (fresh) this._structureCache = fresh;
            return;
        }

        // Записываем и пересобираем кэш по НОВОМУ value
        this.editor.value = newCode;

        const fresh = this._rebuildStructureFromCurrent();
        if (fresh) {
            this._structureCache = fresh;
            const newLines = newCode.split('\n');
            this._lastValidBody = newLines
                .slice(fresh.bodyStartLine, fresh.bodyEndLine)
                .join('\n');
        } else {
            this._structureCache = reference;
        }

        // Курсор относительно нового bodyStart
        if (cursorInBody !== null && this._structureCache) {
            const newPos = this._structureCache.bodyStart + cursorInBody;
            this.editor.selectionStart = this.editor.selectionEnd =
                Math.min(newPos, this._structureCache.bodyEnd);
        } else if (this._structureCache) {
            this.editor.selectionStart = this.editor.selectionEnd = this._structureCache.bodyStart;
        }
        this._clampCursorToEditable();

        this.isDirty = true;
        this.updateStatus('modified');
        this._updateGutter();
        this._updateHighlight();
    }

    getCode() {
        if (this.editor) return this.editor.value;
        return this.codeContent || this.generateCsoundCode();
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
        if (this._statusTimer) {
            clearTimeout(this._statusTimer);
            this._statusTimer = null;
        }

        const set = (text, color) => {
            this.statusDisplay.textContent = text;
            this.statusDisplay.style.color = color;
        };

        if (state === 'saved') {
            set('● Saved', '#4a4');
        } else if (state === 'modified') {
            set('● Modified', '#fa4');
        } else if (state === 'error') {
            set('⚠ Error', '#f44');
        } else if (state === 'protected') {
            set('🔒 protected', PROTECTED_COLOR);
            this._statusTimer = setTimeout(() => {
                this.updateStatus(this.isDirty ? 'modified' : 'saved');
            }, 1500);
        } else if (state === 'forbidden') {
            set('🚫 forbidden keyword', '#f66');
            this._statusTimer = setTimeout(() => {
                this.updateStatus(this.isDirty ? 'modified' : 'saved');
            }, 1500);
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
            this.editor.value = this.generateCsoundCode();
            this.codeContent = this.editor.value;
        }

        this.isDirty = false;
        this._lastValidBody = null;
        this.updateStatus('saved');
        this._rebuildStructure();
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