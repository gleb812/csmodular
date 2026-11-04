// src/PatchLoader.js
import { PANEL_GRID_WIDTH } from './constants.js';
import { createFileInput, triggerFileInput } from './utils/fileInput.js';
import { Sticker } from './stickers/Sticker.js';
import { libraryStore } from './api/index.js';
export class PatchLoader {
    constructor(system) {
        this.system = system;
        this.moduleFactory = system.moduleFactory;
        this.patchManager = system.patchManager;
        this.moduleMap = {
            byId: {},        // Основная карта по ID: { [id]: module }
            byLayer: {       // Карта по слоям
                voice: [],
                fx: []
            }
        };
    }


    // === ЗАГРУЗКА ПАТЧЕЙ ===
    
    async loadPatch(patchData) {
        // Проверка структуры данных
        if (!patchData || typeof patchData !== 'object') {
            console.error('❌ Patch data is not an object:', patchData);
            throw new Error('Invalid patch data format');
        }
        
        if (!patchData.modules || !Array.isArray(patchData.modules)) {
            console.error('❌ No modules array found in patch data');
            throw new Error('Patch data missing modules array');
        }
        
        console.log(`📦 Found ${patchData.modules.length} modules, ${patchData.cables?.length || 0} cables`);
        
        this.clearCurrentPatch();

        // ⭐ Предварительный проход: ищем самый нижний Voice
        let maxVoiceY = 0;
        for (const moduleDef of patchData.modules) {
            const isVoice = (moduleDef.area || 'VOICE').toUpperCase() !== 'FX';
            if (isVoice) {
                const bottom = (moduleDef.vpos || 0) + 2;   // +2 — примерная высота
                if (bottom > maxVoiceY) maxVoiceY = bottom;
            }
        }
          
        // ⭐ Куда класть FX: после самого нижнего Voice + gap
        const FX_START_Y = maxVoiceY + 10;
        this._fxStartY = FX_START_Y;   // сохраняем для createModuleFromDef

        // Шаг 1: Загружаем модули
        const moduleLoadResults = [];
        for (let i = 0; i < patchData.modules.length; i++) {
            const moduleDef = patchData.modules[i];
            console.log(`\n📦 Module ${i + 1}/${patchData.modules.length}:`, {
                name: moduleDef.name,
                id: moduleDef.id,
                area: moduleDef.area,
                hpos: moduleDef.hpos,
                vpos: moduleDef.vpos
            });
            
            try {
                const startTime = performance.now();
                const module = await this.createModuleFromDef(moduleDef);
                const endTime = performance.now();
                
                moduleLoadResults.push({
                    success: !!module,
                    name: moduleDef.name,
                    id: moduleDef.id,
                    time: endTime - startTime
                });
            } catch (error) {
                console.error(`💥 Error creating module ${moduleDef.name}:`, error);
                moduleLoadResults.push({
                    success: false,
                    name: moduleDef.name,
                    error: error.message
                });
            }
        }
        
        // Отчет о загрузке модулей
        console.log('\n📊 MODULE LOAD REPORT:');
        const successful = moduleLoadResults.filter(r => r.success).length;
        const failed = moduleLoadResults.filter(r => !r.success).length;
        console.log(`✅ Successful: ${successful}, ❌ Failed: ${failed}`);
        
        // Шаг 2: Создаем кабели
        if (patchData.cables && patchData.cables.length > 0) {
            console.log(`\n🔌 Creating ${patchData.cables.length} cables...`);
            this.createCables(patchData.cables);
        } else {
            console.log('📭 No cables to create');
        }

        // ⭐ Шаг 3: Стикеры
        if (Array.isArray(patchData.stickers) && patchData.stickers.length > 0) {
            console.log(`\n📌 Loading ${patchData.stickers.length} stickers...`);
            this.loadStickers(patchData.stickers);
        }

        // ⭐ Шаг 4: применить варианты ко всем модулям (перекраска джеков
        //          без ожидания первого кабеля)
        if (this.system.recomputeVariantUI) {
            try {
                await this.system.recomputeVariantUI();
            } catch (e) {
                console.warn('[PatchLoader] recomputeVariantUI failed:', e);
            }
        }

        // ⭐ Сбрасываем viewport, чтобы модули были видны сразу
        if (typeof this.system.resetZoom === 'function') {
            this.system.resetZoom();
        }
        this.system.forceRedraw?.();
        // ⭐ Пересобираем ORC, если Csound запущен
        if (this.system.csoundEngine?.state === 'running') {
            this.system._recompileDebounced?.();
        }

        return this.moduleMap;
    }

