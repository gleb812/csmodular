// src/constants.js

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