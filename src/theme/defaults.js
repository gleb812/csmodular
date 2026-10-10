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

    background: {
        image: null,  // или null — если фон выключен
        parallax: true,                      // parallax-эффект включён?
        parallaxStrength: 20,                // сила смещения
    },
};

// Пресеты фонов
export const BACKGROUND_PRESETS = [
    { name: 'None',      value: null },
    // --- Solid colors ---
    { name: 'Black',     value: '#000000' },
    { name: 'Dark Gray', value: '#1a1a1a' },
    { name: 'Gray',      value: '#333333' },
    // --- Images ---
    { name: 'Dark',      value: '/backgrounds/dark.jpg' },
    { name: 'Abstract',  value: '/backgrounds/abstract.jpg' },
    { name: 'Glass',     value: '/backgrounds/glass.jpg' },
];

// Пресеты ЖК-цветов (для UI выбора)
export const LCD_COLOR_PRESETS = [
    { name: 'Casio Green', value: '#8fbc8f' },
    { name: 'Amber CRT',   value: '#ffb347' },
    { name: 'Ice Blue',    value: '#a4d8e1' },
    { name: 'Pure White',  value: '#e0e0e0' },
    { name: 'Cyan',        value: '#4ec9c9' },
    { name: 'Magenta',     value: '#d989c9' },
    { name: 'Steel',       value: '#8a8a8a' },   // ← ⭐ тёмно-серый
    { name: 'Charcoal',    value: '#4a4a4a' },   // ← ⭐ графит
    { name: 'Black',       value: '#1a1a1a' },   // ← ⭐ почти чёрный
];