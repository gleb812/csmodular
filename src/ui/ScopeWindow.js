// src/ui/ScopeWindow.js
//
// Многоканальный осциллограф для CsModular.
// Привязывается к кабелям (ZAK bus) через JackContextMenu.
// Читает ring-buffer из Csound через CsoundEngine.getScopeBuffer(cableId).

import { getCurrentTheme } from '../theme/currentTheme.js';

const BUFFER_SIZE = 4096;          // должно совпадать с ftgen в CsoundGenerator
const MAX_CHANNELS = 8;
const DEFAULT_VIEW_SIZE = 1024;    // сколько сэмплов показывать на экран
const MIN_VIEW_SIZE = 64;
const MAX_VIEW_SIZE = BUFFER_SIZE;

const CHANNEL_COLORS = [
    '#ef4444', // red
    '#22c55e', // green
    '#3b82f6', // blue
    '#eab308', // yellow
    '#a855f7', // purple
    '#06b6d4', // cyan
    '#f97316', // orange
    '#ec4899', // pink
];

export class ScopeWindow {
    constructor(system) {
        this.system = system;
        this.channels = new Map();   // cableId -> { cable, tableNum, color, visible, viewSize, voltDiv, offsetY, trigger, triggerLevel }
        this.isVisible = false;

        // Перетаскивание окна
        this._dragState = null;

        // Рисование
        this._rafId = null;
        this._canvas = null;
        this._ctx = null;

        this._buildDOM();
        this._startRenderLoop();
    }

    // ============================================
    // DOM
    // ============================================

