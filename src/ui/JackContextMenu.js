// src/ui/JackContextMenu.js
import { ColorPicker } from './ColorPicker.js';
import { injectColorPickerStyles } from './ColorPickerStyles.js';
export class JackContextMenu {
    constructor(system) {
        this.system = system;
        this.menuElement = null;
        this.currentJack = null;
        
        this.createMenuElement();
        this.setupEventListeners();
        this.injectStyles();
        ColorPicker.injectStyles();
    }
    
    createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'jack-context-menu';
        this.menuElement.style.cssText = `
            position: fixed;
            min-width: 180px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 20000; /* Выше всего! */
            font-family: Arial, sans-serif;
            color: #ddd;
            display: none;
            overflow: hidden;
        `;
        
        document.body.appendChild(this.menuElement);
    }
    
// В JackContextMenu.js - добавь этот метод

    createInfoSection() {
        const infoSection = document.createElement('div');
        infoSection.style.cssText = `
            padding: 8px 12px;
            color: #666;
            font-size: 10px;
            line-height: 1.4;
        `;
        
        infoSection.innerHTML = `
            <div>🎛️ <strong>${this.currentJack?.type || 'audio'}</strong> type</div>
            <div>📌 ConnectorIndex: <strong>${this.currentJack?.ConnectorIndex !== undefined ? this.currentJack.ConnectorIndex : 'N/A'}</strong></div>
            <div>🆔 Component ID: <strong>${this.currentJack?.id || 'N/A'}</strong></div>
            <div style="margin-top: 4px; color: #555;">
                <em>Visual color affects appearance only</em>
            </div>
        `;
        
        return infoSection;
    }
    
    show(jack, x, y) {
        this.currentJack = jack;
        // Закрываем основное меню если открыто
        if (this.system.contextMenu && this.system.contextMenu.isVisible) {
            this.system.contextMenu.hide();
        }        
        // Заполняем меню
        this.updateMenuContent();
        
        // Позиционируем
        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        this.menuElement.style.display = 'block';
        
        // Закрываем общее контекстное меню если открыто
        if (this.system.contextMenu && this.system.contextMenu.hide) {
            this.system.contextMenu.hide();
        }
        
        //console.log(`Jack menu shown for ${jack.label || jack.id}`);
    }
    
    hide() {
        if (this.menuElement) {
            this.menuElement.style.display = 'none';
            this.currentJack = null;
        }
    }
    
// В JackContextMenu.js - аналогично!

// В JackContextMenu.js - правильный updateMenuContent()

    updateMenuContent() {
        if (!this.currentJack) return;
        
        const cables = this.system.patchManager.getCablesForJack(this.currentJack);
        const cableCount = cables.length;
        
        this.menuElement.innerHTML = '';
        
        // Заголовок
        this.menuElement.appendChild(this.createHeader());
        
        // 1. Отключить все
        if (cableCount > 0) {
            this.menuElement.appendChild(this.createMenuItem(
                `🔌 Disconnect all (${cableCount})`,
                () => this.disconnectAll()
            ));
            this.menuElement.appendChild(this.createSeparator());
        }
        
        // 2. СЕКЦИЯ ЦВЕТОВ
        if (cableCount > 0) {
            const colorSection = document.createElement('div');
            colorSection.style.cssText = `
                padding: 4px 0;
            `;
            
            const colorTitle = document.createElement('div');
            colorTitle.style.cssText = `
                padding: 6px 12px;
                color: #aaa;
                font-size: 11px;
            `;
            colorTitle.textContent = 'Cable color:';
            colorSection.appendChild(colorTitle);
            
            // ✨ СОЗДАЕМ COLOR PICKER (ТОЛЬКО ОДИН РАЗ!)
            if (!this.colorPicker) {
                this.colorPicker = new ColorPicker({
                    columns: 8,
                    rows: 4,
                    cellSize: 14,
                    showReset: true,  // ← ЭТО СОЗДАСТ resetBtn ВНУТРИ!
                    resetText: '↺ Default (by type)',
                    onSelect: (color) => this.changeColor(color),
                    onReset: () => this.resetColors()
                });
                
                const pickerElement = this.colorPicker.create();
                colorSection.appendChild(pickerElement);
            } else {
                colorSection.appendChild(this.colorPicker.element);
                
                const currentColor = cables[0]?.visualColor || cables[0]?.typeColor || '#ef4444';
                this.colorPicker.setColor(currentColor);
            }
            
            this.menuElement.appendChild(colorSection);
            this.menuElement.appendChild(this.createSeparator());
        }
        
        // 3. Инфо секция
        this.menuElement.appendChild(this.createInfoSection());
    }
    // ДОБАВИМ ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ В КЛАСС:

    createSeparator() {
        const separator = document.createElement('div');
        separator.style.cssText = `
            height: 1px;
            background: #333;
            margin: 4px 0;
        `;
        return separator;
    }

    // В JackContextMenu.js - добавь метод createHeader()

    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: #333;
            color: #0af;
            font-size: 12px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        const title = document.createElement('span');
        title.textContent = this.currentJack?.direction === 'output' ? '🔌 Output' : '🎛️ Input';
        
        const label = document.createElement('span');
        label.style.cssText = `
            font-size: 10px;
            color: #888;
            font-weight: normal;
        `;
        label.textContent = this.currentJack?.label || this.currentJack?.id || '';
        
        header.appendChild(title);
        header.appendChild(label);
        
        return header;
    }

    getContrastColor(hexColor) {
        // Простая проверка для выбора контрастного текста
        if (!hexColor) return '#000';
        
        // Убираем #
        const hex = hexColor.replace('#', '');
        
        if (hex.length === 3) {
            // Расширяем #RGB до #RRGGBB
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            
            // Яркость по формуле
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

    // ОБНОВЛЕННЫЕ МЕТОДЫ ДЕЙСТВИЙ:

    disconnectAll() {
        if (!this.currentJack) return;
        
        const disconnected = this.system.patchManager.disconnectJack(this.currentJack);
        this.system.showNotification(`🔌 Disconnected ${disconnected} cable(s)`);
    }

    changeColor(colorHex) {
        if (!this.currentJack) return;
        
        const changed = this.system.patchManager.changeCableColor(this.currentJack, colorHex, true);
        this.system.showNotification(`🎨 Changed visual color of ${changed} cable(s)`);
    }

    resetColors() {
        if (!this.currentJack) return;
        
        const reset = this.system.patchManager.resetCableColors(this.currentJack);
        this.system.showNotification(`↺ Reset color of ${reset} cable(s) to default`);
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
    
    setupEventListeners() {
        // Клик вне меню - скрыть
        document.addEventListener('click', (e) => {
            if (this.menuElement && 
                !this.menuElement.contains(e.target) && 
                this.menuElement.style.display === 'block') {
                this.hide();
            }
        });
        
        // Escape - скрыть
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuElement.style.display === 'block') {
                this.hide();
            }
        });
    }
    
// В JackContextMenu.js - обновленный injectStyles()

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