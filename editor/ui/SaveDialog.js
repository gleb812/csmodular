// editor/ui/SaveDialog.js
//
// Двухколоночный диалог сохранения модуля.
// Дизайн — по мотивам LoadDialog / ContextMenu.
// Отличие от Toolbar._showSaveDialog: показывает, что уже есть в библиотеке,
// и предупреждает о перезаписи.
//
// Использование:
//   import { SaveDialog } from './SaveDialog.js';
//   new SaveDialog({ app }).show();

import { libraryStore } from '../../src/api/index.js';
import { getStatusMeta, IS_DEV } from '../../src/api/moduleStatusStore.js';
import { sanitizeName } from '../saveService.js';

export class SaveDialog {
    constructor({ app }) {
        this.app = app;
        this.overlay = null;
        this.dialog = null;
        this.libraryGroups = {};   // { libName: { source, meta, modules: [...] } }
        this.activeLib = null;
        this.existingNames = new Set();  // имена модулей в activeLib (для проверки перезаписи)
        this.newLibMode = false;

        this._injectStyles();
    }

    async show() {
        if (this.overlay) return;

        try {
            await this._refreshLibraryGroups();
        } catch (e) {
            console.error('[SaveDialog] refreshLibraryGroups failed:', e);
            this.app.uiManager?.showNotification?.(`❌ ${e.message}`);
            return;
        }

        this._build();
        this._renderLibraries();

        const curLib = this.app._sourceLibrary || 'user';
        const libNames = Object.keys(this.libraryGroups);
        const initial = libNames.includes(curLib) ? curLib : (libNames[0] || 'user');

        // Если user ещё нет в списке (пустая IDB) — добавим виртуально
        if (!libNames.includes('user')) {
            this.libraryGroups['user'] = { source: 'user', meta: null, modules: [] };
            this._renderLibraries();
        }

        this._selectLibrary(initial);

        // Prefill name
        const defaultName = sanitizeName(this.app.module?.title || 'NewModule') || 'NewModule';
        this.nameInput.value = defaultName;
        this.nameInput.select();

        setTimeout(() => this.nameInput?.focus(), 50);
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.dialog = null;
            this.libraryGroups = {};
            this.existingNames = new Set();
        }
    }

    // ─────────────────────────── DATA ─────────────────────────────

    async _refreshLibraryGroups() {
        const libraries = await libraryStore.listLibraries();
        const groups = {};

        for (const entry of libraries) {
            try {
                const mods = await libraryStore.listModules(entry.name);
                groups[entry.name] = {
                    source: entry.source,
                    meta: entry.meta || null,
                    modules: mods,
                };
            } catch (e) {
                console.warn(`[SaveDialog] listModules(${entry.name}) failed:`, e);
                groups[entry.name] = { source: entry.source, meta: null, modules: [] };
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
            width: 640px; height: 500px;
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
            <span style="color: #0a5; font-weight: bold; font-size: 13px;">💾 Save Module</span>
            <span style="color: #666; font-size: 10px;">Esc to cancel</span>
        `;
        this.dialog.appendChild(header);

        // Name row
        const nameWrap = document.createElement('div');
        nameWrap.style.cssText = `
            padding: 10px 14px;
            background: #222;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
        `;
        const nameLabel = document.createElement('label');
        nameLabel.textContent = 'Module name';
        nameLabel.style.cssText = 'display: block; color: #888; font-size: 10px; margin-bottom: 4px;';
        nameWrap.appendChild(nameLabel);

        this.nameInput = document.createElement('input');
        this.nameInput.type = 'text';
        this.nameInput.style.cssText = `
            width: 100%; padding: 6px 10px;
            background: #1a1a1a; border: 1px solid #444;
            border-radius: 3px; color: white; font-size: 13px;
            font-family: monospace;
            outline: none; box-sizing: border-box;
        `;
        this.nameInput.addEventListener('input', () => this._updateWarning());
        this.nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this._onSave(); }
        });
        nameWrap.appendChild(this.nameInput);

        // Warning
        this.warningEl = document.createElement('div');
        this.warningEl.style.cssText = `
            margin-top: 6px; font-size: 11px; display: none;
        `;
        nameWrap.appendChild(this.warningEl);

        this.dialog.appendChild(nameWrap);

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

        // Right: existing modules in active lib
        const rightPanel = document.createElement('div');
        rightPanel.style.cssText = 'width: 66%; display: flex; flex-direction: column; min-height: 0;';

        const rightHeader = document.createElement('div');
        rightHeader.style.cssText = `
            padding: 6px 12px;
            background: #252525;
            border-bottom: 1px solid #333;
            font-size: 10px; color: #888;
            flex-shrink: 0;
        `;
        rightHeader.textContent = 'Existing modules (click to overwrite)';
        rightPanel.appendChild(rightHeader);

        this.modulesContainer = document.createElement('div');
        this.modulesContainer.style.cssText = `
            flex: 1; overflow-y: auto;
            padding: 4px 0;
            min-height: 0;
        `;
        rightPanel.appendChild(this.modulesContainer);

        body.appendChild(rightPanel);
        this.dialog.appendChild(body);

        // Footer: + New library, Cancel, Save
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 10px 14px;
            background: #222;
            border-top: 1px solid #333;
            display: flex; justify-content: space-between; align-items: center;
            gap: 8px;
            flex-shrink: 0;
        `;

        // New library button + form (inline)
        const newLibWrap = document.createElement('div');
        newLibWrap.style.cssText = 'display: flex; gap: 6px; align-items: center; flex: 1;';

        this.newLibBtn = document.createElement('button');
        this.newLibBtn.textContent = '+ New library';
        this.newLibBtn.style.cssText = `
            padding: 4px 10px; background: #2a2a2a; border: 1px solid #0af;
            color: #0af; border-radius: 3px; cursor: pointer; font-size: 11px;
            white-space: nowrap;
        `;
        this.newLibBtn.onclick = () => this._toggleNewLibForm();
        newLibWrap.appendChild(this.newLibBtn);

        this.newLibForm = document.createElement('div');
        this.newLibForm.style.cssText = 'display: none; gap: 4px; align-items: center; flex: 1;';
        this.newLibNameInput = document.createElement('input');
        this.newLibNameInput.type = 'text';
        this.newLibNameInput.placeholder = 'my-lib';
        this.newLibNameInput.style.cssText = `
            flex: 1; min-width: 80px; padding: 4px 8px;
            background: #0f0f0f; border: 1px solid #444;
            border-radius: 3px; color: white; font-size: 11px;
            font-family: monospace; outline: none;
        `;
        this.newLibNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); this._createNewLibrary(); }
            if (e.key === 'Escape') { e.preventDefault(); this._toggleNewLibForm(false); }
        });

        this.newLibAuthorInput = document.createElement('input');
        this.newLibAuthorInput.type = 'text';
        this.newLibAuthorInput.placeholder = 'author';
        this.newLibAuthorInput.style.cssText = this.newLibNameInput.style.cssText;
        this.newLibAuthorInput.style.flex = '0 0 100px';

        const createBtn = document.createElement('button');
        createBtn.textContent = 'Create';
        createBtn.style.cssText = `
            padding: 4px 10px; background: #0a5; border: none;
            color: #fff; border-radius: 3px; cursor: pointer; font-size: 11px;
            font-weight: bold;
        `;
        createBtn.onclick = () => this._createNewLibrary();

        this.newLibForm.appendChild(this.newLibNameInput);
        this.newLibForm.appendChild(this.newLibAuthorInput);
        this.newLibForm.appendChild(createBtn);
        newLibWrap.appendChild(this.newLibForm);

        footer.appendChild(newLibWrap);

        // Right actions
        const actions = document.createElement('div');
        actions.style.cssText = 'display: flex; gap: 8px; flex-shrink: 0;';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = 'Cancel';
        cancelBtn.style.cssText = `
            padding: 6px 16px; background: #333; border: 1px solid #555;
            border-radius: 4px; color: #aaa; cursor: pointer; font-size: 12px;
        `;
        cancelBtn.onclick = () => this.hide();

        this.saveBtn = document.createElement('button');
        this.saveBtn.textContent = 'Save';
        this.saveBtn.style.cssText = `
            padding: 6px 20px;
            background: linear-gradient(to bottom, #0a5, #083);
            border: 1px solid #0a5; border-radius: 4px; color: #fff;
            cursor: pointer; font-size: 12px; font-weight: bold;
        `;
        this.saveBtn.onclick = () => this._onSave();

        actions.appendChild(cancelBtn);
        actions.appendChild(this.saveBtn);
        footer.appendChild(actions);

        this.dialog.appendChild(footer);

        this.overlay.appendChild(this.dialog);
        document.body.appendChild(this.overlay);

        // Escape
        this._onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); this.hide(); }
        };
        document.addEventListener('keydown', this._onKey);
    }

    // ─────────────────────────── RENDER ───────────────────────────

    _renderLibraries() {
        this.leftPanel.innerHTML = '';
        const libNames = Object.keys(this.libraryGroups).sort((a, b) => {
            const aU = this.libraryGroups[a].source === 'user';
            const bU = this.libraryGroups[b].source === 'user';
            if (aU && !bU) return -1;
            if (!aU && bU) return 1;
            return a.localeCompare(b);
        });

        if (libNames.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 12px; color: #555; font-size: 11px; font-style: italic;';
            empty.textContent = 'No libraries — use + New library below';
            this.leftPanel.appendChild(empty);
            return;
        }

        for (const libName of libNames) {
            const entry = this.libraryGroups[libName];
            const icon = entry.source === 'user' ? '👤' : '📦';
            const isBuiltin = entry.source === 'builtin';

            const item = document.createElement('div');
            item.className = 'sd-lib-item';
            item.dataset.lib = libName;
            item.style.cssText = `
                padding: 6px 12px;
                font-size: 11px; color: ${isBuiltin ? '#666' : '#aaa'};
                cursor: ${isBuiltin ? 'not-allowed' : 'pointer'};
                user-select: none;
                border-left: 2px solid transparent;
                margin: 1px 0;
                display: flex; justify-content: space-between; align-items: center;
                opacity: ${isBuiltin ? 0.5 : 1};
            `;
            const count = entry.modules.length;
            item.innerHTML = `<span>${icon} ${libName}</span><span style="color:#555;font-size:10px;">${count}</span>`;

            if (!isBuiltin) {
                item.onmouseenter = () => {
                    if (libName !== this.activeLib) item.style.background = '#2a2a2a';
                };
                item.onmouseleave = () => {
                    if (libName !== this.activeLib) item.style.background = 'transparent';
                };
                item.onclick = () => this._selectLibrary(libName);
            }

            this.leftPanel.appendChild(item);
        }
    }

    _selectLibrary(libName) {
        const entry = this.libraryGroups[libName];
        if (!entry || entry.source === 'builtin') return;

        this.activeLib = libName;
        this.existingNames = new Set(entry.modules.map(m => m.name));

        // Highlight
        this.leftPanel.querySelectorAll('.sd-lib-item').forEach(el => {
            const isActive = el.dataset.lib === libName;
            el.style.background = isActive ? '#2a2a2a' : 'transparent';
            el.style.borderLeftColor = isActive ? '#0af' : 'transparent';
            if (el.dataset.lib === libName) el.style.color = '#fff';
        });

        this._renderModules(libName);
        this._updateWarning();
    }

    _renderModules(libName) {
        this.modulesContainer.innerHTML = '';
        const entry = this.libraryGroups[libName];
        if (!entry || entry.modules.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding: 20px; text-align: center; color: #666; font-size: 11px; font-style: italic;';
            msg.textContent = 'No modules yet — this will be the first';
            this.modulesContainer.appendChild(msg);
            return;
        }

        const modules = entry.modules.slice().sort((a, b) => a.name.localeCompare(b.name));

        for (const m of modules) {
            const row = document.createElement('div');
            row.className = 'sd-module-row';
            row.dataset.name = m.name;
            row.style.cssText = `
                padding: 5px 12px;
                font-size: 12px; color: #ccc;
                cursor: pointer; user-select: none;
                display: flex; align-items: center; gap: 8px;
                min-height: 24px;
            `;

            const label = document.createElement('span');
            const displayName = m.displayName || m.name;
            label.textContent = displayName;
            if (displayName !== m.name) label.title = m.name;
            label.style.cssText = 'flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

            // Status (DEV only)
            if (IS_DEV && m.status) {
                const meta = getStatusMeta(m.status);
                const dot = document.createElement('span');
                dot.style.cssText = `
                    display: inline-block; width: 8px; height: 8px;
                    border-radius: 50%; background: ${meta.color};
                    flex: 0 0 auto;
                `;
                row.appendChild(dot);
            }

            row.appendChild(label);

            row.onmouseenter = () => { row.style.background = '#2a2a2a'; };
            row.onmouseleave = () => { row.style.background = 'transparent'; };
            row.onclick = () => {
                // Клик по существующему модулю — подставить имя (перезапись)
                this.nameInput.value = m.name;
                this.nameInput.focus();
                this._updateWarning();
            };

            this.modulesContainer.appendChild(row);
        }
    }

    _updateWarning() {
        const raw = this.nameInput.value.trim();
        const name = sanitizeName(raw);

        // Сброс
        this.warningEl.style.display = 'none';
        this.warningEl.textContent = '';
        this.nameInput.style.borderColor = '#444';
        this.modulesContainer.querySelectorAll('.sd-module-row').forEach(el => {
            el.style.background = 'transparent';
            el.style.fontWeight = 'normal';
            el.style.color = '#ccc';
        });

        if (!name) {
            this.warningEl.textContent = 'Name is empty or invalid (a-z, 0-9, _)';
            this.warningEl.style.color = '#ff6b6b';
            this.warningEl.style.display = 'block';
            this.nameInput.style.borderColor = '#ff6b6b';
            this.saveBtn.disabled = true;
            this.saveBtn.style.opacity = '0.5';
            return;
        }

        this.saveBtn.disabled = false;
        this.saveBtn.style.opacity = '1';

        if (this.activeLib && this.existingNames.has(name)) {
            this.warningEl.textContent = `⚠️ "${name}" already exists in "${this.activeLib}" — will be overwritten`;
            this.warningEl.style.color = '#e8c547';
            this.warningEl.style.display = 'block';
            this.nameInput.style.borderColor = '#e8c547';

            // Подсветить строку существующего модуля
            const row = this.modulesContainer.querySelector(`.sd-module-row[data-name="${CSS.escape(name)}"]`);
            if (row) {
                row.style.background = '#3a2f10';
                row.style.fontWeight = 'bold';
                row.style.color = '#e8c547';
            }
        }
    }

    _toggleNewLibForm(forceState = null) {
        const visible = this.newLibForm.style.display !== 'none';
        const next = forceState !== null ? forceState : !visible;
        this.newLibForm.style.display = next ? 'flex' : 'none';
        this.newLibBtn.style.display = next ? 'none' : 'inline-block';
        if (next) {
            setTimeout(() => this.newLibNameInput?.focus(), 20);
        }
    }

    async _createNewLibrary() {
        const raw = this.newLibNameInput.value.trim();
        const lib = raw.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();

        if (!lib) {
            this._showError('Invalid library name (a-z, 0-9, _ -)');
            return;
        }

        if (this.libraryGroups[lib]) {
            this._showError(`Library "${lib}" already exists`);
            return;
        }

        try {
            const ok = await libraryStore.createLibrary(lib, {
                displayName: raw,
                author: this.newLibAuthorInput.value.trim() || 'unknown',
            });
            if (!ok) throw new Error(`createLibrary("${lib}") returned false`);

            // Добавить в локальный список
            this.libraryGroups[lib] = { source: 'user', meta: null, modules: [] };
            this._renderLibraries();
            this._selectLibrary(lib);

            // Сбросить форму
            this.newLibNameInput.value = '';
            this.newLibAuthorInput.value = '';
            this._toggleNewLibForm(false);
        } catch (e) {
            console.error('[SaveDialog] createLibrary error:', e);
            this._showError(e.message || 'Failed to create library');
        }
    }

    _showError(msg) {
        this.warningEl.textContent = `❌ ${msg}`;
        this.warningEl.style.color = '#ff6b6b';
        this.warningEl.style.display = 'block';
    }

    // ─────────────────────────── ACTION ───────────────────────────

    async _onSave() {
        if (this.saveBtn.disabled) return;

        const raw = this.nameInput.value.trim();
        const name = sanitizeName(raw);
        if (!name) {
            this._showError('Invalid module name');
            return;
        }
        if (!this.activeLib) {
            this._showError('No library selected');
            return;
        }

        // Подтверждение перезаписи (если имя существует)
        if (this.existingNames.has(name)) {
            const ok = window.confirm(
                `Module "${name}" already exists in "${this.activeLib}". Overwrite?`
            );
            if (!ok) return;
        }

        try {
            const { saveModule } = await import('../saveService.js');
            const result = await saveModule(this.app, { lib: this.activeLib, name });

            this.hide();
            this.app.uiManager?.showNotification?.(`💾 Saved "${result.name}" → ${result.lib}`);
        } catch (e) {
            console.error('[SaveDialog] save error:', e);
            this._showError(e.message || 'Save failed');
        }
    }

    // ─────────────────────────── STYLES ───────────────────────────

    _injectStyles() {
        if (document.getElementById('save-dialog-styles')) return;
        const style = document.createElement('style');
        style.id = 'save-dialog-styles';
        style.textContent = `
            .sd-lib-item, .sd-module-row { user-select: none; }
            .sd-module-row:hover { background: #2a2a2a !important; }
            .sd-lib-item:hover { background: #2a2a2a !important; }
            .sd-module-row:active {
                background: #0af !important;
                color: white !important;
            }
            .sd-lib-item::-webkit-scrollbar,
            .sd-module-row::-webkit-scrollbar { width: 6px; }
            .sd-lib-item::-webkit-scrollbar-thumb,
            .sd-module-row::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        `;
        document.head.appendChild(style);
    }
}