// src/api/libraryStore.tauri.js
//
// Tauri-бэкенд libraryStore:
//   - builtin: <resourceDir>/libraries/<lib>/
//   - user:    $DOCUMENT/CsModular/libraries/<lib>/
//              modules/<Name>.js + modules/<Name>.txt
//              _meta.json  (метаданные библиотеки)
//              _index.json (манифест модулей, обновляется при saveModule)

import {
    readTextFile,
    writeTextFile,
    readDir,
    mkdir,
    exists,
    remove,
    BaseDirectory,
} from '@tauri-apps/plugin-fs';
import { parseModuleDefinition } from './libraryStore.js';

const ROOT_FOLDER = 'CsModular';
const LIBS_SUBFOLDER = 'libraries';

class TauriLibraryStore {
    constructor() {
        this._rootReady = false;
        this._moduleCache = new Map(); // "lib/Name" -> { description, dspCode }
        this._builtinDir = null;
    }

    // ---------- Пути ----------

    async _ensureUserRoot() {
        if (this._rootReady) return;
        await mkdir(`${ROOT_FOLDER}/${LIBS_SUBFOLDER}`, {
            baseDir: BaseDirectory.Document,
            recursive: true,
        });
        this._rootReady = true;
    }

    async _getBuiltinDir() {
        if (this._builtinDir !== null) return this._builtinDir;
        this._builtinDir = 'libraries';
        return this._builtinDir;
    }

    async _exists(path, baseDir) {
        try {
            return await exists(path, { baseDir });
        } catch {
            return false;
        }
    }

    _userLibPath(lib) {
        return `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}`;
    }

    // ---------- Список библиотек ----------

    async listLibraries() {
        await this._ensureUserRoot();
        const result = [];
        const seen = new Set();

        // 1. Builtin — из <resource>/libraries/_index.json
        try {
            const builtinDir = await this._getBuiltinDir();
            const path = `${builtinDir}/_index.json`;
            if (await this._exists(path, BaseDirectory.Resource)) {
                const text = await readTextFile(path, { baseDir: BaseDirectory.Resource });
                const data = JSON.parse(text);
                const names = Array.isArray(data?.libraries) ? data.libraries : [];
                for (const name of names) {
                    if (!seen.has(name)) {
                        seen.add(name);
                        result.push({ name, source: 'builtin' });
                    }
                }
            }
        } catch (e) {
            console.warn('[libraryStore/tauri] builtin list failed:', e);
        }

        // 2. User — readDir
        try {
            const entries = await readDir(`${ROOT_FOLDER}/${LIBS_SUBFOLDER}`, {
                baseDir: BaseDirectory.Document,
            });
            for (const e of entries) {
                if (e.isDirectory && e.name && !seen.has(e.name)) {
                    seen.add(e.name);
                    result.push({ name: e.name, source: 'user' });
                }
            }
        } catch (e) {
            console.warn('[libraryStore/tauri] user list failed:', e);
        }

        // 3. ⭐ Meta для каждой
        for (const entry of result) {
            try {
                entry.meta = await this.getLibraryMeta(entry.name);
            } catch {
                entry.meta = this._defaultMeta(entry.name);
            }
        }

        return result;
    }

    // ---------- Список модулей библиотеки (без eval) ----------

