// src/PatchManager.js
import { Cable } from './Cable.js';

export class PatchManager {
    constructor(system) {
        this.system = system;
        this.cables = [];
        this.draggingCable = null;
        this.startJack = null;
        this.hoverJack = null;
        
        // Цвета кабелей по типам
        this.CABLE_COLORS = {
            audio: '#ef4444',   // Красный
            control: '#3b82f6', // Синий
            logic: '#fde047',   // Желтый
            other: '#ffffff'    // Белый
        };
    }

    // === ОСНОВНЫЕ ОПЕРАЦИИ С КАБЕЛЯМИ ===
    
    addCable(fromJack, toJack) {
        
        // Проверяем возможность подключения
        if (!this.canConnect(fromJack, toJack)) {
            return null;
        }
        
        // Определяем цвет кабеля
        const cableColor = this.determineCableColor(fromJack, toJack);
        
        // Создаем кабель
        const cable = new Cable(fromJack, toJack, cableColor);
        this.cables.push(cable);
        
        // Обновляем состояние джеков
        this.updateJackConnection(fromJack, cable, cableColor);
        this.updateJackConnection(toJack, cable, cableColor);
        
        console.log(`✅ Cable added (color: ${cableColor}). Total: ${this.cables.length}`);
        return cable;
    }
 
    // PatchManager.js - добавить методы:
    getCablesForJack(jack) {
        return this.cables.filter(cable => 
            cable.fromJack === jack || cable.toJack === jack
        );
    }

    disconnectJack(jack) {
        const cables = this.getCablesForJack(jack);
        console.log(`Отключаем ${cables.length} кабелей от джека ${jack.label || jack.id}`);
        
        cables.forEach(cable => {
            this.removeCable(cable);
        });
        
        return cables.length;
    }

    // PatchManager.js
    changeCableColor(jack, colorHex, isVisual = true) {
        const cables = this.getCablesForJack(jack);
        //console.log(`Меняем ${isVisual ? 'визуальный' : 'функциональный'} цвет ${cables.length} кабелей на ${colorHex}`);
        
        cables.forEach(cable => {
            if (isVisual) {
                cable.setVisualColor(colorHex);
            } else {
                // Меняем тип (но лучше не делать это через UI)
                cable.typeColor = colorHex;
            }
            
            // Обновляем цвет центров джеков
            const otherJack = (cable.fromJack === jack) ? cable.toJack : cable.fromJack;
            if (otherJack && otherJack.updateCenterColor) {
                otherJack.updateCenterColor(cable.getDisplayColor());
            }
        });
        
        // Обновляем цвет самого джека
        if (jack.updateCenterColor) {
            jack.updateCenterColor(cables[0]?.getDisplayColor() || '#ffffff');
        }
        
        return cables.length;
    }

    resetCableColors(jack) {
        const cables = this.getCablesForJack(jack);
        
        cables.forEach(cable => {
            cable.resetVisualColor();
            
            // Возвращаем цвет центров к typeColor
            const otherJack = (cable.fromJack === jack) ? cable.toJack : cable.fromJack;
            if (otherJack && otherJack.updateCenterColor) {
                otherJack.updateCenterColor(cable.typeColor);
            }
        });
        
        if (jack.updateCenterColor) {
            // Возвращаем цвет джека к типу первого кабеля
            const defaultColor = cables[0]?.typeColor || 
                               this.CABLE_COLORS[jack.type] || 
                               this.CABLE_COLORS.other;
            jack.updateCenterColor(defaultColor);
        }
        
        return cables.length;
    }

    // Определение цвета кабеля
    determineCableColor(jack1, jack2) {
        // Ищем выходной джек
        let outputJack = null;
        
        if (jack1.direction === 'output') {
            outputJack = jack1;
        } else if (jack2.direction === 'output') {
            outputJack = jack2;
        }
        
        // Если есть выходной джек - берем его цвет
        if (outputJack) {
            return this.CABLE_COLORS[outputJack.type] || this.CABLE_COLORS.other;
        }
        
        // Оба джека - входы
        // Проверяем, есть ли у них уже цветные подключения
        const coloredCable = this.findColoredCable(jack1, jack2);
        if (coloredCable) {
            return coloredCable.color;
        }
        
        // Иначе белый кабель
        return this.CABLE_COLORS.other;
    }
    
