// editor/ui/PropertiesPanel.js
//
// Панель свойств с табами Module / Component.
//
// Заменяет ModulePropertiesWindow + ComponentPropertiesWindow.
// Логика — из них же (schema-based рендер для компонента,
// form-based для модуля).

import { moduleStore } from '../../src/api/index.js';
import { ColorPicker } from '../../src/ui/ColorPicker.js';
import {
    serializeComponents,
    collectParamIds,
    collectPorts,
} from '../ComponentRegistry.js';

export class PropertiesPanel {
    constructor(app) {
        this.app = app;
        this.activeTab = 'module';   // 'module' | 'component'
        this.moduleColorPicker = null;

        this._build();
    }

    // ─────────────────────────── DOM ────────────────────────────────

    _build() {
        this.element = document.createElement('div');
        this.element.id = 'properties-panel';
        this.element.style.cssText = `
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: #1e1e1e;
            color: #ddd;
            font-family: Arial, sans-serif;
            overflow: hidden;
        `;

        // Tabs
        const tabs = document.createElement('div');
        tabs.style.cssText = `
            display: flex;
            background: #181818;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
        `;

        this.tabModule = this._makeTab('📦 Module', 'module');
        this.tabComponent = this._makeTab('🔧 Component', 'component');
        tabs.appendChild(this.tabModule);
        tabs.appendChild(this.tabComponent);

        // Body
        this.body = document.createElement('div');
        this.body.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            min-height: 0;
        `;

        this.element.appendChild(tabs);
        this.element.appendChild(this.body);

        this._render();
    }

    _makeTab(label, key) {
        const tab = document.createElement('div');
        tab.textContent = label;
        tab.style.cssText = `
            padding: 8px 16px;
            cursor: pointer;
            font-size: 11px;
            border-right: 1px solid #333;
            user-select: none;
            transition: background 0.15s;
        `;
        tab.onclick = () => this.setTab(key);
        return tab;
    }

    setTab(key) {
        this.activeTab = key;
        this._render();
    }

    // ─────────────────────────── RENDER ─────────────────────────────

    _render() {
        // Подсветка активного таба
        const active = 'color: #0af; background: #1e1e1e; font-weight: bold;';
        const inactive = 'color: #666; background: transparent;';
        this.tabModule.style.cssText += this.activeTab === 'module' ? active : inactive;
        this.tabComponent.style.cssText += this.activeTab === 'component' ? active : inactive;

        // Перерисовка содержимого
        this.body.innerHTML = '';

        if (this.activeTab === 'module') {
            this._renderModuleTab();
        } else {
            this._renderComponentTab();
        }
    }

    // ─────────────────────────── MODULE TAB ─────────────────────────

    _renderModuleTab() {
        const module = this.app.module;
        if (!module) {
            this.body.innerHTML = '<div style="color: #666; font-size: 11px;">No module</div>';
            return;
        }

        // ── Module Name ──
        this._field('Module Name', this._textInput(
            module.title || 'New Module',
            (v) => {
                let name = v.replace(/\s/g, '');
                if (name.match(/^[0-9]/)) name = 'M' + name;
                name = name.replace(/[^a-zA-Z0-9_]/g, '');
                module.title = name;

                // Обновляем код Csound
                if (this.app.codeViewerWindow && this.app.codeViewerWindow.isVisible) {
                    const newCode = this.app.codeViewerWindow.generateCsoundCode();
                    this.app.codeViewerWindow.editor.value = newCode;
                    this.app.codeViewerWindow.codeContent = newCode;
                    this.app.codeViewerWindow.isDirty = false;
                    this.app.codeViewerWindow.updateStatus('saved');
                }
            }
        ));

        // ── Height ── (width всегда 1)
        this._field('Height (grid cells)', this._numberInput(
            module.gridHeight || 3, 1, 20,
            () => this._updateSize(),
            'module-height-input'
        ));

        // ── Color ──
        this._field('Panel Color', this._makeColorSection(module));
    }

    _updateSize() {
        const heightInput = this.body.querySelector('.module-height-input');
        if (!heightInput) return;

        const raw = heightInput.value.trim();

        // ⭐ Если пусто или не число — не трогаем модуль, ждём ввода
        if (raw === '' || isNaN(parseInt(raw))) return;

        let h = parseInt(raw);
        if (h < 1) h = 1;
        if (h > 20) h = 20;

        heightInput.value = h;

        this.app.module.gridWidth = 1;
        this.app.module.gridHeight = h;

        const GRID_UNITS = { X: 260, Y: 15 };
        this.app.module.width = 1 * GRID_UNITS.X;
        this.app.module.height = h * GRID_UNITS.Y;

        this.app.centerModuleInGrid();

        // ⭐ Обновляем код Csound
        if (this.app.codeViewerWindow) {
            this.app.codeViewerWindow.updateCode();
        }
    }

    // ─────────────────────────── COMPONENT TAB ──────────────────────

    _renderComponentTab() {
        const comp = this.app.selectedComponent;

        if (!comp) {
            this.body.innerHTML = `
                <div style="color: #666; font-size: 11px; text-align: center; padding: 20px;">
                    No component selected.<br><br>
                    Click a component on the canvas.
                </div>
            `;
            return;
        }

        const compType = comp.constructor.name;

        // Заголовок
        const header = document.createElement('div');
        header.style.cssText = 'color: #0af; font-weight: bold; font-size: 12px; margin-bottom: 10px;';
        header.textContent = `${compType} (id=${comp.id || '?'})`;
        this.body.appendChild(header);

        // Schema-based поля
        const schema = this._getSchemaForComponent(comp);
        if (!schema || schema.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'color: #666; font-size: 11px; padding: 10px 0;';
            empty.textContent = 'No editable properties.';
            this.body.appendChild(empty);
            return;
        }

        for (const propDef of schema) {
            const field = this._createSchemaField(comp, propDef);
            this.body.appendChild(field);
        }
    }

    // ─────────────────────── SCHEMA-BASED FIELDS ────────────────────

    _getSchemaForComponent(comp) {
        if (typeof comp.constructor.getPropertySchema === 'function') {
            return comp.constructor.getPropertySchema();
        }
        return [];
    }

    _createSchemaField(comp, propDef) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '12px';

        wrapper.appendChild(this._label(propDef.label || propDef.key));

        let inputEl = null;

        if (propDef.type === 'select') {
            inputEl = document.createElement('select');
            inputEl.style.cssText = `
                width: 100%; padding: 4px 8px; background: #1a1a1a;
                border: 1px solid #444; border-radius: 3px; color: white;
                font-size: 12px; box-sizing: border-box;
            `;
            const options = this._getOptionsFor(propDef, comp);
            options.forEach(opt => {
                const optEl = document.createElement('option');
                optEl.value = opt.value;
                optEl.textContent = opt.label;
                if (String(comp[propDef.key]) === String(opt.value)) optEl.selected = true;
                inputEl.appendChild(optEl);
            });
            inputEl.onchange = () => {
                comp[propDef.key] = inputEl.value;
                this._onSchemaChange();
            };
        } else if (propDef.type === 'number') {
            inputEl = document.createElement('input');
            inputEl.type = 'number';
            inputEl.value = comp[propDef.key] ?? (propDef.min ?? 0);
            if (propDef.min !== undefined) inputEl.min = propDef.min;
            if (propDef.max !== undefined) inputEl.max = propDef.max;
            if (propDef.step !== undefined) inputEl.step = propDef.step;
            inputEl.style.cssText = `
                width: 100%; padding: 4px 8px; background: #1a1a1a;
                border: 1px solid #444; border-radius: 3px; color: white;
                font-size: 12px; box-sizing: border-box;
            `;
            inputEl.onchange = () => {
                const v = parseFloat(inputEl.value);
                if (!isNaN(v)) {
                    comp[propDef.key] = v;
                    this._onSchemaChange();
                }
            };
        } else if (propDef.type === 'mapping-select') {
            inputEl = this._makeMappingField(comp, propDef);
        } else if (propDef.type === 'checkbox') {
            inputEl = document.createElement('input');
            inputEl.type = 'checkbox';
            inputEl.checked = Boolean(comp[propDef.key]);
            inputEl.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #0af;';
            inputEl.onchange = () => {
                comp[propDef.key] = inputEl.checked;
                this._onSchemaChange();
            };
        }

        if (inputEl) wrapper.appendChild(inputEl);

        if (propDef.help) {
            const help = document.createElement('div');
            help.style.cssText = 'color: #555; font-size: 9px; margin-top: 3px; line-height: 1.3;';
            help.textContent = propDef.help;
            wrapper.appendChild(help);
        }

        return wrapper;
    }

    _makeMappingField(comp, propDef) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; gap: 4px;';

        const currentValue = comp[propDef.key] || '';
        const display = document.createElement('div');
        display.style.cssText = `
            flex: 1; padding: 4px 8px; background: #1a1a1a;
            border: 1px solid #444; border-radius: 3px;
            color: ${currentValue ? '#0af' : '#666'};
            font-size: 12px; font-family: monospace;
            cursor: pointer;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        `;
        display.textContent = currentValue || '— None —';

        const browseBtn = document.createElement('button');
        browseBtn.textContent = '🔍';
        browseBtn.style.cssText = `
            padding: 4px 8px; background: #2a2a2a; border: 1px solid #0af;
            color: #0af; border-radius: 3px; cursor: pointer; font-size: 12px;
        `;

        const open = () => {
            // Используем метод из старого ComponentPropertiesWindow, если он ещё доступен
            if (this.app.componentPropertiesWindow) {
                this.app.componentPropertiesWindow._showMappingBrowser(comp, propDef, display);
            } else {
                alert('Mapping browser not available');
            }
        };

        display.onclick = open;
        browseBtn.onclick = open;

        wrapper.appendChild(display);
        wrapper.appendChild(browseBtn);
        return wrapper;
    }

    _getOptionsFor(propDef, comp) {
        if (propDef.optionsFrom === 'ioComponents') {
            const options = [{ value: '', label: '— None —' }];
            for (const c of this.app.components) {
                if (c._isNewDragging) continue;
                const t = c.constructor.name;
                if (t !== 'Input' && t !== 'Output') continue;
                const label = c.label || c.ConnectorName || (t === 'Input' ? 'In' : 'Out');
                const jackType = c._jackType || c.type || 'audio';
                options.push({
                    value: String(c.id),
                    label: `${t} ${label} (${jackType}) [id=${c.id}]`,
                });
            }
            return options;
        }
        if (propDef.options) return propDef.options;
        return [];
    }

    _onSchemaChange() {
        if (this.app.codeViewerWindow) {
            this.app.codeViewerWindow.updateCode();
        }
    }

    // ─────────────────────────── COLOR SECTION ──────────────────────

    _makeColorSection(module) {
        const wrapper = document.createElement('div');

        // Пресеты
        const presets = [
            '#2a2a2a', '#3a2a2a', '#2a3a2a', '#2a2a3a', '#3a3a2a',
            '#2a3a3a', '#3a2a3a', '#1a1a1a', '#4a3a2a', '#2a4a3a',
            '#3a2a4a', '#4a2a3a',
        ];

        const presetRow = document.createElement('div');
        presetRow.style.cssText = 'display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;';

        for (const color of presets) {
            const btn = document.createElement('div');
            btn.style.cssText = `
                width: 20px; height: 20px; border-radius: 3px;
                background: ${color}; cursor: pointer;
                border: 2px solid transparent;
            `;
            if (module.customColor === color) btn.style.borderColor = '#0af';
            btn.onclick = () => {
                module.customColor = color;
                this._render();
            };
            presetRow.appendChild(btn);
        }
        wrapper.appendChild(presetRow);

        // Reset + custom hex
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; gap: 6px; align-items: center;';

        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↺ Default';
        resetBtn.style.cssText = `
            padding: 3px 10px; background: #2a2a2a; border: 1px solid #555;
            color: #aaa; border-radius: 3px; cursor: pointer; font-size: 10px;
        `;
        resetBtn.onclick = () => {
            module.customColor = null;
            this._render();
        };
        row.appendChild(resetBtn);

        const hexInput = document.createElement('input');
        hexInput.type = 'text';
        hexInput.placeholder = '#rrggbb';
        hexInput.value = module.customColor || '';
        hexInput.style.cssText = `
            flex: 1; padding: 3px 6px; background: #1a1a1a;
            border: 1px solid #444; border-radius: 3px;
            color: #ccc; font-size: 10px; font-family: monospace;
        `;
        hexInput.onchange = () => {
            const v = hexInput.value.trim().toLowerCase();
            if (/^#[0-9a-f]{6}$/.test(v)) {
                module.customColor = v;
                this._render();
            } else {
                alert('Invalid hex color');
                hexInput.value = module.customColor || '';
            }
        };
        row.appendChild(hexInput);

        wrapper.appendChild(row);
        return wrapper;
    }

    // ─────────────────────────── HELPERS ────────────────────────────

    _label(text) {
        const el = document.createElement('label');
        el.textContent = text;
        el.style.cssText = 'color: #888; font-size: 10px; display: block; margin-bottom: 3px;';
        return el;
    }

    _field(labelText, inputEl) {
        const wrapper = document.createElement('div');
        wrapper.style.marginBottom = '12px';
        wrapper.appendChild(this._label(labelText));
        wrapper.appendChild(inputEl);
        this.body.appendChild(wrapper);
    }

    _textInput(value, onChange) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value;
        input.style.cssText = `
            width: 100%; padding: 4px 8px; background: #1a1a1a;
            border: 1px solid #444; border-radius: 3px; color: white;
            font-size: 12px; box-sizing: border-box;
        `;
        input.onchange = () => onChange(input.value);
        return input;
    }

    _numberInput(value, min, max, onChange, className = '') {
        const input = document.createElement('input');
        input.type = 'text';   // ⭐ text, не number — позволяет вводить что угодно
        input.inputMode = 'numeric';
        if (className) input.className = className;
        input.value = value;
        input.style.cssText = `
            width: 100%; padding: 4px 8px; background: #1a1a1a;
            border: 1px solid #444; border-radius: 3px; color: white;
            font-size: 12px; box-sizing: border-box;
        `;
        input.oninput = () => onChange();
        return input;
    }
}