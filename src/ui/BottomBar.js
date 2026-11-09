// src/ui/BottomBar.js
//
// Bottom toolbar for CsModular. CSS-grid 6×4 panel with:
//   A1 — collapse toggle (▼ / ▶)
//   A2 — BPM panel: 7-seg display (XXX.X), EXT/MIDI/OSC mode toggles
//   A3 — zoom column: + / · / −
//   A4..C5 — misc action buttons
//   A6 — master fader
//   D5 — reserved (empty)
//
// Sizes are configurable via CONFIG and persisted in localStorage.
// All styles are scoped to #bottom-bar — no global CSS pollution.

import { getCurrentTheme } from '../theme/currentTheme.js';
import { SevenSegmentDisplay } from './SevenSegmentDisplay.js';

// ============================================================
//  CONFIG — sizes and persistence
// ============================================================
const CONFIG = {
    colWidths:  [40, 288, 16, 40, 40, 16],
    rowHeights: [24, 24, 24, 22],
    gap: 0,
    storageKey: 'csmodular:bottombar',
    bpmMin: 20,
    bpmMax: 300,
};

export class BottomBar {
    constructor(system) {
        this.system = system;
        this.element = null;
        this._sysInfoOpen = false;
        this._sysInfoPopup = null;
        this._tickInterval = null;
        this._midiInLamp  = null;
        this._midiOutLamp = null;
        this._oscLamp     = null;
        this._oscSettings = null;

        // DOM refs for BPM panel
        this._bpmDisplay = null;     // SevenSegmentDisplay instance
        this._bpmModeBtns = {};      // { ext, midi, osc }
        this._bpmDragging = false;

        // Collapse state
        this._gridWrap = null;
        this._collapsedBar = null;

        // Volume (UI 0..1, 0.5 = unity gain / 0 dB)
        this._faderFill = null;
        this._faderThumb = null;
        this._faderUnityMark = null;
        this._volume = this._dbToUi(0);   // unity (0 dB) by default

        // sizes (loaded from storage)
        this._colWidths  = this._loadJSON('cols')  || CONFIG.colWidths.slice();
        this._rowHeights = this._loadJSON('rows')  || CONFIG.rowHeights.slice();
        this._gap        = this._loadJSON('gap')   ?? CONFIG.gap;
        this._collapsed  = this._loadJSON('collapsed') ?? false;

        this._injectStyles();
        this.createBar();
        this.createSysInfoPopup();
        this.setupEvents();
        this.setupCsoundListener();
        this.applyTheme();
        this.refreshState();
        this.setCollapsed(this._collapsed);

        this._tickInterval = setInterval(() => this._tick(), 250);
    }

