import { Panel } from './components/Panel.js';
import { GRID_UNITS } from '../constants.js';

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



// ModuleFactory.js
export class ModuleFactory {
    constructor() {
        this.moduleRegistry = {}; // Здесь будут храниться все определения модулей
        this.nextModuleId = 1; // Для генерации уникальных ID
    }

    // Проверяем, интерактивный ли компонент
    _isInteractiveComponent(componentType) {
        const interactiveTypes = [
            'Knob',
            'ButtonFlat',
            'ButtonRadio',
            'ButtonIncDec',
            'Slider',
            'ButtonText',
            'TextEdit',
            'Slider',
            'Toggle',
            'Button'  // на всякий случай
        ];
        return interactiveTypes.includes(componentType);
    }

    // Инициализируем начальное значение в Csound
    _initializeCsoundValue(component, compDef) {
        // Получаем начальное значение
        let initialValue = 0;
        
        switch (compDef.componentType) {
            case 'Knob':
                initialValue = compDef.defaultValue || 0;
                break;
            case 'ButtonFlat':
            case 'ButtonRadio':
                initialValue = 0; // первая кнопка
                break;
            case 'ButtonText':
                initialValue = compDef.initialState !== undefined ? 
                              (compDef.initialState ? 1 : 0) : 0;
                break;
            // Добавь другие типы по мере необходимости
        }
        
        // Сохраняем в компоненте
        component.initialCsoundValue = initialValue;
        
        // Если у компонента есть метод для отправки в Csound
        if (component.updateCsoundValue) {
            // Отправляем начальное значение
            component.updateCsoundValue(initialValue);
        } else {
            // Создаем метод если его нет
            component.updateCsoundValue = function(value) {
                if (this.csoundChannel && window.csound) {
                    window.csound.setControlChannel(this.csoundChannel, value)
                        .then(() => {}, () => {});
                    
                    //console.log(`🎛️ ${this.csoundChannel} = ${value}`);
                }
            };
            
            // Вызываем для инициализации
            component.updateCsoundValue(initialValue);
        }
    }

    // Регистрация нового типа модуля
    registerModule(type, definition) {
        this.moduleRegistry[type] = definition;
    }

    createModule(type, gridX, gridY, layer = null) {
        const definition = this.moduleRegistry[type];
        
        if (!definition) {
            console.error(`Module type "${type}" not found in registry`);
            return null;
        }

        // Определяем grid размеры модуля
        const gridWidth = 1;
        const gridHeight = definition.gridHeight;
        if (!gridHeight || gridHeight < 1) {
            console.error(`Module ${type}: gridHeight is missing or invalid`, definition);
            return null;
        }
        // Генерируем уникальный ID
        const moduleId = `${type}_${this.nextModuleId++}`;
        
        // Создаем панель с grid координатами
        const panel = new Panel(gridX, gridY, gridWidth, gridHeight, definition.displayName || type);
        
        // Устанавливаем свойства
        panel.moduleId = moduleId;
        panel.layer = layer;
        panel.parentSystem = this.parentSystem;
        
        // Создаем компоненты 
        this._addComponentsToPanel(panel, definition.components);
        
        // Сохраняем оригинальные размеры для масштабирования
        panel.originalPixelWidth = definition.width || (gridWidth * GRID_UNITS.X);
        panel.originalPixelHeight = definition.height || (gridHeight * GRID_UNITS.Y);
        
        return panel;
    }

