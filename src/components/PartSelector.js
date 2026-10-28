// components/PartSelector.js
import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class PartSelector extends BaseComponent {
    constructor(x, y, width = 100, height = 30, items = null, selectedIndex = 0) {
        super(x, y, width, height);

        this.isInteractive = true;
        this.supportsDrag = false;

        // ⭐ Единственный источник правды
        this._items = this._normalize(items);

        // selectedIndex — текущее = дефолтное значение
        this.selectedIndex = this._clampIndex(selectedIndex);

        // Состояние UI
        this.isExpanded = false;
        this.isPressed = false;
        this.isHovered = false;
        this.hoveredItemIndex = -1;
        this.onChange = null; 
        this.onSelect = null;

        // Csound
        this.csoundChannel = null;

        // Layout меню
        this.itemHeight = 16;
        this.menuMaxHeight = 120;
        this.menuWidth = width;

        // Анимация нажатия
        this.animationProgress = 0;
        this.animationDuration = 150;

        // Выставляется Panel.draw() — высота панели в мировых координатах
        this._panelHeight = null;
    }

    // ─────────────────────────── DATA ───────────────────────────

    _normalize(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return [{ label: 'Item 1' }, { label: 'Item 2' }];
        }
        return items.map((it, i) => {
            if (typeof it === 'string') return { label: it };
            if (it && typeof it === 'object') {
                return { label: String(it.label ?? `Item ${i + 1}`) };
            }
            return { label: String(it) };
        });
    }

    _clampIndex(idx) {
        const max = Math.max(0, this._items.length - 1);
        const n = Number.isFinite(idx) ? Math.round(idx) : 0;
        return Math.max(0, Math.min(max, n));
    }

    // PropertiesPanel (type: 'list') читает/пишет строки через это
    get items() {
        return this._items.map(it => it.label);
    }

    set items(arr) {
        this._items = this._normalize(arr);
        this.selectedIndex = this._clampIndex(this.selectedIndex);
    }

    get selectedLabel() {
        return this._items[this.selectedIndex]?.label ?? '';
    }

    // ─────────────────────── LEGACY (readonly) ─────────────────────
    // Нужны, если старый код/модули ещё читают эти поля.

    get imageCount() { return this._items.length; }
    get menuOffset() { return 0; }
    get menuItems() {
        // старый формат [{id,label,value}]
        return this._items.map((it, i) => ({ id: i, label: it.label, value: i }));
    }

    setMenuItems(items) {
        this.items = items;
    }

    setSelectedIndex(index) {
        this.selectedIndex = this._clampIndex(index);
    }

    getState() {
        return {
            selectedIndex: this.selectedIndex,
            selectedItem: this._items[this.selectedIndex],
            items: [...this.items],
        };
    }

    setCsoundChannel(channel) {
        this.csoundChannel = channel;
    }

    // ─────────────────────── OVERLAY DRAW ───────────────────────

    /**
     * Overlay-проход — вызывается ПОСЛЕ всех панелей.
     * Здесь рисуется выпадающее меню, поверх любых модулей.
     */
    drawOverlay(ctx) {
        if (!this.isExpanded) return;
        this._drawMenu(ctx);
    }

    _drawMenu(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const accent = theme.getAccentColor();

        const bounds = this.getMenuBounds();
        const { x: menuX, y: menuY, width: menuW, height: menuH } = bounds;

        ctx.save();

        // ⭐ сброс любых унаследованных теней
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // ── ФОН МЕНЮ ──
        if (isLcd) {
            // LCD: светлая плашка (инверсия, как Casio) — гарантированно
            // читается на любом фоне и не зависит от accent
            ctx.fillStyle = '#e8f0e8';
        } else {
            ctx.fillStyle = 'rgba(26, 32, 44, 0.97)';
        }

        // ── РАМКА ──
        if (isLcd) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = theme.lineWidth(2);
            ctx.shadowColor = accent;
            ctx.shadowBlur = 6;
        } else {
            ctx.strokeStyle = '#4a5568';
            ctx.lineWidth = 1;
        }

        this._roundRect(ctx, menuX, menuY, menuW, menuH, 4);
        ctx.fill();
        ctx.stroke();

        // сброс тени перед контентом
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // ── ПУНКТЫ ──
        const visibleItems = Math.min(
            this._items.length,
            Math.floor(this.menuMaxHeight / this.itemHeight)
        );

        for (let i = 0; i < visibleItems; i++) {
            const itemY = menuY + i * this.itemHeight;
            const isHovered = this.hoveredItemIndex === i;
            const isSelected = this.selectedIndex === i;

            // ── ФОН ПУНКТА (hover) ──
            if (isHovered) {
                ctx.fillStyle = isLcd
                    ? 'rgba(0, 60, 0, 0.15)'
                    : 'rgba(74, 85, 104, 0.7)';
                ctx.fillRect(menuX, itemY, menuW, this.itemHeight);
            }

            // ── ИНДИКАТОР ВЫБРАННОГО ──
            if (isSelected) {
                ctx.fillStyle = isLcd ? accent : '#4f46e5';
                ctx.fillRect(menuX, itemY, 3, this.itemHeight);
            }

            // ── ТЕКСТ ──
            ctx.fillStyle = isLcd
                ? (isHovered || isSelected ? '#001a00' : '#1a2a1a')
                : (isHovered ? '#fff' : '#ccc');
            ctx.font = '8px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';

            const text = this._items[i].label;
            const maxChars = Math.floor(menuW / 5);
            const display = text.length > maxChars
                ? text.substring(0, maxChars - 2) + '..'
                : text;

            ctx.fillText(display, menuX + 8, itemY + this.itemHeight / 2);

            // ── РАЗДЕЛИТЕЛЬ ──
            if (i < visibleItems - 1) {
                ctx.beginPath();
                ctx.moveTo(menuX + 5, itemY + this.itemHeight);
                ctx.lineTo(menuX + menuW - 5, itemY + this.itemHeight);
                ctx.strokeStyle = isLcd
                    ? 'rgba(0, 40, 0, 0.25)'
                    : '#4a5568';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    // ─────────────────────────── DRAW ────────────────────────────
    _roundRect(ctx, x, y, w, h, r) {
        if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, r);
            return;
        }
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const accent = theme.getAccentColor();

        ctx.save();

        // Анимация нажатия
        let scale = 1;
        let offsetY = 0;
        if (this.isPressed) {
            const p = this.animationProgress / this.animationDuration;
            scale = 1 - 0.05 * Math.sin(p * Math.PI);
            offsetY = 0.5 * Math.sin(p * Math.PI);
        }

        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const drawX = centerX - (this.width * scale) / 2;
        const drawY = centerY - (this.height * scale) / 2 + offsetY;
        const drawW = this.width * scale;
        const drawH = this.height * scale;
        const radius = 4;

        // ── ФОН ──
        if (isLcd) {
            const a = this.isPressed ? 0.3 : this.isHovered ? 0.2 : 0.05;
            ctx.fillStyle = theme.getAccentAlpha(a);
        } else {
            const g = ctx.createLinearGradient(drawX, drawY, drawX, drawY + drawH);
            if (this.isPressed) {
                g.addColorStop(0, '#4f46e5');
                g.addColorStop(1, '#3730a3');
            } else if (this.isHovered) {
                g.addColorStop(0, '#4a5568');
                g.addColorStop(1, '#2d3748');
            } else {
                g.addColorStop(0, '#2d3748');
                g.addColorStop(1, '#1a202c');
            }
            ctx.fillStyle = g;
        }
        this._roundRect(ctx, drawX, drawY, drawW, drawH, radius);
        ctx.fill();

        // ── РАМКА ──
        if (isLcd) {
            ctx.strokeStyle = accent;
            ctx.lineWidth = theme.lineWidth(this.isHovered ? 1.5 : 1);
            theme.applyGlow(ctx);
        } else {
            ctx.strokeStyle = this.isHovered ? '#0af' : '#666';
            ctx.lineWidth = 1;
        }
        this._roundRect(ctx, drawX, drawY, drawW, drawH, radius);
        ctx.stroke();
        theme.clearGlow(ctx);

        // ── ТЕКСТ (выбранный пункт) ──
        if (this._items.length > 0) {
            const text = this.selectedLabel;
            ctx.fillStyle = isLcd ? accent : '#fff';
            if (isLcd) theme.applyGlow(ctx);
            ctx.font = 'bold 8px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const maxChars = Math.floor((this.width - 16) / 5);
            const display = text.length > maxChars
                ? text.substring(0, maxChars - 2) + '..'
                : text;

            ctx.fillText(display, centerX, centerY + offsetY);
            if (isLcd) theme.clearGlow(ctx);
        }

        // ── СТРЕЛКА ──
        ctx.fillStyle = isLcd ? accent : (this.isHovered ? '#0af' : '#ccc');
        if (isLcd) theme.applyGlow(ctx);
        const a = 3;
        const ax = drawX + drawW - 10;
        const ay = centerY + offsetY;
        ctx.beginPath();
        if (this.isExpanded) {
            ctx.moveTo(ax - a, ay + a);
            ctx.lineTo(ax + a, ay + a);
            ctx.lineTo(ax, ay - a);
        } else {
            ctx.moveTo(ax - a, ay - a);
            ctx.lineTo(ax + a, ay - a);
            ctx.lineTo(ax, ay + a);
        }
        ctx.closePath();
        ctx.fill();
        if (isLcd) theme.clearGlow(ctx);

        ctx.restore();
    }

    // ──────────────────────── GEOMETRY ──────────────────────────

    _visibleItemCount() {
        return Math.min(
            this._items.length,
            Math.floor(this.menuMaxHeight / this.itemHeight)
        );
    }

    getMenuBounds() {
        if (!this.isExpanded) {
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const menuHeight = Math.min(
            this._items.length * this.itemHeight,
            this.menuMaxHeight
        );

        // Высота панели в мировых координатах. Если Panel.draw() не выставил —
        // fallback: пробуем достать из родителя.
        const panelH = this._panelHeight
            ?? this.parent?.height
            ?? 600;
        const relY = this.relY ?? 0;

        const spaceBelow = panelH - (relY + this.height);
        const spaceAbove = relY;

        let menuY;
        if (spaceBelow >= menuHeight || spaceBelow >= spaceAbove) {
            menuY = this.y + this.height + 2;
        } else {
            menuY = this.y - menuHeight - 2;
        }

        return {
            x: this.x,
            y: menuY,
            width: this.menuWidth,
            height: menuHeight,
        };
    }

    isPointInMenuArea(x, y) {
        if (!this.isExpanded) return false;
        const b = this.getMenuBounds();
        return x >= b.x && x <= b.x + b.width &&
               y >= b.y && y <= b.y + b.height;
    }

    getClickedMenuItemIndex(x, y) {
        if (!this.isPointInMenuArea(x, y)) return -1;
        const b = this.getMenuBounds();
        const rel = y - b.y;
        const idx = Math.floor(rel / this.itemHeight);
        return (idx >= 0 && idx < this._visibleItemCount()) ? idx : -1;
    }

    // ──────────────────────── EVENTS ────────────────────────────

    handleClick(x, y) {
        // Клик по самому селектору
        if (this.isPointInside(x, y)) {
            if (this.isExpanded) this.closeMenu();
            else this.openMenu();
            this.startAnimation();
            return {
                type: 'component-click',
                component: this,
                componentType: 'part-selector',
            };
        }

        // Клик по пункту меню
        if (this.isExpanded) {
            const idx = this.getClickedMenuItemIndex(x, y);
            if (idx >= 0) {
                this.selectItem(idx);
                this.closeMenu();
                return true;
            }
            this.closeMenu();
        }
        return false;
    }

    handleMouseMove(x, y) {
        // hover самого контрола
        const inside = this.isPointInside(x, y);
        if (inside !== this.isHovered) {
            this.isHovered = inside;
        }

        // hover пунктов меню
        if (this.isExpanded) {
            if (this.isPointInMenuArea(x, y)) {
                const b = this.getMenuBounds();
                const rel = y - b.y;
                const idx = Math.floor(rel / this.itemHeight);
                this.hoveredItemIndex =
                    (idx >= 0 && idx < this._visibleItemCount()) ? idx : -1;
            } else {
                this.hoveredItemIndex = -1;
            }
        } else {
            this.hoveredItemIndex = -1;
        }
    }

    openMenu() {
        this.isExpanded = true;
        this.isPressed = true;
        // ⭐ Заставляем перерисовать overlayCanvas (там рисуется меню)
        const sys = this.parent?.parentSystem ?? window.modularSystem;
        if (sys) sys._cablesDirty = true;
    }

    closeMenu() {
        this.isExpanded = false;
        this.isPressed = false;
        this.hoveredItemIndex = -1;
        const sys = this.parent?.parentSystem ?? window.modularSystem;
        if (sys) sys._cablesDirty = true;
    }

    /**
     * Вызывается EditorApp/modularSystem при mousedown по канвасу.
     * Если клик мимо селектора и мимо меню — закрываем.
     */
    closeIfClickOutside(worldX, worldY) {
        if (!this.isExpanded) return;
        if (this.isPointInside(worldX, worldY)) return;
        if (this.isPointInMenuArea(worldX, worldY)) return;
        this.closeMenu();
    }

    selectItem(index) {
        if (index < 0 || index >= this._items.length) return;
        const oldIndex = this.selectedIndex;
        this.selectedIndex = index;

        // ⭐ НЕ шлём в Csound напрямую — ModuleFactory оборачивает onChange
        //    и сам вызывает updateCsoundValue → setControlChannel.
        if (this.onSelect) {
            this.onSelect(index, this._items[index], oldIndex);
        }
        if (this.onChange) {
            this.onChange(index, this._items[index], oldIndex);
        }
    }

    startAnimation() {
        this.animationProgress = this.animationDuration;
        const step = () => {
            this.animationProgress -= 16;
            if (this.animationProgress <= 0) {
                this.animationProgress = 0;
                this.isPressed = false;
            } else {
                requestAnimationFrame(step);
            }
        };
        requestAnimationFrame(step);
    }

    // ─────────────────── LEGACY ALIASES ─────────────────────────

    onClick(x, y) { return this.handleClick(x, y); }

    onHover(x, y) {
        this.handleMouseMove(x, y);
        return this.isHovered;
    }

    getSelectedItem() {
        return { id: this.selectedIndex, label: this.selectedLabel, value: this.selectedIndex };
    }

    destroy() {
        this.closeMenu();
    }

    // ────────────────────── PROPERTIES ──────────────────────────

    static getPropertySchema() {
        return [
            {
                key: 'items',
                label: 'Items (comma-separated)',
                type: 'list',
                afterChange: (comp) => {
                    comp.selectedIndex = comp._clampIndex(comp.selectedIndex);
                },
            },
            {
                key: 'selectedIndex',
                label: 'Default Index',
                type: 'number',
                min: 0,
                max: 31,
                step: 1,
                afterChange: (comp, v) => {
                    comp.selectedIndex = comp._clampIndex(v);
                },
            },
        ];
    }
}