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
//   rm <name>                — удалить user-модуль
//   lsmod [filter]           — список user-модулей
//   clear                    — очистить вывод
//   help [cmd]               — справка

import { moduleStore } from '../../src/api/index.js';
import { createComponent, getTypeOf, getByCategory } from '../ComponentRegistry.js';

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
                case 'del': case 'delete':return this._cmdDel(args);
                case 'mv': case 'move':   return this._cmdMv(args);
                case 'map':               return this._cmdMap(args);
                case 'name':              return this._cmdName(args);
                case 'set':               return this._cmdSet(args);
                case 'align':             return this._cmdAlign(args);
                case 'distr': case 'distribute': return this._cmdDistr(args);
                case 'grid':              return this._cmdGrid(args);
                case 'new': return this._cmdNew(args);
                case 'save':              return await this._cmdSave(args);
                case 'load':              return await this._cmdLoad(args);
                case 'rm':                return await this._cmdRm(args);       // ⭐ NEW
                case 'lsmod':             return await this._cmdLsmod(args);    // ⭐ NEW
                case 'stats':             return this._cmdStats();
                default:
                    this._printError(`Unknown command: ${cmd}`);
                    this._print('Type "help" for available commands.', '#666');
            }
        } catch (e) {
            this._printError(e.message || String(e));
        }
    }

    _cmdSet(args) {
        if (args.length < 3) {
            this._printError('Usage: set <id> <property> <value>');
            this._print('  text: set 3 text LFO', '#666');
            this._print('  list: set 3 items Off,On,Maybe  (or: labels, positions)', '#666');
            this._print('  count: set 3 count 4            (ButtonRadio)', '#666');
            this._print('  default index: set 3 default 2', '#666');
            this._print('  item at current index: set 3 item LFO  (ButtonIncDec)', '#666');
            this._print('  other: fontSize, color, mappingTable, min, max, jackType', '#666');
            return;
        }

        const id = parseInt(args[0]);
        if (isNaN(id)) {
            this._printError(`Invalid id: ${args[0]}`);
            return;
        }

        const comp = this.app.components.find(c => parseInt(c.id) === id);
        if (!comp) {
            this._printError(`Component id=${id} not found`);
            return;
        }

        const propRaw = args[1].toLowerCase();
        const rawValue = args.slice(2).join(' ');

        // ── СПИСКИ (ButtonFlat / ButtonRadio / ButtonIncDec) ──
        if (['items', 'labels', 'positions', 'list'].includes(propRaw)) {
            const arr = rawValue.split(',').map(s => s.trim()).filter(s => s !== '');
            if (arr.length === 0) {
                this._printError('Empty list');
                return;
            }
            const type = comp.constructor.name;

            if (type === 'ButtonFlat' && Array.isArray(comp.positions)) {
                comp.positions = arr;
                if (comp.currentIndex >= arr.length) comp.currentIndex = 0;
                comp.currentLabel = comp.positions[comp.currentIndex];
            } else if (type === 'ButtonRadio' && Array.isArray(comp.labels)) {
                comp.labels = arr;
                comp.buttonCount = arr.length;
                if (comp.selectedIndex >= arr.length) comp.selectedIndex = 0;
            } else if (type === 'ButtonIncDec' && Array.isArray(comp.items)) {
                comp.items = arr;
                if (comp.currentIndex >= arr.length) comp.currentIndex = 0;
                comp.currentItem = comp.items[comp.currentIndex];
            } else {
                // fallback: пробуем все три поля
                let touched = false;
                if (Array.isArray(comp.items))     { comp.items = arr; touched = true; }
                if (Array.isArray(comp.labels))    { comp.labels = arr; touched = true; }
                if (Array.isArray(comp.positions)) { comp.positions = arr; touched = true; }
                if (!touched) {
                    this._printError(`list not supported for ${type}`);
                    return;
                }
            }

            this._printOk(`id=${id}.list = [${arr.join(', ')}]`);
            return;
        }

        // ── COUNT (только ButtonRadio) ──
        if (propRaw === 'count') {
            const n = parseInt(rawValue);
            if (isNaN(n) || n < 1 || n > 16) {
                this._printError('count must be 1..16');
                return;
            }
            if (comp.constructor.name === 'ButtonRadio' && typeof comp.buttonCount === 'number') {
                comp.buttonCount = n;
                while (comp.labels.length < n) comp.labels.push(`Btn ${comp.labels.length + 1}`);
                if (comp.labels.length > n) comp.labels = comp.labels.slice(0, n);
                if (comp.selectedIndex >= n) comp.selectedIndex = 0;
            } else {
                this._printError(`count not supported for ${comp.constructor.name}`);
                return;
            }
            this._printOk(`id=${id}.count = ${n}`);
            return;
        }

        // ── DEFAULT INDEX ──
        if (propRaw === 'default' || propRaw === 'defaultindex') {
            const n = parseInt(rawValue);
            if (isNaN(n) || n < 0) {
                this._printError('default must be >= 0');
                return;
            }
            const type = comp.constructor.name;
            if (type === 'ButtonFlat' && typeof comp.currentIndex === 'number') {
                comp.currentIndex = Math.max(0, Math.min(comp.positions.length - 1, n));
                comp.currentLabel = comp.positions[comp.currentIndex];
            } else if (type === 'ButtonRadio' && typeof comp.selectedIndex === 'number') {
                comp.selectedIndex = Math.max(0, Math.min(comp.buttonCount - 1, n));
            } else if (type === 'ButtonIncDec' && typeof comp.currentIndex === 'number') {
                comp.currentIndex = Math.max(0, Math.min(comp.items.length - 1, n));
                comp.currentItem = comp.items[comp.currentIndex];
            } else if (type === 'ButtonText') {
                comp.isActive = Boolean(n);
            } else {
                this._printError(`default not supported for ${type}`);
                return;
            }
            this._printOk(`id=${id}.default = ${n}`);
            return;
        }

        // ── ITEM (текущий элемент ButtonIncDec) ──
        if (propRaw === 'item') {
            if (comp.constructor.name === 'ButtonIncDec' && Array.isArray(comp.items)) {
                comp.items[comp.currentIndex] = rawValue;
                comp.currentItem = comp.items[comp.currentIndex];
                this._printOk(`id=${id}.items[${comp.currentIndex}] = "${rawValue}"`);
            } else {
                this._printError(`item not supported for ${comp.constructor.name}`);
            }
            return;
        }

        // ── TEXT (ButtonText, TextLabel, TextEdit) ──
        if (['text', 'label', 'value', 'content'].includes(propRaw)) {
            const type = comp.constructor.name;
            if (comp.text === undefined) {
                this._printError(`text not supported for ${type}`);
                return;
            }
            comp.text = rawValue;
            if (typeof comp.updateDimensions === 'function') comp.updateDimensions();
            if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
            this._printOk(`id=${id}.text = ${JSON.stringify(rawValue)}`);
            return;
        }

        // ── FONT SIZE ──
        if (['fontsize', 'size'].includes(propRaw)) {
            const n = parseFloat(rawValue);
            if (isNaN(n) || n < 4 || n > 72) {
                this._printError('fontSize must be 4..72');
                return;
            }
            comp.fontSize = n;
            if (typeof comp.updateDimensions === 'function') comp.updateDimensions();
            this._printOk(`id=${id}.fontSize = ${n}`);
            return;
        }

        // ── COLOR ──
        if (propRaw === 'color' || propRaw === 'colour') {
            if (!/^#[0-9a-f]{6}$/i.test(rawValue) && !/^#[0-9a-f]{3}$/i.test(rawValue)) {
                this._printError('color must be #rgb or #rrggbb');
                return;
            }
            comp.color = rawValue;
            this._printOk(`id=${id}.color = ${rawValue}`);
            return;
        }

        // ── MAPPING TABLE ──
        if (['mapping', 'table', 'mappingtable'].includes(propRaw)) {
            comp.mappingTable = (rawValue === '' || rawValue === 'null') ? null : rawValue;
            if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
            this._printOk(`id=${id}.mappingTable = ${comp.mappingTable ?? 'null'}`);
            return;
        }

        // ── MIN / MAX / defaultValue ──
        if (['min', 'max', 'defaultvalue'].includes(propRaw)) {
            const n = parseFloat(rawValue);
            if (isNaN(n)) {
                this._printError(`${propRaw} must be a number`);
                return;
            }
            const key = propRaw === 'defaultvalue' ? 'value' : propRaw;
            comp[key] = n;
            if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
            this._printOk(`id=${id}.${key} = ${n}`);
            return;
        }

        // ── JACK TYPE ──
        if (propRaw === 'jacktype' || propRaw === 'jack') {
            if (rawValue !== 'audio' && rawValue !== 'control') {
                this._printError('jackType must be "audio" or "control"');
                return;
            }
            comp._jackType = rawValue;
            comp.type = rawValue;
            comp._isAudioJack = rawValue === 'audio';
            if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
            this._printOk(`id=${id}.jackType = ${rawValue}`);
            return;
        }

        this._printError(`Unknown property: ${args[1]}`);
    }

    _resolvePropAlias(propRaw) {
        const aliases = {
            // текст (для TextLabel, TextEdit, ButtonText)
            text: 'text', label: 'text', value: 'text', content: 'text',
            // размер шрифта
            fontSize: 'fontSize', size: 'fontSize', fontsize: 'fontSize',
            // цвет
            color: 'color', colour: 'color',
            // mapping
            mapping: 'mappingTable', table: 'mappingTable', mappingTable: 'mappingTable',
            // min/max/defaultValue
            min: 'min', max: 'max',
            defaultValue: 'defaultValue', default: 'defaultValue',
            // jack type
            jackType: 'jackType', jack: 'jackType',
        };
        return aliases[propRaw] || null;
    }

    _coerceValue(comp, prop, raw) {
        // jackType — особый случай: пишется в _jackType и type
        if (prop === 'jackType') {
            if (raw !== 'audio' && raw !== 'control') {
                this._printError('jackType must be "audio" or "control"');
                return undefined;
            }
            comp._jackType = raw;
            comp.type = raw;
            comp._isAudioJack = raw === 'audio';
            return raw;
        }

        const current = comp[prop];

        // mappingTable может быть null → принимаем строку, пусто → null
        if (prop === 'mappingTable') {
            return raw === '' || raw === 'null' ? null : raw;
        }

        if (typeof current === 'number') {
            const n = parseFloat(raw);
            return isNaN(n) ? undefined : n;
        }

        if (typeof current === 'boolean') {
            if (raw === 'true' || raw === '1') return true;
            if (raw === 'false' || raw === '0') return false;
            return undefined;
        }

        // строки, null, undefined — принимаем как есть
        return raw;
    }

    _cmdNew(args = []) {
        const rawName = args.length > 0 ? args.join(' ').trim() : '';
        let name = rawName.replace(/\s/g, '');
        if (/^[0-9]/.test(name)) name = 'M' + name;
        name = name.replace(/[^a-zA-Z0-9_]/g, '') || 'NewModule';

        this.app.clearModule({ title: name, resetColor: true });
        this._printOk(`New module created${rawName ? `: "${name}"` : ''}`);
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
        this._print('  new [name]             clear module (optionally set name)');
        this._print('  set <id> <prop> <value> set property (text, items, count, default, item, fontSize, color, mappingTable, min, max, jackType)');
        this._print('  align <ids...> l|r|u|d align components');
        this._print('  distr <ids...> h|v     distribute evenly');
        this._print('  grid on|off|N          toggle micro-grid or set step');
        this._print('  new                    clear module');
        this._print('  save [as <name>]       save module');
        this._print('  load <name>            load module');
        this._print('  rm <name>              delete user module');           // ⭐ NEW
        this._print('  lsmod [filter]         list user modules');            // ⭐ NEW
        this._print('  stats                  module statistics');
        this._print('  clear                  clear output');
        this._print('  help [cmd]             this help');
    }

    _cmdHelpTopic(cmd) {
        if (cmd === 'add') {
            this._printAddHelp();
            return;
        }
        const topics = {
            add: 'add <type> [x y]\n' +
                 '  types: ' + Object.keys(TYPE_ALIASES).join(', ') + '\n' +
                 '  jack types: ' + Object.keys(JACK_TYPE_ALIASES).join(', '),
            del: 'del <id> | del <type> | del <id> <id> ... | del <from>..<to>\n  examples: del 3, del knob, del 3 4 5, del 3..7',
            mv:  'mv <id> <x> <y>   — absolute position\nmv <id> +dx +dy   — relative shift',
            map: 'map <id> <table>  — bind mapping table\nmap <id>          — unbind',
            name: 'name <newName>  — rename module\n  e.g. name MyFilter, name "Cool Synth"',
            new: 'new [name]  — clear module and reset DSP code\n  new           → "NewModule"\n  new MyFilter  → "MyFilter"',
            align: 'align <ids...> <edge>\n  edges: l (left), r (right), u (up), d (down)',
            distr: 'distr <ids...> <axis>\n  axes: h (horizontal), v (vertical)',
            set: 'set <id> <property> <value>\n' +
                 '  examples:\n' +
                 '    set 3 text LFO\n' +
                 '    set 4 items Off,On,Maybe\n' +
                 '    set 4 count 4          (ButtonRadio)\n' +
                 '    set 4 default 2\n' +
                 '    set 5 item LFO         (ButtonIncDec, current index)\n' +
                 '    set 3 fontSize 14\n' +
                 '    set 3 color #ff8800\n' +
                 '    set 6 mappingTable LEVfrq\n' +
                 '    set 7 min 0\n' +
                 '    set 7 max 1000\n' +
                 '    set 8 jackType control',
            grid: 'grid         — show current grid\n  grid on      — enable micro-grid\n  grid off     — disable\n  grid N       — set grid step to N pixels',
            save: 'save           — save (uses current module name)\n  save as <name> — save under new name',
            load: 'load <name>    — load user module by name',
            rm:   'rm <name>      — delete user module (cannot be undone)\n' +
                  '  rm foo\n' +
                  '  Tip: lsmod — see available user modules',
            lsmod: 'lsmod [filter]  — list user modules\n' +
                   '  lsmod          → all\n' +
                   '  lsmod filt     → names containing "filt"',
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
                if (Array.isArray(c.positions)) this._print(`      positions: [${c.positions.join(', ')}]  currentIndex=${c.currentIndex}`);
                if (Array.isArray(c.labels) && c.constructor.name === 'ButtonRadio') this._print(`      labels: [${c.labels.join(', ')}]  selectedIndex=${c.selectedIndex}`);
                if (Array.isArray(c.items)) this._print(`      items: [${c.items.join(', ')}]  currentIndex=${c.currentIndex}`);
                if (c.constructor.name === 'ButtonText') this._print(`      text: "${c.text}"  isActive=${c.isActive}`);
                if (c.text !== undefined && c.text !== null && c.text !== '') {
                    this._print(`      text: ${JSON.stringify(c.text)}`);
                }
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
            this._printAddHelp();
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

        // ── 2. ⭐ Для TextLabel: второй аргумент может быть текстом (не числом) ──
        let labelText = null;
        let listText = null;
        let coordStart = 1;

        if (args.length >= 2) {
            const maybeNumber = parseFloat(args[1]);
            if (isNaN(maybeNumber)) {
                if (type === 'TextLabel') {
                    labelText = args[1];
                    coordStart = 2;
                } else if (['ButtonFlat', 'ButtonRadio', 'ButtonIncDec'].includes(type)) {
                    listText = args[1];
                    coordStart = 2;
                }
            }
        }

        // ── 3. Позиция ──
        let x, y;
        if (args.length >= coordStart + 2) {
            x = parseFloat(args[coordStart]);
            y = parseFloat(args[coordStart + 1]);
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

        // ── 4. Создание ──
        const opts = { x: module.x + x, y: module.y + y };
        if (type === 'Input' || type === 'Output') opts.jackType = jackType || 'audio';
        if (type === 'TextLabel' && labelText !== null) opts.text = labelText;

        if (listText !== null) {
            if (type === 'ButtonFlat')         opts.text = listText;      // ⚠️ проверить в ComponentRegistry
            else if (type === 'ButtonRadio')   opts.labels = listText;
            else if (type === 'ButtonIncDec')  opts.items = listText;
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

        // ── 5. Уведомление ──
        const jackLabel = (type === 'Input' || type === 'Output')
            ? ` (${jackType || 'audio'})` : '';
        const labelInfo = (type === 'TextLabel' && labelText !== null)
            ? ` "${labelText}"` : '';
        this._printOk(`Added ${type}${jackLabel}${labelInfo} (id=${component.id}) at (${x}, ${y})`);
    }


    _printAddHelp() {
        this._printInfo('Usage: add <type> [x y]');
        this._print('       add label <text> [x y]   (TextLabel with text)', '#666');
        this._print('       add ina|ink|outa|outk [x y]   (audio/control jacks)', '#666');
        this._print('');

        // Сгруппировать алиасы по типу: { Knob: ['knob', 'k'], ... }
        const byType = {};
        for (const [alias, type] of Object.entries(TYPE_ALIASES)) {
            if (!byType[type]) byType[type] = [];
            byType[type].push(alias);
        }
        for (const [alias, def] of Object.entries(JACK_TYPE_ALIASES)) {
            const key = `${def.type}/${def.jackType}`;
            if (!byType[key]) byType[key] = [];
            byType[key].push(alias);
        }

        // Категории компонентов — из ComponentRegistry
        const byCat = getByCategory();
        const catTitles = {
            controls: 'Controls',
            display:  'Display',
            jacks:    'Jacks',
            graphics: 'Graphics',
        };

        for (const [catKey, catTitle] of Object.entries(catTitles)) {
            const entries = byCat[catKey] || [];
            if (entries.length === 0) continue;

            this._print(`  ${catTitle}:`, '#0af');
            for (const entry of entries) {
                const type = entry.type;
                let aliases;

                if (catKey === 'jacks') {
                    // Input/Output — отдельно audio / control
                    const audioAlias = `${type === 'Input' ? 'in' : 'out'}a`;
                    const controlAlias = `${type === 'Input' ? 'in' : 'out'}k`;
                    const genericAlias = type === 'Input' ? 'in' : 'out';
                    aliases = [audioAlias, controlAlias, genericAlias].join(', ');
                    this._print(`    ${type.padEnd(14)} ${aliases}`, '#ccc');
                } else {
                    aliases = (byType[type] || []).join(', ');
                    this._print(`    ${type.padEnd(14)} ${aliases}`, '#ccc');
                }
            }
            this._print('');
        }
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

    _cmdNew(args) {
        // ⭐ Имя: new NAME или new (пустое)
        const rawName = args.length > 0 ? args.join(' ').trim() : '';
        let name = rawName.replace(/\s/g, '');
        if (/^[0-9]/.test(name)) name = 'M' + name;
        name = name.replace(/[^a-zA-Z0-9_]/g, '') || 'NewModule';

        // 1. Очистить модель
        this.app.clearModule();
        this.app.module.title = name;
        this.app.module.customColor = null;

        // 2. ⭐ Сбросить пользовательский DSP
        this.app.module._userCsoundCode = null;

        // 3. ⭐ Жёсткий сброс панели кода: эталон из модели + пересборка структуры
        if (this.app.codeViewerWindow) {
            const cv = this.app.codeViewerWindow;
            const code = cv.generateCsoundCode();

            cv.codeContent = code;
            cv.editor.value = code;
            cv.isDirty = false;
            cv._lastValidBody = null;
            cv.updateStatus('saved');

            cv._rebuildStructure();
            const fresh = cv._rebuildStructureFromCurrent();
            if (fresh) cv._structureCache = fresh;
            cv._updateGutter();
            cv._updateHighlight();
        }

        if (this.app.propertiesPanel?.activeTab === 'module') {
            this.app.propertiesPanel._render();
        }

        this._printOk(`New module created${rawName ? `: "${name}"` : ''}`);
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

            if (this.app.propertiesPanel?.activeTab === 'module') {
                this.app.propertiesPanel._render();
            }

            this._printOk(`Loaded "${name}"`);
        } catch (e) {
            this._printError(`Parse error: ${e.message}`);
        }
    }

    // ─────────────────────────── RM ────────────────────────────────

    async _cmdRm(args) {
        const name = args.join(' ').trim();

        if (!name) {
            this._printError('Usage: rm <moduleName>');
            this._print('  Tip: lsmod — list user modules', '#666');
            return;
        }

        try {
            const list = await moduleStore.list();
            if (!list.includes(name)) {
                this._printError(`Not a user module: ${name}`);
                if (list.length > 0) {
                    this._print(`Available: ${list.join(', ')}`, '#666');
                }
                return;
            }

            // подтверждение — необратимо
            const ok = typeof window.confirm === 'function'
                ? window.confirm(`Delete user module "${name}"? This cannot be undone.`)
                : true;
            if (!ok) {
                this._print('Cancelled', '#888');
                return;
            }

            const removed = await moduleStore.remove(name);

            if (removed) {
                this._printOk(`Deleted: ${name}`);
                if (this.app?.module?.title === name) {
                    this._print(
                        `   ⚠️ "${name}" is currently open in editor — use "new" to start fresh`,
                        '#f90'
                    );
                }
            } else {
                this._printError(`Delete failed: ${name}`);
            }
        } catch (e) {
            this._printError(`rm error: ${e.message}`);
        }
    }

    // ─────────────────────────── LSMOD ─────────────────────────────

    async _cmdLsmod(args) {
        const filter = args.join(' ').trim().toLowerCase();

        try {
            const list = await moduleStore.list();

            if (list.length === 0) {
                this._print('📭 No user modules', '#888');
                return;
            }

            const filtered = filter
                ? list.filter(n => n.toLowerCase().includes(filter))
                : list;

            if (filtered.length === 0) {
                this._print(`📭 No user modules matching "${filter}"`, '#888');
                return;
            }

            this._printInfo(`📦 User modules (${filtered.length}):`);
            filtered.sort();
            filtered.forEach((name, i) => {
                const current = this.app?.module?.title === name ? '  ← current' : '';
                this._print(`  ${i + 1}. ${name}${current}`);
            });
        } catch (e) {
            this._printError(`lsmod error: ${e.message}`);
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