    _buildDOM() {
        const root = document.createElement('div');
        root.id = 'scope-window';
        root.style.cssText = `
            position: fixed;
            left: 80px;
            top: 80px;
            width: 560px;
            height: 360px;
            background: rgba(20, 20, 20, 0.95);
            border: 1px solid #444;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            z-index: 15000;
            display: none;
            flex-direction: column;
            font-family: Arial, sans-serif;
            color: #ddd;
            user-select: none;
            overflow: hidden;
        `;

        // Заголовок
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: #2a2a2a;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: move;
            flex-shrink: 0;
        `;
        header.innerHTML = `<span style="color:#0af;font-weight:bold;font-size:13px">📊 Oscilloscope</span>`;

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕';
        closeBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #888;
            font-size: 16px;
            cursor: pointer;
            padding: 0 4px;
            line-height: 1;
        `;
        closeBtn.onmouseenter = () => closeBtn.style.color = '#fff';
        closeBtn.onmouseleave = () => closeBtn.style.color = '#888';
        closeBtn.onclick = () => this.hide();
        header.appendChild(closeBtn);

        // Панель каналов
        const channelBar = document.createElement('div');
        channelBar.id = 'scope-channels';
        channelBar.style.cssText = `
            display: flex;
            gap: 4px;
            padding: 6px 8px;
            background: #1e1e1e;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
            flex-wrap: wrap;
            min-height: 28px;
            align-items: center;
        `;

        const emptyHint = document.createElement('span');
        emptyHint.id = 'scope-empty-hint';
        emptyHint.style.cssText = 'color:#666;font-size:11px;font-style:italic;';
        emptyHint.textContent = 'No channels. Right-click a jack → Send to Scope.';
        channelBar.appendChild(emptyHint);

        // Canvas
        const canvasWrap = document.createElement('div');
        canvasWrap.style.cssText = `
            flex: 1;
            position: relative;
            background: #0a0a0a;
            overflow: hidden;
        `;

        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            display: block;
            width: 100%;
            height: 100%;
        `;
        canvasWrap.appendChild(canvas);

        // Панель управления (общая)
        const controls = document.createElement('div');
        controls.style.cssText = `
            display: flex;
            gap: 12px;
            padding: 6px 10px;
            background: #1a1a1a;
            border-top: 1px solid #333;
            font-size: 11px;
            flex-shrink: 0;
            align-items: center;
            flex-wrap: wrap;
        `;

        controls.appendChild(this._makeControlGroup('Time/div', 'time-view-size', (v) => {
            this._forEachChannel(ch => ch.viewSize = v);
        }, DEFAULT_VIEW_SIZE, MIN_VIEW_SIZE, MAX_VIEW_SIZE, 64));

        controls.appendChild(this._makeControlGroup('Volt/div', 'volt-div', (v) => {
            this._forEachChannel(ch => ch.voltDiv = v);
        }, 1.0, 0.1, 10, 0.1, 0.1));

        controls.appendChild(this._makeControlGroup('Offset', 'offset-y', (v) => {
            this._forEachChannel(ch => ch.offsetY = v);
        }, 0, -1, 1, 0.05, 0.01));

        const triggerToggle = document.createElement('label');
        triggerToggle.style.cssText = 'display:flex;align-items:center;gap:4px;cursor:pointer;';
        triggerToggle.innerHTML = `<input type="checkbox" id="scope-trigger" checked> Trigger`;
        triggerToggle.querySelector('input').onchange = (e) => {
            this._forEachChannel(ch => ch.trigger = e.target.checked);
        };
        controls.appendChild(triggerToggle);

        root.appendChild(header);
        root.appendChild(channelBar);
        root.appendChild(canvasWrap);
        root.appendChild(controls);

        document.body.appendChild(root);
        this._root = root;
        this._header = header;
        this._channelBar = channelBar;
        this._canvas = canvas;
        this._ctx = canvas.getContext('2d');

        // Перетаскивание окна
        this._setupDrag(header);

        // Resize canvas
        const ro = new ResizeObserver(() => this._resizeCanvas());
        ro.observe(canvasWrap);
        this._resizeCanvas();
    }

    _makeControlGroup(label, id, onChange, initial, min, max, step, displayStep = null) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;align-items:center;gap:6px;';

        const lbl = document.createElement('span');
        lbl.textContent = label + ':';
        lbl.style.color = '#888';

        const input = document.createElement('input');
        input.type = 'range';
        input.id = 'scope-' + id;
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = initial;
        input.style.cssText = 'width:80px;';

        const val = document.createElement('span');
        val.style.cssText = 'color:#0af;font-family:monospace;min-width:36px;';
        val.textContent = displayStep !== null ? initial.toFixed(2) : String(initial);

        input.oninput = () => {
            const v = parseFloat(input.value);
            val.textContent = displayStep !== null ? v.toFixed(2) : String(v);
            onChange(v);
        };

        wrap.appendChild(lbl);
        wrap.appendChild(input);
        wrap.appendChild(val);
        return wrap;
    }

    _setupDrag(handle) {
        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            this._dragState = {
                startX: e.clientX,
                startY: e.clientY,
                startLeft: parseInt(this._root.style.left) || 0,
                startTop: parseInt(this._root.style.top) || 0,
            };
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this._dragState) return;
            const dx = e.clientX - this._dragState.startX;
            const dy = e.clientY - this._dragState.startY;
            this._root.style.left = (this._dragState.startLeft + dx) + 'px';
            this._root.style.top = (this._dragState.startTop + dy) + 'px';
        });

        document.addEventListener('mouseup', () => {
            this._dragState = null;
        });
    }

    _resizeCanvas() {
        if (!this._canvas || !this._canvas.parentElement) return;
        const rect = this._canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this._canvas.width = rect.width * dpr;
        this._canvas.height = rect.height * dpr;
        this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._cssWidth = rect.width;
        this._cssHeight = rect.height;
    }

    // ============================================
    // КАНАЛЫ
    // ============================================

    addChannel(cableId, tableNum, cable) {
        if (this.channels.has(cableId)) {
            this.show();
            return;
        }

        if (this.channels.size >= MAX_CHANNELS) {
            this.system.showNotification(`⚠️ Max ${MAX_CHANNELS} channels`);
            return;
        }

        const color = CHANNEL_COLORS[this.channels.size % CHANNEL_COLORS.length];

        this.channels.set(cableId, {
            cableId,
            tableNum,
            cable,
            color,
            visible: true,
            viewSize: DEFAULT_VIEW_SIZE,
            voltDiv: 1.0,
            offsetY: 0,
            trigger: true,
            triggerLevel: 0,
        });

        this._renderChannelBar();
        this.show();
    }

    removeChannel(cableId) {
        this.channels.delete(cableId);
        this._renderChannelBar();
        if (this.channels.size === 0) {
            // Не закрываем окно — пользователь сам закроет
        }
    }

    _forEachChannel(cb) {
        for (const ch of this.channels.values()) cb(ch);
    }

    _renderChannelBar() {
        // Очищаем всё, кроме hint
        this._channelBar.innerHTML = '';

        if (this.channels.size === 0) {
            const hint = document.createElement('span');
            hint.style.cssText = 'color:#666;font-size:11px;font-style:italic;';
            hint.textContent = 'No channels. Right-click a jack → Send to Scope.';
            this._channelBar.appendChild(hint);
            return;
        }

        let idx = 1;
        for (const [cableId, ch] of this.channels) {
            const chip = document.createElement('div');
            chip.style.cssText = `
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 2px 6px;
                border-radius: 4px;
                background: ${ch.visible ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)'};
                border: 1px solid ${ch.visible ? ch.color : '#333'};
                font-size: 10px;
                cursor: pointer;
                opacity: ${ch.visible ? '1' : '0.5'};
            `;

            const swatch = document.createElement('span');
            swatch.style.cssText = `
                display: inline-block;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${ch.color};
            `;

            const label = document.createElement('span');
            const modName = ch.cable?.fromJack?.parentModule?.title || '?';
            label.textContent = `${idx}: ${modName}`;

            const closeBtn = document.createElement('span');
            closeBtn.textContent = '✕';
            closeBtn.style.cssText = 'color:#888;margin-left:2px;font-size:11px;';
            closeBtn.onclick = (e) => {
                e.stopPropagation();
                this.removeChannel(cableId);
            };

            chip.onclick = () => {
                ch.visible = !ch.visible;
                this._renderChannelBar();
            };

            chip.appendChild(swatch);
            chip.appendChild(label);
            chip.appendChild(closeBtn);
            this._channelBar.appendChild(chip);
            idx++;
        }
    }

    // ============================================
    // ПОКАЗ / СКРЫТИЕ
    // ============================================

    show() {
        this._root.style.display = 'flex';
        this.isVisible = true;
    }

    hide() {
        this._root.style.display = 'none';
        this.isVisible = false;
    }

    toggle() {
        if (this.isVisible) this.hide();
        else this.show();
    }

    // ============================================
    // РЕНДЕР
    // ============================================

    _startRenderLoop() {
        const loop = () => {
            if (this.isVisible) {
                try { this._draw(); } catch (e) { console.error('[ScopeWindow] draw error:', e); }
            }
            this._rafId = requestAnimationFrame(loop);
        };
        this._rafId = requestAnimationFrame(loop);
    }

    _draw() {
        const ctx = this._ctx;
        if (!ctx || !this._cssWidth) return;

        const theme = getCurrentTheme();
        const W = this._cssWidth;
        const H = this._cssHeight;

        // Фон
        ctx.fillStyle = theme.isLcd ? theme.getSurfaceColor() : '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        // Сетка
        this._drawGrid(ctx, W, H, theme);

        // Центральная линия (0)
        ctx.strokeStyle = theme.isLcd ? theme.getLineColor() : '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();

        // Каналы
        const engine = this.system.csoundEngine;
        if (!engine) {
            this._drawNoSignal(ctx, W, H, theme);
            return;
        }

        const activeChannels = [...this.channels.values()].filter(ch => ch.visible);
        if (activeChannels.length === 0) {
            this._drawNoSignal(ctx, W, H, theme);
            return;
        }

        for (const ch of activeChannels) {
            const buffer = engine.getScopeBuffer(ch.cableId);
            if (!buffer || buffer.length === 0) continue;

            this._drawChannel(ctx, ch, buffer, W, H, theme);
        }
    }

    _drawGrid(ctx, W, H, theme) {
        ctx.strokeStyle = theme.isLcd ? theme.getGridStyle().color : '#1a1a1a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const divsX = 8;
        const divsY = 4;
        for (let i = 1; i < divsX; i++) {
            const x = (W / divsX) * i;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H);
        }
        for (let i = 1; i < divsY; i++) {
            const y = (H / divsY) * i;
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
        }
        ctx.stroke();
    }

    _drawNoSignal(ctx, W, H, theme) {
        ctx.fillStyle = theme.isLcd ? theme.getTextColor() : '#555';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No signal', W / 2, H / 2 - 10);
    }

    _drawChannel(ctx, ch, buffer, W, H, theme) {
        const viewSize = Math.min(ch.viewSize, buffer.length);
        const startIdx = this._findTrigger(buffer, viewSize, ch.trigger ? ch.triggerLevel : null);

        // Индекс для отображения: от startIdx, viewSize сэмплов, с wrap по buffer.length
        const samples = new Float32Array(viewSize);
        for (let i = 0; i < viewSize; i++) {
            samples[i] = buffer[(startIdx + i) % buffer.length];
        }

        const centerY = H / 2 + ch.offsetY * H / 2;
        const scaleY = (H / 2) * ch.voltDiv;

        ctx.strokeStyle = ch.color;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = 'round';

        if (theme.isLcd) {
            theme.applyGlow(ctx);
        }

        ctx.beginPath();
        for (let i = 0; i < viewSize; i++) {
            const x = (i / (viewSize - 1)) * W;
            const y = centerY - samples[i] * scaleY;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        theme.clearGlow(ctx);

        // Метка канала
        ctx.fillStyle = ch.color;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`CH`, 4, 4 + (this.channels.size > 1 ? ch._index || 0 : 0));
    }

    /**
     * Найти индекс триггера: первый переход через triggerLevel снизу вверх.
     * Если triggerLevel === null — не триггерим, возвращаем 0.
     */
    _findTrigger(buffer, viewSize, triggerLevel) {
        if (triggerLevel === null) return 0;
        const len = buffer.length;
        // Ищем в первой половине буфера (чтобы waveform не «уезжал» в конец)
        const searchEnd = len - viewSize;
        if (searchEnd <= 1) return 0;

        let prev = buffer[0];
        for (let i = 1; i < searchEnd; i++) {
            const cur = buffer[i];
            if (prev < triggerLevel && cur >= triggerLevel) {
                return i;
            }
            prev = cur;
        }
        return 0;
    }

    destroy() {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (this._root && this._root.parentElement) {
            this._root.parentElement.removeChild(this._root);
        }
        this.channels.clear();
    }
}