    // Поиск уже существующего цветного кабеля у входов
    findColoredCable(jack1, jack2) {
        // Проверяем все кабели джека 1
        for (const cable of jack1.cables) {
            if (cable.color !== this.CABLE_COLORS.other) {
                return cable;
            }
        }
        
        // Проверяем все кабели джека 2
        for (const cable of jack2.cables) {
            if (cable.color !== this.CABLE_COLORS.other) {
                return cable;
            }
        }
        
        return null;
    }
    
    // Обновление состояния джека при подключении
    updateJackConnection(jack, cable, color) {
        jack.addCable(cable);
        jack.updateCenterColor(color);
        
        // Если это входной джек и у него несколько подключений,
        // перекрашиваем все кабели в цвет первого цветного подключения
        if (jack.direction === 'input' && jack.cables.length > 1) {
            this.synchronizeInputCables(jack);
        }
    }
    
    // Синхронизация цветов всех кабелей входного джека
    synchronizeInputCables(inputJack) {
        // Ищем первый цветной кабель
        let targetColor = this.CABLE_COLORS.other;
        for (const cable of inputJack.cables) {
            if (cable.color !== this.CABLE_COLORS.other) {
                targetColor = cable.color;
                break;
            }
        }
        
        // Перекрашиваем все кабели и обновляем центры
        for (const cable of inputJack.cables) {
            if (cable.color !== targetColor) {
                cable.color = targetColor;
                
                // Обновляем цвет центра у второго джека
                const otherJack = (cable.fromJack === inputJack) ? cable.toJack : cable.fromJack;
                if (otherJack) {
                    otherJack.updateCenterColor(targetColor);
                }
            }
        }
        
        // Обновляем цвет центра самого джека
        inputJack.updateCenterColor(targetColor);
    }
    
    removeCable(cable) {
        const index = this.cables.indexOf(cable);
        if (index > -1) {
            // Удаляем ссылки из джеков
            if (cable.fromJack) {
                cable.fromJack.removeCable(cable);
            }
            if (cable.toJack) {
                cable.toJack.removeCable(cable);
            }
            
            // Отключаем кабель
            cable.disconnect();
            this.cables.splice(index, 1);
        }
    }
    
    clear() {
        // Отключаем все кабели от джеков
        this.cables.forEach(cable => {
            if (cable.fromJack) cable.fromJack.removeCable(cable);
            if (cable.toJack) cable.toJack.removeCable(cable);
            cable.disconnect();
        });
        
        this.cables = [];
        //console.log('✅ All cables cleared');
    }

    // === ПРОВЕРКИ СОЕДИНЕНИЙ ===
    
    canConnect(jack1, jack2) {
        //console.log('🔍 canConnect check:');
        //console.log('  Jack1:', jack1.type, jack1.direction, jack1.parentModule?.title);
         //console.log('  Jack2:', jack2.type, jack2.direction, jack2.parentModule?.title);
        // Нельзя подключить к самому себе
        if (jack1 === jack2) {
            console.log('❌ Cannot connect to itself');
            return false;
        }
        
        // Нельзя подключить выход к выходу
        if (jack1.direction === 'output' && jack2.direction === 'output') {
            console.log('❌ Cannot connect output to output');
            return false;
        }
        
        // Проверяем что джеки имеют родительские модули
        if (!jack1.parentModule || !jack2.parentModule) {
            console.error('❌ Jacks must have parent modules');
            return false;
        }
        
        // Проверяем слои (только если модули в разных слоях)
        if (jack1.parentModule.layer !== jack2.parentModule.layer) {
            console.error(`❌ Cross-layer cable: ${jack1.parentModule.layer} ↔ ${jack2.parentModule.layer}`);
            
            if (this.system && this.system.showNotification) {
                const layerNames = { voice: 'VA', fx: 'FX' };
                this.system.showNotification(
                    `❌ Cannot connect ${layerNames[jack1.parentModule.layer]} ↔ ${layerNames[jack2.parentModule.layer]}`
                );
            }
            
            return false;
        }
        
        return true;
    }

    // === ПЕРЕТАСКИВАНИЕ КАБЕЛЕЙ ===
    
