// editor/ui/TerminalPanel.js
//
// Терминал для управления модулем через команды.
//
// Команды:
//   add <type> [x y]    — добавить компонент
//   ls                  — список компонентов
//   del <id>            — удалить по id
//   help                — справка
//   clear               — очистить вывод

import { createComponent, getAllTypes } from '../ComponentRegistry.js';

const PALETTE_SIZE = {
    Knob: { width: 24, height: 24 },
    Slider: { width: 14, height: 50 },
    ButtonFlat: { width: 50, height: 16 },
    ButtonRadio: { width: 120, height: 16 },
    ButtonIncDec: { width: 50, height: 16 },
    ButtonText: { width: 40, height: 16 },
    TextLabel: { width: 60, height: 16 },
    TextField: { width: 50, height: 16 },
    TextEdit: { width: 50, height: 16 },
    LevelShift: { width: 15, height: 12 },
    LED: { width: 16, height: 10 },
    PartSelector: { width: 70, height: 16 },
    SVG: { width: 28, height: 28 },
    Line: { width: 60, height: 2 },
    Graph: { width: 60, height: 24 },
    MiniVU: { width: 40, height: 24 },
    Input: { width: 14, height: 14 },
    Output: { width: 14, height: 14 },
};

// Синонимы (lowercase → ClassName)
const TYPE_ALIASES = {
    knob: 'Knob', k: 'Knob',
    slider: 'Slider', s: 'Slider',
    button: 'ButtonFlat', btn: 'ButtonFlat', buttonflat: 'ButtonFlat',
    radio: 'ButtonRadio', buttonradio: 'ButtonRadio',
    incdec: 'ButtonIncDec', buttonincdec: 'ButtonIncDec',
    toggle: 'ButtonText', buttontext: 'ButtonText',
    label: 'TextLabel', textlabel: 'TextLabel',
    field: 'TextField', textfield: 'TextField',
    edit: 'TextEdit', textedit: 'TextEdit',
    level: 'LevelShift', levelshift: 'LevelShift',
    led: 'LED',
    select: 'PartSelector', partselector: 'PartSelector',
    svg: 'SVG',
    line: 'Line',
    graph: 'Graph',
    vu: 'MiniVU', minivu: 'MiniVU',
    input: 'Input', in: 'Input',
    output: 'Output', out: 'Output',
};

export class TerminalPanel {
    constructor(app) {
        this.app = app;
        this.history = [];
        this.historyIndex = -1;

        this._build();
    }

    // ─────────────────────────── DOM ────────────────────────────────

    _build() {
        this.element = document.createElement('div');
        this.element.id = 'terminal-panel';
        this.element.style.cssText = `
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            background: #0a0a0f;
            color: #ccc;
            font-family: 'Consolas', 'Courier New', monospace;
            font-size: 12px;
            overflow: hidden;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 6px 10px;
            background: rgba(20, 20, 30, 0.95);
            border-bottom: 1px solid #222;
            color: #f90;
            font-weight: bold;
            font-size: 11px;
            flex-shrink: 0;
        `;
        header.textContent = '⌨ Terminal';

        // Вывод
        this.output = document.createElement('div');
        this.output.style.cssText = `
            flex: 1;
            padding: 8px 10px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-break: break-word;
            min-height: 0;
            line-height: 1.5;
        `;

        // Строка ввода
        const inputRow = document.createElement('div');
        inputRow.style.cssText = `
            display: flex;
            align-items: center;
            padding: 6px 10px;
            border-top: 1px solid #222;
            background: #06060a;
            flex-shrink: 0;
        `;

        const prompt = document.createElement('span');
        prompt.textContent = '> ';
        prompt.style.cssText = 'color: #0af; font-weight: bold; margin-right: 4px;';

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.style.cssText = `
            flex: 1;
            background: transparent;
            border: none;
            outline: none;
            color: #8f8;
            font-family: inherit;
            font-size: inherit;
        `;
        this.input.spellcheck = false;
        this.input.autocomplete = 'off';

        this.input.addEventListener('keydown', (e) => this._onKeyDown(e));

        inputRow.appendChild(prompt);
        inputRow.appendChild(this.input);

        this.element.appendChild(header);
        this.element.appendChild(this.output);
        this.element.appendChild(inputRow);

        // Приветствие
        this._print('Csound Modular Editor — terminal', '#666');
        this._print('Type "help" for available commands.', '#666');
        this._print('', '#666');
    }

    // ─────────────────────────── INPUT ──────────────────────────────

