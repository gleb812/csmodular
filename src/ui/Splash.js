// src/ui/Splash.js
//
// Splash / About — one modal, two entry modes:
//   • openSplash() — first visit in session (sessionStorage empty)
//   • openAbout()  — repeated call ("?" button in BottomBar)
//
// Image: public/splash/art.png (1200×680), displayed 600×340.
// Text — separate block ON TOP of the image, coordinates in TEXT_LAYOUT.
//
// Close: click on the card (image), Escape.
// Enter is not used. No OK button.

const SESSION_KEY = 'csmodular:splash-seen';
const VERSION_KEY = 'csmodular:splash-version';
const START_PATCH_KEY = 'csmodular:startPatch-pref';

// ⭐ Physical PNG size (for <img> srcset/width/height)
const ART_WIDTH  = 1200;
const ART_HEIGHT = 680;

// ⭐ Display size (CSS px). 600×340 = exactly half → crisp on Retina.
const ART_DISPLAY_WIDTH  = 600;
const ART_DISPLAY_HEIGHT = 340;

// ⭐ TEXT BLOCK ON TOP OF THE IMAGE (version/slogan/tagline/author)
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

// ⭐ BUILD STRING — separate element, independent coordinates.
const BUILD_LAYOUT = {
    left: null,        // null = pin to right edge (right is used)
    right: 12,
    top: null,         // null = pin to bottom edge (bottom is used)
    bottom: 8,

    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: 10,
    color: '#6a6a6a',
    opacity: 0.9,
    shadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6)',
    letterSpacing: 0.3,
    align: 'right',    // 'left' | 'right' — for text-align
};

// ⭐ Checkbox row, bottom-left of the card
const CHECKBOX_LAYOUT = {
    left: 12,
    bottom: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
    fontSize: 10,
    color: '#8a8a8a',
    gap: 6,
    shadow: '0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6)',
};

// ⭐ Progress bar, bottom of the card (above checkbox row)
const PROGRESS_LAYOUT = {
    left: 12,
    right: 12,
    bottom: 26,
    height: 3,
    track: 'rgba(255,255,255,0.15)',
    fill:  '#0af',
    textSize: 10,
    textColor: '#c8c8c8',
    gap: 6,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
};

// ============================================================
//  Public preference helpers (used by main.js)
// ============================================================

/** @returns {'open' | 'closed'} */
export function getStartPatchPref() {
    const v = localStorage.getItem(START_PATCH_KEY);
    return v === 'closed' ? 'closed' : 'open';
}

/** @param {boolean} open */
export function setStartPatchPref(open) {
    localStorage.setItem(START_PATCH_KEY, open ? 'open' : 'closed');
}

export class Splash {
    constructor(system) {
        this.system = system;
        this._root = null;
        this._inerted = null;
        this._onKeyDown = this._onKeyDown.bind(this);

        // ⭐ Progress / lock state
        this._progressEl    = null;   // fill element
        this._progressText  = null;   // stage label
        this._progressPct   = null;
        this._readyForClose = false;  // false → click/Escape ignored
    }

    // ============================================================
    //  PUBLIC
    // ============================================================

