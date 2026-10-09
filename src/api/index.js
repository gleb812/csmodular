// src/api/index.js
//
// Выбирает реализацию moduleStore в зависимости от платформы.
// ВАЖНО: без top-level await, чтобы не блокировать импорты.

import { moduleStore as webModuleStore } from './moduleStore.web.js';

function isTauri() {
    return typeof window !== 'undefined' && (
        '__TAURI_INTERNALS__' in window ||
        '__TAURI__' in window ||
        '__TAURI_IPC__' in window
    );
}

// Заглушка на случай, если Tauri-реализация не загрузится
const fallbackStore = {
    async list() { console.warn('[moduleStore] fallback list()'); return []; },
    async load() { console.warn('[moduleStore] fallback load()'); return null; },
    async save() { console.warn('[moduleStore] fallback save()'); return false; },
    async remove() { console.warn('[moduleStore] fallback remove()'); return false; },
    async isUserModule() { return false; },
    invalidateCache() {},
};

// Создаём прокси-объект, который сам подгрузит реализацию при первом вызове
class LazyModuleStore {
    constructor() {
        this._impl = null;
        this._initPromise = null;
    }

    async _getImpl() {
        if (this._impl) return this._impl;
        if (this._initPromise) return this._initPromise;

        this._initPromise = (async () => {
            try {
                if (isTauri()) {
                    console.log('[api] Loading Tauri moduleStore...');
                    const { moduleStore } = await import('./moduleStore.tauri.js');
                    console.log('[api] ✅ Tauri moduleStore loaded');
                    this._impl = moduleStore;
                } else {
                    console.log('[api] Using web moduleStore');
                    this._impl = webModuleStore;
                }
            } catch (error) {
                console.error('[api] ❌ Failed to load moduleStore:', error);
                this._impl = fallbackStore;
            }
            return this._impl;
        })();

        return this._initPromise;
    }

    async list() { return (await this._getImpl()).list(); }
    async load(name) { return (await this._getImpl()).load(name); }
    async save(name, code, dsp) { return (await this._getImpl()).save(name, code, dsp); }
    async remove(name) { return (await this._getImpl()).remove(name); }
    async isUserModule(name) { return (await this._getImpl()).isUserModule(name); }
    invalidateCache() { this._impl?.invalidateCache?.(); }
}

export const moduleStore = new LazyModuleStore();