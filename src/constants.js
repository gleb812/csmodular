// src/constants.js
import { MODULE_GROUP_OF } from './moduleCategories.js';
export const PANEL_WIDTH = 260;
export const BASE_STEP_X = 20;
export const BASE_STEP_Y = 15;
export const PANEL_GRID_WIDTH = PANEL_WIDTH / BASE_STEP_X;   // = 13
export const NM2_HPOS_TO_GRIDX = PANEL_GRID_WIDTH;           // = 13

// ⭐ Цвета джеков и кабелей (единый источник истины)
export const CABLE_COLORS = {
    audio:      '#ef4444',   // красный
    control:    '#3b82f6',   // синий
    logic:      '#fde047',   // жёлтый
    logicAudio: '#f97316',   // оранжевый (редкий)
    other:      '#94a3b8',   // серый fallback
};

// ⭐ Семейства типов: внутри семейства dynamic-джек может перекрашиваться
export const TYPE_FAMILY = {
    audio:      'ac',   // audio/control
    control:    'ac',
    logic:      'll',   // logic/logicAudio
    logicAudio: 'll',
};

/** Может ли dynamic-джек сменить тип srcType → dstType */
export function canTransition(srcType, dstType) {
    return !!TYPE_FAMILY[srcType] && TYPE_FAMILY[srcType] === TYPE_FAMILY[dstType];
}

/** Csound rate для типа джека: audio/logicAudio → 'audio', control/logic → 'control' */
export function csoundRateOf(jackType) {
    return (jackType === 'audio' || jackType === 'logicAudio') ? 'audio' : 'control';
}

// ⭐ Минимальная дистанция (в базовых клетках), дальше которой модуль
//    считается «убежавшим» от группы. Soft limit: блокируем drag и
//    редиректим создание в свободное место рядом.
//    Chebyshev по прямоугольникам, ~1 пустой экран по X (80*20=1600px).
export const MAX_SANE_DISTANCE_GRID = 80;

// ⭐ Цвета minimap (фиксированные — читаются в обеих темах)
export const MINIMAP_COLORS = {
    voice:        '#3b82f6',   // синий — Voice
    fx:           '#f59e0b',   // янтарный — FX
    output:       '#3ecf6e',   // зелёный — модуль с Output-джеком
    viewport:     'rgba(255, 255, 255, 0.08)',
    viewportEdge: 'rgba(255, 255, 255, 0.55)',
    background:   'rgba(18, 18, 22, 0.78)',
    border:       'rgba(255, 255, 255, 0.12)',
    arrow:        '#ff6b6b',
    arrowBg:      'rgba(255, 107, 107, 0.18)',
    text:         'rgba(255, 255, 255, 0.85)',
};

export const MINIMAP_WIDTH = 220;
export const MINIMAP_HEIGHT = 160;
export const MINIMAP_MARGIN = 16;

// ============================================================
//  MODULE CATEGORIES (Minimap colors)
// ============================================================
//
// Категория берётся ТОЛЬКО из JS-описания модуля: `category: 'osc'`.
// Нет категории / неизвестная → серый (`unknown`).

// Соответствие: группа в ALL_NM2 → ключ в MODULE_CATEGORY_COLORS
export const GROUP_TO_CATEGORY = {
    'In/Out': 'io',
    'Logic':  'logic',
    'Osc':    'osc',
    'FX':     'fx',
    'Switch': 'switch',
    'Mixer':  'mixer',
    'Env':    'env',
    'Note':   'control',     // Note — это скорее control, чем отдельная
    'LFO':    'lfo',
    'Shaper': 'fx',          // Shaper — тоже fx-семейство (или отдельный 'shaper', добавь если хочешь)
    'Filter': 'filter',
    'Level':  'dynamics',    // Level — компрессоры/громкость → dynamics (или 'level', отдельный)
    'MIDI':   'midi',
    'Seq':    'control',
    'Delay':  'fx',
    'Rnd':    'util',
    'Test':   'unknown',     // тестовые модули — серые
};

export const MODULE_CATEGORY_COLORS = {
    // Генераторы / источники
    osc:        '#f97316',   // оранжевый — осцилляторы
    noise:      '#fb923c',   // светло-оранжевый — шум
    sample:     '#fbbf24',   // янтарный — сэмплы / плееры

    // Модуляторы
    lfo:        '#a855f7',   // фиолетовый — LFO
    env:        '#c084fc',   // светло-фиолетовый — огибающие

    // Фильтры / обработка
    filter:     '#06b6d4',   // циан — фильтры
    fx:         '#0ea5e9',   // голубой — эффекты
    dynamics:   '#22d3ee',   // светло-циан — компрессоры / гейты

    // Утилиты / роутинг
    mixer:      '#14b8a6',   // бирюза — микшеры
    switch:     '#10b981',   // зелёный — свитчи / роутинг
    logic:      '#84cc16',   // лайм — логика
    math:       '#eab308',   // жёлтый — математика
    util:       '#94a3b8',   // серый-синий — прочее

    // Ввод / вывод / MIDI
    io:         '#3ecf6e',   // зелёный — Input/Output
    midi:       '#f472b6',   // розовый — MIDI
    control:    '#60a5fa',   // синий — управление

    // Прочее
    custom:     '#a78bfa',   // лаванда — пользовательские
    unknown:    '#64748b',   // серый — без категории
};


export function getModuleCategoryColor(module) {
    const name = module?.jsonName || module?.type || module?.title;
    if (!name) return MODULE_CATEGORY_COLORS.unknown;

    // 1. Явная категория (если когда-нибудь добавишь `category` в JS-описания)
    if (module?.category && MODULE_CATEGORY_COLORS[module.category]) {
        return MODULE_CATEGORY_COLORS[module.category];
    }

    // 2. Группа из ALL_NM2 (ContextMenu — источник правды)
    const group = MODULE_GROUP_OF[name];
    if (group) {
        // Группа → ключ цвета. Можно мапить 1:1 или переименовать.
        const cat = GROUP_TO_CATEGORY[group] || group.toLowerCase();
        return MODULE_CATEGORY_COLORS[cat] || MODULE_CATEGORY_COLORS.unknown;
    }

    // 3. User-модули без категории → custom
    if (module?.isUser) return MODULE_CATEGORY_COLORS.custom;

    return MODULE_CATEGORY_COLORS.unknown;
}