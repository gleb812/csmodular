// src/ui/Splash.js
//
// Splash / About — одно модальное окно, два режима вызова:
//   • openSplash() — первый заход в сеансе (sessionStorage пуст)
//   • openAbout()  — повторный вызов (кнопка «?» в BottomBar)
//
// Картинка: public/splash/art.png (1200×680), показывается 600×340.
// Текст — отдельный блок ПОВЕРХ картинки, координаты в TEXT_LAYOUT.
//
// Закрытие: клик по картинке (в любом месте), Escape.
// Enter не используется. Кнопки OK нет.

const SESSION_KEY = 'csmodular:splash-seen';

// ⭐ ФИЗИЧЕСКИЙ размер PNG (для <img> srcset/width/height)
const ART_WIDTH  = 1200;
const ART_HEIGHT = 680;

// ⭐ ОТОБРАЖАЕМЫЙ размер (CSS px). 600×340 = ровно половина → чётко на Retina.
//    Хочешь 1:1 — поставь 1200/680, но тогда может не влезть на ноутбуке.
const ART_DISPLAY_WIDTH  = 600;
const ART_DISPLAY_HEIGHT = 340;

// ⭐ ТЕКСТОВЫЙ БЛОК ПОВЕРХ КАРТИНКИ (версия/слоган/теглайн/автор)
const TEXT_LAYOUT = {
    left: 40,
    top:  200,
    width: 420,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: 13,
    lineHeight: 1.55,
    color: '#ffffff',
    versionColor: '#0af',
    taglineColor: '#d0d0d0',
    authorColor: '#a8a8a8',
    versionSize: 14,
    versionWeight: 700,
    shadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 8px rgba(0,0,0,0.6)',
};

// ⭐ BUILD-СТРОКА — отдельный элемент, независимые координаты.
//    Двигай left/top куда хочешь: правый нижний угол, левый верхний и т.д.
//    Пример ниже — правый нижний угол карточки 600×340.
const BUILD_LAYOUT = {
    left: null,        // null = прижать к правому краю (используется right)
    right: 12,         // px от правого края
    top: null,         // null = прижать к нижнему краю (используется bottom)
    bottom: 8,         // px от нижнего края
    // Если хочешь фиксированные координаты — поставь left/top числами,
    // а right/bottom = null:
    //   left: 40, top: 320, right: null, bottom: null,

    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: 10,
    color: '#6a6a6a',
    opacity: 0.9,
    shadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6)',
    letterSpacing: 0.3,
    align: 'right',    // 'left' | 'right' — для text-align
};

