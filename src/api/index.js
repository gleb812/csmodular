// src/api/index.js
//
// Точка входа для всех API-сервисов.
// Позже здесь можно будет выбирать реализацию в зависимости от платформы:
//
//   import { moduleStore as webModuleStore } from './moduleStore.web.js';
//   import { moduleStore as tauriModuleStore } from './moduleStore.tauri.js';
//
//   export const moduleStore = isTauri() ? tauriModuleStore : webModuleStore;

export { moduleStore } from './moduleStore.js';