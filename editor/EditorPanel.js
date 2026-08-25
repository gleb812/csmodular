// editor/EditorPanel.js

export class EditorPanel {
    constructor(x, y, width, height, gridWidth, gridHeight) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.gridWidth = gridWidth || 1;
        this.gridHeight = gridHeight || 2;
        this.title = 'Module';
        this.color = '#2a2a2a';
        this.borderColor = '#444';
        this.resizeHandleSize = 10;
    }

    isInside(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }

    isOnResizeCorner(x, y) {
        const cornerX = this.x + this.width;
        const cornerY = this.y + this.height;
        const size = this.resizeHandleSize;
        
        return x >= cornerX - size && x <= cornerX + size &&
               y >= cornerY - size && y <= cornerY + size;
    }

    resize(newGridWidth, newGridHeight) {
        // Сохраняем позицию (левый верхний угол не меняется)
        const oldWidth = this.width;
        const oldHeight = this.height;
        
        this.gridWidth = newGridWidth;
        this.gridHeight = newGridHeight;
        
        // Пересчитываем пиксельные размеры
        // Используем те же константы что в основном приложении
        const GRID_UNITS = { X: 260, Y: 15 };
        this.width = this.gridWidth * GRID_UNITS.X;
        this.height = this.gridHeight * GRID_UNITS.Y;
        
        // Если ширина или высота уменьшились, сдвигаем компоненты
        // чтобы они не выходили за границы модуля
        // (это будет реализовано позже)
    }

// editor/EditorPanel.js - убираем заголовок и линию

// editor/EditorPanel.js - исправленный draw()

    draw(ctx) {
        ctx.save();
        
        // Тень
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Закруглённый прямоугольник
        const radius = 6;
        ctx.beginPath();
        ctx.moveTo(this.x + radius, this.y);
        ctx.lineTo(this.x + this.width - radius, this.y);
        ctx.quadraticCurveTo(this.x + this.width, this.y, this.x + this.width, this.y + radius);
        ctx.lineTo(this.x + this.width, this.y + this.height - radius);
        ctx.quadraticCurveTo(this.x + this.width, this.y + this.height, this.x + this.width - radius, this.y + this.height);
        ctx.lineTo(this.x + radius, this.y + this.height);
        ctx.quadraticCurveTo(this.x, this.y + this.height, this.x, this.y + this.height - radius);
        ctx.lineTo(this.x, this.y + radius);
        ctx.quadraticCurveTo(this.x, this.y, this.x + radius, this.y);
        ctx.closePath();
        
        // ⭐ Используем customColor если есть
        const bgColor = this.customColor || this.color || '#2a2a2a';
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.strokeStyle = this.borderColor || '#444';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.shadowColor = 'transparent';
        
        ctx.restore();
    }

    drawResizeCorner(ctx) {
        const cornerX = this.x + this.width;
        const cornerY = this.y + this.height;
        const size = this.resizeHandleSize;
        
        ctx.save();
        
        // Маленький треугольник в углу
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(cornerX - size, cornerY);
        ctx.lineTo(cornerX, cornerY);
        ctx.lineTo(cornerX, cornerY - size);
        ctx.closePath();
        ctx.fill();
        
        // Рамка вокруг угла
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(cornerX - size, cornerY - size, size, size);
        
        // Подсказка при наведении
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.font = '7px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↘', cornerX - size/2, cornerY - size/2);
        
        ctx.restore();
    }
}