    // Внутренний метод для добавления компонентов
    _addComponentsToPanel(panel, components) {
        if (!components) return;
        //console.log(`=== Создание компонентов для панели ${panel.title} ===`);
        const createdComponents = []; // Временный массив

        components.forEach((compDef, index) => {
            //console.log(`  [${index}] componentType: ${compDef.componentType}, id: ${compDef.id}`);

            const relX = compDef.x;
            const relY = compDef.y;
            
            // ВРЕМЕННЫЕ координаты (0,0) - они будут исправлены при отрисовке
            const tempX = 0;
            const tempY = 0;

            // Создаем компонент
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

                case 'TextEdit':
                    component = new ButtonText(
                        tempX, tempY,
                        compDef.width || 40,
                        compDef.text || 'Text',
                    );
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
                        compDef.initialState !== undefined ? compDef.initialState : true
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
                    break;
                    
                case 'TextLabel':
                    component = new TextLabel(
                        tempX, tempY,
                        compDef.text || '',
                        compDef.fontSize || 10,
                        compDef.color || '#888'
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

                    component.parent = panel;
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

                case 'PartSelector':
                  
                    try {
                        component = new PartSelector(
                            tempX, tempY,
                            compDef.width || 40,
                            compDef.height || 14,
                            compDef.imageCount || 4,
                            compDef.menuOffset || 0,
                            compDef.menuItems
                        );
                    } catch (error) {
                        console.error('❌ Error creating PartSelector:', error);
                        console.error('Stack:', error.stack);
                        
                        // Fallback: создаем простой PartSelector без menuItems
                        component = new PartSelector(
                            tempX, tempY,
                            compDef.width || 40,
                            compDef.height || 14,
                            compDef.imageCount || 4,
                            compDef.menuOffset || 0,
                            null
                        );
                    }
                    break;

                    case 'Input':
                        component = new Input(
                            tempX, tempY,
                            {
                                type: compDef.jackType || 'audio',
                                jackType: compDef.jackType || 'audio',
                                bandwidth: compDef.bandwidth || 'dynamic',
                                index: compDef.ConnectorIndex, 
                                //onClick: (jack) => console.log(`Input clicked: ${jack.label}`)
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
                                //onClick: (jack) => console.log(`Output clicked: ${jack.label}`)
                            }
                        );
                        if (compDef.ConnectorIndex !== undefined) {
                            component.ConnectorIndex = compDef.ConnectorIndex;
                        }                 
                        break;
                    
                default:
                    console.warn(`Unknown component type: ${compDef.componentType}`);
                    return;
            }

            // === ВАЖНО: Добавить сюда блок для ВСЕХ компонентов ===
            // Проверяем, создан ли компонент
            if (!component) {
                console.error(`Failed to create component of type ${compDef.componentType}`);
                return;
            }

            // Сохраняем ID для ВСЕХ компонентов
            if (compDef.id !== undefined) {
                component.id = compDef.id.toString();
                component.originalID = compDef.id.toString();
                //console.log(`✅ Component ID set: ${component.id} for ${compDef.componentType}`);
            }

            // Сохраняем ОТНОСИТЕЛЬНЫЕ координаты компонента
            component.relX = relX;
            component.relY = relY;

            // Устанавливаем родительский модуль
            component.parent = panel;
            if (component.setParentModule) {
                component.setParentModule(panel);
            }

            // Сохраняем ID для ЛЮБОГО компонента
            if (compDef.id !== undefined) {
                // Для всех компонентов сохраняем ID
                if (!component.id) {
                    component.id = compDef.id.toString();
                }
                if (!component.originalID) {
                    component.originalID = compDef.id.toString();
                }
                
                // Также сохраняем для Csound (только для интерактивных)
                component.parameterId = compDef.id;
                component.moduleId = panel.moduleId;
                
                // Проверяем, интерактивный ли это компонент
                const isInteractive = this._isInteractiveComponent(compDef.componentType);
                
                if (isInteractive) {
                    // Создаем Csound канал
                    const csoundChannel = `module_${panel.moduleId}_${compDef.id}`;
                    component.csoundChannel = csoundChannel;
                    
                    //console.log(`📻 Csound channel created: ${csoundChannel}`);
                    
                    // Инициализируем начальное значение
                    this._initializeCsoundValue(component, compDef);
                }

                if (isInteractive && component.onChange !== undefined) {
                    const originalOnChange = component.onChange;
                    component.onChange = (value) => {
                        if (typeof originalOnChange === 'function') {
                            originalOnChange(value);
                        }
                        
                        // Отправляем в Csound
                        if (component.csoundChannel) {
                            component.updateCsoundValue?.(value);
                        }
                    };
                }
            }

            panel.addComponent(component);
        });
    }
}