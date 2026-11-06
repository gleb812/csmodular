import { libraryStore } from './api/index.js';
import { Panel } from './components/Panel.js';
import { PANEL_GRID_WIDTH, PANEL_WIDTH, BASE_STEP_X, BASE_STEP_Y } from './constants.js';

import { Knob } from './components/Knob.js';
import { ButtonFlat } from './components/ButtonFlat.js';
import { TextLabel } from './components/TextLabel.js';
import { LevelShift } from './components/LevelShift.js';
import { ButtonRadio } from './components/ButtonRadio.js';
import { ButtonText } from './components/ButtonText.js';
import { Input } from './components/Input.js';
import { Output } from './components/Output.js';
import { Line } from './components/Line.js';

import { Slider } from './components/Slider.js';
import { SVG } from './components/SVG.js';

import { ButtonIncDec } from './components/ButtonIncDec.js';
import { TextEdit } from './components/TextEdit.js';
import { TextField } from './components/TextField.js';
import { Stub } from './components/Stub.js';

import { LED } from './components/LED.js';
import { Graph } from './components/Graph.js';
import { MiniVU } from './components/MiniVU.js';
import { PartSelector } from './components/PartSelector.js';

import { BaseJack } from './components/BaseJack.js';
import { getEffectiveRating } from './api/moduleRatingStore.js';
import { getModuleStatus } from './api/moduleStatusStore.js';


// ModuleFactory.js
export class ModuleFactory {
    constructor() {
        this.moduleRegistry = {}; // Здесь будут храниться все определения модулей
        this.nextModuleId = 1; // Для генерации уникальных ID
        this.parentSystem = null;
    }

    _isInteractiveComponent(componentType) {
        const interactiveTypes = [
            'Knob',
            'ButtonFlat',
            'ButtonRadio',
            'ButtonIncDec',
            'Slider',
            'ButtonText',
            'TextEdit',
            'PartSelector',   // ⭐ NEW
            'Toggle',
            'Button',
        ];
        return interactiveTypes.includes(componentType);
    }

    _initializeCsoundValue(component, compDef) {
        let initialValue = 0;

        switch (compDef.componentType) {
            case 'Knob':
            case 'Slider':
                initialValue = compDef.defaultValue || 0;
                break;
            case 'ButtonFlat':
            case 'ButtonRadio':
                initialValue = 0;
                break;
            case 'ButtonIncDec':
                initialValue = compDef.initialIndex || 0;
                break;
            case 'ButtonText':
                initialValue = compDef.initialState !== undefined
                    ? (compDef.initialState ? 1 : 0) : 0;
                break;
            case 'PartSelector':                                    // ⭐ NEW
                initialValue = compDef.selectedIndex
                    ?? compDef.menuOffset
                    ?? 0;
                break;
        }

        // Сохраняем в компоненте
        component.initialCsoundValue = initialValue;

        // Если у компонента есть метод для отправки в Csound
        if (component.updateCsoundValue) {
            component.updateCsoundValue(initialValue);
        } else {
            component.updateCsoundValue = function(value) {
                if (this.csoundChannel && window.csound) {
                    window.csound.setControlChannel(this.csoundChannel, value)
                        .then(() => {}, () => {});
                }
            };
            component.updateCsoundValue(initialValue);
        }
    }


    // ⭐ Загрузить модуль из библиотеки (builtin или user)
    //    lib = 'test-lib' | 'user' | ...
    async loadModule(lib, name) {
        try {
            const data = await libraryStore.loadModule(lib, name);
            if (!data) {
                console.warn(`[ModuleFactory] loadModule("${lib}/${name}") → not found`);
                return false;
            }

            const moduleDef = data.description;   // уже распарсен libraryStore
            if (!moduleDef) {
                console.warn(`[ModuleFactory] loadModule("${lib}/${name}") → parse failed`);
                return false;
            }

            // ⭐ Метаданные источника
            moduleDef.library = lib;
            moduleDef.type = moduleDef.type || name;
            moduleDef.isUser = (lib === 'user');

            // Коллизия: два модуля с одинаковым type из разных библиотек.
            // Пока — первая загруженная побеждает (Шаг 3 → составной ключ lib:type).
            if (this.moduleRegistry[moduleDef.type]) {
                const prev = this.moduleRegistry[moduleDef.type];
                if (prev.library && prev.library !== lib) {
                    console.warn(
                        `[ModuleFactory] type "${moduleDef.type}" already registered ` +
                        `from library "${prev.library}", skipping "${lib}/${name}"`
                    );
                    return true;
                }
                // Тот же lib, тот же type — перезагрузка (invalidate), ок
            }

            this.registerModule(moduleDef.type, moduleDef);
            console.log(`✅ Loaded module ${lib}/${name} as "${moduleDef.type}"`);
            return true;

        } catch (error) {
            console.error(`[ModuleFactory] loadModule("${lib}/${name}") error:`, error);
            return false;
        }
    }

