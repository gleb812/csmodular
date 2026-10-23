// src/ui/BottomBar.js
//
// Минимальная полоска действий внизу по центру.
// Пока — «двухбуквы» вместо иконок. Позже заменим на SVG.
//
// Группы:
//   [New] [Load] [Save] [SaveAs]  │
//   [Z-] [100%] [Z+]              │  zoom
//   [Shake]                       │  shake cables
//   [Run/Stop Csound]             │  ▶ / ■ / ⏳ / ⟳
//   [Csound] [Design] [Sticker] [Editor]  │
//   [Grid]                        │  on/off
//   [SysInfo]                     │  click → popup
//   [?]                           │  about

import { getCurrentTheme } from '../theme/currentTheme.js';

export class BottomBar {
    constructor(system) {
        this.system = system;
        this.element = null;
        this._buttons = [];
        this._sysInfoOpen = false;
        this._sysInfoPopup = null;
        this._tickInterval = null;

        this.createBar();
        this.createSysInfoPopup();
        this.setupEvents();
        this.setupCsoundListener();
        this.applyTheme();
        this.refreshState();

        // Раз в 250ms обновляем zoom-процент и SysInfo (если открыт)
        this._tickInterval = setInterval(() => this._tick(), 250);
    }

    // ============================================================
    //  СОЗДАНИЕ
    // ============================================================

    createBar() {
        this.element = document.createElement('div');
        this.element.id = 'bottom-bar';
        this.element.style.cssText = `
            position: fixed;
            bottom: 12px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 6px 10px;
            background: rgba(20, 20, 25, 0.75);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 10px;
            backdrop-filter: blur(10px);
            z-index: 14000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            user-select: none;
            pointer-events: auto;
            transition: opacity 0.2s;
        `;

        // action: () => {} — выполнить
        // toggle: () => bool — вернуть состояние (активна ли кнопка)
        const buttons = [
            // --- Patch ---
            { id: 'new',    label: 'Ne', title: 'New patch',       action: () => this.system.resetEverything?.() },
            { id: 'load',   label: 'Lo', title: 'Load patch',      action: () => this.system.loadJsonPatch?.() },
            { id: 'save',   label: 'Sa', title: 'Save patch',      action: () => this.system.exportPatch?.() },
            { id: 'saveas', label: 'SV', title: 'Save patch as…',  action: () => this.system.savePatchAs?.() },
            { id: 'sep1', label: null },

            // --- Zoom ---
            { id: 'zoomout', label: 'Z-', title: 'Zoom out',       action: () => this.system.zoom(-0.2) },
            { id: 'zoomreset', label: '100%', title: 'Reset zoom (100%)', action: () => this.system.resetZoom?.() },
            { id: 'zoomin',  label: 'Z+', title: 'Zoom in',        action: () => this.system.zoom(0.2) },
            { id: 'sep2', label: null },

            // --- Shake ---
            { id: 'shake', label: 'Sh', title: 'Shake all cables', action: () => this.system.patchManager?.shakeAllCables?.(80) },
            { id: 'sep3', label: null },

            // --- Csound run/stop ---
            { id: 'run', label: '▶', title: 'Run / Stop Csound',   action: () => this._toggleCsound() },
            { id: 'csd', label: 'Cs', title: 'Csound window',      toggle: () => this._isCsoundWindowVisible() },
            { id: 'sep4', label: null },

            // --- UI panels ---
            { id: 'design', label: 'De', title: 'Design settings', action: () => this.system.designSettings?.toggle(), toggle: () => !!this.system.designSettings?.isVisible },
            { id: 'stkr',   label: 'St', title: 'Add sticker',     action: () => this._addSticker() },
            { id: 'editor', label: 'Ed', title: 'Module editor',   action: () => this._openEditor() },
            { id: 'sep5', label: null },

            // --- Grid ---
            { id: 'grid',   label: 'Gr', title: 'Toggle grid',     action: () => this._toggleGrid(), toggle: () => !!this.system.showGrid },


            { id: 'sep5b', label: null },

            // --- MIDI ---
            { id: 'midi',   label: 'MI', title: 'Enable MIDI input',  action: () => this._toggleMidi() },

            // --- SysInfo ---
            { id: 'sysinfo', label: 'i', title: 'System info',     action: () => this._toggleSysInfo() },

            // --- About ---
            { id: 'about',  label: '?',  title: 'About',           action: () => this.system.contextMenu?.showAboutDialog?.() },
        ];

        buttons.forEach(b => {
            if (b.id.startsWith('sep')) {
                this.element.appendChild(this._makeSeparator());
            } else {
                const btn = this._makeButton(b);
                this.element.appendChild(btn);
                this._buttons.push({ ...b, element: btn });
            }
        });

        document.body.appendChild(this.element);
        this.makeDraggable();
    }