    loadStickers(stickersData) {
        if (!Array.isArray(stickersData)) return;
        this.system.stickers = stickersData.map(data => new Sticker(data));
        this.system.forceRedraw();
        console.log(`✅ Loaded ${this.system.stickers.length} stickers`);
    }


    clearCurrentPatch() {
        // Удаляем все модули из системы
        const modulesToRemove = this.system.components.filter(comp => 
            comp.constructor.name === 'Panel'
        );
        
        modulesToRemove.forEach(module => {
            this.system.removeModule(module);
        });
        
        // Очищаем кабели
        this.patchManager.clear();

        // ⭐ Очищаем стикеры
        if (this.system) {
            this.system.stickers = [];
            this.system.selectedSticker = null;
        }
 
        // Сбрасываем moduleMap
        this.moduleMap = {
            byId: {},
            byLayer: {
                voice: [],
                fx: []
            }
        };
    }
    
    // === СОЗДАНИЕ МОДУЛЕЙ ===
    
    async createModuleFromDef(moduleDef) {
        
        const moduleName = moduleDef.name;
        const moduleLibrary = moduleDef.library || null;  
        const moduleId = moduleDef.id;
        const area = moduleDef.area;
        const hpos = moduleDef.hpos || 0;
        let vpos = moduleDef.vpos || 0;  
        
        // Проверяем валидность данных
        if (!moduleName) {
            console.error('❌ Module name is missing');
            return null;
        }
        
        // Конвертируем area в layer
        const layerName = area.toUpperCase() === 'FX' ? 'fx' : 'voice';

        // ⭐ Для FX: сдвигаем Y, чтобы модуль был ниже всех Voice
        if (layerName === 'fx') {
            const fxStartY = this._fxStartY || 0;
            vpos = fxStartY + vpos;   // оригинальный vpos FX — это offset внутри FX-зоны
        }

        await this.ensureModuleLoaded(moduleName, moduleLibrary);
        
        // Находим позицию
        const position = this.findModulePosition(layerName, hpos, vpos);
        
        // Создаем модуль
        const module = this.moduleFactory.createModule(moduleName, position.x, position.y, layerName);
        
        if (!module) {
            console.error(`❌ ModuleFactory failed to create module ${moduleName}`);
            console.log('ModuleFactory registry keys:', Object.keys(this.moduleFactory.moduleRegistry));
            return null;
        }
        
        // Устанавливаем слой явно (на всякий случай)
        module.layer = layerName;
        
        // Настраиваем модуль
        this.configureModule(module, moduleDef, moduleId);
        
        console.log(`✅ Module ${moduleName} created successfully`);
        return module;
    }
    
    ensureModuleLoaded(moduleName, preferredLib = null) {
        if (this.moduleFactory.moduleRegistry[moduleName]) {
            return Promise.resolve(true);
        }
        return this.loadModuleFile(moduleName, preferredLib);
    }

