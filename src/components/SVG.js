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
        this.classicTintColor = color;
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
    
    applyTintColor() {
        if (!this.originalImage || !this.tintColor) {
            this.image = this.originalImage;
            return;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;

        // ⭐ Glow — запекаем в изображение (LCD)
        const theme = getCurrentTheme();
        if (theme.isLcd) {
            const glow = theme.getGlow();
            if (glow > 0) {
                ctx.shadowBlur = 8 * glow;
                ctx.shadowColor = this.tintColor;
            }
        }

        // Рисуем оригинал (shadow даст glow вокруг)
        ctx.drawImage(this.originalImage, 0, 0);

        // Тонируем через source-in
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = this.tintColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.globalCompositeOperation = 'source-over';

        const tintedImage = new Image();
        tintedImage.src = canvas.toDataURL();
        tintedImage.onload = () => {
            this.image = tintedImage;
        };
    }
    
    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;

        // ⭐ В LCD всегда используем акцент темы
        if (isLcd && this.isLoaded && this.originalImage) {
            const accent = theme.getAccentColor();
            if (this._lcdTintColor !== accent) {
                this.setTintColor(accent);
                this._lcdTintColor = accent;
                this._lcdTinted = true;
            }
        }

        // ⭐ Возврат в classic — восстанавливаем оригинальный цвет модуля
        if (!isLcd && this._lcdTinted) {
            this.setTintColor(this.classicTintColor);
            this._lcdTintColor = null;
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