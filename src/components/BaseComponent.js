// components/BaseComponent.js
export class BaseComponent {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isActive = false;       // Оставляем, может пригодиться
        this.isHovered = false;
        this.isPressed = false;      // ДОБАВИТЬ! для кнопок
        this.supportsDrag = false;   // Для ручек, слайдеров
        this.isInteractive = true;   // Для всех интерактивных элементов
        this.index = undefined;
        // Порядок отрисовки (по умолчанию 0, Line должен быть -1)
        this.zIndex = 0;

        // Сохраняем оригинальные значения для масштабирования
        this.originalX = x;
        this.originalY = y;
        this.originalWidth = width;
        this.originalHeight = height;
    }



    // Новый метод для сравнения zIndex
    compareZIndex(other) {
        return this.zIndex - other.zIndex;
    }

    draw(ctx) {
        // Базовый метод, будет переопределен
        return;
    }

    update(value) {
        // Обновление состояния
        return;
    }

    // ЕДИНОЕ название метода
    isPointInside(x, y) {
        return x >= this.x && 
               x <= this.x + this.width && 
               y >= this.y && 
               y <= this.y + this.height;
    }

    // АЛИАС для совместимости со старым кодом
    isPointInComponent(x, y) {
        return this.isPointInside(x, y);
    }

    // УНИВЕРСАЛЬНЫЙ обработчик клика
    handleClick(x, y) {        
        if (this.isPointInside(x, y)) {
            
            // 1. Если компонент поддерживает drag - он должен переопределить handleClick
            //    и вернуть drag-объект
            
            // 2. Иначе вызываем onClick (для обычных кнопок)
            if (this.onClick) {
                const result = this.onClick(x, y);
                return result !== undefined ? result : true;
            }
            
            // 3. Если ничего не определено - возвращаем false
            return false;
        }
        return false;
    }

    // Метод для старых компонентов
    onClick(x, y) {
        return true; // По умолчанию считаем клик обработанным
    }

    handleMouseMove(x, y) {
        if (!this.isInteractive) {
            return false;
        }

        const wasHovered = this.isHovered;
        //this.isHovered = this.isPointInside(x, y);
        const isNowHovered = this.isPointInside(x, y);
        this.isHovered = isNowHovered;
        
        // Логируем изменение hover-состояния
        if (wasHovered !== isNowHovered) {
            const componentName = this.constructor.name;
            const label = this.currentLabel || this.text || componentName;
            
        }


        // Возвращаем true если состояние изменилось
        //return wasHovered !== this.isHovered;
        return wasHovered !== isNowHovered;
    }

    // Метод для обновления позиции при масштабировании
    updatePosition(parentX, parentY, parentScaleX, parentScaleY) {
        this.x = parentX + (this.originalX - parentX) * parentScaleX;
        this.y = parentY + (this.originalY - parentY) * parentScaleY;
        this.width = this.originalWidth * parentScaleX;
        this.height = this.originalHeight * parentScaleY;
    }
    
    // Дополнительный метод для drag-элементов
    startDrag(x, y) {
        return null;
    }
}