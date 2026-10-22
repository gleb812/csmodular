// editor/ui/TerminalPanel.js
//
// Терминал для управления модулем через команды.
//
// Команды:
//   add <type> [x y]         — добавить компонент
//   in / out                 — алиасы add input / add output
//   ls [type] [-l]           — список компонентов
//   del <id|type|range>...   — удалить
//   mv <id> <x> <y>          — переместить (абсолютно)
//   mv <id> +dx +dy          — сдвинуть
//   map <id> <table>         — привязать mapping-таблицу (или снять)
//   align <ids...> l|r|u|d   — выравнивание
//   distr <ids...> h|v       — распределение равномерно
//   grid on|off|N            — сетка
//   new                      — новый модуль
//   save                     — сохранить
//   save as <name>           — сохранить под именем
//   load <name>              — загрузить
//   clear                    — очистить вывод
//   help [cmd]               — справка

import { createComponent, getTypeOf } from '../ComponentRegistry.js';
import { moduleStore } from '../../src/api/index.js';

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

const TYPE_ALIASES = {
    knob: 'Knob', k: 'Knob',
    slider: 'Slider', s: 'Slider', sl: 'Slider',
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

const JACK_TYPE_ALIASES = {
    ina:  { type: 'Input',  jackType: 'audio' },
    ink:  { type: 'Input',  jackType: 'control' },
    outa: { type: 'Output', jackType: 'audio' },
    outk: { type: 'Output', jackType: 'control' },
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

    _printError(text) { this._print('✗ ' + text, '#ff6b6b'); }
    _printOk(text) { this._print('✓ ' + text, '#4ade80'); }
    _printInfo(text) { this._print(text, '#0af'); }

    // ─────────────────────────── EXECUTE ────────────────────────────

    async _execute(line) {
        const trimmed = line.trim();
        if (!trimmed) return;

        this.history.push(trimmed);
        this.historyIndex = -1;

        this._print('> ' + trimmed, '#888');

        const parts = this._tokenize(trimmed);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
            switch (cmd) {
                case 'help': case '?':    return this._cmdHelp(args);
                case 'clear': case 'cls': this.output.innerHTML = ''; return;
                case 'ls': case 'list':   return this._cmdLs(args);
                case 'add':               return this._cmdAdd(args);
                case 'in': case 'out':
                case 'ina': case 'ink': case 'outa': case 'outk':
                    return this._cmdAdd([cmd, ...args]);
                case 'del': case 'delete': case 'rm': return this._cmdDel(args);
                case 'mv': case 'move':   return this._cmdMv(args);
                case 'map':               return this._cmdMap(args);
                case 'name':              return this._cmdName(args);
                case 'align':             return this._cmdAlign(args);
                case 'distr': case 'distribute': return this._cmdDistr(args);
                case 'grid':              return this._cmdGrid(args);
                case 'new':               return this._cmdNew();
                case 'save':              return await this._cmdSave(args);
                case 'load':              return await this._cmdLoad(args);
                case 'stats':             return this._cmdStats();
                default:
                    this._printError(`Unknown command: ${cmd}`);
                    this._print('Type "help" for available commands.', '#666');
            }
        } catch (e) {
            this._printError(e.message || String(e));
        }
    }

    _cmdName(args) {
        if (args.length === 0) {
            this._printError('Usage: name <newName>');
            return;
        }

        // Склеиваем аргументы на случай, если имя с пробелом в кавычках:
        // name "My Module" → args = ['My Module']
        // но на всякий случай — join(' '), если пришло несколько
        let raw = args.join(' ').trim();
        if (!raw) {
            this._printError('Name cannot be empty');
            return;
        }

        // Санитайз как везде
        let name = raw.replace(/\s/g, '');
        if (/^[0-9]/.test(name)) name = 'M' + name;
        name = name.replace(/[^a-zA-Z0-9_]/g, '');

        if (!name) {
            this._printError('Name contains no valid characters (use a-zA-Z0-9_)');
            return;
        }

        this.app.module.title = name;

        if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
        if (this.app.propertiesPanel && this.app.propertiesPanel.activeTab === 'module') {
            this.app.propertiesPanel._render();
        }

        this._printOk(`Module renamed to "${name}"`);
    }

    _tokenize(line) {
        // Разбиваем на токены, уважая кавычки для имён файлов
        const out = [];
        const re = /"([^"]*)"|(\S+)/g;
        let m;
        while ((m = re.exec(line)) !== null) {
            out.push(m[1] !== undefined ? m[1] : m[2]);
        }
        return out;
    }

    // ─────────────────────────── HELP ───────────────────────────────

    _cmdHelp(args) {
        if (args.length > 0) return this._cmdHelpTopic(args[0]);

        this._printInfo('Commands:');
        this._print('  add <type> [x y]       add component (auto-place or at x,y)');
        this._print('  ina / ink              add audio / control input');
        this._print('  outa / outk            add audio / control output');
        this._print('  in / out               shorthand for ina / outa (audio)');
        this._print('  ls [type] [-l]         list components');
        this._print('  del <id|type|range>... delete (e.g. del 3, del knob, del 3 4 5, del 3..7)');
        this._print('  mv <id> <x> <y>        move (absolute)');
        this._print('  mv <id> +dx +dy        move (relative)');
        this._print('  map <id> <table>       bind mapping table (or unset)');
        this._print('  name <newName>         rename module');
        this._print('  align <ids...> l|r|u|d align components');
        this._print('  distr <ids...> h|v     distribute evenly');
        this._print('  grid on|off|N          toggle micro-grid or set step');
        this._print('  new                    clear module');
        this._print('  save [as <name>]       save module');
        this._print('  load <name>            load module');
        this._print('  stats                  module statistics');
        this._print('  clear                  clear output');
        this._print('  help [cmd]             this help');
    }

    _cmdHelpTopic(cmd) {
        const topics = {
            add: 'add <type> [x y]\n' +
                 '  types: ' + Object.keys(TYPE_ALIASES).join(', ') + '\n' +
                 '  jack types: ' + Object.keys(JACK_TYPE_ALIASES).join(', '),
            del: 'del <id> | del <type> | del <id> <id> ... | del <from>..<to>\n  examples: del 3, del knob, del 3 4 5, del 3..7',
            mv:  'mv <id> <x> <y>   — absolute position\nmv <id> +dx +dy   — relative shift',
            map: 'map <id> <table>  — bind mapping table\nmap <id>          — unbind',
            name: 'name <newName>  — rename module\n  e.g. name MyFilter, name "Cool Synth"',
            align: 'align <ids...> <edge>\n  edges: l (left), r (right), u (up), d (down)',
            distr: 'distr <ids...> <axis>\n  axes: h (horizontal), v (vertical)',
            grid: 'grid         — show current grid\n  grid on      — enable micro-grid\n  grid off     — disable\n  grid N       — set grid step to N pixels',
            save: 'save           — save (uses current module name)\n  save as <name> — save under new name',
            load: 'load <name>    — load user module by name',
        };
        if (topics[cmd]) {
            this._printInfo(`Help for "${cmd}":`);
            this._print(topics[cmd]);
        } else {
            this._printError(`No help for "${cmd}"`);
        }
    }

    // ─────────────────────────── LS ─────────────────────────────────

    _cmdLs(args) {
        let filter = null;
        let verbose = false;

        for (const a of args) {
            if (a === '-l' || a === '--long') verbose = true;
            else if (!filter) filter = TYPE_ALIASES[a.toLowerCase()] || a;
        }

        let comps = this.app.components.filter(c => !c._isNewDragging);
        if (filter) comps = comps.filter(c => c.constructor.name === filter);
        comps.sort((a, b) => parseInt(a.id) - parseInt(b.id));

        if (comps.length === 0) {
            this._print('(no components)', '#666');
            return;
        }

        this._printInfo(`Components (${comps.length}):`);
        for (const c of comps) {
            const type = c.constructor.name;
            const x = Math.round(c.relX ?? 0);
            const y = Math.round(c.relY ?? 0);
            const w = c.width ?? '?';
            const h = c.height ?? '?';

            if (verbose) {
                this._print(`  id=${c.id}  ${type}`);
                this._print(`      pos (${x}, ${y})  size ${w}×${h}`);
                if (c.mappingTable) this._print(`      mapping: ${c.mappingTable}`);
                const jackType = c.type || c._jackType;
                if (jackType && (type === 'Input' || type === 'Output')) {
                    this._print(`      jack: ${jackType}`);
                }
                if (c.label) this._print(`      label: ${c.label}`);
            } else {
                this._print(`  id=${c.id}  ${type.padEnd(12)} at (${x}, ${y})  ${w}×${h}`);
            }
        }
    }

    // ─────────────────────────── ADD ────────────────────────────────

    _cmdAdd(args) {
        if (args.length === 0) {
            this._printError('Usage: add <type> [x y]');
            return;
        }

        const typeInput = args[0].toLowerCase();

        // ── 1. Разрешаем тип и jackType ──
        let type, jackType = null;

        if (JACK_TYPE_ALIASES[typeInput]) {
            type = JACK_TYPE_ALIASES[typeInput].type;
            jackType = JACK_TYPE_ALIASES[typeInput].jackType;
        } else if (TYPE_ALIASES[typeInput]) {
            type = TYPE_ALIASES[typeInput];
            // Старые in/out → audio по умолчанию
            if (type === 'Input' || type === 'Output') jackType = 'audio';
        } else {
            this._printError(`Unknown type: ${args[0]}`);
            this._print(
                `Available: ${Object.keys(TYPE_ALIASES).join(', ')}, ` +
                `${Object.keys(JACK_TYPE_ALIASES).join(', ')}`,
                '#666'
            );
            return;
        }

        const size = PALETTE_SIZE[type];
        if (!size) {
            this._printError(`No palette size for ${type}`);
            return;
        }

        // ── 2. Позиция ──
        let x, y;
        if (args.length >= 3) {
            x = parseFloat(args[1]);
            y = parseFloat(args[2]);
            if (isNaN(x) || isNaN(y)) {
                this._printError('Coordinates must be numbers');
                return;
            }
        } else {
            const spot = this._findFreeSpot(size);
            if (!spot) {
                this._printError('No free space in module');
                return;
            }
            x = spot.x;
            y = spot.y;
        }

        const module = this.app.module;
        if (x < 0 || x + size.width > module.width ||
            y < 0 || y + size.height > module.height) {
            this._printError(`Outside module (module is ${module.width}×${module.height})`);
            return;
        }

        if (this._collides(x, y, size.width, size.height, null)) {
            this._printError(`Collision at (${x}, ${y})`);
            return;
        }

        // ── 3. Создание ──
        const opts = { x: module.x + x, y: module.y + y };
        if (type === 'Input' || type === 'Output') {
            opts.jackType = jackType || 'audio';
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

        if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();

        // ── 4. Уведомление ──
        const jackLabel = (type === 'Input' || type === 'Output')
            ? ` (${jackType || 'audio'})` : '';
        this._printOk(`Added ${type}${jackLabel} (id=${component.id}) at (${x}, ${y})`);
    }

    // ─────────────────────────── DEL ────────────────────────────────

    _cmdDel(args) {
        if (args.length === 0) {
            this._printError('Usage: del <id|type|range>...');
            return;
        }

        // Собираем id для удаления
        const idsToDelete = new Set();

        for (const a of args) {
            // Диапазон 3..7
            const rangeMatch = a.match(/^(\d+)\.\.(\d+)$/);
            if (rangeMatch) {
                const from = parseInt(rangeMatch[1]);
                const to = parseInt(rangeMatch[2]);
                for (let i = from; i <= to; i++) idsToDelete.add(i);
                continue;
            }

            // Число
            if (/^\d+$/.test(a)) {
                idsToDelete.add(parseInt(a));
                continue;
            }

            // Тип (низкий регистр)
            const type = TYPE_ALIASES[a.toLowerCase()];
            if (type) {
                for (const c of this.app.components) {
                    if (c._isNewDragging) continue;
                    if (c.constructor.name === type) idsToDelete.add(parseInt(c.id));
                }
                continue;
            }

            this._printError(`Cannot parse "${a}"`);
            return;
        }

        if (idsToDelete.size === 0) {
            this._printError('Nothing to delete');
            return;
        }

        // Удаляем
        let deleted = 0;
        const notFound = [];
        for (const id of idsToDelete) {
            const idx = this.app.components.findIndex(c => parseInt(c.id) === id);
            if (idx === -1) { notFound.push(id); continue; }
            const comp = this.app.components[idx];
            this.app.removeComponent(comp);
            deleted++;
        }

        if (deleted > 0) {
            if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
            this._printOk(`Deleted ${deleted} component(s)`);
        }
        if (notFound.length > 0) {
            this._printError(`Not found: ${notFound.join(', ')}`);
        }
    }

    // ─────────────────────────── MV ─────────────────────────────────

    _cmdMv(args) {
        if (args.length < 3) {
            this._printError('Usage: mv <id> <x> <y> | mv <id> +dx +dy');
            return;
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) {
            this._printError('id must be a number');
            return;
        }

        const comp = this.app.components.find(c => parseInt(c.id) === id);
        if (!comp) {
            this._printError(`Component id=${id} not found`);
            return;
        }

        let dx, dy;
        const rawX = args[1], rawY = args[2];

        if (rawX.startsWith('+') || rawX.startsWith('-') ||
            rawY.startsWith('+') || rawY.startsWith('-')) {
            // Относительное
            dx = parseFloat(rawX);
            dy = parseFloat(rawY);
            if (isNaN(dx) || isNaN(dy)) {
                this._printError('Delta values must be numbers');
                return;
            }
        } else {
            // Абсолютное
            const nx = parseFloat(rawX);
            const ny = parseFloat(rawY);
            if (isNaN(nx) || isNaN(ny)) {
                this._printError('Coordinates must be numbers');
                return;
            }
            dx = nx - comp.relX;
            dy = ny - comp.relY;
        }

        const newX = comp.relX + dx;
        const newY = comp.relY + dy;
        const module = this.app.module;

        // Проверка границ
        if (newX < 0 || newX + comp.width > module.width ||
            newY < 0 || newY + comp.height > module.height) {
            this._printError(`Outside module (module is ${module.width}×${module.height})`);
            return;
        }

        // Проверка коллизий
        if (this._collides(newX, newY, comp.width, comp.height, comp)) {
            this._printError(`Collision at (${newX}, ${newY})`);
            return;
        }

        comp.relX = newX;
        comp.relY = newY;
        comp.x = module.x + newX;
        comp.y = module.y + newY;

        this._printOk(`Moved id=${id} to (${Math.round(newX)}, ${Math.round(newY)})`);
    }

    // ─────────────────────────── MAP ────────────────────────────────

    _cmdMap(args) {
        if (args.length === 0) {
            this._printError('Usage: map <id> [table]');
            return;
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) {
            this._printError('id must be a number');
            return;
        }

        const comp = this.app.components.find(c => parseInt(c.id) === id);
        if (!comp) {
            this._printError(`Component id=${id} not found`);
            return;
        }

        if (args.length === 1) {
            // Снять mapping
            comp.mappingTable = null;
            this._printOk(`Unmapped id=${id}`);
        } else {
            const table = args[1];
            comp.mappingTable = table;
            this._printOk(`id=${id} → mapping "${table}"`);
        }

        if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
    }

    // ─────────────────────────── ALIGN ──────────────────────────────

    _cmdAlign(args) {
        if (args.length < 2) {
            this._printError('Usage: align <ids...> l|r|u|d');
            return;
        }

        const edge = args[args.length - 1].toLowerCase();
        const idArgs = args.slice(0, -1);

        if (!['l', 'r', 'u', 'd', 'left', 'right', 'up', 'down'].includes(edge)) {
            this._printError(`Unknown edge "${edge}". Use l, r, u, d.`);
            return;
        }

        const comps = [];
        for (const a of idArgs) {
            const id = parseInt(a);
            if (isNaN(id)) {
                this._printError(`Not a number: ${a}`);
                return;
            }
            const c = this.app.components.find(x => parseInt(x.id) === id);
            if (!c) {
                this._printError(`Component id=${id} not found`);
                return;
            }
            comps.push(c);
        }

        if (comps.length < 2) {
            this._printError('Need at least 2 components');
            return;
        }

        // Целевое значение — у первого
        const ref = comps[0];

        const isLeft = (edge === 'l' || edge === 'left');
        const isRight = (edge === 'r' || edge === 'right');
        const isUp = (edge === 'u' || edge === 'up');
        const isDown = (edge === 'd' || edge === 'down');

        for (const c of comps) {
            let newX = c.relX;
            let newY = c.relY;

            if (isLeft) newX = ref.relX;
            if (isRight) newX = ref.relX + ref.width - c.width;
            if (isUp) newY = ref.relY;
            if (isDown) newY = ref.relY + ref.height - c.height;

            // Проверка
            if (this._collides(newX, newY, c.width, c.height, c)) {
                this._printError(`Cannot align id=${c.id} — collision`);
                continue;
            }

            c.relX = newX;
            c.relY = newY;
            c.x = this.app.module.x + newX;
            c.y = this.app.module.y + newY;
        }

        const edgeName = { l: 'left', r: 'right', u: 'up', d: 'down' }[edge[0]];
        this._printOk(`Aligned ${comps.length} components to ${edgeName}`);
    }

    // ─────────────────────────── DISTR ──────────────────────────────

    _cmdDistr(args) {
        if (args.length < 2) {
            this._printError('Usage: distr <ids...> h|v');
            return;
        }

        const axis = args[args.length - 1].toLowerCase();
        if (!['h', 'v', 'horizontal', 'vertical'].includes(axis)) {
            this._printError(`Unknown axis "${axis}". Use h or v.`);
            return;
        }

        const idArgs = args.slice(0, -1);
        const comps = [];
        for (const a of idArgs) {
            const id = parseInt(a);
            if (isNaN(id)) { this._printError(`Not a number: ${a}`); return; }
            const c = this.app.components.find(x => parseInt(x.id) === id);
            if (!c) { this._printError(`Component id=${id} not found`); return; }
            comps.push(c);
        }

        if (comps.length < 3) {
            this._printError('Need at least 3 components');
            return;
        }

        const isH = (axis === 'h' || axis === 'horizontal');

        // Сортируем по оси
        comps.sort((a, b) => isH ? a.relX - b.relX : a.relY - b.relY);

        const first = comps[0];
        const last = comps[comps.length - 1];

        let startPos, endPos;
        if (isH) {
            startPos = first.relX;
            endPos = last.relX;
        } else {
            startPos = first.relY;
            endPos = last.relY;
        }

        const step = (endPos - startPos) / (comps.length - 1);

        for (let i = 1; i < comps.length - 1; i++) {
            const c = comps[i];
            const target = startPos + step * i;

            let newX = c.relX;
            let newY = c.relY;
            if (isH) newX = Math.round(target);
            else newY = Math.round(target);

            if (this._collides(newX, newY, c.width, c.height, c)) {
                this._printError(`Cannot move id=${c.id} — collision`);
                continue;
            }

            c.relX = newX;
            c.relY = newY;
            c.x = this.app.module.x + newX;
            c.y = this.app.module.y + newY;
        }

        this._printOk(`Distributed ${comps.length} components ${isH ? 'horizontally' : 'vertically'}`);
    }

    // ─────────────────────────── GRID ───────────────────────────────

    _cmdGrid(args) {
        if (args.length === 0) {
            // Показать
            const on = this.app.showMicroGrid ? 'on' : 'off';
            const size = this.app.snapGridSize;
            this._printInfo(`grid: ${on}, step: ${size}px`);
            return;
        }

        const val = args[0].toLowerCase();

        if (val === 'on') {
            this.app.showMicroGrid = true;
            this._printOk('grid: on');
        } else if (val === 'off') {
            this.app.showMicroGrid = false;
            this._printOk('grid: off');
        } else {
            const n = parseInt(val);
            if (isNaN(n) || n < 1 || n > 100) {
                this._printError('grid step must be 1..100');
                return;
            }
            this.app.snapGridSize = n;
            this._printOk(`grid step: ${n}px`);
        }
    }

    // ─────────────────────────── NEW ────────────────────────────────

    _cmdNew() {
        this.app.clearModule();
        this.app.module.title = 'New Module';
        this.app.module.customColor = null;
        if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
        this._printOk('New module created');
    }

    // ─────────────────────────── SAVE ───────────────────────────────

    async _cmdSave(args) {
        let name = this.app.module.title || 'NewModule';
        name = name.replace(/\s/g, '');
        if (/^[0-9]/.test(name)) name = 'M' + name;
        name = name.replace(/[^a-zA-Z0-9_]/g, '') || 'NewModule';

        // save as <name>
        const isSaveAs = args[0]?.toLowerCase() === 'as' && args[1];
        if (isSaveAs) {
            let raw = args.slice(1).join(' ').trim();
            raw = raw.replace(/\s/g, '');
            if (/^[0-9]/.test(raw)) raw = 'M' + raw;
            raw = raw.replace(/[^a-zA-Z0-9_]/g, '');
            if (!raw) {
                this._printError('Invalid name for "save as"');
                return;
            }
            name = raw;
            this.app.module.title = name;

            // Обновить структуру кода под новое имя (opcode-строка)
            if (this.app.codeViewerWindow) {
                this.app.codeViewerWindow.updateCode();
            }
        }

        // Собираем модуль
        const moduleData = {
            name: name,
            displayName: name,
            gridHeight: this.app.module.gridHeight || 3,
            type: name,
            typeID: null,
            defaultParams: [],
            tooltip: name,
            params: [],
            inputs: [],
            outputs: [],
            customColor: this.app.module.customColor || null,
            components: [],
        };

        const { serializeComponents, collectParamIds, collectPorts } =
            await import('../ComponentRegistry.js');
        moduleData.components = serializeComponents(this.app.components);
        moduleData.params = collectParamIds(this.app.components);
        const ports = collectPorts(this.app.components);
        moduleData.inputs = ports.inputs;
        moduleData.outputs = ports.outputs;

        // JS-код
        const jsCode = this._generateJsCode(moduleData);

        // DSP-код: актуальное содержимое редактора (включая тело),
        // а не устаревший _userCsoundCode
        let dspCode = null;
        if (this.app.codeViewerWindow) {
            dspCode = this.app.codeViewerWindow.getCode();
        } else if (this.app.module._userCsoundCode) {
            dspCode = this.app.module._userCsoundCode;
        } else if (this.app.codeViewerWindow) {
            dspCode = this.app.codeViewerWindow.generateCsoundCode();
        }

        try {
            const ok = await moduleStore.save(name, jsCode, dspCode);
            if (ok) {
                this.app.module.title = name;

                if (this.app.propertiesPanel?.activeTab === 'module') {
                    this.app.propertiesPanel._render();
                }

                this._printOk(`Saved "${name}"`);
            } else {
                this._printError(`Save failed for "${name}"`);
            }
        } catch (e) {
            this._printError(`Save error: ${e.message}`);
        }
    }

    _generateJsCode(moduleData) {
        const name = moduleData.name;
        const componentsJSON = JSON.stringify(moduleData.components, null, 8);

        const paramsStr = moduleData.params.length > 0
            ? `    params: [${moduleData.params.join(', ')}],`
            : '    params: [],';

        const inputsStr = moduleData.inputs.length > 0
            ? `    inputs: [${moduleData.inputs.join(', ')}],`
            : '    inputs: [],';

        const outputsStr = moduleData.outputs.length > 0
            ? `    outputs: [${moduleData.outputs.join(', ')}],`
            : '    outputs: [],';

        const customColorStr = moduleData.customColor
            ? `    customColor: '${moduleData.customColor}',`
            : `    customColor: null,`;

        return `// Automatically generated by Module Editor
export const ${name}Module = {
    type: '${name}',
    typeID: ${moduleData.typeID || 999},
    defaultParams: [],
    displayName: '${name}',
    gridHeight: ${moduleData.gridHeight},
    originalName: '${name}',
    tooltip: '${name}',
${customColorStr}
${paramsStr}
${inputsStr}
${outputsStr}
    components: ${componentsJSON}
};`;
    }

    // ─────────────────────────── LOAD ───────────────────────────────

    async _cmdLoad(args) {
        if (args.length === 0) {
            // Показать список
            const names = await moduleStore.list();
            if (names.length === 0) {
                this._print('(no user modules)', '#666');
                return;
            }
            this._printInfo(`Available modules (${names.length}):`);
            for (const n of names) this._print(`  ${n}`);
            return;
        }

        const name = args[0];
        const data = await moduleStore.load(name);
        if (!data) {
            this._printError(`Module "${name}" not found`);
            return;
        }

        try {
            const match = data.code.match(/export\s+const\s+\w+\s*=\s*(\{[\s\S]*\});?\s*$/m);
            if (!match) throw new Error('Cannot parse module code');
            const moduleData = new Function(`return ${match[1]}`)();

            this.app.restoreModuleFromData(moduleData, data.dsp_code);

            if (this.app.codeViewerWindow) this.app.codeViewerWindow.syncFromModule();
            if (this.app.propertiesPanel?.activeTab === 'module') {
                this.app.propertiesPanel._render();
            }

            this._printOk(`Loaded "${name}"`);
        } catch (e) {
            this._printError(`Parse error: ${e.message}`);
        }
    }

    // ─────────────────────────── STATS ──────────────────────────────

    _cmdStats() {
        const comps = this.app.components.filter(c => !c._isNewDragging);
        const byType = {};
        for (const c of comps) {
            const t = c.constructor.name;
            byType[t] = (byType[t] || 0) + 1;
        }

        const total = comps.length;
        const module = this.app.module;
        const area = module.width * module.height;

        // Занятая площадь (без пересечений — приблизительно)
        let usedArea = 0;
        for (const c of comps) usedArea += c.width * c.height;

        const percent = Math.round((usedArea / area) * 100);

        this._printInfo(`Module "${module.title}" — ${module.gridWidth}×${module.gridHeight} (${module.width}×${module.height}px)`);
        this._print(`Components: ${total}`);
        for (const [t, n] of Object.entries(byType).sort()) {
            this._print(`  ${t.padEnd(15)} ${n}`);
        }
        this._print(`Used area: ~${percent}%`);
    }

    // ─────────────────────────── HELPERS ────────────────────────────

    _findFreeSpot(size) {
        const module = this.app.module;
        const step = 5;
        const margin = 2;

        for (let y = margin; y + size.height <= module.height - margin; y += step) {
            for (let x = margin; x + size.width <= module.width - margin; x += step) {
                if (!this._collides(x, y, size.width, size.height, null)) {
                    return { x, y };
                }
            }
        }
        return null;
    }

    _collides(x, y, w, h, exclude) {
        for (const c of this.app.components) {
            if (c === exclude) continue;
            if (c._isNewDragging) continue;
            const cx = c.relX ?? 0;
            const cy = c.relY ?? 0;
            const cw = c.width ?? 0;
            const ch = c.height ?? 0;

            const overlap = !(x + w <= cx ||
                              x >= cx + cw ||
                              y + h <= cy ||
                              y >= cy + ch);
            if (overlap) return true;
        }
        return false;
    }
}