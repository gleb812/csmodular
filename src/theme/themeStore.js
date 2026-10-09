// src/theme/themeStore.js
//
// Хранилище настроек темы.
// Web: localStorage.
// Tauri: позже — файл Documents/CsModular/theme.json.
// API асинхронный — чтобы легко добавить Tauri-реализацию.

import { DEFAULT_THEME } from './defaults.js';

const STORAGE_KEY = 'csmodular.theme';

/**
 * Глубокое слияние. Используется, чтобы при добавлении новых полей
 * в DEFAULT_THEME старые сохранённые темы не ломались.
 */
function deepMerge(base, override) {
    const result = { ...base };
    for (const key of Object.keys(override || {})) {
        const v = override[key];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
            result[key] = deepMerge(base[key] || {}, v);
        } else if (v !== undefined) {
            result[key] = v;
        }
    }
    return result;
}

class ThemeStore {
    constructor() {
        this._theme = null;
        this._listeners = [];
    }

    /**
     * Загрузить тему из хранилища.
     * Если нет сохранённой — вернуть DEFAULT_THEME.
     */
    async load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                this._theme = deepMerge(DEFAULT_THEME, parsed);
                console.log('[themeStore] loaded theme from localStorage');
            } else {
                this._theme = { ...DEFAULT_THEME };
                console.log('[themeStore] no saved theme, using defaults');
            }
        } catch (error) {
            console.warn('[themeStore] load failed, using defaults:', error);
            this._theme = { ...DEFAULT_THEME };
        }
        return this._theme;
    }

    /**
     * Сохранить тему.
     */
    async save(theme) {
        try {
            this._theme = deepMerge(DEFAULT_THEME, theme);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._theme));
            this._notify();
            console.log('[themeStore] saved theme');
            return true;
        } catch (error) {
            console.warn('[themeStore] save failed:', error);
            return false;
        }
    }

    /**
     * Текущая тема (синхронно).
     * Если ещё не загружена — вернёт DEFAULT_THEME.
     */
    get() {
        return this._theme || DEFAULT_THEME;
    }

    /**
     * Сброс к дефолту.
     */
    async reset() {
        return this.save({ ...DEFAULT_THEME });
    }

    /**
     * Подписка на изменения. Возвращает функцию отписки.
     */
    subscribe(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    }

    _notify() {
        for (const cb of this._listeners) {
            try { cb(this._theme); } catch (e) { console.error(e); }
        }
    }
}

export const themeStore = new ThemeStore();