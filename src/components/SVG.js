// components/SVG.js
import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

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
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;

        // ⭐ В LCD: если цвет не задан, тонируем в цвет темы
        if (isLcd && !this.tintColor && this.isLoaded && this.originalImage) {
            // Однократно применяем тинт при первом рендере в LCD
            if (!this._lcdTinted) {
                this.setTintColor(theme.getAccentColor());
                this._lcdTinted = true;
            }
        }

        // ⭐ Если вернулись в classic — убираем тинт
        if (!isLcd && this._lcdTinted) {
            this.clearTintColor();
            this._lcdTinted = false;
        }

        if (this.isLoaded && this.image) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);

            if (window.DEBUG_SVG) {
                ctx.strokeStyle = isLcd ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 255, 0, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        } else {
            // Заглушка — в LCD используем цвет темы
            ctx.fillStyle = isLcd
                ? theme.getAccentAlpha(0.15)
                : 'rgba(150, 150, 150, 0.2)';
            ctx.fillRect(this.x, this.y, this.width, this.height);
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