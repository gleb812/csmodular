// src/utils/text.js
//
// Утилиты для работы с текстом на Canvas.
// Сейчас — только перенос по словам для стикеров.

/**
 * Разбить текст на строки по ширине.
 * Учитывает '\n' как принудительный перенос.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} maxWidth — в тех же единицах, что и ctx
 * @returns {string[]}
 */
export function wrapText(ctx, text, maxWidth) {
    const out = [];
    const paragraphs = String(text ?? '').split('\n');

    for (const para of paragraphs) {
        if (para === '') {
            out.push('');
            continue;
        }

        const words = para.split(/(\s+)/); // сохраняем пробелы
        let line = '';

        for (const word of words) {
            if (word === '') continue;
            const test = line + word;
            if (ctx.measureText(test).width > maxWidth && line !== '') {
                out.push(line.trimEnd());
                line = word.trimStart();
            } else {
                line = test;
            }
        }
        if (line !== '') out.push(line);
    }

    return out;
}