// src/Cable.js
export class Cable {
    constructor(fromJack, toJack, color = '#ffffff') {
        this.id = `cable_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.fromJack = fromJack;
        this.toJack = toJack;
        // цвет по типу джека
        this.typeColor = color; // audio=red, control=blue, logic=yellow
        // кастомный, для красоты
        this.visualColor = null; // null = использовать typeColor
        
        this.isActive = true;

        // Флаг для отслеживания первого вызова draw
        this.firstDrawCall = true;

        //console.log('🔌 Cable constructor called:');
        //console.log('  ID:', this.id);
        const fromCenter = this.getJackCenter(fromJack);
        const toCenter = this.getJackCenter(toJack);
            // Вычисляем уникальный коэффициент ОДИН РАЗ при создании
        const uniqueHash = this.id.split('').reduce((acc, char) => 
            (acc << 5) - acc + char.charCodeAt(0), 0
        ) & 0xFFFF;
        this.randomFactor = (uniqueHash % 1000) / 1000; // 0.0 - 0.999

    }

    getDisplayColor() {
        // Если есть кастомный цвет - используем его, иначе функциональный
        return this.visualColor || this.typeColor;
    }
    
    setVisualColor(colorHex) {
        this.visualColor = colorHex;
    }
    
    resetVisualColor() {
        this.visualColor = null; // Возвращаемся к typeColor
    }


    // Получаем координаты центра джека
    getJackCenter(jack) {
        if (!jack) return { x: 0, y: 0 };
        
        // Если у джека есть метод center, используем его
        if (jack.center) {
            return jack.center;
        }

        // Иначе вычисляем вручную
        let offsetX = 0;
        let offsetY = 0;
        
        if (jack.parentModule) {
            offsetX = jack.parentModule.x || 0;
            offsetY = jack.parentModule.y || 0;
        }
        
        return {
            x: offsetX + (jack.x || 0) + (jack.width || 12) / 2,
            y: offsetY + (jack.y || 0) + (jack.height || 12) / 2
        };
    }


    draw(ctx) {
        if (!this.isActive) return;
        
        const from = this.getJackCenter(this.fromJack);
        const to = this.getJackCenter(this.toJack);

        const randomFactor = this.randomFactor;

        ctx.strokeStyle = this.getDisplayColor();
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        
        const midX = (from.x + to.x) / 2;
        const baseCurveHeight = Math.abs(to.y - from.y) * 0.4;
        
        // Добавляем случайность
        const curveVariation = (randomFactor - 0.5) * 0.2; // ±10% вариации
        const curveHeight = baseCurveHeight * (1 + curveVariation);
        
        // Случайное смещение по X для контрольных точек
        const xOffset = (randomFactor - 0.5) * 30; // ±15 пикселей
        
        if (from.y < to.y) {
            ctx.bezierCurveTo(
                midX + xOffset, from.y - curveHeight,
                midX - xOffset, to.y + curveHeight,
                to.x, to.y
            );
        } else {
            ctx.bezierCurveTo(
                midX - xOffset, from.y + curveHeight,
                midX + xOffset, to.y - curveHeight,
                to.x, to.y
            );
        }
        
        ctx.stroke();
    }


    // Простая проверка клика по кабелю
    contains(x, y) {
        const from = this.getJackCenter(this.fromJack);
        const to = this.getJackCenter(this.toJack);
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        
        // Проверка расстояния до середины кривой
        const dist = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2);
        return dist < 20;
    }
    
    // Отключение кабеля (только меняет состояние)
    disconnect() {
        this.isActive = false;
    }

    debugCoordinates() {
        const from = this.getJackCenter(this.fromJack);
        const to = this.getJackCenter(this.toJack);
        
        
        return { from, to };
    }

    // И добавим в класс:
    static debugAllCables() {
        if (!window.modularSystem?.patchManager?.cables) {
            console.log('❌ Нет системы или кабелей');
            return;
        }
        
        //console.log(`=== ОТЛАДКА ВСЕХ КАБЕЛЕЙ (${window.modularSystem.patchManager.cables.length}) ===`);
        window.modularSystem.patchManager.cables.forEach((cable, i) => {
            //console.log(`\n${i+1}. Кабель ${cable.id.substr(0, 8)}...`);
            cable.debugCoordinates();
        });
    }
}