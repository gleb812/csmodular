// src/moduleCategories.js
//
// Единственный источник правды о категориях модулей.
// Используется ContextMenu (группировка), Minimap (цвета), валидацией библиотек.
//
// НОВОЕ (library system):
//   - CATEGORIES — фиксированный enum. Создатель модуля обязан указать
//     `category` из этого списка в JS-описании. Новые категории не добавляются
//     без правки этого файла (защита от зоопарка).

// ============================================================
//  ФИКСИРОВАННЫЙ ENUM КАТЕГОРИЙ
// ============================================================

export const CATEGORIES = [
    'osc',
    'noise',
    'sample',
    'lfo',
    'env',
    'filter',
    'fx',
    'dynamics',
    'mixer',
    'switch',
    'logic',
    'math',
    'util',
    'io',
    'midi',
    'control',
    'custom',
];

const CATEGORY_SET = new Set(CATEGORIES);

/**
 * Проверить, что категория валидна.
 * @param {string} cat
 * @returns {boolean}
 */
export function isValidCategory(cat) {
    return typeof cat === 'string' && CATEGORY_SET.has(cat);
}

/**
 * Проверить и нормализовать категорию модуля.
 * Если категория не задана или невалидна — вернуть 'custom'
 * и (опционально) предупредить в консоль.
 *
 * @param {object} moduleDef — JS-описание модуля
 * @param {string} [ctx] — контекст для лога (например, "lib/Name")
 * @returns {{ category: string, wasValid: boolean }}
 */
export function normalizeCategory(moduleDef, ctx = '') {
    const raw = moduleDef?.category;
    if (isValidCategory(raw)) {
        return { category: raw, wasValid: true };
    }
    if (raw !== undefined && raw !== null) {
        console.warn(
            `[moduleCategories] ${ctx}: invalid category "${raw}", ` +
            `falling back to "custom". Valid: ${CATEGORIES.join(', ')}`
        );
    }
    return { category: 'custom', wasValid: false };
}

