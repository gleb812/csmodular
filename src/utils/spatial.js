// src/utils/spatial.js
//
// Простые пространственные утилиты для minimap.
// Не зависят от DOM/Canvas — легко тестировать.

/**
 * Медиана числового массива.
 * @param {number[]} arr
 * @returns {number}
 */
export function median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
}

/**
 * Bbox всех модулей в радиусе maxDistance от точки (cx, cy).
 * Outlier-ы не учитываются — они уйдут в стрелки.
 *
 * @param {Array<{gridX:number, gridY:number, gridWidth:number, gridHeight:number}>} modules
 * @param {number} cx — центр по X
 * @param {number} cy — центр по Y
 * @param {number} maxDistance — Chebyshev-радиус
 * @returns {{minX:number, maxX:number, minY:number, maxY:number}|null}
 */
export function bboxNearModules(modules, cx, cy, maxDistance) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let any = false;

    for (const m of modules) {
        const mcx = m.gridX + m.gridWidth / 2;
        const mcy = m.gridY + m.gridHeight / 2;
        const dx = Math.abs(mcx - cx);
        const dy = Math.abs(mcy - cy);
        if (Math.max(dx, dy) > maxDistance) continue; // outlier

        any = true;
        if (m.gridX < minX) minX = m.gridX;
        if (m.gridY < minY) minY = m.gridY;
        if (m.gridX + m.gridWidth > maxX) maxX = m.gridX + m.gridWidth;
        if (m.gridY + m.gridHeight > maxY) maxY = m.gridY + m.gridHeight;
    }

    return any ? { minX, maxX, minY, maxY } : null;
}

/**
 * Разбить точки по 8 октантам (N, NE, E, SE, S, SW, W, NW)
 * относительно центра. Возвращает { N: [mod,...], NE: [...], ... }.
 */
export function groupByOctant(modules, cx, cy) {
    const groups = { N: [], NE: [], E: [], SE: [], S: [], SW: [], W: [], NW: [] };

    for (const m of modules) {
        const mcx = m.gridX + m.gridWidth / 2;
        const mcy = m.gridY + m.gridHeight / 2;
        const dx = mcx - cx;
        const dy = mcy - cy;

        // Угол: 0 = E, 90 = S, 180 = W, 270 = N (в экранных координатах)
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
        // Переводим в 0..360
        const a = (angle + 360) % 360;

        let oct;
        if (a >= 337.5 || a < 22.5)        oct = 'E';
        else if (a >= 22.5  && a < 67.5)   oct = 'SE';
        else if (a >= 67.5  && a < 112.5)  oct = 'S';
        else if (a >= 112.5 && a < 157.5)  oct = 'SW';
        else if (a >= 157.5 && a < 202.5)  oct = 'W';
        else if (a >= 202.5 && a < 247.5)  oct = 'NW';
        else if (a >= 247.5 && a < 292.5)  oct = 'N';
        else                                oct = 'NE';

        groups[oct].push(m);
    }

    return groups;
}

/**
 * «Настоящий выход» — модуль, у которого ЕСТЬ Output и НЕТ Input.
 * Такой модуль только отдаёт сигнал (Out2, Out4, Device).
 * Модули с Input+Output (LevConv, Digitizer) — не выходы, красятся по категории.
 */
export function isOutputModule(module) {
    const comps = module?.components || [];
    let hasOut = false;
    let hasIn = false;
    for (const c of comps) {
        const n = c.constructor?.name;
        if (n === 'Output') hasOut = true;
        else if (n === 'Input') hasIn = true;
        if (hasOut && hasIn) return false;
    }
    return hasOut && !hasIn;
}