export class Splash {
    constructor(system) {
        this.system = system;
        this._root = null;
        this._inerted = null;
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    // ============================================================
    //  PUBLIC
    // ============================================================

    maybeShowOnStartup() {
        if (sessionStorage.getItem(SESSION_KEY)) return false;
        sessionStorage.setItem(SESSION_KEY, '1');
        this.openSplash();
        return true;
    }

    openSplash() { this._open(); }
    openAbout()  { this._open(); }

    close() {
        if (!this._root) return;

        if (this._inerted) {
            for (const el of this._inerted) el.removeAttribute('inert');
            this._inerted = null;
        }

        document.removeEventListener('keydown', this._onKeyDown, true);
        this._root.remove();
        this._root = null;

        const canvas = document.getElementById('modularCanvas');
        if (canvas) canvas.focus?.();
    }

    // ============================================================
    //  INTERNAL
    // ============================================================

    _open() {
        if (this._root) return;

        const version = (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : '0.0.0';
        const isDev   = (typeof __APP_IS_DEV__ !== 'undefined') ? __APP_IS_DEV__ : false;
        const versionLabel = isDev ? `${version}-dev` : version;
        const rawBuild = (typeof __APP_BUILD__ !== 'undefined') ? __APP_BUILD__ : '';
        const buildLabel = this._formatBuild(rawBuild);

        // ⭐ Правь этот блок под релиз. Пустые строки просто не рендерятся.
        const lines = {
            version: versionLabel,                     // "0.1.2-dev"
            slogan:  'Welcome to Panels!',        // "что нового" / пусто
            tagline: 'A Modular System with Csound inside',
            author:  'Gleb Rogoziński · 2026',
        };

        this._root = document.createElement('div');
        this._root.id = 'splash-root';
        this._root.setAttribute('role', 'dialog');
        this._root.setAttribute('aria-modal', 'true');
        this._root.setAttribute('aria-label', 'CsModular');
        this._root.style.cssText = `
            position: fixed;
            inset: 0;
            z-index: 30000;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.72);
            backdrop-filter: blur(6px);
            user-select: none;
            animation: splash-fade-in 180ms ease-out;
            font-family: ${TEXT_LAYOUT.fontFamily};
        `;

        // ⭐ Карточка ровно по размеру отображаемой картинки
        const card = document.createElement('div');
        card.style.cssText = `
            position: relative;
            width: ${ART_DISPLAY_WIDTH}px;
            height: ${ART_DISPLAY_HEIGHT}px;
            max-width: calc(100vw - 24px);
            max-height: calc(100vh - 24px);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 20px 80px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;
            cursor: pointer;
            background: #14141a;
        `;

        // Картинка (заполняет карточку)
        const img = document.createElement('img');
        img.src = '/splash/art.png';
        img.alt = '';
        img.width  = ART_WIDTH;   // физический
        img.height = ART_HEIGHT;  // физический
        img.draggable = false;
        img.style.cssText = `
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            pointer-events: none;   /* клик ловит карточка */
            user-select: none;
        `;
        card.appendChild(img);

        // ⭐ Текстовый блок ПОВЕРХ картинки
        const text = document.createElement('div');
        text.style.cssText = `
            position: absolute;
            left: ${TEXT_LAYOUT.left}px;
            top: ${TEXT_LAYOUT.top}px;
            width: ${TEXT_LAYOUT.width}px;
            color: ${TEXT_LAYOUT.color};
            font-size: ${TEXT_LAYOUT.fontSize}px;
            line-height: ${TEXT_LAYOUT.lineHeight};
            text-align: left;
            pointer-events: none;   /* клик идёт в карточку */
            text-shadow: ${TEXT_LAYOUT.shadow};
        `;

        const row = (html, style = '') => {
            if (!html) return '';
            return `<div style="${style}">${html}</div>`;
        };

        text.innerHTML = [
            row(
                lines.version,
                `color:${TEXT_LAYOUT.versionColor}; font-size:${TEXT_LAYOUT.versionSize}px; font-weight:${TEXT_LAYOUT.versionWeight}; letter-spacing:0.5px; margin-bottom:2px;`
            ),
            row(
                lines.slogan,
                `color:${TEXT_LAYOUT.taglineColor}; margin-bottom:10px;`
            ),
            row(
                lines.tagline,
                `color:${TEXT_LAYOUT.color}; margin-bottom:2px;`
            ),
            row(
                lines.author,
                `color:${TEXT_LAYOUT.authorColor}; font-size:${TEXT_LAYOUT.fontSize - 1}px;`
            ),
  
        ].join('');

        card.appendChild(text);
        // ⭐ BUILD-СТРОКА — отдельный элемент поверх картинки, свои координаты
        if (buildLabel) {
            const buildEl = document.createElement('div');
            buildEl.textContent = buildLabel;
            buildEl.style.cssText = `
                position: absolute;
                left: ${BUILD_LAYOUT.left !== null ? BUILD_LAYOUT.left + 'px' : 'auto'};
                right: ${BUILD_LAYOUT.right !== null ? BUILD_LAYOUT.right + 'px' : 'auto'};
                top: ${BUILD_LAYOUT.top !== null ? BUILD_LAYOUT.top + 'px' : 'auto'};
                bottom: ${BUILD_LAYOUT.bottom !== null ? BUILD_LAYOUT.bottom + 'px' : 'auto'};
                font-family: ${BUILD_LAYOUT.fontFamily};
                font-size: ${BUILD_LAYOUT.fontSize}px;
                color: ${BUILD_LAYOUT.color};
                opacity: ${BUILD_LAYOUT.opacity};
                letter-spacing: ${BUILD_LAYOUT.letterSpacing}px;
                text-align: ${BUILD_LAYOUT.align};
                pointer-events: none;
                text-shadow: ${BUILD_LAYOUT.shadow};
                white-space: nowrap;
            `;
            card.appendChild(buildEl);
        }

        this._root.appendChild(card);
        this._root.appendChild(card);

        // ⭐ Клик в любом месте карточки (то есть по картинке) — закрыть
        card.addEventListener('click', () => this.close());

        this._injectKeyframes();
        this._inertEverythingElse();

        document.addEventListener('keydown', this._onKeyDown, true);
        document.body.appendChild(this._root);
    }

    _formatBuild(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const pad = n => String(n).padStart(2, '0');
            // Локальное время, YYYY-MM-DD HH:MM
            const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
                      `${pad(d.getHours())}:${pad(d.getMinutes())}`;
            return `build ${s}`;
        } catch {
            return '';
        }
    }

    _onKeyDown(e) {
        if (!this._root) return;

        // Escape — закрыть
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.close();
            return;
        }

        // Enter/Space/Tab — не пускаем наружу (нет фокусируемых элементов)
        if (e.key === 'Tab' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        e.stopPropagation();
    }

    _inertEverythingElse() {
        const candidates = [
            document.getElementById('parallax-bg'),
            document.getElementById('modularCanvas'),
            document.getElementById('dynamicCanvas'),
            document.getElementById('stickerCanvas'),
            document.getElementById('overlayCanvas'),
            document.getElementById('bottom-bar'),
            document.getElementById('csmodular-minimap'),
        ].filter(Boolean);

        document.querySelectorAll('body > *').forEach(el => {
            if (el.id === 'splash-root') return;
            if (el.tagName === 'SCRIPT') return;
            if (!candidates.includes(el)) candidates.push(el);
        });

        for (const el of candidates) {
            if (el.id === 'splash-root') continue;
            el.setAttribute('inert', '');
        }
        this._inerted = candidates;
    }

    _injectKeyframes() {
        if (document.getElementById('splash-keyframes')) return;
        const style = document.createElement('style');
        style.id = 'splash-keyframes';
        style.textContent = `
            @keyframes splash-fade-in {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
}