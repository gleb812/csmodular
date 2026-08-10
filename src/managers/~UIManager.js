// src/managers/UIManager.js
import { Panel } from '../components/Panel.js';
export class UIManager {
// UIManager.js - добавить в конструктор:
    constructor(system) {
        this.system = system;
        this.container = null;
        this.elements = {};
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        this.createUIContainer();
        this.makeDraggable(); // ← ДОБАВИТЬ!
        this.createCsoundControls();
        this.createZoomControls();
        this.createDebugInfo();
    }

    makeDraggable() {
        if (!this.container) return;
        
        const header = document.createElement('div');
        header.style.cssText = `
            height: 20px;
            background: #333;
            cursor: move;
            border-radius: 8px 8px 0 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #aaa;
            font-size: 11px;
            user-select: none;
        `;
        header.textContent = '≡ ПАнель управления';
        header.title = 'Перетащите для перемещения';
        
        // Вставляем header в начало container
        this.container.insertBefore(header, this.container.firstChild);
        
        // Обработчики перетаскивания
        header.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.dragOffset.x = e.clientX - this.container.offsetLeft;
            this.dragOffset.y = e.clientY - this.container.offsetTop;
            
            this.container.style.cursor = 'grabbing';
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            // Ограничиваем в пределах окна
            const maxX = window.innerWidth - this.container.offsetWidth;
            const maxY = window.innerHeight - this.container.offsetHeight;
            
            this.container.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.container.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            this.container.style.right = 'auto'; // сбрасываем right
        });
        
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.container.style.cursor = '';
        });
        
        // Делаем container абсолютно позиционированным
        this.container.style.position = 'fixed';
        this.container.style.left = '10px';
        this.container.style.top = '10px';
        this.container.style.right = 'auto';
    }
    
    // === ОСНОВНОЙ КОНТЕЙНЕР ===
    
    // UIManager.js - обновляем createUIContainer():
    // UIManager.js - createUIContainer():
    createUIContainer() {
        this.container = document.createElement('div');
        this.container.id = 'modular-ui-panel';
        this.container.style.cssText = `
            position: fixed; /* Фиксированная позиция */
            right: 10px;
            top: 10px;
            width: 220px;
            background: rgba(30, 30, 30, 0.85); /* Полупрозрачный темный */
            padding: 15px;
            border-radius: 8px;
            color: white;
            font-family: Arial, sans-serif;
            border: 1px solid #444;
            z-index: 1000; /* Выше canvas! */
            max-height: 90vh;
            overflow-y: auto;
            pointer-events: auto;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px); /* Эффект размытия фона */
            -webkit-backdrop-filter: blur(5px);
        `;
        
        document.body.appendChild(this.container);
    }

    // Добавить метод для обновления прозрачности:
    setTransparency(alpha = 0.85) {
        if (this.container) {
            const r = 30, g = 30, b = 30; // RGB цвета фона
            this.container.style.background = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
    }


    // === ZOOM КОНТРОЛЫ ===
    
    createZoomControls() {
        const zoomContainer = document.createElement('div');
        zoomContainer.style.marginTop = '15px';
        
        zoomContainer.innerHTML = `
            <div style="margin-bottom: 5px;">Масштаб:</div>
            <div style="display: flex; gap: 5px; margin-bottom: 5px;">
                <button id="zoomOutBtn" style="flex: 1; padding: 8px; 
                        background: #444; color: white; border: 1px solid #666; 
                        border-radius: 4px; cursor: pointer;">-</button>
                <button id="zoomResetBtn" style="flex: 1; padding: 8px; 
                        background: #444; color: white; border: 1px solid #666; 
                        border-radius: 4px; cursor: pointer;">100%</button>
                <button id="zoomInBtn" style="flex: 1; padding: 8px; 
                        background: #444; color: white; border: 1px solid #666; 
                        border-radius: 4px; cursor: pointer;">+</button>
            </div>
            <div id="zoomInfo" style="text-align: center; font-size: 12px; color: #aaa;">100%</div>
        `;
        
        // Обработчики
        zoomContainer.querySelector('#zoomOutBtn').onclick = () => this.system.zoom(-0.2);
        zoomContainer.querySelector('#zoomResetBtn').onclick = () => this.system.resetZoom();
        zoomContainer.querySelector('#zoomInBtn').onclick = () => this.system.zoom(0.2);
        
        this.container.appendChild(zoomContainer);
        
        // Сохраняем ссылку на элемент с информацией о зуме
        this.elements.zoomInfo = zoomContainer.querySelector('#zoomInfo');
    }
    
    // === CSOUND КОНТРОЛЫ ===
    
    createCsoundControls() {
        const csoundContainer = document.createElement('div');
        csoundContainer.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border-radius: 8px;
            border: 1px solid #0af;
            box-shadow: 0 2px 8px rgba(0, 170, 255, 0.2);
        `;
        
        csoundContainer.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <div style="color: #0af; font-weight: bold; font-size: 14px; flex: 1;">
                    🎵 Csound Engine
                </div>
                <div id="csoundStatus" style="font-size: 10px; background: #333; 
                        padding: 2px 6px; border-radius: 10px; color: #8f8;">
                    READY
                </div>
            </div>
            
            <div style="display: flex; gap: 5px; margin-bottom: 8px;">
                <button id="initCsoundBtn" style="flex: 1; padding: 8px; 
                        background: linear-gradient(to bottom, #0a5, #083); 
                        color: white; border: none; border-radius: 6px; 
                        cursor: pointer; font-weight: bold;">
                    ⚡ Initialize
                </button>
                <button id="testCsoundBtn" style="flex: 1; padding: 8px; 
                        background: linear-gradient(to bottom, #f80, #d60); 
                        color: white; border: none; border-radius: 6px; 
                        cursor: pointer; font-weight: bold;">
                    🔊 Test Tone
                </button>
            </div>
            
            <div style="display: flex; gap: 5px;">
                <button id="stopCsoundBtn" style="flex: 1; padding: 8px; 
                        background: linear-gradient(to bottom, #a00, #800); 
                        color: white; border: none; border-radius: 6px; 
                        cursor: pointer;">
                    ⏹ Stop
                </button>
                <button id="noteBtn" style="flex: 1; padding: 8px; 
                        background: linear-gradient(to bottom, #808, #606); 
                        color: white; border: none; border-radius: 6px; 
                        cursor: pointer;">
                    🎹 Note A4
                </button>
            </div>
            
            <div style="margin-top: 8px; font-size: 10px; color: #aaa; 
                    text-align: center; line-height: 1.3;">
                <div>Render patch to Csound code</div>
                <div id="csoundInfo">Not initialized</div>
            </div>
        `;
        
        // Обработчики
        csoundContainer.querySelector('#initCsoundBtn').onclick = () => this.system.initCsound();
        csoundContainer.querySelector('#testCsoundBtn').onclick = () => this.system.testCsound();
        csoundContainer.querySelector('#stopCsoundBtn').onclick = () => this.system.stopCsound();
        csoundContainer.querySelector('#noteBtn').onclick = () => this.system.playNote();
        
        this.container.appendChild(csoundContainer);
        
        // Сохраняем ссылки на элементы
        this.elements.csoundStatus = csoundContainer.querySelector('#csoundStatus');
        this.elements.csoundInfo = csoundContainer.querySelector('#csoundInfo');
    }
    
    
    // === ДЕБАГ ИНФОРМАЦИЯ ===
    
    // UIManager.js - обновленный createDebugInfo()
    createDebugInfo() {
        // Основной контейнер
        const container = document.createElement('div');
        container.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background: #222;
            border-radius: 4px;
            font-size: 11px;
            font-family: monospace;
            max-height: 250px;
            overflow-y: auto;
        `;
        
        // ЗАГОЛОВОК
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #444;
        `;
        
        const title = document.createElement('span');
        title.textContent = '📊 SYSTEM INFO';
        title.style.color = '#0af';
        
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = 'Toggle Profiler';
        toggleBtn.style.cssText = `
            background: #333;
            border: 1px solid #555;
            color: #0af;
            padding: 2px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 9px;
        `;
        
        toggleBtn.onclick = () => {
            if (this.system.toggleProfiler) {
                const enabled = this.system.toggleProfiler();
                toggleBtn.style.color = enabled ? '#0f0' : '#f00';
                toggleBtn.textContent = enabled ? 'Profiler ON' : 'Profiler OFF';
            }
        };
        
        header.appendChild(title);
        header.appendChild(toggleBtn);
        
        // ЭЛЕМЕНТ 1: Базовая информация (FPS, модули, кабели)
        this.elements.basicInfo = document.createElement('div');
        this.elements.basicInfo.style.cssText = `
            background: #1a1a1a;
            padding: 6px;
            border-radius: 3px;
            margin-bottom: 8px;
            font-weight: bold;
        `;
        
        // ЭЛЕМЕНТ 2: Детальный профайлер (ms)
        this.elements.profilerMetrics = document.createElement('div');
        this.elements.profilerMetrics.style.cssText = `
            background: #1a1a1a;
            padding: 6px;
            border-radius: 3px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
        `;
        
        // Собираем всё вместе
        container.appendChild(header);
        container.appendChild(this.elements.basicInfo);
        container.appendChild(this.elements.profilerMetrics);
        
        this.elements.debugInfo = container;
        this.container.appendChild(container);
        
        // Запускаем оба обновления
        this.startBasicInfoUpdates();
        this.startProfilerUpdates();
    }


    // UIManager.js - новый метод
    startBasicInfoUpdates() {
        setInterval(() => {
            if (!this.elements.basicInfo || !this.system) return;
            
            const modules = this.system.components?.filter?.(c => 
                c.constructor?.name === 'Panel' || c instanceof Panel
            ).length || 0;
            
            const cables = this.system.patchManager?.cables?.length || 0;
            const fps = this.system.currentFPS || 0;
            
            // Цвет в зависимости от FPS
            let fpsColor = '#6f6'; // зеленый
            if (fps < 30) fpsColor = '#f66'; // красный
            else if (fps < 50) fpsColor = '#ff6'; // желтый
            
            this.elements.basicInfo.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <span>🎯 FPS:</span>
                    <span style="color: ${fpsColor}; font-weight: bold;">${fps}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                    <span>📦 Modules:</span>
                    <span style="color: #0af;">${modules}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>🔌 Cables:</span>
                    <span style="color: #f0f;">${cables}</span>
                </div>
            `;
        }, 200);
    }




    // UIManager.js - обновленный startProfilerUpdates()
    startProfilerUpdates() {
        setInterval(() => {
            if (!this.system?.profiler?.enabled || !this.elements.profilerMetrics) {
                // Если профайлер выключен - показываем сообщение
                if (this.elements.profilerMetrics) {
                    this.elements.profilerMetrics.innerHTML = `
                        <div style="grid-column: span 2; text-align: center; color: #666;">
                            ⚙️ Profiler disabled
                        </div>
                    `;
                }
                return;
            }
            
            const times = this.system.profiler.times || {};
            const frameTime = times.total || 0;
            
            // Определяем цвет
            let frameColor = '#6f6';
            if (frameTime > 33) frameColor = '#f66';
            else if (frameTime > 20) frameColor = '#ff6';
            else if (frameTime > 16) frameColor = '#fa6';
            
            // Находим bottleneck
            const bottlenecks = [];
            if (times.drawVoice > 10) bottlenecks.push('Voice');
            if (times.drawFx > 10) bottlenecks.push('FX');
            if (times.drawCables > 8) bottlenecks.push('Cables');
            
            this.elements.profilerMetrics.innerHTML = `
                <div style="grid-column: span 2; margin-bottom: 4px;">
                    <span style="color: ${frameColor};">⏱️ ${Math.round(frameTime)}ms</span>
                    ${bottlenecks.length ? `<span style="color: #f66; margin-left: 8px;">⚠️ ${bottlenecks.join('/')}</span>` : ''}
                </div>
                <div>Clear:</div><div style="text-align: right;">${Math.round(times.clear || 0)}ms</div>
                <div>Voice:</div><div style="text-align: right; color: ${times.drawVoice > 10 ? '#f66' : '#6f6'};">${Math.round(times.drawVoice || 0)}ms</div>
                <div>FX:</div><div style="text-align: right; color: ${times.drawFx > 10 ? '#f66' : '#6f6'};">${Math.round(times.drawFx || 0)}ms</div>
                <div>Divider:</div><div style="text-align: right;">${Math.round(times.drawDivider || 0)}ms</div>
                <div>Cables:</div><div style="text-align: right; color: ${times.drawCables > 8 ? '#f66' : '#6f6'};">${Math.round(times.drawCables || 0)}ms</div>
            `;
        }, 200);
    }
    
    // === МЕТОДЫ ДЛЯ ОБНОВЛЕНИЯ UI ===
    // UIManager.js
    // UIManager.js - замени updatePosition():
    updatePosition() {
        if (!this.container) return;
        
        // НИЧЕГО НЕ ДЕЛАЕМ - фиксированная позиция
        // Или просто устанавливаем явно:
        this.container.style.position = 'fixed';
        this.container.style.right = '10px';
        this.container.style.top = '10px';
        this.container.style.zIndex = '10000';
        this.container.style.display = 'block';
        this.container.style.visibility = 'visible';
        this.container.style.opacity = '1';
        
        console.log('UI Panel forced to: right=10px, top=10px');
    }


    updateZoomInfo(scale) {
        if (this.elements.zoomInfo) {
            this.elements.zoomInfo.textContent = `${Math.round(scale * 100)}%`;
        }
    }
    
    updateCsoundStatus(text, color = '#fff') {
        if (this.elements.csoundStatus) {
            this.elements.csoundStatus.textContent = text;
            this.elements.csoundStatus.style.color = color;
        }
    }
    
    updateCsoundInfo(text) {
        if (this.elements.csoundInfo) {
            this.elements.csoundInfo.textContent = text;
        }
    }
    
    updatePatchInfo(filename, moduleCount, cableCount) {
        if (this.elements.patchInfo) {
            this.elements.patchInfo.style.display = 'block';
            this.elements.patchInfo.innerHTML = `
                <strong>${filename}</strong><br>
                Modules: ${moduleCount}<br>
                Cables: ${cableCount}<br>
                Loaded successfully
            `;
        }
    }
    
    updateDebugInfo(text) {
        if (this.elements.debugInfo) {
            this.elements.debugInfo.innerHTML = text;
            this.elements.debugInfo.scrollTop = this.elements.debugInfo.scrollHeight;
        }
    }
    
    showNotification(message, duration = 2000) {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            background: rgba(0, 170, 85, 0.9);
            color: white;
            border-radius: 4px;
            z-index: 2000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            animation: fadeInOut ${duration}ms ease;
        `;
        
        // Добавляем CSS анимацию если её нет
        if (!document.querySelector('#notification-animation')) {
            const style = document.createElement('style');
            style.id = 'notification-animation';
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
        
        return notification;
    }
}