    async listModules(lib) {
        const result = new Map();  // name -> { name, displayName, category, status }

        // 1. Builtin: <resource>/libraries/<lib>/_index.json
        try {
            const builtinDir = await this._getBuiltinDir();
            const path = `${builtinDir}/${lib}/_index.json`;
            if (await this._exists(path, BaseDirectory.Resource)) {
                const text = await readTextFile(path, { baseDir: BaseDirectory.Resource });
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
        } catch { /* ignore */ }

        // 2. User: _index.json
        try {
            const indexPath = `${this._userLibPath(lib)}/_index.json`;
            if (await this._exists(indexPath, BaseDirectory.Document)) {
                const text = await readTextFile(indexPath, { baseDir: BaseDirectory.Document });
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
        } catch { /* ignore */ }

        // 2b. Fallback: без _index.json — readDir modules/
        try {
            const path = `${this._userLibPath(lib)}/modules`;
            if (await this._exists(path, BaseDirectory.Document)) {
                const entries = await readDir(path, { baseDir: BaseDirectory.Document });
                for (const e of entries) {
                    if (e.isFile && e.name?.endsWith('.js')) {
                        const name = e.name.replace(/\.js$/, '');
                        if (!result.has(name)) {
                            result.set(name, {
                                name, displayName: name, category: 'custom', status: 'dev',
                            });
                        }
                    }
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

        // 1. User: <userLib>/modules/<Name>.{js,txt}
        try {
            const jsPath = `${this._userLibPath(lib)}/modules/${name}.js`;
            if (await this._exists(jsPath, BaseDirectory.Document)) {
                jsCode = await readTextFile(jsPath, { baseDir: BaseDirectory.Document });
            }
            const dspPath = `${this._userLibPath(lib)}/modules/${name}.txt`;
            if (await this._exists(dspPath, BaseDirectory.Document)) {
                dspCode = await readTextFile(dspPath, { baseDir: BaseDirectory.Document });
            }
        } catch (e) {
            console.warn(`[libraryStore/tauri] loadModule("${lib}/${name}") user read failed:`, e);
        }

        // 2. Builtin: <resource>/libraries/<lib>/modules/<Name>.{js,txt}
        if (jsCode === null) {
            try {
                const builtinDir = await this._getBuiltinDir();
                const jsPath = `${builtinDir}/${lib}/modules/${name}.js`;
                if (await this._exists(jsPath, BaseDirectory.Resource)) {
                    jsCode = await readTextFile(jsPath, { baseDir: BaseDirectory.Resource });
                }
                const dspPath = `${builtinDir}/${lib}/modules/${name}.txt`;
                if (await this._exists(dspPath, BaseDirectory.Resource)) {
                    dspCode = await readTextFile(dspPath, { baseDir: BaseDirectory.Resource });
                }
            } catch { /* ignore */ }
        }

        if (jsCode === null) {
            console.warn(`[libraryStore/tauri] loadModule("${lib}/${name}") → JS not found`);
            return null;
        }

        const description = parseModuleDefinition(jsCode);
        if (!description) {
            console.warn(`[libraryStore/tauri] loadModule("${lib}/${name}") → parse failed`);
            return null;
        }

        const result = { description, dspCode };
        this._moduleCache.set(cacheKey, result);
        return result;
    }

    // ---------- Загрузка UDO ----------

    async loadUdo(lib, name) {
        // 1. User
        try {
            const path = `${this._userLibPath(lib)}/modules/${name}.txt`;
            if (await this._exists(path, BaseDirectory.Document)) {
                return await readTextFile(path, { baseDir: BaseDirectory.Document });
            }
        } catch { /* ignore */ }

        // 2. Builtin
        try {
            const builtinDir = await this._getBuiltinDir();
            const path = `${builtinDir}/${lib}/modules/${name}.txt`;
            if (await this._exists(path, BaseDirectory.Resource)) {
                return await readTextFile(path, { baseDir: BaseDirectory.Resource });
            }
        } catch { /* ignore */ }

        return null;
    }

    // ---------- Сохранение / удаление (только user) ----------

    async saveModule(lib, name, jsCode, dspCode = null) {
        try {
            await this._ensureUserRoot();

            const modulesDir = `${this._userLibPath(lib)}/modules`;
            await mkdir(modulesDir, {
                baseDir: BaseDirectory.Document,
                recursive: true,
            });

            await writeTextFile(`${modulesDir}/${name}.js`, jsCode, {
                baseDir: BaseDirectory.Document,
            });
            if (dspCode !== null && dspCode !== undefined) {
                await writeTextFile(`${modulesDir}/${name}.txt`, dspCode, {
                    baseDir: BaseDirectory.Document,
                });
            }

            this._moduleCache.delete(`${lib}/${name}`);

            // ⭐ Обновить _index.json
            await this._updateIndex(lib, name, jsCode);
            return true;
        } catch (e) {
            console.warn(`[libraryStore/tauri] saveModule("${lib}/${name}") failed:`, e);
            return false;
        }
    }

    async _updateIndex(lib, name, jsCode) {
        const indexPath = `${this._userLibPath(lib)}/_index.json`;
        let index = { modules: [] };
        try {
            if (await this._exists(indexPath, BaseDirectory.Document)) {
                const text = await readTextFile(indexPath, { baseDir: BaseDirectory.Document });
                index = JSON.parse(text);
            }
        } catch { /* ignore */ }

        // ⚠️ eval — только при save, только своего кода
        const def = parseModuleDefinition(jsCode);

        index.modules = (index.modules || []).filter(m =>
            (typeof m === 'string' ? m : m.name) !== name
        );
        index.modules.push({
            name,
            displayName: def?.displayName || name,
            category: def?.category || 'custom',
            status: def?.status || 'dev',
        });
        index.modules.sort((a, b) => a.name.localeCompare(b.name));

        await writeTextFile(indexPath, JSON.stringify(index, null, 2), {
            baseDir: BaseDirectory.Document,
        });
    }

    async removeModule(lib, name) {
        try {
            await this._ensureUserRoot();
            let deleted = false;

            const modulesDir = `${this._userLibPath(lib)}/modules`;
            const jsPath = `${modulesDir}/${name}.js`;
            if (await this._exists(jsPath, BaseDirectory.Document)) {
                await remove(jsPath, { baseDir: BaseDirectory.Document });
                deleted = true;
            }
            const dspPath = `${modulesDir}/${name}.txt`;
            if (await this._exists(dspPath, BaseDirectory.Document)) {
                await remove(dspPath, { baseDir: BaseDirectory.Document });
                deleted = true;
            }

            if (deleted) {
                // ⭐ Обновить _index.json — убрать запись
                try {
                    const indexPath = `${this._userLibPath(lib)}/_index.json`;
                    if (await this._exists(indexPath, BaseDirectory.Document)) {
                        const text = await readTextFile(indexPath, { baseDir: BaseDirectory.Document });
                        const index = JSON.parse(text);
                        index.modules = (index.modules || []).filter(m =>
                            (typeof m === 'string' ? m : m.name) !== name
                        );
                        await writeTextFile(indexPath, JSON.stringify(index, null, 2), {
                            baseDir: BaseDirectory.Document,
                        });
                    }
                } catch { /* ignore */ }
            }

            this._moduleCache.delete(`${lib}/${name}`);
            return deleted;
        } catch (e) {
            console.warn(`[libraryStore/tauri] removeModule("${lib}/${name}") failed:`, e);
            return false;
        }
    }

    // ---------- Library meta ----------

    _defaultMeta(lib) {
        return {
            name: lib, displayName: lib, author: 'unknown',
            version: '0.0.0', description: '',
            geometry: 'square', createdAt: null,
        };
    }

    async createLibrary(name, meta = {}) {
        const lib = String(name || '').trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(lib)) {
            console.warn(`[libraryStore/tauri] createLibrary: invalid name "${lib}"`);
            return false;
        }
        try {
            await this._ensureUserRoot();
            const libDir = this._userLibPath(lib);
            await mkdir(`${libDir}/modules`, {
                baseDir: BaseDirectory.Document,
                recursive: true,
            });

            const metaPath = `${libDir}/_meta.json`;
            if (!(await this._exists(metaPath, BaseDirectory.Document))) {
                const metaObj = {
                    name: lib,
                    displayName: meta.displayName || lib,
                    author: meta.author || 'unknown',
                    version: meta.version || '0.1.0',
                    description: meta.description || '',
                    geometry: meta.geometry || 'square',
                    createdAt: new Date().toISOString(),
                };
                await writeTextFile(metaPath, JSON.stringify(metaObj, null, 2), {
                    baseDir: BaseDirectory.Document,
                });
            }
            return true;
        } catch (e) {
            console.warn('[libraryStore/tauri] createLibrary failed:', e);
            return false;
        }
    }

    async removeLibrary(lib) {
        const name = String(lib || '').trim();
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            console.warn(`[libraryStore/tauri] removeLibrary: invalid name "${name}"`);
            return false;
        }
        // builtin — read-only
        try {
            const builtinDir = await this._getBuiltinDir();
            const builtinPath = `${builtinDir}/${name}`;
            if (await this._exists(builtinPath, BaseDirectory.Resource)) {
                console.warn(`[libraryStore/tauri] removeLibrary: "${name}" is builtin (read-only)`);
                return false;
            }
        } catch { /* ignore */ }

        try {
            await this._ensureUserRoot();
            const libDir = this._userLibPath(name);
            if (!(await this._exists(libDir, BaseDirectory.Document))) {
                return false;
            }
            await remove(libDir, { baseDir: BaseDirectory.Document, recursive: true });
            this._moduleCache.clear();
            return true;
        } catch (e) {
            console.warn(`[libraryStore/tauri] removeLibrary("${name}") failed:`, e);
            return false;
        }
    }

    async getLibraryMeta(lib) {
        // 1. User: <userLib>/_meta.json
        try {
            const path = `${this._userLibPath(lib)}/_meta.json`;
            if (await this._exists(path, BaseDirectory.Document)) {
                const text = await readTextFile(path, { baseDir: BaseDirectory.Document });
                return { ...this._defaultMeta(lib), ...JSON.parse(text) };
            }
        } catch { /* ignore */ }

        // 2. Builtin: <resource>/libraries/<lib>/_meta.json
        try {
            const builtinDir = await this._getBuiltinDir();
            const path = `${builtinDir}/${lib}/_meta.json`;
            if (await this._exists(path, BaseDirectory.Resource)) {
                const text = await readTextFile(path, { baseDir: BaseDirectory.Resource });
                return { ...this._defaultMeta(lib), ...JSON.parse(text) };
            }
        } catch { /* ignore */ }

        return this._defaultMeta(lib);
    }

    invalidateCache() {
        this._moduleCache.clear();
    }
}

export const libraryStore = new TauriLibraryStore();