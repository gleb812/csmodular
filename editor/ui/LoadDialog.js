// editor/ui/LoadDialog.js
//
// Двухколоночный диалог загрузки модуля в редактор.
// Дизайн — по мотивам ContextMenu (main app), но логика — своя:
// load в редактор, не add в патч.
//
// Использование:
//   import { LoadDialog } from './LoadDialog.js';
//   new LoadDialog({ app }).show();

import { libraryStore } from '../../src/api/index.js';
import { getStatusMeta, IS_DEV } from '../../src/api/moduleStatusStore.js';

export class LoadDialog {
    constructor({ app }) {
        this.app = app;
        this.overlay = null;
        this.dialog = null;
        this.libraryGroups = {};   // { libName: { source, modules: [{ name, displayName, category, status }] } }
        this.activeLib = null;
        this.searchTerm = '';

        this._injectStyles();
    }

    async show() {
        if (this.overlay) return;   // already open

        // Загружаем библиотеки
        try {
            await this._refreshLibraryGroups();
        } catch (e) {
            console.error('[LoadDialog] refreshLibraryGroups failed:', e);
            this.app.uiManager?.showNotification?.(`❌ ${e.message}`);
            return;
        }

        this._build();
        this._renderLibraries();

        // Выбрать первую библиотеку (или текущую)
        const curLib = this.app._sourceLibrary;
        const libNames = Object.keys(this.libraryGroups);
        if (libNames.length === 0) {
            this._renderModules(null);
        } else {
            const initial = libNames.includes(curLib) ? curLib : libNames[0];
            this._selectLibrary(initial);
        }

        // Фокус на поиск
        setTimeout(() => this.searchInput?.focus(), 50);
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.dialog = null;
            this.libraryGroups = {};
        }
    }

    // ─────────────────────────── DATA ─────────────────────────────

    async _refreshLibraryGroups() {
        const libraries = await libraryStore.listLibraries();
        const groups = {};

        for (const entry of libraries) {
            try {
                const mods = await libraryStore.listModules(entry.name);
                if (mods.length > 0) {
                    groups[entry.name] = {
                        source: entry.source,
                        meta: entry.meta || null,
                        modules: mods,
                    };
                }
            } catch (e) {
                console.warn(`[LoadDialog] listModules(${entry.name}) failed:`, e);
            }
        }

        this.libraryGroups = groups;
    }

    // ─────────────────────────── BUILD ────────────────────────────

    _build() {
        // Overlay
        this.overlay = document.createElement('div');
        this.overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0, 0, 0, 0.6);
            z-index: 99999;
            display: flex; align-items: center; justify-content: center;
        `;
        this.overlay.onclick = (e) => {
            if (e.target === this.overlay) this.hide();
        };

        // Dialog
        this.dialog = document.createElement('div');
        this.dialog.style.cssText = `
            width: 640px; height: 480px;
            max-width: 90vw; max-height: 85vh;
            background: #1a1a1a;
            border: 1px solid #0af;
            border-radius: 6px;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.8);
            display: flex; flex-direction: column;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #ccc;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px 14px;
            background: #252525;
            border-bottom: 1px solid #333;
            display: flex; justify-content: space-between; align-items: center;
            flex-shrink: 0;
        `;
        header.innerHTML = `
            <span style="color: #0af; font-weight: bold; font-size: 13px;">📂 Load Module</span>
            <span style="color: #666; font-size: 10px;">Esc to close</span>
        `;
        this.dialog.appendChild(header);

        // Body: two columns
        const body = document.createElement('div');
        body.style.cssText = 'flex: 1; display: flex; min-height: 0;';

        // Left: libraries
        this.leftPanel = document.createElement('div');
        this.leftPanel.style.cssText = `
            width: 34%;
            background: #222;
            border-right: 1px solid #333;
            overflow-y: auto;
            padding: 6px 0;
            min-height: 0;
        `;
        body.appendChild(this.leftPanel);

        // Right: search + modules
        const rightPanel = document.createElement('div');
        rightPanel.style.cssText = 'width: 66%; display: flex; flex-direction: column; min-height: 0;';

        // Search
        const searchWrap = document.createElement('div');
        searchWrap.style.cssText = `
            padding: 8px 12px;
            background: #252525;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
        `;
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Search modules…';
        this.searchInput.style.cssText = `
            width: 100%; padding: 6px 10px;
            background: #1a1a1a; border: 1px solid #444;
            border-radius: 3px; color: white; font-size: 12px;
            outline: none; box-sizing: border-box;
        `;
        this.searchInput.addEventListener('input', () => {
            this.searchTerm = this.searchInput.value;
            this._renderModules(this.activeLib);
        });
        searchWrap.appendChild(this.searchInput);
        rightPanel.appendChild(searchWrap);

        // Modules container
        this.modulesContainer = document.createElement('div');
        this.modulesContainer.style.cssText = `
            flex: 1; overflow-y: auto;
            padding: 4px 0;
            min-height: 0;
        `;
        rightPanel.appendChild(this.modulesContainer);

        body.appendChild(rightPanel);
        this.dialog.appendChild(body);

        this.overlay.appendChild(this.dialog);
        document.body.appendChild(this.overlay);

        // Escape to close
        this._onKey = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.hide();
            }
        };
        document.addEventListener('keydown', this._onKey);
    }

    // ─────────────────────────── RENDER ───────────────────────────

    _renderLibraries() {
        this.leftPanel.innerHTML = '';
        const libNames = Object.keys(this.libraryGroups).sort((a, b) => {
            // user first
            const aU = this.libraryGroups[a].source === 'user';
            const bU = this.libraryGroups[b].source === 'user';
            if (aU && !bU) return -1;
            if (!aU && bU) return 1;
            return a.localeCompare(b);
        });

        if (libNames.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 12px; color: #555; font-size: 11px; font-style: italic;';
            empty.textContent = 'No libraries';
            this.leftPanel.appendChild(empty);
            return;
        }

        for (const libName of libNames) {
            const entry = this.libraryGroups[libName];
            const icon = entry.source === 'user' ? '👤' : '📦';

            const item = document.createElement('div');
            item.className = 'ld-lib-item';
            item.dataset.lib = libName;
            item.style.cssText = `
                padding: 6px 12px;
                font-size: 11px; color: #aaa;
                cursor: pointer; user-select: none;
                border-left: 2px solid transparent;
                margin: 1px 0;
                display: flex; justify-content: space-between; align-items: center;
            `;
            item.innerHTML = `<span>${icon} ${libName}</span><span style="color:#555;font-size:10px;">${entry.modules.length}</span>`;

            item.onmouseenter = () => {
                if (libName !== this.activeLib) item.style.background = '#2a2a2a';
            };
            item.onmouseleave = () => {
                if (libName !== this.activeLib) item.style.background = 'transparent';
            };
            item.onclick = () => this._selectLibrary(libName);

            this.leftPanel.appendChild(item);
        }
    }

    _selectLibrary(libName) {
        this.activeLib = libName;

        // Highlight
        this.leftPanel.querySelectorAll('.ld-lib-item').forEach(el => {
            const isActive = el.dataset.lib === libName;
            el.style.background = isActive ? '#2a2a2a' : 'transparent';
            el.style.borderLeftColor = isActive ? '#0af' : 'transparent';
            el.style.color = isActive ? '#fff' : '#aaa';
        });

        this._renderModules(libName);
    }

    _renderModules(libName) {
        this.modulesContainer.innerHTML = '';
        if (!libName) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding: 20px; text-align: center; color: #666; font-size: 11px; font-style: italic;';
            msg.textContent = 'No library selected';
            this.modulesContainer.appendChild(msg);
            return;
        }

        const entry = this.libraryGroups[libName];
        const modules = entry?.modules || [];
        const term = this.searchTerm.toLowerCase().trim();

        const filtered = term
            ? modules.filter(m =>
                m.name.toLowerCase().includes(term) ||
                (m.displayName || '').toLowerCase().includes(term))
            : modules;

        if (filtered.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding: 20px; text-align: center; color: #666; font-size: 11px; font-style: italic;';
            msg.textContent = term ? `No modules matching "${this.searchTerm}"` : 'No modules';
            this.modulesContainer.appendChild(msg);
            return;
        }

        for (const m of filtered) {
            this.modulesContainer.appendChild(this._createModuleRow(m, libName));
        }
    }

    _createModuleRow(m, libName) {
        const displayName = m.displayName || m.name;
        const isUser = this.libraryGroups[libName]?.source === 'user';

        const row = document.createElement('div');
        row.className = 'ld-module-row';
        row.style.cssText = `
            padding: 6px 12px;
            font-size: 12px; color: #ccc;
            cursor: pointer; user-select: none;
            display: flex; align-items: center; gap: 8px;
            min-height: 26px;
        `;

        const label = document.createElement('span');
        label.textContent = isUser ? '★ ' + displayName : displayName;
        if (displayName !== m.name) label.title = m.name;
        label.style.cssText = 'flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        row.appendChild(label);

        // Category (subtle)
        if (m.category && m.category !== 'custom') {
            const cat = document.createElement('span');
            cat.textContent = m.category;
            cat.style.cssText = 'font-size: 9px; color: #555; font-style: italic; flex-shrink: 0;';
            row.appendChild(cat);
        }

        // Status dot (только в DEV — в BUILD точки не показываем, см. AI Context)
        if (IS_DEV && m.status) {
            const meta = getStatusMeta(m.status);
            const dot = document.createElement('span');
            dot.title = `${m.name} — ${meta.label}`;
            dot.style.cssText = `
                display: inline-block; width: 8px; height: 8px;
                border-radius: 50%; background: ${meta.color};
                flex: 0 0 auto;
                box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
            `;
            row.appendChild(dot);
        }

        row.onmouseenter = () => { row.style.background = '#2a2a2a'; };
        row.onmouseleave = () => { row.style.background = 'transparent'; };
        row.onclick = () => this._loadModule(libName, m.name);

        return row;
    }

    // ─────────────────────────── ACTION ───────────────────────────

    async _loadModule(lib, name) {
        try {
            const data = await libraryStore.loadModule(lib, name);
            if (!data) throw new Error(`Module "${lib}/${name}" not found`);

            this.app.restoreModuleFromData(data.description, data.dspCode);
            this.app._sourceLibrary = lib;

            this.hide();
            this.app.uiManager?.showNotification?.(`📂 Loaded "${name}" from ${lib}`);
        } catch (e) {
            console.error('[LoadDialog] loadModule error:', e);
            this.app.uiManager?.showNotification?.(`❌ ${e.message}`);
        }
    }

    // ─────────────────────────── STYLES ───────────────────────────

    _injectStyles() {
        if (document.getElementById('load-dialog-styles')) return;
        const style = document.createElement('style');
        style.id = 'load-dialog-styles';
        style.textContent = `
            #load-dialog-styles,
            .ld-lib-item, .ld-module-row { user-select: none; }

            .ld-module-row:hover { background: #2a2a2a !important; }
            .ld-lib-item:hover { background: #2a2a2a !important; }

            .ld-module-row:active {
                background: #0af !important;
                color: white !important;
            }

            .ld-lib-item::-webkit-scrollbar,
            .ld-module-row::-webkit-scrollbar,
            .ld-modules-container::-webkit-scrollbar { width: 6px; }

            .ld-lib-item::-webkit-scrollbar-thumb,
            .ld-module-row::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        `;
        document.head.appendChild(style);
    }
}