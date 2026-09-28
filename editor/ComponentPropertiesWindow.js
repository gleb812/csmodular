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