// editor/ComponentPropertiesWindow.js

export class ComponentPropertiesWindow {
    constructor(app) {
        this.app = app;
        this.windowElement = null;
        this.isVisible = false;
        this.currentComponent = null;
        
        this.createWindow();
        this.setupEventListeners();
    }
    
    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'component-properties-window';
        this.windowElement.style.cssText = `
            position: fixed;
            right: 20px;
            top: 10px;
            width: 280px;
            max-height: 80vh;
            overflow-y: auto;
            background: rgba(30, 30, 30, 0.95);
            padding: 15px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            border: 1px solid #444;
            z-index: 1001;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
            user-select: none;
            display: none;
        `;
        
        this.windowElement.innerHTML = `
            <div id="component-properties-header" style="
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                margin-bottom: 12px; 
                cursor: move; 
                padding: 4px 0;
            ">
                <span id="component-properties-title" style="
                    color: #0af; 
                    font-weight: bold; 
                    font-size: 13px;
                ">🔧 Component</span>
                <button id="close-component-properties-btn" style="
                    background: transparent; 
                    border: none; 
                    color: #666; 
                    cursor: pointer; 
                    font-size: 16px; 
                    padding: 0 4px;
                ">✕</button>
            </div>
            
            <div id="component-properties-body">
                <div style="color: #666; font-size: 11px; text-align: center; padding: 20px;">
                    No component selected
                </div>
            </div>
        `;
        
        document.body.appendChild(this.windowElement);
        
        this.makeDraggable();
        
