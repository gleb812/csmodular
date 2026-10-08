// src/api/moduleStore.js
//
// Единый интерфейс для работы с пользовательскими модулями.
// Реализация подменяется в зависимости от платформы:
//   - web:    IndexedDB / localStorage
//   - tauri:  fs через @tauri-apps/plugin-fs
//   - (позже) electron: ipcRenderer
//
// Все методы возвращают Promise. Ошибки не бросают,
// а возвращают null / пустой массив — чтобы UI не падал.

/**
 * @typedef {Object} UserModule
 * @property {string} name
 * @property {string} code       // JS код модуля
 * @property {string|null} dsp_code  // Csound DSP код (может отсутствовать)
 */

class ModuleStore {
    constructor() {
        this._cache = null; // список имён модулей, кешируется
    }

    /**
     * Список имён пользовательских модулей.
     * @returns {Promise<string[]>}
     */
    async list() {
        // TODO: заменить на реальную реализацию (web: IndexedDB, tauri: fs)
        console.log('[moduleStore] list() — stub, returns []');
        return [];
    }

    /**
     * Загрузить модуль по имени.
     * @param {string} name
     * @returns {Promise<UserModule|null>}
     */
    async load(name) {
        // TODO: заменить на реальную реализацию
        console.log(`[moduleStore] load(${name}) — stub, returns null`);
        return null;
    }

    /**
     * Сохранить модуль.
     * @param {string} name
     * @param {string} code
     * @param {string|null} dspCode
     * @returns {Promise<boolean>}
     */
    async save(name, code, dspCode = null) {
        // TODO: заменить на реальную реализацию
        console.log(`[moduleStore] save(${name}) — stub, returns false`);
        return false;
    }

    /**
     * Удалить модуль.
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async remove(name) {
        // TODO: заменить на реальную реализацию
        console.log(`[moduleStore] remove(${name}) — stub, returns false`);
        return false;
    }

    /**
     * Проверить, является ли модуль пользовательским.
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async isUserModule(name) {
        const names = await this.list();
        return names.includes(name);
    }

    /**
     * Сбросить кеш (например, после сохранения/удаления).
     */
    invalidateCache() {
        this._cache = null;
    }
}

// Singleton
export const moduleStore = new ModuleStore();