    async loadModuleFile(moduleName, lib = null) {
        try {
            // ⭐ 1. Если патч требует конкретную библиотеку
            if (lib) {
                // Проверим, установлена ли библиотека
                const libs = await libraryStore.listLibraries();
                const libExists = libs.some(l => l.name === lib);
                if (!libExists) {
                    throw new Error(
                        `Patch requires library "${lib}" — not installed. ` +
                        `Install it or remove the module.`
                    );
                }

                // Пробуем загрузить
                if (await this.moduleFactory.loadModule(lib, moduleName)) {
                    // ⭐ Проверим, что registry реально взял из lib
                    const registered = this.moduleFactory.moduleRegistry[moduleName];
                    if (registered && registered.library !== lib) {
                        // Коллизия: type уже был загружен из другой библиотеки
                        throw new Error(
                            `Module "${moduleName}" from library "${lib}" conflicts with ` +
                            `already-loaded "${registered.library}/${moduleName}" ` +
                            `(Csound opcode "${moduleName}" is global — only one can be loaded). ` +
                            `Remove the conflicting module or use a different type.`
                        );
                    }
                    return true;
                }

                throw new Error(
                    `Module "${moduleName}" not found in library "${lib}" ` +
                    `(library is installed, but module is missing).`
                );
            }

            // ⭐ 2. Без library в патче (v1) — старый fallback
            if (await this.moduleFactory.loadModule('user', moduleName)) {
                return true;
            }
            const all = await libraryStore.listLibraries();
            for (const entry of all) {
                if (await this.moduleFactory.loadModule(entry.name, moduleName)) {
                    console.warn(
                        `[PatchLoader] "${moduleName}" loaded from fallback "${entry.name}" ` +
                        `(patch has no "library" field — legacy v1)`
                    );
                    return true;
                }
            }

            throw new Error(
                `Module "${moduleName}" not found in any installed library.`
            );
        } catch (error) {
            console.error(`❌ Failed to load module ${moduleName}:`, error);
            throw error;
        }
    }
    
    findModulePosition(layerName, preferredX, preferredY) {
        if (this.system.isGridCellFree(layerName, preferredX, preferredY, PANEL_GRID_WIDTH, 1)) {
            return { x: preferredX, y: preferredY };
        }
        
        const freeSpace = this.system.findFreeSpace(layerName, PANEL_GRID_WIDTH, 1, preferredX, preferredY);
        if (freeSpace) {
            console.log(`Position occupied, moving to [${freeSpace.gridX}, ${freeSpace.gridY}]`);
            return freeSpace;
        }
        
        return { x: preferredX, y: preferredY };
    }
    