    _makeButton(cfg) {
        const btn = document.createElement('button');
        btn.textContent = cfg.label;
        btn.title = cfg.title;
        btn.dataset.actionId = cfg.id;
        btn.style.cssText = `
            min-width: 26px;
            height: 26px;
            padding: 0 6px;
            background: transparent;
            border: 1px solid transparent;
            border-radius: 6px;
            color: #888;
            cursor: pointer;
            font-size: 11px;
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            font-weight: 600;
            letter-spacing: 0.5px;
            transition: all 0.15s;
            line-height: 1;
        `;

        btn.onmouseenter = () => {
            const theme = getCurrentTheme();
            const accent = theme.isLcd
                ? (theme.getAccentColor() || '#8fbc8f')
                : '#0af';
            btn.style.background = 'rgba(255, 255, 255, 0.06)';
            btn.style.color = accent;
            btn.style.borderColor = this._rgba(accent, 0.3);
        };
        btn.onmouseleave = () => {
            this._updateButtonState(btn, cfg);
        };
        btn.onclick = (e) => {
            e.stopPropagation();
            this._handleClick(cfg);
        };

        return btn;
    }

    _makeSeparator() {
        const sep = document.createElement('div');
        sep.style.cssText = `
            width: 1px;
            height: 16px;
            background: rgba(255, 255, 255, 0.08);
            margin: 0 4px;
        `;
        return sep;
    }

    // ============================================================
    //  ЛОГИКА
    // ============================================================

    makeDraggable() {
        const bar = this.element;

        // ⭐ Убираем transform (сдвиг вправо на 50%)
        // При первом drag — конвертируем в left/top
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        let hasMoved = false;

        const onMouseDown = (e) => {
            // Не тащим, если кликнули по кнопке
            if (e.target.tagName === 'BUTTON') return;
            if (e.button !== 0) return;

            isDragging = true;
            hasMoved = false;

            const rect = bar.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            // Конвертация в абсолютные координаты
            if (!hasMoved) {
                bar.style.transform = 'none';
                bar.style.left = `${rect.left}px`;
                bar.style.top = `${rect.top}px`;
                bar.style.bottom = 'auto';
                // left: 50% больше не нужно — уже в px
            }

            bar.style.cursor = 'grabbing';
            e.preventDefault();
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            hasMoved = true;

            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            const maxX = window.innerWidth - bar.offsetWidth;
            const maxY = window.innerHeight - bar.offsetHeight;

            bar.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            bar.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
        };

        const onMouseUp = () => {
            if (!isDragging) return;
            isDragging = false;
            bar.style.cursor = '';
        };

        bar.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // ⭐ Сохранить позицию (в localStorage) — опционально
        // При загрузке — восстановить
    }


    async _handleClick(cfg) {
        if (cfg.toggle) {
            // Для toggle — просто вызываем, состояние посчитаем в refreshState
        }
        if (cfg.action) {
            try {
                await cfg.action();
            } catch (e) {
                console.error(`[BottomBar] action ${cfg.id} failed:`, e);
            }
        }
        this.refreshState();
        // ⭐ Обновить SysInfo, если открыт
        if (this._sysInfoOpen) this._updateSysInfoContent();
    }

    async _toggleCsound() {
        const engine = this.system?.csoundEngine;
        if (!engine) return;

        if (engine.state === 'idle' || engine.state === 'error') {
            await engine.init();
        } else if (engine.state === 'running') {
            await engine.stop();
        }
        // 'initializing' — игнорируем клик
        this.refreshState();
    }

