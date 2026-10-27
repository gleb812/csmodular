// src/components/BaseJack.js
import { BaseComponent } from './BaseComponent.js';
import { CABLE_COLORS, TYPE_FAMILY, csoundRateOf } from '../constants.js';
export class BaseJack extends BaseComponent {
    constructor(x, y, config = {}) {
        super(x, y, 12, 12);

        this.type = config.type || config.jackType || 'audio';
        // ⭐ originalType — из JS-описания модуля, не меняется при вариантах
        this.originalType = this.type;
        // ⭐ bandwidth: 'static' | 'dynamic' (по умолчанию dynamic)
        this.bandwidth = config.bandwidth || 'dynamic';

        this.direction = config.direction || 'input';
        this.label = config.label || '';
        this.index = config.index;

        this.id = config.id
            ? config.id.toString()
            : `${this.direction}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        this.connected = false;
        this.cables = [];
        this.centerColor = null;

        this._parentModule = null;

        // ⭐ Локальный typeColors убран — используем CABLE_COLORS из constants

        this.onClick = config.onClick || null;
        this.onConnectionChange = config.onConnectionChange || null;
    }
    
    // В BaseJack.js добавим
    handleClick(x, y) {
        console.log('🎯 CLICK ON JACK:');
        console.log('  Лейбл:', this.label);
        console.log('  Координаты клика:', { x, y });
        
        const center = this.getCenter();
        console.log('  Центр джека (getCenter):', center);
        console.log('  Свойство center:', this.center);
        console.log('  Разница:', {
            dx: x - center.x,
            dy: y - center.y
        });
        
        return true;
    }

    // Геттер для parentModule (новая архитектура)
    get parentModule() {
        return this._parentModule;
    }
    
    set parentModule(value) {
        this._parentModule = value;
    }
    
    // Геттер для module (старая архитектура) - ДЛЯ СОВМЕСТИМОСТИ!
    get module() {
        //console.warn('⚠️ [BaseJack] Используется устаревшее свойство .module');
        return this._parentModule;
    }

   /** Цвет центра джека = его текущий тип */
    getEffectiveColor() {
        return CABLE_COLORS[this.type] || CABLE_COLORS.other;
    }

    /** Csound rate джека: 'audio' | 'control' */
    getCsoundRate() {
        return csoundRateOf(this.type);
    }

    /** Может ли этот джек сменить тип на newType (учитывая bandwidth) */
    canChangeTypeTo(newType) {
        if (this.bandwidth !== 'dynamic') return false;
        if (this.type === newType) return false;
        // разрешаем только внутри семейства
        return (TYPE_FAMILY[this.type] && TYPE_FAMILY[this.type] === TYPE_FAMILY[newType]);
    }

    updateCenterColor(color) {
        this.centerColor = color;
    }

    set module(value) {
        //console.warn('⚠️ [BaseJack] Установка устаревшего свойства .module');
        this._parentModule = value;
    }
    
    // Метод для установки (работает с обоими названиями)
    setParentModule(module) {
        this._parentModule = module;
    }
    
    // Получение абсолютных координат центра
    get center() {
        let offsetX = 0;
        let offsetY = 0;
        
        if (this.parentModule) {
            offsetX = this.parentModule.x || 0;
            offsetY = this.parentModule.y || 0;
        }


        
        return {
            x: offsetX + this.x + this.width / 2,
            y: offsetY + this.y + this.height / 2,
            absX: offsetX + this.x + this.width / 2,
            absY: offsetY + this.y + this.height / 2
        };
    }
    
    // Проверка попадания мыши
    contains(mouseX, mouseY) {
        const center = this.center;
        const dist = Math.sqrt((mouseX - center.x) ** 2 + (mouseY - center.y) ** 2);
        return dist < 10; // Немного больше радиуса для удобства
    }
    
    // Базовая отрисовка (будет переопределена в наследниках)
    draw(ctx) {
        // Будет реализовано в Input/Output
    }
    
    
    // Добавление ссылки на кабель
    addCable(cable) {
        if (!this.cables.includes(cable)) {
            this.cables.push(cable);
            this.connected = true;
        }
    }
    
    // Удаление ссылки на кабель
    removeCable(cable) {
        const index = this.cables.indexOf(cable);
        if (index > -1) {
            this.cables.splice(index, 1);
        }
        this.connected = this.cables.length > 0;
        if (!this.connected) {
            this.centerColor = null;  // было '#000000'
        }
    }
    
    // Очистка всех подключений
    clearCables() {
        this.cables = [];
        this.connected = false;
        this.centerColor = null;  // было '#000000'
    }
}