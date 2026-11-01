// src/moduleCategories.js
//
// Единственный источник правды о категориях модулей.
// Используется ContextMenu (группировка), Minimap (цвета), валидацией библиотек.
//
// НОВОЕ (library system):
//   - CATEGORIES — фиксированный enum. Создатель модуля обязан указать
//     `category` из этого списка в JS-описании. Новые категории не добавляются
//     без правки этого файла (защита от зоопарка).
//   - ALL_NM2 / MODULE_GROUP_OF — @deprecated fallback для старых модулей
//     без `category`. После миграции штатных модулей будут удалены.

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

// ============================================================
//  @deprecated — fallback для старых модулей без category
// ============================================================

/**
 * @deprecated Используется только как fallback для модулей,
 * у которых нет поля `category`. После миграции штатных модулей — удалить.
 */
export const ALL_NM2 = {
    'In/Out': ['In2', 'Out2', 'In4', 'Out4', 'Device', 'FxIn', 'Keyboard', 'MonoKey', 'Name', 'NoteDet', 'Status'],
    'Logic':  ['8Counter', 'ADConv', 'BinCounter', 'ClkDiv', 'DAConv', 'Delay', 'FlipFlop', 'Gate', 'Invert', 'Pulse'],
    'Osc':    ['DXRouter', 'Driver', 'DrumSynth', 'MetNoise', 'Noise', 'Operator', 'OscA', 'OscB', 'OscC', 'OscD', 'OscDual', 'OscMaster', 'OscNoise', 'OscPM', 'OscPerc', 'OscShpA', 'OscShpB', 'OscString', 'Resonator'],
    'FX':     ['Compressor', 'Digitizer', 'Flanger', 'FreqShift', 'PShift', 'Phaser', 'Reverb', 'Scratch', 'StChorus'],
    'Switch': ['Mux18', 'Mux81', 'Mux81X', 'SH', 'Sw12', 'Sw12M', 'Sw14', 'Sw18', 'Sw21', 'Sw21M', 'Sw41', 'Sw81', 'SwOnOffM', 'SwOnOffT', 'T&H', 'ValSw1-2', 'ValSw2-1', 'WindSw'],
    'Mixer':  ['Fade12', 'Fade21', 'Mix11A', 'Mix11S', 'Mix21A', 'Mix21B', 'Mix41A', 'Mix41B', 'Mix41C', 'Mix41S', 'Mix81A', 'Mix81B', 'MixFader', 'MixStereo', 'Pan', 'X-Fade'],
    'Env':    ['EnvADDSR', 'EnvADR', 'EnvADSR', 'EnvAHD', 'EnvD', 'EnvH', 'EnvMulti', 'ModADSR', 'ModAHD'],
    'Note':   ['Glide', 'KeyQuant', 'LevScaler', 'NoteQuant', 'NoteScaler', 'PartQuant', 'PitchTrack', 'ZeroCnt'],
    'LFO':    ['ClkGen', 'LfoA', 'LfoB', 'LfoC', 'LfoShpA'],
    'Shaper': ['Clip', 'Overdrive', 'Rect', 'Saturate', 'ShpExp', 'ShpStatic', 'WaveWrap'],
    'Filter': ['Eq2Band', 'Eq3Band', 'EqPeak', 'FltClassic', 'FltComb', 'FltHP', 'FltLP', 'FltMulti', 'FltNord', 'FltPhase', 'FltStatic', 'FltVoice', 'Vocoder', 'WahWah'],
    'Level':  ['CompLev', 'CompSig', 'ConstSwM', 'ConstSwT', 'Constant', 'EnvFollow', 'LevAdd', 'LevAmp', 'LevConv', 'LevMod', 'LevMult', 'MinMax', 'ModAmt', 'NoiseGate'],
    'MIDI':   ['Automate', 'CtrlRcv', 'CtrlSend', 'NoteRcv', 'NoteSend', 'NoteZone', 'PCSend'],
    'Seq':    ['SeqCtr', 'SeqEvent', 'SeqLev', 'SeqNote', 'SeqVal'],
    'Delay':  ['DelayA', 'DelayB', 'DelayDual', 'DelayQuad', 'DlyClock', 'DlyEight', 'DlyShiftReg', 'DlySingleA', 'DlySingleB', 'DlyStereo'],
    'Rnd':    ['RandomA', 'RandomB', 'RndClkA', 'RndClkB', 'RndPattern', 'RndTrig'],
    'Test':   ['Blue2Red', 'Red2Blue'],
};

/**
 * @deprecated См. ALL_NM2.
 */
export const MODULE_GROUP_OF = (() => {
    const map = {};
    for (const [group, mods] of Object.entries(ALL_NM2)) {
        for (const m of mods) map[m] = group;
    }
    return map;
})();