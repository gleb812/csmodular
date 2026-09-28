// src/utils/debounce.js

/**
 * Классический debounce: выполняет fn не чаще, чем раз в delay мс.
 * 
 * @param {Function} fn - функция для вызова
 * @param {number} delay - задержка в мс
 * @returns {Function} обёрнутая функция с методами .cancel() и .flush()
 */
export function debounce(fn, delay = 300) {
    let timeoutId = null;
    
    const debounced = function (...args) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            timeoutId = null;
            try {
                fn.apply(this, args);
            } catch (e) {
                console.error('[debounce] Error in debounced fn:', e);
            }
        }, delay);
    };
    
    debounced.cancel = function () {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };
    
    debounced.flush = function (...args) {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
            timeoutId = null;
            fn.apply(this, args);
        }
    };
    
    return debounced;
}