    maybeShowOnStartup() {
        const version = (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : '0.0.0';

        // Reset session flag when app version changes
        const lastSeen = localStorage.getItem(VERSION_KEY);
        if (lastSeen !== version) {
            sessionStorage.removeItem(SESSION_KEY);
            localStorage.setItem(VERSION_KEY, version);
        }

        if (sessionStorage.getItem(SESSION_KEY)) return null;
        sessionStorage.setItem(SESSION_KEY, '1');
        return this.openSplash();
    }

    openSplash() { return this._open({ mode: 'startup' }); }
    openAbout()  { return this._open({ mode: 'about' });   }

    /**
     * Update splash progress bar.
     * @param {number} pct   0..1
     * @param {string} [text] optional stage label
     */
    setProgress(pct, text) {
        this._progressPct = Math.max(0, Math.min(1, Number(pct) || 0));
        if (this._progressEl) {
            this._progressEl.style.width = `${(this._progressPct * 100).toFixed(1)}%`;
        }
        if (text !== undefined && this._progressText) {
            this._progressText.textContent = text;
        }
    }

    /**
     * Allow (true) or forbid (false) closing.
     * While locked, card click / Escape do nothing and the progress bar is shown.
     * @param {boolean} ready
     */
    setReadyToClose(ready) {
        this._readyForClose = !!ready;
        if (this._readyForClose) {
            this.setProgress(1, 'Ready');
        }
    }

    close() {
        if (!this._root) return;

        if (this._inerted) {
            for (const el of this._inerted) el.removeAttribute('inert');
            this._inerted = null;
        }

        document.removeEventListener('keydown', this._onKeyDown, true);
        this._root.remove();
        this._root = null;

        // ⭐ reset progress/lock
        this._progressEl    = null;
        this._progressText  = null;
        this._progressPct   = null;
        this._readyForClose = false;

        const canvas = document.getElementById('modularCanvas');
        if (canvas) canvas.focus?.();

        if (this._closedPromiseResolve) {
            this._closedPromiseResolve();
            this._closedPromiseResolve = null;
            this._closedPromise = null;
        }
    }

    // ============================================================
    //  INTERNAL
    // ============================================================

    _open(opts = {}) {
        if (this._root) return this._closedPromise;

        const isAbout = opts.mode === 'about';

        this._closedPromise = new Promise(resolve => {
            this._closedPromiseResolve = resolve;
        });

        const version = (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : '0.0.0';
        const isDev   = (typeof __APP_IS_DEV__ !== 'undefined') ? __APP_IS_DEV__ : false;
        const versionLabel = isDev ? `${version}-dev` : version;
        const rawBuild = (typeof __APP_BUILD__ !== 'undefined') ? __APP_BUILD__ : '';
        const buildLabel = this._formatBuild(rawBuild);

        // ⭐ Edit this block for release. Empty lines are simply not rendered.
        const lines = {
            version: versionLabel,
            slogan:  'Welcome to Panels!',
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

        // ⭐ Card exactly the size of the displayed image
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

        // Image (fills the card)
        const img = document.createElement('img');
        img.src = '/splash/art.png';
        img.alt = '';
        img.width  = ART_WIDTH;
        img.height = ART_HEIGHT;
        img.draggable = false;
        img.style.cssText = `
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            pointer-events: none;
            user-select: none;
        `;
        card.appendChild(img);

        // ⭐ Text block ON TOP of the image
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
            pointer-events: none;
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

        // ⭐ BUILD STRING — bottom-right
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

        // ⭐ Start-patch checkbox — bottom-left
        const cbWrap = document.createElement('label');
        cbWrap.style.cssText = `
            position: absolute;
            left: ${CHECKBOX_LAYOUT.left}px;
            bottom: ${CHECKBOX_LAYOUT.bottom}px;
            display: flex;
            align-items: center;
            gap: ${CHECKBOX_LAYOUT.gap}px;
            font-family: ${CHECKBOX_LAYOUT.fontFamily};
            font-size: ${CHECKBOX_LAYOUT.fontSize}px;
            color: ${CHECKBOX_LAYOUT.color};
            text-shadow: ${CHECKBOX_LAYOUT.shadow};
            pointer-events: auto;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
        `;
        // ⭐ Do not close splash when clicking the checkbox
        cbWrap.addEventListener('click', e => e.stopPropagation());

        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = getStartPatchPref() === 'open';
        cb.style.cssText = `cursor: pointer; margin: 0;`;
        cb.addEventListener('change', () => setStartPatchPref(cb.checked));

        cbWrap.appendChild(cb);
        cbWrap.appendChild(document.createTextNode('Open demo patch on launch'));
        card.appendChild(cbWrap);

        // ⭐ Progress bar — ONLY for startup mode
        if (!isAbout) {
            const progressWrap = document.createElement('div');
            progressWrap.style.cssText = `
                position: absolute;
                left: ${PROGRESS_LAYOUT.left}px;
                right: ${PROGRESS_LAYOUT.right}px;
                bottom: ${PROGRESS_LAYOUT.bottom}px;
                display: flex;
                align-items: center;
                gap: ${PROGRESS_LAYOUT.gap}px;
                pointer-events: none;
                font-family: ${PROGRESS_LAYOUT.fontFamily};
                font-size: ${PROGRESS_LAYOUT.textSize}px;
                color: ${PROGRESS_LAYOUT.textColor};
                text-shadow: ${TEXT_LAYOUT.shadow};
            `;

            const track = document.createElement('div');
            track.style.cssText = `
                flex: 1;
                height: ${PROGRESS_LAYOUT.height}px;
                background: ${PROGRESS_LAYOUT.track};
                border-radius: 2px;
                overflow: hidden;
            `;

            const fill = document.createElement('div');
            fill.style.cssText = `
                height: 100%;
                width: 0%;
                background: ${PROGRESS_LAYOUT.fill};
                transition: width 180ms ease-out;
            `;
            track.appendChild(fill);

            const label = document.createElement('div');
            label.textContent = 'Loading…';
            label.style.cssText = `white-space: nowrap;`;

            progressWrap.appendChild(track);
            progressWrap.appendChild(label);
            card.appendChild(progressWrap);

            this._progressEl   = fill;
            this._progressText = label;
            this.setProgress(0, 'Loading…');
        }

        // ⭐ Lock: startup — ждёт main.js; about — сразу готов к закрытию
        this._readyForClose = isAbout;

        // ⭐ THE ONLY click handler on card — respects lock
        card.addEventListener('click', () => {
            if (!this._readyForClose) return;
            this.close();
        });

        this._root.appendChild(card);

        this._injectKeyframes();
        this._inertEverythingElse();

        document.addEventListener('keydown', this._onKeyDown, true);
        document.body.appendChild(this._root);

        return this._closedPromise;
    }

    _formatBuild(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            if (isNaN(d.getTime())) return '';
            const pad = n => String(n).padStart(2, '0');
            const s = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
                      `${pad(d.getHours())}:${pad(d.getMinutes())}`;
            return `build ${s}`;
        } catch {
            return '';
        }
    }

    _onKeyDown(e) {
        if (!this._root) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            if (this._readyForClose) this.close();
            return;
        }

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