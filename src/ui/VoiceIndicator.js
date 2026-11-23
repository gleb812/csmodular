// src/ui/VoiceIndicator.js
//
// Временный отладочный виджет: 8 кружков в левом нижнем углу.
// Показывает состояние голосов из VoiceAllocator.
// Потом уедет на панель управления.

import { getCurrentTheme } from '../theme/currentTheme.js';
const MAX_SLOTS = 8;   // ⭐ всегда 8 кружков, не зависимо от numVoices
export class VoiceIndicator {
    constructor(voiceAllocator, { container = document.body } = {}) {
        this.voiceAllocator = voiceAllocator;
        this.element = null;
        this._dots = [];

        this._injectStyles();
        this._build(container);

        // Подписка
        voiceAllocator.onChange((voices, mode) => this._render(voices, mode));
    }

    _injectStyles() {
        if (document.getElementById('voice-indicator-styles')) return;
        const style = document.createElement('style');
        style.id = 'voice-indicator-styles';
        style.textContent = `
#voice-indicator {
    display: flex;
    gap: 4px;
    padding: 0 4px;
    background: transparent;
    border: none;
    border-radius: 0;
    font-family: inherit;
    font-size: 10px;
    user-select: none;
    pointer-events: none;
}
#voice-indicator .vi-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.25);
    background: transparent;
    transition: background 0.08s, border-color 0.08s, box-shadow 0.08s;
}
#voice-indicator .vi-dot.active {
    background: var(--vi-accent, #0af);
    border-color: var(--vi-accent, #0af);
    box-shadow: 0 0 6px var(--vi-accent, #0af);
}
#voice-indicator .vi-mode {
    margin-left: 6px;
    color: #888;
    font-size: 9px;
    letter-spacing: 1px;
    align-self: center;
}
#voice-indicator .vi-dot.vi-out-of-range {
    background: transparent;
    border-color: rgba(255,255,255,0.10);   /* едва заметная рамка */
    opacity: 0.35;
}
#voice-indicator .vi-dot.vi-out-of-range.active {
    /* на случай бага — активный слот вне диапазона всё равно серый */
    background: rgba(255,255,255,0.10);
    border-color: rgba(255,255,255,0.10);
    box-shadow: none;
}
`;
        document.head.appendChild(style);
    }

    _build(container) {
        if (!container) {
            console.warn('[VoiceIndicator] container not found, appending to body');
            container = document.body;
        }
        this.element = document.createElement('div');
        this.element.id = 'voice-indicator';
        this.element.title = 'Voice allocation (debug)';

        for (let i = 0; i < MAX_SLOTS; i++) {
            const dot = document.createElement('div');
            dot.className = 'vi-dot';
            dot.dataset.id = i;
            this.element.appendChild(dot);
            this._dots.push(dot);
        }

        const modeEl = document.createElement('span');
        modeEl.className = 'vi-mode';
        modeEl.textContent = 'POLY';
        this.element.appendChild(modeEl);
        this._modeEl = modeEl;

        container.appendChild(this.element);
        this.applyTheme();
        this._render(
            this.voiceAllocator?.getVoices?.() ?? [],
            this.voiceAllocator?.getMode?.() ?? 'poly',
        );
    }

    rebuild(numVoices) {
        // DOM всегда 8 слотов — пересоздавать нечего.
        // Просто перерисовать состояние (см. _render).
        if (this.voiceAllocator) {
            this._render(
                this.voiceAllocator.getVoices(),
                this.voiceAllocator.getMode(),
            );
        }
    }

    _render(voices, mode) {
        const numVoices = this.voiceAllocator?.numVoices ?? MAX_SLOTS;

        for (let i = 0; i < MAX_SLOTS; i++) {
            const dot = this._dots[i];
            if (!dot) continue;

            const inRange = i < numVoices;              // ⭐ слот в зоне активных голосов
            const v = voices.find(x => x.id === i);     // ⭐ было voices[i] — неверно, если id не совпадает с индексом

            dot.classList.toggle('vi-out-of-range', !inRange);   // ⭐ серый
            dot.classList.toggle('active', !!v?.active && inRange);
        }

        if (this._modeEl) {
            this._modeEl.textContent = mode.toUpperCase();
        }
    }

    applyTheme() {
        const theme = getCurrentTheme();
        const accent = theme.isLcd
            ? (theme.getAccentColor() || '#8fbc8f')
            : '#0af';
        if (this.element) {
            this.element.style.setProperty('--vi-accent', accent);
        }
    }
}