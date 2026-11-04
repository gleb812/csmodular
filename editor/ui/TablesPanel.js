// editor/ui/TablesPanel.js
//
// Третья закладка PropertiesPanel: просмотр mapping-таблиц.
// Слева — список таблиц + поиск, справа — график (x = 0..N-1, y = value).
//
// Таблицы берутся из /tables/*.json (flat array).
// MIDI-совместимость: максимум 128 значений, но таблица может быть любой длины.

export class TablesPanel {
    constructor(app) {
        this.app = app;
        this.element = null;
        this.tableNames = [];        // все имена таблиц (из /tables/ listing)
        this.activeName = null;      // выбранная
        this.activeData = null;      // flat array
        this.searchTerm = '';
        this._cache = new Map();     // name → array
        this._tableNamesLoaded = false;

        this._build();
        this._injectStyles();
    }

    async refresh() {
        // Загрузить список имён (один раз)
        if (!this._tableNamesLoaded) {
            await this._loadTableNames();
            this._tableNamesLoaded = true;
        }
        this._renderList();
    }

    // ─────────────────────────── BUILD ────────────────────────────

    _build() {
        this.element = document.createElement('div');
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
        this.element.style.display = 'none';  // показываем только при activeTab === 'tables'

        // Search
        const searchWrap = document.createElement('div');
        searchWrap.style.cssText = `
            padding: 8px 10px;
            background: #181818;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
        `;
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search tables…';
        this.searchInput.style.cssText = `
            width: 100%; padding: 4px 8px;
            background: #1a1a1a; border: 1px solid #444;
            border-radius: 3px; color: white; font-size: 11px;
            outline: none; box-sizing: border-box;
        `;
        this.searchInput.addEventListener('input', () => {
            this.searchTerm = this.searchInput.value;
            this._renderList();
        });
        searchWrap.appendChild(this.searchInput);
        this.element.appendChild(searchWrap);

        // Body: list (top) + chart (bottom)
        const body = document.createElement('div');
        body.style.cssText = 'flex: 1; display: flex; flex-direction: column; min-height: 0;';

        // List — horizontal chips, scrollable
        this.listPanel = document.createElement('div');
        this.listPanel.style.cssText = `
            max-height: 80px;
            background: #222;
            border-bottom: 1px solid #333;
            overflow-x: auto;
            overflow-y: hidden;
            padding: 6px 8px;
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            align-content: flex-start;
            flex-shrink: 0;
        `;
        body.appendChild(this.listPanel);

        // Chart — full width, flex: 1
        this.chartPanel = document.createElement('div');
        this.chartPanel.style.cssText = `
            flex: 1;
            background: #1a1a1a;
            display: flex; flex-direction: column;
            min-height: 0;
        `;
        body.appendChild(this.chartPanel);

        // Chart header
        this.chartHeader = document.createElement('div');
        this.chartHeader.style.cssText = `
            padding: 6px 10px;
            background: #252525;
            border-bottom: 1px solid #333;
            font-size: 10px; color: #888;
            flex-shrink: 0;
            min-height: 20px;
        `;
        this.chartHeader.textContent = 'Select a table';
        this.chartPanel.appendChild(this.chartHeader);

        // Canvas
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = 'flex: 1; min-height: 0; display: block;';
        this.chartPanel.appendChild(this.canvas);

        this.element.appendChild(body);
    }

    // ─────────────────────────── DATA ─────────────────────────────

    async _loadTableNames() {
        const mt = this.app.mappingTables;

        // 1. MappingTables — источник истины
        if (mt) {
            const maps = mt.maps || mt.tables || mt.data || mt._maps;
            if (maps && typeof maps === 'object' && Object.keys(maps).length > 0) {
                this.tableNames = Object.keys(maps).sort();
                for (const name of this.tableNames) {
                    this._cache.set(name, maps[name]);
                }
                return;
            }
        }

        // 2. Fallback: /tables/_index.json (если есть отдельные файлы)
        try {
            const res = await fetch('/tables/_index.json', { cache: 'no-cache' });
            if (res.ok) {
                const text = await res.text();
                if (!/<!DOCTYPE|<html[\s>]/i.test(text.slice(0, 200))) {
                    const data = JSON.parse(text);
                    if (Array.isArray(data)) {
                        this.tableNames = data.map(n => String(n)).sort();
                        return;
                    }
                }
            }
        } catch { /* ignore */ }

        this.tableNames = [];
    }


