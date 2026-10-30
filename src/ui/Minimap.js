// src/ui/Minimap.js
//
// Minimap в правом верхнем углу — Figma-style:
//   • показывает viewport + запас релевантной области
//   • outlier-ы (дальше MAX_SANE_DISTANCE_GRID от медианы) → стрелки у краёв
//   • клик по модулю → центрировать viewport
//   • клик/драг по карте → пан мира
//   • клик по стрелке → прыжок к ближайшему outlier-у в том направлении
//
// Скрыт по умолчанию. Toggle — кнопка 'Mp' в BottomBar / хоткей 'M'.

import { getCurrentTheme } from '../theme/currentTheme.js';
import {
    BASE_STEP_X,
    BASE_STEP_Y,
    MAX_SANE_DISTANCE_GRID,
    MINIMAP_COLORS,
    MINIMAP_WIDTH,
    MINIMAP_HEIGHT,
    MINIMAP_MARGIN,
    getModuleCategoryColor,
} from '../constants.js';
import {
    median,
    bboxNearModules,
    groupByOctant,
    isOutputModule,
} from '../utils/spatial.js';

export class Minimap {
    constructor(system) {
        this.system = system;
        this.visible = false;
        this.width = MINIMAP_WIDTH;
        this.height = MINIMAP_HEIGHT;

        // Внутреннее состояние
        this._isDragging = false;
        this._dragStartWorld = null; // { x, y } — мировые пиксели под курсором в момент старта
        this._hoverArrowOctant = null;

        this._createDOM();
        this._setupEvents();
    }

    // ============================================================
    //  DOM
    // ============================================================

    _createDOM() {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'csmodular-minimap';
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.style.cssText = `
            position: fixed;
            top: ${MINIMAP_MARGIN}px;
            right: ${MINIMAP_MARGIN}px;
            width: ${this.width}px;
            height: ${this.height}px;
            background: ${MINIMAP_COLORS.background};
            border: 1px solid ${MINIMAP_COLORS.border};
            border-radius: 8px;
            backdrop-filter: blur(8px);
            box-shadow: 0 4px 18px rgba(0, 0, 0, 0.45);
            z-index: 13000;
            display: none;
            cursor: pointer;
            user-select: none;
            pointer-events: auto;
        `;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');
    }

