// editor/editor.js
import { DockLayout } from './ui/DockLayout.js';
import { Toolbar } from './ui/Toolbar.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';
import { EditorApp } from './EditorApp.js';

const root = document.getElementById('app');
const layout = new DockLayout({ root });

// Canvas + App
const canvas = document.createElement('canvas');
canvas.id = 'editorCanvas';
const app = new EditorApp(canvas);

// Toolbar
const toolbar = new Toolbar({ app, layout });
layout.mount('toolbar', toolbar.element);

// Canvas
layout.mount('leftTop', canvas);
app.setupCanvas();

// Code Viewer → правый верх
if (app.codeViewerWindow) {
    layout.mount('rightTop', app.codeViewerWindow.windowElement);
    app.codeViewerWindow.show();
}

// Properties Panel → левый низ
const propertiesPanel = new PropertiesPanel(app);
app.propertiesPanel = propertiesPanel;
layout.mount('leftBottom', propertiesPanel.element);

// Terminal → правый низ
import { TerminalPanel } from './ui/TerminalPanel.js';

const terminal = new TerminalPanel(app);
app.terminalPanel = terminal;
layout.mount('rightBottom', terminal.element);

window.editorApp = app;

// ⭐ Открытие модуля по ?module=<copyName>&source=<baseName>&lib=<srcLib>
//    Файл копии НЕ существует — он будет создан только при Save.
(async () => {
    const params = new URLSearchParams(window.location.search);
    const copyName  = params.get('module');
    const sourceName = params.get('source') || copyName;
    const srcLib    = params.get('lib') || 'user';
    if (!copyName) return;

    try {
        const { libraryStore } = await import('../src/api/index.js');
        const data = await libraryStore.loadModule(srcLib, sourceName);
        if (!data) {
            console.warn(`[editor] source "${srcLib}/${sourceName}" not found`);
            return;
        }

        // ⭐ Переименовать в памяти: type / displayName / originalName
        const desc = {
            ...(data.description || {}),
            type: copyName,
            displayName: copyName,
            originalName: sourceName,
        };

        app.restoreModuleFromData(desc, data.dspCode || '');
        app._sourceLibrary = srcLib;       // для SaveDialog: куда сохранять по умолчанию
        app._isDraft = true;               // помечаем «файла ещё нет»
        console.log(`📂 Draft "${copyName}" loaded from "${srcLib}/${sourceName}" (not saved)`);
    } catch (e) {
        console.error('[editor] failed to load draft:', e);
    }
})();

window.editorLayout = layout;
console.log('📐 Editor initialized');