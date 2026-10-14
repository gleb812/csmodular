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
window.editorLayout = layout;
console.log('📐 Editor initialized');