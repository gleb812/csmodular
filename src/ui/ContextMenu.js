// src/ui/ContextMenu.js
import { libraryStore } from '../api/index.js';
import { PANEL_GRID_WIDTH } from '../constants.js';
import { ratingStore, getEffectiveRating } from '../api/moduleRatingStore.js';
import { getModuleStatus, getStatusMeta, IS_DEV } from '../api/moduleStatusStore.js';
import { Panel } from '../components/Panel.js';
import { CATEGORIES, isValidCategory } from '../moduleCategories.js';

export class ContextMenu {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.menuElement = null;
        this.searchInput = null;
        this.lastOpenMouseY = null;
        this._isLoaded = false;
        
        window.contextMenu = this;

        this.initModuleStructure();
        this.createMenuElement();
        this.setupEventListeners();
        this.injectStyles();

        this.refreshLibraryGroups().then(() => {
            this._isLoaded = true;
        }).catch(e => console.warn('[ContextMenu] refreshLibraryGroups failed:', e));
    }

    initModuleStructure() {
        // Группы заполняются асинхронно из libraryStore (см. refreshLibraryGroups).
        this.libraryGroups = {};    // { libName: [{name, description}, ...] }
        this.allModules = {};       // name → libName (для поиска)
        this._groupListEl = null;   // ссылка на контейнер левой панели
    }

    async refreshLibraryGroups() {
        const libraries = await libraryStore.listLibraries();
        const groups = {};

        for (const entry of libraries) {
            try {
                const mods = await libraryStore.listModules(entry.name);
                if (mods.length > 0) {
                    const byCategory = {};
                    for (const m of mods) {
                        const cat = isValidCategory(m.category) ? m.category : 'other';
                        (byCategory[cat] ||= []).push(m);
                    }
                    groups[entry.name] = {
                        source: entry.source,
                        modules: mods,
                        byCategory,
                    };
                    for (const m of mods) {
                        this.allModules[m.name] = entry.name;
                    }
                }
            } catch (e) {
                console.warn(`[ContextMenu] listModules(${entry.name}) failed:`, e);
            }
        }

        this.libraryGroups = groups;
        this._renderGroupList();
        this._renderCategoryFilterBar();   // ⭐ обновить чипсы
    }

    createCategoryFilterBar() {
        this._categoryFilterBar = document.createElement('div');
        this._categoryFilterBar.id = 'category-filter-bar';
        this._categoryFilterBar.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            padding: 6px 12px;
            background: #252525;
            border-bottom: 1px solid #333;
            flex-shrink: 0;
        `;
        return this._categoryFilterBar;
    }

    _renderCategoryFilterBar() {
        const bar = this._categoryFilterBar;
        if (!bar) return;
        bar.innerHTML = '';

        const presentCats = new Set();
        for (const entry of Object.values(this.libraryGroups)) {
            for (const c of Object.keys(entry.byCategory)) presentCats.add(c);
        }

        const chips = ['all', ...[...CATEGORIES, 'other'].filter(c => presentCats.has(c))];

        for (const cat of chips) {
            const chip = document.createElement('button');
            chip.dataset.category = cat;
            chip.textContent = cat === 'all' ? 'All' : (cat === 'other' ? 'Other' : cat);
            chip.style.cssText = `
                padding: 2px 8px;
                background: transparent;
                border: 1px solid #333;
                border-radius: 10px;
                color: #888;
                cursor: pointer;
                font-size: 10px;
                font-family: inherit;
            `;
            chip.onmouseenter = () => { chip.style.background = '#333'; chip.style.color = '#fff'; };
            chip.onmouseleave = () => { chip.style.background = 'transparent'; chip.style.color = '#888'; };
            chip.onclick = () => this._applyGlobalCategoryFilter(cat);
            bar.appendChild(chip);
        }
        this._syncCategoryChips('all');
    }

    _applyGlobalCategoryFilter(cat) {
        // Сброс подсветки дерева
        this.menuElement.querySelectorAll('.group-item, .category-item').forEach(el => {
            el.style.background = 'transparent';
            el.style.borderLeftColor = 'transparent';
            el.style.color = el.classList.contains('category-item') ? '#888' : '#aaa';
        });

        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        modulesContainer.innerHTML = '';

        this._syncCategoryChips(cat);

        if (cat === 'all') {
            // Показать всё
            this._showAllModulesFromAllLibs();
            return;
        }

        // Собрать модули по категории из ВСЕХ библиотек
        const results = [];
        for (const [libName, entry] of Object.entries(this.libraryGroups)) {
            const mods = entry.byCategory[cat] || [];
            for (const m of mods) results.push({ m, libName });
        }

        if (results.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding:20px;text-align:center;color:#666;font-size:11px;font-style:italic;';
            msg.textContent = `No modules in category "${cat}"`;
            modulesContainer.appendChild(msg);
            return;
        }

        const header = document.createElement('div');
        header.style.cssText = 'padding:6px 12px;font-size:10px;color:#666;border-bottom:1px solid #333;margin-bottom:4px;';
        header.textContent = `Category: ${cat} — ${results.length} module(s)`;
        modulesContainer.appendChild(header);

        for (const { m, libName } of results) {
            const row = this._createModuleRow(m, libName);
            const chip = document.createElement('span');
            chip.textContent = libName;
            chip.style.cssText = 'font-size:9px;color:#555;font-style:italic;margin-right:6px;flex:0 0 auto;';
            const stars = row.querySelector('.rating-stars');
            if (stars) row.insertBefore(chip, stars);
            else row.appendChild(chip);
            modulesContainer.appendChild(row);
        }
    }

    _showAllModulesFromAllLibs() {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        modulesContainer.innerHTML = '';

        const results = [];
        for (const [libName, entry] of Object.entries(this.libraryGroups)) {
            for (const m of entry.modules) results.push({ m, libName });
        }

        if (results.length === 0) return;

        const header = document.createElement('div');
        header.style.cssText = 'padding:6px 12px;font-size:10px;color:#666;border-bottom:1px solid #333;margin-bottom:4px;';
        header.textContent = `All modules — ${results.length}`;
        modulesContainer.appendChild(header);

        for (const { m, libName } of results) {
            const row = this._createModuleRow(m, libName);
            const chip = document.createElement('span');
            chip.textContent = libName;
            chip.style.cssText = 'font-size:9px;color:#555;font-style:italic;margin-right:6px;flex:0 0 auto;';
            const stars = row.querySelector('.rating-stars');
            if (stars) row.insertBefore(chip, stars);
            else row.appendChild(chip);
            modulesContainer.appendChild(row);
        }
    }

    _renderGroupList() {
        const leftPanel = this.menuElement.querySelector('#left-panel');
        if (!leftPanel) return;
        leftPanel.innerHTML = '';
        this._activeTreeEl = null;   // ⭐ трекинг активного элемента

        const libNames = Object.keys(this.libraryGroups);
        if (libNames.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 12px; color:#555; font-size:11px; font-style:italic;';
            empty.textContent = 'No libraries found';
            leftPanel.appendChild(empty);
            this.showModulesForGroup(null);
            return;
        }

        libNames.forEach((libName, idx) => {
            const entry = this.libraryGroups[libName];
            const icon = entry.source === 'user' ? '👤' : '📦';

            // ── Корень: библиотека
            const root = document.createElement('div');
            root.className = 'group-item';
            root.dataset.group = libName;
            root.style.cssText = `
                padding: 5px 12px;
                font-size: 11px;
                color: #aaa;
                cursor: pointer;
                user-select: none;
                border-left: 2px solid transparent;
                margin: 1px 0;
                border-radius: 0 3px 3px 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            root.innerHTML = `<span>${icon} ${libName}</span><span style="color:#555;font-size:10px;">${entry.modules.length}</span>`;

            root.addEventListener('mouseenter', () => {
                this._setTreeHover(root);
                this.showModulesForGroup(libName);
            });
            root.addEventListener('mouseleave', () => {
                this._clearTreeHover(root);
            });
            root.addEventListener('click', () => {
                this._setTreeActive(root);
                this.showModulesForGroup(libName);
            });

            leftPanel.appendChild(root);

            // ── Категории (скрыты, пока библиотека не раскрыта)
            const catOrder = [...CATEGORIES, 'other'];
            const cats = catOrder.filter(c => entry.byCategory[c]?.length > 0);
            const catEls = [];
            for (const cat of cats) {
                const mods = entry.byCategory[cat];
                const label = cat === 'other' ? 'Other' : cat;

                const catEl = document.createElement('div');
                catEl.className = 'category-item';
                catEl.dataset.group = libName;
                catEl.dataset.category = cat;
                catEl.style.cssText = `
                    padding: 3px 12px 3px 28px;
                    font-size: 10px;
                    color: #888;
                    cursor: pointer;
                    user-select: none;
                    border-left: 2px solid transparent;
                    display: none;   /* ⭐ скрыто по умолчанию */
                    justify-content: space-between;
                    align-items: center;
                `;
                catEl.innerHTML = `
                    <span>${label}</span>
                    <span style="color:#555;">${mods.length}</span>
                `;

                catEl.addEventListener('mouseenter', () => {
                    this._setTreeHover(catEl);
                    this.showModulesForCategory(libName, cat);
                });
                catEl.addEventListener('mouseleave', () => {
                    this._clearTreeHover(catEl);
                });
                catEl.addEventListener('click', () => {
                    this._setTreeActive(catEl);
                    this.showModulesForCategory(libName, cat);
                });

                leftPanel.appendChild(catEl);
                catEls.push(catEl);
            }

            // ⭐ Раскрытие/закрытие категорий — по клику на корень
            //    (плюс шеврон справа, но проще без него)
            root.addEventListener('click', () => {
                const isOpen = catEls.length > 0 && catEls[0].style.display !== 'none';
                if (isOpen) {
                    for (const ce of catEls) ce.style.display = 'none';
                    root.dataset.open = '0';
                } else {
                    for (const ce of catEls) ce.style.display = 'flex';
                    root.dataset.open = '1';
                }
            });

            // Стартовое состояние: первая библиотека раскрыта, остальные свёрнуты
            if (idx === 0) {
                for (const ce of catEls) ce.style.display = 'flex';
                root.dataset.open = '1';
                this._setTreeActive(root);
                this.showModulesForGroup(libName);
            } else {
                root.dataset.open = '0';
            }
        });
    }

    /** Hover: подсветить элемент, НЕ трогая активный */
    _setTreeHover(el) {
        // Если это активный — не трогаем (активный цвет важнее)
        if (el === this._activeTreeEl) return;
        el.style.background = '#252525';
        el.style.color = '#fff';
    }

    /** Убрать hover */
    _clearTreeHover(el) {
        if (el === this._activeTreeEl) return;
        el.style.background = 'transparent';
        el.style.color = el.classList.contains('category-item') ? '#888' : '#aaa';
    }

    /** Сделать элемент активным (снять с предыдущего) */
    _setTreeActive(el) {
        const prev = this._activeTreeEl;
        if (prev && prev !== el) {
            prev.style.background = 'transparent';
            prev.style.borderLeftColor = 'transparent';
            prev.style.color = prev.classList.contains('category-item') ? '#888' : '#aaa';
        }
        this._activeTreeEl = el;
        el.style.background = '#2a2a2a';
        el.style.borderLeftColor = '#0af';
        el.style.color = '#fff';
    }

    showModulesForCategory(libName, cat) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        modulesContainer.innerHTML = '';

        const entry = this.libraryGroups[libName];
        const modules = entry?.byCategory?.[cat] || [];

        const searchTerm = (this.searchInput?.value || '').toLowerCase().trim();
        const filtered = searchTerm
            ? modules.filter(m =>
                m.name.toLowerCase().includes(searchTerm) ||
                (m.displayName || m.description?.displayName || '').toLowerCase().includes(searchTerm))
            : modules;

        if (filtered.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding:20px;text-align:center;color:#666;font-size:11px;font-style:italic;';
            msg.textContent = searchTerm ? 'No modules match' : 'No modules in this category';
            modulesContainer.appendChild(msg);
            return;
        }

        for (const m of filtered) {
            modulesContainer.appendChild(this._createModuleRow(m, libName));
        }

    }

    _highlightGroup(activeItem) {
        this.menuElement.querySelectorAll('.group-item, .category-item').forEach(el => {
            el.style.background = 'transparent';
            el.style.borderLeftColor = 'transparent';
            el.style.color = el.classList.contains('category-item') ? '#888' : '#aaa';
        });
        activeItem.style.background = '#2a2a2a';
        activeItem.style.borderLeftColor = '#0af';
        activeItem.style.color = '#fff';
    }

    _highlightCategory(activeItem) {
        this._highlightGroup(activeItem);
    }
    _highlightGroup(activeItem) {
        this.menuElement.querySelectorAll('.group-item').forEach(el => {
            el.style.background = 'transparent';
            el.style.borderLeftColor = 'transparent';
            el.style.color = '#aaa';
        });
        activeItem.style.background = '#2a2a2a';
        activeItem.style.borderLeftColor = '#0af';
        activeItem.style.color = '#fff';
    }

    searchAllModules(searchTerm) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;
        modulesContainer.innerHTML = '';

        const term = searchTerm.toLowerCase().trim();
        if (!term) {
            const active = this.menuElement.querySelector('.group-item[style*="border-left-color"]');
            this.showModulesForGroup(active?.dataset.group || Object.keys(this.libraryGroups)[0]);
            return;
        }

        const results = [];
        for (const [libName, entry] of Object.entries(this.libraryGroups)) {
            for (const m of entry.modules) {
                const dn = (m.description?.displayName || '').toLowerCase();
                if (m.name.toLowerCase().includes(term) || dn.includes(term)) {
                    results.push({ module: m, library: libName });
                }
            }
        }

        if (results.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding:20px;text-align:center;color:#666;font-size:11px;font-style:italic;';
            msg.textContent = `No modules found matching "${searchTerm}"`;
            modulesContainer.appendChild(msg);
            return;
        }

        const header = document.createElement('div');
        header.style.cssText = 'padding:6px 12px;font-size:10px;color:#666;border-bottom:1px solid #333;margin-bottom:4px;';
        header.textContent = `Found ${results.length} module(s)`;
        modulesContainer.appendChild(header);

        for (const { module, library } of results) {
            const row = this._createModuleRow(module, library);

            const chip = document.createElement('span');
            chip.textContent = library;
            chip.style.cssText = 'font-size:9px;color:#555;font-style:italic;margin-right:6px;flex:0 0 auto;';
            const stars = row.querySelector('.rating-stars');
            row.insertBefore(chip, stars);

            modulesContainer.appendChild(row);
        }
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
        
        // ЛЕВАЯ КОЛОНКА 
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
        
        // ⭐ Category filter bar (глобальный фильтр по категориям)
        const filterBar = this.createCategoryFilterBar();

        rightPanel.appendChild(searchContainer);
        rightPanel.appendChild(filterBar);
        rightPanel.appendChild(modulesContainer);
        
        container.appendChild(leftPanel);
        container.appendChild(rightPanel);
        this.menuElement.appendChild(container);
        
        document.body.appendChild(this.menuElement);
        this.updateMenuPosition();
        
    }

    _createStatusDot(statusOrDesc, displayName = '') {
        let status, display;
        if (typeof statusOrDesc === 'string') {
            status = statusOrDesc;
            display = displayName;
        } else {
            status = getModuleStatus(statusOrDesc);
            display = statusOrDesc?.displayName || statusOrDesc?.type || '';
        }
        const meta = getStatusMeta(status);
        const dot = document.createElement('span');
        dot.className = 'status-dot';
        dot.dataset.status = status;
        dot.title = `${display} — ${meta.label}`;
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

    showModulesForGroup(libName) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;

        modulesContainer.innerHTML = '';

        if (!libName) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding:20px;text-align:center;color:#666;font-size:11px;font-style:italic;';
            msg.textContent = 'No library selected';
            modulesContainer.appendChild(msg);
            this._syncCategoryChips(null);   // сброс чипсов
            return;
        }

        const entry = this.libraryGroups[libName];
        const modules = entry?.modules || [];

        const searchTerm = (this.searchInput?.value || '').toLowerCase().trim();
        const filtered = searchTerm
            ? modules.filter(m =>
                m.name.toLowerCase().includes(searchTerm) ||
                (m.displayName || m.description?.displayName || '').toLowerCase().includes(searchTerm))
            : modules;

        if (filtered.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding:20px;text-align:center;color:#666;font-size:11px;font-style:italic;';
            msg.textContent = searchTerm ? 'No modules match' : 'No modules in this library';
            modulesContainer.appendChild(msg);
            this._syncCategoryChips(null);
            return;
        }

        for (const m of filtered) {
            modulesContainer.appendChild(this._createModuleRow(m, libName));
        }

        // Библиотека целиком → подсветить "All"
        this._syncCategoryChips('all');
    }

    showModulesForCategory(libName, cat) {
        const modulesContainer = this.menuElement.querySelector('#modules-container');
        if (!modulesContainer) return;

        modulesContainer.innerHTML = '';

        const entry = this.libraryGroups[libName];
        const modules = entry?.byCategory?.[cat] || [];

        const searchTerm = (this.searchInput?.value || '').toLowerCase().trim();
        const filtered = searchTerm
            ? modules.filter(m =>
                m.name.toLowerCase().includes(searchTerm) ||
                (m.displayName || m.description?.displayName || '').toLowerCase().includes(searchTerm))
            : modules;

        if (filtered.length === 0) {
            const msg = document.createElement('div');
            msg.style.cssText = 'padding:20px;text-align:center;color:#666;font-size:11px;font-style:italic;';
            msg.textContent = searchTerm ? 'No modules match' : 'No modules in this category';
            modulesContainer.appendChild(msg);
            this._syncCategoryChips(cat);
            return;
        }

        for (const m of filtered) {
            modulesContainer.appendChild(this._createModuleRow(m, libName));
        }

        this._syncCategoryChips(cat);
    }

    /**
     * Подсветить чипс выбранной категории (или 'all').
     * @param {string|null} cat — 'all' | category | 'other' | null (сброс)
     */
    _syncCategoryChips(cat) {
        if (!this._categoryFilterBar) return;
        const buttons = this._categoryFilterBar.querySelectorAll('button');
        buttons.forEach(b => {
            const on = (b.dataset.category === cat) ||
                       (cat === null && b.dataset.category === 'all');
            b.style.background = on ? '#0af' : 'transparent';
            b.style.color      = on ? '#fff' : '#888';
            b.style.borderColor = on ? '#0af' : '#333';
        });
    }

    _createModuleRow(moduleEntry, libName) {
        const { name, description } = moduleEntry;
        const displayName = moduleEntry.displayName || description?.displayName || name;
        const isUser = this.libraryGroups[libName]?.source === 'user';

        const item = document.createElement('div');
        item.className = 'module-item';
        item.dataset.moduleName = name;
        item.dataset.library = libName;
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
        label.textContent = isUser ? '★ ' + displayName : displayName;
        if (displayName !== name) label.title = name;
        label.style.cssText = 'flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
        item.appendChild(label);

        // Статус-точка (DEV) или звёзды (BUILD)
        if (IS_DEV) {
            item.appendChild(this._createStatusDot(moduleEntry.status, displayName));
        } else {
            item.appendChild(this._createStars(name));
        }

        item.onmouseenter = () => { item.style.background = '#2a2a2a'; };
        item.onmouseleave = () => { item.style.background = 'transparent'; };
        item.onclick = (e) => {
            if (!IS_DEV && e.target.closest('.rating-stars')) return;
            this.handleModuleSelect({ name, library: libName });
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
            if (p instanceof Panel && (p.jsonName === moduleName || p.type === moduleName)) {
                p.rating = value;
            }
        }
        // Если панель ещё не создана — ничего не делаем, при следующем createModule
        // прочитается через getEffectiveRating
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
                        const firstGroup = Object.keys(this.libraryGroups || {})[0];
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
            this.handleModuleSelect({
                name: firstModule.dataset.moduleName,
                library: firstModule.dataset.library,
            });
            this.hide();
        }
    }
    
    async show(mouseX = null, mouseY = null) {
        if (this.isVisible) return;

        // Закрываем JackContextMenu, если открыт
        if (this.system?.jackContextMenu?.menuElement?.style.display === 'block') {
            this.system.jackContextMenu.hide();
        }

        // ⭐ Свежий список библиотек — модуль могли добавить/удалить
        await this.refreshLibraryGroups();

        this.lastOpenMouseX = mouseX;
        this.lastOpenMouseY = mouseY;

        this.updateMenuPosition(mouseX, mouseY);

        this.menuElement.style.opacity = '1';
        this.menuElement.style.transform = 'scale(1)';
        this.menuElement.style.visibility = 'visible';
        this.isVisible = true;

        if (this.searchInput) {
            this.searchInput.value = '';
            setTimeout(() => this.searchInput.focus(), 50);
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
    
    handleModuleSelect({ name, library }) {
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

        if (this.system?.addNewModuleAtPosition) {
            this.system.addNewModuleAtPosition(name, targetLayer, targetGridX, targetGridY, { library });
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
}