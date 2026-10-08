// editor/editor.js
import { EditorApp } from './EditorApp.js';

// Создаём приложение редактора
// ⚠️ EditorApp сам делает всю инициализацию в конструкторе:
//    setupCanvas, uiManager, createDefaultModule, animate, setupEvents
const canvas = document.getElementById('editorCanvas');
const app = new EditorApp(canvas);

// Дебаг
window.editorApp = app;
console.log('📝 Module Editor initialized');