// src/ui/ColorPicker.js
export class ColorPicker {
    constructor(options = {}) {
        this.options = {
            columns: 8,
            rows: 4,
            cellSize: 16, // поменьше - 16px
            gap: 2,
            showReset: true,
            resetText: '↺ Reset',
            onSelect: null,
            onReset: null,
            initialColor: null,
            ...options
        };
        
        // Генерируем 32 цвета по спектру + яркость
        this.colors = this.generateSpectrumColors();
        
        this.element = null;
        this.selectedColor = this.options.initialColor;
        this.selectedCell = null;
    }

    // Генерация 32 цветов - спектр + яркость
// В ColorPicker.js - правильная генерация 32 цветов (8x4)

    generateSpectrumColors() {
        const colors = [];
        
        // 4 ряда, 8 колонок = 32 цвета
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 8; col++) {
                if (row === 3 && col === 7) {
                    // Последняя клетка - белый
                    colors.push('#ffffff');
                } else if (row === 0 && col === 0) {
                    // Первая клетка - серый (дефолт)
                    colors.push('#606060');
                } else {
                    // Генерируем цвет по спектру
                    const hue = (col * 45) % 360; // 0, 45, 90, 135, 180, 225, 270, 315
                    const saturation = 80;
                    const lightness = 30 + row * 15; // 30, 45, 60, 75
                    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
                }
            }
        }
        
        return colors;
    }

    create() {
        const container = document.createElement('div');
        container.className = 'color-picker';
        container.style.cssText = `
            display: grid;
            grid-template-columns: repeat(${this.options.columns}, ${this.options.cellSize}px);
            gap: ${this.options.gap}px;
            padding: 8px;
            background: #2a2a2a;
            border-radius: 4px;
        `;

        // Создаем ячейки цветов
        this.colors.forEach((color, index) => {
            const cell = this.createColorCell(color, index);
            container.appendChild(cell);
        });

        // Кнопка сброса
        if (this.options.showReset) {
            const resetBtn = this.createResetButton();
            container.appendChild(resetBtn);
        }

        this.element = container;
        
        // Устанавливаем начальный цвет если есть
        if (this.selectedColor) {
            this.setColor(this.selectedColor);
        }
        
        return container;
    }

    createColorCell(color, index) {
        const cell = document.createElement('div');
        cell.className = 'color-cell';
        cell.dataset.color = color;
        cell.dataset.index = index;
        cell.style.cssText = `
            width: ${this.options.cellSize}px;
            height: ${this.options.cellSize}px;
            background: ${color};
            border-radius: 2px;
            cursor: pointer;
            transition: all 0.1s ease;
            border: 2px solid transparent;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
        `;

        // Ховер эффект
        cell.onmouseenter = () => {
            cell.style.transform = 'scale(1.2)';
            cell.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5)';
            cell.style.zIndex = '2';
        };
        
        cell.onmouseleave = () => {
            cell.style.transform = 'scale(1)';
            cell.style.boxShadow = '0 1px 2px rgba(0,0,0,0.3)';
            cell.style.zIndex = '0';
        };

        cell.onclick = (e) => {
            e.stopPropagation();
            this.selectColor(color, cell);
        };

        return cell;
    }

    createResetButton() {
        const resetBtn = document.createElement('button');
        resetBtn.className = 'color-reset';
        resetBtn.textContent = this.options.resetText;
        resetBtn.style.cssText = `
            grid-column: span ${this.options.columns};
            margin-top: 6px;
            padding: 4px;
            background: #333;
            border: 1px solid #444;
            border-radius: 3px;
            color: #aaa;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.1s;
        `;

        resetBtn.onmouseenter = () => {
            resetBtn.style.background = '#3a3a3a';
            resetBtn.style.borderColor = '#0af';
            resetBtn.style.color = '#fff';
        };
        
        resetBtn.onmouseleave = () => {
            resetBtn.style.background = '#333';
            resetBtn.style.borderColor = '#444';
            resetBtn.style.color = '#aaa';
        };

        resetBtn.onclick = (e) => {
            e.stopPropagation();
            this.resetColor();
        };

        return resetBtn;
    }

// В ColorPicker.js - исправленный selectColor()

    selectColor(color, cell) {
        // 🚫 Защита от повторных вызовов
        if (this._selecting) return;
        this._selecting = true;
        
        // Убираем выделение с предыдущей
        if (this.selectedCell) {
            this.selectedCell.style.borderColor = 'transparent';
        }

        // Выделяем новую
        this.selectedColor = color;
        this.selectedCell = cell;
        cell.style.borderColor = '#fff';

        // Вызываем callback с задержкой
        if (this.options.onSelect) {
            setTimeout(() => {
                this.options.onSelect(color);
                this._selecting = false;
            }, 10);
        } else {
            this._selecting = false;
        }
    }

    resetColor() {
        if (this._resetting) return;
        this._resetting = true;
        
        if (this.selectedCell) {
            this.selectedCell.style.borderColor = 'transparent';
        }
        
        this.selectedColor = null;
        this.selectedCell = null;

        if (this.options.onReset) {
            setTimeout(() => {
                this.options.onReset();
                this._resetting = false;
            }, 10);
        } else {
            this._resetting = false;
        }
    }

    setColor(colorHex) {
        if (!colorHex) {
            this.resetColor();
            return;
        }

        // Ищем ячейку с таким цветом
        const cells = this.element.querySelectorAll('.color-cell');
        for (let cell of cells) {
            if (cell.dataset.color === colorHex) {
                this.selectColor(colorHex, cell);
                break;
            }
        }
    }

    getColor() {
        return this.selectedColor;
    }

    // Статические стили
    static injectStyles() {
        if (document.getElementById('color-picker-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'color-picker-styles';
        style.textContent = `
            .color-picker {
                background: #2a2a2a;
                border-radius: 4px;
            }
            
            .color-cell {
                transition: all 0.1s ease;
            }
            
            .color-cell:hover {
                transform: scale(1.2);
                box-shadow: 0 2px 6px rgba(0,0,0,0.5);
                z-index: 2;
            }
            
            .color-reset {
                transition: all 0.1s;
            }
            
            .color-reset:hover {
                background: #3a3a3a !important;
                border-color: #0af !important;
                color: white !important;
            }
        `;
        document.head.appendChild(style);
    }
}