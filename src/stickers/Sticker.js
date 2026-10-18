// src/stickers/Sticker.js
//
// Стикер — графический/текстовый элемент, не связанный с аудио.
// Может быть: текст, SVG, QR, штрих-код (пока только 'text').
//
// Позиция — в базовых клетках 20×15 (как у Panel).
// Слой: 'behind' (под модулями) | 'front' (над кабелями).

import { BASE_STEP_X, BASE_STEP_Y } from '../constants.js';

export const STICKER_TYPES = ['text', 'svg', 'qr', 'barcode'];
export const STICKER_Z = ['behind', 'front'];

let _stickerIdCounter = 0;

export class Sticker {
    constructor(data = {}) {
        this.id   = data.id ?? `sticker_${++_stickerIdCounter}_${Date.now()}`;
        this.type = data.type ?? 'text';

        this.z     = data.z ?? 'front';
        this.gridX = data.gridX ?? 0;
        this.gridY = data.gridY ?? 0;
        this.gridW = data.gridW ?? 10;
        this.gridH = data.gridH ?? 3;

        // text
        this.text       = data.text ?? 'Sticker';
        this.fontSize   = data.fontSize ?? 16;
        this.fontFamily = data.fontFamily ?? 'monospace';
        this.textAlign  = data.textAlign ?? 'left'; // 'left' | 'center' | 'right'
        this.lineHeight = data.lineHeight ?? 1.3;
        this.padding    = data.padding ?? 4;

        // color
        this.color     = data.color ?? '#ffffff';
        this.colorMode = data.colorMode ?? 'custom'; // 'custom' | 'white' | 'accent'

        // marquee
        this.marquee = {
            enabled: data.marquee?.enabled ?? false,
            speed:   data.marquee?.speed ?? 30,   // world-px/sec
            gap:     data.marquee?.gap ?? 40,
        };

        // background (опционально)
        this.bgColor   = data.bgColor ?? null;
        this.bgOpacity = data.bgOpacity ?? 1;

        // служебное
        this.isSelected = false;
        this.isDragging = false;
        this.dragOffsetGridX = 0;
        this.dragOffsetGridY = 0;

        // svg (для будущего)
        this.svgString = data.svgString ?? null;
        // qr / barcode (для будущего)
        this.payload = data.payload ?? null;
    }

    // === Геометрия (world-px) ===

    get x() { return this.gridX * BASE_STEP_X; }
    get y() { return this.gridY * BASE_STEP_Y; }
    get w() { return this.gridW * BASE_STEP_X; }
    get h() { return this.gridH * BASE_STEP_Y; }

    // === Цвет с учётом темы ===

    resolveColor(theme) {
        if (theme.isLcd) {
            return this.colorMode === 'accent'
                ? (theme.getAccentColor() || '#8fbc8f')
                : '#ffffff';
        }
        // classic
        return this.color;
    }

    // === Hit-test ===

    hitTest(worldX, worldY) {
        const x = this.x;
        const y = this.y;
        const w = this.w;
        const h = this.h;
        return worldX >= x && worldX <= x + w && worldY >= y && worldY <= y + h;
    }

    // === Drag (использует system.grid) ===

    startDrag(startX, startY, systemRef) {
        if (!this.hitTest(startX, startY)) return null;
        this.isDragging = true;

        const grid = systemRef?.grid;
        if (!grid) return null;

        const snapped = grid.snapToGrid(startX, startY);
        this.dragOffsetGridX = snapped.gridX - this.gridX;
        this.dragOffsetGridY = snapped.gridY - this.gridY;

        return {
            type: 'sticker-drag',
            sticker: this,
            handleDrag: (x, y) => this.handleDrag(x, y, systemRef),
            endDrag: () => { this.isDragging = false; },
        };
    }

    handleDrag(x, y, systemRef) {
        if (!this.isDragging) return;
        const grid = systemRef?.grid;
        if (!grid) return;

        const snapped = grid.snapToGrid(x, y);
        let targetX = snapped.gridX - this.dragOffsetGridX;
        let targetY = snapped.gridY - this.dragOffsetGridY;

        if (grid.snap) {
            targetX = Math.round(targetX / grid.multX) * grid.multX;
            targetY = Math.round(targetY / grid.multY) * grid.multY;
        }

        this.gridX = targetX;
        this.gridY = targetY;

        systemRef?.forceRedraw?.();
    }

    // === Сериализация ===

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            z: this.z,
            gridX: this.gridX,
            gridY: this.gridY,
            gridW: this.gridW,
            gridH: this.gridH,
            text: this.text,
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            textAlign: this.textAlign,
            lineHeight: this.lineHeight,
            padding: this.padding,
            color: this.color,
            colorMode: this.colorMode,
            marquee: { ...this.marquee },
            bgColor: this.bgColor,
            bgOpacity: this.bgOpacity,
            svgString: this.svgString,
            payload: this.payload,
        };
    }
}