    configureModule(module, moduleDef, moduleId) {
        
        module.jsonId = moduleId;
        module.jsonName = moduleDef.name;
        module.parentSystem = this.system;
        module.library = moduleDef.library || registryDef?.library || null;

        const registryDef = this.system.moduleFactory.moduleRegistry[moduleDef.name];
        const typeId = registryDef?.type || moduleDef.name;
        if (this.system.csoundGen) {
            this.system.csoundGen.addModule({
                typeId,
                instanceId: moduleId,
                instanceName: moduleDef.name,
                layer: module.layer,
                parameters: this._parseParameters(moduleDef.parameters),
                mode: this._parseModes(moduleDef.modes),
                defaultParams: registryDef?.defaultParams || [0],
                defaultMode: registryDef?.mode || [],
                inlets: registryDef?.inputs || 1,
                outlets: registryDef?.outputs || 1,
                isUser: registryDef?.isUser === true,
            });
        }

        // ВАЖНО: Добавляем в layerManager, а не в старый system.layers
        if (this.system.layerManager && this.system.layerManager.layers[module.layer]) {
            this.system.layerManager.layers[module.layer].modules.push(module);
        } else {
            // Fallback для совместимости
            this.system.layers[module.layer].modules.push(module);
        }
        
        // Добавляем в общий массив components
        this.system.components.push(module);
        
        // Сохраняем в moduleMap
        this.moduleMap.byId[moduleId] = module;
        this.moduleMap.byLayer[module.layer].push(module);

        // Устанавливаем parentModule для ВСЕХ компонентов
        let parentModuleSetCount = 0;
        
        module.components.forEach((component) => {
            // ВАЖНО: Используем setParentModule из BaseJack
            if (component.setParentModule) {
                component.setParentModule(module);
                parentModuleSetCount++;
            }
            
            // Устанавливаем parameterId из id компонента
            if (component.id !== undefined) {
                component.parameterId = parseInt(component.id) || 0;
            }
        });

        // ⭐ Пересоздаём csoundChannel с правильным jsonId.
        // ModuleFactory создал канал с panel.moduleId (внутренний счётчик),
        // а CsoundGenerator.formatModuleLine использует module.jsonId (из патча).
        module.components.forEach((component) => {
            if (component.csoundChannel && component.id !== undefined) {
                component.csoundChannel =
                    `module_${moduleDef.name}_${moduleId}_${component.id}`;
            }
        });

        // ⭐ Применяем сохранённые параметры (Knob/Slider/Button*)
        if (moduleDef.parameters) {
            this.applyParameters(module, moduleDef.parameters);
        }

        if (moduleDef.customColor) {
            // ⭐ Новый формат: отдельное поле
            module.customColor = moduleDef.customColor;
            //console.log(`🎨 Loaded color from customColor field: ${moduleDef.customColor}`);
        } else if (moduleDef.parameters) {
            // Fallback: старый формат — цвет в конце parameters
            try {
                const parameters = JSON.parse(moduleDef.parameters);
                const lastParam = parameters[parameters.length - 1];
                // ⭐ Принимаем hex, hsl, rgb
                if (typeof lastParam === 'string' && (
                    lastParam.startsWith('#') ||
                    lastParam.startsWith('hsl') ||
                    lastParam.startsWith('rgb')
                )) {
                    module.customColor = lastParam;
                    //console.log(`🎨 Loaded color from parameters: ${lastParam}`);
                }
            } catch (error) {}
        }

        // ⭐ Регистрируем LED/MiniVU-каналы (как в main.addNewModuleAtPosition)
        if (this.system.csoundEngine && module.components) {
            const leds = module.components.filter(c => c.constructor.name === 'LED');
            leds.forEach(led => {
                if (led.sourceComponentId === null || led.sourceComponentId === undefined) return;
                const channelName = `led_${moduleDef.name}_${moduleId}_${led.id}`;
                led.sourceChannel = channelName;
                this.system.csoundEngine.registerLedChannel(channelName);
            });

            const mvus = module.components.filter(c => c.constructor.name === 'MiniVU');
            mvus.forEach(mvu => {
                if (mvu.sourceComponentId === null || mvu.sourceComponentId === undefined) return;
                const channelName = `mvu_${moduleDef.name}_${moduleId}_${mvu.id}`;
                mvu.sourceChannel = channelName;
                this.system.csoundEngine.registerLedChannel(channelName);
            });
        }

    }

    _parseParameters(raw) {
        if (!raw) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch { return []; }
    }

    _parseModes(raw) {
        if (!raw) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch { return []; }
    }


    applyParameters(module, parametersString) {
        try {
            const parameters = JSON.parse(parametersString);
            module.components.forEach(component => {
                if (component.parameterId !== undefined) {
                    const paramIndex = component.parameterId;
                    if (paramIndex >= 0 && paramIndex < parameters.length) {
                        const value = parameters[paramIndex];
                        if (component.setValue) component.setValue(value);
                        else if (component.value !== undefined) component.value = value;
                    }
                }
            });
        } catch (error) {
            console.error('Failed to parse parameters:', error);
        }
    }
    
    // === СОЗДАНИЕ КАБЕЛЕЙ ===
    
    createCables(cablesData) {
        let success = 0;
        let fail = 0;
        
        for (const cableDef of cablesData) {
            try {
                const created = this.createCable(cableDef);
                if (created) success++;
                else fail++;
            } catch (error) {
                console.error('Error creating cable:', error);
                fail++;
            }
        }
        
        console.log(`Cables: ${success} created, ${fail} failed`);
    }

    debugModuleMap() {
        
        console.log('\n--- DETAILED BY ID ---');
        Object.entries(this.moduleMap.byId).forEach(([id, module]) => {
            console.log(`  ${id}: ${module.jsonName || module.title} (layer: ${module.layer})`);
        });
        
        console.log('\n--- DETAILED BY LAYER ---');
        console.log('Voice:');
        this.moduleMap.byLayer.voice.forEach(module => {
            console.log(`  ${module.jsonId}: ${module.jsonName || module.title}`);
        });
        
        console.log('\nFX:');
        this.moduleMap.byLayer.fx.forEach(module => {
            console.log(`  ${module.jsonId}: ${module.jsonName || module.title}`);
        });
    }

