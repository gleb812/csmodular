// src/api/libraryStore.js
//
// Абстракция над библиотеками модулей.
// Библиотека = папка с:
//   modules/<Name>.js              — JS-описание (export const NameModule = {...})
//   csound/modules/<Name>.txt      — UDO (Csound-код)
//
// Источники:
//   - builtin: public/libraries/<lib>/  (read-only, вшиты в сборку)
//   - user:    ~/Documents/CsModular/libraries/<lib>/ (Tauri)
//              IndexedDB (web)
//
// По образцу moduleStore: ленивый прокси, без top-level await.

function isTauri() {
    return typeof window !== 'undefined' && (
        '__TAURI_INTERNALS__' in window ||
        '__TAURI__' in window ||
        '__TAURI_IPC__' in window
    );
}

const fallbackStore = {
    async listLibraries() { console.warn('[libraryStore] fallback'); return []; },
    async listModules() { console.warn('[libraryStore] fallback'); return []; },
    async loadModule() { console.warn('[libraryStore] fallback'); return null; },
    async loadUdo() { console.warn('[libraryStore] fallback'); return null; },
    async saveModule() { console.warn('[libraryStore] fallback'); return false; },
    async removeLibrary() { console.warn('[libraryStore] fallback'); return false; },
    async removeModule() { console.warn('[libraryStore] fallback'); return false; },
    invalidateCache() {},
    async createLibrary() { console.warn('[libraryStore] fallback'); return false; },
    async getLibraryMeta(lib) {
        return {
            name: lib, displayName: lib, author: 'unknown',
            version: '0.0.0', description: '',
            geometry: 'square', createdAt: null,
        };
    },
};

class LazyLibraryStore {
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
                    console.log('[libraryStore] Loading Tauri backend...');
                    const { libraryStore } = await import('./libraryStore.tauri.js');
                    this._impl = libraryStore;
                    console.log('[libraryStore] ✅ Tauri backend loaded');
                } else {
                    console.log('[libraryStore] Using web backend');
                    const { libraryStore } = await import('./libraryStore.web.js');
                    this._impl = libraryStore;
                }
            } catch (e) {
                console.error('[libraryStore] ❌ Failed to load backend:', e);
                this._impl = fallbackStore;
            }
            return this._impl;
        })();

        return this._initPromise;
    }

    async listLibraries()                  { return (await this._getImpl()).listLibraries(); }
    async listModules(lib)                 { return (await this._getImpl()).listModules(lib); }
    async loadModule(lib, name)            { return (await this._getImpl()).loadModule(lib, name); }
    async loadUdo(lib, name)               { return (await this._getImpl()).loadUdo(lib, name); }
    async saveModule(lib, name, js, dsp)   { return (await this._getImpl()).saveModule(lib, name, js, dsp); }
    async removeLibrary(lib) { return (await this._getImpl()).removeLibrary(lib); }
    async removeModule(lib, name)          { return (await this._getImpl()).removeModule(lib, name); }
    invalidateCache()                      { this._impl?.invalidateCache?.(); }
    async createLibrary(name, meta)        { return (await this._getImpl()).createLibrary(name, meta); }
    async getLibraryMeta(lib)              { return (await this._getImpl()).getLibraryMeta(lib); }
}

export const libraryStore = new LazyLibraryStore();

// ============================================================
//  ХЕЛПЕРЫ (общие для бэкендов)
// ============================================================

/**
 * Распарсить JS-код модуля в объект описания.
 * Ищет `export const XModule = { ... };` и eval'ит объект.
 *
 * @param {string} code
 * @returns {object|null}
 */
export function parseModuleDefinition(code) {
    if (!code) return null;
    try {
        const match = code.match(/export\s+const\s+(\w+)\s*=\s*({[\s\S]*?});/);
        if (!match) return null;

        const moduleStr = match[2];
        const moduleDef = new Function(`return ${moduleStr}`)();

        if (!moduleDef || !Array.isArray(moduleDef.components)) {
            return null;
        }
        return moduleDef;
    } catch (e) {
        console.error('[libraryStore] parseModuleDefinition failed:', e);
        return null;
    }
}

/**
 * Детект HTML-фоллбэка (Vite SPA отдаёт index.html вместо 404).
 * @param {string} text
 * @returns {boolean}
 */
export function looksLikeHtml(text) {
    if (typeof text !== 'string') return false;
    return /<!DOCTYPE|<html[\s>]/i.test(text.slice(0, 200));
}