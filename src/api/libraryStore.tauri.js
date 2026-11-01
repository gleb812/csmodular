// src/api/libraryStore.tauri.js
//
// Tauri-бэкенд libraryStore:
//   - builtin: <resourceDir>/libraries/<lib>/  (копия public/libraries)
//   - user:    $DOCUMENT/CsModular/libraries/<lib>/
//              modules/<Name>.js + csound/modules/<Name>.txt

import {
    readTextFile,
    writeTextFile,
    readDir,
    mkdir,
    exists,
    remove,
    BaseDirectory,
} from '@tauri-apps/plugin-fs';
import { parseModuleDefinition, looksLikeHtml } from './libraryStore.js';

const ROOT_FOLDER = 'CsModular';
const LIBS_SUBFOLDER = 'libraries';

class TauriLibraryStore {
    constructor() {
        this._rootReady = false;
        this._moduleCache = new Map(); // "lib/Name" -> { description, dspCode }
        this._builtinDir = null;       // вычисляется лениво
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
        // В Tauri 2 ресурсы доступны через BaseDirectory.Resource.
        // public/libraries попадает в resources как "libraries".
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

    // ---------- Список библиотек ----------

    async listLibraries() {
        await this._ensureUserRoot();
        const result = [];
        const seen = new Set();

        // 1. Builtin — из <resource>/libraries/_index.json
        //    (прочитать директорию ресурсов напрямую нельзя из-за scope,
        //     поэтому используем тот же _index.json, что и web)
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

        return result;
    }

    // ---------- Список модулей библиотеки ----------

    async listModules(lib) {
        const names = new Set();

        // 1. Builtin — из <resource>/libraries/<lib>/_index.json
        try {
            const builtinDir = await this._getBuiltinDir();
            const path = `${builtinDir}/${lib}/_index.json`;
            if (await this._exists(path, BaseDirectory.Resource)) {
                const text = await readTextFile(path, { baseDir: BaseDirectory.Resource });
                const data = JSON.parse(text);
                const mods = Array.isArray(data?.modules) ? data.modules : [];
                mods.forEach(m => names.add(m));
            }
        } catch (e) {
            // ignore
        }

        // 2. User — readDir modules/
        try {
            const path = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules`;
            if (await this._exists(path, BaseDirectory.Document)) {
                const entries = await readDir(path, { baseDir: BaseDirectory.Document });
                for (const e of entries) {
                    if (e.isFile && e.name?.endsWith('.js')) {
                        names.add(e.name.replace(/\.js$/, ''));
                    }
                }
            }
        } catch (e) {
            // ignore
        }

        // Загружаем описания
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

        // 1. User: $DOCUMENT/CsModular/libraries/<lib>/modules/<Name>.js
        try {
            const jsPath = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules/${name}.js`;
            if (await this._exists(jsPath, BaseDirectory.Document)) {
                jsCode = await readTextFile(jsPath, { baseDir: BaseDirectory.Document });
            }
            const dspPath = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/csound/modules/${name}.txt`;
            if (await this._exists(dspPath, BaseDirectory.Document)) {
                dspCode = await readTextFile(dspPath, { baseDir: BaseDirectory.Document });
            }
        } catch (e) {
            console.warn(`[libraryStore/tauri] loadModule("${lib}/${name}") user read failed:`, e);
        }

        // 2. Builtin: <resource>/libraries/<lib>/...
        if (jsCode === null) {
            try {
                const builtinDir = await this._getBuiltinDir();
                const jsPath = `${builtinDir}/${lib}/modules/${name}.js`;
                if (await this._exists(jsPath, BaseDirectory.Resource)) {
                    jsCode = await readTextFile(jsPath, { baseDir: BaseDirectory.Resource });
                }
                const dspPath = `${builtinDir}/${lib}/csound/modules/${name}.txt`;
                if (await this._exists(dspPath, BaseDirectory.Resource)) {
                    dspCode = await readTextFile(dspPath, { baseDir: BaseDirectory.Resource });
                }
            } catch (e) {
                // ignore
            }
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
            const path = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules/${name}.txt`;
            if (await this._exists(path, BaseDirectory.Document)) {
                return await readTextFile(path, { baseDir: BaseDirectory.Document });
            }
        } catch (e) {
            // ignore
        }

        // 2. Builtin
        try {
            const builtinDir = await this._getBuiltinDir();
            const path = `${builtinDir}/${lib}/modules/${name}.txt`;
            if (await this._exists(path, BaseDirectory.Resource)) {
                return await readTextFile(path, { baseDir: BaseDirectory.Resource });
            }
        } catch (e) {
            // ignore
        }

        return null;
    }

    // ---------- Сохранение / удаление (только user) ----------

    async saveModule(lib, name, jsCode, dspCode = null) {
        try {
            await this._ensureUserRoot();

            const jsPath = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules/${name}.js`;
            await mkdir(`${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules`, {
                baseDir: BaseDirectory.Document,
                recursive: true,
            });
            await writeTextFile(jsPath, jsCode, { baseDir: BaseDirectory.Document });

            if (dspCode !== null && dspCode !== undefined) {
                const dspDir = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules`;
                await mkdir(dspDir, {
                    baseDir: BaseDirectory.Document,
                    recursive: true,
                });
                const dspPath = `${dspDir}/${name}.txt`;
                await writeTextFile(dspPath, dspCode, { baseDir: BaseDirectory.Document });
            }

            this._moduleCache.delete(`${lib}/${name}`);
            return true;
        } catch (e) {
            console.warn(`[libraryStore/tauri] saveModule("${lib}/${name}") failed:`, e);
            return false;
        }
    }

    async removeModule(lib, name) {
        try {
            await this._ensureUserRoot();
            let deleted = false;

            const jsPath = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules/${name}.js`;
            if (await this._exists(jsPath, BaseDirectory.Document)) {
                await remove(jsPath, { baseDir: BaseDirectory.Document });
                deleted = true;
            }

            const dspPath = `${ROOT_FOLDER}/${LIBS_SUBFOLDER}/${lib}/modules/${name}.txt`;
            if (await this._exists(dspPath, BaseDirectory.Document)) {
                await remove(dspPath, { baseDir: BaseDirectory.Document });
                deleted = true;
            }

            this._moduleCache.delete(`${lib}/${name}`);
            return deleted;
        } catch (e) {
            console.warn(`[libraryStore/tauri] removeModule("${lib}/${name}") failed:`, e);
            return false;
        }
    }

    invalidateCache() {
        this._moduleCache.clear();
    }
}

export const libraryStore = new TauriLibraryStore();