// editor/EditorApp.js - обновлённая версия

import { EditorPanel } from './EditorPanel.js';
import { EditorUIManager } from './EditorUIManager.js';
import { ModulePropertiesWindow } from './ModulePropertiesWindow.js';

import { Knob } from '../src/components/Knob.js';
import { ButtonFlat } from '../src/components/ButtonFlat.js';
import { ButtonRadio } from '../src/components/ButtonRadio.js';
import { ButtonIncDec } from '../src/components/ButtonIncDec.js';
import { ButtonText } from '../src/components/ButtonText.js';
import { Slider } from '../src/components/Slider.js';
import { TextLabel } from '../src/components/TextLabel.js';
import { TextField } from '../src/components/TextField.js';
import { TextEdit } from '../src/components/TextEdit.js';
import { LevelShift } from '../src/components/LevelShift.js';
import { LED } from '../src/components/LED.js';
import { Input } from '../src/components/Input.js';
import { Output } from '../src/components/Output.js';
import { PartSelector } from '../src/components/PartSelector.js';
import { SVG } from '../src/components/SVG.js';
import { Line } from '../src/components/Line.js';
import { Graph } from '../src/components/Graph.js';
import { MiniVU } from '../src/components/MiniVU.js';

const GRID_UNITS = {
    X: 260,
    Y: 15
};

const MIN_GRID_WIDTH = 1;
const MIN_GRID_HEIGHT = 3;

const COMPONENT_SIZES = {
    knob: { width: 24, height: 24, label: 'Knob' },
    buttonFlat: { width: 50, height: 16, label: 'Btn' },
    buttonRadio: { width: 120, height: 16, label: 'Radio' },
    buttonIncDec: { width: 50, height: 16, label: 'IncDec' },
    buttonText: { width: 40, height: 16, label: 'M' },
    slider: { width: 14, height: 50, label: 'Slider' },
    textLabel: { width: 60, height: 16, label: 'Label' },
    textField: { width: 50, height: 16, label: 'Field' },
    textEdit: { width: 50, height: 16, label: 'Edit' },
    levelShift: { width: 20, height: 16, label: 'Level' },
    led: { width: 16, height: 10, label: 'LED' },
    input: { width: 14, height: 14, label: 'In' },
    output: { width: 14, height: 14, label: 'Out' },
    partSelector: { width: 70, height: 16, label: 'Select' },
    svg: { width: 28, height: 28, label: 'SVG' },
    line: { width: 60, height: 2, label: 'Line' },
    graph: { width: 60, height: 24, label: 'Graph' },
    miniVU: { width: 40, height: 24, label: 'VU' },
};

export class EditorApp {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.width = 1200;
        this.height = 800;
        
        this.zoom = 1;
        this.zoomLevels = [1, 2, 3];
        this.currentZoomIndex = 0;
        
        this.module = null;
        this.components = [];
        this.selectedComponent = null;
        this.resizingCorner = null;
        
        // ⭐ Для drag-and-drop
        this.draggingNewComponent = null;      // Компонент который перетаскиваем
        this.draggingNewComponentType = null;  // Тип компонента
        this.isDraggingNewComponent = false;
        this.dropValid = false;                // Можно ли бросить
        this.dropTargetModule = null;          // Целевой модуль
        this.draggingExistingComponent = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.dragStartRelX = 0;
        this.dragStartRelY = 0;
        
        this.offsetX = 0;
        this.offsetY = 0;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartOffsetX = 0;
        this.panStartOffsetY = 0;

