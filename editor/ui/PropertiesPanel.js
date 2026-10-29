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
        const base = 'padding: 8px 16px; cursor: pointer; font-size: 11px; border-right: 1px solid #333; user-select: none; transition: background 0.15s;';
        const active = 'color: #0af; background: #1e1e1e; font-weight: bold;';
        const inactive = 'color: #666; background: transparent;';
        this.tabModule.style.cssText = base + (this.activeTab === 'module' ? active : inactive);
        this.tabComponent.style.cssText = base + (this.activeTab === 'component' ? active : inactive);

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
        const nameInput = this._textInput(
            module.title || 'New Module',
            (v) => {
                let name = v.replace(/\s/g, '');
                if (/^[0-9]/.test(name)) name = 'M' + name;
                name = name.replace(/[^a-zA-Z0-9_]/g, '');
                if (!name) name = 'NewModule';

                module.title = name;
                nameInput.value = name;   // показываем санитайзнутое

                // Перегенерация структуры (opcode-строка обновится, тело сохранится)
                if (this.app.codeViewerWindow) {
                    this.app.codeViewerWindow.updateCode();
                }
            }
        );
        // Enter → blur → change
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                nameInput.blur();
            }
        });
        this._field('Module Name', nameInput);

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
                if (propDef.afterChange) propDef.afterChange(comp, inputEl.value);
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
                    if (propDef.afterChange) propDef.afterChange(comp, v);
                    this._onSchemaChange();
                }
            };
        } else if (propDef.type === 'text') {
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.value = comp[propDef.key] ?? '';
            inputEl.style.cssText = `
                width: 100%; padding: 4px 8px; background: #1a1a1a;
                border: 1px solid #444; border-radius: 3px; color: white;
                font-size: 12px; box-sizing: border-box;
            `;
            inputEl.onchange = () => {
                comp[propDef.key] = inputEl.value;
                if (propDef.afterChange) propDef.afterChange(comp, inputEl.value);
                this._onSchemaChange();
            };
        } else if (propDef.type === 'list') {
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            const currentArr = Array.isArray(comp[propDef.key]) ? comp[propDef.key] : [];
            inputEl.value = currentArr.join(', ');
            inputEl.style.cssText = `
                width: 100%; padding: 4px 8px; background: #1a1a1a;
                border: 1px solid #444; border-radius: 3px; color: white;
                font-size: 12px; box-sizing: border-box; font-family: monospace;
            `;
            inputEl.onchange = () => {
                const arr = inputEl.value.split(',').map(s => s.trim()).filter(s => s !== '');
                if (arr.length === 0) {
                    inputEl.value = currentArr.join(', ');
                    return;
                }
                comp[propDef.key] = arr;
                if (propDef.afterChange) propDef.afterChange(comp, arr);
                this._onSchemaChange();
            };
        } else if (propDef.type === 'mapping-select') {
            inputEl = this._makeMappingField(comp, propDef);
        } else if (propDef.type === 'mapping-multi-select') {
            inputEl = this._makeMappingMultiField(comp, propDef);
        } else if (propDef.type === 'checkbox') {
            inputEl = document.createElement('input');
            inputEl.type = 'checkbox';
            inputEl.checked = Boolean(comp[propDef.key]);
            inputEl.style.cssText = 'width: 16px; height: 16px; cursor: pointer; accent-color: #0af;';
            inputEl.onchange = () => {
                comp[propDef.key] = inputEl.checked;
                if (propDef.afterChange) propDef.afterChange(comp, inputEl.checked);
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

    _makeMappingMultiField(comp, propDef) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; gap: 4px; align-items: stretch;';

        const currentArr = Array.isArray(comp[propDef.key]) ? comp[propDef.key] : [];
        const currentText = currentArr.length > 0 ? currentArr.join(', ') : '';

        const display = document.createElement('div');
        display.style.cssText = `
            flex: 1; padding: 4px 8px; background: #1a1a1a;
            border: 1px solid #444; border-radius: 3px;
            color: ${currentText ? '#0af' : '#666'};
            font-size: 12px; font-family: monospace;
            cursor: pointer; min-height: 18px;
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        `;
        display.textContent = currentText || '— None —';

        const browseBtn = document.createElement('button');
        browseBtn.textContent = '🔍';
        browseBtn.style.cssText = `
            padding: 4px 8px; background: #2a2a2a; border: 1px solid #0af;
            color: #0af; border-radius: 3px; cursor: pointer; font-size: 12px;
        `;

        const open = () => this._showTablesMultiBrowser(comp, propDef, display);
        display.onclick = open;
        browseBtn.onclick = open;

        wrapper.appendChild(display);
        wrapper.appendChild(browseBtn);
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

        // ⭐ NEW: контроллеры и переключалки (всё параметрическое, кроме TextField)
        if (propDef.optionsFrom === 'parametricComponents') {
            const options = [{ value: '', label: '— None —' }];
            const PARAM_TYPES = [
                'Knob', 'Slider',
                'ButtonFlat', 'ButtonRadio', 'ButtonIncDec', 'ButtonText',
                'PartSelector',
            ];
            for (const c of this.app.components) {
                if (c._isNewDragging) continue;
                const t = c.constructor.name;
                if (!PARAM_TYPES.includes(t)) continue;
                if (comp && c === comp) continue;   // не сам себя
                options.push({
                    value: String(c.id),
                    label: `${t} #${c.id}`,
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


    async _listTableNames() {
        if (this._cachedTableNames) return this._cachedTableNames;

        try {
            const res = await fetch('/tables/');
            if (!res.ok) {
                console.warn('[PropertiesPanel] /tables/ not available');
                this._cachedTableNames = [];
                return [];
            }
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const names = Array.from(doc.querySelectorAll('a'))
                .map(a => a.getAttribute('href') || '')
                .filter(h => h.endsWith('.json'))
                .map(h => h.replace(/^.*\//, '').replace(/\.json$/, ''))
                .sort();
            this._cachedTableNames = names;
            return names;
        } catch (e) {
            console.warn('[PropertiesPanel] failed to list /tables/', e);
            this._cachedTableNames = [];
            return [];
        }
    }

    async _showTablesMultiBrowser(comp, propDef, displayEl) {
        const allNames = await this._listTableNames();
        if (allNames.length === 0) {
            alert('No tables found in /public/tables/');
            return;
        }

        const current = Array.isArray(comp[propDef.key]) ? comp[propDef.key].slice() : [];
        const selected = new Set(current);

        // ── Overlay ──
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.6);
            z-index: 99999; display: flex; align-items: center;
            justify-content: center;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            background: #1e1e1e; border: 1px solid #0af; border-radius: 6px;
            width: 420px; max-width: 90vw; max-height: 80vh;
            display: flex; flex-direction: column; color: #ddd;
            font-family: Arial, sans-serif;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px 14px; border-bottom: 1px solid #333;
            color: #0af; font-size: 12px; font-weight: bold;
        `;
        header.textContent = `Select tables — ${propDef.label || propDef.key}`;
        modal.appendChild(header);

        // Search
        const searchWrap = document.createElement('div');
        searchWrap.style.cssText = 'padding: 8px 14px; border-bottom: 1px solid #333;';
        const search = document.createElement('input');
        search.type = 'text';
        search.placeholder = 'Filter…';
        search.style.cssText = `
            width: 100%; padding: 4px 8px; background: #1a1a1a;
            border: 1px solid #444; border-radius: 3px; color: white;
            font-size: 12px; box-sizing: border-box;
        `;
        searchWrap.appendChild(search);
        modal.appendChild(searchWrap);

        // List
        const list = document.createElement('div');
        list.style.cssText = `
            flex: 1; overflow-y: auto; padding: 6px 14px;
            min-height: 100px; max-height: 50vh;
        `;
        modal.appendChild(list);

        // Selected preview (order matters!)
        const preview = document.createElement('div');
        preview.style.cssText = `
            padding: 6px 14px; border-top: 1px solid #333;
            font-size: 10px; color: #888; font-family: monospace;
            max-height: 60px; overflow-y: auto; word-break: break-all;
        `;
        const updatePreview = () => {
            const ordered = this._orderBySelection(allNames, selected, current);
            preview.textContent = ordered.length > 0
                ? `Order: ${ordered.join(' → ')}`
                : 'Nothing selected';
        };
        updatePreview();
        modal.appendChild(preview);

        // Render rows
        const rows = new Map();
        const renderRows = (filter = '') => {
            list.innerHTML = '';
            rows.clear();
            const lower = filter.toLowerCase();
            for (const name of allNames) {
                if (lower && !name.toLowerCase().includes(lower)) continue;
                const row = document.createElement('label');
                row.style.cssText = `
                    display: flex; align-items: center; gap: 8px;
                    padding: 4px 6px; cursor: pointer; border-radius: 3px;
                    font-size: 12px;
                `;
                row.onmouseenter = () => row.style.background = '#2a2a2a';
                row.onmouseleave = () => row.style.background = 'transparent';

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = selected.has(name);
                cb.style.cssText = 'accent-color: #0af; cursor: pointer;';
                cb.onchange = () => {
                    if (cb.checked) selected.add(name);
                    else selected.delete(name);
                    updatePreview();
                };

                const lbl = document.createElement('span');
                lbl.textContent = name;
                lbl.style.cssText = 'font-family: monospace; color: #ccc;';

                row.appendChild(cb);
                row.appendChild(lbl);
                list.appendChild(row);
                rows.set(name, { row, cb });
            }
        };
        renderRows();
        search.oninput = () => renderRows(search.value);

        // Footer
        const footer = document.createElement('div');
        footer.style.cssText = `
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px 14px; border-top: 1px solid #333; gap: 8px;
        `;

        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear';
        clearBtn.style.cssText = `
            padding: 4px 12px; background: #2a2a2a; border: 1px solid #555;
            color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px;
        `;
        clearBtn.onclick = () => {
            selected.clear();
            for (const { cb } of rows.values()) cb.checked = false;
            updatePreview();
        };

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 4px 12px; background: #2a2a2a; border: 1px solid #555;
            color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px;
        `;
        cancelBtn.onclick = () => document.body.removeChild(overlay);

        const okBtn = document.createElement('button');
        okBtn.textContent = 'OK';
        okBtn.style.cssText = `
            padding: 4px 16px; background: #0af; border: none;
            color: #000; border-radius: 3px; cursor: pointer;
            font-size: 11px; font-weight: bold;
        `;
        okBtn.onclick = () => {
            const ordered = this._orderBySelection(allNames, selected, current);
            if (ordered.length === 0) {
                comp[propDef.key] = null;
                displayEl.textContent = '— None —';
                displayEl.style.color = '#666';
            } else {
                comp[propDef.key] = ordered;
                displayEl.textContent = ordered.join(', ');
                displayEl.style.color = '#0af';
            }
            if (propDef.afterChange) propDef.afterChange(comp, comp[propDef.key]);
            this._onSchemaChange();
            document.body.removeChild(overlay);
        };

        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 8px;';
        actions.appendChild(clearBtn);
        actions.appendChild(cancelBtn);
        actions.appendChild(okBtn);
        footer.appendChild(document.createElement('div'));   // spacer
        footer.appendChild(actions);
        modal.appendChild(footer);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Escape / click outside
        const onKey = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', onKey);
            }
        };
        document.addEventListener('keydown', onKey);
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', onKey);
            }
        };
    }

    _orderBySelection(allNames, selectedSet, currentOrder) {
        // 1. Сохраняем текущий порядок для тех, кто всё ещё выбран
        const ordered = [];
        for (const name of currentOrder) {
            if (selectedSet.has(name) && !ordered.includes(name)) {
                ordered.push(name);
            }
        }
        // 2. Добавляем новые в порядке allNames
        for (const name of allNames) {
            if (selectedSet.has(name) && !ordered.includes(name)) {
                ordered.push(name);
            }
        }
        return ordered;
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