    // ============================================================
    //  STYLES (scoped to #bottom-bar)
    // ============================================================
    _injectStyles() {
        if (document.getElementById('bottom-bar-styles')) return;
        const style = document.createElement('style');
        style.id = 'bottom-bar-styles';
        style.textContent = `
#bottom-bar {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    padding: 6px 8px;
    border-radius: 10px;
    backdrop-filter: blur(10px);
    z-index: 14000;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 12px;
    user-select: none;
    pointer-events: auto;
    transition: opacity 0.2s, background 0.2s, border-color 0.2s;
    border: 1px solid rgba(255,255,255,0.06);
}
#bottom-bar .bb-grid-wrap {
    position: relative;
}
#bottom-bar .bb-grid {
    display: grid;
    position: relative;
}
#bottom-bar .bb-grid-wrap.collapsed .bb-grid { display: none; }
#bottom-bar .bb-grid-wrap.collapsed { padding: 0; }

/* ---- Collapsed bar ---- */
#bottom-bar .bb-collapsed-bar {
    display: none;
    align-items: center;
    gap: 6px;
    height: 28px;
    min-width: 120px;
}
#bottom-bar .bb-grid-wrap.collapsed .bb-collapsed-bar { display: flex; }
#bottom-bar .bb-expand-btn {
    width: 28px; height: 28px;
    background: transparent;
    border: var(--bb-accent-06, rgba(255,255,255,0.06));
    border-radius: 6px;
    color: var(--bb-accent, #0af);
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    flex: 0 0 auto;
    transition: background 0.1s, border-color 0.1s;
}
#bottom-bar .bb-collapsed-run {
    width: 28px; height: 28px;
    background: transparent;
    border: 1px solid var(--bb-accent-30, rgba(0,170,255,0.3));
    border-radius: 6px;
    color: #888;
    font-family: inherit;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    flex: 0 0 auto;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
}

#bottom-bar .bb-collapsed-bpm {
    flex: 0 0 auto;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--bb-bpm-color, #ff3b30);
    text-shadow: 0 0 6px var(--bb-bpm-color, #ff3b30);
    padding: 0 4px;
    min-width: 32px;
    text-align: center;
    user-select: none;
}

#bottom-bar .bb-collapsed-run:hover {
    background: var(--bb-accent-12, rgba(0,170,255,0.12));
    border-color: var(--bb-accent, #0af);
}            
#bottom-bar .bb-expand-btn:hover {
    background: var(--bb-accent-12, rgba(0,170,255,0.12));
    border-color: var(--bb-accent, #0af);
}
#bottom-bar .bb-drag-handle {
    flex: 1 1 auto;
    height: 28px;
    cursor: grab;
    border-radius: 6px;
}
#bottom-bar .bb-drag-handle:active { cursor: grabbing; }

/* ---- Base cells ---- */
#bottom-bar .bb-cell {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    overflow: hidden;
}
#bottom-bar .bb-cell.filled {
    background: transparent;
    border-color: var(--bb-accent-30, rgba(0,170,255,0.3));
}
#bottom-bar .bb-cell.empty {
    background: transparent;
    border: 1px solid rgba(255,255,255,0.04);
}
#bottom-bar .bb-cell .bb-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--bb-accent-06, rgba(255,255,255,0.06));
    text-align: center;
    padding: 0 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ---- Generic button inside cell ---- */
#bottom-bar .bb-btn {
    width: 100%;
    height: 100%;
    min-width: 0;
    background: transparent;
    border: none;
    color: #888;
    cursor: pointer;
    font-size: 11px;
    font-family: inherit;
    font-weight: 600;
    letter-spacing: 0.5px;
    transition: background 0.15s, color 0.15s;
    line-height: 1;
    padding: 0;
}

#bottom-bar .bb-btn:hover {
    background: var(--bb-accent-06, rgba(255,255,255,0.06));
    color: var(--bb-accent, #0af);
}
#bottom-bar .bb-btn.active {
    background: var(--bb-accent-15, rgba(0,170,255,0.15));
    color: var(--bb-accent, #0af);
}

/* ---- A1: collapse button ---- */
#bottom-bar .bb-collapse-btn {
    width: 100%; height: 100%;
    background: transparent;
    border: none;
    color: #888;
    font-family: inherit;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
}
#bottom-bar .bb-collapse-btn:hover {
    background: var(--bb-accent-12, rgba(0,170,255,0.12));
    color: var(--bb-accent, #0af);
}

/* ---- A2: BPM panel ---- */
#bottom-bar .bb-bpm-panel {
    background: #000 !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    display: flex;
    flex-direction: column;
    padding: 4px 6px 4px;
    gap: 2px;
    overflow: hidden;
}
#bottom-bar .bb-bpm-main {
    flex: 1 1 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-height: 0;
    cursor: ns-resize;
    user-select: none;
}
#bottom-bar .bb-bpm-main:active { cursor: grabbing; }

#bottom-bar .bb-bpm-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--bb-bpm-color, #ff3b30);
    box-shadow: 0 0 4px var(--bb-bpm-color, #ff3b30);
    align-self: flex-end;
    margin-bottom: 6px;
    flex: 0 0 auto;
}
#bottom-bar .bb-bpm-frac-disp {
    /* shrink the 1-digit SevenSegmentDisplay */
    transform: scale(0.5);
    transform-origin: bottom left;
    margin-bottom: 0;
    margin-left: -4px;
    flex: 0 0 auto;
}

#bottom-bar .bb-bpm-bottom {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 2px 0 0;
    border-top: 1px solid rgba(255,255,255,0.05);
    flex: 0 0 auto;
    width: 100%;
}
#bottom-bar .bb-bpm-modes {
    display: flex;
    flex: 1 1 auto;
    justify-content: space-between;
    gap: 0;
    min-width: 0;
}
#bottom-bar .bb-bpm-mode {
    flex: 1 1 0;
    text-align: center;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #333;
    padding: 3px 2px;
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    transition: color 0.12s, text-shadow 0.12s;
    min-width: 0;
    white-space: nowrap;
}

#bottom-bar .bb-zoom-label {
    flex: 0 0 auto;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.5px;
    color: #666;
    padding: 0 2px;
    min-width: 28px;
    text-align: right;
    transition: color 0.12s, text-shadow 0.12s;
}
#bottom-bar .bb-zoom-label.active {
    color: var(--bb-bpm-color, #ff3b30);
    text-shadow: 0 0 6px var(--bb-bpm-color, #ff3b30);
}

#bottom-bar .bb-bpm-mode {
    flex: 1 1 0;
    text-align: center;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 1px;
    color: #333;
    padding: 3px 0;
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    transition: color 0.12s, text-shadow 0.12s;
}
#bottom-bar .bb-bpm-mode:hover { color: #666; }
#bottom-bar .bb-bpm-mode.active {
    color: var(--bb-bpm-color, #ff3b30);
    text-shadow: 0 0 6px var(--bb-bpm-color, #ff3b30);
}
/* ---- A3: zoom column ---- */
#bottom-bar .bb-zoom-col {
    background:transparent;
    border: var(--bb-accent-30, rgba(0,170,255,0.3));
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
#bottom-bar .bb-zoom-btn {
    flex: 1 1 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: var(--bb-accent, #0af); 
    font-family: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.1s;
    padding: 0;
}

#bottom-bar .bb-zoom-btn:hover { background: var(--bb-accent-12, rgba(0,170,255,0.12)); }
#bottom-bar .bb-zoom-btn:active { background: var(--bb-accent-25, rgba(0,170,255,0.25)); }
#bottom-bar .bb-zoom-btn + .bb-zoom-btn {
    border-top: 1px solid var(--bb-accent-15, rgba(255,255,255,0.06));
}

/* ---- A6: volume column ---- */
#bottom-bar .bb-volume-col {
    background: transparent;
    border: 1px solid var(--bb-accent-30, rgba(0,170,255,0.3));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 6px 0;
    overflow: hidden;
}
#bottom-bar .bb-fader-track {
    position: relative;
    width: 5px;
    flex: 1 1 auto;
    min-height: 24px;
    background: #1a1a22;
    border-radius: 3px;
    border: 1px solid rgba(255,255,255,0.06);
    cursor: ns-resize;
    align-self: stretch;
    margin: 0 auto;
}

#bottom-bar .bb-fader-unity {
    position: absolute;
    left: -4px;
    right: -4px;
    height: 1px;
    background: var(--bb-accent-70, rgba(0,170,255,0.7));
    pointer-events: none;
    opacity: 0.8;
}

#bottom-bar .bb-fader-thumb {
    /* твоё существующее; убедись что bottom ставится из JS */
}

#bottom-bar .bb-fader-fill {
    position: absolute;
    left: 0; right: 0; bottom: 0;
    background: linear-gradient(to top, var(--bb-accent, #0af), var(--bb-accent-70, #08f));
    border-radius: 3px;
    height: 40%;
    pointer-events: none;
}
#bottom-bar .bb-fader-thumb {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 5px;
    background: #ddd;
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.6);
    pointer-events: none;
}

/* ---- SysInfo popup ---- */
#bottom-bar-sysinfo {
    position: fixed;
    min-width: 260px;
    max-width: 340px;
    background: rgba(20,20,25,0.92);
    border: 1px solid rgba(255,255,255,0.08);
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
}
`;
        document.head.appendChild(style);
    }

