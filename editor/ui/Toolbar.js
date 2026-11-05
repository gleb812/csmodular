// editor/ui/Toolbar.js
//
// Верхняя панель инструментов.
// Кнопки: New / Load / Save + пресеты layout.
//
// API:
//   const tb = new Toolbar({ app, layout });
//   layout.mount('toolbar', tb.element);

import { saveModule } from '../saveService.js';
import { getStatusMeta } from '../../src/api/moduleStatusStore.js';

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

        this.element.appendChild(this._btn('🆕 New', () => this._onNew()));
        this.element.appendChild(this._btn('📂 Load', () => this._onLoad()));
        this.element.appendChild(this._btn('💾 Save', () => this._onSave(), 'primary'));

        this.element.appendChild(this._divider());

        this.element.appendChild(this._btn('⬇ Export', () => this._onExport(), 'default',
            'Download .js + .txt (for release / sharing)'));
        this.element.appendChild(this._btn('⬆ Import', () => this._onImport(), 'default',
            'Import .js + .txt into user library'));

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

    async _onImport() {
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

        let jsCode = null, dspCode = null, name = null;

        if (isTauri) {
            const { open } = await import('@tauri-apps/plugin-dialog');
            const { readTextFile } = await import('@tauri-apps/plugin-fs');

            const selected = await open({
                multiple: true,
                filters: [{ name: 'Module', extensions: ['js', 'txt'] }],
            });
            if (!selected || selected.length === 0) return;

            for (const path of selected) {
                const text = await readTextFile(path);
                if (path.endsWith('.js')) {
                    jsCode = text;
                    name = path.split(/[/\\]/).pop().replace(/\.js$/, '');
                } else if (path.endsWith('.txt')) {
                    dspCode = text;
                }
            }
        } else {
            // Web: input[type=file]
            // ... (старый код с input.click() и f.text()) ...
            // Для краткости пропускаю, он у тебя уже есть
            return; 
        }

        if (!jsCode) {
            this.app.uiManager.showNotification('❌ Need .js file');
            return;
        }
        const { sanitizeName } = await import('../saveService.js');
        const safeName = sanitizeName(name || 'Imported');
        const { libraryStore } = await import('../../src/api/index.js');
        const ok = await libraryStore.saveModule('user', safeName, jsCode, dspCode);
        if (ok) this.app.uiManager.showNotification(`✅ Imported "${safeName}" → user`);
    }

    async _onExport() {
        if (!this.app.module) return;

        const { generateJsCode, sanitizeName } = await import('../saveService.js');
        const { serializeComponents, collectParamIds, collectPorts } = await import('../ComponentRegistry.js');

        const name = sanitizeName(this.app.module.title || 'MyMod');
        const module = this.app.module;

        // ⭐ Собираем moduleData — как в saveService.saveModule
        const moduleData = {
            name,
            displayName: name,
            category: module.category || 'custom',
            status: module.status || 'dev',
            gridHeight: module.gridHeight || 3,
            type: name,
            defaultParams: [],
            tooltip: name,
            params: collectParamIds(this.app.components),
            inputs: collectPorts(this.app.components).inputs,
            outputs: collectPorts(this.app.components).outputs,
            customColor: module.customColor || null,
            components: serializeComponents(this.app.components),
        };

        const jsCode = generateJsCode(moduleData);
        const dspCode = this.app.codeViewerWindow?.getCode() || '';

        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

        if (isTauri) {
            // ⭐ Tauri: нативные диалоги
            const { save } = await import('@tauri-apps/plugin-dialog');
            const { writeTextFile } = await import('@tauri-apps/plugin-fs');

            // Сохраняем .js
            const jsPath = await save({
                defaultPath: `${name}.js`,
                filters: [{ name: 'JavaScript', extensions: ['js'] }],
            });
            if (!jsPath) return; // пользователь отменил
            await writeTextFile(jsPath, jsCode);

            // Сохраняем .txt
            const txtPath = await save({
                defaultPath: `${name}.txt`,
                filters: [{ name: 'Text', extensions: ['txt'] }],
            });
            if (txtPath) await writeTextFile(txtPath, dspCode);

            this.app.uiManager.showNotification(`⬇ Exported ${name}.js + ${name}.txt`);
        } else {
            // Web: Blob download
            this._download(`${name}.js`, jsCode, 'application/javascript');
            this._download(`${name}.txt`, dspCode, 'text/plain');
            this.app.uiManager.showNotification(`⬇ Exported ${name}.js + ${name}.txt`);
        }
    }

    _download(filename, content, mime) {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }


    _onNew() {
        if (!confirm('Clear current module?')) return;
        this.app.clearModule({ title: 'NewModule', resetColor: true });
        this.app.uiManager.showNotification('🆕 New module');
    }

    async _onLoad() {
        const { LoadDialog } = await import('./LoadDialog.js');
        const dialog = new LoadDialog({ app: this.app });
        await dialog.show();
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
        const { SaveDialog } = await import('./SaveDialog.js');
        const dialog = new SaveDialog({ app: this.app });
        await dialog.show();
    }
}