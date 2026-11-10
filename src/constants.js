// src/constants.js
import { isValidCategory } from './moduleCategories.js';

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

// ⭐ Soft limit: минимальная дистанция (в базовых клетках)
export const MAX_SANE_DISTANCE_GRID = 80;

// ⭐ Цвета minimap
export const MINIMAP_COLORS = {
    voice:        '#3b82f6',
    fx:           '#f59e0b',
    output:       '#3ecf6e',
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

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 1.5;

// ============================================================
//  MODULE CATEGORIES (Minimap colors)
// ============================================================
//
// Категория берётся ТОЛЬКО из JS-описания модуля: `category: 'osc'`.
// Нет категории / неизвестная → серый (`unknown`).

export const MODULE_CATEGORY_COLORS = {
    osc:        '#f97316',
    noise:      '#fb923c',
    sample:     '#fbbf24',

    lfo:        '#a855f7',
    env:        '#c084fc',

    filter:     '#06b6d4',
    fx:         '#0ea5e9',
    dynamics:   '#22d3ee',

    mixer:      '#14b8a6',
    switch:     '#10b981',
    logic:      '#84cc16',
    math:       '#eab308',
    util:       '#94a3b8',

    io:         '#3ecf6e',
    midi:       '#f472b6',
    control:    '#60a5fa',

    custom:     '#a78bfa',
    unknown:    '#64748b',
};

export function getModuleCategoryColor(module) {
    // 1. Явная валидная категория
    if (isValidCategory(module?.category)) {
        return MODULE_CATEGORY_COLORS[module.category] ?? MODULE_CATEGORY_COLORS.unknown;
    }

    // 2. User-модули без категории → custom
    if (module?.isUser) return MODULE_CATEGORY_COLORS.custom;

    // 3. Всё остальное → unknown
    return MODULE_CATEGORY_COLORS.unknown;
}