    // Создает карту соответствия: индекс джека -> реальный компонент
    buildJackIndexMap(module, direction) {
        // Собираем джеки нужного направления
        const jacks = [];
        
        module.components.forEach(component => {
            const compType = component.constructor?.name;
            const isInput = compType === 'Input';
            const isOutput = compType === 'Output';
            
            if ((direction === 'input' && isInput) ||
                (direction === 'output' && isOutput)) {
                jacks.push(component);
            }
        });
        
        // Сортируем по ID компонента (как в оригинальной системе)
        jacks.sort((a, b) => {
            // Сначала пробуем по числовому ID
            const idA = parseInt(a.id || a.originalID || '0');
            const idB = parseInt(b.id || b.originalID || '0');
            return idA - idB;
        });
        
        // Создаем карту: индекс -> компонент
        const indexMap = {};
        jacks.forEach((jack, index) => {
            indexMap[index] = jack;
        });
        
        return indexMap;
    }

    findJackByIndex(module, jackIndex, direction) {
        
        // Создаем карту индексов для этого модуля
        const indexMap = this.buildJackIndexMap(module, direction);
        
        if (indexMap[jackIndex]) {
            const jack = indexMap[jackIndex];
            console.log(`✅ Found: ${jack.label || 'unnamed'} (Component ID: ${jack.id}, Index: ${jackIndex})`);
            return jack;
        }
        
        console.error(`❌ Jack index ${jackIndex} not found. Available ${direction} jacks: ${Object.keys(indexMap).length}`);
        return null;
    }

    // PatchLoader.js - ТОЧНЫЙ ПОИСК:
    // PatchLoader.js - ЗАМЕНИ существующий метод findJackByPin на этот:

    findJackByPin(module, connectorIndex, pin) {
    
        // Определяем тип компонента по pin
        const targetType = pin === 'out' ? 'Output' : 'Input';
        
        // Собираем ВСЕ джеки нужного типа
        const allJacks = [];
        module.components.forEach(component => {
            const compType = component.constructor?.name;
            if (compType === targetType) {
                allJacks.push(component);
            }
        });
        
        // Сортируем по ID (как в оригинальной системе)
        const sortedJacks = [...allJacks];
        sortedJacks.sort((a, b) => {
            const idA = parseInt(a.id || a.originalID || '0');
            const idB = parseInt(b.id || b.originalID || '0');
            return idA - idB;
        });
        
        
        // Ищем по индексу в ОТСОРТИРОВАННОМ массиве
        const targetIndex = parseInt(connectorIndex);
        
        if (targetIndex >= 0 && targetIndex < sortedJacks.length) {
            const foundJack = sortedJacks[targetIndex];

            // Убедимся, что джек ссылается на модуль
            if (!foundJack.parentModule) {
                foundJack.parentModule = module;
                foundJack.module = module;
            }
            
            return foundJack;
        }
        
        // Если не нашли
        console.error(`   ❌ ДЖЕК НЕ НАЙДЕН! Индекс ${targetIndex} вне диапазона 0-${sortedJacks.length - 1}`);
        console.log(`   Доступные индексы: ${sortedJacks.length > 0 ? `0..${sortedJacks.length - 1}` : 'нет джеков'}`);
        console.log(`🔍 === ПОИСК ЗАВЕРШЕН НЕУДАЧНО ===\n`);
        
        return null;
    }

