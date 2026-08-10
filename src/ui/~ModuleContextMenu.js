// src/ui/ModuleContextMenu.js
import { ColorPicker } from './ColorPicker.js';
import { injectColorPickerStyles } from './ColorPickerStyles.js';
export class ModuleContextMenu {
    constructor(system) {
        this.system = system;
        this.menuElement = null;
        this.currentModule = null;
        
        this.createMenuElement();
        this.setupEventListeners();
        this.injectStyles();
        //injectColorPickerStyles();
        ColorPicker.injectStyles();
    }
    
    createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'module-context-menu';
        this.menuElement.style.cssText = `
            position: fixed;
            min-width: 200px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 15000;
            font-family: Arial, sans-serif;
            color: #ddd;
            display: none;
            overflow: hidden;
        `;
        
        document.body.appendChild(this.menuElement);
    }
    
    show(module, x, y) {
        this.currentModule = module;
        this.updateMenuContent();
        
        // Позиционируем
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        this.menuElement.style.display = 'block';
        
        // Закрываем другие меню если открыты
        if (this.system.contextMenu?.hide) this.system.contextMenu.hide();
        if (this.system.jackContextMenu?.hide) this.system.jackContextMenu.hide();
    }
    
    hide() {
        if (this.menuElement) {
            this.menuElement.style.display = 'none';
            this.currentModule = null;
        }
    }
    
    // src/ui/ModuleContextMenu.js - обновленный updateMenuContent()

    // В ModuleContextMenu.js - обновленный updateMenuContent()

// В ModuleContextMenu.js - правильный updateMenuContent()

    updateMenuContent() {
        if (!this.currentModule) return;
        
        this.menuElement.innerHTML = '';
        
        // Заголовок
        this.menuElement.appendChild(this.createHeader());
        
        // 1. Открыть код Csound
        this.menuElement.appendChild(this.createMenuItem(
            '📝 Open Csound Code',
            () => this.openCsoundCode()
        ));
        
        // 2. СЕКЦИЯ ЦВЕТОВ
        const colorSection = document.createElement('div');
        colorSection.style.cssText = `
            padding: 4px 0;
            border-bottom: 1px solid #333;
        `;

        const colorTitle = document.createElement('div');
        colorTitle.style.cssText = `
            padding: 6px 12px;
            color: #aaa;
            font-size: 11px;
        `;
        colorTitle.textContent = 'Panel color:';
        colorSection.appendChild(colorTitle);

        // ✨ СОЗДАЕМ COLOR PICKER (ТОЛЬКО ОДИН РАЗ!)
        if (!this.colorPicker) {
            this.colorPicker = new ColorPicker({
                columns: 8,
                rows: 4,
                cellSize: 14,
                showReset: true,  // ← ЭТО СОЗДАСТ resetBtn ВНУТРИ!
                resetText: '↺ Default Gray',
                onSelect: (color) => this.changePanelColor(color),
                onReset: () => this.resetPanelColor()
            });
            
            const pickerElement = this.colorPicker.create();
            colorSection.appendChild(pickerElement);
        } else {
            colorSection.appendChild(this.colorPicker.element);
            
            const currentColor = this.currentModule.customColor || '#606060';
            this.colorPicker.setColor(currentColor);
        }

        this.menuElement.appendChild(colorSection);
        
        // 3. Удалить модуль
        this.menuElement.appendChild(this.createSeparator());
        this.menuElement.appendChild(this.createMenuItem(
            '🗑️ Delete Module',
            () => this.deleteModule(),
            '#ff6b6b'
        ));
    }

    // Добавляем метод getContrastColor (как в JackContextMenu)
    getContrastColor(hexColor) {
        if (!hexColor) return '#000';
        
        const hex = hexColor.replace('#', '');
        
        if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 128 ? '#000000' : '#ffffff';
        } else if (hex.length === 6) {
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            return brightness > 128 ? '#000000' : '#ffffff';
        }
        
        return '#000000';
    }
    
    createMenuItem(text, onClick) {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        item.innerHTML = text;
        
        item.onmouseenter = () => item.style.background = '#3a3a3a';
        item.onmouseleave = () => item.style.background = 'transparent';
        item.onclick = (e) => {
            e.stopPropagation();
            onClick();
            this.hide();
        };
        
        return item;
    }
    
    createSeparator() {
        const separator = document.createElement('div');
        separator.style.cssText = `
            height: 1px;
            background: #333;
            margin: 4px 0;
        `;
        return separator;
    }

    // В ModuleContextMenu.js - добавь метод createHeader()

    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: #333;
            color: #0af;
            font-size: 12px;
            border-bottom: 1px solid #444;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        // Название модуля
        const title = document.createElement('span');
        title.textContent = this.currentModule?.title || 'Module';
        
        // Тип модуля (маленьким шрифтом)
        const type = document.createElement('span');
        type.style.cssText = `
            font-size: 10px;
            color: #888;
            font-weight: normal;
        `;
        type.textContent = this.currentModule?.jsonName || '';
        
        header.appendChild(title);
        header.appendChild(type);
        
        return header;
    }
    
    // Действия меню
    openCsoundCode() {
        if (!this.currentModule) return;
        
        // Открываем окно с кодом
        if (this.system.csoundWindow) {
            this.system.csoundWindow.show(this.currentModule);
        }
    }
    
    // В ModuleContextMenu.js - обновленный changePanelColor()

// В ModuleContextMenu.js - исправленный changePanelColor()

    changePanelColor(colorHex) {
        if (!this.currentModule) return;
        
        // 🚫 Защита от повторных вызовов
        if (this._changingColor) return;
        this._changingColor = true;
        
        // 🎨 Устанавливаем цвет
        this.currentModule.customColor = colorHex;
        
        // Перерисовываем
        if (this.system) {
            this.system.needsRedraw = true;
            requestAnimationFrame(() => this.system.animate());
        }
        
        this.system.showNotification(`🎨 Panel color changed`);
        
        // 🚫 НЕ обновляем меню! Оно и так актуально
        
        // Разблокируем через небольшую задержку
        setTimeout(() => {
            this._changingColor = false;
        }, 100);
    }

    // В resetPanelColor() - аналогично
    resetPanelColor() {
        if (!this.currentModule) return;
        
        if (this._changingColor) return;
        this._changingColor = true;
        
        this.currentModule.customColor = null;
        
        if (this.system) {
            this.system.needsRedraw = true;
            requestAnimationFrame(() => this.system.animate());
        }
        
        this.system.showNotification(`↺ Panel color reset to default`);
        
        setTimeout(() => {
            this._changingColor = false;
        }, 100);
    }
    
    deleteModule() {
        if (!this.currentModule) return;
        
        if (confirm(`Delete module "${this.currentModule.title}"? All connected cables will be removed.`)) {
            this.system.removeModule(this.currentModule);
            this.system.showNotification(`🗑️ Module deleted`);
        }
    }
    
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (this.menuElement && 
                !this.menuElement.contains(e.target) && 
                this.menuElement.style.display === 'block') {
                this.hide();
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuElement.style.display === 'block') {
                this.hide();
            }
        });
    }
    
    injectStyles() {
        if (document.getElementById('module-menu-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'module-menu-styles';
        style.textContent = `
            #module-context-menu div[style*="cursor: pointer"]:hover {
                background: #3a3a3a !important;
            }
            
            #module-context-menu div[style*="cursor: pointer"]:active {
                background: #4a4a4a !important;
            }
        `;
        document.head.appendChild(style);
    }
}