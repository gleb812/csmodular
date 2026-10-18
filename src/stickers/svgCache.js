// src/stickers/svgCache.js
//
// Кеш отрендеренных SVG-изображений.
// Ключ — id стикера. Значение — { img, url, signature, ready }.
//
// При смене цвета/строки/colorMode — signature меняется, кеш инвалидируется.
// URL после смены — revokeObjectURL, чтобы не течь памятью.

import { getCurrentTheme } from '../theme/currentTheme.js';

const _cache = new Map();

/**
 * Разрешить цвет для SVG на основе colorMode и темы.
 * Аналогично Sticker.resolveColor, но с фоллбэком:
 * если у стикера colorMode === 'custom', возвращаем custom color.
 */
function resolveSvgColor(sticker) {
    const theme = getCurrentTheme();

    if (theme.isLcd) {
        if (sticker.colorMode === 'accent') return theme.getAccentColor() || '#8fbc8f';
        return '#ffffff';
    }
    // classic
    if (sticker.colorMode === 'white')  return '#ffffff';
    if (sticker.colorMode === 'accent') return theme.getAccentColor() || '#8fbc8f';
    return sticker.color || '#ffffff';
}

/**
 * Подменить цвета в SVG-строке.
 * Заменяет:
 *   - currentColor
 *   - fill="..." / stroke="..." на корневом <svg> и элементах,
 *     если стоит 'currentColor' или 'inherit' (наследуемые).
 * НЕ трогает явные цвета (fill="#ff0000") — это уважение авторских цветов.
 */
function recolorSvg(svgString, color) {
    let s = svgString;

    // 1. currentColor → конкретный цвет
    s = s.replace(/currentColor/gi, color);

    // 2. Если нет ни fill, ни stroke нигде — ставим fill на <svg>
    if (!/\bfill\s*=/.test(s) && !/\bstroke\s*=/.test(s)) {
        s = s.replace(/<svg\b([^>]*)>/i, (m, attrs) => {
            return `<svg${attrs} fill="${color}">`;
        });
    }

    return s;
}

/**
 * Привести SVG-строку к валидному <svg>-документу.
 * Если это голый <path>, обернуть в <svg>.
 */
function normalizeSvgString(input) {
    let s = String(input || '').trim();
    if (!s) return '';

    // Уже <svg>
    if (/^<svg[\s>]/i.test(s)) return s;

    // Голые элементы (<path>, <circle>, <rect>, ...) — обернуть
    if (/^<(path|circle|rect|line|polyline|polygon|ellipse|g|text)\b/i.test(s)) {
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${s}</svg>`;
    }

    return ''; // нераспознанное
}

/**
 * Получить (или подготовить) изображение для стикера.
 * Возвращает:
 *   - HTMLImageElement, если готово (можно сразу рисовать)
 *   - null, если ещё не готово (первый кадр после смены цвета/строки)
 *
 * @param {Sticker} sticker
 * @param {Function} onReady — вызвать, когда картинка загрузилась (forceRedraw)
 */
export function getSvgImage(sticker, onReady) {
    const color = resolveSvgColor(sticker);
    const normalized = normalizeSvgString(sticker.svgString);

    if (!normalized) return null;

    const recolored = recolorSvg(normalized, color);

    // signature — уникальный ключ контента
    const signature = `${sticker.id}|${color}|${recolored.length}|${simpleHash(recolored)}`;

    const entry = _cache.get(sticker.id);
    if (entry && entry.signature === signature) {
        return entry.ready ? entry.img : null;
    }

    // Инвалидируем старую запись
    if (entry?.url) {
        try { URL.revokeObjectURL(entry.url); } catch { /* ignore */ }
    }

    // Создаём новую
    const blob = new Blob([recolored], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    const record = { img, url, signature, ready: false };
    _cache.set(sticker.id, record);

    img.onload = () => {
        record.ready = true;
        if (typeof onReady === 'function') onReady();
    };
    img.onerror = (e) => {
        console.warn(`[svgCache] Failed to load SVG for sticker ${sticker.id}`, e);
        _cache.delete(sticker.id);
        try { URL.revokeObjectURL(url); } catch { /* ignore */ }
    };
    img.src = url;

    return null;
}

export function releaseSvg(stickerId) {
    const entry = _cache.get(stickerId);
    if (!entry) return;
    if (entry.url) {
        try { URL.revokeObjectURL(entry.url); } catch { /* ignore */ }
    }
    _cache.delete(stickerId);
}


/**
 * Освободить ресурсы стикера (при удалении).
 */
export function releaseAll() {
    for (const [id, entry] of _cache.entries()) {
        if (entry.url) {
            try { URL.revokeObjectURL(entry.url); } catch { /* ignore */ }
        }
    }
    _cache.clear();
}

// Быстрый хеш строки (FNV-1a, 32 bit) — чтобы signature не хранил всю строку
function simpleHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16);
}