    startCableDrag(jack, mouseX, mouseY) {
        //console.log('🔗 START CABLE DRAG:');
        //console.log('  Джек:', jack.label);
        
        // Используем безопасный метод получения центра
        const jackCenter = jack.getCenter ? 
            jack.getCenter() : 
            (jack.center || { x: mouseX, y: mouseY });
        
        //console.log('  Центр джека:', jackCenter);
        //console.log('  Координаты мыши:', { x: mouseX, y: mouseY });
        
        this.startJack = jack;
        this.draggingCable = {
            from: jack,
            to: { x: mouseX, y: mouseY }, // Используем мировые координаты мыши
            isDragging: true
        };
        
        //console.log('  Установлен to:', this.draggingCable.to);
        
        return true;
    }

    updateCableDrag(mouseX, mouseY) {
        if (this.draggingCable) {
            this.draggingCable.to = { x: mouseX, y: mouseY };
        }
    }

    endCableDrag(endJack) {
        if (!this.startJack) {
            console.log('❌ No start jack');
            this.cancelCableDrag();
            return null;
        }
        
        if (!endJack) {
            console.log('❌ No end jack found');
            this.cancelCableDrag();
            return null;
        }

        //console.log('🔍 Attempting to connect:');

        if (!this.canConnect(this.startJack, endJack)) {
            console.log('Connection not allowed');
            this.cancelCableDrag();
            return null;
        }
        
        // Создаем кабель
        const cable = this.addCable(this.startJack, endJack);
        this.cancelCableDrag();

        return cable;
    }

    cancelCableDrag() {
        this.draggingCable = null;
        this.startJack = null;
        this.hoverJack = null;
    }

    // === ОТРИСОВКА ===
    
    draw(ctx, layerName = null) {
        // Рисуем кабели указанного слоя
        //console.log('🎨 PatchManager.draw() called');
        //console.log('  Total cables:', this.cables.length);
        //console.log('  Layer filter:', layerName);
        if (layerName) {
            this.cables.forEach(cable => {
                const fromModule = cable.fromJack?.parentModule;
                const toModule = cable.toJack?.parentModule;
                
                if (!fromModule || !toModule) return;
                
                if (fromModule.layer === layerName && toModule.layer === layerName) {
                    cable.draw(ctx);
                }
            });
        } else {
            // Рисуем все кабели
            this.cables.forEach(cable => cable.draw(ctx));
        }
        
        // Рисуем перетаскиваемый кабель поверх всего
        if (this.draggingCable && this.draggingCable.isDragging) {
            this.drawDraggingCable(ctx);
        }
    }

    drawDraggingCable(ctx, offsetX = 0, offsetY = 0, scale = 1) {
        if (!this.draggingCable) return;
        
        const jack = this.draggingCable.from;
        const from = jack.center || { x: 0, y: 0 };
        const to = this.draggingCable.to;
        
        // Простое преобразование в экранные координаты
        const screenFrom = {
            x: from.x * scale + offsetX,
            y: from.y * scale + offsetY
        };
        
        const screenTo = {
            x: to.x * scale + offsetX,
            y: to.y * scale + offsetY
        };
        
        
        // Рисуем в экранных координатах (без трансформации ctx)
        ctx.strokeStyle = this.CABLE_COLORS[this.draggingCable.from.type] || this.CABLE_COLORS.other;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(screenFrom.x, screenFrom.y);
        
        const midX = (screenFrom.x + screenTo.x) / 2;
        const curveHeight = Math.abs(screenTo.y - screenFrom.y) * 0.4;
        
        if (screenFrom.y < screenTo.y) {
            ctx.bezierCurveTo(
                midX, screenFrom.y - curveHeight,
                midX, screenTo.y + curveHeight,
                screenTo.x, screenTo.y
            );
        } else {
            ctx.bezierCurveTo(
                midX, screenFrom.y + curveHeight,
                midX, screenTo.y - curveHeight,
                screenTo.x, screenTo.y
            );
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }


    // === УТИЛИТЫ ===
    
    findCableById(id) {
        return this.cables.find(c => c.id === id);
    }

    findCablesByModule(moduleId) {
        return this.cables.filter(cable => {
            const fromModuleId = cable.fromJack?.parentModule?.moduleId;
            const toModuleId = cable.toJack?.parentModule?.moduleId;
            
            return fromModuleId === moduleId || toModuleId === moduleId;
        });
    }

    checkCableClick(x, y) {
        for (let i = this.cables.length - 1; i >= 0; i--) {
            if (this.cables[i].contains(x, y)) {
                return this.cables[i];
            }
        }
        return null;
    }
}