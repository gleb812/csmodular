// src/ui/ContextMenu.js
import { moduleStore } from '../api/index.js';
import { PANEL_GRID_WIDTH } from '../constants.js';
import { ratingStore, getEffectiveRating } from '../api/moduleRatingStore.js';
import { getModuleStatus, getStatusMeta, IS_DEV } from '../api/moduleStatusStore.js';

export class ContextMenu {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.menuElement = null;
        this.searchInput = null;
        this.moduleGroups = null;
        this.lastOpenMouseY = null;
        this._isLoaded = false;
        
        window.contextMenu = this;

        this.initModuleStructure();
        this.createMenuElement();
        this.setupEventListeners();
        this.injectStyles();

        this.loadUserModules().then(() => {
            this._isLoaded = true;
            this.updateUserGroupsInLeftPanel();
            //console.log('✅ ContextMenu fully loaded');
        });
    }

    initModuleStructure() {
        // ⭐ Полный список NM2-модулей — статический хардкод.
        //    В BUILD фильтруется по window.__STABLE_MODULES__ (manifest).
        const ALL_NM2 = {
            'In/Out': ['In2', 'Out2', 'In4', 'Out4', 'Device', 'FxIn', 'Keyboard', 'MonoKey', 'Name', 'NoteDet', 'Status'],
            'Logic': ['8Counter', 'ADConv', 'BinCounter', 'ClkDiv', 'DAConv', 'Delay', 'FlipFlop', 'Gate', 'Invert', 'Pulse'],
            'Osc': ['DXRouter', 'Driver', 'DrumSynth', 'MetNoise', 'Noise', 'Operator', 'OscA', 'OscB', 'OscC', 'OscD', 'OscDual', 'OscMaster', 'OscNoise', 'OscPM', 'OscPerc', 'OscShpA', 'OscShpB', 'OscString', 'Resonator'],
            'FX': ['Compressor', 'Digitizer', 'Flanger', 'FreqShift', 'PShift', 'Phaser', 'Reverb', 'Scratch', 'StChorus'],
            'Switch': ['Mux18', 'Mux81', 'Mux81X', 'SH', 'Sw12', 'Sw12M', 'Sw14', 'Sw18', 'Sw21', 'Sw21M', 'Sw41', 'Sw81', 'SwOnOffM', 'SwOnOffT', 'T&amp;H', 'ValSw1-2', 'ValSw2-1', 'WindSw'],
            'Mixer': ['Fade12', 'Fade21', 'Mix11A', 'Mix11S', 'Mix21A', 'Mix21B', 'Mix41A', 'Mix41B', 'Mix41C', 'Mix41S', 'Mix81A', 'Mix81B', 'MixFader', 'MixStereo', 'Pan', 'X-Fade'],
            'Env': ['EnvADDSR', 'EnvADR', 'EnvADSR', 'EnvAHD', 'EnvD', 'EnvH', 'EnvMulti', 'ModADSR', 'ModAHD'],
            'Note': ['Glide', 'KeyQuant', 'LevScaler', 'NoteQuant', 'NoteScaler', 'PartQuant', 'PitchTrack', 'ZeroCnt'],
            'LFO': ['ClkGen', 'LfoA', 'LfoB', 'LfoC', 'LfoShpA'],
            'Shaper': ['Clip', 'Overdrive', 'Rect', 'Saturate', 'ShpExp', 'ShpStatic', 'WaveWrap'],
            'Filter': ['Eq2Band', 'Eq3Band', 'EqPeak', 'FltClassic', 'FltComb', 'FltHP', 'FltLP', 'FltMulti', 'FltNord', 'FltPhase', 'FltStatic', 'FltVoice', 'Vocoder', 'WahWah'],
            'Level': ['CompLev', 'CompSig', 'ConstSwM', 'ConstSwT', 'Constant', 'EnvFollow', 'LevAdd', 'LevAmp', 'LevConv', 'LevMod', 'LevMult', 'MinMax', 'ModAmt', 'NoiseGate'],
            'MIDI': ['Automate', 'CtrlRcv', 'CtrlSend', 'NoteRcv', 'NoteSend', 'NoteZone', 'PCSend'],
            'Seq': ['SeqCtr', 'SeqEvent', 'SeqLev', 'SeqNote', 'SeqVal'],
            'Delay': ['DelayA', 'DelayB', 'DelayDual', 'DelayQuad', 'DlyClock', 'DlyEight', 'DlyShiftReg', 'DlySingleA', 'DlySingleB', 'DlyStereo'],
            'Rnd': ['RandomA', 'RandomB', 'RndClkA', 'RndClkB', 'RndPattern', 'RndTrig'],
            'Test': ['Blue2Red', 'Red2Blue'],
        };

        // ⭐ BUILD: фильтр по manifest. DEV: window.__STABLE_MODULES__ = undefined → всё.
        const allow = window.__STABLE_MODULES__;   // Set<string> | undefined

        this.nm2Modules = {};
        for (const [group, mods] of Object.entries(ALL_NM2)) {
            const filtered = allow
                ? mods.filter(name => allow.has(name))
                : mods;
            if (filtered.length > 0) {
                this.nm2Modules[group] = filtered;
            }
        }

        // Пользовательские модули — как было
        this.userModules = { 'My Modules': [] };

        // moduleGroups — объединение
        this.moduleGroups = { ...this.nm2Modules, ...this.userModules };

        // allModules — для поиска
        this.allModules = {};
        Object.entries(this.moduleGroups).forEach(([group, modules]) => {
            modules.forEach(module => {
                this.allModules[module] = group;
            });
        });

        if (allow) {
            const total = Object.values(this.nm2Modules).reduce((n, arr) => n + arr.length, 0);
            console.log(`[ContextMenu/build] ${total} stable module(s) visible`);
        }
    }

    searchAllModules(searchTerm) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        
        const searchLower = searchTerm.toLowerCase().trim();
        modulesContainer.innerHTML = '';
        
        if (searchLower === '') {
            // Пустой поиск — вернуть активную группу
            const activeGroup = this.menuElement.querySelector('.group-item[style*="border-left-color"]');
            if (activeGroup) {
                this.showModulesForGroup(activeGroup.dataset.group);
            }
            return;
        }
        
        // Собираем все совпадения
        const results = [];
        
        // NM2 модули
        Object.entries(this.nm2Modules).forEach(([groupName, modules]) => {
            modules.forEach(m => {
                if (m.toLowerCase().includes(searchLower)) {
                    results.push({ name: m, group: groupName, level: 'nm2' });
                }
            });
        });
        
        // User модули
        Object.entries(this.userModules).forEach(([groupName, modules]) => {
            modules.forEach(m => {
                if (m.toLowerCase().includes(searchLower)) {
                    results.push({ name: m, group: groupName, level: 'user' });
                }
            });
        });
        
        // Пусто — ничего не найдено
        if (results.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = `No modules found matching "${searchTerm}"`;
            emptyMsg.style.cssText = `
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 11px;
                font-style: italic;
            `;
            modulesContainer.appendChild(emptyMsg);
            return;
        }
        
        // Заголовок результата
        const resultHeader = document.createElement('div');
        resultHeader.style.cssText = `
            padding: 6px 12px;
            font-size: 10px;
            color: #666;
            border-bottom: 1px solid #333;
            margin-bottom: 4px;
        `;
        resultHeader.textContent = `Found ${results.length} module(s)`;
        modulesContainer.appendChild(resultHeader);
        
        // Выводим совпадения
        results.forEach(({ name, group, level }) => {
            const row = this._createModuleRow(name, level === 'user');

            // group chip — перед звёздами
            const groupSpan = document.createElement('span');
            groupSpan.textContent = group;
            groupSpan.style.cssText = `
                font-size: 9px;
                color: #555;
                font-style: italic;
                margin-right: 6px;
                flex: 0 0 auto;
            `;
            const stars = row.querySelector('.rating-stars');
            row.insertBefore(groupSpan, stars);

            modulesContainer.appendChild(row);
        });
    }

    createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'context-menu';
        this.menuElement.style.cssText = `
            position: fixed;
            width: 600px;
            height: 400px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 20000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #ccc;
            overflow: hidden;
            opacity: 0;
            transform: scale(0.95);
            visibility: hidden;
            transition: opacity 0.1s ease-out, transform 0.1s ease-out;
        `;
        
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            height: 100%;
        `;
        
        // ЛЕВАЯ КОЛОНКА - Два уровня (NM2 и User)
        const leftPanel = document.createElement('div');
        leftPanel.id = 'left-panel';
        leftPanel.style.cssText = `
            width: 30%;
            background: #222;
            border-right: 1px solid #333;
            overflow-y: auto;
            padding: 0;
        `;
        
        // ПРАВАЯ КОЛОНКА - Поиск + Модули
        const rightPanel = document.createElement('div');
        rightPanel.id = 'right-panel';
        rightPanel.style.cssText = `
            width: 70%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Поиск
        const searchContainer = document.createElement('div');
        searchContainer.style.cssText = `
            padding: 8px 12px;
            background: #252525;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
        `;
        
        this.searchInput = document.createElement('input');
        this.searchInput.type = 'text';
        this.searchInput.placeholder = 'Type to search modules...';
        this.searchInput.style.cssText = `
            width: 100%;
            padding: 6px 10px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 3px;
            color: white;
            font-size: 12px;
            outline: none;
            box-sizing: border-box;
        `;
        
        searchContainer.appendChild(this.searchInput);
        
        // Контейнер для модулей
        const modulesContainer = document.createElement('div');
        modulesContainer.id = 'modules-container';
        modulesContainer.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 8px 0;
        `;
        
        // Патч меню
        const patchSection = this.createCompactPatchSection();
        
        rightPanel.appendChild(searchContainer);
        rightPanel.appendChild(patchSection);
        rightPanel.appendChild(modulesContainer);
        
        container.appendChild(leftPanel);
        container.appendChild(rightPanel);
        this.menuElement.appendChild(container);
        
        document.body.appendChild(this.menuElement);
        this.updateMenuPosition();
        
        // Создаем иерархический список в левой панели
        this.createHierarchicalGroupList(leftPanel);
    }

    createHierarchicalGroupList(container) {
        container.innerHTML = '';

        // === УРОВЕНЬ 1: NM2 ===
        const nm2Header = this.createLevelHeader('📦 NM2', true);
        container.appendChild(nm2Header);

        // Подзаголовки NM2 (все группы NM2)
        const nm2Groups = document.createElement('div');
        nm2Groups.className = 'level-groups nm2-groups';
        nm2Groups.style.cssText = `
            padding-left: 8px;
        `;

        Object.keys(this.nm2Modules).forEach((groupName) => {
            const groupItem = this.createGroupItem(groupName, 'nm2');
            nm2Groups.appendChild(groupItem);
        });

        container.appendChild(nm2Groups);

        // === РАЗДЕЛИТЕЛЬ ===
        const divider = document.createElement('div');
        divider.style.cssText = `
            height: 1px;
            background: #333;
            margin: 8px 0;
        `;
        container.appendChild(divider);

        // === УРОВЕНЬ 1: User ===
        const userHeader = this.createLevelHeader('👤 User', false);
        container.appendChild(userHeader);

        // Подзаголовки User
        const userGroups = document.createElement('div');
        userGroups.className = 'level-groups user-groups';
        userGroups.style.cssText = `
            padding-left: 8px;
        `;

        Object.keys(this.userModules).forEach((groupName) => {
            const groupItem = this.createGroupItem(groupName, 'user');
            userGroups.appendChild(groupItem);
        });

        container.appendChild(userGroups);

        // По умолчанию открываем NM2
        this.toggleLevel('nm2', true);
        this.toggleLevel('user', false);
        
        // Выбираем первую группу NM2
        const firstNm2Group = Object.keys(this.nm2Modules)[0];
        if (firstNm2Group) {
            const firstItem = nm2Groups.querySelector('.group-item');
            if (firstItem) {
                firstItem.style.background = '#2a2a2a';
                firstItem.style.borderLeftColor = '#0af';
                firstItem.style.color = '#fff';
                this.showModulesForGroup(firstNm2Group);
            }
        }
    }

    // Создает заголовок уровня (NM2 или User)
    createLevelHeader(title, isOpen = true) {
        const header = document.createElement('div');
        header.className = 'level-header';
        header.dataset.level = title.includes('NM2') ? 'nm2' : 'user';
        header.style.cssText = `
            padding: 6px 12px;
            font-size: 12px;
            font-weight: bold;
            color: #0af;
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #1f1f1f;
            border-radius: 4px;
            margin: 2px 4px;
        `;

        const arrow = document.createElement('span');
        arrow.className = 'level-arrow';
        arrow.textContent = isOpen ? '▼' : '▶';
        arrow.style.cssText = `
            font-size: 10px;
            color: #666;
        `;

        header.innerHTML = `<span>${title}</span>`;
        header.appendChild(arrow);

        // Клик для сворачивания/разворачивания
        header.onclick = (e) => {
            e.stopPropagation();
            const level = header.dataset.level;
            const isCurrentlyOpen = arrow.textContent === '▼';
            this.toggleLevel(level, !isCurrentlyOpen);
        };

        return header;
    }

    _createStatusDot(moduleName) {
        const def = this.system?.moduleFactory?.moduleRegistry?.[moduleName];
        const status = getModuleStatus(def);
        const meta = getStatusMeta(status);

        const dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.dataset.module = moduleName;
        dot.dataset.status = status;
        dot.title = `${moduleName} — ${meta.label}`;
        dot.style.cssText = `
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${meta.color};
            flex: 0 0 auto;
            margin-left: 4px;
            box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
        `;
        return dot;
    }

    toggleLevel(level, open) {
        const groupsContainer = this.menuElement.querySelector(`.${level}-groups`);
        if (!groupsContainer) return;

        const header = this.menuElement.querySelector(`.level-header[data-level="${level}"]`);
        if (!header) return;

        const arrow = header.querySelector('.level-arrow');
        
        if (open) {
            groupsContainer.style.display = 'block';
            if (arrow) arrow.textContent = '▼';
        } else {
            groupsContainer.style.display = 'none';
            if (arrow) arrow.textContent = '▶';
        }
    }

    // Создает элемент группы (используется для подзаголовков внутри уровней)
    createGroupItem(groupName, level) {
        const groupItem = document.createElement('div');
        groupItem.className = 'group-item';
        groupItem.dataset.group = groupName;
        groupItem.dataset.level = level;
        groupItem.style.cssText = `
            padding: 4px 12px;
            font-size: 11px;
            color: #aaa;
            cursor: pointer;
            user-select: none;
            border-left: 2px solid transparent;
            margin: 1px 0;
            border-radius: 0 3px 3px 0;
        `;
        
        // Добавляем префикс в зависимости от уровня
        const prefix = level === 'nm2' ? '📁 ' : '👤 ';
        groupItem.textContent = prefix + groupName;
        
        groupItem.onmouseenter = () => {
            document.querySelectorAll('.group-item').forEach(item => {
                item.style.background = 'transparent';
                item.style.borderLeftColor = 'transparent';
                item.style.color = '#aaa';
            });
            
            groupItem.style.background = '#2a2a2a';
            groupItem.style.borderLeftColor = '#0af';
            groupItem.style.color = '#fff';
            
            this.showModulesForGroup(groupName);
        };
        
        groupItem.onclick = () => {
            this.showModulesForGroup(groupName);
        };
        
        return groupItem;
    }

    showModulesForGroup(groupName) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;

        let modules = this.nm2Modules[groupName] || this.userModules[groupName] || [];
        if (modules.length === 0) {
            for (const [key, value] of Object.entries(this.nm2Modules)) {
                if (key.toLowerCase() === groupName.toLowerCase()) { modules = value; break; }
            }
            if (modules.length === 0) {
                for (const [key, value] of Object.entries(this.userModules)) {
                    if (key.toLowerCase() === groupName.toLowerCase()) { modules = value; break; }
                }
            }
        }

        let searchTerm = '';
        if (this.searchInput && this.searchInput.value) {
            searchTerm = this.searchInput.value.toLowerCase();
        }
        const filtered = searchTerm
            ? modules.filter(m => m.toLowerCase().includes(searchTerm))
            : modules;

        modulesContainer.innerHTML = '';

        if (filtered.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.textContent = searchTerm ? 'No modules found' : 'No modules in this group';
            emptyMsg.style.cssText = `padding: 20px; text-align: center; color: #666; font-size: 11px; font-style: italic;`;
            modulesContainer.appendChild(emptyMsg);
            return;
        }

        const isUser = !!this.userModules[groupName];

        filtered.forEach(moduleName => {
            modulesContainer.appendChild(this._createModuleRow(moduleName, isUser));
        });
    }

    _createModuleRow(moduleName, isUser = false) {
        const item = document.createElement('div');
        item.className = 'module-item';
        item.style.cssText = `
            padding: 4px 8px 4px 12px;
            font-size: 11px;
            color: #ccc;
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            min-height: 24px;
        `;

        const label = document.createElement('span');
        label.textContent = isUser ? '★ ' + moduleName : moduleName;
        label.style.cssText = 'flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

        item.appendChild(label);

        if (IS_DEV) {
            // ⚙️ DEV: цветная точка статуса, без звёзд
            item.appendChild(this._createStatusDot(moduleName));
        } else {
            // 🚀 BUILD: звёзды рейтинга (как раньше)
            item.appendChild(this._createStars(moduleName));
        }

        item.onmouseenter = () => { item.style.background = '#2a2a2a'; };
        item.onmouseleave = () => { item.style.background = 'transparent'; };
        item.onclick = (e) => {
            // в BUILD звёзды кликабельны — не выбираем модуль при клике по ним
            if (!IS_DEV && e.target.closest('.rating-stars')) return;
            this.handleModuleSelect(moduleName);
        };

        return item;
    }


    _createStars(moduleName) {
        const wrap = document.createElement('span');
        wrap.className = 'rating-stars';
        wrap.dataset.module = moduleName;
        wrap.style.cssText = `
            display: inline-flex;
            gap: 1px;
            flex: 0 0 auto;
            cursor: pointer;
            user-select: none;
            font-size: 12px;
            line-height: 1;
        `;

        const current = this._getRating(moduleName);

        for (let i = 1; i <= 3; i++) {
            const star = document.createElement('span');
            star.dataset.value = String(i);
            star.textContent = i <= current ? '★' : '☆';
            star.style.cssText = `color: ${i <= current ? '#ffcc44' : '#555'};`;

            star.onmouseenter = () => this._previewStars(wrap, i);
            star.onmouseleave = () => this._renderStars(wrap, this._getRating(moduleName));

            star.onclick = (e) => {
                e.stopPropagation();
                const existing = this._getRating(moduleName);
                // клик на N-й звезде: если уже = N → сброс в 0, иначе = N
                const next = existing === i ? 0 : i;
                this._setRating(moduleName, next);
                this._renderStars(wrap, next);
            };

            wrap.appendChild(star);
        }

        return wrap;
    }

    _renderStars(wrap, value) {
        const stars = wrap.querySelectorAll('span');
        stars.forEach((s, idx) => {
            const n = idx + 1;
            s.textContent = n <= value ? '★' : '☆';
            s.style.color = n <= value ? '#ffcc44' : '#555';
        });
    }

    _previewStars(wrap, upto) {
        const stars = wrap.querySelectorAll('span');
        stars.forEach((s, idx) => {
            const n = idx + 1;
            s.textContent = n <= upto ? '★' : '☆';
            s.style.color = n <= upto ? '#ffcc44' : '#555';
        });
    }

    _getRating(moduleName) {
        const def = this.system?.moduleFactory?.moduleRegistry?.[moduleName];
        return getEffectiveRating(moduleName, def);
    }

    _setRating(moduleName, value) {
        ratingStore.set(moduleName, value);
        // Обновить runtime cache на существующем panel, если есть
        const panels = this.system?.components || [];
        for (const p of panels) {
            if (p.constructor.name === 'Panel' && (p.jsonName === moduleName || p.type === moduleName)) {
                p.rating = value;
            }
        }
        // Если панель ещё не создана — ничего не делаем, при следующем createModule
        // прочитается через getEffectiveRating
    }

    // Вспомогательный метод для загрузки данных модуля
    async fetchModuleData(moduleName) {
        try {
            const data = await moduleStore.load(moduleName);
            if (!data) return null;

            const code = data.code || '';

            // Парсим displayName из кода
            const displayNameMatch = code.match(/displayName:\s*['"]([^'"]+)['"]/);
            const gridHeightMatch = code.match(/gridHeight:\s*(\d+)/);

            return {
                displayName: displayNameMatch ? displayNameMatch[1] : moduleName,
                gridHeight: gridHeightMatch ? parseInt(gridHeightMatch[1]) : 2,
                code: code
            };
        } catch (error) {
            console.warn(`Failed to fetch module data for ${moduleName}:`, error);
            return null;
        }
    }

    updateMenuPosition(mouseX = null, mouseY = null) {
        if (!this.menuElement) return;
        
        const { innerWidth, innerHeight } = window;
        const menuWidth = 500;
        const menuHeight = 400;
        
        let left, top;
        
        if (mouseX !== null && mouseY !== null) {
            // Позиционируем рядом с курсором, но с проверкой границ
            left = mouseX + 10;
            top = mouseY + 10;
            
            // Проверяем, чтобы не вылезало за экран справа
            if (left + menuWidth > innerWidth) {
                left = mouseX - menuWidth - 10;
            }
            
            // Проверяем, чтобы не вылезало за экран снизу
            if (top + menuHeight > innerHeight) {
                top = mouseY - menuHeight - 10;
            }
            
            // Проверяем границы слева и сверху
            if (left < 10) left = 10;
            if (top < 10) top = 10;
        } else {
            // Центрируем если нет координат мыши
            left = (innerWidth - menuWidth) / 2;
            top = (innerHeight - menuHeight) / 2;
        }
        
        this.menuElement.style.left = `${left}px`;
        this.menuElement.style.top = `${top}px`;
    }
   
    createPatchSection() {
        const section = document.createElement('div');
        section.style.cssText = `
            border-bottom: 1px solid #333;
            padding: 8px 0;
        `;
        
        const patchItems = [
            { text: '📂 Load patch', action: 'load-patch' },
            { text: '💾 Save patch', action: 'save-patch' },
            { text: '📄 Save patch as...', action: 'save-patch-as' },
            { text: '🆕 New patch', action: 'new-patch' }
        ];
        
        patchItems.forEach(item => {
            const button = document.createElement('button');
            button.textContent = item.text;
            button.style.cssText = `
                width: 100%;
                padding: 10px 16px;
                background: transparent;
                border: none;
                color: #ddd;
                text-align: left;
                cursor: pointer;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            button.onmouseenter = () => {
                button.style.background = '#2a2a2a';
            };
            button.onmouseleave = () => {
                button.style.background = 'transparent';
            };
            
            button.onclick = () => this.handlePatchAction(item.action);
            
            section.appendChild(button);
        });
        
        return section;
    }

    createCompactPatchSection() {
        const section = document.createElement('div');
        section.style.cssText = `
            background: #252525;
            border-bottom: 1px solid #333;
            padding: 0;
        `;
        
        const patchItems = [
            { text: 'Load', action: 'load-patch' },
            { text: 'Save', action: 'save-patch' },
            { text: 'Save As', action: 'save-patch-as' },
            { text: 'New', action: 'new-patch' },
            { text: '+ Sticker', action: 'add-sticker' },      // ⭐ NEW
            { text: 'To CSD', action: 'export-csd' },
            { text: 'Editor', action: 'open-editor' },
            { text: 'About', action: 'about' }  
        ];
        
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            font-size: 11px;
            color: #888;
            padding: 4px 12px;
        `;
        
        patchItems.forEach((item, index) => {
            const button = document.createElement('button');
            button.textContent = item.text;
            button.title = item.action.replace('-', ' ') + ' patch';
            button.style.cssText = `
                background: transparent;
                border: none;
                color: #aaa;
                cursor: pointer;
                font-size: 11px;
                padding: 2px 8px;
                margin-right: 12px;
                border-radius: 2px;
            `;
            
            button.onmouseenter = () => {
                button.style.background = '#333';
                button.style.color = '#fff';
            };
            button.onmouseleave = () => {
                button.style.background = 'transparent';
                button.style.color = '#aaa';
            };
            
            button.onclick = (e) => {
                e.stopPropagation();
                this.handlePatchAction(item.action);
            };
            
            container.appendChild(button);
        });
        
        section.appendChild(container);
        return section;
    }
    
    createModuleGroups() {
        //console.log('Creating module groups...');
        //console.log('this.moduleGroups:', this.moduleGroups);
        //console.log('Menu element exists:', !!this.menuElement);
        
        if (!this.menuElement) {
            console.error('Menu element not created yet!');
            return;
        }
        
        const container = this.menuElement.querySelector('#groups-container');
        //console.log('Container found:', !!container);
        
        if (!container) {
            console.error('Groups container not found!');
            return;
        }
        
        container.innerHTML = '';
        
        Object.entries(this.moduleGroups).forEach(([groupName, modules]) => {
            const groupElement = this.createGroupElement(groupName, modules);
            container.appendChild(groupElement);
        });
    }
    
    createGroupElement(groupName, modules) {
        const group = document.createElement('div');
        group.className = 'module-group';
        group.style.cssText = `
            margin: 8px 0;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #333;
        `;
        
        // Заголовок группы
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: #2a2a2a;
            color: #0af;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        header.innerHTML = `
            <span>${groupName}</span>
            <span class="group-arrow">▼</span>
        `;
        
        // Контейнер для модулей (изначально скрыт)
        const modulesContainer = document.createElement('div');
        modulesContainer.className = 'modules-container';
        modulesContainer.style.cssText = `
            display: none;
            background: #252525;
        `;
        
        // Добавляем модули в группу
        modules.forEach(moduleName => {
            const moduleButton = this.createModuleButton(moduleName, groupName);
            modulesContainer.appendChild(moduleButton);
        });
        
        // Переключение видимости при клике на заголовок
        header.onclick = () => {
            const isVisible = modulesContainer.style.display !== 'none';
            modulesContainer.style.display = isVisible ? 'none' : 'block';
            header.querySelector('.group-arrow').textContent = isVisible ? '▼' : '▲';
        };
        
        // Открываем при поиске
        this.searchInput.addEventListener('input', () => {
            const searchTerm = this.searchInput.value.toLowerCase();
            if (searchTerm && modules.some(m => m.toLowerCase().includes(searchTerm))) {
                modulesContainer.style.display = 'block';
                header.querySelector('.group-arrow').textContent = '▲';
            }
        });
        
        group.appendChild(header);
        group.appendChild(modulesContainer);
        
        return group;
    }

    createGroupList(container) {
        container.innerHTML = '';
        
        if (!this.moduleGroups) return;
        
        Object.keys(this.moduleGroups).forEach((groupName, index) => {
            const groupItem = document.createElement('div');
            groupItem.className = 'group-item';
            groupItem.dataset.group = groupName;
            groupItem.style.cssText = `
                padding: 6px 12px;
                font-size: 11px;
                color: #aaa;
                cursor: pointer;
                user-select: none;
                border-left: 2px solid transparent;
            `;
            
            groupItem.textContent = groupName;
            
            // При наведении - показываем модули этой группы
            groupItem.onmouseenter = () => {
                // Подсветка активной группы
                document.querySelectorAll('.group-item').forEach(item => {
                    item.style.background = 'transparent';
                    item.style.borderLeftColor = 'transparent';
                    item.style.color = '#aaa';
                });
                
                groupItem.style.background = '#2a2a2a';
                groupItem.style.borderLeftColor = '#0af';
                groupItem.style.color = '#fff';
                
                // Показываем модули этой группы в правой панели
                this.showModulesForGroup(groupName);
            };
            
            // При клике - выбираем группу
            groupItem.onclick = () => {
                this.showModulesForGroup(groupName);
            };
            
            container.appendChild(groupItem);
        });
        
        // Выбираем первую группу по умолчанию
        const firstGroup = Object.keys(this.moduleGroups)[0];
        if (firstGroup) {
            setTimeout(() => {
                const firstItem = container.querySelector('.group-item');
                if (firstItem) {
                    firstItem.style.background = '#2a2a2a';
                    firstItem.style.borderLeftColor = '#0af';
                    firstItem.style.color = '#fff';
                    this.showModulesForGroup(firstGroup);
                }
            }, 10);
        }
    }

    createModuleButton(moduleName, groupName) {
        const button = document.createElement('button');
        button.textContent = moduleName;
        button.style.cssText = `
            width: 100%;
            padding: 8px 16px;
            background: transparent;
            border: none;
            color: #ddd;
            text-align: left;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid #333;
        `;
        
        // Иконка для модуля (можно заменить на более подходящие)
        const iconMap = {
            'In/Out': '🔌',
            'Note': '🎹',
            'Osc': '🎵',
            'LFO': '📈',
            'Env': '📊',
            'Shaper': '🔧',
            'Filter': '🎛️',
            'Mixer': '🎚️',
            'Switch': '🔀',
            'Level': '📶',
            'Logic': '🧠',
            'Seq': '🎲',
            'FX': '🎛️',
            'Delay': '⏱️'
        };
        
        button.innerHTML = `${iconMap[groupName] || '📦'} ${moduleName}`;
        
        button.onmouseenter = () => {
            button.style.background = '#2a2a2a';
        };
        button.onmouseleave = () => {
            button.style.background = 'transparent';
        };
        
        button.onclick = () => {
            this.handleModuleSelect(moduleName);
            this.hide();
        };
        
        return button;
    }


    // Метод для добавления пользовательского модуля (будет использоваться позже)
    addUserModule(moduleName, category = 'My Modules') {
        if (!this.userModules[category]) {
            this.userModules[category] = [];
        }
        
        if (!this.userModules[category].includes(moduleName)) {
            this.userModules[category].push(moduleName);
            this.allModules[moduleName] = category;
            
            // Обновляем интерфейс
            this.updateMenuUI();
            
            //console.log(`✅ User module added: ${moduleName} -> ${category}`);
            return true;
        }
        return false;
    }
    
    setupEventListeners() {
        // Запоминаем позицию мыши для открытия меню рядом с курсором
        let lastMouseX = window.innerWidth / 2;
        let lastMouseY = window.innerHeight / 2;
        
        // Обновляем позицию мыши при движении
        document.addEventListener('mousemove', (e) => {
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });
        
        // Клавиша Space для открытия меню
        document.addEventListener('keydown', (e) => {
            // Пропускаем если в поле ввода
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // 🚫 НЕ открываем, если мышь над CSoundWindow
            const csoundWindow = document.getElementById('csound-window');
            if (csoundWindow && csoundWindow.style.display === 'block') {
                const rect = csoundWindow.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    console.log('🚫 Mouse over CSoundWindow - context menu blocked');
                    return;
                }
            }
            
            if (e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar') {
                e.preventDefault();
                
                // Вместо прямого вызова show() - используем интеллектуальное открытие
                if (this.system && this.system.openContextMenuAtMousePosition) {
                    this.system.openContextMenuAtMousePosition();
                } else {
                    // Fallback
                    this.show();
                }
            }
            
            // Escape для закрытия
            if (e.key === 'Escape' && this.isVisible) {
                e.preventDefault();
                this.hide();
            }
            
            // Tab для навигации по группам (опционально)
            if (e.key === 'Tab' && this.isVisible) {
                e.preventDefault();
                this.navigateGroups(e.shiftKey ? -1 : 1);
            }
        });
        
        // Клик вне меню для закрытия
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.menuElement.contains(e.target)) {
                this.hide();
            }
        });
        
        // Обновляем позицию меню при изменении размера окна
        window.addEventListener('resize', () => {
            if (this.isVisible) {
                this.updateMenuPosition();
            }
        });
        
        // Проверяем что searchInput существует
        if (this.searchInput) {
            // Поиск при вводе (новая логика)
            this.searchInput.addEventListener('input', () => {
                const searchTerm = this.searchInput.value;
                
                if (searchTerm.trim() === '') {
                    // Пусто — вернуть активную группу
                    const activeGroup = this.menuElement.querySelector('.group-item[style*="border-left-color"]');
                    if (activeGroup) {
                        this.showModulesForGroup(activeGroup.dataset.group);
                    } else {
                        const firstGroup = Object.keys(this.moduleGroups)[0];
                        if (firstGroup) {
                            this.showModulesForGroup(firstGroup);
                        }
                    }
                } else {
                    // ⭐ Ищем по всем модулям
                    this.searchAllModules(searchTerm);
                }
            });
            
            // Enter для выбора первого модуля в списке
            this.searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.selectFirstModule();
                }
                
                // Стрелки для навигации по модулям
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    this.navigateModules(e.key === 'ArrowDown' ? 1 : -1);
                }
            });
        }
        
        // Навигация по меню с клавиатуры
        document.addEventListener('keydown', (e) => {
            if (!this.isVisible) return;
            
            // Стрелки влево/вправо для переключения групп
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                this.navigateGroups(e.key === 'ArrowRight' ? 1 : -1);
            }
        });
    }

    // Добавляем вспомогательные методы для навигации

    canvasToScreen(canvasX, canvasY) {
        const rect = this.system.canvas.getBoundingClientRect();
        return {
            x: rect.left + canvasX,
            y: rect.top + canvasY
        };
    }

    navigateGroups(direction) {
        const leftPanel = this.menuElement.querySelector('#left-panel');
        if (!leftPanel) return;
        
        const groups = Array.from(leftPanel.querySelectorAll('.group-item'));
        if (groups.length === 0) return;
        
        // Находим текущую активную группу
        let currentIndex = groups.findIndex(group => 
            group.style.borderLeftColor === 'rgb(0, 170, 255)' || 
            group.style.borderLeftColor === '#0af'
        );
        
        if (currentIndex === -1) currentIndex = 0;
        
        // Вычисляем новую позицию
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = groups.length - 1;
        if (newIndex >= groups.length) newIndex = 0;
        
        // Активируем новую группу
        const newGroup = groups[newIndex];
        const groupName = newGroup.dataset.group;
        
        // Снимаем выделение со всех групп
        groups.forEach(group => {
            group.style.background = 'transparent';
            group.style.borderLeftColor = 'transparent';
            group.style.color = '#aaa';
        });
        
        // Выделяем новую группу
        newGroup.style.background = '#2a2a2a';
        newGroup.style.borderLeftColor = '#0af';
        newGroup.style.color = '#fff';
        
        // Показываем модули этой группы
        this.showModulesForGroup(groupName);
        
        // Фокус на поле поиска
        if (this.searchInput) {
            this.searchInput.focus();
        }
    }

    navigateModules(direction) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        
        const modules = Array.from(modulesContainer.querySelectorAll('.module-item'));
        if (modules.length === 0) return;
        
        // Находим текущий активный модуль
        let currentIndex = modules.findIndex(module => 
            module.style.background === 'rgb(42, 42, 42)' ||
            module.style.background === '#2a2a2a'
        );
        
        if (currentIndex === -1) currentIndex = 0;
        
        // Вычисляем новую позицию
        let newIndex = currentIndex + direction;
        if (newIndex < 0) newIndex = modules.length - 1;
        if (newIndex >= modules.length) newIndex = 0;
        
        // Убираем выделение со всех модулей
        modules.forEach(module => {
            module.style.background = 'transparent';
        });
        
        // Выделяем новый модуль
        const newModule = modules[newIndex];
        newModule.style.background = '#2a2a2a';
        
        // Скроллим к модулю если нужно
        newModule.scrollIntoView({ block: 'nearest' });
    }

    selectFirstModule() {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        
        const firstModule = modulesContainer.querySelector('.module-item');
        if (firstModule) {
            const moduleName = firstModule.textContent;
            this.handleModuleSelect(moduleName);
            this.hide();
        }
    }
    
    updateUserGroupsInLeftPanel() {
        const leftPanel = this.menuElement.querySelector('#left-panel');
        if (!leftPanel) {
            console.warn('⚠️ Left panel not found');
            return;
        }

        let userCont = leftPanel.querySelector('.user-groups');
        
        if (!userCont) {
            const divider = leftPanel.querySelector('div[style*="height: 1px;"]');
            userCont = document.createElement('div');
            userCont.className = 'level-groups user-groups';
            userCont.style.cssText = 'padding-left: 8px; display: block;';
            if (divider) {
                divider.parentNode.insertBefore(userCont, divider.nextSibling);
            } else {
                leftPanel.appendChild(userCont);
            }
        }
        
        userCont.innerHTML = '';
        
        // Берём модули
        const modules = this.userModules?.['My Modules'] || [];
        const realModules = modules.filter(m => 
            m !== '(No user modules)' && 
            m !== '(Error loading)' && 
            m !== 'Loading...'
        );
        
        if (realModules.length === 0) {
            const emptyItem = document.createElement('div');
            emptyItem.className = 'group-item';
            emptyItem.dataset.group = 'My Modules';
            emptyItem.dataset.level = 'user';
            emptyItem.style.cssText = `
                padding: 4px 12px;
                font-size: 11px;
                color: #555;
                cursor: default;
                user-select: none;
                border-left: 2px solid transparent;
                margin: 1px 0;
                border-radius: 0 3px 3px 0;
                font-style: italic;
            `;
            emptyItem.textContent = '👤 No user modules available';
            userCont.appendChild(emptyItem);
            return;
        }
        
        // Заголовок
        const groupHeader = document.createElement('div');
        groupHeader.className = 'group-item';
        groupHeader.dataset.group = 'My Modules';
        groupHeader.dataset.level = 'user';
        groupHeader.style.cssText = `
            padding: 4px 12px;
            font-size: 11px;
            color: #0af;
            cursor: pointer;
            user-select: none;
            border-left: 2px solid #0af;
            margin: 1px 0;
            border-radius: 0 3px 3px 0;
            background: #2a2a2a;
        `;
        groupHeader.textContent = `👤 My Modules (${realModules.length})`;
        userCont.appendChild(groupHeader);
        
        // Модули
        const menu = this;
        realModules.forEach(moduleName => {
            const moduleItem = document.createElement('div');
            moduleItem.className = 'module-item';
            moduleItem.style.cssText = `
                padding: 3px 12px 3px 24px;
                font-size: 10px;
                color: #aaa;
                cursor: pointer;
                user-select: none;
                border-left: 2px solid transparent;
                margin: 0;
                border-radius: 0;
            `;
            moduleItem.textContent = '📦 ' + moduleName;
            
            moduleItem.onmouseenter = () => {
                moduleItem.style.background = '#2a2a2a';
                moduleItem.style.color = '#fff';
            };
            moduleItem.onmouseleave = () => {
                moduleItem.style.background = 'transparent';
                moduleItem.style.color = '#aaa';
            };
            moduleItem.onclick = (e) => {
                e.stopPropagation();
                menu.handleModuleSelect(moduleName);
            };
            userCont.appendChild(moduleItem);
        });
        
        // Открываем User
        userCont.style.display = 'block';
        const userHeader = leftPanel.querySelector('.level-header[data-level="user"]');
        if (userHeader) {
            const arrow = userHeader.querySelector('.level-arrow');
            if (arrow) arrow.textContent = '▼';
        }
        
        //console.log(`✅ User groups updated with ${realModules.length} modules`);
    }

    async loadUserModules() {
        try {
            //console.log('📂 Loading user modules...');

            const modules = await moduleStore.list();
            //console.log(`📦 Found ${modules.length} user modules:`, modules);

            // Очищаем существующие пользовательские модули
            this.userModules = {
                'My Modules': []
            };

            if (modules.length === 0) {
                this.userModules['My Modules'] = ['(No user modules)'];
                this.updateUserGroupsInLeftPanel();
                return;
            }

            // Добавляем каждый модуль
            for (const moduleName of modules) {
                this.userModules['My Modules'].push(moduleName);
                if (!this._userModuleMap) {
                    this._userModuleMap = {};
                }
                this._userModuleMap[moduleName] = moduleName;
            }

            // Обновляем allModules
            Object.entries(this.userModules).forEach(([group, mods]) => {
                mods.forEach(module => {
                    this.allModules[module] = group;
                });
            });

            this.updateUserGroupsInLeftPanel();
            this.updateMenuUI();

        } catch (error) {
            console.error('❌ Error loading user modules:', error);
            this.userModules = {
                'My Modules': ['(Error loading)']
            };
            this.updateUserGroupsInLeftPanel();
            this.updateMenuUI();
        }
    }

    async show(mouseX = null, mouseY = null) {
        // ⭐ в DEV — preload статусов один раз (для правильных цветов)
        //    в BUILD — preload не нужен (точек нет, только звёзды)
        if (IS_DEV && !this._statusesLoaded) {
            this._statusesLoaded = true;
            // показываем меню сразу, а preload — в фоне
            this._showImmediate(mouseX, mouseY);
            await this.preloadStatuses();
            if (this.isVisible) this.updateMenuUI();
            return;
        }

        this._showImmediate(mouseX, mouseY);
    }

    async preloadStatuses() {
        if (!IS_DEV) return;
        const allNames = [...new Set(Object.values(this.nm2Modules).flat())];
        let loaded = 0, failed = 0;
        for (const name of allNames) {
            if (this.system.moduleFactory.moduleRegistry[name]) continue;
            try {
                const mod = await import(/* @vite-ignore */ `/modules/${name}.js`);
                const key = Object.keys(mod)[0];
                if (mod[key]) {
                    this.system.moduleFactory.registerModule(name, mod[key]);
                    loaded++;
                }
            } catch (e) { failed++; }
        }
        console.log(`[ContextMenu/DEV] preloaded ${loaded}, failed ${failed}`);
    }


    _showImmediate(mouseX = null, mouseY = null) {
        // ⭐ это твой текущий show() БЕЗ preload
        if (this.isVisible) return;

        if (this.system.jackContextMenu && this.system.jackContextMenu.menuElement.style.display === 'block') {
            this.system.jackContextMenu.hide();
        }

        this.lastOpenMouseX = mouseX;
        this.lastOpenMouseY = mouseY;

        this.updateMenuPosition(mouseX, mouseY);

        this.menuElement.style.opacity = '1';
        this.menuElement.style.transform = 'scale(1)';
        this.menuElement.style.visibility = 'visible';

        this.isVisible = true;

        if (this.searchInput) {
            this.searchInput.value = '';
            setTimeout(() => { this.searchInput.focus(); }, 50);

            const firstGroup = Object.keys(this.moduleGroups)[0];
            if (firstGroup) {
                const leftPanel = this.menuElement.querySelector('#left-panel');
                if (leftPanel) {
                    leftPanel.querySelectorAll('.group-item').forEach(item => {
                        item.style.background = 'transparent';
                        item.style.borderLeftColor = 'transparent';
                        item.style.color = '#aaa';
                    });
                    const firstItem = leftPanel.querySelector('.group-item');
                    if (firstItem) {
                        firstItem.style.background = '#2a2a2a';
                        firstItem.style.borderLeftColor = '#0af';
                        firstItem.style.color = '#fff';
                        this.showModulesForGroup(firstGroup);
                    }
                }
            }
        }
    }

    hide() {
        if (!this.isVisible) return;
        
        // Плавно скрываем
        this.menuElement.style.opacity = '0';
        this.menuElement.style.transform = 'scale(0.95)';
        
        // После анимации скрываем полностью
        setTimeout(() => {
            this.menuElement.style.visibility = 'hidden';
            this.isVisible = false;
            
            // Сбрасываем поиск
            if (this.searchInput) {
                this.searchInput.value = '';
            }
        }, 100); // Должно совпадать с duration анимации
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    handleModuleSelect(moduleName) {
        let targetLayer = 'voice';
        let targetGridX = 0;
        let targetGridY = 0;

        // Конвертируем экранные координаты мыши в grid-координаты
        if (this.lastOpenMouseX !== null && this.lastOpenMouseY !== null) {
            const canvas = this.system.canvas;
            const rect = canvas.getBoundingClientRect();

            if (
                this.lastOpenMouseX >= rect.left &&
                this.lastOpenMouseX <= rect.right &&
                this.lastOpenMouseY >= rect.top &&
                this.lastOpenMouseY <= rect.bottom
            ) {
                const dpr = window.devicePixelRatio || 1;
                // CSS-пиксели canvas
                const canvasX = (this.lastOpenMouseX - rect.left) * (canvas.width / rect.width) / dpr;
                const canvasY = (this.lastOpenMouseY - rect.top) * (canvas.height / rect.height) / dpr;

                // Мировые координаты
                const worldX = (canvasX - this.system.offsetX) / this.system.scale;
                const worldY = (canvasY - this.system.offsetY) / this.system.scale;

                targetLayer = this.system.layerManager.getLayerAtPoint(worldX, worldY);

                // Snap к сетке
                const snapped = this.system.grid.snapToGrid(worldX, worldY);
                targetGridX = Math.max(0, snapped.gridX);
                targetGridY = Math.max(0, snapped.gridY);
            }
        }

        // ⭐ addNewModuleAtPosition сам разрулит коллизии и найдёт свободное место
        if (this.system?.addNewModuleAtPosition) {
            this.system.addNewModuleAtPosition(moduleName, targetLayer, targetGridX, targetGridY);
        } else if (this.system?.addNewModule) {
            this.system.addNewModule(moduleName, targetLayer, targetGridX, targetGridY);
        }

        this.hide();
    }
    
    handlePatchAction(action) {
        
        switch(action) {
            case 'load-patch':
                if (this.system && this.system.loadJsonPatch) {
                    // Добавляем задержку для отслеживания
                    setTimeout(async () => {
                        try {
                            const result = await this.system.loadJsonPatch();
                        } catch (error) {
                            console.error('💥 loadJsonPatch error:', error);
                        }
                    }, 100);
                } else {
                    console.error('❌ system.loadJsonPatch not available!');
                }
                break;
                
            case 'save-patch':
                if (this.system && this.system.exportPatch) {
                    this.system.exportPatch();
                }
                break;
                
            case 'save-patch-as':
                if (this.system && this.system.savePatchAs) {
                    this.system.savePatchAs();
                }
                break;
                
            case 'new-patch':
                if (this.system && this.system.resetEverything) {
                    this.system.resetEverything();
                }
                break;

            case 'export-csd': 
                if (this.system && this.system.csoundGen) {
                    this.system.exportCsd();
                } else {
                    console.error('❌ csoundGen not available!');
                }
                break;

            case 'add-sticker': {
                // Позиция — там, где последний раз открывалось меню,
                // иначе — в центре видимой области
                let worldX, worldY;
                if (this.lastOpenMouseX !== null && this.lastOpenMouseY !== null) {
                    const rect = this.system.canvas.getBoundingClientRect();
                    const canvasX = this.lastOpenMouseX - rect.left;
                    const canvasY = this.lastOpenMouseY - rect.top;
                    const world = this.system.eventManager.getWorldPosition(canvasX, canvasY);
                    worldX = world.x;
                    worldY = world.y;
                } else {
                    worldX = (window.innerWidth / 2 - this.system.offsetX) / this.system.scale;
                    worldY = (window.innerHeight / 2 - this.system.offsetY) / this.system.scale;
                }
                const sticker = this.system.addStickerAtPosition(worldX, worldY, {
                    text: 'New sticker',
                    gridW: 8,
                    gridH: 2,
                });
                if (sticker) this.system.selectSticker(sticker);
                break;
            }

            case 'open-editor': // ← НОВЫЙ КЕЙС
                this.openModuleEditor();
                break;

            case 'about': 
                this.showAboutDialog();
                break;

        }
        
        this.hide();
    }

    injectStyles() {
        if (document.getElementById('context-menu-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'context-menu-styles';
        style.textContent = `
            /* Убираем старую анимацию */
            
            /* Скроллбар */
            #left-panel::-webkit-scrollbar,
            #modules-container::-webkit-scrollbar {
                width: 6px;
            }
            
            #left-panel::-webkit-scrollbar-track,
            #modules-container::-webkit-scrollbar-track {
                background: #222;
            }
            
            #left-panel::-webkit-scrollbar-thumb,
            #modules-container::-webkit-scrollbar-thumb {
                background: #444;
                border-radius: 3px;
            }
            
            #left-panel::-webkit-scrollbar-thumb:hover,
            #modules-container::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
            
            /* Эффекты при наведении */
            .group-item:hover {
                background: #2a2a2a !important;
                color: #fff !important;
            }
            
            .module-item:hover {
                background: #2a2a2a !important;
            }
            
            /* Активный элемент */
            .module-item:active {
                background: #0af !important;
                color: white !important;
            }
            
            /* Фокус на поле поиска */
            #context-menu input:focus {
                border-color: #0af !important;
                box-shadow: 0 0 0 1px rgba(0, 170, 255, 0.2);
            }
            
            /* Предотвращаем выделение текста */
            .group-item, .module-item {
                user-select: none;
            }
        `;
        
        document.head.appendChild(style);
    }

    async openModuleEditor() {
        const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

        if (isTauri) {
            try {
                const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

                // Если окно редактора уже открыто — фокусируемся на нём
                const existing = await WebviewWindow.getByLabel('editor');
                if (existing) {
                    await existing.setFocus();
                    return;
                }

                const editorWindow = new WebviewWindow('editor', {
                    url: '/editor/editor.html',
                    title: 'CsModular — Module Editor',
                    width: 1400,
                    height: 900,
                    resizable: true,
                    center: true,
                });

                editorWindow.once('tauri://created', () => {
                    console.log('✅ Editor window created');
                });

                editorWindow.once('tauri://error', (e) => {
                    console.error('❌ Editor window error:', e);
                });
            } catch (error) {
                console.error('Failed to open editor window:', error);
            }
        } else {
            // В браузере — обычное новое окно
            window.open('/editor/editor.html', '_blank');
        }
    }


    showAboutDialog() {
        // Создаем простой диалог
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
            backdrop-filter: blur(4px);
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #0af;
            border-radius: 12px;
            padding: 40px 50px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.8);
        `;
        
        dialog.innerHTML = `
            <h1 style="color: #0af; font-size: 28px; margin: 0 0 10px 0; letter-spacing: 2px;">
                CsModular
            </h1>
            <div style="color: #666; font-size: 14px; margin-bottom: 20px;">
                — Csound Web Inside —
            </div>
            <div style="color: #aaa; font-size: 13px; line-height: 1.6; margin-bottom: 30px;">
                Modular synthesizer environment<br>
            </div>
            <div style="color: #555; font-size: 11px; border-top: 1px solid #333; padding-top: 20px; margin-bottom: 20px;">
                © 2026 Gleb Rogozinski
            </div>
            <button id="about-close-btn" style="
                background: #0af;
                color: #fff;
                border: none;
                padding: 8px 30px;
                border-radius: 6px;
                font-size: 14px;
                cursor: pointer;
                transition: background 0.2s;
            ">
                Close
            </button>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Закрытие по клику на кнопку или overlay
        const closeBtn = dialog.querySelector('#about-close-btn');
        
        const closeDialog = () => {
            overlay.remove();
        };
        
        closeBtn.onclick = closeDialog;
        overlay.onclick = (e) => {
            if (e.target === overlay) closeDialog();
        };
        
        // Закрытие по Escape
        const onKeydown = (e) => {
            if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', onKeydown);
            }
        };
        document.addEventListener('keydown', onKeydown);
    }

    // Обновление UI после добавления модуля
    updateMenuUI() {
        // Обновляем левую панель
        const leftPanel = this.menuElement.querySelector('#left-panel');
        if (leftPanel) {
            this.createHierarchicalGroupList(leftPanel);
        }
        
        // Обновляем правую панель (если есть активная группа)
        const activeGroup = this.menuElement.querySelector('.group-item[style*="border-left-color"]');
        if (activeGroup) {
            const groupName = activeGroup.dataset.group;
            this.showModulesForGroup(groupName);
        }
    }

}