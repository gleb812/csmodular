// src/Cable.js
import { getCurrentTheme } from './theme/currentTheme.js';
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
        // === SHAPE OFFSET (сдвиг кривой при Shake) ===
        this.shapeOffsetX = 0;
        this.shapeOffsetY = 0;

        // Текущее (анимируемое) значение
        this.currentOffsetX = 0;
        this.currentOffsetY = 0;

        // Переход между формами
        this.transitionFromX = 0;
        this.transitionFromY = 0;
        this.transitionToX = 0;
        this.transitionToY = 0;
        this.transitionStart = null;
        this.transitionDuration = 300;
    }

    /**
     * Сдвинуть кривую кабеля в новое случайное положение.
     * Форма (провис, S-образность) сохраняется — двигается только вся кривая.
     * @param {number} range — максимальный сдвиг в px (по умолчанию 80)
     */
    nextShape(range = 80) {
        // Новое случайное смещение
        this.shapeOffsetX = (Math.random() - 0.5) * 2 * range;  // ±range
        this.shapeOffsetY = (Math.random() - 0.5) * 2 * range;  // ±range

        // Стартуем переход от текущего положения
        this.transitionFromX = this.currentOffsetX;
        this.transitionFromY = this.currentOffsetY;
        this.transitionToX = this.shapeOffsetX;
        this.transitionToY = this.shapeOffsetY;
        this.transitionStart = performance.now();
    }

    /**
     * Сбросить кривую в базовое положение (offset = 0).
     */
    resetShape() {
        this.shapeOffsetX = 0;
        this.shapeOffsetY = 0;

        this.transitionFromX = this.currentOffsetX;
        this.transitionFromY = this.currentOffsetY;
        this.transitionToX = 0;
        this.transitionToY = 0;
        this.transitionStart = performance.now();
    }

    /**
     * Обновить анимацию перехода. Вызывать каждый кадр, пока есть активный переход.
     */
    updateShape() {
        if (this.transitionStart === null) return;

        const t = (performance.now() - this.transitionStart) / this.transitionDuration;
        if (t >= 1) {
            this.currentOffsetX = this.transitionToX;
            this.currentOffsetY = this.transitionToY;
            this.transitionStart = null;
            return;
        }

        // smoothstep — плавный вход/выход
        const k = t * t * (3 - 2 * t);

        this.currentOffsetX = this.transitionFromX
            + (this.transitionToX - this.transitionFromX) * k;
        this.currentOffsetY = this.transitionFromY
            + (this.transitionToY - this.transitionFromY) * k;
    }

    /** Активен ли переход прямо сейчас. */
    isTransitioning() {
        return this.transitionStart !== null;
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

        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;
        const cableType = this.fromJack?.type || 'audio';

        const from = this.getJackCenter(this.fromJack);
        const to = this.getJackCenter(this.toJack);
        const randomFactor = this.randomFactor;

        // === ЦВЕТ ===
        // Classic: typeColor или visualColor
        // LCD: цвет из темы (audio — яркий, control — полупрозрачный)
        let strokeColor;
        if (isLcd && !this.visualColor) {
            // В LCD, если пользователь не задал свой цвет — используем тему
            strokeColor = theme.getCableColor(cableType);
        } else {
            strokeColor = this.getDisplayColor();
        }
        ctx.strokeStyle = strokeColor;

        // === ТОЛЩИНА ===
        ctx.lineWidth = theme.getCableWidth(cableType);
        ctx.lineCap = 'round';

        // === СВЕЧЕНИЕ (только LCD) ===
        if (theme.shouldGlowCable()) {
            theme.applyGlow(ctx);
        }

        // === КРИВАЯ: S-форма с направленным провисом ===
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        const midX = (from.x + to.x) / 2;
        const dx = Math.abs(to.x - from.x);
        const dy = Math.abs(to.y - from.y);

        // Сила провисания: зависит от расстояния по X, ограничена + вклад от dy
        const sagBase = Math.min(dx * 0.3, 100) + dy * 0.15;

        // Случайная вариативность (сохраняем randomFactor)
        const sagVariation = 1 + (randomFactor - 0.5) * 0.2;
        const sag = sagBase * sagVariation;

        // Обе контрольные точки — ниже концов
        const ctrl1Y = from.y + sag;
        const ctrl2Y = to.y   + sag;

        // Горизонтальный сдвиг для разнообразия (кабели не сливаются)
        const xOffset = (randomFactor - 0.5) * 30;

        // ⭐ SHAPE: смещение всей кривой (сохраняя форму)
        const offX = this.currentOffsetX;
        const offY = this.currentOffsetY;

        ctx.bezierCurveTo(
            midX + xOffset + offX, ctrl1Y + offY,
            midX - xOffset + offX, ctrl2Y + offY,
            to.x, to.y
        );
        ctx.stroke();

        // Сброс свечения
        theme.clearGlow(ctx);
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