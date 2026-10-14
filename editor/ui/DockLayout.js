// editor/ui/DockLayout.js
//
// Минимальный dock-контейнер для editor.html.
//
// Схема:
//   ┌─────────────────────────────────────┐
//   │ toolbar                             │
//   ├──────────────────┬──────────────────┤
//   │ leftTop (canvas) │ rightTop (code)  │
//   │                  │                  │
//   ├──────────────────┼──────────────────┤
//   │ leftBottom       │ rightBottom      │
//   │ (properties)     │ (terminal)       │
//   └──────────────────┴──────────────────┘
//
// - Вертикальный splitter между левой и правой колонкой
// - Горизонтальный splitter между top и bottom в каждой колонке
// - Размеры сохраняются в localStorage
// - Пресеты: default / code-focus / canvas-focus
//
// API:
//   const layout = new DockLayout({ root: document.getElementById('app') });
//   layout.mount('leftTop', somePanelElement);
//   layout.setPreset('code-focus');

const STORAGE_KEY = 'csmodular:editor-layout';

export class DockLayout {
    constructor(opts = {}) {
        this.root = opts.root;
        if (!this.root) throw new Error('[DockLayout] root required');

        // Размеры в процентах (0..1)
        this.sizes = {
            leftWidth: 0.65,      // ширина левой колонки
            leftTopHeight: 0.6,   // высота canvas внутри левой
            rightTopHeight: 0.65, // высота code внутри правой
        };

        // Слоты: контейнеры для панелей
        this.slots = {
            leftTop: null,
            leftBottom: null,
            rightTop: null,
            rightBottom: null,
        };

        this._drag = { active: null, startX: 0, startY: 0, startSizes: null };

        this._restoreSizes();
        this._build();
        this._setupSplitters();
    }

    // ───────────────────────────── DOM ──────────────────────────────

