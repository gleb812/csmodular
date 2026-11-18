// src/ui/AudioSettingsPanel.js
import { CsoundEngine } from '../csound/CsoundEngine.js';   // для дефолтов? или константы

const STORAGE_KEY = 'csmodular:audio-settings';

const DEFAULTS = {
    softwareBuffer: 1024,
    hardwareBuffer: 2048,
    ksmps: 4,
};

const POWER_OF_TWO = [64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384];

export class AudioSettingsPanel {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.windowElement = null;
        this.settings = this._load();

        this.createWindow();
        this.setupEventListeners();
    }

    _load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
        } catch { /* ignore */ }
        return { ...DEFAULTS };
    }

    _save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
        } catch { /* ignore */ }
    }

    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'audio-settings-panel';
        this.windowElement.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 300px;
            background: rgba(20, 20, 25, 0.97);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 14px;
            color: #ccc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            z-index: 15000;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            display: none;
            user-select: none;
        `;

        this.windowElement.innerHTML = `
            <div id="as-header" style="
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 12px; padding-bottom: 8px;
                border-bottom: 1px solid #333; cursor: move;
            ">
                <span style="color: #0af; font-weight: bold; font-size: 13px;">
                    🔊 Audio Settings
                </span>
                <button id="as-close" style="
                    background: transparent; border: none; color: #666;
                    cursor: pointer; font-size: 16px; padding: 0 4px;
                ">✕</button>
            </div>
            <div id="as-content"></div>
        `;

        document.body.appendChild(this.windowElement);
        this.makeDraggable(this.windowElement.querySelector('#as-header'));
        this.windowElement.querySelector('#as-close').onclick = () => this.hide();
        this.renderContent();
    }

    renderContent() {
        const content = this.windowElement.querySelector('#as-content');
        content.innerHTML = '';

        // Software buffer
        content.appendChild(this.buildSelect(
            'Software buffer (-b)',
            this.settings.softwareBuffer,
            POWER_OF_TWO,
            (v) => { this.settings.softwareBuffer = v; this._save(); }
        ));

        // Hardware buffer
        content.appendChild(this.buildSelect(
            'Hardware buffer (-B)',
            this.settings.hardwareBuffer,
            POWER_OF_TWO,
            (v) => { this.settings.hardwareBuffer = v; this._save(); }
        ));

        // ksmps
        content.appendChild(this.buildSelect(
            'ksmps',
            this.settings.ksmps,
            [1, 2, 4, 8, 16, 32, 64],
            (v) => { this.settings.ksmps = v; this._save(); }
        ));

        // Подсказка
        const hint = document.createElement('div');
        hint.style.cssText = 'color: #555; font-size: 9px; margin: 8px 0 12px; line-height: 1.4;';
        hint.textContent = 'Larger buffers = less crackling, more latency. Apply requires Csound restart.';
        content.appendChild(hint);

        // Apply button
        const applyBtn = document.createElement('button');
        applyBtn.textContent = '🔄 Apply & Restart Csound';
        applyBtn.style.cssText = `
            width: 100%; padding: 8px; background: #0a3a5a;
            border: 1px solid #0af; color: #0af; border-radius: 4px;
            cursor: pointer; font-size: 11px; font-family: inherit;
        `;
        applyBtn.onclick = () => this.applyAndRestart();
        content.appendChild(applyBtn);
    }

    buildSelect(label, value, options, onChange) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelEl = document.createElement('div');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #aaa; font-size: 11px; margin-bottom: 4px;';
        wrapper.appendChild(labelEl);

        const select = document.createElement('select');
        select.style.cssText = `
            width: 100%; padding: 4px 8px; background: #1a1a1a;
            border: 1px solid #444; border-radius: 3px; color: #0af;
            font-family: monospace; font-size: 11px; outline: none;
        `;
        for (const opt of options) {
            const optEl = document.createElement('option');
            optEl.value = opt;
            optEl.textContent = opt;
            optEl.style.background = '#1a1a1a';
            if (opt === value) optEl.selected = true;
            select.appendChild(optEl);
        }
        select.onchange = () => onChange(parseInt(select.value, 10));
        wrapper.appendChild(select);
        return wrapper;
    }

    async applyAndRestart() {
        const engine = this.system?.csoundEngine;
        if (!engine) {
            this.system.showNotification?.('❌ CsoundEngine not available');
            return;
        }

        // Сохраняем настройки в engine
        engine.audioOptions = {
            softwareBuffer: this.settings.softwareBuffer,
            hardwareBuffer: this.settings.hardwareBuffer,
            ksmps: this.settings.ksmps,
        };

        this.system.showNotification?.('🔄 Restarting Csound…');

        // Перезапуск Csound с новыми опциями
        const wasRunning = engine.state === 'running' || engine.state === 'initializing';
        try {
            await engine.stop();
            if (wasRunning || true) {
                await engine.init();
            }
            this.system.showNotification?.('✅ Csound restarted with new buffers');
        } catch (e) {
            console.error('[AudioSettingsPanel] restart failed:', e);
            this.system.showNotification?.(`❌ Restart failed: ${e.message}`);
        }
    }

    makeDraggable(handle) {
        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = this.windowElement.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            const maxX = window.innerWidth - this.windowElement.offsetWidth;
            const maxY = window.innerHeight - this.windowElement.offsetHeight;
            this.windowElement.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            this.windowElement.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
            this.windowElement.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) this.hide();
        });
    }

    show() {
        this.isVisible = true;
        this.windowElement.style.display = 'block';
        this.renderContent();
    }

    hide() {
        this.isVisible = false;
        this.windowElement.style.display = 'none';
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }
}