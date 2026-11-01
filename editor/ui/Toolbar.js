// editor/ui/Toolbar.js
//
// Верхняя панель инструментов.
//
// Кнопки: New / Load / Save + пресеты layout.
//
// API:
//   const tb = new Toolbar({ app, layout });
//   layout.mount('toolbar', tb.element);

export class Toolbar {
    constructor(opts = {}) {
        this.app = opts.app;
        this.layout = opts.layout;

        this._build();
    }

    _build() {
        this.element = document.createElement('div');
        this.element.id = 'editor-toolbar';
        this.element.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            height: 100%;
            box-sizing: border-box;
            background: #1e1e1e;
            user-select: none;
        `;

        // ── Логотип / название ──
        const title = document.createElement('div');
        title.style.cssText = `
            color: #0af;
            font-weight: bold;
            font-size: 12px;
            margin-right: 12px;
            letter-spacing: 0.5px;
        `;
        title.textContent = '📐 Module Editor';
        this.element.appendChild(title);

        // ── Основные кнопки ──
        this.element.appendChild(this._btn('🆕 New', () => this._onNew()));
        this.element.appendChild(this._btn('📂 Load', () => this._onLoad()));
        this.element.appendChild(this._btn('💾 Save', () => this._onSave(), 'primary'));

        // Разделитель
        this.element.appendChild(this._divider());

        // ── Пресеты layout ──
        const layoutLabel = document.createElement('span');
        layoutLabel.style.cssText = 'color: #666; font-size: 10px; margin-right: 4px;';
        layoutLabel.textContent = 'Layout:';
        this.element.appendChild(layoutLabel);

        this.element.appendChild(this._btn('Default', () => this.layout.setPreset('default')));
        this.element.appendChild(this._btn('Code', () => this.layout.setPreset('code-focus')));
        this.element.appendChild(this._btn('Canvas', () => this.layout.setPreset('canvas-focus')));
    }

    _btn(text, onClick, variant = 'default') {
        const b = document.createElement('button');
        b.textContent = text;
        const base = `
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: Arial, sans-serif;
            transition: all 0.15s;
            border: 1px solid #444;
            background: #2a2a2a;
            color: #ccc;
        `;
        const primary = `
            background: linear-gradient(to bottom, #0a5, #083);
            border-color: #0a5;
            color: #fff;
            font-weight: bold;
        `;
        b.style.cssText = base + (variant === 'primary' ? primary : '');
        b.onmouseenter = () => { if (variant !== 'primary') b.style.background = '#333'; };
        b.onmouseleave = () => { if (variant !== 'primary') b.style.background = '#2a2a2a'; };
        b.onclick = onClick;
        return b;
    }

    _divider() {
        const d = document.createElement('div');
        d.style.cssText = `
            width: 1px;
            height: 20px;
            background: #333;
            margin: 0 6px;
        `;
        return d;
    }

    // ─────────────────────────── ACTIONS ────────────────────────────

    _onNew() {
        if (!confirm('Clear current module?')) return;
        this.app.clearModule({ title: 'NewModule', resetColor: true });
        this.app.uiManager.showNotification('🆕 New module');
    }

    async _onLoad() {
        const { libraryStore } = await import('../../src/api/index.js');

        try {
            const libs = await libraryStore.listLibraries();
            const all = [];

            for (const entry of libs) {
                try {
                    const mods = await libraryStore.listModules(entry.name);
                    for (const m of mods) {
                        all.push({
                            lib: entry.name,
                            name: m.name,
                            displayName: m.description?.displayName || m.name,
                            source: entry.source,
                        });
                    }
                } catch (e) {
                    console.warn(`[Toolbar] listModules(${entry.name}) failed:`, e);
                }
            }

            if (all.length === 0) {
                this.app.uiManager.showNotification('📭 No modules found');
                return;
            }

            all.sort((a, b) => {
                if (a.source !== b.source) return a.source === 'user' ? -1 : 1;
                if (a.lib !== b.lib) return a.lib.localeCompare(b.lib);
                return a.displayName.localeCompare(b.displayName);
            });

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                z-index: 10000;
                min-width: 320px;
                max-width: 480px;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.8);
            `;

            dialog.innerHTML = `
                <div style="color: #0af; font-weight: bold; font-size: 14px; margin-bottom: 12px;">📂 Load Module</div>
                <div style="margin-bottom: 12px; max-height: 400px; overflow-y: auto;">
                    ${all.map(({ lib, name, displayName, source }) => {
                        const icon = source === 'user' ? '👤' : '📦';
                        const label = displayName !== name
                            ? `${displayName} <span style="color:#666;font-size:10px;">(${name})</span>`
                            : displayName;
                        return `<button data-lib="${lib}" data-name="${name}" style="
                            width: 100%;
                            padding: 8px 12px;
                            margin-bottom: 4px;
                            background: #1a1a1a;
                            border: 1px solid #333;
                            border-radius: 4px;
                            color: #ccc;
                            cursor: pointer;
                            text-align: left;
                            font-size: 12px;
                        ">${icon} <span style="color:#0af;font-size:10px;">[${lib}]</span> ${label}</button>`;
                    }).join('')}
                </div>
                <button id="close-dialog-btn" style="
                    padding: 6px 20px;
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 4px;
                    color: #aaa;
                    cursor: pointer;
                    font-size: 12px;
                ">Cancel</button>
            `;

            document.body.appendChild(dialog);

            dialog.querySelectorAll('[data-name]').forEach(btn => {
                btn.onclick = async () => {
                    const lib = btn.dataset.lib;
                    const name = btn.dataset.name;
                    dialog.remove();
                    overlay.remove();
                    await this._loadModuleFrom(lib, name);
                };
            });

            dialog.querySelector('#close-dialog-btn').onclick = () => {
                dialog.remove();
                overlay.remove();
            };

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
            `;
            overlay.onclick = () => { dialog.remove(); overlay.remove(); };
            document.body.insertBefore(overlay, dialog);

        } catch (e) {
            console.error('[Toolbar] Load error:', e);
            this.app.uiManager.showNotification(`❌ ${e.message}`);
        }
    }

    async _loadModuleFrom(lib, name) {
        const { libraryStore } = await import('../../src/api/index.js');
        try {
            const data = await libraryStore.loadModule(lib, name);
            if (!data) throw new Error(`Module "${lib}/${name}" not found`);

            this.app.restoreModuleFromData(data.description, data.dspCode);
            this.app._sourceLibrary = lib;
            this.app.uiManager.showNotification(`📂 Loaded "${name}" from ${lib}`);
        } catch (e) {
            console.error('[Toolbar] loadModule error:', e);
            this.app.uiManager.showNotification(`❌ ${e.message}`);
        }
    }

    async _onSave() {
        if (this.app.propertiesWindow) {
            await this.app.propertiesWindow.saveModule();
        } else {
            console.warn('[Toolbar] propertiesWindow not available');
        }
    }
}