// editor/EditorUIManager.js

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
                <span style="color: #0af; font-weight: bold; font-size: 12px;">📝 Module Editor</span>
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
            
            <div style="font-size: 10px; color: #555; margin-bottom: 4px;">Controls</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;">
                <button data-type="knob" style="padding: 4px; background: #2a2a2a; border: 1px solid #f0e; color: #f0e; border-radius: 3px; cursor: pointer; font-size: 9px;">Knob</button>
                <button data-type="slider" style="padding: 4px; background: #2a2a2a; border: 1px solid #f90; color: #f90; border-radius: 3px; cursor: pointer; font-size: 9px;">Slider</button>
                <button data-type="buttonFlat" style="padding: 4px; background: #2a2a2a; border: 1px solid #4a9eff; color: #4a9eff; border-radius: 3px; cursor: pointer; font-size: 9px;">Btn</button>
                <button data-type="buttonRadio" style="padding: 4px; background: #2a2a2a; border: 1px solid #ff6b6b; color: #ff6b6b; border-radius: 3px; cursor: pointer; font-size: 9px;">Radio</button>
                <button data-type="buttonIncDec" style="padding: 4px; background: #2a2a2a; border: 1px solid #ffd93d; color: #ffd93d; border-radius: 3px; cursor: pointer; font-size: 9px;">IncDec</button>
                <button data-type="buttonText" style="padding: 4px; background: #2a2a2a; border: 1px solid #6c5ce7; color: #6c5ce7; border-radius: 3px; cursor: pointer; font-size: 9px;">Toggle</button>
            </div>
            
            <div style="font-size: 10px; color: #555; margin-bottom: 4px;">Display</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;">
                <button data-type="textLabel" style="padding: 4px; background: #2a2a2a; border: 1px solid #888; color: #aaa; border-radius: 3px; cursor: pointer; font-size: 9px;">Label</button>
                <button data-type="textField" style="padding: 4px; background: #2a2a2a; border: 1px solid #0af; color: #0af; border-radius: 3px; cursor: pointer; font-size: 9px;">Field</button>
                <button data-type="textEdit" style="padding: 4px; background: #2a2a2a; border: 1px solid #fd79a8; color: #fd79a8; border-radius: 3px; cursor: pointer; font-size: 9px;">Edit</button>
                <button data-type="led" style="padding: 4px; background: #2a2a2a; border: 1px solid #00b894; color: #00b894; border-radius: 3px; cursor: pointer; font-size: 9px;">LED</button>
                <button data-type="levelShift" style="padding: 4px; background: #2a2a2a; border: 1px solid #fdcb6e; color: #fdcb6e; border-radius: 3px; cursor: pointer; font-size: 9px;">Level</button>
                <button data-type="partSelector" style="padding: 4px; background: #2a2a2a; border: 1px solid #e17055; color: #e17055; border-radius: 3px; cursor: pointer; font-size: 9px;">Select</button>
            </div>
            
            <div style="font-size: 10px; color: #555; margin-bottom: 4px;">Jacks</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;">
                <button data-type="input" data-jack-type="audio" style="padding: 3px 2px; background: #2a2a2a; border: 1px solid #ff4444; color: #ff4444; border-radius: 3px; cursor: pointer; font-size: 8px;">In 🔴</button>
                <button data-type="input" data-jack-type="control" style="padding: 3px 2px; background: #2a2a2a; border: 1px solid #4488ff; color: #4488ff; border-radius: 3px; cursor: pointer; font-size: 8px;">In 🔵</button>
                <button data-type="output" data-jack-type="audio" style="padding: 3px 2px; background: #2a2a2a; border: 1px solid #ff4444; color: #ff4444; border-radius: 3px; cursor: pointer; font-size: 8px;">Out 🔴</button>
                <button data-type="output" data-jack-type="control" style="padding: 3px 2px; background: #2a2a2a; border: 1px solid #4488ff; color: #4488ff; border-radius: 3px; cursor: pointer; font-size: 8px;">Out 🔵</button>
            </div>
            
            <div style="font-size: 10px; color: #555; margin-bottom: 4px;">Graphics</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; margin-bottom: 8px;">
                <button data-type="svg" style="padding: 4px; background: #2a2a2a; border: 1px solid #a29bfe; color: #a29bfe; border-radius: 3px; cursor: pointer; font-size: 9px;">SVG</button>
                <button data-type="line" style="padding: 4px; background: #2a2a2a; border: 1px solid #636e72; color: #636e72; border-radius: 3px; cursor: pointer; font-size: 9px;">Line</button>
                <button data-type="graph" style="padding: 4px; background: #2a2a2a; border: 1px solid #00cec9; color: #00cec9; border-radius: 3px; cursor: pointer; font-size: 9px;">Graph</button>
                <button data-type="miniVU" style="padding: 4px; background: #2a2a2a; border: 1px solid #fd79a8; color: #fd79a8; border-radius: 3px; cursor: pointer; font-size: 9px;">VU</button>
            </div>
            
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
        
        // ⭐ Все кнопки компонентов - запускают drag
        const buttons = this.container.querySelectorAll('[data-type]');
        buttons.forEach(btn => {
            btn.onclick = () => {
                const type = btn.dataset.type;
                const jackType = btn.dataset.jackType || null;  // ← получаем тип джека
                
                // ⭐ Для джеков передаём jackType
                this.app.startDraggingNewComponent(type, jackType);
                
                const label = btn.textContent.trim();
                this.showNotification(`🔄 Drag ${label} into module`);
            };
        });
        
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



    // ⭐ НОВЫЙ МЕТОД - диалог загрузки модуля
    async showLoadDialog() {
        try {
            const response = await fetch('/api/list-user-modules');
            if (!response.ok) {
                throw new Error('Failed to fetch modules');
            }
            
            const data = await response.json();
            const modules = data.modules || [];
            
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

    // ⭐ НОВЫЙ МЕТОД - загрузка модуля
    async loadModule(name) {
        try {
            const response = await fetch(`/api/load-module/${name}`);
            if (!response.ok) {
                throw new Error('Failed to load module');
            }
            
            const data = await response.json();
            
            // Парсим код и восстанавливаем модуль
            // Для начала - просто показываем уведомление
            this.showNotification(`📂 Module "${name}" loaded! (parsing not implemented yet)`);
            
            console.log('Loaded module code:', data.code);
            
        } catch (error) {
            this.showNotification(`❌ Error: ${error.message}`);
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