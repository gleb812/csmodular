// components/TextField.js
import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class TextField extends BaseComponent {
    static HEIGHT = 16;

    constructor(x, y, width = 60, referenceElementId = null, format = 'number', tableName = null) {
        super(x, y, width, TextField.HEIGHT);

        this.supportsDrag = false;
        this.isInteractive = false;

        // ⭐ Контроллер — Knob / Slider / Button* (значение 0..127)
        this.targetId = referenceElementId !== null ? String(referenceElementId) : null;
        this.targetComponent = null;
        this._connected = false;

        // ⭐ Переключалка таблиц — Button* (индекс в tableByMode)
        this.modeComponentId = null;
        this.modeComponent = null;

        // ⭐ Таблицы по режимам: ['dly5h8', 'dly1h8'], индекс = modeValue
        this.tableByMode = null;

        // Одна таблица (старое поведение, fallback)
        this.tableName = tableName;

        // Кэш загруженных таблиц
        this._tableCache = {};
        this._loadingTables = {};

        // Формат отображения
        this.format = format;
        this.displayValue = '--';

        // Стили (classic)
        this.backgroundColor = '#1a1a1a';
        this.borderColor = '#333';
        this.textColor = '#0af';

        // Первичное подключение + загрузка таблиц
        setTimeout(() => {
            this.connect();
        }, 50);
    }

    // ─────────────────────────── DRAW ───────────────────────────

    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;

        if (isLcd) {
            ctx.fillStyle = theme.getAccentAlpha(0.05);
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = theme.getAccentAlpha(0.5);
            ctx.lineWidth = theme.lineWidth(1);
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            ctx.fillStyle = theme.getAccentColor();
            theme.applyGlow(ctx);
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.displayValue, this.x + this.width / 2, this.y + this.height / 2);
            theme.clearGlow(ctx);
        } else {
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = this.borderColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);

            ctx.fillStyle = this.textColor;
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.displayValue, this.x + this.width / 2, this.y + this.height / 2);
        }
    }

    // ─────────────────────── CONNECT ───────────────────────

    connect() {
        if (this._connected || !this.parent || !this.targetId) return;

        // Контроллер
        for (const comp of this.parent.components) {
            if (String(comp.id) === String(this.targetId) ||
                String(comp.parameterId) === String(this.targetId)) {
                this.targetComponent = comp;
                break;
            }
        }

        // Переключалка
        if (this.modeComponentId !== null && this.modeComponentId !== undefined) {
            for (const comp of this.parent.components) {
                if (String(comp.id) === String(this.modeComponentId) ||
                    String(comp.parameterId) === String(this.modeComponentId)) {
                    this.modeComponent = comp;
                    break;
                }
            }
            if (!this.modeComponent) {
                console.warn(
                    `[TextField] modeComponentId=${this.modeComponentId} not found in panel ` +
                    `"${this.parent.title}" — falling back to tableByMode[0]`
                );
            }
        }

        if (!this.targetComponent) {
            console.warn(
                `[TextField] targetId=${this.targetId} not found in panel "${this.parent.title}"`
            );
            return;
        }

        this.setupConnection();
        if (this.modeComponent) this.setupModeConnection();
        this._ensureTablesLoaded();

        this._connected = true;
    }

    setupConnection() {
        if (!this.targetComponent) return;

        if (typeof this.targetComponent.addChangeListener === 'function') {
            this.targetComponent.addChangeListener(() => this.updateDisplay());
        } else {
            const originalOnChange = this.targetComponent.onChange;
            this.targetComponent.onChange = (value) => {
                if (typeof originalOnChange === 'function') originalOnChange(value);
                this.updateDisplay();
            };
        }

        // Начальное значение
        this.updateDisplay();
    }

    setupModeConnection() {
        if (!this.modeComponent) return;

        if (typeof this.modeComponent.addChangeListener === 'function') {
            this.modeComponent.addChangeListener(() => this.updateDisplay());
        } else {
            const originalOnChange = this.modeComponent.onChange;
            this.modeComponent.onChange = (value) => {
                if (typeof originalOnChange === 'function') originalOnChange(value);
                this.updateDisplay();
            };
        }
    }

    // ─────────────────────── TABLE LOADING ───────────────────────

    async _ensureTablesLoaded() {
        const names = new Set();
        if (Array.isArray(this.tableByMode)) {
            this.tableByMode.forEach(n => { if (n) names.add(n); });
        }
        if (this.tableName) names.add(this.tableName);

        if (names.size === 0) return;

        const tasks = [];
        for (const name of names) {
            if (this._tableCache[name] || this._loadingTables[name]) continue;
            this._loadingTables[name] = true;
            tasks.push(this._loadTable(name));
        }

        if (tasks.length > 0) {
            await Promise.all(tasks);
            this.updateDisplay();
        }
    }

    async _loadTable(name) {
        try {
            const res = await fetch(`/tables/${name}.json`);
            if (!res.ok) {
                console.warn(`[TextField] table "${name}" not found (HTTP ${res.status})`);
                this._tableCache[name] = null;
                return;
            }
            const text = await res.text();
            if (/<!DOCTYPE|<html[\s>]/i.test(text.slice(0, 200))) {
                console.warn(`[TextField] table "${name}" got HTML instead of JSON (missing?)`);
                this._tableCache[name] = null;
                return;
            }
            this._tableCache[name] = JSON.parse(text);
        } catch (e) {
            console.warn(`[TextField] failed to load table "${name}":`, e);
            this._tableCache[name] = null;
        } finally {
            this._loadingTables[name] = false;
        }
    }

    // ─────────────────────── DISPLAY ───────────────────────

    /**
     * Вычислить и обновить displayValue.
     * rawValue опционален (для совместимости со старыми вызовами),
     * реальное значение всегда берётся из targetComponent.value.
     */
    updateDisplay(rawValue) {
        if (!this.targetComponent) {
            this.displayValue = '--';
            return;
        }

        const raw = (this.targetComponent.value !== undefined)
            ? this.targetComponent.value
            : (rawValue ?? 0);

        const tableName = this._resolveTableName();
        if (!tableName) {
            this.displayValue = this._formatValue(raw);
            if (this.onRequestRedraw) this.onRequestRedraw();
            return;
        }

        const table = this._tableCache[tableName];
        if (table === undefined) {
            // ещё не загружена (или загружается)
            this.displayValue = '...';
            if (this.onRequestRedraw) this.onRequestRedraw();
            return;
        }
        if (table === null || !Array.isArray(table) || table.length === 0) {
            this.displayValue = '--';
            if (this.onRequestRedraw) this.onRequestRedraw();
            return;
        }

        const idx = Math.max(0, Math.min(table.length - 1, Math.round(raw)));
        this.displayValue = this._formatValue(table[idx]);

        if (this.onRequestRedraw) this.onRequestRedraw();
    }

    /**
     * Определить имя таблицы с учётом режима.
     * Приоритет: tableByMode[mode] → tableName → null.
     */
    _resolveTableName() {
        if (Array.isArray(this.tableByMode) && this.tableByMode.length > 0) {
            if (!this.modeComponent) {
                // нет переключалки — берём первую таблицу
                return this.tableByMode[0] || this.tableName || null;
            }
            const modeValue = this._getModeValue();
            const i = Math.max(0, Math.min(this.tableByMode.length - 1, modeValue));
            return this.tableByMode[i] || this.tableName || null;
        }
        return this.tableName || null;
    }

    _getModeValue() {
        const c = this.modeComponent;
        if (!c) return 0;

        // ButtonText / Toggle
        if (c.constructor.name === 'ButtonText' || c.constructor.name === 'Toggle') {
            return c.isActive ? 1 : 0;
        }
        // ButtonFlat / ButtonRadio / ButtonIncDec / PartSelector
        if (c.selectedIndex !== undefined) return c.selectedIndex | 0;
        if (c.currentIndex !== undefined)  return c.currentIndex | 0;
        if (c.value !== undefined)         return c.value | 0;
        return 0;
    }

    _formatValue(v) {
        if (v === null || v === undefined || Number.isNaN(v)) return '--';

        if (this.format === 'integer') {
            return Math.round(v).toString();
        }

        // Float: 2 знака, без хвостовых нулей
        let s = (Math.round(v * 100) / 100).toString();
        if (s.includes('.')) {
            s = s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
        }
        return s;
    }

    // ─────────────────────── MISC ───────────────────────

    update() {
        if (!this._connected) this.connect();
    }

    handleClick()      { return false; }
    handleMouseMove()  { return false; }
    destroy()          {}

    getPropertiesForExport() {
        return {
            width: this.width,
            referenceElementId: this.targetId ?? null,
            format: this.format,
            tableName: this.tableName ?? null,
            modeComponentId: this.modeComponentId ?? null,
            tableByMode: Array.isArray(this.tableByMode) ? this.tableByMode.slice() : null,
        };
    }

    static getPropertySchema() {
        return [
            {
                key: 'targetId',                 // ← живое поле
                label: 'Controller',
                type: 'select',
                optionsFrom: 'parametricComponents',
                help: 'Knob / Slider / Button whose value is displayed',
            },
            {
                key: 'modeComponentId',
                label: 'Mode switch',
                type: 'select',
                optionsFrom: 'parametricComponents',
                help: 'Component whose index selects the table (optional)',
            },
            {
                key: 'tableByMode',
                label: 'Tables by mode',
                type: 'mapping-multi-select',
                help: 'Table names; index = mode switch value',
            },
            {
                key: 'tableName',
                label: 'Single table',
                type: 'mapping-select',
                help: 'Used when no mode switch / tableByMode is set',
            },
            {
                key: 'format',
                label: 'Format',
                type: 'select',
                options: [
                    { value: 'number',  label: 'Float (0.00)' },
                    { value: 'integer', label: 'Integer' },
                ],
            },
        ];
    }

}