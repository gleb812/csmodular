// editor/editor.js
import { EditorApp } from './EditorApp.js';

// Создаём приложение редактора
const canvas = document.getElementById('editorCanvas');
const app = new EditorApp(canvas);
app.init();

// Дебаг
window.editorApp = app;
console.log('📝 Module Editor initialized');