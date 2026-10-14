// src/api/moduleStore.web.js
//
// Web-реализация moduleStore на localStorage.
// Хранит JS-код и DSP-код модулей как строки.
//
// Ключи:
//   csmodular:user_modules         → JSON-массив имён
//   csmodular:user_module:<name>   → { code, dsp_code }

const PREFIX = 'csmodular:user_module:';
const LIST_KEY = 'csmodular:user_modules';

class WebModuleStore {
    constructor() {
        this._cache = null;
    }

    _readList() {
        try {
            const raw = localStorage.getItem(LIST_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            console.warn('[moduleStore/web] _readList failed:', e);
            return [];
        }
    }

    _writeList(names) {
        try {
            localStorage.setItem(LIST_KEY, JSON.stringify(names));
        } catch (e) {
            console.warn('[moduleStore/web] _writeList failed:', e);
        }
    }

    async list() {
        const names = this._readList().sort();
        console.log(`[moduleStore/web] list() → ${names.length} modules`, names);
        return names;
    }

    async load(name) {
        try {
            const raw = localStorage.getItem(PREFIX + name);
            if (!raw) {
                console.warn(`[moduleStore/web] load("${name}") → not found`);
                return null;
            }
            const data = JSON.parse(raw);
            console.log(`[moduleStore/web] load("${name}") → OK (js: ${data.code?.length ?? 0}, dsp: ${data.dsp_code?.length ?? 0})`);
            return {
                name,
                code: data.code,
                dsp_code: data.dsp_code ?? null,
            };
        } catch (e) {
            console.warn(`[moduleStore/web] load("${name}") failed:`, e);
            return null;
        }
    }

    async save(name, code, dspCode = null) {
        try {
            localStorage.setItem(PREFIX + name, JSON.stringify({
                code,
                dsp_code: dspCode,
            }));

            const names = this._readList();
            if (!names.includes(name)) {
                names.push(name);
                this._writeList(names);
            }

            console.log(`[moduleStore/web] save("${name}") → OK (js: ${code.length}, dsp: ${dspCode?.length ?? 0})`);
            return true;
        } catch (e) {
            console.warn(`[moduleStore/web] save("${name}") failed:`, e);
            return false;
        }
    }

    async remove(name) {
        try {
            localStorage.removeItem(PREFIX + name);

            const names = this._readList().filter(n => n !== name);
            this._writeList(names);

            console.log(`[moduleStore/web] remove("${name}") → OK`);
            return true;
        } catch (e) {
            console.warn(`[moduleStore/web] remove("${name}") failed:`, e);
            return false;
        }
    }

    async isUserModule(name) {
        return this._readList().includes(name);
    }

    invalidateCache() {
        this._cache = null;
    }
}

export const moduleStore = new WebModuleStore();