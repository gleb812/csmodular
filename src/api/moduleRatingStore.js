// src/api/moduleRatingStore.js
//
// Хранилище рейтинга модулей (0..3).
// Отдельно от moduleStore — чтобы не перезаписывать .js файл
// при каждой смене рейтинга.

const PREFIX = 'csmodular:module_rating:';
const OVERRIDES_KEY = 'csmodular:module_rating_overrides';
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

class WebRatingStore {
    get(name) {
        const raw = localStorage.getItem(PREFIX + name);
        if (raw === null) return null;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : null;
    }
    set(name, rating) {
        const r = Math.max(0, Math.min(3, rating | 0));
        localStorage.setItem(PREFIX + name, String(r));
        this._markOverride(name);
        return r;
    }
    remove(name) {
        localStorage.removeItem(PREFIX + name);
        this._clearOverride(name);
    }
    list() {
        // для отладки
        return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || '{}');
    }
    _markOverride(name) {
        const o = this.list();
        o[name] = true;
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
    }
    _clearOverride(name) {
        const o = this.list();
        delete o[name];
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
    }
}

class TauriRatingStore {
    // В Tauri можно тоже localStorage — проще, чем отдельные файлы.
    // Если нужна файловая синхронизация с гитом — см. комментарий ниже.
    get(name) {
        const raw = localStorage.getItem(PREFIX + name);
        if (raw === null) return null;
        const n = parseInt(raw, 10);
        return Number.isFinite(n) ? Math.max(0, Math.min(3, n)) : null;
    }
    set(name, rating) {
        const r = Math.max(0, Math.min(3, rating | 0));
        localStorage.setItem(PREFIX + name, String(r));
        return r;
    }
    remove(name) {
        localStorage.removeItem(PREFIX + name);
    }
    list() {
        const o = {};
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX)) o[k.slice(PREFIX.length)] = localStorage.getItem(k);
        }
        return o;
    }
}

export const ratingStore = isTauri ? new TauriRatingStore() : new WebRatingStore();

/**
 * Дефолтный рейтинг модуля — из его JS-описания (modules/<Name>.js).
 * Возвращает 0, если поля нет.
 */
export function getDefaultRating(moduleDef) {
    if (!moduleDef || typeof moduleDef !== 'object') return 0;
    const r = moduleDef.rating;
    return Number.isFinite(r) ? Math.max(0, Math.min(3, r | 0)) : 0;
}

/**
 * Итоговый рейтинг: user override > default > 0.
 */
export function getEffectiveRating(name, moduleDef) {
    const user = ratingStore.get(name);
    if (user !== null) return user;
    return getDefaultRating(moduleDef);
}