        this.snapEnabled = true;
        this.snapGridSize = 5; // размер ячейки микросетки в пикселях
        this.showMicroGrid = true;

        
        this.setupCanvas();
        this.uiManager = new EditorUIManager(this);
        this.propertiesWindow = new ModulePropertiesWindow(this);
        this.createDefaultModule();
        this.animate();
        this.setupEvents();
    }

    setupCanvas() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.canvas.style.position = 'fixed';
        this.canvas.style.left = '50%';
        this.canvas.style.top = '50%';
        this.canvas.style.transform = 'translate(-50%, -50%)';
        this.canvas.style.backgroundColor = 'transparent';
        this.canvas.style.border = '1px solid #333';
        this.canvas.style.zIndex = '1';
    }

    createDefaultModule() {
        const gridWidth = 1;
        const gridHeight = 3;
        
        this.module = new EditorPanel(
            0, 0,
            gridWidth * GRID_UNITS.X,
            gridHeight * GRID_UNITS.Y,
            gridWidth,
            gridHeight
        );
        this.module.title = 'New Module';
        this.centerModuleInGrid();
    }

    centerModuleInGrid() {
        if (!this.module) return;
        
        const moduleGridWidth = this.module.gridWidth;
        const moduleGridHeight = this.module.gridHeight;
        
        const totalGridWidth = Math.floor(this.width / GRID_UNITS.X);
        const totalGridHeight = Math.floor(this.height / GRID_UNITS.Y);
        
        let centerGridX = Math.floor((totalGridWidth - moduleGridWidth) / 2);
        let centerGridY = Math.floor((totalGridHeight - moduleGridHeight) / 2);
        
        centerGridX = Math.max(0, centerGridX);
        centerGridY = Math.max(0, centerGridY);
        
        this.module.x = centerGridX * GRID_UNITS.X;
        this.module.y = centerGridY * GRID_UNITS.Y;
        
        const moduleScreenWidth = this.module.width * this.zoom;
        const moduleScreenHeight = this.module.height * this.zoom;
        
        this.offsetX = (this.width - moduleScreenWidth) / 2 - this.module.x * this.zoom;
        this.offsetY = (this.height - moduleScreenHeight) / 2 - this.module.y * this.zoom;
    }

    // ========== ДОБАВЛЕНИЕ КОМПОНЕНТОВ (НОВАЯ ВЕРСИЯ) ==========


    startDraggingNewComponent(type) {
        const size = COMPONENT_SIZES[type];
        if (!size) {
            console.warn('Unknown component type:', type);
            return;
        }

        // ⭐ Получаем позицию плавающей панели
        const panel = document.getElementById('editor-ui-panel');
        let spawnX = 100;
        let spawnY = 100;
        
        if (panel) {
            const rect = panel.getBoundingClientRect();
            // Конвертируем экранные координаты в координаты canvas
            const canvasRect = this.canvas.getBoundingClientRect();
            const scaleX = this.width / canvasRect.width;
            const scaleY = this.height / canvasRect.height;
            
            spawnX = (rect.left - canvasRect.left) * scaleX;
            spawnY = (rect.bottom - canvasRect.top) * scaleY + 10;
            
            // Учитываем zoom и offset
            spawnX = (spawnX - this.offsetX) / this.zoom;
            spawnY = (spawnY - this.offsetY) / this.zoom;
        }
        
        const component = this.createComponentInstance(
            type, 
            spawnX - size.width/2, 
            spawnY - size.height/2, 
            size
        );
        if (!component) return;

        this.draggingNewComponent = component;
        this.draggingNewComponentType = type;
        this.isDraggingNewComponent = true;
        this.dropValid = false;
        this.dropTargetModule = null;

        this.components.push(component);
        
        console.log(`🔄 Started dragging: ${type}`);
    }

    // Получает позицию для спавна (рядом с модулем)
    getSpawnPosition(width, height) {
        if (!this.module) {
            return { x: 100, y: 100 };
        }

        // Спавним справа от модуля
        const spawnX = this.module.x + this.module.width + 20;
        const spawnY = this.module.y + 20;
        
        // Проверяем, не выходит ли за пределы canvas
        const maxX = this.width / this.zoom - width;
        const maxY = this.height / this.zoom - height;
        
        return {
            x: Math.min(spawnX, maxX),
            y: Math.min(spawnY, maxY)
        };
    }

    // Создаёт экземпляр компонента по типу
    createComponentInstance(type, x, y, size) {
        let component = null;
        
        switch(type) {
            case 'knob':
                component = new Knob(x, y, 'medium', 0, 127, 64, false, 0);
                component.label = 'Knob';
                break;
            case 'buttonFlat':
                component = new ButtonFlat(x, y, size.width, size.height, 'Off,On');
                break;
            case 'buttonRadio':
                component = new ButtonRadio(x, y, 4, 30, 'One,Two,Three,Four', 'horizontal');
                break;
            case 'buttonIncDec':
                component = new ButtonIncDec(x, y, size.width, 'Item1,Item2,Item3,Item4', 0);
                break;
            case 'buttonText':
                component = new ButtonText(x, y, size.width, 'M', true);
                break;
            case 'slider':
                component = new Slider(x, y, size.width, size.height, 0, 127, 64);
                break;
            case 'textLabel':
                component = new TextLabel(x, y, 'Label', 10, '#888888', 'left', 'top');
                break;
            case 'textField':
                component = new TextField(x, y, size.width, null, 'number', null);
                break;
            case 'textEdit':
                component = new TextEdit(x, y, size.width, 'Ch 1', false);
                break;
            case 'levelShift':
                component = new LevelShift(x, y, 'small');
                break;
            case 'led':
                component = new LED(x, y, size.width, size.height);
                break;
            case 'input':
                component = new Input(x, y, { jackType: 'audio', label: 'In' });
                break;
            case 'output':
                component = new Output(x, y, { jackType: 'audio', label: 'Out' });
                break;
            case 'partSelector':
                component = new PartSelector(x, y, size.width, size.height, 5, 0, 
                    ['Item1', 'Item2', 'Item3', 'Item4', 'Item5']);
                break;
            case 'svg':
                const svgData = 'data:image/svg+xml,' + encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0af" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 8v8M8 12h8"/>
                    </svg>
                `);
                component = new SVG(x, y, size.width, size.height, svgData, null);
                break;
            case 'line':
                component = new Line(x, y, size.width, 'Horizontal', 1, '#444444');
                break;
            case 'graph':
                component = new Graph(x, y, size.width, size.height);
                break;
            case 'miniVU':
                component = new MiniVU(x, y, size.width, size.height);
                break;
            default:
                console.warn('Unknown component type:', type);
                return null;
        }

        // Общие настройки
        if (component) {
            component.width = size.width;
            component.height = size.height;
            component.parent = this.module;
            component._editorModule = this.module;
            component._isNewDragging = true; // Маркер что это новый компонент
        }

        return component;
    }

    // ========== СОБЫТИЯ ==========

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        this.canvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
        
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left) * (this.width / rect.width);
            const mouseY = (e.clientY - rect.top) * (this.height / rect.height);
            
            const oldZoom = this.zoom;
            let newZoom;
            
            if (e.deltaY < 0) {
                const nextIndex = Math.min(this.currentZoomIndex + 1, this.zoomLevels.length - 1);
                if (nextIndex === this.currentZoomIndex) return;
                this.currentZoomIndex = nextIndex;
                newZoom = this.zoomLevels[nextIndex];
            } else {
                const prevIndex = Math.max(this.currentZoomIndex - 1, 0);
                if (prevIndex === this.currentZoomIndex) return;
                this.currentZoomIndex = prevIndex;
                newZoom = this.zoomLevels[prevIndex];
            }
            
            this.zoomAroundPoint(mouseX, mouseY, oldZoom, newZoom);
            this.uiManager.updateZoomInfo(newZoom);
        }, { passive: false });
        
        // Pan с средней кнопкой
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) {
                e.preventDefault();
                this.isPanning = true;
                this.panStartX = e.clientX;
                this.panStartY = e.clientY;
                this.panStartOffsetX = this.offsetX;
                this.panStartOffsetY = this.offsetY;
                this.canvas.style.cursor = 'grabbing';
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                const dx = e.clientX - this.panStartX;
                const dy = e.clientY - this.panStartY;
                this.offsetX = this.panStartOffsetX + dx;
                this.offsetY = this.panStartOffsetY + dy;
            }
        });
        
        document.addEventListener('mouseup', (e) => {
            if (e.button === 1) {
                this.isPanning = false;
                this.canvas.style.cursor = 'default';
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedComponent) {
                this.removeComponent(this.selectedComponent);
            }
            if (e.key === 'Escape' && this.isDraggingNewComponent) {
                this.cancelDraggingNewComponent();
            }
            if (e.key === '=' || e.key === '+') {
                e.preventDefault();
                this.zoomIn();
            }
            if (e.key === '-') {
                e.preventDefault();
                this.zoomOut();
            }
            if (e.key === '0') {
                e.preventDefault();
                this.resetZoom();
            }
        });
    }

// editor/EditorApp.js - onMouseDown

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width);
        const y = (e.clientY - rect.top) * (this.height / rect.height);
        
        const worldX = (x - this.offsetX) / this.zoom;
        const worldY = (y - this.offsetY) / this.zoom;
        
        if (this.isDraggingNewComponent) return;
        
        if (this.module && this.module.isOnResizeCorner(worldX, worldY)) {
            this.resizingCorner = {
                startX: worldX,
                startY: worldY,
                startGridWidth: this.module.gridWidth,
                startGridHeight: this.module.gridHeight
            };
            return;
        }
        
        // ⭐ Проверяем компоненты для перетаскивания
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (comp._isNewDragging) continue;
            
            let isInside = false;
            if (typeof comp.isPointInside === 'function') {
                isInside = comp.isPointInside(worldX, worldY);
            } else if (typeof comp.contains === 'function') {
                isInside = comp.contains(worldX, worldY);
            }
            
            if (isInside) {
                this.selectedComponent = comp;
                
                // ⭐ Начинаем перетаскивание существующего компонента
                this.draggingExistingComponent = comp;
                this.dragOffsetX = worldX - comp.x;
                this.dragOffsetY = worldY - comp.y;
                
                // Сохраняем исходные rel координаты
                this.dragStartRelX = comp.relX;
                this.dragStartRelY = comp.relY;
                
                // Поднимаем компонент наверх (z-index)
                const idx = this.components.indexOf(comp);
                if (idx > -1) {
                    this.components.splice(idx, 1);
                    this.components.push(comp);
                }
                
                return;
            }
        }
        
        if (this.module && this.module.isInside(worldX, worldY)) {
            this.selectedComponent = null;
        }
    }

// editor/EditorApp.js - полный onMouseMove

    onMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width);
        const y = (e.clientY - rect.top) * (this.height / rect.height);
        
        const worldX = (x - this.offsetX) / this.zoom;
        const worldY = (y - this.offsetY) / this.zoom;
        
        // ===== DRAG-AND-DROP НОВОГО КОМПОНЕНТА =====
        if (this.isDraggingNewComponent && this.draggingNewComponent) {
            const comp = this.draggingNewComponent;
            
            let newX = worldX - comp.width / 2;
            let newY = worldY - comp.height / 2;
            
            // Прилипание к микросетке если включено
            if (this.snapEnabled) {
                newX = Math.round(newX / this.snapGridSize) * this.snapGridSize;
                newY = Math.round(newY / this.snapGridSize) * this.snapGridSize;
            }
            
            comp.x = newX;
            comp.y = newY;
            
            // Проверка внутри модуля (без учёта заголовка)
            const isInsideModule = this.module && 
                comp.x >= this.module.x &&
                comp.x + comp.width <= this.module.x + this.module.width &&
                comp.y >= this.module.y &&
                comp.y + comp.height <= this.module.y + this.module.height;
            
            // Проверка коллизий с другими компонентами
            let hasCollision = false;
            for (const other of this.components) {
                if (other === comp || other._isNewDragging) continue;
                
                if (comp.x < other.x + other.width &&
                    comp.x + comp.width > other.x &&
                    comp.y < other.y + other.height &&
                    comp.y + comp.height > other.y) {
                    hasCollision = true;
                    break;
                }
            }
            
            this.dropValid = isInsideModule && !hasCollision;
            this.dropTargetModule = isInsideModule ? this.module : null;
            
            this.canvas.style.cursor = this.dropValid ? 'copy' : 'not-allowed';
            return;
        }
        
        // ===== РЕСАЙЗ МОДУЛЯ =====
        if (this.resizingCorner) {
            const dx = worldX - this.resizingCorner.startX;
            const dy = worldY - this.resizingCorner.startY;
            
            let newGridWidth = Math.round(
                (this.resizingCorner.startGridWidth * GRID_UNITS.X + dx) / GRID_UNITS.X
            );
            let newGridHeight = Math.round(
                (this.resizingCorner.startGridHeight * GRID_UNITS.Y + dy) / GRID_UNITS.Y
            );
            
            newGridWidth = Math.max(MIN_GRID_WIDTH, newGridWidth);
            newGridHeight = Math.max(MIN_GRID_HEIGHT, newGridHeight);
            
            this.module.resize(newGridWidth, newGridHeight);
            
            // Обновляем позиции всех компонентов при ресайзе
            for (const comp of this.components) {
                if (comp._isNewDragging) continue;
                // Ограничиваем компоненты внутри нового размера модуля
                if (comp.x + comp.width > this.module.x + this.module.width) {
                    comp.x = this.module.x + this.module.width - comp.width;
                    if (comp.relX !== undefined) {
                        comp.relX = comp.x - this.module.x;
                    }
                }
                if (comp.y + comp.height > this.module.y + this.module.height) {
                    comp.y = this.module.y + this.module.height - comp.height;
                    if (comp.relY !== undefined) {
                        comp.relY = comp.y - this.module.y;
                    }
                }
            }
            
            return;
        }
        
        // ===== ПЕРЕТАСКИВАНИЕ СУЩЕСТВУЮЩЕГО КОМПОНЕНТА =====
        if (this.draggingExistingComponent) {
            const comp = this.draggingExistingComponent;
            
            let newX = worldX - this.dragOffsetX;
            let newY = worldY - this.dragOffsetY;
            
            // Прилипание к микросетке если включено
            if (this.snapEnabled) {
                newX = Math.round(newX / this.snapGridSize) * this.snapGridSize;
                newY = Math.round(newY / this.snapGridSize) * this.snapGridSize;
            }
            
            // Ограничиваем внутри модуля
            newX = Math.max(this.module.x, Math.min(this.module.x + this.module.width - comp.width, newX));
            newY = Math.max(this.module.y, Math.min(this.module.y + this.module.height - comp.height, newY));
            
            comp.x = newX;
            comp.y = newY;
            
            // Обновляем rel координаты
            comp.relX = newX - this.module.x;
            comp.relY = newY - this.module.y;
            
            // Проверяем коллизии с другими компонентами
            let hasCollision = false;
            for (const other of this.components) {
                if (other === comp || other._isNewDragging) continue;
                
                if (comp.x < other.x + other.width &&
                    comp.x + comp.width > other.x &&
                    comp.y < other.y + other.height &&
                    comp.y + comp.height > other.y) {
                    hasCollision = true;
                    break;
                }
            }
            
            // Меняем курсор если есть коллизия
            this.canvas.style.cursor = hasCollision ? 'not-allowed' : 'grabbing';
            
            return;
        }
        
        // ===== ХОВЕР НАД КОМПОНЕНТАМИ =====
        // Обновляем состояние hover для компонентов
        for (const comp of this.components) {
            if (comp._isNewDragging) continue;
            if (typeof comp.handleMouseMove === 'function') {
                comp.handleMouseMove(worldX, worldY);
            }
        }
        
        // Меняем курсор при наведении на компонент
        let cursorChanged = false;
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (comp._isNewDragging) continue;
            
            let isInside = false;
            if (typeof comp.isPointInside === 'function') {
                isInside = comp.isPointInside(worldX, worldY);
            } else if (typeof comp.contains === 'function') {
                isInside = comp.contains(worldX, worldY);
            }
            
            if (isInside) {
                this.canvas.style.cursor = 'grab';
                cursorChanged = true;
                break;
            }
        }
        
        if (!cursorChanged && !this.isDraggingNewComponent && !this.draggingExistingComponent) {
            this.canvas.style.cursor = 'default';
        }
    }

// editor/EditorApp.js - полный onMouseUp

    onMouseUp(e) {
        // ===== ЗАВЕРШЕНИЕ DRAG-AND-DROP НОВОГО КОМПОНЕНТА =====
        if (this.isDraggingNewComponent && this.draggingNewComponent) {
            if (this.dropValid && this.dropTargetModule) {
                // Фиксируем компонент внутри модуля
                const comp = this.draggingNewComponent;
                
                // Сохраняем относительные координаты
                comp.relX = comp.x - this.module.x;
                comp.relY = comp.y - this.module.y;
                comp.parent = this.module;
                comp._editorModule = this.module;
                comp._isNewDragging = false;
                
                console.log(`✅ Component placed at (${comp.relX}, ${comp.relY})`);
                this.uiManager.showNotification(`✅ ${this.draggingNewComponentType} placed`);
            } else {
                // Удаляем компонент если не в зоне
                const index = this.components.indexOf(this.draggingNewComponent);
                if (index > -1) {
                    this.components.splice(index, 1);
                }
                this.uiManager.showNotification('❌ Placement cancelled');
            }
            
            // Сбрасываем состояние
            this.isDraggingNewComponent = false;
            this.draggingNewComponent = null;
            this.draggingNewComponentType = null;
            this.dropValid = false;
            this.dropTargetModule = null;
            this.canvas.style.cursor = 'default';
        }
        
        // ===== ЗАВЕРШЕНИЕ ПЕРЕТАСКИВАНИЯ СУЩЕСТВУЮЩЕГО КОМПОНЕНТА =====
        if (this.draggingExistingComponent) {
            const comp = this.draggingExistingComponent;
            
            // Проверяем валидность позиции (внутри модуля)
            const isValid = comp.x >= this.module.x &&
                           comp.x + comp.width <= this.module.x + this.module.width &&
                           comp.y >= this.module.y &&
                           comp.y + comp.height <= this.module.y + this.module.height;
            
            // Проверяем коллизии с другими компонентами
            let hasCollision = false;
            for (const other of this.components) {
                if (other === comp || other._isNewDragging) continue;
                
                if (comp.x < other.x + other.width &&
                    comp.x + comp.width > other.x &&
                    comp.y < other.y + other.height &&
                    comp.y + comp.height > other.y) {
                    hasCollision = true;
                    break;
                }
            }
            
            // Если позиция невалидна или есть коллизия - возвращаем на исходную
            if (!isValid || hasCollision) {
                comp.x = this.module.x + this.dragStartRelX;
                comp.y = this.module.y + this.dragStartRelY;
                comp.relX = this.dragStartRelX;
                comp.relY = this.dragStartRelY;
                
                if (!isValid) {
                    this.uiManager.showNotification('⚠️ Component returned - outside module');
                } else if (hasCollision) {
                    this.uiManager.showNotification('⚠️ Component returned - collision detected');
                }
            } else {
                // Фиксируем новую позицию
                comp.relX = comp.x - this.module.x;
                comp.relY = comp.y - this.module.y;
                this.uiManager.showNotification('✅ Component moved');
            }
            
            this.draggingExistingComponent = null;
            this.dragOffsetX = 0;
            this.dragOffsetY = 0;
            this.dragStartRelX = 0;
            this.dragStartRelY = 0;
            this.canvas.style.cursor = 'default';
        }
        
        // ===== ЗАВЕРШЕНИЕ РЕСАЙЗА =====
        this.resizingCorner = null;
    }

    // Отмена перетаскивания
    cancelDraggingNewComponent() {
        if (this.isDraggingNewComponent && this.draggingNewComponent) {
            const index = this.components.indexOf(this.draggingNewComponent);
            if (index > -1) {
                this.components.splice(index, 1);
            }
            
            this.isDraggingNewComponent = false;
            this.draggingNewComponent = null;
            this.draggingNewComponentType = null;
            this.dropValid = false;
            this.dropTargetModule = null;
            this.canvas.style.cursor = 'default';
            
            this.uiManager.showNotification('❌ Placement cancelled');
        }
    }

    onDoubleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.width / rect.width);
        const y = (e.clientY - rect.top) * (this.height / rect.height);
        
        const worldX = (x - this.offsetX) / this.zoom;
        const worldY = (y - this.offsetY) / this.zoom;
        
        // Проверяем двойной клик по компоненту
        for (let i = this.components.length - 1; i >= 0; i--) {
            const comp = this.components[i];
            if (comp._isNewDragging) continue;
            
            let isInside = false;
            if (typeof comp.isPointInside === 'function') {
                isInside = comp.isPointInside(worldX, worldY);
            } else if (typeof comp.contains === 'function') {
                isInside = comp.contains(worldX, worldY);
            }
            
            if (isInside) {
                if (comp.constructor.name === 'TextEdit' && typeof comp.startEditing === 'function') {
                    comp.startEditing();
                    this.uiManager.showNotification('✏️ Editing text');
                }
                return;
            }
        }
        
        // Двойной клик по модулю
        if (this.module && this.module.isInside(worldX, worldY)) {
            this.editModuleTitle();
        }
    }

    editModuleTitle() {
        if (!this.module) return;
        
        const currentTitle = this.module.title;
        const newTitle = prompt('Enter module name:', currentTitle);
        
        if (newTitle !== null && newTitle.trim() !== '') {
            this.module.title = newTitle.trim();
            this.uiManager.showNotification(`📝 Module renamed to: ${this.module.title}`);
        }
    }

    // ========== ZOOM ==========

    setZoom(level) {
        const oldZoom = this.zoom;
        const newZoom = level;
        
        if (this.module) {
            const centerX = this.module.x + this.module.width / 2;
            const centerY = this.module.y + this.module.height / 2;
            
            const screenCenterX = centerX * oldZoom + this.offsetX;
            const screenCenterY = centerY * oldZoom + this.offsetY;
            
            this.zoom = newZoom;
            this.offsetX = screenCenterX - centerX * newZoom;
            this.offsetY = screenCenterY - centerY * newZoom;
        } else {
            this.zoom = newZoom;
        }
        
        this.uiManager.updateZoomInfo(newZoom);
    }

    zoomIn() {
        const nextIndex = Math.min(this.currentZoomIndex + 1, this.zoomLevels.length - 1);
        if (nextIndex !== this.currentZoomIndex) {
            this.currentZoomIndex = nextIndex;
            this.setZoom(this.zoomLevels[nextIndex]);
        }
    }

    zoomOut() {
        const prevIndex = Math.max(this.currentZoomIndex - 1, 0);
        if (prevIndex !== this.currentZoomIndex) {
            this.currentZoomIndex = prevIndex;
            this.setZoom(this.zoomLevels[prevIndex]);
        }
    }

    resetZoom() {
        this.currentZoomIndex = 0;
        this.zoom = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.centerModuleInGrid();
        this.uiManager.updateZoomInfo(1);
    }

    zoomAroundPoint(screenX, screenY, oldZoom, newZoom) {
        const worldX = (screenX - this.offsetX) / oldZoom;
        const worldY = (screenY - this.offsetY) / oldZoom;
        this.zoom = newZoom;
        this.offsetX = screenX - worldX * newZoom;
        this.offsetY = screenY - worldY * newZoom;
    }

    // ========== УПРАВЛЕНИЕ КОМПОНЕНТАМИ ==========

    removeComponent(component) {
        const index = this.components.indexOf(component);
        if (index > -1) {
            this.components.splice(index, 1);
            this.selectedComponent = null;
            this.uiManager.showNotification('🗑️ Component removed');
        }
    }

    clearModule() {
        this.components = [];
        this.selectedComponent = null;
        this.uiManager.showNotification('🆕 Module cleared');
    }

    // ========== ОТРИСОВКА ==========

// editor/EditorApp.js - animate()

    animate() {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        this.drawBackground();
        
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.zoom, this.zoom);
        
        // 1. Рисуем модуль
        if (this.module) {
            this.module.draw(this.ctx);
        }
        
        // 2. ⭐ Рисуем микросетку ПОВЕРХ модуля (но ПОД компонентами)
        if (this.showMicroGrid && this.module) {
            this.drawMicroGrid(this.ctx);
        }
        
        // 3. Рисуем компоненты (ПОВЕРХ микросетки)
        for (const comp of this.components) {
            const isDragging = comp._isNewDragging === true;
            
            if (isDragging) {
                this.ctx.save();
                this.ctx.globalAlpha = 0.8;
            }
            
            if (comp.relX !== undefined && comp.relY !== undefined && !isDragging) {
                comp.x = this.module.x + comp.relX;
                comp.y = this.module.y + comp.relY;
            }
            
            if (typeof comp.draw === 'function') {
                comp.draw(this.ctx);
            }
            
            if (isDragging) {
                const color = this.dropValid ? '#00ff00' : '#ff0000';
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2 / this.zoom;
                this.ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
                this.ctx.strokeRect(
                    comp.x - 2 / this.zoom,
                    comp.y - 2 / this.zoom,
                    comp.width + 4 / this.zoom,
                    comp.height + 4 / this.zoom
                );
                this.ctx.setLineDash([]);
                this.ctx.restore();
            }
        }
        
        // 4. Рисуем угол для ресайза (ПОВЕРХ всего)
        if (this.module) {
            this.module.drawResizeCorner(this.ctx);
        }
        
        if (this.selectedComponent && !this.selectedComponent._isNewDragging) {
            this.drawSelection(this.selectedComponent);
        }
        
        this.ctx.restore();
        
        if (this.module) {
            this.drawModuleSizeOutside();
        }
        
        this.drawZoomInfo();
        
        requestAnimationFrame(() => this.animate());
    }

    // ⭐ НОВЫЙ МЕТОД - рисует микросетку только внутри модуля
    drawMicroGrid(ctx) {
        if (!this.module) return;
        
        const step = this.snapGridSize;
        const startX = this.module.x;
        const startY = this.module.y;
        const endX = this.module.x + this.module.width;
        const endY = this.module.y + this.module.height;
        
        ctx.save();
        
        ctx.strokeStyle = 'rgba(0, 170, 255, 0.15)';
        ctx.lineWidth = 0.5 / this.zoom;
        
        // Вертикальные линии только внутри модуля
        for (let x = startX; x <= endX; x += step) {
            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }
        
        // Горизонтальные линии только внутри модуля
        for (let y = startY; y <= endY; y += step) {
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    // editor/EditorApp.js - drawBackground (убираем микросетку отсюда)

    drawBackground() {
        const ctx = this.ctx;
        
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.zoom, this.zoom);
        
        // Только основная сетка
        ctx.strokeStyle = 'rgba(100, 200, 100, 0.08)';
        ctx.lineWidth = 1 / this.zoom;
        
        for (let x = 0; x <= this.width / this.zoom; x += GRID_UNITS.X) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height / this.zoom);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.height / this.zoom; y += GRID_UNITS.Y) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width / this.zoom, y);
            ctx.stroke();
        }
        
        ctx.restore();
    }

    drawModuleSizeOutside() {
        if (!this.module) return;
        
        const ctx = this.ctx;
        const info = `${this.module.gridWidth}×${this.module.gridHeight}`;
        
        const screenX = this.module.x * this.zoom + this.offsetX + this.module.width * this.zoom / 2;
        const screenY = this.module.y * this.zoom + this.offsetY + this.module.height * this.zoom + 16 * this.zoom;
        
        ctx.save();
        
        ctx.font = `${10 * this.zoom}px monospace`;
        const metrics = ctx.measureText(info);
        const padding = 8 * this.zoom;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 18 * this.zoom;
        const bgX = screenX - bgWidth / 2;
        const bgY = screenY - bgHeight / 2;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(bgX, bgY, bgWidth, bgHeight);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(info, screenX, screenY);
        
        ctx.restore();
    }

    drawZoomInfo() {
        const ctx = this.ctx;
        ctx.save();
        
        const text = `${this.zoom}x`;
        const x = this.width - 60;
        const y = 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 10, y - 8, 50, 24);
        
        ctx.fillStyle = 'rgba(0, 170, 255, 0.8)';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + 15, y + 4);
        
        ctx.restore();
    }

    drawSelection(comp) {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = '#0af';
        ctx.lineWidth = 2 / this.zoom;
        ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
        
        const x = comp.x || 0;
        const y = comp.y || 0;
        const w = comp.width || comp.actualSize || 20;
        const h = comp.height || comp.actualSize || 20;
        
        ctx.strokeRect(x - 3 / this.zoom, y - 3 / this.zoom, w + 6 / this.zoom, h + 6 / this.zoom);
        ctx.setLineDash([]);
        ctx.restore();
    }
}