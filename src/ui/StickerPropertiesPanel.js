// src/ui/StickerPropertiesPanel.js
//
// Панель редактирования стикера. Открывается:
//   - правый клик по стикеру → Edit…
//   - двойной клик по стикеру (добавим в EventManager)
//
// Автосохранение при каждом изменении (без явного Save),
// forceRedraw вызывается сразу.

import { getCurrentTheme } from '../theme/currentTheme.js';

export class StickerPropertiesPanel {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.currentSticker = null;
        this.windowElement = null;

        this.createWindow();
        this.setupEventListeners();
    }

    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'sticker-properties-panel';
        this.windowElement.style.cssText = `
            position: fixed;
            right: 360px;
            top: 80px;
            width: 300px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            background: rgba(20, 20, 25, 0.97);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 14px;
            color: #ccc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            z-index: 16000;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            display: none;
            user-select: none;
        `;

        this.windowElement.innerHTML = `
            <div id="sp-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #333;
                cursor: move;
            ">
                <span style="color: #0af; font-weight: bold; font-size: 13px;">
                    📌 Sticker
                </span>
                <button id="sp-close" style="
                    background: transparent;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0 4px;
                ">✕</button>
            </div>
            <div id="sp-content"></div>
        `;

        document.body.appendChild(this.windowElement);
        this.makeDraggable(this.windowElement.querySelector('#sp-header'));
        this.windowElement.querySelector('#sp-close').onclick = () => this.hide();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) this.hide();
        });
    }

    /**
     * @param {Sticker} sticker
     */
    show(sticker) {
        this.currentSticker = sticker;
        this.renderContent();
        this.windowElement.style.display = 'block';
        this.isVisible = true;
    }

    hide() {
        this.isVisible = false;
        this.windowElement.style.display = 'none';
        this.currentSticker = null;
    }

    toggle() {
        if (this.isVisible) this.hide();
        else if (this.currentSticker) this.show(this.currentSticker);
    }

    // ============================================================
    //  CONTENT
    // ============================================================

    renderContent() {
        const content = this.windowElement.querySelector('#sp-content');
        content.innerHTML = '';

        const s = this.currentSticker;
        if (!s) return;

        // === Type ===
        content.appendChild(this.buildSection('Type', [
            this.buildRadioGroup('type', 'Kind', s.type, [
                { value: 'text', label: '📝 Text' },
                { value: 'svg',  label: '🎨 SVG' },
            ]),
        ]));

        if (s.type === 'text') {
            content.appendChild(this.buildSection('Text', [
                this.buildTextarea('text', 'Content', s.text),
                this.buildNumber('fontSize', 'Font Size', s.fontSize, 6, 96, 1),
                this.buildFontFamily('fontFamily', s.fontFamily),
                this.buildRadioGroup('textAlign', 'Align', s.textAlign, [
                    { value: 'left', label: 'L' },
                    { value: 'center', label: 'C' },
                    { value: 'right', label: 'R' },
                ]),
                this.buildNumber('lineHeight', 'Line Height', s.lineHeight, 0.8, 3, 0.05),
            ]));
        }

        if (s.type === 'svg') {
            content.appendChild(this.buildSection('SVG', [
                this.buildSvgTextarea('svgString', 'Markup', s.svgString || ''),
            ]));
        }

        // === Size (grid cells) ===
        content.appendChild(this.buildSection('Size', [
            this.buildNumber('gridW', 'Width (cells)', s.gridW, 1, 100, 1),
            this.buildNumber('gridH', 'Height (cells)', s.gridH, 1, 30, 1),
        ]));

        // === Color ===
        content.appendChild(this.buildSection('Color', [
            this.buildColorMode(s),
            ...(getCurrentTheme().isClassic || s.colorMode === 'custom'
                ? [this.buildHexInput('color', s.color)]
                : []),
        ]));

        // === Marquee (только для text) ===
        if (s.type === 'text') {
            content.appendChild(this.buildSection('Marquee', [
                this.buildCheckbox('marquee.enabled', 'Enable', s.marquee.enabled),
                this.buildNumber('marquee.speed', 'Speed (px/s)', s.marquee.speed, 5, 300, 5),
                this.buildNumber('marquee.gap', 'Gap (px)', s.marquee.gap, 0, 200, 5),
            ]));
        }

        // === Background ===
        content.appendChild(this.buildSection('Background', [
            this.buildColorInput('bgColor', 'Color', s.bgColor || '#000000'),
            this.buildNumber('bgOpacity', 'Opacity', s.bgOpacity, 0, 1, 0.05),
            this.buildButton('Clear background', () => {
                s.bgColor = null;
                this.system.forceRedraw();
                this.renderContent();
            }),
        ]));

        // === Danger zone ===
        content.appendChild(this.buildButton('🗑️ Delete sticker', () => {
            this.system.removeSticker(s);
            this.hide();
        }, '#ff6b6b'));
    }

    // === Controls ===

    buildSection(title, children) {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom: 14px;';

        const header = document.createElement('div');
        header.textContent = title;
        header.style.cssText = `
            color: #888;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #2a2a2a;
        `;
        section.appendChild(header);
        children.forEach(c => section.appendChild(c));
        return section;
    }

    buildSvgTextarea(path, label, value) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #aaa; font-size: 11px; margin-bottom: 4px;';

        const hint = document.createElement('div');
        hint.textContent = 'Вставь <svg>…</svg> или просто <path d="…"/>. Используй currentColor для цвета.';
        hint.style.cssText = 'color: #555; font-size: 10px; margin-bottom: 4px; line-height: 1.4;';

        const input = document.createElement('textarea');
        input.value = value;
        input.rows = 10;
        input.spellcheck = false;
        input.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 3px;
            color: #0af;
            font-family: monospace;
            font-size: 10px;
            line-height: 1.4;
            outline: none;
            resize: vertical;
            box-sizing: border-box;
            min-height: 120px;
            white-space: pre;
            overflow-wrap: normal;
            overflow-x: auto;
        `;
        input.oninput = () => {
            this.setPath(path, input.value, { silent: true });
        };

        wrapper.appendChild(labelEl);
        wrapper.appendChild(hint);
        wrapper.appendChild(input);
        return wrapper;
    }

    buildTextarea(path, label, value) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #aaa; font-size: 11px; margin-bottom: 4px;';

        const input = document.createElement('textarea');
        input.value = value;
        input.rows = 3;
        input.style.cssText = `
            width: 100%;
            padding: 6px 8px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 3px;
            color: #0af;
            font-family: monospace;
            font-size: 11px;
            outline: none;
            resize: vertical;
            box-sizing: border-box;
        `;
        input.oninput = () => {
            this.setPath(path, input.value, { silent: true });
        };

        wrapper.appendChild(labelEl);
        wrapper.appendChild(input);
        return wrapper;
    }

    buildNumber(path, label, value, min, max, step) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelRow = document.createElement('div');
        labelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 4px;';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #aaa; font-size: 11px;';

        const valueEl = document.createElement('span');
        valueEl.textContent = this.formatValue(value);
        valueEl.style.cssText = 'color: #0af; font-size: 11px; font-family: monospace;';

        labelRow.appendChild(labelEl);
        labelRow.appendChild(valueEl);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;
        input.style.cssText = 'width: 100%; cursor: pointer; accent-color: #0af;';

        input.oninput = () => {
            const v = parseFloat(input.value);
            valueEl.textContent = this.formatValue(v);
            this.setPath(path, v, { silent: true });
        };

        wrapper.appendChild(labelRow);
        wrapper.appendChild(input);
        return wrapper;
    }

    buildFontFamily(path, value) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelEl = document.createElement('div');
        labelEl.textContent = 'Font Family';
        labelEl.style.cssText = 'color: #aaa; font-size: 11px; margin-bottom: 4px;';

        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%;
            padding: 4px 8px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 3px;
            color: #0af;
            font-family: monospace;
            font-size: 11px;
            outline: none;
        `;
        const options = ['monospace', 'sans-serif', 'serif', 'Arial', 'Courier New', 'Georgia', 'Verdana'];
        options.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o;
            opt.textContent = o;
            opt.style.background = '#1a1a1a';
            if (o === value) opt.selected = true;
            select.appendChild(opt);
        });
        select.onchange = () => this.setPath(path, select.value);

        wrapper.appendChild(labelEl);
        wrapper.appendChild(select);
        return wrapper;
    }

    buildRadioGroup(path, label, currentValue, options) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #aaa; font-size: 11px; margin-bottom: 4px;';

        const row = document.createElement('div');
        row.style.cssText = 'display: flex; gap: 6px;';

        options.forEach(opt => {
            const btn = document.createElement('button');
            const isActive = currentValue === opt.value;
            btn.textContent = opt.label;
            btn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: ${isActive ? '#0a3a5a' : '#2a2a2a'};
                border: 1px solid ${isActive ? '#0af' : '#444'};
                color: ${isActive ? '#0af' : '#aaa'};
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-family: inherit;
            `;
            btn.onclick = () => this.setPath(path, opt.value);
            row.appendChild(btn);
        });

        wrapper.appendChild(labelEl);
        wrapper.appendChild(row);
        return wrapper;
    }

    buildCheckbox(path, label, checked) {
        const wrapper = document.createElement('label');
        wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 10px; cursor: pointer;';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!checked;
        input.style.cssText = 'width: 14px; height: 14px; cursor: pointer; accent-color: #0af;';
        input.onchange = () => this.setPath(path, input.checked);

        const span = document.createElement('span');
        span.textContent = label;
        span.style.cssText = 'color: #aaa; font-size: 11px;';

        wrapper.appendChild(input);
        wrapper.appendChild(span);
        return wrapper;
    }

    buildColorInput(path, label, value) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 10px;';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #aaa; font-size: 11px; flex: 1;';

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value;
        colorInput.style.cssText = 'width: 36px; height: 26px; padding: 0; border: 1px solid #444; border-radius: 3px; cursor: pointer;';
        colorInput.oninput = () => this.setPath(path, colorInput.value, { silent: true });

        wrapper.appendChild(labelEl);
        wrapper.appendChild(colorInput);
        return wrapper;
    }

    buildColorMode(sticker) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelEl = document.createElement('div');
        labelEl.textContent = 'Mode';
        labelEl.style.cssText = 'color: #aaa; font-size: 11px; margin-bottom: 4px;';

        const row = document.createElement('div');
        row.style.cssText = 'display: flex; gap: 6px;';

        const isLcd = getCurrentTheme().isLcd;
        const modes = isLcd
            ? [
                { value: 'white',  label: '⚪ White' },
                { value: 'accent', label: '🎨 Accent' },
            ]
            : [
                { value: 'custom', label: '🎨 Custom' },
                { value: 'white',  label: '⚪ White' },
            ];

        modes.forEach(m => {
            const btn = document.createElement('button');
            const isActive = sticker.colorMode === m.value;
            btn.textContent = m.label;
            btn.style.cssText = `
                flex: 1;
                padding: 6px;
                background: ${isActive ? '#0a3a5a' : '#2a2a2a'};
                border: 1px solid ${isActive ? '#0af' : '#444'};
                color: ${isActive ? '#0af' : '#aaa'};
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-family: inherit;
            `;
            btn.onclick = () => this.setPath('colorMode', m.value);
            row.appendChild(btn);
        });

        wrapper.appendChild(labelEl);
        wrapper.appendChild(row);
        return wrapper;
    }

    buildHexInput(path, value) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 10px;';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = value || '#ffffff';
        textInput.style.cssText = `
            flex: 1;
            padding: 4px 8px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 3px;
            color: #0af;
            font-family: monospace;
            font-size: 11px;
            outline: none;
        `;
        textInput.onchange = () => {
            const v = textInput.value.trim();
            if (/^#[0-9a-fA-F]{3,8}$/.test(v)) {
                this.setPath(path, v);
            } else {
                textInput.value = this.currentSticker.color;
            }
        };

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value || '#ffffff';
        colorInput.style.cssText = 'width: 36px; height: 26px; padding: 0; border: 1px solid #444; border-radius: 3px; cursor: pointer;';
        colorInput.oninput = () => {
            textInput.value = colorInput.value;
            this.setPath(path, colorInput.value, { silent: true });
        };

        wrapper.appendChild(textInput);
        wrapper.appendChild(colorInput);
        return wrapper;
    }

    buildButton(text, onClick, color = '#2a2a2a') {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: ${color};
            border: 1px solid #555;
            color: ${color === '#2a2a2a' ? '#ccc' : color};
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: inherit;
            margin-top: 6px;
        `;
        btn.onmouseenter = () => { btn.style.borderColor = color === '#2a2a2a' ? '#666' : color; };
        btn.onmouseleave = () => { btn.style.borderColor = '#555'; };
        btn.onclick = onClick;
        return btn;
    }

    // ============================================================
    //  ЛОГИКА
    // ============================================================

    setPath(path, value, options = {}) {
        const s = this.currentSticker;
        if (!s) return;

        const parts = path.split('.');
        let target = s;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {};
            target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;

        // ⭐ при переключении на SVG — дефолтный контент, если пусто
        if (path === 'type' && value === 'svg' && !s.svgString) {
            s.svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z"/>
    </svg>`;
        }

        this.system.forceRedraw();

        if (!options.silent) this.renderContent();
    }

    formatValue(v) {
        if (v === undefined || v === null) return '—';
        if (typeof v !== 'number') return String(v);
        if (Number.isInteger(v)) return String(v);
        return v.toFixed(2);
    }

    makeDraggable(handle) {
        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = this.windowElement.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
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

        document.addEventListener('mouseup', () => { isDragging = false; });
    }
}