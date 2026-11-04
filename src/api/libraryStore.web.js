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

        // 1. Builtin
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
                }
            }
        } catch (e) {
            console.warn('[libraryStore/web] listLibraries builtin failed:', e);
        }

        // 2. User
        try {
            const keys = await this._idbKeys();
            for (const key of keys) {
                const s = String(key);
                const lib = s.split('/')[0];
                if (lib && lib !== '_meta' && !seen.has(lib)) {
                    seen.add(lib);
                    result.push({ name: lib, source: 'user' });
                }
            }
        } catch (e) {
            console.warn('[libraryStore/web] listLibraries user failed:', e);
        }

        // 3. ⭐ Подтянуть meta для каждой
        for (const entry of result) {
            try {
                entry.meta = await this.getLibraryMeta(entry.name);
            } catch {
                entry.meta = { name: entry.name, displayName: entry.name, author: 'unknown',
                               version: '0.0.0', description: '', geometry: 'square', createdAt: null };
            }
        }

        return result;
    }

    // ---------- Список модулей библиотеки ----------

    async listModules(lib) {
        const result = new Map();  // name -> { name, displayName, category, status }

        // 1. Builtin: <lib>/_index.json
        try {
            const res = await fetch(`/libraries/${lib}/_index.json`, { cache: 'no-cache' });
            if (res.ok) {
                const text = await res.text();
                if (!looksLikeHtml(text)) {
                    const data = JSON.parse(text);
                    const mods = Array.isArray(data?.modules) ? data.modules : [];
                    for (const m of mods) {
                        if (typeof m === 'string') {
                            result.set(m, { name: m, displayName: m, category: 'custom', status: 'dev' });
                        } else if (m && m.name) {
                            result.set(m.name, {
                                name: m.name,
                                displayName: m.displayName || m.name,
                                category: m.category || 'custom',
                                status: m.status || 'dev',
                            });
                        }
                    }
                }
            }
        } catch { /* ignore */ }

        // 2. User: _index.json из IDB, fallback — по ключам
        try {
            const raw = await this._idbGet(`${lib}/_index.json`);
            if (raw) {
                const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
                const mods = Array.isArray(data?.modules) ? data.modules : [];
                for (const m of mods) {
                    if (typeof m === 'string') {
                        result.set(m, { name: m, displayName: m, category: 'custom', status: 'dev' });
                    } else if (m && m.name) {
                        result.set(m.name, {
                            name: m.name,
                            displayName: m.displayName || m.name,
                            category: m.category || 'custom',
                            status: m.status || 'dev',
                        });
                    }
                }
            }
        } catch (e) {
            console.warn('[libraryStore/web] listModules user _index failed:', e);
        }

        // 2b. Fallback: без _index.json — по ключам IDB (для user)
        try {
            const keys = await this._idbKeys();
            const prefix = lib + '/';
            for (const key of keys) {
                const s = String(key);
                if (!s.startsWith(prefix)) continue;
                const rest = s.slice(prefix.length);
                const m = rest.match(/^([^/]+)\.js$/);
                if (m && !result.has(m[1])) {
                    result.set(m[1], {
                        name: m[1], displayName: m[1], category: 'custom', status: 'dev',
                    });
                }
            }
        } catch { /* ignore */ }

        return [...result.values()].sort((a, b) => a.name.localeCompare(b.name));
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

    // ---------- Сохранение / удаление  ----------

    async saveModule(lib, name, jsCode, dspCode = null) {
        try {
            await this._idbSet(`${lib}/${name}.js`, jsCode);
            if (dspCode !== null && dspCode !== undefined) {
                await this._idbSet(`${lib}/${name}.txt`, dspCode);
            }
            this._moduleCache.delete(`${lib}/${name}`);

            // ⭐ Обновить _index.json библиотеки
            await this._updateIndex(lib, name, jsCode);
            return true;
        } catch (e) {
            console.warn(`[libraryStore/web] saveModule("${lib}/${name}") failed:`, e);
            return false;
        }
    }

    async removeLibrary(lib) {
        const name = String(lib || '').trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            console.warn(`[libraryStore/web] removeLibrary: invalid name "${name}"`);
            return false;
        }
        // builtin — read-only
        try {
            const res = await fetch(BUILTIN_INDEX_URL, { cache: 'no-cache' });
            if (res.ok) {
                const text = await res.text();
                if (!looksLikeHtml(text)) {
                    const data = JSON.parse(text);
                    const names = Array.isArray(data?.libraries) ? data.libraries : [];
                    if (names.includes(name)) {
                        console.warn(`[libraryStore/web] removeLibrary: "${name}" is builtin (read-only)`);
                        return false;
                    }
                }
            }
        } catch { /* ignore */ }

        try {
            // Удалить все ключи `<lib>/*`
            const keys = await this._idbKeys();
            const prefix = name + '/';
            let deleted = 0;
            for (const key of keys) {
                if (String(key).startsWith(prefix)) {
                    await this._idbDelete(key);
                    deleted++;
                }
            }
            this._moduleCache.clear();  // проще, чем точечно
            return deleted > 0;
        } catch (e) {
            console.warn(`[libraryStore/web] removeLibrary("${name}") failed:`, e);
            return false;
        }
    }

    async _updateIndex(lib, name, jsCode) {
        // читаем текущий
        let index = { modules: [] };
        try {
            const raw = await this._idbGet(`${lib}/_index.json`);
            if (raw) index = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch { /* ignore */ }

        // ⚠️ eval — но только при save, и только своего кода
        const def = parseModuleDefinition(jsCode);

        // удаляем старую запись
        index.modules = (index.modules || []).filter(m =>
            (typeof m === 'string' ? m : m.name) !== name
        );

        // добавляем новую
        index.modules.push({
            name,
            displayName: def?.displayName || name,
            category: def?.category || 'custom',
            status: def?.status || 'dev',
        });
        index.modules.sort((a, b) => a.name.localeCompare(b.name));

        await this._idbSet(`${lib}/_index.json`, index);
    }

    async createLibrary(name, meta = {}) {
        const lib = String(name || '').trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(lib)) {
            console.warn(`[libraryStore/web] createLibrary: invalid name "${lib}"`);
            return false;
        }
        const metaObj = {
            name: lib,
            displayName: meta.displayName || lib,
            author: meta.author || 'unknown',
            version: meta.version || '0.1.0',
            description: meta.description || '',
            geometry: meta.geometry || 'square',
            createdAt: new Date().toISOString(),
        };
        try {
            // ⭐ Если _meta.json уже есть — не перезаписываем (защита от случайного клоббера)
            const existing = await this._idbGet(`${lib}/_meta.json`);
            if (!existing) {
                await this._idbSet(`${lib}/_meta.json`, metaObj);
            }
            return true;
        } catch (e) {
            console.warn('[libraryStore/web] createLibrary failed:', e);
            return false;
        }
    }

    async getLibraryMeta(lib) {
        const defaultMeta = {
            name: lib, displayName: lib, author: 'unknown',
            version: '0.0.0', description: '',
            geometry: 'square', createdAt: null,
        };

        // builtin: fetch
        try {
            const res = await fetch(`/libraries/${lib}/_meta.json`, { cache: 'no-cache' });
            if (res.ok) {
                const text = await res.text();
                if (!looksLikeHtml(text)) {
                    return { ...defaultMeta, ...JSON.parse(text) };
                }
            }
        } catch { /* ignore */ }

        // user: IDB
        try {
            const meta = await this._idbGet(`${lib}/_meta.json`);
            if (meta) {
                return { ...defaultMeta, ...(typeof meta === 'string' ? JSON.parse(meta) : meta) };
            }
        } catch { /* ignore */ }

        return defaultMeta;
    }

    async removeModule(lib, name) {
        try {
            await this._idbDelete(`${lib}/${name}.js`);
            await this._idbDelete(`${lib}/${name}.txt`);
            this._moduleCache.delete(`${lib}/${name}`);

            // ⭐ Обновить _index.json — убрать запись
            try {
                const raw = await this._idbGet(`${lib}/_index.json`);
                if (raw) {
                    const index = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    const before = (index.modules || []).length;
                    index.modules = (index.modules || []).filter(m =>
                        (typeof m === 'string' ? m : m.name) !== name
                    );
                    if (index.modules.length !== before) {
                        await this._idbSet(`${lib}/_index.json`, index);
                    }
                }
            } catch (e) {
                console.warn(`[libraryStore/web] removeModule("${lib}/${name}") index update failed:`, e);
            }

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