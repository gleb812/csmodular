// src/theme/Theme.js
//
// Класс-обёртка над настройками темы.
// Знает, как преобразовать настройки в конкретные значения
// для рисования: цвета, толщины, свечение.
//
// Компоненты вызывают методы этого класса, а не читают
// настройки напрямую. Это позволяет менять логику темы
// в одном месте.

export class Theme {
    constructor(settings) {
        // Гарантируем, что все секции есть
        this.settings = {
            preset: settings?.preset || 'classic',
            lcd: {
                color: '#8fbc8f',
                glow: 0.5,
                panelOpacity: 0.15,
                lineWeight: 1.0,
                ...(settings?.lcd || {}),  // перезаписываем сохранёнными
            },
            cables: {
                audioWidth: 3.0,
                controlWidth: 1.5,
                ...(settings?.cables || {}),
            },
        };
    }

    // ============================================================
    //  ОБЩИЕ
    // ============================================================

    get preset() {
        return this.settings.preset || 'classic';
    }

    get isClassic() {
        return this.preset === 'classic';
    }

    get isLcd() {
        return this.preset === 'lcd';
    }

    // ============================================================
    //  ЖК-ЦВЕТ И СВЕЧЕНИЕ
    // ============================================================

    /** Основной цвет линий (обводки, текст, джеки) */
    getLineColor() {
        if (this.isClassic) return null; // null = компонент использует свой classic-цвет
        return this.settings.lcd?.color || '#8fbc8f';
    }

    /** Цвет текста */
    getTextColor() {
        if (this.isClassic) return null;
        return this.settings.lcd?.color || '#8fbc8f';
    }

    /** Цвет «активного» элемента (нажат, горит) */
    getActiveColor() {
        if (this.isClassic) return null;
        return this.settings.lcd?.color || '#8fbc8f';
    }

    /** Степень свечения 0..1 */
    getGlow() {
        if (this.isClassic) return 0;
        return this.settings.lcd?.glow ?? 0.5;
    }

    /**
     * Применить свечение к контексту.
     * Вызывается ПЕРЕД рисованием линий/текста.
     * НЕ забывай сбросить после — см. clearGlow().
     */
    applyGlow(ctx) {
        const glow = this.getGlow();
        if (glow > 0 && this.isLcd) {
            const color = this.getLineColor();
            ctx.shadowBlur = 8 * glow;
            ctx.shadowColor = color;
        }
    }

    /** Сбросить свечение. Вызывать после рисования. */
    clearGlow(ctx) {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }

    // ============================================================
    //  ПАНЕЛЬ
    // ============================================================

    /**
     * Цвет фона панели.
     * Classic: null → Panel использует свой customColor.
     * LCD:     rgba с прозрачностью panelOpacity.
     */
    getPanelBackgroundColor() {
        if (this.isClassic) return null;
        const color = this.settings.lcd?.color || '#8fbc8f';
        const opacity = this.settings.lcd?.panelOpacity ?? 0.15;
        return this._hexToRgba(color, opacity);
    }

    /** Цвет рамки панели */
    getPanelBorderColor() {
        if (this.isClassic) return null;
        return this.settings.lcd?.color || '#8fbc8f';
    }

    // ============================================================
    //  ТОЛЩИНА ЛИНИЙ
    // ============================================================

    /**
     * Толщина линии с учётом множителя темы.
     * @param {number} baseWidth — базовый размер в пикселях
     */
    lineWidth(baseWidth) {
        return baseWidth * this.getLineWeight();
    }

    /** Базовый множитель толщины линий (0.5..2) */
    getLineWeight() {
        if (this.isClassic) return 1.0;
        return this.settings.lcd?.lineWeight ?? 1.0;
    }

    // ============================================================
    //  КАБЕЛИ
    // ============================================================

    /**
     * Настройки отображения джека в текущей теме.
     * @param {'audio'|'control'|'logic'|'other'} type
     * @param {'connected'|'disconnected'} state
     * @returns {{ fill: string|null, stroke: string, strokeWidth: number, glow: boolean, centerFill: string }}
     */
    getJackStyle(type, state = 'disconnected') {
        if (this.isClassic) {
            return {
                fill: null,              // компонент использует свой typeColors
                stroke: null,
                strokeWidth: null,
                glow: false,
                centerFill: null,        // компонент использует свой centerColor
            };
        }

        const accent = this.getAccentColor();
        const isAudio = type === 'audio';

        // Аудио — с заливкой цветом темы
        // Остальные — только контур
        return {
            fill: isAudio ? accent : null,
            stroke: accent,
            strokeWidth: this.lineWidth(1),
            glow: true,
            centerFill: accent,          // центр всегда цветом темы
        };
    }


    // ============================================================
    //  КАБЕЛИ
    // ============================================================