        this.windowElement.querySelector('#close-component-properties-btn').onclick = 
            () => this.hide();
    }
    
    makeDraggable() {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        const header = this.windowElement.querySelector('#component-properties-header');
        
        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            
            isDragging = true;
            const rect = this.windowElement.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            this.windowElement.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            
            const maxX = window.innerWidth - this.windowElement.offsetWidth;
            const maxY = window.innerHeight - this.windowElement.offsetHeight;
            
            this.windowElement.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            this.windowElement.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
            this.windowElement.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.windowElement.style.cursor = '';
            }
        });
    }
    
    // ⭐ Показать свойства компонента
    show(component) {
        this.currentComponent = component;
        this.isVisible = true;
        this.windowElement.style.display = 'block';
        
        this.renderContent();
    }
    
    // ⭐ Скрыть
    hide() {
        this.isVisible = false;
        this.windowElement.style.display = 'none';
    }
    
    // ⭐ Toggle
    toggle(component) {
        if (this.isVisible && this.currentComponent === component) {
            this.hide();
        } else {
            this.show(component);
        }
    }
    
    // ⭐ Отрисовка содержимого
    renderContent() {
        const titleEl = this.windowElement.querySelector('#component-properties-title');
        const bodyEl = this.windowElement.querySelector('#component-properties-body');
        
        if (!this.currentComponent) {
            titleEl.textContent = '🔧 Component';
            bodyEl.innerHTML = `
                <div style="color: #666; font-size: 11px; text-align: center; padding: 20px;">
                    No component selected
                </div>
            `;
            return;
        }
        
        const comp = this.currentComponent;
        const compType = comp.constructor.name;
        
        titleEl.textContent = `🔧 ${compType} (id=${comp.id || '?'})`;
        
        // ⭐ Получаем schema
        const schema = this._getSchemaForComponent(comp);
        
        if (!schema || schema.length === 0) {
            bodyEl.innerHTML = `
                <div style="color: #666; font-size: 11px; text-align: center; padding: 20px;">
                    No editable properties for <b>${compType}</b> yet
                </div>
            `;
            return;
        }
        
        // ⭐ Строим UI
        bodyEl.innerHTML = '';
        
        schema.forEach(propDef => {
            const fieldEl = this._createField(comp, propDef);
            bodyEl.appendChild(fieldEl);
        });
    }
    
    // ⭐ Получить schema для компонента
    _getSchemaForComponent(comp) {
        // Если у класса есть статический getPropertySchema — используем
        if (typeof comp.constructor.getPropertySchema === 'function') {
            return comp.constructor.getPropertySchema();
        }
        // Иначе — пустой
        return [];
    }
    
    // ⭐ Создать поле для свойства

    _createField(comp, propDef) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 12px;';
        
        // Label
        const label = document.createElement('label');
        label.textContent = propDef.label || propDef.key;
        label.style.cssText = `
            color: #888; 
            font-size: 10px; 
            display: block; 
            margin-bottom: 3px;
        `;
        wrapper.appendChild(label);
        
        // Поле — по типу
        let inputEl = null;
        
        if (propDef.type === 'select') {
            inputEl = document.createElement('select');
            inputEl.style.cssText = `
                width: 100%; 
                padding: 4px 8px; 
                background: #1a1a1a; 
                border: 1px solid #444; 
                border-radius: 3px; 
                color: white; 
                font-size: 12px; 
                box-sizing: border-box;
            `;
            
            // ⭐ Опции
            const options = this._getOptionsFor(propDef);
            
            options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt.value;
                optionEl.textContent = opt.label;
                if (String(comp[propDef.key]) === String(opt.value)) {
                    optionEl.selected = true;
                }
                inputEl.appendChild(optionEl);
            });
            
            inputEl.onchange = () => {
                comp[propDef.key] = inputEl.value;
                console.log(`🔧 ${propDef.key} = ${inputEl.value}`);
                
                // ⭐ Обновляем код в CodeViewerWindow
                if (this.app.codeViewerWindow) {
                    this.app.codeViewerWindow.updateCode();
                }
            };
            
        } else if (propDef.type === 'number') {
            // ⭐ Числовое поле
            inputEl = document.createElement('input');
            inputEl.type = 'number';
            inputEl.value = comp[propDef.key] !== undefined && comp[propDef.key] !== null
                ? comp[propDef.key]
                : (propDef.min !== undefined ? propDef.min : 0);
            
            if (propDef.min !== undefined) inputEl.min = propDef.min;
            if (propDef.max !== undefined) inputEl.max = propDef.max;
            if (propDef.step !== undefined) inputEl.step = propDef.step;
            
            inputEl.style.cssText = `
                width: 100%; 
                padding: 4px 8px; 
                background: #1a1a1a; 
                border: 1px solid #444; 
                border-radius: 3px; 
                color: white; 
                font-size: 12px; 
                box-sizing: border-box;
            `;
            
            inputEl.onchange = () => {
                const v = parseFloat(inputEl.value);
                if (!isNaN(v)) {
                    comp[propDef.key] = v;
                    console.log(`🔧 ${propDef.key} = ${v}`);
                }
            };
            
        } else if (propDef.type === 'text') {
            // ⭐ Текстовое поле
            inputEl = document.createElement('input');
            inputEl.type = 'text';
            inputEl.value = comp[propDef.key] !== undefined && comp[propDef.key] !== null
                ? comp[propDef.key]
                : '';
            
            inputEl.style.cssText = `
                width: 100%; 
                padding: 4px 8px; 
                background: #1a1a1a; 
                border: 1px solid #444; 
                border-radius: 3px; 
                color: white; 
                font-size: 12px; 
                box-sizing: border-box;
            `;
            
            inputEl.onchange = () => {
                comp[propDef.key] = inputEl.value;
                console.log(`🔧 ${propDef.key} = "${inputEl.value}"`);
            };

        } else if (propDef.type === 'mapping-select') {
            // ⭐ Кастомный select для mapping-таблиц с браузером
            inputEl = document.createElement('div');
            inputEl.style.cssText = `
                display: flex;
                gap: 4px;
                width: 100%;
            `;
            
            // Текущее значение — показываем как текст
            const currentValue = comp[propDef.key] || '';
            const valueDisplay = document.createElement('div');
            valueDisplay.style.cssText = `
                flex: 1;
                padding: 4px 8px;
                background: #1a1a1a;
                border: 1px solid #444;
                border-radius: 3px;
                color: ${currentValue ? '#0af' : '#666'};
                font-size: 12px;
                box-sizing: border-box;
                cursor: pointer;
                font-family: monospace;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            `;
            valueDisplay.textContent = currentValue || '— None —';
            
            // Кнопка для открытия браузера
            const browseBtn = document.createElement('button');
            browseBtn.textContent = '🔍';
            browseBtn.title = 'Browse tables';
            browseBtn.style.cssText = `
                padding: 4px 8px;
                background: #2a2a2a;
                border: 1px solid #0af;
                color: #0af;
                border-radius: 3px;
                cursor: pointer;
                font-size: 12px;
            `;
            
            // Клик на значение или кнопку — открываем браузер
            const openBrowser = () => {
                this._showMappingBrowser(comp, propDef, valueDisplay);
            };
            
            valueDisplay.onclick = openBrowser;
            browseBtn.onclick = openBrowser;
            
            inputEl.appendChild(valueDisplay);
            inputEl.appendChild(browseBtn);
            
            // Заглушка для общего механизма
            inputEl._valueDisplay = valueDisplay;

        } else if (propDef.type === 'checkbox') {
            // ⭐ Чекбокс
            inputEl = document.createElement('input');
            inputEl.type = 'checkbox';
            inputEl.checked = Boolean(comp[propDef.key]);
            inputEl.style.cssText = `
                width: 16px;
                height: 16px;
                cursor: pointer;
                accent-color: #0af;
            `;
            
            inputEl.onchange = () => {
                comp[propDef.key] = inputEl.checked;
                console.log(`🔧 ${propDef.key} = ${inputEl.checked}`);
            };
        }
        
        // ⭐ Другие типы — позже (checkbox, color, ...)
        
        if (inputEl) {
            wrapper.appendChild(inputEl);
        }
        
        // Help
        if (propDef.help) {
            const help = document.createElement('div');
            help.textContent = propDef.help;
            help.style.cssText = `
                color: #555; 
                font-size: 9px; 
                margin-top: 3px; 
                line-height: 1.3;
            `;
            wrapper.appendChild(help);
        }
        
        return wrapper;
    }


    _showMappingBrowser(comp, propDef, valueDisplay) {
        // Ищем mappingTables
        const tables = this.app.mappingTables 
                    || this.app.system?.mappingTables 
                    || window.modularSystem?.mappingTables;
        
        if (!tables || tables.getCount() === 0) {
            this._showNotification('⚠️ No mapping tables loaded');
            return;
        }
        
        const allNames = tables.getAllNames();
        let filteredNames = allNames;
        
        // ⭐ Создаём модальное окно
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
        `;
        
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #1a1a1a;
            border: 1px solid #0af;
            border-radius: 8px;
            padding: 16px;
            width: 400px;
            max-height: 500px;
            display: flex;
            flex-direction: column;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.8);
        `;
        
        // Заголовок
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #333;
        `;
        header.innerHTML = `
            <span style="color: #0af; font-weight: bold; font-size: 13px;">
                🔍 Browse Mapping Tables
            </span>
            <button id="close-browser-btn" style="
                background: transparent;
                border: none;
                color: #666;
                cursor: pointer;
                font-size: 16px;
                padding: 0 4px;
            ">✕</button>
        `;
        
        // Поле поиска
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Type to search (min 2 chars)...';
        searchInput.style.cssText = `
            width: 100%;
            padding: 8px 10px;
            background: #0a0a0a;
            border: 1px solid #444;
            border-radius: 4px;
            color: white;
            font-size: 12px;
            margin-bottom: 12px;
            outline: none;
            box-sizing: border-box;
        `;
        
        // Список результатов
        const list = document.createElement('div');
        list.style.cssText = `
            flex: 1;
            overflow-y: auto;
            min-height: 200px;
            background: #0a0a0a;
            border: 1px solid #333;
            border-radius: 4px;
        `;
        
        // Функция отрисовки списка
        const renderList = (names) => {
            list.innerHTML = '';
            
            // ⭐ Кнопка "None"
            const noneItem = document.createElement('div');
            noneItem.textContent = '— None —';
            noneItem.style.cssText = `
                padding: 6px 12px;
                cursor: pointer;
                font-size: 11px;
                color: #666;
                border-bottom: 1px solid #222;
                font-style: italic;
            `;
            noneItem.onmouseenter = () => noneItem.style.background = '#1a1a1a';
            noneItem.onmouseleave = () => noneItem.style.background = 'transparent';
            noneItem.onclick = () => {
                comp[propDef.key] = null;
                valueDisplay.textContent = '— None —';
                valueDisplay.style.color = '#666';
                
                // ⭐ Обновляем код
                if (this.app.codeViewerWindow) {
                    this.app.codeViewerWindow.updateCode();
                }
                
                overlay.remove();
            };
            list.appendChild(noneItem);
            
            if (names.length === 0) {
                const empty = document.createElement('div');
                empty.textContent = searchInput.value.length < 2 
                    ? 'Start typing to search...'
                    : 'No tables match';
                empty.style.cssText = `
                    padding: 20px;
                    text-align: center;
                    color: #555;
                    font-size: 11px;
                    font-style: italic;
                `;
                list.appendChild(empty);
                return;
            }
            
            names.forEach(name => {
                const item = document.createElement('div');
                item.textContent = name;
                item.style.cssText = `
                    padding: 6px 12px;
                    cursor: pointer;
                    font-size: 11px;
                    color: #ccc;
                    font-family: monospace;
                    border-bottom: 1px solid #1a1a1a;
                `;
                item.onmouseenter = () => item.style.background = '#1a1a1a';
                item.onmouseleave = () => item.style.background = 'transparent';
                item.onclick = () => {
                    comp[propDef.key] = name;
                    valueDisplay.textContent = name;
                    valueDisplay.style.color = '#0af';
                    
                    // ⭐ Обновляем код
                    if (this.app.codeViewerWindow) {
                        this.app.codeViewerWindow.updateCode();
                    }
                    
                    overlay.remove();
                };
                list.appendChild(item);
            });
        };
        
        // Изначально показываем все
        renderList(allNames);
        
        // ⭐ Поиск: с 2 символов
        searchInput.oninput = () => {
            const term = searchInput.value.trim();
            
            if (term.length === 0) {
                filteredNames = allNames;
                renderList(allNames);
                return;
            }
            
            if (term.length < 2) {
                // Не ищем, показываем подсказку
                renderList([]);
                return;
            }
            
            const lower = term.toLowerCase();
            filteredNames = allNames.filter(n => 
                n.toLowerCase().includes(lower)
            );
            renderList(filteredNames);
        };
        
        // Собираем
        dialog.appendChild(header);
        dialog.appendChild(searchInput);
        dialog.appendChild(list);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        // Фокус на поиск
        setTimeout(() => searchInput.focus(), 50);
        
        // Обработчики закрытия
        header.querySelector('#close-browser-btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        };
        
        // Escape
        const onKeydown = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', onKeydown);
            }
        };
        document.addEventListener('keydown', onKeydown);
    }



    // ⭐ Получить список опций для select
    _getOptionsFor(propDef) {
        if (propDef.optionsFrom === 'ioComponents') {
            // ⭐ Все Input/Output модуля
            const module = this.app.module;
            if (!module || !this.app.components) return [];
            
            const ioComps = this.app.components
                .filter(c => !c._isNewDragging)
                .filter(c => {
                    const type = c.constructor.name;
                    return type === 'Input' || type === 'Output';
                });
            
            const options = [
                { value: '', label: '— None —' }
            ];
            
            ioComps.forEach(c => {
                const type = c.constructor.name;
                const label = c.label || c.ConnectorName || (type === 'Input' ? 'In' : 'Out');
                const jackType = c.type || c._jackType || 'audio';
                options.push({
                    value: String(c.id),
                    label: `${type} ${label} (${jackType}) [id=${c.id}]`,
                });
            });
            
            return options;
        }
        
        if (propDef.options) {
            return propDef.options;
        }

        if (propDef.optionsFrom === 'mappingTables') {
            // ⭐ Ищем mappingTables в порядке приоритета:
            // 1. app.mappingTables (редактор)
            // 2. app.system.mappingTables
            // 3. window.modularSystem.mappingTables
            const tables = this.app.mappingTables 
                        || this.app.system?.mappingTables 
                        || window.modularSystem?.mappingTables;
            
            if (!tables) {
                console.warn('⚠️ MappingTables not found in ComponentPropertiesWindow');
                return [{ value: '', label: '— No mapping tables loaded —' }];
            }
            
            if (tables.getCount() === 0) {
                // Таблицы ещё загружаются
                return [{ value: '', label: '— Loading... —' }];
            }
            
            const names = tables.getAllNames();
            console.log(`📋 Mapping tables dropdown: ${names.length} options`);
            
            return [
                { value: '', label: '— None —' },
                ...names.map(n => ({ value: n, label: n })),
            ];
        }

        return [];
    }
    
    // ⭐ Обновить, если текущий компонент изменился
    refresh() {
        if (this.isVisible && this.currentComponent) {
            this.renderContent();
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
}