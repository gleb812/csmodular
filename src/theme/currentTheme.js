// src/theme/currentTheme.js
//
// Глобальный синглтон текущей темы.
// Компоненты импортируют getCurrentTheme() и используют её в draw().
//
// Инициализация — в main.js (или где создаётся ModularSystem):
//   await initCurrentTheme();
//
// Изменения — через setCurrentTheme(newTheme).

import { themeStore } from './themeStore.js';
import { Theme } from './Theme.js';

let currentTheme = new Theme({});

/**
 * Инициализировать текущую тему из хранилища.
 * Вызывается один раз при старте приложения.
 */
export async function initCurrentTheme() {
    const settings = await themeStore.load();
    currentTheme = new Theme(settings);
    console.log('[currentTheme] initialized:', currentTheme.preset);
    return currentTheme;
}

/**
 * Установить новую тему (например, из Design Settings).
 */
export function setCurrentTheme(theme) {
    currentTheme = theme;
    console.log('[currentTheme] updated:', theme.preset);
}

/**
 * Получить текущую тему.
 * Всегда возвращает объект (никогда null).
 */
export function getCurrentTheme() {
    return currentTheme;
}

// Экспонируем для отладки через консоль
if (typeof window !== 'undefined') {
    window.__theme__ = {
        get: () => currentTheme,
        set: setCurrentTheme,
        init: initCurrentTheme,
    };
}