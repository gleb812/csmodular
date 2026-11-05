// src/grid/Grid.js
//
// Сетка мира: шаг, прилипание, отрисовка крестиков.
//
// Позиция модуля хранится в grid-координатах (целые числа клеток).
// BASE_STEP_X/Y — цена клетки в пикселях.
// multX/multY — множители шага (из темы), по умолчанию 1.
//
// При multX = 2 крестики рисуются реже (шаг 40px), модуль прыгает на 40px.
// Существующие модули НЕ двигаются при смене множителя — только следующий drag.

import { BASE_STEP_X, BASE_STEP_Y } from '../constants.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class Grid {
    constructor() {
        this.multX = 1;
        this.multY = 1;
        this.snap = true;
        this.enabled = true;
    }

    applyThemeSettings() {
        // Настройки сетки больше не читаются из темы.
        // Snap всегда включён, шаг всегда 1×1.
        this.multX = 1;
        this.multY = 1;
        this.snap = true;
        return false;
    }

    // ============================================================
    //  ШАГ (производное от множителей)
    // ============================================================

    get stepX() {
        return BASE_STEP_X * this.multX;
    }

    get stepY() {
        return BASE_STEP_Y * this.multY;
    }

    // ============================================================
    //  КОНВЕРТАЦИИ (в базовых клетках, не в шаге!)
    // ============================================================

    /**
     * Мировые пиксели → grid-координаты (в базовых клетках).
     * Возвращает дробные значения, если позиция не на клетке.
     */
    worldToGrid(worldX, worldY) {
        return {
            gridX: worldX / BASE_STEP_X,
            gridY: worldY / BASE_STEP_Y,
        };
    }

    /**
     * Grid-координаты → мировые пиксели.
     */
    gridToWorld(gridX, gridY) {
        return {
            x: gridX * BASE_STEP_X,
            y: gridY * BASE_STEP_Y,
        };
    }

    // ============================================================
    //  ПРИЛИПАНИЕ
    // ============================================================

    /**
     * Мировые координаты → ближайшая разрешённая grid-позиция.
     *
     * Snap ON:  округляем до кратного multX/multY (в базовых клетках).
     * Snap OFF: округляем до ближайшей базовой клетки (целое).
     *
     * Возвращает { gridX, gridY } — целые.
     */
    snapToGrid(worldX, worldY) {
        return {
            gridX: Math.round(worldX / BASE_STEP_X),
            gridY: Math.round(worldY / BASE_STEP_Y),
        };
    }

    // ============================================================
    //  ОТРИСОВКА
    // ============================================================

    /**
     * Нарисовать крестики в видимой области.
     *
     * @param {CanvasRenderingContext2D} ctx — контекст БЕЗ трансформа
     * @param {object} viewport — { offsetX, offsetY, scale, width, height }
     */
    draw(ctx, viewport) {
        // Visual grid removed (performance).
        // Snap and multipliers still active via snapToGrid().
    }
}