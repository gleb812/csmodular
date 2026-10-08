// src/PatchLoader.js
    
import { createFileInput, triggerFileInput } from './utils/fileInput.js';

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
        
        // Очищаем текущий патч
        this.clearCurrentPatch();
        
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
        
        return this.moduleMap;
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
        const moduleId = moduleDef.id;
        const area = moduleDef.area;
        const hpos = moduleDef.hpos || 0;
        const vpos = moduleDef.vpos || 0;
        
        // Проверяем валидность данных
        if (!moduleName) {
            console.error('❌ Module name is missing');
            return null;
        }
        
        // Конвертируем area в layer
        const layerName = area.toUpperCase() === 'FX' ? 'fx' : 'voice';
        
        // Загружаем модуль если нужно
        await this.ensureModuleLoaded(moduleName);
        
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
    
    ensureModuleLoaded(moduleName) {
        
        if (!this.moduleFactory.moduleRegistry[moduleName]) {
            return this.loadModuleFile(moduleName);
        } else {
            return Promise.resolve(true);
        }
    }

// src/PatchLoader.js - обновлённый loadModuleFile()

    async loadModuleFile(moduleName) {
        try {
            // ⭐ Сначала пробуем загрузить из modules/user/ (пользовательский)
            try {
                const userPath = `../modules/user/${moduleName}.js`;
                console.log(`   Trying user path: ${userPath}`);
                const module = await import(/* @vite-ignore */ userPath);
                const moduleKey = Object.keys(module)[0];
                if (moduleKey && module[moduleKey]) {
                    this.moduleFactory.registerModule(moduleName, module[moduleKey]);
                    console.log(`✅ User module ${moduleName} registered from modules/user/`);
                    return true;
                }
            } catch (userError) {
                // Не нашли в user — пробуем встроенный
                console.log(`   Not in user/, trying built-in...`);
            }
            
            // ⭐ Пробуем загрузить из modules/ (встроенный)
            const modulePath = `../modules/${moduleName}.js`;
            console.log(`   Trying built-in path: ${modulePath}`);
            const module = await import(/* @vite-ignore */ modulePath);
            const moduleKey = Object.keys(module)[0];

            if (moduleKey && module[moduleKey]) {
                this.moduleFactory.registerModule(moduleName, module[moduleKey]);
                console.log(`✅ Built-in module ${moduleName} registered`);
                return true;
            }
            
            throw new Error('Module not found in file');
        } catch (error) {
            console.error(`❌ Failed to load module ${moduleName}:`, error);
            throw error;
        }
    }
    
    findModulePosition(layerName, preferredX, preferredY) {
        if (this.system.isGridCellFree(layerName, preferredX, preferredY, 1, 1)) {
            return { x: preferredX, y: preferredY };
        }
        
        const freeSpace = this.system.findFreeSpace(layerName, 1, 1, preferredX, preferredY);
        if (freeSpace) {
            console.log(`Position occupied, moving to [${freeSpace.gridX}, ${freeSpace.gridY}]`);
            return freeSpace;
        }
        
        return { x: preferredX, y: preferredY };
    }
    
    configureModule(module, moduleDef, moduleId) {
        
        // Сохраняем JSON данные
        module.jsonId = moduleId;
        module.jsonName = moduleDef.name;
        
        // Родительская система
        module.parentSystem = this.system;
        
        // Добавляем в систему
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