    // ⭐ Является ли модуль пользовательским — теперь по definition.isUser
    isUserModule(moduleName) {
        const def = this.moduleRegistry[moduleName];
        return def?.isUser === true;
    }


    // Регистрация нового типа модуля
    registerModule(type, definition) {
        this.moduleRegistry[type] = definition;
    }

    createModule(type, gridX, gridY, layer = null) {
        console.log('🔍 createModule:', { type, gridX, gridY, layer });
        const definition = this.moduleRegistry[type];
        
        if (!definition) {
            console.error(`Module type "${type}" not found in registry`);
            return null;
        }

        // Определяем grid размеры модуля
        // Ширина панели — всегда 13 клеток (PANEL_WIDTH / BASE_STEP_X)
        const gridWidth = PANEL_GRID_WIDTH;
        const gridHeight = definition.gridHeight;
        if (!gridHeight || gridHeight < 1) {
            console.error(`Module ${type}: gridHeight is missing or invalid`, definition);
            return null;
        }
        // Генерируем уникальный ID
        const moduleId = `${type}_${this.nextModuleId++}`;
                
        const panel = new Panel(gridX, gridY, gridWidth, gridHeight, definition.displayName || type);

        // Устанавливаем свойства
        panel.moduleId = moduleId;
        panel.layer = layer;
        panel.parentSystem = this.parentSystem;
        panel.rating = getEffectiveRating(type, definition);
        panel.status = getModuleStatus(definition);

        // ⭐ Читаем цвет из definition
        if (definition.customColor) {
            panel.customColor = definition.customColor;
        }

        if (definition.library) {
            panel.library = definition.library;
        }

        // Создаем компоненты 
        this._addComponentsToPanel(panel, definition.components);
        
        // Сохраняем оригинальные размеры для масштабирования
        panel.originalPixelWidth = definition.width || PANEL_WIDTH;
        panel.originalPixelHeight = definition.height || (gridHeight * BASE_STEP_Y);
        
        return panel;
    }

    _addComponentsToPanel(panel, components) {
        if (!components) return;
        for (const compDef of components) {
            const c = this._createOneComponent(compDef, panel);
            if (c) panel.addComponent(c);
        }
    }