    _setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseleave', () => {
            this._hoverArrowOctant = null;
            this.canvas.style.cursor = 'pointer';
        });
        // mouseup — глобальный, чтобы drag не терялся за пределами карты
        window.addEventListener('mouseup', (e) => this._onMouseUp(e));
    }

    // ============================================================
    //  PUBLIC
    // ============================================================

    show() {
        this.visible = true;
        this.canvas.style.display = 'block';
        this._markDirty();
    }

    hide() {
        this.visible = false;
        this.canvas.style.display = 'none';
        this._isDragging = false;
    }

    toggle() {
        if (this.visible) this.hide();
        else this.show();
    }

    /** Пометить minimap на перерисовку (вызывается из main.js). */
    _markDirty() {
        this._dirty = true;
    }

    // ============================================================
    //  ГЕОМЕТРИЯ
    // ============================================================

    /** Все модули патча. */
    _allModules() {
        const lm = this.system.layerManager;
        if (!lm) return [];
        return [
            ...(lm.layers.voice?.modules || []),
            ...(lm.layers.fx?.modules || []),
        ];
    }

    /** Viewport в grid-координатах. */
    _viewportGridBounds() {
        const s = this.system;
        // ⭐ Физ. размер canvas / dpr = CSS-размер. dpr захардкожен 1 в resizeCanvasToWindow,
        //    но подстрахуемся.
        const dpr = s.canvas.width / (s.canvas.clientWidth || s.canvas.width) || 1;
        const w = s.canvas.width / dpr;
        const h = s.canvas.height / dpr;
        return {
            minX: -s.offsetX / s.scale / BASE_STEP_X,
            maxX: (w - s.offsetX) / s.scale / BASE_STEP_X,
            minY: -s.offsetY / s.scale / BASE_STEP_Y,
            maxY: (h - s.offsetY) / s.scale / BASE_STEP_Y,
        };
    }

    /**
     * Релевантная область мира для отображения:
     * bbox модулей в радиусе MAX от медианы + запас по viewport.
     */
    _computeWorldBounds() {
        const modules = this._allModules();

        if (modules.length === 0) {
            // Пустой мир: показываем только viewport с запасом
            const vp = this._viewportGridBounds();
            const padX = Math.max(20, (vp.maxX - vp.minX) * 0.2);
            const padY = Math.max(20, (vp.maxY - vp.minY) * 0.2);
            return {
                minX: vp.minX - padX, maxX: vp.maxX + padX,
                minY: vp.minY - padY, maxY: vp.maxY + padY,
                cx: (vp.minX + vp.maxX) / 2,
                cy: (vp.minY + vp.maxY) / 2,
                empty: true,
            };
        }

        const cx = median(modules.map(m => m.gridX + m.gridWidth / 2));
        const cy = median(modules.map(m => m.gridY + m.gridHeight / 2));

        const bbox = bboxNearModules(modules, cx, cy, MAX_SANE_DISTANCE_GRID);
        if (!bbox) return null;

        // ⭐ Только bbox модулей — viewport НЕ включаем.
        //    Иначе при пане/зуме bbox "прыгает", модули сжимаются в точку.
        const bw = bbox.maxX - bbox.minX;
        const bh = bbox.maxY - bbox.minY;
        const padX = Math.max(10, bw * 0.2);
        const padY = Math.max(10, bh * 0.2);

        return {
            minX: bbox.minX - padX,
            maxX: bbox.maxX + padX,
            minY: bbox.minY - padY,
            maxY: bbox.maxY + padY,
            cx, cy,
            empty: false,
        };
    }

    /**
     * Преобразование grid → canvas (внутри minimap).
     * Возвращает функции scale/offset для повторного использования.
     */
    _makeTransform(bounds) {
        const inner = {
            x: 8,
            y: 8,
            w: this.width - 16,
            h: this.height - 16,
        };
        const worldW = bounds.maxX - bounds.minX || 1;
        const worldH = bounds.maxY - bounds.minY || 1;
        // Сохраняем пропорции
        const scale = Math.min(inner.w / worldW, inner.h / worldH);
        const offsetX = inner.x + (inner.w - worldW * scale) / 2;
        const offsetY = inner.y + (inner.h - worldH * scale) / 2;

        return {
            toCanvas: (gx, gy) => ({
                x: offsetX + (gx - bounds.minX) * scale,
                y: offsetY + (gy - bounds.minY) * scale,
            }),
            toGrid: (cx, cy) => ({
                x: (cx - offsetX) / scale + bounds.minX,
                y: (cy - offsetY) / scale + bounds.minY,
            }),
            scale,
            inner,
        };
    }

    /** Outlier-модули: центр дальше MAX от медианы. */
    _getOutliers(bounds) {
        if (bounds.empty) return [];
        const modules = this._allModules();
        return modules.filter(m => {
            const mcx = m.gridX + m.gridWidth / 2;
            const mcy = m.gridY + m.gridHeight / 2;
            const d = Math.max(Math.abs(mcx - bounds.cx), Math.abs(mcy - bounds.cy));
            return d > MAX_SANE_DISTANCE_GRID;
        });
    }

    // ============================================================
    //  РЕНДЕР
    // ============================================================

    draw() {
        if (!this.visible) return;
        const ctx = this.ctx;
        const theme = getCurrentTheme();

        ctx.clearRect(0, 0, this.width, this.height);

        // Фон уже в CSS (background); здесь только контент
        const bounds = this._computeWorldBounds();
        if (!bounds) return;

        const t = this._makeTransform(bounds);
        const modules = this._allModules();

        // 1. Модули в пределах bbox
        for (const m of modules) {
            const mcx = m.gridX + m.gridWidth / 2;
            const mcy = m.gridY + m.gridHeight / 2;
            const d = Math.max(Math.abs(mcx - bounds.cx), Math.abs(mcy - bounds.cy));
            if (d > MAX_SANE_DISTANCE_GRID) continue; // outlier

            const p = t.toCanvas(m.gridX, m.gridY);
            const w = Math.max(2, m.gridWidth * t.scale);
            const h = Math.max(2, m.gridHeight * t.scale);

            // ⭐ Цвет по категории. Output-модули — акцентный зелёный.
            //    Нет категории → серый (unknown). Layer НЕ учитывается.
            const color = isOutputModule(m)
                ? MINIMAP_COLORS.output
                : getModuleCategoryColor(m);

            ctx.fillStyle = color;
            ctx.fillRect(p.x, p.y, w, h);
        }

        // 2. Viewport-рамка
        this._drawViewport(ctx, t, theme);

        // 3. Стрелки-outlier-ы
        this._drawOutlierArrows(ctx, bounds, t);

        // 4. Тонкая сетка-крестики (опционально, для стиля)
        // не рисуем — перегружает

        this._dirty = false;
    }

    _drawViewport(ctx, t, theme) {
        const vp = this._viewportGridBounds();
        const p1 = t.toCanvas(vp.minX, vp.minY);
        const p2 = t.toCanvas(vp.maxX, vp.maxY);

        // Ограничиваем рамку inner-областью
        const x1 = Math.max(t.inner.x, p1.x);
        const y1 = Math.max(t.inner.y, p1.y);
        const x2 = Math.min(t.inner.x + t.inner.w, p2.x);
        const y2 = Math.min(t.inner.y + t.inner.h, p2.y);

        if (x2 <= x1 || y2 <= y1) return;

        ctx.fillStyle = MINIMAP_COLORS.viewport;
        ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

        ctx.strokeStyle = MINIMAP_COLORS.viewportEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(x1 + 0.5, y1 + 0.5, x2 - x1 - 1, y2 - y1 - 1);
    }

    _drawOutlierArrows(ctx, bounds, t) {
        const outliers = this._getOutliers(bounds);
        if (outliers.length === 0) return;

        const groups = groupByOctant(outliers, bounds.cx, bounds.cy);

        for (const [oct, mods] of Object.entries(groups)) {
            if (mods.length === 0) continue;
            const anchor = this._arrowAnchor(oct, t.inner);
            const isHover = this._hoverArrowOctant === oct;

            this._drawArrow(
                ctx,
                anchor.x, anchor.y, oct,
                mods.length,
                isHover,
            );
        }
    }

    _arrowAnchor(oct, inner) {
        const cx = inner.x + inner.w / 2;
        const cy = inner.y + inner.h / 2;
        const r = 0.5; // насколько близко к краю (0.5 = ровно у края)
        const off = 10; // отступ от края

        const pos = {
            N:  { x: cx, y: inner.y + off },
            NE: { x: inner.x + inner.w - off, y: inner.y + off },
            E:  { x: inner.x + inner.w - off, y: cy },
            SE: { x: inner.x + inner.w - off, y: inner.y + inner.h - off },
            S:  { x: cx, y: inner.y + inner.h - off },
            SW: { x: inner.x + off, y: inner.y + inner.h - off },
            W:  { x: inner.x + off, y: cy },
            NW: { x: inner.x + off, y: inner.y + off },
        };
        return pos[oct] || { x: cx, y: cy };
    }

    _drawArrow(ctx, x, y, dir, count, hover) {
        // Треугольник, направленный наружу
        const size = hover ? 7 : 5;
        const angles = {
            N: -Math.PI / 2,
            NE: -Math.PI / 4,
            E: 0,
            SE: Math.PI / 4,
            S: Math.PI / 2,
            SW: (3 * Math.PI) / 4,
            W: Math.PI,
            NW: -(3 * Math.PI) / 4,
        };
        const a = angles[dir] ?? 0;

        // Фон-кружок для читаемости
        ctx.fillStyle = hover ? 'rgba(255,107,107,0.35)' : MINIMAP_COLORS.arrowBg;
        ctx.beginPath();
        ctx.arc(x, y, size + 4, 0, Math.PI * 2);
        ctx.fill();

        // Треугольник
        ctx.fillStyle = MINIMAP_COLORS.arrow;
        ctx.beginPath();
        const p1 = {
            x: x + Math.cos(a) * (size + 2),
            y: y + Math.sin(a) * (size + 2),
        };
        const p2 = {
            x: x + Math.cos(a + 2.5) * size,
            y: y + Math.sin(a + 2.5) * size,
        };
        const p3 = {
            x: x + Math.cos(a - 2.5) * size,
            y: y + Math.sin(a - 2.5) * size,
        };
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fill();

        // Счётчик
        if (count > 1) {
            ctx.fillStyle = MINIMAP_COLORS.text;
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`×${count}`, x + size + 4, y);
        }
    }

    // ============================================================
    //  ВЗАИМОДЕЙСТВИЕ
    // ============================================================

    _localPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }

    _onMouseDown(e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        const pos = this._localPos(e);
        const bounds = this._computeWorldBounds();
        if (!bounds) return;
        const t = this._makeTransform(bounds);

        // 1. Клик по стрелке-outlier-у?
        const outliers = this._getOutliers(bounds);
        if (outliers.length > 0) {
            const groups = groupByOctant(outliers, bounds.cx, bounds.cy);
            for (const [oct, mods] of Object.entries(groups)) {
                if (mods.length === 0) continue;
                const anchor = this._arrowAnchor(oct, t.inner);
                const dx = pos.x - anchor.x;
                const dy = pos.y - anchor.y;
                if (Math.hypot(dx, dy) <= 14) {
                    this._jumpToModule(mods[0]);
                    return;
                }
            }
        }

        // 2. Клик по модулю на карте → центрировать
        const clicked = this._hitTestModule(pos, t, bounds);
        if (clicked) {
            this._jumpToModule(clicked);
            return;
        }

        // 3. Иначе — drag: пан мира.
        //    ⭐ Запоминаем пиксельную позицию курсора и текущий offset.
        //    Дальше двигаем offset на пиксельную дельту — без пересчёта t.
        this._isDragging = true;
        this._dragStartPos = { x: pos.x, y: pos.y };
        this._dragStartOffset = {
            x: this.system.offsetX,
            y: this.system.offsetY,
        };
        // ⭐ Масштаб мира в пикселях minimap — фиксируем один раз.
        //    worldPerCanvasPx = 1 / (t.scale * BASE_STEP)
        this._dragScale = {
            x: (bounds.maxX - bounds.minX) * BASE_STEP_X / t.inner.w,
            y: (bounds.maxY - bounds.minY) * BASE_STEP_Y / t.inner.h,
        };
        this.canvas.style.cursor = 'grabbing';
    }

    _onMouseMove(e) {
        const pos = this._localPos(e);

        // ⭐ DRAG — только здесь, БЕЗ пересчёта bounds/t
        if (this._isDragging && this._dragStartPos) {
            const dCanvasX = pos.x - this._dragStartPos.x;
            const dCanvasY = pos.y - this._dragStartPos.y;

            // Пиксели minimap → пиксели мира (в base-cells → пиксели экрана)
            const dWorldX = dCanvasX * this._dragScale.x;
            const dWorldY = dCanvasY * this._dragScale.y;

            // Тянем карту вправо → мир "уезжает" вправо → offset уменьшается
            this.system.offsetX = this._dragStartOffset.x - dWorldX * this.system.scale;
            this.system.offsetY = this._dragStartOffset.y - dWorldY * this.system.scale;
            this.system.forceRedraw?.();
            this._markDirty();
            return;
        }

        // Hover над стрелкой — только когда не drag
        const bounds = this._computeWorldBounds();
        if (!bounds) return;
        const t = this._makeTransform(bounds);

        const outliers = this._getOutliers(bounds);
        let hoverOct = null;
        if (outliers.length > 0) {
            const groups = groupByOctant(outliers, bounds.cx, bounds.cy);
            for (const [oct, mods] of Object.entries(groups)) {
                if (mods.length === 0) continue;
                const anchor = this._arrowAnchor(oct, t.inner);
                if (Math.hypot(pos.x - anchor.x, pos.y - anchor.y) <= 14) {
                    hoverOct = oct;
                    break;
                }
            }
        }
        if (hoverOct !== this._hoverArrowOctant) {
            this._hoverArrowOctant = hoverOct;
            this._markDirty();
        }
        this.canvas.style.cursor = hoverOct ? 'pointer' : 'grab';
    }

    _onMouseUp() {
        if (!this._isDragging) return;
        this._isDragging = false;
        this._dragStartPos = null;
        this._dragStartOffset = null;
        this._dragScale = null;
        this.canvas.style.cursor = 'grab';
    }

    _hitTestModule(pos, t, bounds) {
        const modules = this._allModules();
        // Идём с конца — верхние модули (fx) перекрывают voice
        for (let i = modules.length - 1; i >= 0; i--) {
            const m = modules[i];
            const mcx = m.gridX + m.gridWidth / 2;
            const mcy = m.gridY + m.gridHeight / 2;
            const d = Math.max(Math.abs(mcx - bounds.cx), Math.abs(mcy - bounds.cy));
            if (d > MAX_SANE_DISTANCE_GRID) continue;

            const p = t.toCanvas(m.gridX, m.gridY);
            const w = Math.max(3, m.gridWidth * t.scale);
            const h = Math.max(3, m.gridHeight * t.scale);
            if (pos.x >= p.x && pos.x <= p.x + w
                && pos.y >= p.y && pos.y <= p.y + h) {
                return m;
            }
        }
        return null;
    }

    _jumpToModule(module) {
        const s = this.system;
        if (!module || !s.canvas) return;
        const cx = module.gridX + module.gridWidth / 2;
        const cy = module.gridY + module.gridHeight / 2;
        const newOX = s.canvas.width  / 2 - cx * BASE_STEP_X * s.scale;
        const newOY = s.canvas.height / 2 - cy * BASE_STEP_Y * s.scale;
        if (!Number.isFinite(newOX) || !Number.isFinite(newOY)) {
            console.warn('[Minimap] _jumpToModule: non-finite offset', newOX, newOY);
            return;
        }
        s.offsetX = newOX;
        s.offsetY = newOY;
        s.forceRedraw?.();
        this._markDirty();
    }
}