    /**
     * Толщина кабеля по типу.
     * @param {'audio'|'control'|'logic'|'other'} type
     */
    getCableWidth(type) {
        if (this.isClassic) {
            return 3; // classic — все кабели одинаковой толщины (как было)
        }
        const cables = this.settings.cables || {};
        if (type === 'audio')   return cables.audioWidth   ?? 3.0;
        if (type === 'control') return cables.controlWidth ?? 1.5;
        return cables.controlWidth ?? 1.5;
    }

    /**
     * Цвет кабеля по типу.
     * Classic: null → компонент использует typeColor.
     * LCD:     цвет темы. Аудио — яркий, контроль — полупрозрачный.
     */
    getCableColor(type) {
        if (this.isClassic) return null;
        const accent = this.getAccentColor();
        if (type === 'audio')   return accent;
        if (type === 'control') return this.getAccentAlpha(0.55);
        return this.getAccentAlpha(0.55);
    }

    /**
     * Свечение для кабеля (LCD).
     */
    shouldGlowCable() {
        return this.isLcd && this.settings.cables?.glow !== false && this.getGlow() > 0;
    }


    // ============================================================
    //  СЕМАНТИЧЕСКИЕ ЦВЕТА (используй их в компонентах!)
    // ============================================================

    /**
     * Основной акцентный цвет (ЖК-пиксели).
     * В classic возвращает null — компонент использует свой.
     */
    getAccentColor() {
        if (this.isClassic) return null;
        return this.settings.lcd?.color || '#8fbc8f';
    }

    /**
     * Цвет с прозрачностью (для фонов, обводок с альфой).
     * @param {number} alpha
     */
    getAccentAlpha(alpha = 1) {
        if (this.isClassic) return null;
        return this._hexToRgba(this.getAccentColor(), alpha);
    }

    /**
     * Фон «поверхности» (панель модуля).
     */
    getSurfaceColor() {
        if (this.isClassic) return null;
        const opacity = this.settings.lcd?.panelOpacity ?? 0.15;
        return this.getAccentAlpha(opacity);
    }

    /**
     * Фон «элемента» (кноб, слайдер-трек).
     * Чуть плотнее, чем просто прозрачный.
     * @param {number} intensity — 0..1, где 0 = очень слабо, 1 = плотно
     */
    getElementBgColor(intensity = 0.5) {
        if (this.isClassic) return null;
        // Варьируем прозрачность от 0.02 до 0.15
        const alpha = 0.02 + 0.13 * intensity;
        return this.getAccentAlpha(alpha);
    }

    /**
     * Фон тултипа (всплывающей подсказки).
     */
    getTooltipBgColor() {
        if (this.isClassic) return null;
        return 'rgba(0, 0, 0, 0.55)';
    }

    /**
     * Цвет текста в тултипе.
     */
    getTooltipTextColor() {
        if (this.isClassic) return null;
        return this.getAccentColor();
    }

    /**
     * Цвет заливки активного элемента (LED горит, кнопка нажата).
     */
    getActiveFillColor() {
        if (this.isClassic) return null;
        return this.getAccentColor();
    }

    /**
     * Цвет «неактивного» контура (LED не горит, кнопка выключена).
     * Слабая версия акцента.
     */
    getInactiveOutlineColor() {
        if (this.isClassic) return null;
        return this.getAccentAlpha(0.4);
    }

    /**
     * «Тёмный» нейтральный цвет для pressed/hover состояний.
     * @param {'hover'|'pressed'} state
     */
    getNeutralStateColor(state = 'hover') {
        if (this.isClassic) return null;
        const base = this.getAccentColor();
        // В ЖК — слегка затемнённый акцент
        if (state === 'pressed') return this._darken(base, 0.3);
        return this._darken(base, 0.15);
    }

    /**
     * Утилита: затемнить hex-цвет на factor (0..1).
     * @private
     */
    _darken(hex, factor = 0.2) {
        let h = hex.replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = Math.floor(parseInt(h.substring(0, 2), 16) * (1 - factor));
        const g = Math.floor(parseInt(h.substring(2, 4), 16) * (1 - factor));
        const b = Math.floor(parseInt(h.substring(4, 6), 16) * (1 - factor));
        return `rgb(${r}, ${g}, ${b})`;
    }


    // ============================================================
    //  УТИЛИТЫ
    // ============================================================

    /**
     * #RRGGBB → rgba(r,g,b,a)
     * @private
     */
    _hexToRgba(hex, alpha = 1) {
        let h = hex.replace('#', '');
        if (h.length === 3) {
            h = h.split('').map(c => c + c).join('');
        }
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Проверить, что тема «пустая» (classic).
     * Удобно для компонентов, чтобы быстро вернуться к старому поведению.
     */
    isDefault() {
        return this.isClassic;
    }
}