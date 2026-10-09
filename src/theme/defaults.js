// src/theme/defaults.js
//
// Значения темы по умолчанию.
// Используются при первом запуске и при сбросе.

export const DEFAULT_THEME = {
    preset: 'classic',  // 'classic' | 'lcd'

    lcd: {
        color: '#4ec9c9',       // ЖК-цвет (оливково-зелёный, как Casio)
        glow: 0.2,              // Свечение 0..1
        panelOpacity: 0.15,     // Прозрачность фона панели 0..1
        lineWeight: 0.2,        // Множитель толщины линий 0.5..2
    },

    cables: {
        audioWidth: 3.0,
        controlWidth: 1.5,
        glow: false,   // ← отдельный флаг для кабелей
    },
};

// Пресеты ЖК-цветов (для UI выбора)
export const LCD_COLOR_PRESETS = [
    { name: 'Casio Green', value: '#8fbc8f' },
    { name: 'Amber CRT',   value: '#ffb347' },
    { name: 'Ice Blue',    value: '#a4d8e1' },
    { name: 'Pure White',  value: '#e0e0e0' },
    { name: 'Cyan',        value: '#4ec9c9' },
    { name: 'Magenta',     value: '#d989c9' },
];