    _isCsoundWindowVisible() {
        const el = this.system.csoundWindow?.windowElement
            || document.getElementById('csound-window');
        if (!el) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    _toggleCsoundWindow() {
        const w = this.system.csoundWindow;
        if (!w) return;
        if (typeof w.toggle === 'function') {
            w.toggle();
        } else if (typeof w.show === 'function' && typeof w.hide === 'function') {
            const el = w.windowElement || document.getElementById('csound-window');
            if (el && (el.style.display === 'block' || el.style.display === '')) {
                w.hide();
            } else {
                w.show();
            }
        }
    }

    async _toggleMidi() {
        const midi = this.system?.midiManager;
        if (!midi) {
            this.system.showNotification?.('❌ MIDI manager not initialized');
            return;
        }

        if (midi.state === 'ready') {
            midi.dispose();
            this.system.showNotification?.('🎹 MIDI disabled');
            return;
        }

        const ok = await midi.init();
        if (ok) {
            const info = midi.getInfo();
            const n = info.inputCount;
            this.system.showNotification?.(
                n > 0
                    ? `🎹 MIDI enabled — ${n} device${n === 1 ? '' : 's'}`
                    : '🎹 MIDI enabled — no devices found',
            );
        } else if (midi.state === 'denied') {
            this.system.showNotification?.('❌ MIDI access denied');
        } else if (midi.state === 'unsupported') {
            this.system.showNotification?.('❌ Web MIDI not supported in this browser');
        }
    }

    _toggleGrid() {
        this.system.showGrid = !this.system.showGrid;
        this.system.forceRedraw();
    }

    _addSticker() {
        const worldX = (window.innerWidth  / 2 - this.system.offsetX) / this.system.scale;
        const worldY = (window.innerHeight / 2 - this.system.offsetY) / this.system.scale;
        const sticker = this.system.addStickerAtPosition(worldX, worldY, {
            text: 'New sticker',
            gridW: 8,
            gridH: 2,
        });
        if (sticker) this.system.selectSticker(sticker);
    }

    _openEditor() {
        this.system.contextMenu?.openModuleEditor?.();
    }

    // ============================================================
    //  SYSINFO POPUP
    // ============================================================

    createSysInfoPopup() {
        this._sysInfoPopup = document.createElement('div');
        this._sysInfoPopup.id = 'bottom-bar-sysinfo';
        this._sysInfoPopup.style.cssText = `
            position: fixed;
            bottom: 54px;
            left: 50%;
            transform: translateX(-50%);
            min-width: 260px;
            max-width: 340px;
            background: rgba(20, 20, 25, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 10px;
            padding: 12px 14px;
            color: #ccc;
            font-family: 'JetBrains Mono', 'Consolas', monospace;
            font-size: 11px;
            line-height: 1.5;
            z-index: 14001;
            backdrop-filter: blur(10px);
            display: none;
            user-select: none;
            pointer-events: none;
        `;
        document.body.appendChild(this._sysInfoPopup);
    }

    _toggleSysInfo() {
        this._sysInfoOpen = !this._sysInfoOpen;
        if (this._sysInfoOpen) {
            this._updateSysInfoContent();
            this._sysInfoPopup.style.display = 'block';
        } else {
            this._sysInfoPopup.style.display = 'none';
        }
        this.refreshState();
    }

    _updateSysInfoContent() {
        const s = this.system;
        if (!s) return;

        const theme = getCurrentTheme();
        const accent = theme.isLcd
            ? (theme.getAccentColor() || '#8fbc8f')
            : '#0af';

        const modules = (s.components || []).filter(
            c => c.constructor?.name === 'Panel'
        ).length;
        const cables = s.patchManager?.cables?.length || 0;
        const stickers = s.stickers?.length || 0;

        const cs = s.csoundEngine?.state || 'idle';
        const csColor = {
            idle: '#888',
            initializing: '#fa0',
            running: '#0f0',
            error: '#f44',
        }[cs] || '#fff';

        const zoom = Math.round((s.scale || 1) * 100);
        const fps = s.currentFPS || 0;
        const fpsColor = fps < 30 ? '#f66' : fps < 50 ? '#ff6' : '#6f6';

        const grid = s.grid;
        const gridStep = grid ? `${grid.stepX}×${grid.stepY}px` : '—';
        const gridSnap = grid?.snap ? 'on' : 'off';

        const patchName = s.currentPatchFilename || '(unsaved)';

        const row = (label, value, color = '#aaa') =>
            `<div style="display:flex;justify-content:space-between;gap:16px;">
                <span style="color:#666;">${label}</span>
                <span style="color:${color};font-weight:bold;">${value}</span>
             </div>`;

        this._sysInfoPopup.innerHTML = `
            <div style="color:${accent};font-weight:bold;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">
                ● SYSTEM
            </div>
            ${row('Patch', patchName)}
            ${row('Modules', modules)}
            ${row('Cables', cables)}
            ${row('Stickers', stickers)}
            ${row('FPS', fps, fpsColor)}
            ${row('Zoom', zoom + '%')}
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);">
                ${row('Grid', gridStep + ' / snap ' + gridSnap)}
                ${row('Csound', cs.toUpperCase(), csColor)}
                ${row('MIDI', `${midiState.toUpperCase()} / ${midiInputs} in`, midiColor)}
                ${row('Last MIDI', midiLastDesc, '#aaa')}
            </div>
        `;

        const midi = s.midiManager;
        const midiState = midi?.state || 'idle';
        const midiColor = {
            idle: '#888',
            requesting: '#fa0',
            ready: '#0f0',
            denied: '#f44',
            unsupported: '#f44',
        }[midiState] || '#888';
        const midiInputs = midi?.getInfo?.().inputCount ?? 0;
        const midiLast = midi?._lastMessage;
        const midiLastDesc = midiLast
            ? `${midiLast.status.toString(16).padStart(2, '0')} ${midiLast.data1} ${midiLast.data2}`
            : '—';

    }

    // ============================================================
    //  СОСТОЯНИЕ И ТЕМА
    // ============================================================

    refreshState() {
        this._buttons.forEach(b => this._updateButtonState(b.element, b));
        // zoom-percent
        const zoomBtn = this._buttons.find(b => b.id === 'zoomreset');
        if (zoomBtn) {
            const pct = Math.round((this.system.scale || 1) * 100);
            zoomBtn.element.textContent = `${pct}%`;
        }
    }

    _updateButtonState(btn, cfg) {
        const theme = getCurrentTheme();
        const accent = theme.isLcd
            ? (theme.getAccentColor() || '#8fbc8f')
            : '#0af';

        let active = false;

        if (cfg.id === 'design') {
            active = !!this.system.designSettings?.isVisible;
        } else if (cfg.id === 'csd') {
            active = this._isCsoundWindowVisible();
        } else if (cfg.id === 'grid') {
            active = !!this.system.showGrid;
        } else if (cfg.id === 'sysinfo') {
            active = this._sysInfoOpen;
        } else if (cfg.id === 'run') {
            active = this.system.csoundEngine?.state === 'running';
        } else if (cfg.id === 'midi') {
            active = this.system.midiManager?.state === 'ready';
            // ⭐ Если MIDI включён — показываем количество устройств
            const midi = this.system.midiManager;
            if (midi && midi.state === 'ready') {
                const n = midi.getInfo().inputCount;
                btn.textContent = n > 0 ? `MI${n}` : 'MI';
            } else {
                btn.textContent = 'MI';
            }
        }

        // Run-button: динамическая иконка и цвет
        if (cfg.id === 'run') {
            const state = this.system.csoundEngine?.state || 'idle';
            const map = {
                idle:         { icon: '▶',  color: '#888',  title: 'Run Csound' },
                initializing: { icon: '⏳', color: '#fa0',  title: 'Starting…' },
                running:      { icon: '■',  color: '#0f0',  title: 'Stop Csound' },
                error:        { icon: '⟳',  color: '#f44',  title: 'Retry' },
            };
            const m = map[state] || map.idle;
            btn.textContent = m.icon;
            btn.title = m.title;
            btn.style.background = this._rgba(m.color, 0.15);
            btn.style.color = m.color;
            btn.style.borderColor = this._rgba(m.color, 0.4);
            return;
        }

        if (active) {
            btn.style.background = this._rgba(accent, 0.15);
            btn.style.color = accent;
            btn.style.borderColor = this._rgba(accent, 0.5);
        } else {
            btn.style.background = 'transparent';
            btn.style.color = '#888';
            btn.style.borderColor = 'transparent';
        }
    }


    applyTheme() {
        const theme = getCurrentTheme();
        const accent = theme.isLcd
            ? (theme.getAccentColor() || '#8fbc8f')
            : '#0af';

        // ⭐ Фон — accent с очень низкой альфой
        this.element.style.background = this._rgba(accent, 0.12);
        this.element.style.borderColor = this._rgba(accent, 0.25);

        if (theme.isLcd) {
            this.element.style.boxShadow = `0 0 20px ${this._rgba(accent, 0.2)}`;
            this._sysInfoPopup.style.boxShadow = `0 0 20px ${this._rgba(accent, 0.2)}`;
        } else {
            this.element.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
            this._sysInfoPopup.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        }

        // SysInfo popup — тот же цвет фона
        this._sysInfoPopup.style.background = this._rgba(accent, 0.12);
        this._sysInfoPopup.style.borderColor = this._rgba(accent, 0.25);

        this.refreshState();
    }

    // ============================================================
    //  ПЕРИОДИЧЕСКИЙ ТИК
    // ============================================================

    _tick() {
        // zoom % (кнопка «100%» показывает текущий)
        const zoomBtn = this._buttons.find(b => b.id === 'zoomreset');
        if (zoomBtn) {
            const pct = Math.round((this.system.scale || 1) * 100);
            if (zoomBtn.element.textContent !== `${pct}%`) {
                zoomBtn.element.textContent = `${pct}%`;
            }
        }

        // SysInfo — обновляем содержимое, если открыт
        if (this._sysInfoOpen) this._updateSysInfoContent();

        // Run-кнопка — состояние Csound могло измениться извне
        const runBtn = this._buttons.find(b => b.id === 'run');
        if (runBtn) this._updateButtonState(runBtn.element, runBtn);
    }

    // ============================================================
    //  ПОДПИСКА НА CSOUND
    // ============================================================

    setupCsoundListener() {
        const engine = this.system?.csoundEngine;
        if (!engine || typeof engine.onStateChange !== 'function') return;

        engine.onStateChange((state) => {
            const runBtn = this._buttons.find(b => b.id === 'run');
            if (runBtn) this._updateButtonState(runBtn.element, runBtn);
            if (this._sysInfoOpen) this._updateSysInfoContent();
        });
    }

    // ============================================================
    //  УТИЛИТЫ
    // ============================================================

    _rgba(hex, alpha) {
        let h = String(hex || '#ffffff').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    _flashMidiLed() {
        const btn = this._buttons.find(b => b.id === 'midi');
        if (!btn) return;

        // Сбросить старый таймер, если был
        if (this._midiFlashTimer) clearTimeout(this._midiFlashTimer);

        const theme = getCurrentTheme();
        const accent = theme.isLcd ? (theme.getAccentColor() || '#8fbc8f') : '#0af';

        btn.element.style.background = this._rgba(accent, 0.45);
        btn.element.style.color = '#fff';

        this._midiFlashTimer = setTimeout(() => {
            this._midiFlashTimer = null;
            this._updateButtonState(btn.element, btn);
        }, 120);
    }


    setupEvents() {
        // Смена темы
        document.addEventListener('csmodular:theme-changed', () => {
            this.applyTheme();
        });

        // Клик мимо SysInfo — закрыть
        document.addEventListener('mousedown', (e) => {
            if (!this._sysInfoOpen) return;
            if (this._sysInfoPopup.contains(e.target)) return;
            if (this.element.contains(e.target)) {
                // клик по самой панели — решается в action кнопки
                return;
            }
            this._sysInfoOpen = false;
            this._sysInfoPopup.style.display = 'none';
            this.refreshState();
        });

        // Escape — закрыть SysInfo
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._sysInfoOpen) {
                this._sysInfoOpen = false;
                this._sysInfoPopup.style.display = 'none';
                this.refreshState();
            }
        });

        // ⭐ MIDI: обновлять состояние кнопки при смене статуса
        const midi = this.system?.midiManager;
        if (midi) {
            midi.onStateChange(() => this.refreshState());
            midi.onMessage(() => this._flashMidiLed());
        }

    }

    show()   { this.element.style.display = 'flex'; }
    hide()   { this.element.style.display = 'none'; }
    toggle() {
        if (this.element.style.display === 'none') this.show();
        else this.hide();
    }
}