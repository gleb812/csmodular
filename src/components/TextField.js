// components/TextField.js - ВЕРСИЯ С ТАБЛИЦАМИ
import { BaseComponent } from './BaseComponent.js';

export class TextField extends BaseComponent {
    static HEIGHT = 16;
    
    constructor(x, y, width = 60, referenceElementId = null, format = 'number', tableName = null) {
        super(x, y, width, TextField.HEIGHT);
        
        this.supportsDrag = false;
        this.isInteractive = false;
        
        // ID целевого компонента
        this.targetId = referenceElementId !== null ? String(referenceElementId) : null;
        this.targetComponent = null;
        this._connected = false;
        
        // Формат отображения
        this.format = format;
        this.displayValue = '--';
        
        // Таблица для преобразования значений
        this.tableName = tableName;
        this.tableData = null;
        this.isLoadingTable = false;
        
        // Стили
        this.backgroundColor = '#1a1a1a';
        this.borderColor = '#333';
        this.textColor = '#0af';
        
        // Пробуем подключиться с небольшой задержкой
        setTimeout(() => {
            this.connect();
            // Если указано имя таблицы - загружаем ее
            if (this.tableName) {
                this.loadTable();
            }
        }, 50);
    }
    
    draw(ctx) {
        // Фон
        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Рамка
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Текст
        ctx.fillStyle = this.textColor;
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.fillText(
            this.displayValue,
            this.x + this.width / 2,
            this.y + this.height / 2
        );
    }
    
    // Подключение к целевому компоненту
    connect() {
        if (this._connected || !this.parent || !this.targetId) return;
        
        // Ищем компонент по ID
        for (const comp of this.parent.components) {
            if (comp.id === this.targetId || comp.parameterId === this.targetId) {
                this.targetComponent = comp;
                this.setupConnection();
                break;
            }
        }
    }
    
    // Настройка связи с компонентом
    setupConnection() {
        if (!this.targetComponent) return;
        
        // Используем addChangeListener если есть
        if (typeof this.targetComponent.addChangeListener === 'function') {
            this.targetComponent.addChangeListener((value) => {
                this.updateDisplay(value);
            });
        }
        // Иначе работаем с onChange
        else {
            const originalOnChange = this.targetComponent.onChange;
            this.targetComponent.onChange = (value) => {
                if (typeof originalOnChange === 'function') {
                    originalOnChange(value);
                }
                this.updateDisplay(value);
            };
        }
        
        // Устанавливаем начальное значение
        if (this.targetComponent.value !== undefined) {
            this.updateDisplay(this.targetComponent.value);
        }
        
        this._connected = true;
    }
    
    // Обновление отображения
    updateDisplay(value) {
        if (value === null || value === undefined) {
            this.displayValue = '--';
            return;
        }
        
        // Если есть таблица и она загружена - используем ее
        if (this.tableData && this.tableName) {
            this.displayFromTable(value);
        }
        // Если таблица указана, но еще не загружена
        else if (this.tableName && !this.tableData && !this.isLoadingTable) {
            this.displayValue = '...';
        }
        // Если таблицы нет - используем обычный формат
        else {
            this.displayWithoutTable(value);
        }
        
        // Запрашиваем перерисовку
        if (this.onRequestRedraw) {
            this.onRequestRedraw();
        }
    }
    
    // Отображение значения через таблицу
    displayFromTable(midiValue) {
        // Преобразуем значение в диапазон 0-127
        const index = Math.max(0, Math.min(127, Math.round(midiValue)));
        
        // Получаем значение из таблицы
        if (!this.tableData || index >= this.tableData.length) {
            this.displayValue = '--';
            return;
        }
        
        const tableValue = this.tableData[index];
        
        // Форматируем значение в зависимости от формата
        if (this.format === 'integer') {
            this.displayValue = Math.round(tableValue).toString();
        } else {
            // Число с плавающей точкой
            let displayValue = Math.round(tableValue * 100) / 100;
            displayValue = displayValue.toString();
            
            // Убираем лишние нули
            if (displayValue.includes('.')) {
                displayValue = displayValue.replace(/(\.\d*?)0+$/, '$1');
                if (displayValue.endsWith('.')) {
                    displayValue = displayValue.slice(0, -1);
                }
            }
            
            this.displayValue = displayValue;
        }
    }
    
    // Отображение без таблицы
    displayWithoutTable(value) {
        if (this.format === 'integer') {
            // Целое число
            this.displayValue = Math.round(value).toString();
        } else {
            // Число с плавающей точкой
            let displayValue = Math.round(value * 100) / 100;
            displayValue = displayValue.toString();
            
            // Убираем лишние нули
            if (displayValue.includes('.')) {
                displayValue = displayValue.replace(/(\.\d*?)0+$/, '$1');
                if (displayValue.endsWith('.')) {
                    displayValue = displayValue.slice(0, -1);
                }
            }
            
            this.displayValue = displayValue;
        }
    }
    
    // Загрузка таблицы
    async loadTable() {
        if (!this.tableName) return;
        
        this.isLoadingTable = true;
        this.displayValue = '...';
        
        try {
            const response = await fetch(`/tables/${this.tableName}.json`);
            
            if (response.ok) {
                this.tableData = await response.json();
                
                // Если уже подключены к ручке - обновляем отображение
                if (this._connected && this.targetComponent && this.targetComponent.value !== undefined) {
                    this.updateDisplay(this.targetComponent.value);
                }
            } else {
                console.warn(`Не удалось загрузить таблицу: ${this.tableName}`);
                this.tableData = null;
            }
        } catch (error) {
            console.error(`Ошибка загрузки таблицы ${this.tableName}:`, error);
            this.tableData = null;
        } finally {
            this.isLoadingTable = false;
        }
    }
    
    // Вызывается каждый кадр
    update() {
        if (!this._connected) {
            this.connect();
        }
    }
    
    handleClick(x, y) {
        return false;
    }
    
    handleMouseMove(x, y) {
        return false;
    }
    
    destroy() {
        // Очистка не требуется
    }
}