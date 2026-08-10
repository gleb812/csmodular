// components/SVG.js
import { BaseComponent } from './BaseComponent.js';

export class SVG extends BaseComponent {
    constructor(x, y, width, height, svgSrc, color = null) {
        super(x, y, width, height);
        
        this.isInteractive = false;
        this.supportsDrag = false;
        
        this.svgSrc = svgSrc;
        this.tintColor = color; // Новое свойство: цвет для тонирования
        this.image = null;
        this.isLoaded = false;
        this.originalImage = null; // Храним оригинальное изображение
        
        this.loadSVG();
    }
    
    loadSVG() {
        if (!this.svgSrc) return;
        
        const img = new Image();
        img.onload = () => {
            this.originalImage = img;
            
            // Если указан цвет тонирования, создаем окрашенную версию
            if (this.tintColor) {
                this.applyTintColor();
            } else {
                this.image = img;
            }
            
            this.isLoaded = true;
        };
        
        img.onerror = () => {
            console.warn('Failed to load SVG:', this.svgSrc);
        };
        
        img.src = this.svgSrc;
    }
    
    /**
     * Применяет цвет тонирования к SVG
     */
    applyTintColor() {
        if (!this.originalImage || !this.tintColor) {
            this.image = this.originalImage;
            return;
        }
        
        // Создаем временный canvas для обработки
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;
        
        // 1. Рисуем оригинальное SVG
        ctx.drawImage(this.originalImage, 0, 0);
        
        // 2. Сохраняем альфа-канал
        ctx.globalCompositeOperation = 'source-in';
        
        // 3. Заливаем выбранным цветом
        ctx.fillStyle = this.tintColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 4. Восстанавливаем composite operation
        ctx.globalCompositeOperation = 'source-over';
        
        // Создаем новое изображение
        const tintedImage = new Image();
        tintedImage.src = canvas.toDataURL();
        tintedImage.onload = () => {
            this.image = tintedImage;
        };
    }
    
    draw(ctx) {
        if (this.isLoaded && this.image) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
            
            if (window.DEBUG_SVG) {
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(this.x, this.y, this.width, this.height);
                
                // Показываем цвет тонирования
                if (this.tintColor) {
                    ctx.fillStyle = this.tintColor;
                    ctx.fillRect(this.x + this.width - 10, this.y, 10, 10);
                }
            }
        } else {
            // Заглушка
            ctx.fillStyle = 'rgba(150, 150, 150, 0.2)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            if (window.DEBUG_SVG) {
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
                ctx.lineWidth = 1;
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        }
    }
    
    /**
     * Устанавливает новый SVG
     */
    setSVG(svgSrc) {
        this.svgSrc = svgSrc;
        this.isLoaded = false;
        this.image = null;
        this.originalImage = null;
        this.loadSVG();
    }
    
    /**
     * Устанавливает цвет тонирования
     */
    setTintColor(color) {
        if (color !== this.tintColor) {
            this.tintColor = color;
            
            // Перерисовываем с новым цветом
            if (this.isLoaded && this.originalImage) {
                this.applyTintColor();
            }
        }
    }
    
    /**
     * Удаляет тонирование (возвращает к оригиналу)
     */
    clearTintColor() {
        this.setTintColor(null);
    }
    
    /**
     * Получает текущий цвет
     */
    getTintColor() {
        return this.tintColor;
    }
}