    async _loadTable(name) {
        if (this._cache.has(name)) return this._cache.get(name);

        // 1. MappingTables
        const mt = this.app.mappingTables;
        if (mt) {
            const maps = mt.maps || mt.tables || mt.data || mt._maps;
            if (maps && maps[name]) {
                this._cache.set(name, maps[name]);
                return maps[name];
            }
            // case-insensitive
            if (maps) {
                const lower = name.toLowerCase();
                for (const key of Object.keys(maps)) {
                    if (key.toLowerCase() === lower) {
                        this._cache.set(name, maps[key]);
                        return maps[key];
                    }
                }
            }
        }

        // 2. Fetch /tables/<name>.json
        try {
            const res = await fetch(`/tables/${name}.json`, { cache: 'no-cache' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            if (/<!DOCTYPE|<html[\s>]/i.test(text.slice(0, 200))) {
                throw new Error('HTML fallback (file missing)');
            }
            const data = JSON.parse(text);
            if (!Array.isArray(data)) throw new Error('Not an array');
            this._cache.set(name, data);
            return data;
        } catch (e) {
            console.warn(`[TablesPanel] loadTable("${name}") failed:`, e);
            return null;
        }
    }

    // ─────────────────────────── RENDER ───────────────────────────

    _renderList() {
        this.listPanel.innerHTML = '';

        const term = this.searchTerm.toLowerCase().trim();
        const filtered = term
            ? this.tableNames.filter(n => n.toLowerCase().includes(term))
            : this.tableNames;

        if (this.tableNames.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'color: #555; font-size: 11px; font-style: italic; padding: 4px;';
            msg.textContent = 'No tables found in /tables/ — add _index.json';
            this.listPanel.appendChild(msg);
            return;
        }

        if (filtered.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'color: #555; font-size: 11px; font-style: italic; padding: 4px;';
            msg.textContent = `No tables matching "${this.searchTerm}"`;
            this.listPanel.appendChild(msg);
            return;
        }

        for (const name of filtered) {
            const chip = document.createElement('div');
            chip.className = 'tp-table-chip';
            chip.dataset.name = name;
            chip.style.cssText = `
                padding: 3px 8px;
                font-size: 11px; color: #aaa;
                cursor: pointer; user-select: none;
                background: #2a2a2a;
                border: 1px solid #333;
                border-radius: 3px;
                font-family: monospace;
                display: inline-flex; align-items: center; gap: 6px;
                white-space: nowrap;
            `;

            const label = document.createElement('span');
            label.textContent = name;
            chip.appendChild(label);

            if (this._cache.has(name)) {
                const size = document.createElement('span');
                size.textContent = String(this._cache.get(name).length);
                size.style.cssText = 'color: #555; font-size: 9px;';
                chip.appendChild(size);
            }

            if (name === this.activeName) {
                chip.style.background = '#0af';
                chip.style.color = '#000';
                chip.style.borderColor = '#0af';
                chip.style.fontWeight = 'bold';
            }

            chip.onmouseenter = () => {
                if (name !== this.activeName) chip.style.background = '#333';
            };
            chip.onmouseleave = () => {
                if (name !== this.activeName) chip.style.background = '#2a2a2a';
            };
            chip.onclick = () => this._selectTable(name);

            this.listPanel.appendChild(chip);
        }
    }

    async _selectTable(name) {
        this.activeName = name;
        this.activeData = null;
        this._renderList();
        this.chartHeader.textContent = `Loading ${name}…`;
        this._drawEmpty();

        const data = await this._loadTable(name);
        if (!data) {
            this.chartHeader.textContent = `❌ Failed to load ${name}`;
            return;
        }
        if (this.activeName !== name) return;  // переключились, пока грузили
        this.activeData = data;
        this._renderList();  // обновить размер в списке
        this._updateChartHeader();
        this._draw();
    }

    _updateChartHeader() {
        if (!this.activeData) {
            this.chartHeader.textContent = 'Select a table';
            return;
        }
        const n = this.activeData.length;
        const min = Math.min(...this.activeData);
        const max = Math.max(...this.activeData);
        this.chartHeader.textContent = `${this.activeName} — ${n} values, min=${min.toFixed?.(2) ?? min}, max=${max.toFixed?.(2) ?? max}`;
    }

    // ─────────────────────────── CHART ────────────────────────────

    _draw() {
        const canvas = this.canvas;
        const parent = canvas.parentElement;
        if (!parent) return;

        // Resize canvas to parent
        const rect = parent.getBoundingClientRect();
        const w = Math.max(100, Math.floor(rect.width));
        const h = Math.max(100, Math.floor(rect.height - 30));  // 30 = header
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        if (!this.activeData || this.activeData.length === 0) {
            this._drawEmpty();
            return;
        }

        const data = this.activeData;
        const n = data.length;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = (max - min) || 1;

        // Padding
        const padL = Math.max(28, Math.min(50, w * 0.1));
        const padR = 12;
        const padT = 12;
        const padB = 24;
        const plotW = w - padL - padR;
        const plotH = h - padT - padB;

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);

        // Grid lines (horizontal, 4 lines)
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.font = '9px monospace';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const v = min + (range * i) / 4;
            const y = padT + plotH - (plotH * i) / 4;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(padL + plotW, y);
            ctx.stroke();
            ctx.fillText(v.toFixed?.(2) ?? String(v), padL - 4, y);
        }

        // X-axis ticks (0, n/4, n/2, 3n/4, n-1)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        for (let i = 0; i <= 4; i++) {
            const x = padL + (plotW * i) / 4;
            const v = Math.round((n - 1) * i / 4);
            ctx.fillText(String(v), x, padT + plotH + 4);
        }

