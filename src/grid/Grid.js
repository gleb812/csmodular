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

        // ⭐ Подхватываем настройки из темы (если уже инициализирована)
        this.applyThemeSettings();
    }

    /**
     * Прочитать multX/multY/snap из текущей темы.
     * @returns {boolean} true, если что-то изменилось
     */
    applyThemeSettings() {
        const theme = getCurrentTheme();
        const grid = theme?.settings?.grid;
        if (!grid) return false;

        const mx = Math.max(1, Math.round(grid.multX ?? 1));
        const my = Math.max(1, Math.round(grid.multY ?? 1));
        const snap = grid.snap !== false;

        const changed = (this.multX !== mx) || (this.multY !== my) || (this.snap !== snap);

        this.multX = mx;
        this.multY = my;
        this.snap = snap;

        return changed;
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
        const cellX = worldX / BASE_STEP_X;
        const cellY = worldY / BASE_STEP_Y;

        if (!this.snap) {
            return {
                gridX: Math.round(cellX),
                gridY: Math.round(cellY),
            };
        }

        return {
            gridX: Math.round(cellX / this.multX) * this.multX,
            gridY: Math.round(cellY / this.multY) * this.multY,
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
        if (!this.enabled) return;

        const theme = getCurrentTheme();
        const style = theme.getGridStyle();
        const { offsetX, offsetY, scale, width, height } = viewport;

        // Видимая область в мировых координатах
        const worldLeft   = -offsetX / scale;
        const worldTop    = -offsetY / scale;
        const worldRight  = (width  - offsetX) / scale;
        const worldBottom = (height - offsetY) / scale;

        // Шаг крестиков (мировые px)
        const stepX = this.stepX;
        const stepY = this.stepY;

        // Первый/последний крестик в видимой области
        const startX = Math.floor(worldLeft  / stepX) * stepX;
        const endX   = Math.ceil (worldRight / stepX) * stepX;
        const startY = Math.floor(worldTop   / stepY) * stepY;
        const endY   = Math.ceil (worldBottom/ stepY) * stepY;

        // Размер крестика — constant в экранных пикселях
        // (рисуем внутри scale-трансформа, компенсируем размер)
        const size = style.size / scale;       // длина луча
        const lw   = style.lineWidth / scale;  // толщина

        ctx.save();
        ctx.strokeStyle = style.color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';

        if (style.glow) {
            theme.applyGlow(ctx);
        }

        // Рисуем крестики пакетно (один path на всё — быстрее)
        ctx.beginPath();
        for (let wx = startX; wx <= endX; wx += stepX) {
            for (let wy = startY; wy <= endY; wy += stepY) {
                // Крестик: горизонтальный луч + вертикальный
                ctx.moveTo(wx - size, wy);
                ctx.lineTo(wx + size, wy);
                ctx.moveTo(wx, wy - size);
                ctx.lineTo(wx, wy + size);
            }
        }
        ctx.stroke();

        if (style.glow) {
            theme.clearGlow(ctx);
        }

        ctx.restore();
    }
}