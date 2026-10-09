// src/components/LED.js
import { BaseComponent } from './BaseComponent.js';
import { getCurrentTheme } from '../theme/currentTheme.js';

export class LED extends BaseComponent {
    constructor(x, y, width = 16, height = 10) {
        super(x, y, width, height);
        
        // ⭐ Состояние отображения
        this.state = false;
        this.brightness = 0;          // 0..1 — используется для яркости
        
        // ⭐ Связь с источником (Output/Input модуля)
        this.sourceComponentId = null; // ID Input или Output, к которому привязан LED
        this.ledType = 'rms';          // 'rms' | 'peak' | 'gate' (пока только rms)
        
        // ⭐ Runtime (в рабочей системе)
        this.sourceChannel = null;     // Имя Csound-канала (генерируется)
        
        // ⭐ Настройки отображения
        this.gain = 1.0;               // Усиление перед порогом
        this.threshold = 0.5;         // Порог on/off
        
        // ⭐ Флаги
        this.isInteractive = true;     // можно выделять
        this.supportsDrag = false;     // не тащим за тело (в редакторе — двигаем отдельно)
    }

    draw(ctx) {
        const theme = getCurrentTheme();
        const isLcd = theme.isLcd;

        // ⭐ Читаем значение из CsoundEngine
        if (this.sourceChannel && window.modularSystem?.csoundEngine) {
            const v = window.modularSystem.csoundEngine.getLedValue?.(this.sourceChannel) || 0;
            this.setBrightness(v * this.gain);
        }

        const isOn = this.brightness > this.threshold;

        if (isLcd) {
            const accent = theme.getAccentColor();

            if (isOn) {
                // Горит — залито цветом + свечение
                ctx.fillStyle = accent;
                theme.applyGlow(ctx);
                ctx.fillRect(this.x, this.y, this.width, this.height);
                theme.clearGlow(ctx);

                // И рамка тем же цветом (чтобы край был чёткий)
                ctx.strokeStyle = accent;
                ctx.lineWidth = theme.lineWidth(1);
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            } else {
                // Не горит — ТОЛЬКО РАМКА, слабая версия цвета
                ctx.strokeStyle = theme.getAccentAlpha(0.35);
                ctx.lineWidth = theme.lineWidth(1);
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        } else {
            // === Classic ===
            const fillColor = isOn ? '#00ff00' : '#003300';
            ctx.fillStyle = fillColor;
            ctx.fillRect(this.x, this.y, this.width, this.height);

            ctx.strokeStyle = '#002200';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }

        // ⭐ Метка непривязанного LED (в редакторе) — оставляем как было
        if (!this.sourceComponentId && this._isInEditor?.()) {
            ctx.strokeStyle = '#f80';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 2]);
            ctx.strokeRect(this.x - 1, this.y - 1, this.width + 2, this.height + 2);
            ctx.setLineDash([]);
        }
    }

    // ⭐ Установить состояние (on/off)
    setState(state) {
        this.state = Boolean(state);
    }

    // ⭐ Установить яркость (0..1)
    setBrightness(value) {
        this.brightness = Math.max(0, Math.min(1, value));
        this.state = this.brightness > this.threshold;
    }

    // ⭐ Переключить
    toggle() {
        this.state = !this.state;
        return this.state;
    }

    // ⭐ Состояние
    isOn() {
        return this.state;
    }

    getPropertiesForExport() {
        const props = {
            width: this.width,
            height: this.height,
        };
        
        if (this.sourceComponentId !== null && this.sourceComponentId !== undefined) {
            props.sourceComponentId = String(this.sourceComponentId);
        }
        
        if (this.ledType) {
            props.ledType = this.ledType;
        }
        
        if (this.threshold !== undefined) {
            props.threshold = this.threshold;
        }
        
        if (this.gain !== undefined) {
            props.gain = this.gain;
        }
        
        return props;
    }
    
    // ⭐ Проверка — в редакторе ли мы
    _isInEditor() {
        // Простая эвристика: если родитель — EditorPanel или _editorModule установлен
        return this._editorModule !== undefined || 
               this.parent?.constructor?.name === 'EditorPanel';
    }
    
    // ⭐ Список свойств для UI
    static getPropertySchema() {
        return [
            {
                key: 'sourceComponentId',
                label: 'Source',
                type: 'select',
                optionsFrom: 'ioComponents',   // специальный источник — все Input/Output модуля
                help: 'Which input or output this LED monitors',
            },
            {
                key: 'ledType',
                label: 'Type',
                type: 'select',
                options: [
                    { value: 'rms', label: 'RMS (average level)' },
                    // { value: 'peak', label: 'Peak' },
                    // { value: 'gate', label: 'Gate (on/off)' },
                ],
                help: 'What kind of signal to display',
            },
            {
                key: 'threshold',
                label: 'Threshold',
                type: 'number',
                min: 0,
                max: 1,
                step: 0.001,
                help: 'Signal level above which LED lights up (0..1)',
            },
            {
                key: 'gain',
                label: 'Gain',
                type: 'number',
                min: 0,
                max: 10,
                step: 0.1,
                help: 'Signal multiplier before threshold',
            },
        ];
    }
}