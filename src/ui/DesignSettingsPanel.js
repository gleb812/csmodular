// src/ui/DesignSettingsPanel.js
import { getCurrentTheme, setCurrentTheme } from '../theme/currentTheme.js';
import { themeStore } from '../theme/themeStore.js';
import { Theme } from '../theme/Theme.js';
import { DEFAULT_THEME, LCD_COLOR_PRESETS } from '../theme/defaults.js';

export class DesignSettingsPanel {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.windowElement = null;

        this.createWindow();
        this.setupEventListeners();
    }

    // ============================================================
    //  СОЗДАНИЕ ОКНА
    // ============================================================

    createWindow() {
        this.windowElement = document.createElement('div');
        this.windowElement.id = 'design-settings-panel';
        this.windowElement.style.cssText = `
            position: fixed;
            right: 20px;
            top: 80px;
            width: 320px;
            max-height: calc(100vh - 120px);
            overflow-y: auto;
            background: rgba(20, 20, 25, 0.97);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 14px;
            color: #ccc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            font-size: 12px;
            z-index: 15000;
            box-shadow: 0 8px 40px rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(8px);
            display: none;
            user-select: none;
        `;

        this.windowElement.innerHTML = `
            <div id="ds-header" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid #333;
                cursor: move;
            ">
                <span style="color: #0af; font-weight: bold; font-size: 13px;">
                    🎨 Design Settings
                </span>
                <button id="ds-close" style="
                    background: transparent;
                    border: none;
                    color: #666;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0 4px;
                ">✕</button>
            </div>

            <div id="ds-content"></div>
        `;

        document.body.appendChild(this.windowElement);

        // Делаем панель перетаскиваемой
        this.makeDraggable(this.windowElement.querySelector('#ds-header'));

        // Кнопка закрытия
        this.windowElement.querySelector('#ds-close').onclick = () => this.hide();

        // Рендерим содержимое
        this.renderContent();
    }

    // ============================================================
    //  СОДЕРЖИМОЕ
    // ============================================================

    renderContent() {
        const content = this.windowElement.querySelector('#ds-content');
        content.innerHTML = '';

        const theme = getCurrentTheme();
        const settings = theme.settings;

        // === PRESET ===
        content.appendChild(this.buildSection('Preset', [
            this.buildRadioGroup('preset', settings.preset, [
                { value: 'classic', label: '🎛 Classic' },
                { value: 'lcd', label: '📺 LCD' },
            ]),
        ]));

        // === LCD (показывается только в LCD) ===
        if (settings.preset === 'lcd') {
            content.appendChild(this.buildSection('Color', [
                this.buildColorPresets(settings.lcd.color),
                this.buildHexInput('lcd.color', settings.lcd.color),
            ]));

            content.appendChild(this.buildSection('Appearance', [
                this.buildSlider('lcd.glow', 'Glow', settings.lcd.glow, 0, 1, 0.05),
                this.buildSlider('lcd.panelOpacity', 'Panel Opacity', settings.lcd.panelOpacity, 0, 0.5, 0.01),
                this.buildSlider('lcd.lineWeight', 'Line Weight', settings.lcd.lineWeight, 0.5, 2, 0.05),
            ]));
        }

        // === CABLES ===
        content.appendChild(this.buildSection('Cables', [
            this.buildSlider('cables.audioWidth', 'Audio Width', settings.cables.audioWidth, 1, 8, 0.5),
            this.buildSlider('cables.controlWidth', 'Control Width', settings.cables.controlWidth, 0.5, 5, 0.25),
        ]));

        // === RESET ===
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↺ Reset to Defaults';
        resetBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #2a2a2a;
            border: 1px solid #555;
            color: #ff6b6b;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            margin-top: 12px;
            font-family: inherit;
        `;
        resetBtn.onmouseenter = () => {
            resetBtn.style.background = '#3a2a2a';
            resetBtn.style.borderColor = '#ff6b6b';
        };
        resetBtn.onmouseleave = () => {
            resetBtn.style.background = '#2a2a2a';
            resetBtn.style.borderColor = '#555';
        };
        resetBtn.onclick = () => this.resetToDefaults();
        content.appendChild(resetBtn);

        // Кнопка Save (на случай если auto-save не сработает)
        const saveBtn = document.createElement('button');
        saveBtn.textContent = '💾 Save';
        saveBtn.style.cssText = `
            width: 100%;
            padding: 8px;
            background: #2a2a2a;
            border: 1px solid #555;
            color: #4a4;
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            margin-top: 6px;
            font-family: inherit;
        `;
        saveBtn.onmouseenter = () => {
            saveBtn.style.background = '#2a3a2a';
            saveBtn.style.borderColor = '#4a4';
        };
        saveBtn.onmouseleave = () => {
            saveBtn.style.background = '#2a2a2a';
            saveBtn.style.borderColor = '#555';
        };
        saveBtn.onclick = () => this.saveAndRedraw();
        content.appendChild(saveBtn);
    }

    // === Секция ===
    buildSection(title, children) {
        const section = document.createElement('div');
        section.style.cssText = 'margin-bottom: 14px;';

        const header = document.createElement('div');
        header.textContent = title;
        header.style.cssText = `
            color: #888;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 1px solid #2a2a2a;
        `;
        section.appendChild(header);

        children.forEach(child => section.appendChild(child));
        return section;
    }

    // === Radio Group (для preset) ===
    buildRadioGroup(path, currentValue, options) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; gap: 6px; margin-bottom: 8px;';

        options.forEach(opt => {
            const btn = document.createElement('button');
            const isActive = currentValue === opt.value;
            btn.textContent = opt.label;
            btn.style.cssText = `
                flex: 1;
                padding: 6px 8px;
                background: ${isActive ? '#0a3a5a' : '#2a2a2a'};
                border: 1px solid ${isActive ? '#0af' : '#444'};
                color: ${isActive ? '#0af' : '#aaa'};
                border-radius: 4px;
                cursor: pointer;
                font-size: 11px;
                font-family: inherit;
                transition: all 0.15s;
            `;
            btn.onmouseenter = () => {
                if (!isActive) {
                    btn.style.background = '#3a3a3a';
                    btn.style.borderColor = '#666';
                }
            };
            btn.onmouseleave = () => {
                if (!isActive) {
                    btn.style.background = '#2a2a2a';
                    btn.style.borderColor = '#444';
                }
            };
            btn.onclick = () => {
                this.setPath(path, opt.value);
            };
            wrapper.appendChild(btn);
        });

        return wrapper;
    }

    // === Слайдер ===
    buildSlider(path, label, value, min, max, step) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'margin-bottom: 10px;';

        const labelRow = document.createElement('div');
        labelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 4px;';

        const labelEl = document.createElement('span');
        labelEl.textContent = label;
        labelEl.style.cssText = 'color: #aaa; font-size: 11px;';

        const valueEl = document.createElement('span');
        valueEl.textContent = this.formatValue(value);
        valueEl.style.cssText = 'color: #0af; font-size: 11px; font-family: monospace;';

        labelRow.appendChild(labelEl);
        labelRow.appendChild(valueEl);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = min;
        input.max = max;
        input.step = step;
        input.value = value;
        input.style.cssText = `
            width: 100%;
            cursor: pointer;
            accent-color: #0af;
        `;

        input.oninput = () => {
            const v = parseFloat(input.value);
            valueEl.textContent = this.formatValue(v);
            this.setPath(path, v);
        };

        wrapper.appendChild(labelRow);
        wrapper.appendChild(input);
        return wrapper;
    }

    // === Палитра цветов ===
    buildColorPresets(currentColor) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px;';

        LCD_COLOR_PRESETS.forEach(preset => {
            const swatch = document.createElement('button');
            const isActive = currentColor.toLowerCase() === preset.value.toLowerCase();
            swatch.title = preset.name;
            swatch.style.cssText = `
                width: 28px;
                height: 28px;
                background: ${preset.value};
                border: 2px solid ${isActive ? '#0af' : '#444'};
                border-radius: 4px;
                cursor: pointer;
                padding: 0;
                transition: all 0.15s;
            `;
            swatch.onmouseenter = () => {
                swatch.style.transform = 'scale(1.1)';
            };
            swatch.onmouseleave = () => {
                swatch.style.transform = 'scale(1)';
            };
            swatch.onclick = () => {
                this.setPath('lcd.color', preset.value);
            };
            wrapper.appendChild(swatch);
        });

        return wrapper;
    }

    // === Hex Input ===
    buildHexInput(path, value) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display: flex; gap: 6px; align-items: center;';

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = value;
        textInput.style.cssText = `
            flex: 1;
            padding: 4px 8px;
            background: #1a1a1a;
            border: 1px solid #444;
            border-radius: 3px;
            color: #0af;
            font-family: monospace;
            font-size: 11px;
            outline: none;
        `;

        textInput.onchange = () => {
            const v = textInput.value.trim();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                this.setPath(path, v);
            } else {
                // Вернуть старое значение если невалидный
                textInput.value = getCurrentTheme().settings.lcd.color;
            }
        };

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value;
        colorInput.style.cssText = `
            width: 32px;
            height: 28px;
            padding: 0;
            border: 1px solid #444;
            border-radius: 3px;
            cursor: pointer;
            background: transparent;
        `;

        colorInput.oninput = () => {
            this.setPath(path, colorInput.value);
            textInput.value = colorInput.value;
        };

        wrapper.appendChild(textInput);
        wrapper.appendChild(colorInput);
        return wrapper;
    }

    // ============================================================
    //  ЛОГИКА
    // ============================================================

    /**
     * Установить значение по пути "a.b.c" в settings темы.
     * Сохраняет в localStorage, применяет, перерисовывает.
     */
    setPath(path, value) {
        const theme = getCurrentTheme();
        const parts = path.split('.');

        let target = theme.settings;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!target[parts[i]]) target[parts[i]] = {};
            target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;

        // Применяем и сохраняем
        this.applyAndSave();
    }

    /**
     * Применить текущие settings и сохранить.
     */
    applyAndSave() {
        const theme = getCurrentTheme();

        // Обновляем класс Theme (на случай если структура изменилась)
        setCurrentTheme(new Theme(theme.settings));

        // Сохраняем
        themeStore.save(theme.settings);

        // Форсируем перерисовку
        if (this.system?.forceRedraw) {
            this.system.forceRedraw();
        }

        // Перерисовываем содержимое панели (если изменилась структура, например preset)
        // Но только если это НЕ слайдер — иначе панель будет "прыгать" при перетаскивании
        if (!this._isSliderUpdate) {
            this.renderContent();
        }
    }

    /**
     * Сохранить и перерисовать (для кнопки Save).
     */
    saveAndRedraw() {
        this.applyAndSave();
        this.system?.showNotification?.('✅ Design saved');
    }

    /**
     * Сбросить к дефолтам.
     */
    resetToDefaults() {
        // Копируем дефолты
        const defaults = JSON.parse(JSON.stringify(DEFAULT_THEME));

        setCurrentTheme(new Theme(defaults));
        themeStore.save(defaults);

        if (this.system?.forceRedraw) {
            this.system.forceRedraw();
        }

        this.renderContent();
        this.system?.showNotification?.('↺ Reset to defaults');
    }

    // ============================================================
    //  UI-УТИЛИТЫ
    // ============================================================

    formatValue(v) {
        if (v === undefined || v === null) return '—';
        if (typeof v !== 'number') return String(v);
        if (v < 1) return v.toFixed(2);
        return v.toFixed(1);
    }

    makeDraggable(handle) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = this.windowElement.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newX = e.clientX - offsetX;
            const newY = e.clientY - offsetY;
            const maxX = window.innerWidth - this.windowElement.offsetWidth;
            const maxY = window.innerHeight - this.windowElement.offsetHeight;
            this.windowElement.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
            this.windowElement.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
            this.windowElement.style.right = 'auto';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    // ============================================================
    //  ОТКРЫТИЕ/ЗАКРЫТИЕ
    // ============================================================

    show() {
        this.isVisible = true;
        this.windowElement.style.display = 'block';
        this.renderContent();
    }

    hide() {
        this.isVisible = false;
        this.windowElement.style.display = 'none';
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    setupEventListeners() {
        // Escape — закрыть
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
}