    createCable(cableDef) {
        console.log(`🔗 createCable:`, {
            fromId: cableDef.from?.id,
            toId: cableDef.to?.id,
            fromJack: cableDef.from?.jack,
            toJack: cableDef.to?.jack
        });
        
        const fromModuleId = cableDef.from.id;
        const toModuleId = cableDef.to.id;
        const fromConnectorIndex = cableDef.from.jack;
        const toConnectorIndex = cableDef.to.jack;
        const fromPin = cableDef.from.pin;
        const toPin = cableDef.to.pin;
        
        // Ищем модули в исправленной структуре

        
        const fromModule = this.moduleMap.byId[fromModuleId];
        const toModule = this.moduleMap.byId[toModuleId];
        
        if (!fromModule || !toModule) {
            console.error(`❌ Modules not found in moduleMap!`);
            console.error(`   fromModuleId ${fromModuleId}:`, !!fromModule);
            console.error(`   toModuleId ${toModuleId}:`, !!toModule);
            
            // Покажем какие модули есть
            Object.entries(this.moduleMap.byId).forEach(([id, module]) => {
                console.log(`     ${id}: ${module.jsonName || module.title} (layer: ${module.layer})`);
            });
            
            return false;
        }
        
        // Проверяем, что модули в одном слое
        if (fromModule.layer !== toModule.layer) {
            console.error(`❌ Cross-layer cable not allowed: ${fromModule.layer} ↔ ${toModule.layer}`);
            return false;
        }

        // Ищем джеки (теперь с подробным логированием внутри)
        const fromJack = this.findJackByPin(fromModule, fromConnectorIndex, fromPin);
        const toJack = this.findJackByPin(toModule, toConnectorIndex, toPin);
        
        if (!fromJack || !toJack) {
            console.error('❌ Failed to find jacks');
            console.error(`   fromJack:`, !!fromJack);
            console.error(`   toJack:`, !!toJack);
            return false;
        }
        
        // Создаем кабель
        const cable = this.patchManager.addCable(fromJack, toJack);
        
        if (cable) {
            // Если есть customColor - устанавливаем
            if (cableDef.customColor) {
                cable.setVisualColor(cableDef.customColor);
            }
            return true;
        } else {
            console.error(`❌ PatchManager failed to create cable`);
            return false;
        }
    }
    

    findJackById(module, jackId, direction) {
        
        // jackId - число из JSON, нужно преобразовать в строку
        const targetId = jackId.toString();
        
        let foundJack = null;
        
        module.components.forEach(component => {
            const compType = component.constructor?.name;
            const isInput = compType === 'Input';
            const isOutput = compType === 'Output';
            
            const isRightType = (direction === 'input' && isInput) ||
                               (direction === 'output' && isOutput);
            
            if (isRightType && component.id === targetId) {
                foundJack = component;
                console.log(`✅ Нашли: ${compType} id=${component.id}`);
            }
        });
        
        if (foundJack) {
            // Убедимся, что джек ссылается на модуль
            if (!foundJack.parentModule) {
                foundJack.parentModule = module;
                foundJack.module = module;
            }
            return foundJack;
        }
        
        // Если не нашли, покажем какие джеки есть
        console.error(`❌ Джек с ID ${jackId} (как строка: "${targetId}") не найден`);
        console.log(`Доступные джеки в модуле:`);
        
        module.components.forEach(component => {
            const compType = component.constructor?.name;
            if (compType === 'Input' || compType === 'Output') {
                console.log(`  ${compType}: id="${component.id}", type=${component.type}`);
            }
        });
        
        return null;
    }