    /**
     * Создать ОДИН компонент из compDef и настроить его (id, relX/relY,
     * parent, csoundChannel, onChange-обёртка).
     * Возвращает компонент или null.
     *
     * ⚠️ Вынесено из _addComponentsToPanel, чтобы refreshPanel мог
     *    создавать только НОВЫЕ компоненты, не трогая существующие.
     */
    _createOneComponent(compDef, panel) {
        const relX = compDef.x;
        const relY = compDef.y;
        const tempX = 0;
        const tempY = 0;

        let component;
        switch (compDef.componentType) {
            case 'Knob':
                component = new Knob(
                    tempX, tempY,
                    compDef.size || 'medium',
                    compDef.min || 0,
                    compDef.max || 127,
                    compDef.defaultValue || 0,
                    compDef.snapping || false,
                    compDef.infoFunc || 0,
                );
                component.parent = panel;
                break;

            case 'Slider':
                component = new Slider(
                    tempX, tempY,
                    compDef.width || 10,
                    compDef.height || 60,
                    compDef.min || 0,
                    compDef.max || 127,
                    compDef.defaultValue || 0,
                    compDef.infoFunc || 0,
                );
                break;

            case 'ButtonFlat':
                component = new ButtonFlat(
                    tempX, tempY,
                    compDef.width || 36,
                    compDef.height || 12,
                    compDef.labels ? compDef.labels.join(',') : ''
                );
                break;

            case 'ButtonRadio':
                component = new ButtonRadio(
                    tempX, tempY,
                    compDef.buttonCount || 4,
                    compDef.buttonWidth || 40,
                    compDef.labels ? compDef.labels.join(',') : 'One,Two,Three,Four',
                    compDef.orientation || 'horizontal'
                );
                break;

            case 'ButtonIncDec':
                component = new ButtonIncDec(
                    tempX, tempY,
                    compDef.width || 40,
                    compDef.items || 'One,Two,Three,Four',
                    compDef.initialIndex || 0
                );
                break;

            case 'TextField':
                component = new TextField(
                    tempX, tempY,
                    compDef.width || 20,
                    compDef.referenceElementId || 0,
                    compDef.format || 'number',
                    compDef.tableName || null
                );
                if (compDef.modeComponentId !== undefined && compDef.modeComponentId !== null) {
                    component.modeComponentId = String(compDef.modeComponentId);
                }
                if (Array.isArray(compDef.tableByMode)) {
                    component.tableByMode = compDef.tableByMode.slice();
                }
                component.parent = panel;
                break;

            case 'SVG':
                component = new SVG(
                    tempX, tempY,
                    compDef.width || 32,
                    compDef.height || 32,
                    compDef.svgSrc || '',
                    compDef.color || null
                );
                break;

            case 'ButtonText':
                component = new ButtonText(
                    tempX, tempY,
                    compDef.width || 40,
                    compDef.text || 'M',
                    compDef.initialState !== undefined ? compDef.initialState : true,
                    compDef.height
                );
                break;

            case 'Graph':
                component = new Graph(
                    tempX, tempY,
                    compDef.width || 40,
                    compDef.height || 30
                );
                break;

            case 'MiniVU':
                component = new MiniVU(
                    tempX, tempY,
                    compDef.width || 6,
                    compDef.height || 15
                );
                if (compDef.sourceComponentId !== null && compDef.sourceComponentId !== undefined) {
                    component.sourceComponentId = compDef.sourceComponentId;
                }
                break;

            case 'TextLabel':
                component = new TextLabel(
                    tempX, tempY,
                    compDef.text || '',
                    compDef.fontSize || 10,
                );
                break;

            case 'TextEdit':
                component = new ButtonText(
                    tempX, tempY,
                    compDef.width || 40,
                    compDef.text || 'Text',
                    true,
                    compDef.height || 13
                );
                break;

            case 'Line':
                component = new Line(
                    tempX, tempY,
                    compDef.length || 100,
                    compDef.orientation || 'Horizontal',
                    compDef.width || 1,
                    compDef.color || '#fff'
                );
                break;

            case 'LED':
                component = new LED(
                    tempX, tempY,
                    compDef.width || 8,
                    compDef.height || 8,
                );
                if (compDef.sourceComponentId !== undefined && compDef.sourceComponentId !== null) {
                    component.sourceComponentId = compDef.sourceComponentId;
                }
                if (compDef.ledType) {
                    component.ledType = compDef.ledType;
                }
                break;

            case 'LevelShift':
                component = new LevelShift(
                    tempX, tempY,
                    compDef.width || 20,
                    compDef.height || 20,
                );
                break;

            case 'Stub':
                component = new Stub(
                    tempX, tempY,
                    compDef.width || 20,
                    compDef.height || 20,
                );
                break;

            case 'PartSelector': {
                const items = compDef.items
                    ?? compDef.menuItems
                    ?? ['Item1', 'Item2', 'Item3', 'Item4', 'Item5'];
                const selectedIndex = compDef.selectedIndex
                    ?? compDef.menuOffset
                    ?? 0;
                component = new PartSelector(
                    tempX, tempY,
                    compDef.width || 70,
                    compDef.height || 16,
                    items,
                    selectedIndex
                );
                break;
            }

            case 'Input':
                component = new Input(
                    tempX, tempY,
                    {
                        type: compDef.jackType || 'audio',
                        jackType: compDef.jackType || 'audio',
                        bandwidth: compDef.bandwidth || 'dynamic',
                        index: compDef.ConnectorIndex,
                    }
                );
                if (compDef.ConnectorIndex !== undefined) {
                    component.ConnectorIndex = compDef.ConnectorIndex;
                }
                break;

            case 'Output':
                component = new Output(
                    tempX, tempY,
                    {
                        type: compDef.jackType || 'audio',
                        jackType: compDef.jackType || 'audio',
                        bandwidth: compDef.bandwidth || 'dynamic',
                        index: compDef.ConnectorIndex,
                    }
                );
                if (compDef.ConnectorIndex !== undefined) {
                    component.ConnectorIndex = compDef.ConnectorIndex;
                }
                break;

            default:
                console.warn(`Unknown component type: ${compDef.componentType}`);
                return null;
        }

        if (!component) return null;

        if (compDef.id !== undefined) {
            component.id = compDef.id.toString();
            component.originalID = compDef.id.toString();
        }

        component.relX = relX;
        component.relY = relY;
        component.parent = panel;
        if (component.setParentModule) component.setParentModule(panel);

        // csoundChannel + начальное значение — только для интерактивных
        if (compDef.id !== undefined) {
            component.parameterId = compDef.id;
            component.moduleId = panel.moduleId;

            const isInteractive = this._isInteractiveComponent(compDef.componentType);
            if (isInteractive) {
                const csoundChannel = `module_${panel.moduleId}_${compDef.id}`;
                component.csoundChannel = csoundChannel;
                this._initializeCsoundValue(component, compDef);
            }

            if (isInteractive && component.onChange !== undefined) {
                const originalOnChange = component.onChange;
                component.onChange = (value) => {
                    if (typeof originalOnChange === 'function') {
                        originalOnChange(value);
                    }
                    if (component.csoundChannel) {
                        component.updateCsoundValue?.(value);
                    }
                };
            }
        }

        return component;
    }

