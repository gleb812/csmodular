// src/ui/VoiceIndicator.js
//
// Временный отладочный виджет: 8 кружков в левом нижнем углу.
// Показывает состояние голосов из VoiceAllocator.
// Потом уедет на панель управления.

import { getCurrentTheme } from '../theme/currentTheme.js';

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
    position: fixed;
    left: 8px;
    bottom: 8px;
    display: flex;
    gap: 4px;
    padding: 6px 8px;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    z-index: 15000;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 10px;
    user-select: none;
    pointer-events: none;
    backdrop-filter: blur(6px);
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
`;
        document.head.appendChild(style);
    }

    _build(container) {
        this.element = document.createElement('div');
        this.element.id = 'voice-indicator';
        this.element.title = 'Voice allocation (debug)';

        for (let i = 0; i < this.voiceAllocator.numVoices; i++) {
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
    }

    /**
     * Пересоздать DOM-кружки под новое число голосов.
     * Вызывается после смены numVoices в VoiceAllocator.
     */
    rebuild(numVoices) {
        if (!this.element) return;
        const n = Math.max(1, Math.min(8, parseInt(numVoices, 10) || 8));

        // Удаляем старые кружки (оставляем mode-label)
        const oldDots = this.element.querySelectorAll('.vi-dot');
        oldDots.forEach(d => d.remove());
        this._dots = [];

        // Вставляем новые перед mode-label
        const modeEl = this._modeEl;
        for (let i = 0; i < n; i++) {
            const dot = document.createElement('div');
            dot.className = 'vi-dot';
            dot.dataset.id = i;
            this.element.insertBefore(dot, modeEl);
            this._dots.push(dot);
        }

        // Перерисовать состояние из allocator
        if (this.voiceAllocator) {
            this._render(this.voiceAllocator.getVoices(), this.voiceAllocator.getMode());
        }
    }

    _render(voices, mode) {
        for (const v of voices) {
            const dot = this._dots[v.id];
            if (!dot) continue;
            dot.classList.toggle('active', !!v.active);
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