    findJackInModule(module, jackIndex, direction) {
        
        // Ищем джек по свойству index
        let targetJack = null;
        
        module.components.forEach((component, idx) => {
            const compType = component.constructor?.name;
            const isInput = compType === 'Input';
            const isOutput = compType === 'Output';
            
            // Проверяем тип
            const isRightType = (direction === 'input' && isInput) ||
                               (direction === 'output' && isOutput);
            
            if (isRightType) {
                // Сравниваем индекс (оба как числа для надежности)
                if (component.index !== undefined && 
                    parseInt(component.index) === parseInt(jackIndex)) {
                    targetJack = component;
                }
            }
        });
        
        if (targetJack) {
            // УБЕДИМСЯ ЧТО ДЖЕК ИМЕЕТ ССЫЛКУ НА МОДУЛЬ
            if (!targetJack.parentModule) {
                console.log(`   ⚠️ Jack has no parentModule reference, setting to: ${module.title || module.jsonName}`);
                targetJack.parentModule = module;
                targetJack.module = module;
            }
            return targetJack;
        }
        
        // Если не нашли по index, покажем какие джеки есть
        console.error(`   ❌ Jack with index ${jackIndex} not found in ${module.title || module.jsonName}`);
        console.log(`   Available ${direction} jacks:`);
        
        module.components.forEach((component, idx) => {
            const compType = component.constructor?.name;
            const isInput = compType === 'Input';
            const isOutput = compType === 'Output';
            
            const isRightType = (direction === 'input' && isInput) ||
                               (direction === 'output' && isOutput);
            
            if (isRightType) {
                console.log(`      [${idx}] ${compType}: index=${component.index}, id=${component.id}, type=${component.type || component.jackType}`);
            }
        });
        
        return null;
    }


    findJackByConnectorIndex(module, connectorIndex, direction) {
        // Ищем джек с нужным ConnectorIndex
        let targetJack = null;
        
        module.components.forEach(component => {
            const compType = component.constructor?.name;
            const isInput = compType === 'Input';
            const isOutput = compType === 'Output';
            
            const isRightType = (direction === 'input' && isInput) ||
                               (direction === 'output' && isOutput);
            
            if (isRightType && component.index !== undefined) {
                // Сравниваем ConnectorIndex (оба как числа)
                const compIndex = parseInt(component.index);
                const targetIndex = parseInt(connectorIndex);
                
                console.log(`   Checking ${compType}: ConnectorIndex=${component.index} (as number: ${compIndex}), ID=${component.id}`);
                
                if (compIndex === targetIndex) {
                    targetJack = component;
                    console.log(`   ✅ Found! ${compType} with ConnectorIndex ${component.index}`);
                }
            }
        });
        
        if (targetJack) {
            // Убедимся что джек имеет ссылку на модуль
            if (!targetJack.parentModule) {
                targetJack.parentModule = module;
                targetJack.module = module;
            }
            
            console.log(`   ✅ Found jack: ${targetJack.label || 'unnamed'} (ConnectorIndex: ${targetJack.index}, Type: ${targetJack.type})`);
            return targetJack;
        }
        
        // Если не нашли, покажем какие джеки есть
        console.error(`   ❌ Jack with ConnectorIndex ${connectorIndex} not found`);
        console.log(`   Available ${direction} jacks with ConnectorIndex:`);
        
        module.components.forEach(component => {
            const compType = component.constructor?.name;
            const isInput = compType === 'Input';
            const isOutput = compType === 'Output';
            
            const isRightType = (direction === 'input' && isInput) ||
                               (direction === 'output' && isOutput);
            
            if (isRightType) {
                console.log(`      ${compType}: ConnectorIndex=${component.index}, ID=${component.id}, Type=${component.type}`);
            }
        });
        
        return null;
    }

  
    // === УТИЛИТЫ ===
    
    mapColor(colorName) {
        const colorMap = {
            'red': '#ff0000',
            'green': '#00ff00',
            'blue': '#0000ff',
            'yellow': '#ffff00',
            'orange': '#ffa500',
            'purple': '#800080',
            'cyan': '#00ffff',
            'magenta': '#ff00ff'
        };
        
        return colorMap[(colorName || 'red').toLowerCase()] || colorMap.red;
    }
    
    // === ЗАГРУЗКА ФАЙЛОВ JSON ===


    async loadPatchFromFile() {
        return new Promise((resolve) => {
            const input = createFileInput();

            triggerFileInput(input, async (file) => {
                try {
                    const text = await file.text();
                    const patchData = JSON.parse(text);

                    await this.loadPatch(patchData);
                    resolve({ success: true, filename: file.name, data: patchData });

                } catch (error) {
                    resolve({ success: false, error: error.message });
                }
            });
        });
    }

}