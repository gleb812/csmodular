// src/api/moduleStore.tauri.js
//
// Реализация moduleStore для Tauri.
// User-модули хранятся в:
//   $DOCUMENT/CsModular/modules/user/*.js
//   $DOCUMENT/CsModular/csound/modules/user/*.txt

import {
    readTextFile,
    writeTextFile,
    readDir,
    mkdir,
    exists,
    remove,
    BaseDirectory,
} from '@tauri-apps/plugin-fs';
import { documentDir, join } from '@tauri-apps/api/path';

const ROOT_FOLDER = 'CsModular';
const JS_SUBFOLDER = 'modules/user';
const DSP_SUBFOLDER = 'csound/modules/user';

class TauriModuleStore {
    constructor() {
        this._rootPath = null; // кеш полного пути
    }

    /**
     * Ленивая инициализация — вычисляем пути и создаём папки.
     * Вызывается автоматически при первом обращении.
     */
    async _ensureRoot() {
        if (this._rootPath) return this._rootPath;

        const docs = await documentDir();
        const root = await join(docs, ROOT_FOLDER);

        // Создаём всю структуру папок рекурсивно
        // BaseDirectory.Document — потому что scope в capabilities задан через $DOCUMENT
        await mkdir(`${ROOT_FOLDER}/${JS_SUBFOLDER}`, {
            baseDir: BaseDirectory.Document,
            recursive: true,
        });
        await mkdir(`${ROOT_FOLDER}/${DSP_SUBFOLDER}`, {
            baseDir: BaseDirectory.Document,
            recursive: true,
        });

        this._rootPath = root;
        return root;
    }

    /**
     * Проверить, существует ли файл.
     * @param {string} relPath — путь относительно $DOCUMENT
     */
    async _exists(relPath) {
        try {
            return await exists(relPath, { baseDir: BaseDirectory.Document });
        } catch {
            return false;
        }
    }

    /**
     * Список имён пользовательских модулей (без расширения .js).
     * @returns {Promise<string[]>}
     */
    async list() {
        try {
            await this._ensureRoot();
            const entries = await readDir(`${ROOT_FOLDER}/${JS_SUBFOLDER}`, {
                baseDir: BaseDirectory.Document,
            });
            
            const names = entries
                .filter(e => e.isFile && e.name.endsWith('.js'))
                .map(e => e.name.replace(/\.js$/, ''))
                .sort();
            
            console.log(`[moduleStore/tauri] list() → ${names.length} modules`, names);
            return names;
        } catch (error) {
            console.warn('[moduleStore/tauri] list() failed:', error);
            return [];
        }
    }

    /**
     * Загрузить модуль по имени.
     * @param {string} name
     * @returns {Promise<{name, code, dsp_code}|null>}
     */
    async load(name) {
        try {
            await this._ensureRoot();
            
            const jsPath = `${ROOT_FOLDER}/${JS_SUBFOLDER}/${name}.js`;
            const dspPath = `${ROOT_FOLDER}/${DSP_SUBFOLDER}/${name}.txt`;
            
            if (!await this._exists(jsPath)) {
                console.warn(`[moduleStore/tauri] load("${name}") → JS not found`);
                return null;
            }
            
            const code = await readTextFile(jsPath, { baseDir: BaseDirectory.Document });
            
            let dsp_code = null;
            if (await this._exists(dspPath)) {
                dsp_code = await readTextFile(dspPath, { baseDir: BaseDirectory.Document });
            }
            
            console.log(`[moduleStore/tauri] load("${name}") → OK (js: ${code.length}, dsp: ${dsp_code?.length ?? 0})`);
            return { name, code, dsp_code };
        } catch (error) {
            console.warn(`[moduleStore/tauri] load("${name}") failed:`, error);
            return null;
        }
    }

    /**
     * Сохранить модуль.
     * @param {string} name
     * @param {string} code      — JS код
     * @param {string|null} dspCode — Csound DSP код (может быть null)
     * @returns {Promise<boolean>}
     */
    async save(name, code, dspCode = null) {
        try {
            await this._ensureRoot();
            
            const jsPath = `${ROOT_FOLDER}/${JS_SUBFOLDER}/${name}.js`;
            await writeTextFile(jsPath, code, { baseDir: BaseDirectory.Document });
            console.log(`[moduleStore/tauri] save("${name}") → JS saved (${code.length} chars)`);
            
            if (dspCode) {
                const dspPath = `${ROOT_FOLDER}/${DSP_SUBFOLDER}/${name}.txt`;
                await writeTextFile(dspPath, dspCode, { baseDir: BaseDirectory.Document });
                console.log(`[moduleStore/tauri] save("${name}") → DSP saved (${dspCode.length} chars)`);
            }
            
            return true;
        } catch (error) {
            console.warn(`[moduleStore/tauri] save("${name}") failed:`, error);
            return false;
        }
    }

    /**
     * Удалить модуль (JS и DSP).
     * @param {string} name
     * @returns {Promise<boolean>}
     */
    async remove(name) {
        try {
            await this._ensureRoot();
            
            let deleted = false;
            
            const jsPath = `${ROOT_FOLDER}/${JS_SUBFOLDER}/${name}.js`;
            if (await this._exists(jsPath)) {
                await remove(jsPath, { baseDir: BaseDirectory.Document });
                deleted = true;
                console.log(`[moduleStore/tauri] remove("${name}") → JS deleted`);
            }
            
            const dspPath = `${ROOT_FOLDER}/${DSP_SUBFOLDER}/${name}.txt`;
            if (await this._exists(dspPath)) {
                await remove(dspPath, { baseDir: BaseDirectory.Document });
                deleted = true;
                console.log(`[moduleStore/tauri] remove("${name}") → DSP deleted`);
            }
            
            return deleted;
        } catch (error) {
            console.warn(`[moduleStore/tauri] remove("${name}") failed:`, error);
            return false;
        }
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

    invalidateCache() {
        // У нас нет кеша — no-op
    }
}

export const moduleStore = new TauriModuleStore();