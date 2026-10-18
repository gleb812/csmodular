// src/stickers/StickerRenderer.js
//
// Рендер стикеров. Реестр по типу — легко расширять (svg, qr, barcode).

import { getCurrentTheme } from '../theme/currentTheme.js';
import { wrapText } from '../utils/text.js';
import { getSvgImage } from './svgCache.js';

// === Реестр рендереров ===
const RENDERERS = {
    text: drawTextSticker,
    svg: drawSvgSticker,     
    // qr: drawQrSticker,       // позже
    // barcode: drawBarcodeSticker, // позже
};

/**
 * Точка входа. Рисует стикер (или скипает если рендерера нет).
 * @param {CanvasRenderingContext2D} ctx — уже в world-transform (translate+scale)
 * @param {Sticker} sticker
 * @param {number} nowMs — performance.now() (для анимаций)
 */
export function drawSticker(ctx, sticker, nowMs) {
    const renderer = RENDERERS[sticker.type];
    if (!renderer) return;
    renderer(ctx, sticker, nowMs);
}

/**
 * Рисует фон стикера (общий для всех типов).
 */
function drawBg(ctx, sticker) {
    if (!sticker.bgColor) return;
    ctx.save();
    ctx.globalAlpha = sticker.bgOpacity;
    ctx.fillStyle = sticker.bgColor;
    ctx.fillRect(sticker.x, sticker.y, sticker.w, sticker.h);
    ctx.restore();
}

/**
 * Рисует рамку выделения (не входит в обычный draw — используется оверлеем).
 */
export function drawStickerSelection(ctx, sticker) {
    if (!sticker.isSelected) return;
    ctx.save();
    ctx.strokeStyle = '#0af';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(sticker.x - 2, sticker.y - 2, sticker.w + 4, sticker.h + 4);
    ctx.setLineDash([]);
    ctx.restore();
}

// ============================================================
//  TEXT
// ============================================================

function drawTextSticker(ctx, sticker, nowMs) {
    const theme = getCurrentTheme();
    const color = sticker.resolveColor(theme);

    drawBg(ctx, sticker);

    const { x, y, w, h, padding } = sticker;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    ctx.fillStyle = color;
    ctx.font = `${sticker.fontSize}px ${sticker.fontFamily}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    if (theme.isLcd) theme.applyGlow(ctx);

    const innerW = w - padding * 2;
    const lineH = sticker.fontSize * sticker.lineHeight;

    const isSingleLine =
        !sticker.text.includes('\n') &&
        ctx.measureText(sticker.text).width <= innerW;

    if (sticker.marquee.enabled && isSingleLine) {
        drawMarqueeLine(ctx, sticker, nowMs);
    } else {
        drawWrappedLines(ctx, sticker, lineH);
    }

    if (theme.isLcd) theme.clearGlow(ctx);
    ctx.restore();
}

function drawWrappedLines(ctx, sticker, lineH) {
    const { x, y, w, padding } = sticker;
    const innerW = w - padding * 2;
    const lines = wrapText(ctx, sticker.text, innerW);

    lines.forEach((line, i) => {
        if (!line) return;
        drawAlignedLine(
            ctx,
            sticker,
            line,
            x + padding,
            y + padding + i * lineH,
            innerW,
        );
    });
}

function drawMarqueeLine(ctx, sticker, nowMs) {
    const { x, y, w, h, padding } = sticker;
    const innerW = w - padding * 2;

    const textW = ctx.measureText(sticker.text).width;
    const cycle = textW + sticker.marquee.gap;

    const offset = ((nowMs / 1000) * sticker.marquee.speed) % cycle;

    // центр по вертикали
    const lineH = sticker.fontSize * sticker.lineHeight;
    const baselineY = y + padding + Math.max(0, (h - padding * 2 - lineH) / 2);

    // две копии со сдвигом
    drawAlignedLine(
        ctx, sticker, sticker.text,
        x + padding - offset,
        baselineY, innerW,
    );
    drawAlignedLine(
        ctx, sticker, sticker.text,
        x + padding - offset + cycle,
        baselineY, innerW,
    );
}

/**
 * Рисует одну строку с учётом textAlign.
 * @param {number} baseX — левый край (для 'left'), центр/правый считаются от innerW
 */
function drawAlignedLine(ctx, sticker, text, baseX, yPos, innerW) {
    let px = baseX;
    if (sticker.textAlign === 'center') {
        px = baseX + innerW / 2 - ctx.measureText(text).width / 2;
    } else if (sticker.textAlign === 'right') {
        px = baseX + innerW - ctx.measureText(text).width;
    }
    ctx.fillText(text, px, yPos);
}

// ============================================================
//  SVG
// ============================================================

function drawSvgSticker(ctx, sticker, nowMs) {
    // Фон (если задан) — общий для всех типов
    drawBg(ctx, sticker);

    const { x, y, w, h, padding } = sticker;

    // Картинка может быть ещё не готова — тогда просто выходим
    const img = getSvgImage(sticker, () => {
        // когда onload — просим перерисовать
        const sys = window.modularSystem;
        if (sys?.forceRedraw) sys.forceRedraw();
    });

    if (!img) return;

    // Вписываем с сохранением пропорций (contain)
    const innerW = Math.max(1, w - padding * 2);
    const innerH = Math.max(1, h - padding * 2);
    const ar = img.naturalWidth / img.naturalHeight;

    let dw = innerW;
    let dh = dw / ar;
    if (dh > innerH) {
        dh = innerH;
        dw = dh * ar;
    }

    const dx = x + padding + (innerW - dw) / 2;
    const dy = y + padding + (innerH - dh) / 2;

    ctx.save();

    // В LCD — свечение (как у текста). В classic — без.
    const theme = getCurrentTheme();
    if (theme.isLcd) theme.applyGlow(ctx);

    ctx.drawImage(img, dx, dy, dw, dh);

    if (theme.isLcd) theme.clearGlow(ctx);

    ctx.restore();
}