        // Data line
        ctx.strokeStyle = '#0af';
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const x = padL + (plotW * i) / Math.max(1, n - 1);
            const y = padT + plotH - (plotH * (data[i] - min)) / range;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Points (если n <= 32 — рисуем точки)
        if (n <= 32) {
            ctx.fillStyle = '#0af';
            for (let i = 0; i < n; i++) {
                const x = padL + (plotW * i) / Math.max(1, n - 1);
                const y = padT + plotH - (plotH * (data[i] - min)) / range;
                ctx.beginPath();
                ctx.arc(x, y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Border
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(padL, padT, plotW, plotH);
    }

    _drawEmpty() {
        const canvas = this.canvas;
        const parent = canvas.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const w = Math.max(100, Math.floor(rect.width));
        const h = Math.max(100, Math.floor(rect.height - 30));
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#555';
        ctx.font = '11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Select a table to view', w / 2, h / 2);
    }

    // Вызывается при показе панели — перерисовать (canvas мог измениться по размеру)
    onShow() {
        if (this.activeData) this._draw();
        else this._drawEmpty();
    }

    // ─────────────────────────── STYLES ───────────────────────────

    _injectStyles() {
        if (document.getElementById('tables-panel-styles')) return;
        const style = document.createElement('style');
        style.id = 'tables-panel-styles';
        style.textContent = `
            .tp-table-item { user-select: none; }
            .tp-table-item:hover { background: #2a2a2a !important; }
            .tp-table-item:active { background: #0af !important; color: white !important; }
            .tp-table-item::-webkit-scrollbar { width: 6px; }
            .tp-table-item::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        `;
        document.head.appendChild(style);
    }
}