    /**
     * Обновить существующую панель по новому definition (hot-reload).
     *  - Сохраняет moduleId, layer, gridX/gridY, customColor.
     *  - Для существующих компонентов (по id + совпадающий тип) —
     *    обновляет "описание" (x/y/labels/mappingTable/csoundName/jackType/
     *    bandwidth/sourceComponentId/...), НЕ трогая value/isActive/selectedIndex/
     *    connected/cables/csoundChannel.
     *  - Удаляет компоненты, которых нет в новом definition (их кабели
     *    удаляются отдельно — см. reloadUserModules).
     *  - Создаёт новые компоненты через _createOneComponent.
     *
     * @returns {{ added: object[], removed: object[], updated: object[] }}
     */
    refreshPanel(panel, newDefinition) {
        const oldById = new Map();
        for (const c of panel.components) {
            oldById.set(String(c.id), c);
        }

        const added = [];
        const removed = [];
        const updated = [];
        const newComponents = [];

        for (const compDef of newDefinition.components || []) {
            const id = String(compDef.id);
            const old = oldById.get(id);

            if (old && this._sameComponentType(old, compDef.componentType)) {
                // ⭐ Обновить описание, сохранив runtime-состояние
                this._mergeComponentDef(old, compDef, panel);
                newComponents.push(old);
                updated.push(old);
                oldById.delete(id);
            } else {
                // Новый или сменился тип
                const created = this._createOneComponent(compDef, panel);
                if (created) {
                    newComponents.push(created);
                    added.push(created);
                }
            }
        }

        // Всё, что осталось в oldById — удалено из нового definition
        for (const old of oldById.values()) {
            removed.push(old);
        }

        panel.components = newComponents;
        panel.sortComponentsByZIndex?.();

        return { added, removed, updated };
    }

    /**
     * Совпадает ли класс старого компонента с componentType из def.
     * TextEdit в рантайме = ButtonText (см. баг в шапке _addComponentsToPanel).
     */
    _sameComponentType(component, componentType) {
        const cls = component.constructor.name;
        if (cls === componentType) return true;
        if (componentType === 'TextEdit' && cls === 'ButtonText') return true;
        return false;
    }