    _build() {
        this.root.innerHTML = '';
        this.root.style.cssText = `
            display: flex;
            flex-direction: column;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: #1a1a1a;
        `;

        // Toolbar slot (создаётся снаружи, мы только даём контейнер)
        this.toolbarSlot = document.createElement('div');
        this.toolbarSlot.id = 'toolbar-slot';
        this.toolbarSlot.style.cssText = `
            flex-shrink: 0;
            height: 40px;
            background: #1e1e1e;
            border-bottom: 1px solid #333;
        `;
        this.root.appendChild(this.toolbarSlot);

        // Main area — две колонки
        this.main = document.createElement('div');
        this.main.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: row;
            min-height: 0;
        `;
        this.root.appendChild(this.main);

        // Левая колонка
        this.leftCol = document.createElement('div');
        this.leftCol.style.cssText = `
            display: flex;
            flex-direction: column;
            min-width: 0;
            min-height: 0;
        `;
        this.main.appendChild(this.leftCol);

        // Вертикальный splitter
        this.vSplitter = this._makeSplitter('vertical');
        this.main.appendChild(this.vSplitter);

        // Правая колонка
        this.rightCol = document.createElement('div');
        this.rightCol.style.cssText = `
            display: flex;
            flex-direction: column;
            min-width: 0;
            min-height: 0;
        `;
        this.main.appendChild(this.rightCol);

        // Слоты внутри левой
        this.slots.leftTop = this._makeSlot('leftTop');
        this.slots.leftBottom = this._makeSlot('leftBottom');
        this.leftHSplitter = this._makeSplitter('horizontal');
        this.leftCol.appendChild(this.slots.leftTop);
        this.leftCol.appendChild(this.leftHSplitter);
        this.leftCol.appendChild(this.slots.leftBottom);

        // Слоты внутри правой
        this.slots.rightTop = this._makeSlot('rightTop');
        this.slots.rightBottom = this._makeSlot('rightBottom');
        this.rightHSplitter = this._makeSplitter('horizontal');
        this.rightCol.appendChild(this.slots.rightTop);
        this.rightCol.appendChild(this.rightHSplitter);
        this.rightCol.appendChild(this.slots.rightBottom);

        this._applySizes();
    }

    _makeSlot(name) {
        const el = document.createElement('div');
        el.id = `slot-${name}`;
        el.dataset.slot = name;
        el.style.cssText = `
            min-width: 0;
            min-height: 0;
            overflow: hidden;
            background: #1a1a1a;
        `;
        return el;
    }

    _makeSplitter(orientation) {
        const el = document.createElement('div');
        el.className = `splitter splitter-${orientation}`;
        el.style.cssText = `
            flex-shrink: 0;
            background: #333;
            transition: background 0.15s;
            ${orientation === 'vertical'
                ? 'width: 4px; cursor: col-resize;'
                : 'height: 4px; cursor: row-resize;'}
        `;
        el.addEventListener('mouseenter', () => { el.style.background = '#0af'; });
        el.addEventListener('mouseleave', () => {
            if (this._drag.active !== orientation) el.style.background = '#333';
        });
        return el;
    }

    // ─────────────────────────── SPLITTERS ──────────────────────────

    _setupSplitters() {
        this.vSplitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this._drag = {
                active: 'vertical',
                startX: e.clientX,
                startY: e.clientY,
                startSizes: { ...this.sizes },
            };
            this.vSplitter.style.background = '#0af';
        });

        this.leftHSplitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this._drag = {
                active: 'left-horizontal',
                startX: e.clientX,
                startY: e.clientY,
                startSizes: { ...this.sizes },
            };
            this.leftHSplitter.style.background = '#0af';
        });

        this.rightHSplitter.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this._drag = {
                active: 'right-horizontal',
                startX: e.clientX,
                startY: e.clientY,
                startSizes: { ...this.sizes },
            };
            this.rightHSplitter.style.background = '#0af';
        });

        document.addEventListener('mousemove', (e) => this._onDragMove(e));
        document.addEventListener('mouseup', () => this._onDragEnd());
    }

    _onDragMove(e) {
        if (!this._drag.active) return;

        const totalWidth = this.main.clientWidth;
        const colHeight = this.leftCol.clientHeight;

        if (this._drag.active === 'vertical') {
            const dx = e.clientX - this._drag.startX;
            let newLeft = this._drag.startSizes.leftWidth + dx / totalWidth;
            newLeft = Math.max(0.2, Math.min(0.85, newLeft));
            this.sizes.leftWidth = newLeft;
        } else if (this._drag.active === 'left-horizontal') {
            const dy = e.clientY - this._drag.startY;
            let newTop = this._drag.startSizes.leftTopHeight + dy / colHeight;
            newTop = Math.max(0.15, Math.min(0.9, newTop));
            this.sizes.leftTopHeight = newTop;
        } else if (this._drag.active === 'right-horizontal') {
            const dy = e.clientY - this._drag.startY;
            let newTop = this._drag.startSizes.rightTopHeight + dy / colHeight;
            newTop = Math.max(0.15, Math.min(0.9, newTop));
            this.sizes.rightTopHeight = newTop;
        }

        this._applySizes();
    }

    _onDragEnd() {
        if (this._drag.active) {
            this._drag.active = null;
            this.vSplitter.style.background = '#333';
            this.leftHSplitter.style.background = '#333';
            this.rightHSplitter.style.background = '#333';
            this._saveSizes();
        }
    }

    _applySizes() {
        const L = this.sizes.leftWidth;
        const R = 1 - L;

        this.leftCol.style.flex = `${L} ${L} 0`;
        this.rightCol.style.flex = `${R} ${R} 0`;

        this.slots.leftTop.style.flex = `${this.sizes.leftTopHeight} 1 0`;
        this.slots.leftBottom.style.flex = `${1 - this.sizes.leftTopHeight} 1 0`;
        this.slots.rightTop.style.flex = `${this.sizes.rightTopHeight} 1 0`;
        this.slots.rightBottom.style.flex = `${1 - this.sizes.rightTopHeight} 1 0`;
    }

    // ─────────────────────────── PERSIST ────────────────────────────

    _saveSizes() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sizes));
        } catch (e) { /* ignore */ }
    }

    _restoreSizes() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            if (typeof saved.leftWidth === 'number') this.sizes.leftWidth = saved.leftWidth;
            if (typeof saved.leftTopHeight === 'number') this.sizes.leftTopHeight = saved.leftTopHeight;
            if (typeof saved.rightTopHeight === 'number') this.sizes.rightTopHeight = saved.rightTopHeight;
        } catch (e) { /* ignore */ }
    }

    // ─────────────────────────── API ────────────────────────────────

    /**
     * Вставить DOM-элемент панели в слот.
     * @param {'leftTop'|'leftBottom'|'rightTop'|'rightBottom'|'toolbar'} slotName
     * @param {HTMLElement} element
     */
    mount(slotName, element) {
        const slot = slotName === 'toolbar' ? this.toolbarSlot : this.slots[slotName];
        if (!slot) {
            console.warn(`[DockLayout] Unknown slot: ${slotName}`);
            return;
        }
        slot.innerHTML = '';
        element.style.width = '100%';
        element.style.height = '100%';
        slot.appendChild(element);
    }

    /**
     * Пресеты раскладки.
     */
    setPreset(name) {
        const presets = {
            default:      { leftWidth: 0.65, leftTopHeight: 0.6,  rightTopHeight: 0.65 },
            'code-focus': { leftWidth: 0.45, leftTopHeight: 0.6,  rightTopHeight: 0.75 },
            'canvas-focus': { leftWidth: 0.85, leftTopHeight: 0.85, rightTopHeight: 0.65 },
        };
        const p = presets[name];
        if (!p) {
            console.warn(`[DockLayout] Unknown preset: ${name}`);
            return;
        }
        Object.assign(this.sizes, p);
        this._applySizes();
        this._saveSizes();
    }

    /**
     * Получить текущие размеры (для отладки).
     */
    getSizes() {
        return { ...this.sizes };
    }
}