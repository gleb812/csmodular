// src/api/libraryStore.web.js
//
// Web-бэкенд libraryStore:
//   - builtin: fetch из /libraries/ (список — /libraries/_index.json)
//   - user:    IndexedDB (база csmodular, store libraries, ключ "<lib>/<Name>.<js|txt>")

import { parseModuleDefinition, looksLikeHtml } from './libraryStore.js';

const BUILTIN_INDEX_URL = '/libraries/_index.json';
const DB_NAME = 'csmodular';
const DB_VERSION = 1;
const STORE = 'libraries';

class WebLibraryStore {
    constructor() {
        this._dbPromise = null;
        this._builtinCache = null;   // { name -> { modules: [...], _loaded } }
        this._moduleCache = new Map(); // "lib/Name" -> { description, dspCode }
    }

    // ---------- IndexedDB ----------

    _openDb() {
        if (this._dbPromise) return this._dbPromise;

        this._dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });

        return this._dbPromise;
    }

    async _idbGet(key) {
        const db = await this._openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    }

    async _idbSet(key, value) {
        const db = await this._openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put(value, key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async _idbDelete(key) {
        const db = await this._openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete(key);
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => reject(tx.error);
        });
    }

    async _idbKeys() {
        const db = await this._openDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const req = tx.objectStore(STORE).getAllKeys();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    // ---------- Список библиотек ----------

    async listLibraries() {
        const result = [];
        const seen = new Set();

        // 1. Builtin — из _index.json
        try {
            const res = await fetch(BUILTIN_INDEX_URL, { cache: 'no-cache' });
            if (res.ok) {
                const text = await res.text();
                if (!looksLikeHtml(text)) {
                    const data = JSON.parse(text);
                    const names = Array.isArray(data?.libraries) ? data.libraries : [];
                    for (const name of names) {
                        if (!seen.has(name)) {
                            seen.add(name);
                            result.push({ name, source: 'builtin' });
                        }
                    }
                } else {
                    console.warn('[libraryStore/web] _index.json → HTML fallback, no builtin libs');
                }
            } else {
                console.warn('[libraryStore/web] _index.json not found (status', res.status, ')');
            }
        } catch (e) {
            console.warn('[libraryStore/web] listLibraries builtin failed:', e);
        }

        // 2. User — из IndexedDB (уникальные имена библиотек)
        try {
            const keys = await this._idbKeys();
            for (const key of keys) {
                const lib = String(key).split('/')[0];
                if (lib && !seen.has(lib)) {
                    seen.add(lib);
                    result.push({ name: lib, source: 'user' });
                }
            }
        } catch (e) {
            console.warn('[libraryStore/web] listLibraries user failed:', e);
        }

        return result;
    }

    // ---------- Список модулей библиотеки ----------

    async listModules(lib) {
        const names = new Set();

        // 1. Builtin: <lib>/modules/<Name>.js
        //    В web нельзя прочитать папку — нужен манифест внутри библиотеки.
        //    Пробуем _index.json внутри библиотеки, иначе fallback: не знаем.
        try {
            const url = `/libraries/${lib}/_index.json`;
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) {
                const text = await res.text();
                if (!looksLikeHtml(text)) {
                    const data = JSON.parse(text);
                    const mods = Array.isArray(data?.modules) ? data.modules : [];
                    mods.forEach(m => names.add(m));
                }
            }
        } catch (e) {
            // нет _index.json — нормально для user-библиотек
        }

        // 2. User: ключи из IndexedDB "<lib>/<Name>.js"
        try {
            const keys = await this._idbKeys();
            for (const key of keys) {
                const s = String(key);
                const prefix = lib + '/';
                if (!s.startsWith(prefix)) continue;
                const rest = s.slice(prefix.length);
                const m = rest.match(/^([^/]+)\.js$/);
                if (m) names.add(m[1]);
            }
        } catch (e) {
            console.warn('[libraryStore/web] listModules user failed:', e);
        }

        // Загружаем описания (чтобы вернуть [{ name, description }])
        const result = [];
        for (const name of [...names].sort()) {
            const loaded = await this.loadModule(lib, name);
            if (loaded?.description) {
                result.push({ name, description: loaded.description });
            }
        }
        return result;
    }

    // ---------- Загрузка модуля ----------

    async loadModule(lib, name) {
        const cacheKey = `${lib}/${name}`;
        if (this._moduleCache.has(cacheKey)) {
            return this._moduleCache.get(cacheKey);
        }

        let jsCode = null;
        let dspCode = null;

        // 1. User: IndexedDB
        try {
            jsCode = await this._idbGet(`${lib}/${name}.js`);
            dspCode = await this._idbGet(`${lib}/${name}.txt`);
        } catch (e) {
            // ignore
        }

        // 2. Builtin: fetch
        if (jsCode === null) {
            jsCode = await this._fetchText(`/libraries/${lib}/modules/${name}.js`);
        }
        if (dspCode === null) {
            dspCode = await this._fetchText(`/libraries/${lib}/modules/${name}.txt`);
        }

        if (jsCode === null) {
            console.warn(`[libraryStore/web] loadModule("${lib}/${name}") → JS not found`);
            return null;
        }

        const description = parseModuleDefinition(jsCode);
        if (!description) {
            console.warn(`[libraryStore/web] loadModule("${lib}/${name}") → parse failed`);
            return null;
        }

        const result = { description, dspCode };
        this._moduleCache.set(cacheKey, result);
        return result;
    }

    // ---------- Загрузка UDO ----------

    async loadUdo(lib, name) {
        // User: IndexedDB
        try {
            const fromDb = await this._idbGet(`${lib}/${name}.txt`);
            if (fromDb !== null) return fromDb;
        } catch (e) {
            // ignore
        }

        // Builtin: fetch
        return this._fetchText(`/libraries/${lib}/modules/${name}.txt`);
    }

    // ---------- Сохранение / удаление (только user) ----------

    async saveModule(lib, name, jsCode, dspCode = null) {
        try {
            await this._idbSet(`${lib}/${name}.js`, jsCode);
            if (dspCode !== null && dspCode !== undefined) {
                await this._idbSet(`${lib}/${name}.txt`, dspCode);
            }
            this._moduleCache.delete(`${lib}/${name}`);
            return true;
        } catch (e) {
            console.warn(`[libraryStore/web] saveModule("${lib}/${name}") failed:`, e);
            return false;
        }
    }

    async removeModule(lib, name) {
        try {
            await this._idbDelete(`${lib}/${name}.js`);
            await this._idbDelete(`${lib}/${name}.txt`);
            this._moduleCache.delete(`${lib}/${name}`);
            return true;
        } catch (e) {
            console.warn(`[libraryStore/web] removeModule("${lib}/${name}") failed:`, e);
            return false;
        }
    }

    invalidateCache() {
        this._moduleCache.clear();
    }

    // ---------- Утилиты ----------

    async _fetchText(url) {
        try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res.ok) {
                console.warn(`[libraryStore/web] ${url} → HTTP ${res.status}`);
                return null;
            }
            const text = await res.text();
            if (looksLikeHtml(text)) {
                console.warn(`[libraryStore/web] ${url} → HTML fallback (file missing)`);
                return null;
            }
            return text;
        } catch (e) {
            console.warn(`[libraryStore/web] ${url} → fetch error`, e);
            return null;
        }
    }
}

export const libraryStore = new WebLibraryStore();