    _onKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const line = this.input.value;
            this.input.value = '';
            this._execute(line);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.input.value = this.history[this.history.length - 1 - this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.history[this.history.length - 1 - this.historyIndex];
            } else if (this.historyIndex === 0) {
                this.historyIndex = -1;
                this.input.value = '';
            }
        }
    }

    // ─────────────────────────── OUTPUT ─────────────────────────────

    _print(text, color = '#ccc') {
        const line = document.createElement('div');
        line.style.color = color;
        line.textContent = text;
        this.output.appendChild(line);
        this.output.scrollTop = this.output.scrollHeight;
    }

    _printError(text) {
        this._print('✗ ' + text, '#ff6b6b');
    }

    _printOk(text) {
        this._print('✓ ' + text, '#4ade80');
    }

    // ─────────────────────────── EXECUTE ────────────────────────────

    _execute(line) {
        const trimmed = line.trim();
        if (!trimmed) return;

        // История
        this.history.push(trimmed);
        this.historyIndex = -1;

        // Эхо
        this._print('> ' + trimmed, '#888');

        const parts = trimmed.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
            if (cmd === 'help' || cmd === '?') return this._cmdHelp();
            if (cmd === 'clear' || cmd === 'cls') {
                this.output.innerHTML = '';
                return;
            }
            if (cmd === 'ls' || cmd === 'list') return this._cmdLs();
            if (cmd === 'add') return this._cmdAdd(args);
            if (cmd === 'del' || cmd === 'delete' || cmd === 'rm') return this._cmdDel(args);

            this._printError(`Unknown command: ${cmd}`);
            this._print('Type "help" for available commands.', '#666');
        } catch (e) {
            this._printError(e.message);
        }
    }

    // ─────────────────────────── COMMANDS ───────────────────────────

    _cmdHelp() {
        this._print('Commands:', '#0af');
        this._print('  add <type> [x y]   — add component (auto-place or at x,y)');
        this._print('  ls                 — list components in module');
        this._print('  del <id>           — delete component by id');
        this._print('  clear              — clear output');
        this._print('  help               — this help');
        this._print('');
        this._print('Types:', '#0af');
        this._print('  knob, slider, button, radio, incdec, toggle,');
        this._print('  label, field, edit, led, level, select,');
        this._print('  svg, line, graph, vu,');
        this._print('  input, output, in, out');
    }

    _cmdLs() {
        const comps = this.app.components
            .filter(c => !c._isNewDragging)
            .sort((a, b) => parseInt(a.id) - parseInt(b.id));

        if (comps.length === 0) {
            this._print('(no components)', '#666');
            return;
        }

        this._print(`Components (${comps.length}):`, '#0af');
        for (const c of comps) {
            const type = c.constructor.name;
            const x = Math.round(c.relX ?? 0);
            const y = Math.round(c.relY ?? 0);
            const w = c.width ?? '?';
            const h = c.height ?? '?';
            this._print(`  id=${c.id}  ${type.padEnd(12)} at (${x}, ${y})  size ${w}×${h}`);
        }
    }

    _cmdAdd(args) {
        if (args.length === 0) {
            this._printError('Usage: add <type> [x y]');
            return;
        }

        const typeInput = args[0].toLowerCase();
        const type = TYPE_ALIASES[typeInput];

        if (!type) {
            this._printError(`Unknown type: ${args[0]}`);
            this._print(`Available: ${Object.keys(TYPE_ALIASES).join(', ')}`, '#666');
            return;
        }

        const size = PALETTE_SIZE[type];
        if (!size) {
            this._printError(`No palette size for ${type}`);
            return;
        }

        let x, y;
        if (args.length >= 3) {
            // Явные координаты
            x = parseFloat(args[1]);
            y = parseFloat(args[2]);
            if (isNaN(x) || isNaN(y)) {
                this._printError('Coordinates must be numbers');
                return;
            }
        } else {
            // Автопоиск свободного места
            const spot = this._findFreeSpot(size);
            if (!spot) {
                this._printError('No free space in module');
                return;
            }
            x = spot.x;
            y = spot.y;
        }

        // Проверяем, что внутри модуля
        const module = this.app.module;
        const inside = x >= 0 &&
                       x + size.width <= module.width &&
                       y >= 0 &&
                       y + size.height <= module.height;

        if (!inside) {
            this._printError(`Outside module (module is ${module.width}×${module.height})`);
            return;
        }

        // Проверяем коллизии
        const collides = this.app.components.some(c => {
            if (c._isNewDragging) return false;
            return !(x + size.width <= c.relX ||
                     x >= c.relX + c.width ||
                     y + size.height <= c.relY ||
                     y >= c.relY + c.height);
        });

        if (collides) {
            this._printError(`Collision at (${x}, ${y})`);
            return;
        }

        // Создаём
        const opts = { x: module.x + x, y: module.y + y };
        if (type === 'Input' || type === 'Output') {
            opts.jackType = 'audio';   // дефолт
        }

        const component = createComponent(type, opts);
        if (!component) {
            this._printError(`Cannot create ${type}`);
            return;
        }

        component.id = this.app._generateComponentId().toString();
        component.originalID = component.id;
        component.parameterId = parseInt(component.id);
        component.width = size.width;
        component.height = size.height;
        component.relX = x;
        component.relY = y;
        component.parent = module;
        component._editorModule = module;
        component._isNewDragging = false;

        this.app.components.push(component);

        // Обновляем код Csound
        if (this.app.codeViewerWindow) {
            this.app.codeViewerWindow.updateCode();
        }

        this._printOk(`Added ${type} (id=${component.id}) at (${x}, ${y})`);
    }

    _cmdDel(args) {
        if (args.length === 0) {
            this._printError('Usage: del <id>');
            return;
        }

        const id = args[0];
        const idx = this.app.components.findIndex(c => String(c.id) === id);

        if (idx === -1) {
            this._printError(`Component id=${id} not found`);
            return;
        }

        const comp = this.app.components[idx];
        this.app.removeComponent(comp);

        // Обновляем код
        if (this.app.codeViewerWindow) {
            this.app.codeViewerWindow.updateCode();
        }

        this._printOk(`Deleted ${comp.constructor.name} (id=${id})`);
    }

    // ─────────────────────────── AUTO-PLACE ─────────────────────────

    _findFreeSpot(size) {
        const module = this.app.module;

        // Сетка шагом 5px
        const step = 5;
        const margin = 2;

        for (let y = margin; y + size.height <= module.height - margin; y += step) {
            for (let x = margin; x + size.width <= module.width - margin; x += step) {
                const collides = this.app.components.some(c => {
                    if (c._isNewDragging) return false;
                    return !(x + size.width <= c.relX ||
                             x >= c.relX + c.width ||
                             y + size.height <= c.relY ||
                             y >= c.relY + c.height);
                });
                if (!collides) return { x, y };
            }
        }

        return null;
    }
}