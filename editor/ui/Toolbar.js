// editor/ui/Toolbar.js
//
// Верхняя панель инструментов.
//
// Кнопки: New / Load / Save + пресеты layout.
//
// API:
//   const tb = new Toolbar({ app, layout });
//   layout.mount('toolbar', tb.element);

export class Toolbar {
    constructor(opts = {}) {
        this.app = opts.app;
        this.layout = opts.layout;

        this._build();
    }

    _build() {
        this.element = document.createElement('div');
        this.element.id = 'editor-toolbar';
        this.element.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            height: 100%;
            box-sizing: border-box;
            background: #1e1e1e;
            user-select: none;
        `;

        // ── Логотип / название ──
        const title = document.createElement('div');
        title.style.cssText = `
            color: #0af;
            font-weight: bold;
            font-size: 12px;
            margin-right: 12px;
            letter-spacing: 0.5px;
        `;
        title.textContent = '📐 Module Editor';
        this.element.appendChild(title);

        // ── Основные кнопки ──
        this.element.appendChild(this._btn('🆕 New', () => this._onNew()));
        this.element.appendChild(this._btn('📂 Load', () => this._onLoad()));
        this.element.appendChild(this._btn('💾 Save', () => this._onSave(), 'primary'));

        // Разделитель
        this.element.appendChild(this._divider());

        // ── Пресеты layout ──
        const layoutLabel = document.createElement('span');
        layoutLabel.style.cssText = 'color: #666; font-size: 10px; margin-right: 4px;';
        layoutLabel.textContent = 'Layout:';
        this.element.appendChild(layoutLabel);

        this.element.appendChild(this._btn('Default', () => this.layout.setPreset('default')));
        this.element.appendChild(this._btn('Code', () => this.layout.setPreset('code-focus')));
        this.element.appendChild(this._btn('Canvas', () => this.layout.setPreset('canvas-focus')));
    }

    _btn(text, onClick, variant = 'default') {
        const b = document.createElement('button');
        b.textContent = text;
        const base = `
            padding: 5px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: Arial, sans-serif;
            transition: all 0.15s;
            border: 1px solid #444;
            background: #2a2a2a;
            color: #ccc;
        `;
        const primary = `
            background: linear-gradient(to bottom, #0a5, #083);
            border-color: #0a5;
            color: #fff;
            font-weight: bold;
        `;
        b.style.cssText = base + (variant === 'primary' ? primary : '');
        b.onmouseenter = () => { if (variant !== 'primary') b.style.background = '#333'; };
        b.onmouseleave = () => { if (variant !== 'primary') b.style.background = '#2a2a2a'; };
        b.onclick = onClick;
        return b;
    }

    _divider() {
        const d = document.createElement('div');
        d.style.cssText = `
            width: 1px;
            height: 20px;
            background: #333;
            margin: 0 6px;
        `;
        return d;
    }

    // ─────────────────────────── ACTIONS ────────────────────────────

    _onNew() {
        if (!confirm('Clear current module?')) return;
        this.app.clearModule();
        this.app.module.title = 'New Module';
        this.app.module.customColor = null;
        this.app.uiManager.showNotification('🆕 New module');
    }

    async _onLoad() {
        // Пока используем существующий showLoadDialog из uiManager
        if (this.app.uiManager.showLoadDialog) {
            await this.app.uiManager.showLoadDialog();
        } else {
            console.warn('[Toolbar] showLoadDialog not available');
        }
    }

    async _onSave() {
        if (this.app.propertiesWindow) {
            await this.app.propertiesWindow.saveModule();
        } else {
            console.warn('[Toolbar] propertiesWindow not available');
        }
    }
}