// editor/EditorUIManager.js
import { moduleStore } from '../src/api/index.js';
import { getByCategory, createComponent } from './ComponentRegistry.js';
export class EditorUIManager {
    constructor(app) {
        this.app = app;
        this.container = null;
        
        this.createUIContainer();
        this.makeDraggable();
    }

    createUIContainer() {
        this.container = document.createElement('div');
        this.container.id = 'editor-ui-panel';
        this.container.style.cssText = `
            position: fixed;
            left: 10px;
            top: 10px;
            width: 190px;
            max-height: 90vh;
            overflow-y: auto;
            background: rgba(30, 30, 30, 0.92);
            padding: 12px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            border: 1px solid #444;
            z-index: 1000;
            backdrop-filter: blur(5px);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
            user-select: none;
        `;
        
        this.container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="display: flex; gap: 4px;">
                    <button id="properties-btn" style="padding: 2px 8px; background: #2a2a2a; border: 1px solid #0af; color: #0af; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        ⚙️ Props
                    </button>
                    <!-- ⭐ Кнопка Load -->
                    <button id="load-module-btn" style="padding: 2px 8px; background: #2a2a2a; border: 1px solid #f90; color: #f90; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        📂 Load
                    </button>
                    <!-- ⭐ Кнопка Code Viewer -->
                    <button id="code-viewer-btn" style="padding: 2px 8px; background: #2a2a2a; border: 1px solid #0f0; color: #0f0; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        🎵 Code
                    </button>  
                    <button id="component-props-btn" style="padding: 2px 8px; background: #2a2a2a; border: 1px solid #f0e; color: #f0e; border-radius: 3px; cursor: pointer; font-size: 10px;">
                        🔧 Comp
                    </button>
                </div>
            </div>
            
            <!-- Zoom -->
            <div style="display: flex; gap: 3px; margin-bottom: 8px;">
                <button id="zoom-out-btn" style="flex: 1; padding: 3px; background: #333; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px;">−</button>
                <button id="zoom-reset-btn" style="flex: 1; padding: 3px; background: #333; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 10px;">1×</button>
                <button id="zoom-in-btn" style="flex: 1; padding: 3px; background: #333; border: 1px solid #555; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 11px;">+</button>
                <span id="zoom-display" style="color: #0af; font-size: 10px; min-width: 30px; text-align: center; padding: 3px;">1×</span>
            </div>
            
            <!-- ⭐ Микросетка -->
            <div style="display: flex; gap: 3px; margin-bottom: 8px; align-items: center; background: #1a1a1a; padding: 4px 6px; border-radius: 4px;">
                <span style="color: #666; font-size: 9px;">Grid</span>
                <button id="grid-toggle-btn" style="padding: 2px 8px; background: #2a2a2a; border: 1px solid #555; color: #0af; border-radius: 3px; cursor: pointer; font-size: 9px;">ON</button>
                <span style="color: #555; font-size: 9px;">Snap</span>
                <button id="snap-toggle-btn" style="padding: 2px 8px; background: #2a2a2a; border: 1px solid #555; color: #0af; border-radius: 3px; cursor: pointer; font-size: 9px;">ON</button>
                <select id="grid-size-select" style="background: #2a2a2a; color: #aaa; border: 1px solid #555; border-radius: 3px; font-size: 9px; padding: 2px;">
                    <option value="5">5px</option>
                    <option value="10">10px</option>
                    <option value="20">20px</option>
                    <option value="40">40px</option>
                </select>
            </div>


            <div style="font-size: 10px; color: #666; margin-bottom: 4px;">— Drag to module —</div>
            
            <div id="component-palette"></div>
            
            <button id="clear-module-btn" style="width: 100%; padding: 6px; margin-top: 4px; background: #2a2a2a; border: 1px solid #ff4444; color: #ff4444; border-radius: 4px; cursor: pointer; font-size: 11px;">
                🗑️ Clear Module
            </button>
            
            <div style="margin-top: 8px; font-size: 9px; color: #555; text-align: center; border-top: 1px solid #333; padding-top: 6px;">
                🖱 Click → drag into module<br>
                🟢 valid drop · 🔴 invalid<br>
                Esc to cancel
            </div>
        `;
        
        document.body.appendChild(this.container);
        // ⭐ Генерируем палитру из реестра
        this._renderPalette();

        
        this.container.querySelector('#clear-module-btn').onclick = () => this.app.clearModule();

        this.container.querySelector('#properties-btn').onclick = () => {
            this.app.propertiesWindow.toggle();
        };

        // ⭐ Обработчик кнопки Load
        this.container.querySelector('#load-module-btn').onclick = () => {
            this.showLoadDialog();
        };

        // ⭐ Обработчик кнопки Code Viewer
        this.container.querySelector('#code-viewer-btn').onclick = () => {
            this.app.codeViewerWindow.toggle();
        };

        // ⭐ Кнопка свойств компонента
        this.container.querySelector('#component-props-btn').onclick = () => {
            const comp = this.app.selectedComponent;
            if (!comp) {
                this.showNotification('⚠️ No component selected');
                return;
            }
            this.app.componentPropertiesWindow.toggle(comp);
        };


        // Zoom
        this.container.querySelector('#zoom-in-btn').onclick = () => this.app.zoomIn();
        this.container.querySelector('#zoom-out-btn').onclick = () => this.app.zoomOut();
        this.container.querySelector('#zoom-reset-btn').onclick = () => this.app.resetZoom();

        // ⭐ Обработчики микросетки
        const gridToggle = this.container.querySelector('#grid-toggle-btn');
        const snapToggle = this.container.querySelector('#snap-toggle-btn');
        const gridSizeSelect = this.container.querySelector('#grid-size-select');
        
        gridToggle.onclick = () => {
            this.app.showMicroGrid = !this.app.showMicroGrid;
            gridToggle.textContent = this.app.showMicroGrid ? 'ON' : 'OFF';
            gridToggle.style.color = this.app.showMicroGrid ? '#0af' : '#666';
        };
        
        snapToggle.onclick = () => {
            this.app.snapEnabled = !this.app.snapEnabled;
            snapToggle.textContent = this.app.snapEnabled ? 'ON' : 'OFF';
            snapToggle.style.color = this.app.snapEnabled ? '#0af' : '#666';
        };
        
        gridSizeSelect.onchange = () => {
            this.app.snapGridSize = parseInt(gridSizeSelect.value);
            this.showNotification(`Grid size: ${this.app.snapGridSize}px`);
        };


    }


    _renderPalette() {
        const container = this.container.querySelector('#component-palette');
        if (!container) return;
        
        const byCat = getByCategory();
        
        // Порядок категорий и их подписи
        const categories = [
            { key: 'controls', title: 'Controls' },
            { key: 'display',  title: 'Display'  },
            { key: 'jacks',    title: 'Jacks'    },
            { key: 'graphics', title: 'Graphics' },
        ];
        
        // Для jacks — генерируем по два ряда кнопок (audio / control)
        const jackColors = { audio: '#ff4444', control: '#4488ff' };
        
        let html = '';
        
        for (const cat of categories) {
            const entries = byCat[cat.key] || [];
            if (entries.length === 0) continue;
            
            html += `<div style="font-size: 10px; color: #555; margin-bottom: 4px;">${cat.title}</div>`;
            
            if (cat.key === 'jacks') {
                // Джек-секция: Input × 2 типа + Output × 2 типа
                html += `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;">`;
                
                for (const entry of entries) {
                    for (const jackType of ['audio', 'control']) {
                        const label = entry.type === 'Input'
                            ? (jackType === 'audio' ? 'In 🔴' : 'In 🔵')
                            : (jackType === 'audio' ? 'Out 🔴' : 'Out 🔵');
                        const color = jackColors[jackType];
                        
                        html += `<button
                            data-type="${entry.type}"
                            data-jack-type="${jackType}"
                            style="padding: 3px 2px; background: #2a2a2a; border: 1px solid ${color}; color: ${color}; border-radius: 3px; cursor: pointer; font-size: 8px;"
                        >${label}</button>`;
                    }
                }
                
                html += `</div>`;
            } else {
                // Обычная секция: 3 колонки
                html += `<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;">`;
                
                for (const entry of entries) {
                    const borderColor = this._paletteColor(entry.category, entry.type);
                    const shortLabel = entry.label;
                    
                    html += `<button
                        data-type="${entry.type}"
                        style="padding: 4px; background: #2a2a2a; border: 1px solid ${borderColor}; color: ${borderColor}; border-radius: 3px; cursor: pointer; font-size: 9px;"
                    >${shortLabel}</button>`;
                }
                
                html += `</div>`;
            }
        }
        
        container.innerHTML = html;
        
        // ⭐ Навешиваем обработчики на все кнопки палитры
        container.querySelectorAll('[data-type]').forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const jackType = btn.dataset.jackType || null;
                this.app.startDraggingNewComponent(type, jackType);
                this.showNotification(`🔄 Drag ${btn.textContent.trim()} into module`);
            };
        });
    }
    
    _paletteColor(category, type) {
        // Цвета — как в старой палитре
        const colors = {
            Knob: '#f0e',
            Slider: '#f90',
            ButtonFlat: '#4a9eff',
            ButtonRadio: '#ff6b6b',
            ButtonIncDec: '#ffd93d',
            ButtonText: '#6c5ce7',
            TextLabel: '#888',
            TextField: '#0af',
            TextEdit: '#fd79a8',
            LED: '#00b894',
            LevelShift: '#fdcb6e',
            PartSelector: '#e17055',
            SVG: '#a29bfe',
            Line: '#636e72',
            Graph: '#00cec9',
            MiniVU: '#fd79a8',
        };
        return colors[type] || '#888';
    }

    makeDraggable() {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        
        this.container.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            if (e.target.closest('button')) return;
            
            isDragging = true;
            const rect = this.container.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            this.container.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            
            this.container.style.left = `${Math.max(0, newX)}px`;
            this.container.style.top = `${Math.max(0, newY)}px`;
        });
        
        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                this.container.style.cursor = '';
            }
        });
    }

    updateZoomInfo(level) {
        const display = this.container.querySelector('#zoom-display');
        if (display) {
            display.textContent = `${level}×`;
        }
    }


    async showLoadDialog() {
        try {
            const modules = await moduleStore.list();
            
            if (modules.length === 0) {
                this.showNotification('📭 No user modules found');
                return;
            }
            
            // Создаём диалог
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #2a2a2a;
                border: 1px solid #444;
                border-radius: 8px;
                padding: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 400px;
                box-shadow: 0 8px 40px rgba(0, 0, 0, 0.8);
            `;
            
            dialog.innerHTML = `
                <div style="color: #0af; font-weight: bold; font-size: 14px; margin-bottom: 12px;">📂 Load Module</div>
                <div style="margin-bottom: 12px;">
                    ${modules.map(name => `
                        <button data-name="${name}" style="
                            width: 100%;
                            padding: 8px 12px;
                            margin-bottom: 4px;
                            background: #1a1a1a;
                            border: 1px solid #333;
                            border-radius: 4px;
                            color: #ccc;
                            cursor: pointer;
                            text-align: left;
                            font-size: 12px;
                        ">${name}</button>
                    `).join('')}
                </div>
                <button id="close-dialog-btn" style="
                    padding: 6px 20px;
                    background: #333;
                    border: 1px solid #555;
                    border-radius: 4px;
                    color: #aaa;
                    cursor: pointer;
                    font-size: 12px;
                ">Cancel</button>
            `;
            
            document.body.appendChild(dialog);
            
            // Обработчики
            dialog.querySelectorAll('[data-name]').forEach(btn => {
                btn.onclick = async () => {
                    const name = btn.dataset.name;
                    dialog.remove();
                    await this.loadModule(name);
                };
            });
            
            dialog.querySelector('#close-dialog-btn').onclick = () => dialog.remove();
            
            // Закрытие по клику вне
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
            `;
            overlay.onclick = () => {
                dialog.remove();
                overlay.remove();
            };
            document.body.insertBefore(overlay, dialog);
            
        } catch (error) {
            this.showNotification(`❌ Error: ${error.message}`);
        }
    }

    async loadModule(name) {
        try {
            const data = await moduleStore.load(name);
            if (!data) {
                throw new Error(`Module "${name}" not found`);
            }
            
            const code = data.code;
            const dspCode = data.dsp_code;
            
            console.log(`📂 Loading module "${name}"...`);
            console.log(`   JS length: ${code.length}, DSP length: ${dspCode ? dspCode.length : 0}`);
            
            // ⭐ Парсим JS-код модуля
            let moduleData;
            try {
                moduleData = this._parseModuleCode(code);
            } catch (e) {
                console.error('Parse error:', e);
                this.showNotification(`❌ Parse error: ${e.message}`);
                return;
            }
            
            console.log('   Parsed moduleData:', moduleData);
            
            // ⭐ Восстанавливаем модуль в редакторе
            this.app.restoreModuleFromData(moduleData, dspCode);
            
            this.showNotification(`📂 Module "${name}" loaded`);
            
        } catch (error) {
            console.error('Load error:', error);
            this.showNotification(`❌ Error: ${error.message}`);
        }
    }

    _parseModuleCode(code) {
        // Ищем: export const XModule = { ... };
        // [\s\S] — любые символы, включая переносы
        const match = code.match(/export\s+const\s+\w+\s*=\s*(\{[\s\S]*\});?\s*$/m);
        if (!match) {
            throw new Error('Could not find "export const ... = { ... }" in module code');
        }
        
        // Вычисляем объект (для своих модулей безопасно)
        try {
            return new Function(`return ${match[1]}`)();
        } catch (e) {
            throw new Error(`Could not evaluate module object: ${e.message}`);
        }
    }


    showNotification(message, duration = 2000) {
        const old = document.querySelectorAll('.editor-notification');
        old.forEach(el => el.remove());
        
        const notification = document.createElement('div');
        notification.className = 'editor-notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 8px 14px;
            background: rgba(0, 170, 255, 0.9);
            color: white;
            border-radius: 4px;
            z-index: 2000;
            font-family: Arial, sans-serif;
            font-size: 12px;
            animation: fadeInOut ${duration}ms ease;
            max-width: 300px;
        `;
        
        if (!document.querySelector('#editor-notification-animation')) {
            const style = document.createElement('style');
            style.id = 'editor-notification-animation';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translateY(10px); }
                    10% { opacity: 1; transform: translateY(0); }
                    90% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(10px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, duration);
    }
}