    // ============================================================
    //  BUILD
    // ============================================================
    createBar() {
        this.element = document.createElement('div');
        this.element.id = 'bottom-bar';

        this._gridWrap = document.createElement('div');
        this._gridWrap.className = 'bb-grid-wrap';
        this.element.appendChild(this._gridWrap);

        // Grid
        this._grid = document.createElement('div');
        this._grid.className = 'bb-grid';
        this._gridWrap.appendChild(this._grid);

        // Collapsed bar: [▶ expand] [■/▶ run] [────── drag handle ──────]
        this._collapsedBar = document.createElement('div');
        this._collapsedBar.className = 'bb-collapsed-bar';

        const expandBtn = document.createElement('button');
        expandBtn.className = 'bb-expand-btn';
        expandBtn.textContent = '▶';
        expandBtn.title = 'Expand transport';
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setCollapsed(false);
        });
        this._collapsedBar.appendChild(expandBtn);

        // run/stop in collapsed mode
        const runBtn = document.createElement('button');
        runBtn.className = 'bb-collapsed-run';
        runBtn.textContent = '▶';
        runBtn.title = 'Run / Stop Csound';
        runBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleCsound();
        });
        this._collapsedBar.appendChild(runBtn);
        this._collapsedRunBtn = runBtn;

        // BPM integer indicator
        const bpmLbl = document.createElement('span');
        bpmLbl.className = 'bb-collapsed-bpm';
        bpmLbl.textContent = '120';
        bpmLbl.title = 'Current BPM (integer)';
        this._collapsedBar.appendChild(bpmLbl);
        this._collapsedBpm = bpmLbl;

        const dragHandle = document.createElement('div');
        dragHandle.className = 'bb-drag-handle';
        dragHandle.title = 'Drag transport';
        this._collapsedBar.appendChild(dragHandle);

        this._gridWrap.appendChild(this._collapsedBar);

        document.body.appendChild(this.element);
        this.applySizes();
        this.renderGrid();
        this.makeDraggable();
    }

    applySizes() {
        if (!this._grid) return;
        this._grid.style.gridTemplateColumns = this._colWidths.map(w => `${w}px`).join(' ');
        this._grid.style.gridTemplateRows    = this._rowHeights.map(h => `${h}px`).join(' ');
        this._grid.style.gap = `${this._gap}px`;
    }

    // ============================================================
    //  GRID RENDER
    // ============================================================
    renderGrid() {
        this._grid.innerHTML = '';
        this._bpmModeBtns = {};
        this._bpmDot = null;
        this._bpmDisplay = null;
        this._bpmFracDisplay = null;
        this._faderFill = null;
        this._faderThumb = null;

        // A1 — collapse button
        this._put(0, 0, this._buildCollapseCell());

        // A2 — BPM panel (span rows 1..3)
        this._buildBpmPanel();

        // A3 — zoom column (span rows 1..4)
        this._buildZoomCol();

        // A6 — volume fader (span rows 1..4)
        this._buildVolumeCol();

        // Left column (Ne/Lo/Sa)
        this._put(1, 0, this._buildButtonCell(1, 0, 'Ne', 'New patch', () => this.system.resetEverything?.()));
        this._put(2, 0, this._buildButtonCell(2, 0, 'Lo', 'Load patch', () => this.system.loadJsonPatch?.()));
        this._put(3, 0, this._buildButtonCell(3, 0, 'Sa', 'Save patch', () => this.system.exportPatch?.()));

        // A4 / A5
        this._put(0, 3, this._buildButtonCell(0, 3, 'Mp', 'Toggle minimap (M)', () => this._toggleMinimap(), () => !!this.system.minimap?.visible));
        this._put(0, 4, this._buildButtonCell(0, 4, 'De', 'Design settings', () => this.system.designSettings?.toggle(), () => !!this.system.designSettings?.isVisible));

        // B4 / B5
        this._put(1, 3, this._buildButtonCell(1, 3, 'Sh', 'Shake all cables', () => this.system.patchManager?.shakeAllCables?.(80)));
        this._put(1, 4, this._buildButtonCell(1, 4, '⟳', 'Reload user modules (hot-reload)', () => this._reloadUserModules()));

        // C4 / C5
        this._put(2, 3, this._buildButtonCell(2, 3, '?', 'About', () => this.system.splash?.openAbout()));
        this._put(2, 4, this._buildButtonCell(2, 4, 'i', 'System info', () => this._toggleSysInfo(), () => this._sysInfoOpen));

        // D2 — run
        this._put(3, 1, this._buildRunCell());

        // D4 — editor
        this._put(3, 3, this._buildButtonCell(3, 3, 'Ed', 'Module editor', () => this._openEditor()));

        // D5 — reserved (empty cell, no border)
        this._put(3, 4, this._buildEmptyCell(3, 4));

        // refresh visuals
        this._refreshBpm();
    }

    _put(row, col, el) {
        el.style.gridColumn = `${col + 1}`;
        el.style.gridRow = `${row + 1}`;
        this._grid.appendChild(el);
        return el;
    }

    _cellBase(row, col, extraClass = '') {
        const c = document.createElement('div');
        c.className = 'bb-cell ' + extraClass;
        c.dataset.row = row;
        c.dataset.col = col;
        return c;
    }

    _buildEmptyCell(row, col) {
        return this._cellBase(row, col, 'empty');
    }

    _buildButtonCell(row, col, label, title, action, isActive) {
        const cell = this._cellBase(row, col, 'filled');
        const btn = document.createElement('button');
        btn.className = 'bb-btn';
        btn.textContent = label;
        btn.title = title;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            try {
                const r = action();
                if (r && typeof r.catch === 'function') {
                    r.catch(err => console.error('[BottomBar] action failed:', err));
                }
            } catch (err) {
                console.error('[BottomBar] action failed:', err);
            }
            this.refreshState();
            if (this._sysInfoOpen) this._updateSysInfoContent();
        });
        cell.appendChild(btn);
        cell._btn = btn;
        cell._isActive = isActive;
        this._registerStatefulCell(cell);
        return cell;
    }

    _buildRunCell() {
        const cell = this._cellBase(3, 1, 'filled');
        const btn = document.createElement('button');
        btn.className = 'bb-btn';
        btn.textContent = '▶';
        btn.title = 'Run / Stop Csound';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this._toggleCsound();
        });
        cell.appendChild(btn);
        cell._btn = btn;
        cell._isRun = true;
        this._registerStatefulCell(cell);
        return cell;
    }

    _buildCollapseCell() {
        const cell = this._cellBase(0, 0, 'filled');
        const btn = document.createElement('button');
        btn.className = 'bb-collapse-btn';
        btn.textContent = '▼';
        btn.title = 'Collapse transport';
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.setCollapsed(true);
        });
        cell.appendChild(btn);
        return cell;
    }

    // ============================================================
    //  A2 — BPM PANEL
    // ============================================================
    // ============================================================
    //  A2 — BPM PANEL
    // ============================================================
    _buildBpmPanel() {
        const panel = this._cellBase(0, 1, 'bb-bpm-panel');
        panel.id = 'bb-bpm-panel';
        panel.style.gridColumn = '2';
        panel.style.gridRow = '1 / span 3';

        // --- main display area ---
        const main = document.createElement('div');
        main.className = 'bb-bpm-main';
        main.title = 'Drag vertically to change BPM (Shift = fine). Double-click to reset to 120.';
        panel.appendChild(main);

        // SevenSegmentDisplay with 3 digits (XXX). Fractional digit appended via DOM.
        this._bpmDisplay = new SevenSegmentDisplay({ digits: 3, color: '#ff3b30' });
        this._bpmDisplay.element.style.cursor = 'ns-resize';
        main.appendChild(this._bpmDisplay.element);

        // decimal dot
        this._bpmDot = document.createElement('div');
        this._bpmDot.className = 'bb-bpm-dot';
        main.appendChild(this._bpmDot);

        // fractional digit (1) — use a second SevenSegmentDisplay with 1 digit
        // It has the same look. We'll scale it down via CSS class.
        this._bpmFracDisplay = new SevenSegmentDisplay({ digits: 1, color: '#ff3b30' });
        this._bpmFracDisplay.element.classList.add('bb-bpm-frac-disp');
        main.appendChild(this._bpmFracDisplay.element);

        // --- bottom row: [EXT][MIDI][OSC] ..... [100%] ---
        const bottomRow = document.createElement('div');
        bottomRow.className = 'bb-bpm-bottom';

        const modes = document.createElement('div');
        modes.className = 'bb-bpm-modes';
        [['ext',  'EXT',  'External tempo (MIDI Clock)'],
         ['midi', 'MIDI', 'Enable MIDI input'],
         ['osc',  'OSC',  'OSC settings / status']].forEach(([id, label, title]) => {
            const b = document.createElement('button');
            b.className = 'bb-bpm-mode';
            b.dataset.mode = id;
            b.textContent = label;
            b.title = title;
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                this._onBpmModeClick(id);
            });
            modes.appendChild(b);
            this._bpmModeBtns[id] = b;
        });
        bottomRow.appendChild(modes);

        const zoomLabel = document.createElement('span');
        zoomLabel.className = 'bb-zoom-label';
        zoomLabel.textContent = '100%';
        zoomLabel.title = 'Current zoom';
        bottomRow.appendChild(zoomLabel);
        this._zoomLabel = zoomLabel;

        panel.appendChild(bottomRow);

        this._grid.appendChild(panel);

        // --- drag BPM ---
        let dragging = false, startY = 0, startBpm = 120;
        main.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest('.bb-bpm-modes')) return;
            if (this._isExternalBpm()) return;
            e.preventDefault();
            dragging = true;
            this._bpmDragging = true;
            startY = e.clientY;
            startBpm = this.system.getBPM?.() ?? 120;
            document.body.style.cursor = 'ns-resize';
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dy = startY - e.clientY;
            const factor = e.shiftKey ? 0.1 : 1;
            const next = startBpm + dy * factor;
            this.system.setBPM?.(next);
            this._refreshBpm();
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            this._bpmDragging = false;
            document.body.style.cursor = '';
        });
        main.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this.system.setBPM?.(120);
            this._refreshBpm();
        });
    }

    _isExternalBpm() {
        return (this.system.getBpmSource?.() ?? 'internal') === 'external';
    }

    _refreshBpm() {
        if (!this._bpmDisplay || !this._bpmFracDisplay) return;

        if (this._isExternalBpm()) {
            // --- . -
            this._bpmDisplay.setText('---');
            this._bpmFracDisplay.setText('-');
        } else {
            const bpm = this._clampBpm(this.system.getBPM?.() ?? 120);
            const intPart = Math.floor(bpm);
            const frac = Math.round((bpm - intPart) * 10) % 10;
            this._bpmDisplay.setText(String(intPart).padStart(3, ' '));
            this._bpmFracDisplay.setText(String(frac));
        }

        // mode buttons active state
        const midiReady = this.system.midiManager?.state === 'ready';
        const oscReady  = this._oscSettings?.isVisible || this.system.oscManager?.state === 'ready';
        this._setModeActive('ext',  this._isExternalBpm());
        this._setModeActive('midi', midiReady);
        this._setModeActive('osc',  oscReady);

        // collapsed-bar BPM indicator (integer only)
        if (this._collapsedBpm) {
            if (this._isExternalBpm()) {
                this._collapsedBpm.textContent = '---';
            } else {
                const bpm = this._clampBpm(this.system.getBPM?.() ?? 120);
                this._collapsedBpm.textContent = String(Math.floor(bpm));
            }
        }
    }

    _setModeActive(mode, on) {
        const b = this._bpmModeBtns[mode];
        if (b) b.classList.toggle('active', !!on);
    }

    async _onBpmModeClick(mode) {
        if (mode === 'ext') {
            const cur = this.system.getBpmSource?.() ?? 'internal';
            const next = cur === 'external' ? 'internal' : 'external';
            if (next === 'external') {
                const midi = this.system.midiManager;
                if (!midi?.isMidiClockActive?.()) {
                    this.system.showNotification?.('⚠️ No MIDI Clock detected — start your master device');
                    return;
                }
            }
            this.system.setBpmSource?.(next);
        } else if (mode === 'midi') {
            await this._toggleMidi();
        } else if (mode === 'osc') {
            this._toggleOscSettings();
        }
        this._refreshBpm();
    }

    // ============================================================
    //  A3 — ZOOM COLUMN
    // ============================================================
    _buildZoomCol() {
        const col = this._cellBase(0, 2, 'bb-zoom-col');
        col.style.gridColumn = '3';
        col.style.gridRow = '1 / span 4';

        const mk = (txt, title, onClick) => {
            const b = document.createElement('button');
            b.className = 'bb-zoom-btn';
            b.textContent = txt;
            b.title = title;
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                onClick();
                this.refreshState();
            });
            return b;
        };

        col.appendChild(mk('+', 'Zoom in',       () => this.system.zoom(0.2)));
        col.appendChild(mk('·', 'Reset to 100%', () => this.system.resetZoom?.()));
        col.appendChild(mk('−', 'Zoom out',      () => this.system.zoom(-0.2)));

        this._grid.appendChild(col);
    }

    // ============================================================
    //  A6 — VOLUME FADER
    // ============================================================
    _buildVolumeCol() {
        const col = this._cellBase(0, 5, 'bb-volume-col');
        col.style.gridColumn = '6';
        col.style.gridRow = '1 / span 4';

        const track = document.createElement('div');
        track.className = 'bb-fader-track';

        // unity marker at 0 dB (UI = 0.5)
        const unityMark = document.createElement('div');
        unityMark.style.bottom = `${this._dbToUi(0) * 100}%`;
        unityMark.className = 'bb-fader-unity';
        unityMark.title = '0 dB (unity)';
        track.appendChild(unityMark);
        this._faderUnityMark = unityMark;

        this._faderFill = document.createElement('div');
        this._faderFill.className = 'bb-fader-fill';
        track.appendChild(this._faderFill);

        this._faderThumb = document.createElement('div');
        this._faderThumb.className = 'bb-fader-thumb';
        track.appendChild(this._faderThumb);

        col.appendChild(track);

        // initial value from engine, else unity
        this._volume = this._readVolumeFromEngine() ?? this._dbToUi(0);
        this._refreshFader();

        let dragging = false;
        const UNITY = this._dbToUi(0);   // ≈ 0.941 for cubic curve
        const SNAP_RADIUS = 0.02;
        const update = (e) => {
            const rect = track.getBoundingClientRect();
            let y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
            // snap to unity
            if (Math.abs(y - UNITY) < SNAP_RADIUS) y = UNITY;
            this._volume = y;
            this._refreshFader();
            this._pushVolumeToEngine();
        };
        track.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            dragging = true;
            document.body.style.cursor = 'ns-resize';
            update(e);
        });
        document.addEventListener('mousemove', (e) => { if (dragging) update(e); });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            document.body.style.cursor = '';
        });
        // double-click → reset to unity (0 dB)
        track.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            this._volume = this._dbToUi(0);
            this._refreshFader();
            this._pushVolumeToEngine();
        });

        this._grid.appendChild(col);
    }

    _refreshFader() {
        if (!this._faderFill || !this._faderThumb) return;
        this._faderFill.style.height = `${this._volume * 100}%`;
        this._faderThumb.style.bottom = `calc(${this._volume * 100}% - 3px)`;
    }

    // Volume range: 0..2 linear gain (+12 dB max). Internally we store a
    // normalized 0..1 UI value; mvol is the linear gain (0..2).
    static VOL_DB_MIN = -60;    // anything below → silence
    static VOL_DB_MAX = +12;

    _uiToDb(ui) {
        // UI 0..1 → dB -60..+12, cubic curve for finer control near unity
        const dbMin = BottomBar.VOL_DB_MIN;
        const dbMax = BottomBar.VOL_DB_MAX;
        const t = Math.max(0, Math.min(1, ui));
        // Cubic ease: more resolution near the top (0 dB region)
        return dbMin + (dbMax - dbMin) * (t * t * t);
    }
    _dbToUi(db) {
        const dbMin = BottomBar.VOL_DB_MIN;
        const dbMax = BottomBar.VOL_DB_MAX;
        const t = (db - dbMin) / (dbMax - dbMin);
        return Math.cbrt(Math.max(0, Math.min(1, t)));
    }
    _uiToMvol(ui) {
        const db = this._uiToDb(ui);
        if (db <= BottomBar.VOL_DB_MIN) return 0;
        return Math.pow(10, db / 20);
    }
    _mvolToUi(mvol) {
        if (!mvol || mvol <= 0) return 0;
        const db = 20 * Math.log10(mvol);
        return this._dbToUi(db);
    }

    _readVolumeFromEngine() {
        const eng = this.system?.csoundEngine;
        if (!eng?.getChannel) return null;
        try {
            const mvol = eng.getChannel('mvol');
            if (typeof mvol === 'number' && mvol >= 0) {
                return this._mvolToUi(mvol);
            }
        } catch {}
        return null;
    }

    _pushVolumeToEngine() {
        const eng = this.system?.csoundEngine;
        if (!eng?.setChannel) return;
        try {
            eng.setChannel('mvol', this._uiToMvol(this._volume));
        } catch (e) {
            // engine may not be running — ignore
        }
    }

    // ============================================================
    //  STATE (button active / run icon / zoom %)
    // ============================================================
    _registerStatefulCell(cell) {
        if (!this._statefulCells) this._statefulCells = [];
        this._statefulCells.push(cell);
    }

    refreshState() {
        this._refreshBpm();
        this._updateZoomLabel();
        // stateful cells (active highlight, run icon)
        if (this._statefulCells) {
            for (const cell of this._statefulCells) {
                if (cell._isRun) {
                    this._updateRunCell(cell);
                } else if (cell._isActive) {
                    const on = !!cell._isActive();
                    cell._btn.classList.toggle('active', on);
                }
            }
        }
    }

    _updateRunCell(cell) {
        const state = this.system.csoundEngine?.state || 'idle';
        const map = {
            idle:         { icon: '▶',  color: '#888',  title: 'Run Csound' },
            initializing: { icon: '⏳', color: '#fa0',  title: 'Starting…' },
            running:      { icon: '■',  color: '#0f0',  title: 'Stop Csound' },
            error:        { icon: '⟳',  color: '#f44',  title: 'Retry' },
        };
        const m = map[state] || map.idle;
        cell._btn.textContent = m.icon;
        cell._btn.title = m.title;
        cell._btn.style.color = m.color;

        // mirror to collapsed bar
        if (this._collapsedRunBtn) {
            this._collapsedRunBtn.textContent = m.icon;
            this._collapsedRunBtn.title = m.title;
            this._collapsedRunBtn.style.color = m.color;
        }
    }

    // ============================================================
    //  COLLAPSE
    // ============================================================
    setCollapsed(v) {
        this._collapsed = !!v;
        this._gridWrap.classList.toggle('collapsed', this._collapsed);
        this._saveJSON('collapsed', this._collapsed);
    }

    // ============================================================
    //  EXISTING LOGIC (mostly preserved from old BottomBar)
    // ============================================================
    async _toggleCsound() {
        const engine = this.system?.csoundEngine;
        if (!engine) return;
        if (engine.state === 'idle' || engine.state === 'error') {
            await engine.init();
        } else if (engine.state === 'running') {
            await engine.stop();
        }
        this.refreshState();
    }

    _toggleMinimap() {
        const mm = this.system?.minimap;
        if (!mm) return;
        mm.toggle();
        this.refreshState();
    }

    async _reloadUserModules() {
        if (typeof this.system.reloadUserModules !== 'function') {
            this.system.showNotification?.('❌ Hot-reload not available');
            return;
        }
        try {
            await this.system.reloadUserModules();
        } catch (e) {
            console.error('[BottomBar] reloadUserModules failed:', e);
            this.system.showNotification?.(`❌ Reload failed: ${e.message}`);
        }
    }

    _toggleOscSettings() {
        if (!this._oscSettings) {
            console.warn('[BottomBar] OscSettingsPanel not attached');
            return;
        }
        this._oscSettings.toggle();
        this._refreshBpm();
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
        } else {
            const ok = await midi.init();
            if (ok) {
                const n = midi.getInfo().inputCount;
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
        this._refreshBpm();
        this.refreshState();
    }

    _openEditor() {
        this.system.contextMenu?.openModuleEditor?.();
    }

    _clampBpm(v) {
        return Math.max(CONFIG.bpmMin, Math.min(CONFIG.bpmMax, Math.round(Number(v) || 120)));
    }

    // ============================================================
    //  DRAG (only from empty areas / drag handle)
    // ============================================================
    makeDraggable() {
        const bar = this.element;
        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        const startDrag = (e) => {
            if (e.button !== 0) return;
            // Skip if the click is on an interactive element
            if (e.target.closest('button, input, .bb-bpm-main, .bb-fader-track')) return;

            isDragging = true;
            const rect = bar.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;

            bar.style.transform = 'none';
            bar.style.left = `${rect.left}px`;
            bar.style.top = `${rect.top}px`;
            bar.style.bottom = 'auto';
            bar.style.cursor = 'grabbing';
            e.preventDefault();
        };

        bar.addEventListener('mousedown', startDrag);
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const nx = e.clientX - offsetX;
            const ny = e.clientY - offsetY;
            const maxX = window.innerWidth - bar.offsetWidth;
            const maxY = window.innerHeight - bar.offsetHeight;
            bar.style.left = `${Math.max(0, Math.min(nx, maxX))}px`;
            bar.style.top  = `${Math.max(0, Math.min(ny, maxY))}px`;
        });
        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            bar.style.cursor = '';
        });
    }

    // ============================================================
    //  SYSINFO POPUP
    // ============================================================
    createSysInfoPopup() {
        this._sysInfoPopup = document.createElement('div');
        this._sysInfoPopup.id = 'bottom-bar-sysinfo';
        document.body.appendChild(this._sysInfoPopup);
    }

    _toggleSysInfo() {
        this._sysInfoOpen = !this._sysInfoOpen;
        if (this._sysInfoOpen) {
            this._updateSysInfoContent();
            this._positionSysInfo();
            this._sysInfoPopup.style.display = 'block';
        } else {
            this._sysInfoPopup.style.display = 'none';
        }
        this.refreshState();
    }

    _positionSysInfo() {
        if (!this._sysInfoPopup) return;
        const rect = this.element.getBoundingClientRect();
        const pw = 320;
        const px = Math.max(8, Math.min(rect.left + rect.width / 2 - pw / 2, window.innerWidth - pw - 8));
        const py = Math.max(8, rect.top - 8 - this._sysInfoPopup.offsetHeight || rect.top - 200);
        this._sysInfoPopup.style.left = `${px}px`;
        this._sysInfoPopup.style.top = `${py}px`;
        this._sysInfoPopup.style.bottom = 'auto';
    }

    _updateSysInfoContent() {
        const s = this.system;
        if (!s) return;

        const theme = getCurrentTheme();
        const accent = theme.isLcd ? (theme.getAccentColor() || '#8fbc8f') : '#0af';

        const modules  = (s.components || []).filter(c => c.constructor?.name === 'Panel').length;
        const cables   = s.patchManager?.cables?.length || 0;
        const stickers = s.stickers?.length || 0;

        const cs = s.csoundEngine?.state || 'idle';
        const csColor = { idle: '#888', initializing: '#fa0', running: '#0f0', error: '#f44' }[cs] || '#fff';

        const zoom = Math.round((s.scale || 1) * 100);
        const fps  = s.currentFPS || 0;
        const fpsColor = fps < 30 ? '#f66' : fps < 50 ? '#ff6' : '#6f6';

        const engine      = s.csoundEngine;
        const recompiling = !!engine?.isRecompiling;
        const recompileMs = engine?.lastRecompileMs;
        const recompileColor = recompiling ? '#fa0'
            : recompileMs == null ? '#888'
            : recompileMs > 500 ? '#f66'
            : recompileMs > 200 ? '#ff6' : '#6f6';
        const recompileText = recompiling ? '⏳ …' : (recompileMs != null ? `${recompileMs} ms` : '—');

        const midi       = s.midiManager;
        const midiState  = midi?.state || 'idle';
        const midiColor  = { idle:'#888', requesting:'#fa0', ready:'#0f0', denied:'#f44', unsupported:'#f44' }[midiState] || '#888';
        const midiInputs = midi?.getInfo?.().inputCount ?? 0;
        const midiLast   = midi?._lastMessage;
        const midiLastDesc = midiLast ? `${midiLast.status.toString(16).padStart(2, '0')} ${midiLast.data1} ${midiLast.data2}` : '—';

        const osc      = s.oscManager;
        const oscState = osc?.state || 'idle';
        const oscColor = { idle:'#888', connecting:'#fa0', ready:'#0f0', error:'#f44' }[oscState] || '#888';
        const oscLast = osc?._lastMessage;
        const oscDesc = oscLast ? `${oscLast.address} (${oscLast.args.length})` : '—';

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
            ${row('Recompile', recompileText, recompileColor)}
            ${row('Zoom', zoom + '%')}
            <div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.08);">
                ${row('Csound', cs.toUpperCase(), csColor)}
                ${row('MIDI', `${midiState.toUpperCase()} / ${midiInputs} in`, midiColor)}
                ${row('Last MIDI', midiLastDesc, '#aaa')}
                ${row('OSC', oscState.toUpperCase(), oscColor)}
                ${row('Last OSC', oscDesc, '#aaa')}
            </div>
        `;
    }

    // ============================================================
    //  THEME
    // ============================================================
    applyTheme() {
        const theme = getCurrentTheme();
        const accent = theme.isLcd ? (theme.getAccentColor() || '#8fbc8f') : '#0af';

        // Base accent variable + derived alpha variants for scoped CSS
        this.element.style.setProperty('--bb-accent', accent);
        this.element.style.setProperty('--bb-accent-06', this._rgba(accent, 0.06));
        this.element.style.setProperty('--bb-accent-12', this._rgba(accent, 0.12));
        this.element.style.setProperty('--bb-accent-15', this._rgba(accent, 0.15));
        this.element.style.setProperty('--bb-accent-25', this._rgba(accent, 0.25));
        this.element.style.setProperty('--bb-accent-30', this._rgba(accent, 0.30));
        this.element.style.setProperty('--bb-accent-70', this._rgba(accent, 0.70));

        this.element.style.background = this._rgba(accent, 0.12);
        this.element.style.borderColor = this._rgba(accent, 0.25);
        this.element.style.boxShadow = theme.isLcd
            ? `0 0 20px ${this._rgba(accent, 0.2)}`
            : '0 4px 20px rgba(0, 0, 0, 0.5)';

        if (this._sysInfoPopup) {
            this._sysInfoPopup.style.background = this._rgba(accent, 0.12);
            this._sysInfoPopup.style.borderColor = this._rgba(accent, 0.25);
            this._sysInfoPopup.style.boxShadow = this.element.style.boxShadow;
        }

        // BPM segment color: theme accent. If accent is too dark, use white.
        const accentColor = theme.isLcd ? (theme.getAccentColor() || '#8fbc8f') : '#0af';
        // BPM display color: theme accent; white if accent is too dark.
        const lum = this._luminance(accent);
        const bpmColor = lum < 0.25 ? '#ffffff' : accent;
        this.element.style.setProperty('--bb-bpm-color', bpmColor);

        if (this._bpmDisplay)    this._bpmDisplay.setColor(bpmColor);
        if (this._bpmFracDisplay) this._bpmFracDisplay.setColor(bpmColor);
        if (this._bpmDot)        this._bpmDot.style.background = bpmColor;
        if (this._bpmDot)        this._bpmDot.style.boxShadow = `0 0 4px ${this._rgba(bpmColor, 0.6)}`;
        this.refreshState();
    }

    // ============================================================
    //  PERIODIC TICK
    // ============================================================
    _tick() {
        if (!this._bpmDragging) this._refreshBpm();
        this._updateZoomLabel();

        if (this._sysInfoOpen) this._updateSysInfoContent();

        // Refresh stateful buttons (run icon, active highlights) —
        // some state changes (e.g. Design toggled via hotkey 'D')
        // do not go through BottomBar actions.
        if (this._statefulCells) {
            for (const cell of this._statefulCells) {
                if (cell._isRun) {
                    this._updateRunCell(cell);
                } else if (cell._isActive) {
                    const on = !!cell._isActive();
                    cell._btn.classList.toggle('active', on);
                }
            }
        }

        if (this._midiInLamp)  this._midiInLamp.draw();
        if (this._midiOutLamp) this._midiOutLamp.draw();
        if (this._oscLamp)     this._oscLamp.draw();
    }

    _updateZoomLabel() {
        if (!this._zoomLabel) return;
        const scale = this.system.scale || 1;
        const pct = `${Math.round(scale * 100)}%`;
        if (this._zoomLabel.textContent !== pct) {
            this._zoomLabel.textContent = pct;
        }
        // Highlight the label when zoom is at 100%
        const atReset = Math.abs(scale - 1.0) < 0.001;
        this._zoomLabel.classList.toggle('active', atReset);
    }

    // ============================================================
    //  CSOUND LISTENER
    // ============================================================
    setupCsoundListener() {
        const engine = this.system?.csoundEngine;
        if (!engine || typeof engine.onStateChange !== 'function') return;
        engine.onStateChange((state) => {
            this.refreshState();
            if (this._sysInfoOpen) this._updateSysInfoContent();

            // Push mvol whenever Csound (re)starts — instr 5 reads chnget "mvol",
            // which is 0 until set, muting the output.
            if (state === 'running') {
                this._pushVolumeToEngine();
            }
        });
    }

    // ============================================================
    //  EVENTS (theme, sysinfo dismiss, MIDI/OSC lamps)
    // ============================================================
    setupEvents() {
        document.addEventListener('csmodular:theme-changed', () => this.applyTheme());

        document.addEventListener('mousedown', (e) => {
            if (!this._sysInfoOpen) return;
            if (this._sysInfoPopup.contains(e.target)) return;
            if (this.element.contains(e.target)) return;
            this._sysInfoOpen = false;
            this._sysInfoPopup.style.display = 'none';
            this.refreshState();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._sysInfoOpen) {
                this._sysInfoOpen = false;
                this._sysInfoPopup.style.display = 'none';
                this.refreshState();
            }
        });

        const midi = this.system?.midiManager;
        if (midi) {
            midi.onStateChange(() => { this._refreshBpm(); this.refreshState(); });
            midi.onMessage(() => { this._flashMidiLed(); });
        }

        const osc = this.system?.oscManager;
        if (osc) {
            osc.onStateChange(() => this._refreshBpm());
        }
    }

    _flashMidiLed() {
        const midiBtn = this._bpmModeBtns.midi;
        if (!midiBtn) return;
        if (this._midiFlashTimer) clearTimeout(this._midiFlashTimer);
        midiBtn.style.color = '#fff';
        midiBtn.style.textShadow = '0 0 8px rgba(255,255,255,0.8)';
        this._midiFlashTimer = setTimeout(() => {
            this._midiFlashTimer = null;
            midiBtn.style.color = '';
            midiBtn.style.textShadow = '';
            this._refreshBpm();
        }, 120);
    }

    // ============================================================
    //  UTILS
    // ============================================================
    _rgba(hex, alpha) {
        let h = String(hex || '#ffffff').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    _luminance(hex) {
        let h = String(hex || '#000000').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        const r = parseInt(h.substring(0, 2), 16) / 255;
        const g = parseInt(h.substring(2, 4), 16) / 255;
        const b = parseInt(h.substring(4, 6), 16) / 255;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    _loadJSON(k) {
        try {
            const r = localStorage.getItem(`${CONFIG.storageKey}:${k}`);
            return r ? JSON.parse(r) : null;
        } catch { return null; }
    }
    _saveJSON(k, v) {
        localStorage.setItem(`${CONFIG.storageKey}:${k}`, JSON.stringify(v));
    }

    // ============================================================
    //  PUBLIC
    // ============================================================
    show()   { this.element.style.display = 'flex'; }
    hide()   { this.element.style.display = 'none'; }
    toggle() {
        if (this.element.style.display === 'none') this.show();
        else this.hide();
    }
}