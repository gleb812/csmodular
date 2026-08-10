// src/components/BaseJack.js
import { BaseComponent } from './BaseComponent.js';

export class BaseJack extends BaseComponent {
    constructor(x, y, config = {}) {
        // Вызываем конструктор BaseComponent
        super(x, y, 12, 12); // width=12, height=12
        
        this.type = config.type || config.jackType || 'audio';
        this.direction = config.direction || 'input';
        this.label = config.label || '';
        this.index = config.index; // ← СОХРАНЯЕМ INDEX
        

        // Генерируем уникальный ID если нет
        this.id = config.id || `${this.direction}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        //this.id = config.id || `${this.direction}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.id = config.id ? config.id.toString() : 
                  `${this.direction}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.connected = false;
        this.cables = [];
        this.centerColor = '#000000';
        
        this._parentModule = null;
        this.typeColors = {
            audio: '#ef4444',
            control: '#3b82f6',
            logic: '#fde047',
            other: '#94a3b8'
        };
        
        this.onClick = config.onClick || null;
        this.onConnectionChange = config.onConnectionChange || null;
                // ОТЛАДКА: покажем конечный ID
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
    
    // Обновление цвета центра (вызывается PatchManager'ом)
    updateCenterColor(color) {
        this.centerColor = color;
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
            this.centerColor = '#000000'; // Возвращаем черный цвет
        }
    }
    
    // Очистка всех подключений
    clearCables() {
        this.cables = [];
        this.connected = false;
        this.centerColor = '#000000';
    }
}