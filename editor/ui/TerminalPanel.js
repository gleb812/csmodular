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

import { libraryStore } from '../../src/api/index.js';
import {
    ComponentRegistry, serializeComponents, deserializeComponents,
    createComponent, getTypeOf, getByCategory, hasCollisions,
    isParametric,          // ⭐ NEW
} from '../ComponentRegistry.js';
import { CATEGORIES, isValidCategory } from '../../src/moduleCategories.js';

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

        // Font size controls
        const fontCtrl = document.createElement('span');
        fontCtrl.style.cssText = 'float: right; display: flex; gap: 4px; align-items: center;';

        const fontDown = document.createElement('button');
        fontDown.textContent = 'A−';
        fontDown.style.cssText = 'padding: 1px 6px; background: #2a2a2a; border: 1px solid #444; color: #ccc; border-radius: 3px; cursor: pointer; font-size: 10px;';
        fontDown.onclick = () => this._changeFontSize(-1);

        const fontUp = document.createElement('button');
        fontUp.textContent = 'A+';
        fontUp.style.cssText = fontDown.style.cssText;
        fontUp.onclick = () => this._changeFontSize(+1);

        fontCtrl.appendChild(fontDown);
        fontCtrl.appendChild(fontUp);
        header.appendChild(fontCtrl);

        // Font size state (persisted)
        this.fontSize = parseInt(localStorage.getItem('csmodular:editor-terminal-fontsize') || '12', 10);
        if (isNaN(this.fontSize)) this.fontSize = 12;
        this._applyFontSize();

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

    _changeFontSize(delta) {
        const next = Math.max(8, Math.min(20, this.fontSize + delta));
        if (next === this.fontSize) return;
        this.fontSize = next;
        localStorage.setItem('csmodular:editor-terminal-fontsize', String(next));
        this._applyFontSize();
    }

    _applyFontSize() {
        this.element.style.fontSize = `${this.fontSize}px`;
        if (this.output) this.output.style.fontSize = `${this.fontSize}px`;
        if (this.input) this.input.style.fontSize = `${this.fontSize}px`;
    }

    // ─────────────────────────── INPUT ──────────────────────────────

    _onKeyDown(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const line = this.input.value;
            this.input.value = '';
            this._execute(line);
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this._autocomplete();
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

    async _autocomplete() {
        const raw = this.input.value;
        const tokens = this._tokenize(raw);
        const endsWithSpace = /\s$/.test(raw);
        const lastIdx = endsWithSpace ? tokens.length : tokens.length - 1;
        const lastToken = endsWithSpace ? '' : (tokens[lastIdx] || '');

        // Собираем кандидатов по контексту
        let candidates = [];

        const cmd = (tokens[0] || '').toLowerCase();

        if (lastIdx === 0) {
            // Первый токен — команды
            candidates = [
                'help', 'clear', 'ls', 'add', 'del', 'mv', 'map', 'name',
                'category', 'set', 'align', 'distr', 'grid', 'new', 'save',
                'load', 'rm', 'lsmod', 'lslib', 'lib', 'where', 'stats',
            ];
        } else if (cmd === 'load' || cmd === 'rm') {
            // load <name>, load <lib>/<name> — библиотеки и модули
            try {
                const libs = await libraryStore.listLibraries();
                for (const l of libs) {
                    if (lastToken.includes('/')) break; // не подсказываем после /
                    candidates.push(l.name);
                }
                // Модули из текущей библиотеки (для load <name>)
                const curLib = this.app._sourceLibrary || 'user';
                const mods = await libraryStore.listModules(curLib);
                for (const m of mods) candidates.push(m.name);
            } catch { /* ignore */ }
        } else if (cmd === 'save') {
            // save as <name>, save <lib> <name>
            if (tokens[1]?.toLowerCase() === 'as') {
                candidates = []; // имя модуля — свободный ввод
            } else {
                try {
                    const libs = await libraryStore.listLibraries();
                    for (const l of libs) candidates.push(l.name);
                } catch { /* ignore */ }
            }
        } else if (cmd === 'set') {
            candidates = [
                'text', 'items', 'labels', 'positions', 'count', 'default',
                'item', 'fontSize', 'color', 'mappingTable', 'min', 'max',
                'jackType',
            ];
        } else if (cmd === 'align') {
            candidates = ['l', 'r', 'u', 'd'];
        } else if (cmd === 'distr') {
            candidates = ['h', 'v'];
        } else if (cmd === 'grid') {
            candidates = ['on', 'off'];
        }

        if (candidates.length === 0) return;

        const matches = candidates.filter(c => c.startsWith(lastToken));
        if (matches.length === 0) return;

        if (matches.length === 1) {
            // Один кандидат — подставить
            tokens[lastIdx] = matches[0];
            this.input.value = tokens.join(' ') + (endsWithSpace ? ' ' : '');
            return;
        }

        // Несколько — вывести в output и НЕ менять input (bash-style)
        this._print('', '#666');
        this._print(matches.join('  '), '#0af');
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
                case 'cp': case 'copy': return this._cmdCp(args);
                case 'cpmod': case 'copymod': return await this._cmdCpmod(args);
                case 'mv': case 'move':   return this._cmdMv(args);
                case 'map':               return this._cmdMap(args);
                case 'name':              return this._cmdName(args);
                case 'category': case 'cat': return this._cmdCategory(args);
                case 'set':               return this._cmdSet(args);
                case 'align':             return this._cmdAlign(args);
                case 'distr': case 'distribute': return this._cmdDistr(args);
                case 'grid':              return this._cmdGrid(args);
                case 'new': return this._cmdNew(args);
                case 'save':              return await this._cmdSave(args);
                case 'load':              return await this._cmdLoad(args);
                case 'rmlib': return await this._cmdRmlib(args);
                case 'rm':                return await this._cmdRm(args);       // ⭐ NEW
                case 'lsmod':             return await this._cmdLsmod(args);    // ⭐ NEW
                case 'lslib': return await this._cmdLslib(args);
                case 'lib': case 'where': return await this._cmdLib(args);
                case 'stats':             return this._cmdStats();
                default:
                    this._printError(`Unknown command: ${cmd}`);
                    this._print('Type "help" for available commands.', '#666');
            }
        } catch (e) {
            this._printError(e.message || String(e));
        }
    }

    async _cmdRmlib(args) {
        if (args.length === 0) {
            this._printError('Usage: rmlib <name>');
            this._print('  Tip: lslib — list libraries', '#666');
            return;
        }
        const lib = args[0];
        try {
            const libs = await libraryStore.listLibraries();
            const entry = libs.find(l => l.name === lib);
            if (!entry) {
                this._printError(`Library "${lib}" not found`);
                return;
            }
            if (entry.source === 'builtin') {
                this._printError(`Library "${lib}" is builtin (read-only) — cannot delete`);
                return;
            }
            const mods = await libraryStore.listModules(lib);
            const ok = typeof window.confirm === 'function'
                ? window.confirm(`Delete library "${lib}" with ${mods.length} module(s)? This cannot be undone.`)
                : true;
            if (!ok) { this._print('Cancelled', '#888'); return; }

            const removed = await libraryStore.removeLibrary(lib);
            if (removed) {
                this._printOk(`Deleted library: ${lib}`);
                if (this.app._sourceLibrary === lib) {
                    this._print(`   ⚠️ Current library was "${lib}" — switched to "user"`, '#f90');
                    this.app._sourceLibrary = 'user';
                }
            } else {
                this._printError(`Delete failed: ${lib}`);
            }
        } catch (e) {
            this._printError(`rmlib error: ${e.message}`);
        }
    }

    async _cmdCpmod(args) {
        if (args.length === 0) {
            this._printError('Usage: cpmod <newName> | cpmod <lib>/<newName> | cpmod <oldName> <newName>');
            this._print('  cpmod Mix2            — copy current module as Mix2 (same library)', '#666');
            this._print('  cpmod user/Mix2       — copy current module to user library', '#666');
            this._print('  cpmod Mix Mix2        — copy module Mix as Mix2 (same library)', '#666');
            return;
        }

        const { sanitizeName } = await import('../saveService.js');
        const { saveModule } = await import('../saveService.js');

        let targetLib = this.app._sourceLibrary || 'user';
        let newName = null;
        let srcName = this.app.module?.title || null;

        // Разбор: 
        //   cpmod <newName>          → [newName]
        //   cpmod <lib>/<newName>    → [lib/name]
        //   cpmod <oldName> <newName> → [oldName, newName]
        if (args.length === 1) {
            if (args[0].includes('/')) {
                const [l, n] = args[0].split('/', 2);
                targetLib = l;
                newName = n;
            } else {
                newName = args[0];
            }
        } else if (args.length >= 2) {
            // ⭐ args[0] = имя исходного модуля, args[1] = новое имя
            srcName = args[0];
            newName = args[1];
            // Библиотека — текущая, либо та, где srcName
            // (проверим ниже)
        }

        newName = sanitizeName(newName);
        if (!newName) {
            this._printError('Invalid module name');
            return;
        }

        // Если srcName !== app.module.title — надо загрузить srcName
        if (srcName && srcName !== this.app.module?.title) {
            // Ищем srcName в библиотеках
            const libs = await libraryStore.listLibraries();
            let foundLib = null;
            let foundData = null;
            for (const entry of libs) {
                const data = await libraryStore.loadModule(entry.name, srcName);
                if (data) {
                    foundLib = entry.name;
                    foundData = data;
                    break;
                }
            }
            if (!foundData) {
                this._printError(`Module "${srcName}" not found`);
                return;
            }
            // Загружаем в редактор
            this.app.restoreModuleFromData(foundData.description, foundData.dspCode);
            this.app._sourceLibrary = foundLib;
            targetLib = foundLib;
        }

        // Проверка перезаписи
        try {
            const mods = await libraryStore.listModules(targetLib);
            if (mods.some(m => m.name === newName)) {
                const ok = typeof window.confirm === 'function'
                    ? window.confirm(`Module "${newName}" already exists in "${targetLib}". Overwrite?`)
                    : true;
                if (!ok) {
                    this._print('Cancelled', '#888');
                    return;
                }
            }
        } catch { /* ignore */ }

        // Запомнить состояние
        const oldTitle = this.app.module.title;
        const oldSourceLib = this.app._sourceLibrary;

        if (oldTitle === newName && targetLib === oldSourceLib) {
            this._printError(`Already "${newName}" in "${targetLib}" — nothing to copy`);
            return;
        }

        try {
            const result = await saveModule(this.app, { lib: targetLib, name: newName });

            // ⭐ Откатить текущий модуль на оригинал
            if (this.app.codeViewerWindow) {
                this.app.module.title = oldTitle;
                this.app.codeViewerWindow.updateCode();
            } else {
                this.app.module.title = oldTitle;
            }
            this.app._sourceLibrary = oldSourceLib;

            this._printOk(`Copied "${oldTitle}" → ${result.lib}/${result.name}`);
            this._print(`   (still editing "${oldTitle}")`, '#888');
        } catch (e) {
            this._printError(`cpmod error: ${e.message}`);
        }
    }

    _cmdCp(args) {
        if (args.length === 0) {
            this._printError('Usage: cp <id> [x y | +dx +dy]');
            return;
        }

        const srcId = parseInt(args[0]);
        if (isNaN(srcId)) {
            this._printError(`Invalid id: ${args[0]}`);
            return;
        }

        const src = this.app.components.find(c => parseInt(c.id) === srcId);
        if (!src) {
            this._printError(`Component id=${srcId} not found`);
            return;
        }

        // 1. Клонирование через ComponentRegistry (хелперы)
        let clone;
        try {
            const arr = serializeComponents([src]);
            if (!arr || arr.length === 0) {
                this._printError('Clone failed: serializeComponents returned empty');
                return;
            }
            const data = arr[0];

            // Сбрасываем то, что НЕ должно копироваться
            delete data.id;
            delete data.cables;
            delete data.connected;
            delete data.csoundChannel;
            delete data.originalID;
            delete data.parameterId;
            if ('sourceComponentId' in data) data.sourceComponentId = null;
            if ('targetId' in data) data.targetId = null;
            if ('modeComponentId' in data) data.modeComponentId = null;

            const restored = deserializeComponents([data], { module: this.app.module });
            if (!restored || restored.length === 0) {
                this._printError('Clone failed: deserializeComponents returned empty');
                return;
            }
            clone = restored[0];
        } catch (e) {
            this._printError(`Clone failed: ${e.message}`);
            console.error('[cp] clone error:', e);
            return;
        }

        if (!clone) {
            this._printError('Clone failed: clone is null');
            return;
        }

        // ⭐ Уникализировать csoundName клона (иначе два kVol в xin → Csound сломается)
        if (isParametric(clone)) {
            const base = clone.csoundName || `Param${clone.id}`;
            const taken = new Set(
                this.app.components
                    .filter(c => isParametric(c))
                    .map(c => c.csoundName || `Param${c.id}`)
            );
            let candidate = base;
            let n = 2;
            while (taken.has(candidate)) {
                candidate = `${base}${n++}`;
            }
            clone.csoundName = candidate;
        }

        // 2. Позиция
        let newX, newY;
        if (args.length >= 3) {
            const rawX = args[1], rawY = args[2];
            if (rawX.startsWith('+') || rawX.startsWith('-') ||
                rawY.startsWith('+') || rawY.startsWith('-')) {
                const dx = parseFloat(rawX);
                const dy = parseFloat(rawY);
                if (isNaN(dx) || isNaN(dy)) {
                    this._printError('Delta must be numbers');
                    return;
                }
                newX = (src.relX ?? 0) + dx;
                newY = (src.relY ?? 0) + dy;
            } else {
                newX = parseFloat(rawX);
                newY = parseFloat(rawY);
                if (isNaN(newX) || isNaN(newY)) {
                    this._printError('Coordinates must be numbers');
                    return;
                }
            }
        } else {
            newX = (src.relX ?? 0) + (src.width || 20) + 4;
            newY = src.relY ?? 0;
        }

        // 3. Границы + коллизии
        const module = this.app.module;
        if (newX < 0 || newX + clone.width > module.width ||
            newY < 0 || newY + clone.height > module.height) {
            this._printError(`Outside module (${module.width}×${module.height})`);
            return;
        }
        if (this._collides(newX, newY, clone.width, clone.height, null)) {
            const spot = this._findFreeSpotNear(newX, newY, clone.width, clone.height, src);
            if (!spot) {
                this._printError(`Collision at (${newX}, ${newY}) — no free space nearby`);
                return;
            }
            newX = spot.x;
            newY = spot.y;
            this._print(`⚠️ Collision — placed at (${newX}, ${newY}) instead`, '#f90');
        }

        // 4. Финализация
        clone.id = this.app._generateComponentId().toString();
        clone.originalID = clone.id;
        clone.parameterId = parseInt(clone.id);
        clone.relX = newX;
        clone.relY = newY;
        clone.x = module.x + newX;
        clone.y = module.y + newY;
        clone.parent = module;
        clone._editorModule = module;
        clone._isNewDragging = false;
        if (!Array.isArray(clone.cables)) clone.cables = [];

        this.app.components.push(clone);

        if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();

        this._printOk(`Copied ${src.constructor.name} id=${srcId} → id=${clone.id} at (${Math.round(newX)}, ${Math.round(newY)})`);
    }

    async _cmdLslib(args) {
        try {
            const libs = await libraryStore.listLibraries();
            if (libs.length === 0) {
                this._print('📭 No libraries', '#888');
                return;
            }
            const curLib = this.app._sourceLibrary || 'user';
            const filter = args.join(' ').trim().toLowerCase();
            const filtered = filter
                ? libs.filter(l => l.name.toLowerCase().includes(filter))
                : libs;

            this._printInfo(`📚 Libraries (${filtered.length}):`);
            for (const l of filtered) {
                const icon = l.source === 'user' ? '👤' : '📦';
                const meta = l.meta || {};
                const author = meta.author && meta.author !== 'unknown' ? ` — ${meta.author}` : '';
                const ver = meta.version && meta.version !== '0.0.0' ? ` v${meta.version}` : '';
                const current = l.name === curLib ? '  ← current' : '';
                this._print(`  ${icon} ${l.name}${ver}${author}${current}`);
            }
        } catch (e) {
            this._printError(`lslib error: ${e.message}`);
        }
    }

    async _cmdLib(args) {
        const curLib = this.app._sourceLibrary || 'user';
        
        // ⭐ Переключение
        if (args.length > 0) {
            const target = args[0];
            try {
                const libs = await libraryStore.listLibraries();
                const entry = libs.find(l => l.name === target);
                if (!entry) {
                    this._printError(`Library "${target}" not found`);
                    this._print('  Tip: lslib — list libraries', '#666');
                    return;
                }
                this.app._sourceLibrary = target;
                this._printOk(`Switched to library: ${target}`);
                return;
            } catch (e) {
                this._printError(`lib error: ${e.message}`);
                return;
            }
        }

        // Показать текущую
        const modName = this.app.module?.title || '?';
        const isDirty = this.app.codeViewerWindow?.isDirty;

        this._printInfo(`📚 Current library: ${curLib}`);
        this._print(`   Module: ${modName}${isDirty ? ' (unsaved)' : ''}`, '#ccc');
        this._print('', '#666');
        this._print('  Tip: lib <name> — switch library', '#666');
        this._print('  Tip: save — save to current library', '#666');
        this._print('  Tip: save <lib>/<name> — save to specific library', '#666');
    }


    _cmdCategory(args) {
        if (args.length === 0) {
            const current = this.app.module?.category || 'custom';
            this._printInfo(`Current category: ${current}`);
            this._print(`Available: ${CATEGORIES.join(', ')}`, '#666');
            return;
        }

        const cat = args[0].toLowerCase();
        if (!isValidCategory(cat)) {
            this._printError(`Invalid category: "${cat}"`);
            this._print(`Available: ${CATEGORIES.join(', ')}`, '#666');
            return;
        }

        if (this.app.module) {
            this.app.module.category = cat;
        }

        // Обновить PropertiesPanel, если открыт таб Module
        if (this.app.propertiesPanel?.activeTab === 'module') {
            this.app.propertiesPanel._render();
        }

        this._printOk(`Category set to "${cat}"`);
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

        if (propRaw === 'size') {
            const m = rawValue.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/);
            if (!m) { this._printError('size format: WxH (e.g. 40x20)'); return; }
            comp.width  = parseFloat(m[1]);
            comp.height = parseFloat(m[2]);
            if (this.app.codeViewerWindow) this.app.codeViewerWindow.updateCode();
            this._printOk(`id=${id}.size = ${comp.width}×${comp.height}`);
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
        this._print('  add <type> [x y]       add component');
        this._print('  ina / ink / outa / outk add input/output');
        this._print('  ls [type] [-l]         list components');
        this._print('  del <id|type|range>... delete components');
        this._print('  mv <id> <x> <y>        move (absolute or +dx +dy)');
        this._print('  cp <id> [x y]          copy component');
        this._print('  cpmod <newName>        copy module to new name (stay on original)');
        this._print('  cpmod <lib>/<newName>  copy module to specific library');
        this._print('  map <id> <table>       bind mapping table');
        this._print('  set <id> <prop> <v>    set property');
        this._print('  align <ids> l|r|u|d    align');
        this._print('  distr <ids> h|v        distribute');
        this._print('  grid on|off|N          micro-grid');
        this._print('  name <newName>         rename module');
        this._print('  category <cat>         set category');
        this._print('  new [name]             new module');
        this._print('  save [as <name>]       save (current library)');
        this._print('  save <lib>/<name>      save to specific library');
        this._print('  load <name>            load (current, then all)');
        this._print('  load <lib>/<name>      load from specific library');
        this._print('  rm <name>              delete user module');
        this._print('  rmlib <name>           delete library (user only)');
        this._print('  lsmod [lib] [filter]   list modules');
        this._print('  lslib [filter]         list libraries');
        this._print('  lib [name]             show or switch current library');
        this._print('  where [name]           alias for lib');
        this._print('  stats                  module statistics');
        this._print('  clear                  clear output');
        this._print('  help [cmd]             this help');
        this._print('');
        this._print('  Tip: Tab completes commands, libraries, and modules', '#666');
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
            cp: 'cp <id>                    — copy component (same settings)\n' +
                'cp <id> <x> <y>            — copy to specific position\n' +
                'cp <id> +dx +dy            — copy with offset\n' +
                '\n  Note: id, cables, and cross-references (sourceComponentId, etc.)\n' +
                '  are NOT copied.',
            cpmod: 'cpmod <newName>              — copy current module, stay on original\n' +
                   'cpmod <lib>/<newName>        — copy to specific library\n' +
                   'cpmod <lib> <newName>        — same, space-separated',
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
            save: 'save                    — save to current library\n' +
                  'save as <name>          — save to current library, new name\n' +
                  'save <lib>/<name>       — save to specific library\n' +
                  'save <lib> <name>       — same, space-separated',
            load: 'load                    — show help\n' +
                  'load <name>             — search current library, then all\n' +
                  'load <lib>/<name>       — specific library\n' +
                  'load <lib> <name>       — same, space-separated',
            lslib: 'lslib [filter]          — list libraries\n' +
                   '  lslib                → all\n' +
                   '  lslib test           → names containing "test"',
            lib: 'lib                     — show current library + module\n' +
                 'lib <name>              — switch current library\n' +
                 'where                   — alias for lib',
            lsmod: 'lsmod [lib] [filter]    — list modules\n' +
                   '  lsmod                 → current library\n' +
                   '  lsmod user            → all user modules\n' +
                   '  lsmod user filt       → user modules matching "filt"',
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

        const def = ComponentRegistry[type];
        if (!def || !def.paletteSize) {
            this._printError(`No palette size for ${type}`);
            return;
        }
        const size = def.paletteSize;

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

        if (hasCollisions(type) && this._collides(x, y, size.width, size.height, null)) {
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
        if (!def.autoSize) {
            component.width = size.width;
            component.height = size.height;
        }
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
        if (hasCollisions(comp) && this._collides(newX, newY, comp.width, comp.height, comp)) {
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
        try {
            const { saveModule, sanitizeName } = await import('../saveService.js');

            // Текущая библиотека
            let lib = this.app._sourceLibrary || 'user';
            let name = null;

            // Разбор аргументов:
            //   save                     → текущая lib, текущее имя
            //   save as <name>           → текущая lib, новое имя
            //   save <lib> <name>        → lib + name
            //   save <lib>/<name>        → то же
            if (args.length > 0) {
                const a0 = args[0];
                if (a0.toLowerCase() === 'as' && args[1]) {
                    name = sanitizeName(args.slice(1).join(' '));
                    if (!name) { this._printError('Invalid name for "save as"'); return; }
                } else if (a0.includes('/')) {
                    const [l, n] = a0.split('/', 2);
                    lib = l;
                    name = sanitizeName(n);
                    if (!name) { this._printError('Invalid name'); return; }
                } else if (args.length >= 2) {
                    lib = a0;
                    name = sanitizeName(args.slice(1).join(' '));
                    if (!name) { this._printError('Invalid name'); return; }
                } else {
                    // save <something> — считаем это именем в текущей lib
                    name = sanitizeName(a0);
                    if (!name) { this._printError('Invalid name'); return; }
                }
            }

            const result = await saveModule(this.app, { lib, name });
            this._printOk(`Saved "${result.name}" → ${result.lib}`);
            this.app._sourceLibrary = result.lib;

            if (this.app.propertiesPanel?.activeTab === 'module') {
                this.app.propertiesPanel._render();
            }
        } catch (e) {
            this._printError(`Save error: ${e.message}`);
        }
    }
    // ─────────────────────────── LOAD ───────────────────────────────

    async _cmdLoad(args) {
        // Без аргументов — help
        if (args.length === 0) {
            this._printInfo('Usage:');
            this._print('  load <name>            — search current library, then all');
            this._print('  load <lib>/<name>      — specific library');
            this._print('  load <lib> <name>      — same, space-separated');
            this._print('', '#666');
            this._print('  lslib                  — list libraries');
            this._print('  lsmod [lib]            — list modules (default: current)');
            return;
        }

        // Разбор аргументов
        let lib = null;
        let name = args[0];

        if (args[0].includes('/')) {
            [lib, name] = args[0].split('/', 2);
        } else if (args.length >= 2) {
            lib = args[0];
            name = args[1];
        }

        // Если lib не указана — ищем в текущей, потом user, потом все
        let found = null;
        if (lib) {
            found = await libraryStore.loadModule(lib, name);
            if (!found) {
                this._printError(`Module "${name}" not found in library "${lib}"`);
                return;
            }
            found = { ...found, lib };
        } else {
            const curLib = this.app._sourceLibrary || 'user';
            const libs = await libraryStore.listLibraries();
            const order = [curLib, 'user', ...libs.filter(l => l.name !== curLib && l.name !== 'user').map(l => l.name)];
            const tried = new Set();
            for (const l of order) {
                if (tried.has(l)) continue;
                tried.add(l);
                const data = await libraryStore.loadModule(l, name);
                if (data) { found = { ...data, lib: l }; break; }
            }
        }

        if (!found) {
            this._printError(`Module "${name}" not found`);
            this._print('  Tip: lslib — list libraries; lsmod [lib] — list modules', '#666');
            return;
        }

        try {
            this.app.restoreModuleFromData(found.description, found.dspCode);
            this.app._sourceLibrary = found.lib;

            if (this.app.propertiesPanel?.activeTab === 'module') {
                this.app.propertiesPanel._render();
            }

            this._printOk(`Loaded "${name}" from ${found.lib}`);
        } catch (e) {
            this._printError(`Parse error: ${e.message}`);
        }
    }
    // ─────────────────────────── RM ────────────────────────────────

    async _cmdRm(args) {
        if (args.length === 0) {
            this._printError('Usage: rm <name> | rm <lib>/<name> | rm <lib> <name>');
            this._print('  Tip: lsmod [lib] — list modules', '#666');
            return;
        }

        // Разбор аргументов
        let lib = null;
        let name = null;

        if (args[0].includes('/')) {
            [lib, name] = args[0].split('/', 2);
        } else if (args.length >= 2) {
            lib = args[0];
            name = args[1];
        } else {
            name = args[0];
            lib = this.app._sourceLibrary || 'user';
        }

        if (!name) {
            this._printError('Module name is required');
            return;
        }

        try {
            // Проверка: библиотека существует?
            const libs = await libraryStore.listLibraries();
            const libEntry = libs.find(l => l.name === lib);

            if (!libEntry) {
                this._printError(`Library "${lib}" not found`);
                this._print('  Tip: lslib — list libraries', '#666');
                return;
            }

            // Builtin — read-only
            if (libEntry.source === 'builtin') {
                this._printError(`Library "${lib}" is builtin (read-only) — cannot delete`);
                return;
            }

            // Проверка: модуль существует?
            const mods = await libraryStore.listModules(lib);
            const exists = mods.some(m => m.name === name);

            if (!exists) {
                this._printError(`Module "${name}" not found in library "${lib}"`);
                if (mods.length > 0) {
                    this._print(`  Available in "${lib}": ${mods.map(m => m.name).join(', ')}`, '#666');
                }
                return;
            }

            // Подтверждение
            const ok = typeof window.confirm === 'function'
                ? window.confirm(`Delete module "${name}" from "${lib}"? This cannot be undone.`)
                : true;
            if (!ok) {
                this._print('Cancelled', '#888');
                return;
            }

            const removed = await libraryStore.removeModule(lib, name);

            if (removed) {
                this._printOk(`Deleted: ${lib}/${name}`);
                if (this.app?.module?.title === name && this.app?._sourceLibrary === lib) {
                    this._print(`   ⚠️ "${name}" is currently open — use "new" to start fresh`, '#f90');
                }
            } else {
                this._printError(`Delete failed: ${lib}/${name}`);
            }
        } catch (e) {
            this._printError(`rm error: ${e.message}`);
        }
    }

    // ─────────────────────────── LSMOD ─────────────────────────────

    async _cmdLsmod(args) {
        const curLib = this.app._sourceLibrary || 'user';
        let lib = curLib;
        let filter = '';

        if (args.length > 0) {
            // lsmod <lib> [filter] или lsmod [filter] (если args[0] — известная либа)
            try {
                const libs = await libraryStore.listLibraries();
                if (libs.some(l => l.name === args[0])) {
                    lib = args[0];
                    filter = args.slice(1).join(' ').trim().toLowerCase();
                } else {
                    filter = args.join(' ').trim().toLowerCase();
                }
            } catch {
                filter = args.join(' ').trim().toLowerCase();
            }
        }

        try {
            const mods = await libraryStore.listModules(lib);
            if (mods.length === 0) {
                this._print(`📭 No modules in "${lib}"`, '#888');
                return;
            }

            const filtered = filter
                ? mods.filter(m => m.name.toLowerCase().includes(filter))
                : mods;

            if (filtered.length === 0) {
                this._print(`📭 No modules matching "${filter}" in "${lib}"`, '#888');
                return;
            }

            this._printInfo(`📦 ${lib} (${filtered.length}):`);
            filtered.forEach((m, i) => {
                const current = (this.app?.module?.title === m.name && lib === curLib) ? '  ← current' : '';
                const status = m.status && m.status !== 'dev' ? ` [${m.status}]` : '';
                const dn = m.displayName && m.displayName !== m.name ? ` (${m.displayName})` : '';
                this._print(`  ${i + 1}. ${m.name}${dn}${status}${current}`);
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

    _findFreeSpotNear(startX, startY, w, h, exclude, maxRadius = 200) {
        const module = this.app.module;
        const step = 5;

        // Сканируем концентрические квадраты вокруг (startX, startY)
        for (let r = 0; r <= maxRadius; r += step) {
            // Верхняя и нижняя стороны
            for (let dx = -r; dx <= r; dx += step) {
                const x1 = startX + dx;
                const y1 = startY - r;
                if (this._isFreeSpot(x1, y1, w, h, exclude, module)) return { x: x1, y: y1 };
                const y2 = startY + r;
                if (this._isFreeSpot(x1, y2, w, h, exclude, module)) return { x: x1, y: y2 };
            }
            // Левая и правая стороны
            for (let dy = -r + step; dy < r; dy += step) {
                const x1 = startX - r;
                const y1 = startY + dy;
                if (this._isFreeSpot(x1, y1, w, h, exclude, module)) return { x: x1, y: y1 };
                const x2 = startX + r;
                if (this._isFreeSpot(x2, y1, w, h, exclude, module)) return { x: x2, y: y1 };
            }
        }
        return null;
    }

    _isFreeSpot(x, y, w, h, exclude, module) {
        if (x < 0 || y < 0) return false;
        if (x + w > module.width || y + h > module.height) return false;
        return !this._collides(x, y, w, h, exclude);
    }

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
            if (!hasCollisions(c)) continue;    // ← NEW: ярлыки не мешают
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