    /**
     * Перенести "описание" из compDef в существующий компонент.
     * НЕ трогает value / isActive / selectedIndex / connected / cables /
     * csoundChannel / csoundName-если-уже-задан.
     */
    _mergeComponentDef(comp, compDef, panel) {
        // Позиция — всегда
        comp.relX = compDef.x;
        comp.relY = compDef.y;

        switch (compDef.componentType) {
            case 'Knob':
                if (compDef.size !== undefined) comp.sizeParam = compDef.size;
                if (compDef.min !== undefined) comp.min = compDef.min;
                if (compDef.max !== undefined) comp.max = compDef.max;
                if (compDef.infoFunc !== undefined) comp.infoFunc = compDef.infoFunc;
                if (compDef.mappingTable !== undefined) comp.mappingTable = compDef.mappingTable;
                // defaultValue НЕ применяем — пользователь мог крутить
                break;

            case 'Slider':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                if (compDef.min !== undefined) comp.min = compDef.min;
                if (compDef.max !== undefined) comp.max = compDef.max;
                if (compDef.mappingTable !== undefined) comp.mappingTable = compDef.mappingTable;
                break;

            case 'ButtonFlat':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                if (Array.isArray(compDef.labels)) comp.positions = compDef.labels.slice();
                break;

            case 'ButtonRadio':
                if (compDef.buttonCount !== undefined) comp.buttonCount = compDef.buttonCount;
                if (compDef.buttonWidth !== undefined) comp.buttonWidth = compDef.buttonWidth;
                if (Array.isArray(compDef.labels)) comp.labels = compDef.labels.slice();
                if (compDef.orientation !== undefined) comp.orientation = compDef.orientation;
                break;

            case 'ButtonIncDec':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (Array.isArray(compDef.items)) comp.items = compDef.items.slice();
                break;

            case 'ButtonText':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                if (compDef.text !== undefined) comp.text = compDef.text;
                // initialState НЕ применяем
                break;

            case 'TextField':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.referenceElementId !== undefined) comp.targetId = compDef.referenceElementId;
                if (compDef.format !== undefined) comp.format = compDef.format;
                if (compDef.tableName !== undefined) comp.tableName = compDef.tableName;
                if (compDef.modeComponentId !== undefined) comp.modeComponentId = compDef.modeComponentId;
                if (Array.isArray(compDef.tableByMode)) comp.tableByMode = compDef.tableByMode.slice();
                break;

            case 'TextLabel':
                if (compDef.text !== undefined) comp.text = compDef.text;
                if (compDef.fontSize !== undefined) comp.fontSize = compDef.fontSize;
                break;

            case 'TextEdit':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.text !== undefined) comp.text = compDef.text;
                break;

            case 'LED':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                if (compDef.sourceComponentId !== undefined) comp.sourceComponentId = compDef.sourceComponentId;
                if (compDef.ledType !== undefined) comp.ledType = compDef.ledType;
                break;

            case 'MiniVU':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                if (compDef.sourceComponentId !== undefined) comp.sourceComponentId = compDef.sourceComponentId;
                break;

            case 'PartSelector':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                if (Array.isArray(compDef.items)) comp.items = compDef.items.slice();
                // selectedIndex НЕ применяем — пользователь мог выбрать
                break;

            case 'SVG':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                if (compDef.svgSrc !== undefined) comp.svgSrc = compDef.svgSrc;
                if (compDef.color !== undefined) comp.color = compDef.color;
                break;

            case 'Line':
                if (compDef.length !== undefined) comp.length = compDef.length;
                if (compDef.orientation !== undefined) comp.orientation = compDef.orientation;
                if (compDef.width !== undefined) comp.thickness = compDef.width;
                if (compDef.color !== undefined) comp.color = compDef.color;
                break;

            case 'Graph':
                if (compDef.width !== undefined) comp.width = compDef.width;
                if (compDef.height !== undefined) comp.height = compDef.height;
                break;

            case 'LevelShift':
                if (compDef.size !== undefined) comp.sizeParam = compDef.size;
                break;

            case 'Input':
            case 'Output':
                if (compDef.jackType !== undefined) {
                    comp.type = compDef.jackType;
                    comp._jackType = compDef.jackType;
                    comp._isAudioJack = compDef.jackType === 'audio';
                }
                if (compDef.bandwidth !== undefined) comp.bandwidth = compDef.bandwidth;
                if (compDef.ConnectorIndex !== undefined) comp.ConnectorIndex = compDef.ConnectorIndex;
                if (compDef.ConnectorName !== undefined) comp.label = compDef.ConnectorName;
                break;
        }

        // csoundName переносим, только если ещё не задан
        if (compDef.csoundName && !comp.csoundName) {
            comp.csoundName = compDef.csoundName;
        }

        comp.parent = panel;
        if (comp.setParentModule) comp.setParentModule(panel);
    }
}