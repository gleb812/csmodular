// src/ui/ModuleContextMenu.js
import { ColorPicker } from './ColorPicker.js';
import { injectColorPickerStyles } from './ColorPickerStyles.js';
export class ModuleContextMenu {
  constructor(system) {
    this.system = system;
    this.menuElement = null;
    this.currentModule = null;

    this.createMenuElement();
    this.setupEventListeners();
    this.injectStyles();
    //injectColorPickerStyles();
    ColorPicker.injectStyles();
  }

  createMenuElement() {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'module-context-menu';
    this.menuElement.style.cssText = `
            position: fixed;
            min-width: 200px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 15000;
            font-family: Arial, sans-serif;
            color: #ddd;
            display: none;
            overflow: hidden;
        `;

    document.body.appendChild(this.menuElement);
  }

  show(module, x, y) {
    this.currentModule = module;
    this.updateMenuContent();

    // Позиционируем
    this.menuElement.style.left = `${x}px`;
    this.menuElement.style.top = `${y}px`;
    this.menuElement.style.display = 'block';

    // Проверяем размеры и видимость
    const rect = this.menuElement.getBoundingClientRect();
    // console.log('Menu rect:', rect);
    // console.log(
    //   'Menu computed style:',
    //   window.getComputedStyle(this.menuElement),
    // );

    // Закрываем другие меню
    if (this.system.contextMenu?.hide) this.system.contextMenu.hide();
    if (this.system.jackContextMenu?.hide) this.system.jackContextMenu.hide();
  }
  hide() {
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
      this.currentModule = null;
    }
  }


  updateMenuContent() {
    if (!this.currentModule) return;

    this.menuElement.innerHTML = '';

    // Заголовок
    this.menuElement.appendChild(this.createHeader());

    // 1. Открыть код Csound
    this.menuElement.appendChild(
      this.createMenuItem('📝 Open Csound Code', () => this.openCsoundCode()),
    );


    // === LAYER SWITCHER ===
    const layerSection = document.createElement('div');
    layerSection.style.cssText = `
            padding: 6px 12px;
            border-bottom: 1px solid #333;
        `;

    const layerTitle = document.createElement('div');
    layerTitle.style.cssText = `
            color: #aaa;
            font-size: 11px;
            margin-bottom: 6px;
        `;
    layerTitle.textContent = 'Layer:';
    layerSection.appendChild(layerTitle);

    const layerButtons = document.createElement('div');
    layerButtons.style.cssText = `
            display: flex;
            gap: 6px;
        `;

    const currentLayer = this.currentModule.layer || 'voice';

    // Voice button
    const voiceBtn = document.createElement('button');
    voiceBtn.textContent = 'Voice';
    const isVoice = currentLayer === 'voice';
    voiceBtn.style.cssText = `
            flex: 1;
            padding: 6px 8px;
            background: ${isVoice ? '#0a3a5a' : '#2a2a2a'};
            border: 1px solid ${isVoice ? '#0af' : '#444'};
            color: ${isVoice ? '#0af' : '#aaa'};
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: inherit;
            transition: all 0.15s;
        `;
    if (!isVoice) {
        voiceBtn.onmouseenter = () => {
            voiceBtn.style.background = '#3a3a3a';
            voiceBtn.style.borderColor = '#666';
        };
        voiceBtn.onmouseleave = () => {
            voiceBtn.style.background = '#2a2a2a';
            voiceBtn.style.borderColor = '#444';
        };
        voiceBtn.onclick = (e) => {
            e.stopPropagation();
            this.setLayer('voice');
        };
    }

    // FX button
    const fxBtn = document.createElement('button');
    fxBtn.textContent = 'FX';
    const isFx = currentLayer === 'fx';
    fxBtn.style.cssText = `
            flex: 1;
            padding: 6px 8px;
            background: ${isFx ? '#3a2a0a' : '#2a2a2a'};
            border: 1px solid ${isFx ? '#f59e0b' : '#444'};
            color: ${isFx ? '#f59e0b' : '#aaa'};
            border-radius: 4px;
            cursor: pointer;
            font-size: 11px;
            font-family: inherit;
            transition: all 0.15s;
        `;
    if (!isFx) {
        fxBtn.onmouseenter = () => {
            fxBtn.style.background = '#3a3a3a';
            fxBtn.style.borderColor = '#666';
        };
        fxBtn.onmouseleave = () => {
            fxBtn.style.background = '#2a2a2a';
            fxBtn.style.borderColor = '#444';
        };
        fxBtn.onclick = (e) => {
            e.stopPropagation();
            this.setLayer('fx');
        };
    }

    layerButtons.appendChild(voiceBtn);
    layerButtons.appendChild(fxBtn);
    layerSection.appendChild(layerButtons);
    this.menuElement.appendChild(layerSection);



    // 2. СЕКЦИЯ ЦВЕТОВ
    const colorSection = document.createElement('div');
    colorSection.style.cssText = `
            padding: 4px 0;
            border-bottom: 1px solid #333;
        `;

    const colorTitle = document.createElement('div');
    colorTitle.style.cssText = `
            padding: 6px 12px;
            color: #aaa;
            font-size: 11px;
        `;
    colorTitle.textContent = 'Panel color:';
    colorSection.appendChild(colorTitle);

    // ✨ СОЗДАЕМ COLOR PICKER (ТОЛЬКО ОДИН РАЗ!)
    if (!this.colorPicker) {
      this.colorPicker = new ColorPicker({
        columns: 8,
        rows: 4,
        cellSize: 14,
        showReset: true, // ← ЭТО СОЗДАСТ resetBtn ВНУТРИ!
        resetText: '↺ Default Gray',
        onSelect: (color) => this.changePanelColor(color),
        onReset: () => this.resetPanelColor(),
      });

      const pickerElement = this.colorPicker.create();
      colorSection.appendChild(pickerElement);
    } else {
      colorSection.appendChild(this.colorPicker.element);

      const currentColor = this.currentModule.customColor || '#606060';
      this.colorPicker.setColor(currentColor);
    }

    this.menuElement.appendChild(colorSection);

    // 3. Удалить модуль
    this.menuElement.appendChild(this.createSeparator());
    this.menuElement.appendChild(
      this.createMenuItem(
        '🗑️ Delete Module',
        () => this.deleteModule(),
        '#ff6b6b',
      ),
    );
  }

  // Добавляем метод getContrastColor (как в JackContextMenu)
  getContrastColor(hexColor) {
    if (!hexColor) return '#000';

    const hex = hexColor.replace('#', '');

    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    } else if (hex.length === 6) {
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    }

    return '#000000';
  }

  createMenuItem(text, onClick) {
    const item = document.createElement('div');
    item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
    item.innerHTML = text;

    item.onmouseenter = () => (item.style.background = '#3a3a3a');
    item.onmouseleave = () => (item.style.background = 'transparent');
    item.onclick = (e) => {
      e.stopPropagation();
      onClick();
      this.hide();
    };

    return item;
  }

  createSeparator() {
    const separator = document.createElement('div');
    separator.style.cssText = `
            height: 1px;
            background: #333;
            margin: 4px 0;
        `;
    return separator;
  }

  setLayer(newLayer) {
    if (!this.currentModule) return;
    
    const currentLayer = this.currentModule.layer || 'voice';
    if (currentLayer === newLayer) return;

    // Проверяем кабели
    const cables = this.system.patchManager.findCablesByModule(this.currentModule.moduleId);
    if (cables.length > 0) {
      const layerNames = { voice: 'Voice', fx: 'FX' };
      const ok = confirm(
        `У модуля "${this.currentModule.title}" есть ${cables.length} кабел${cables.length === 1 ? 'ь' : cables.length < 5 ? 'я' : 'ей'}.\n\n` +
        `При смене слоя на ${layerNames[newLayer]} все кабели будут удалены.\n\n` +
        `Продолжить?`
      );
      if (!ok) return;
      
      cables.forEach(cable => {
        this.system.patchManager.removeCable(cable);
      });
    }

    const module = this.currentModule;

    // ⭐ Удаляем ИЗ ВСЕХ слоёв (надёжно)
    this.system.layerManager.removeModuleFromLayer(module);
    
    // ⭐ Удаляем из CsoundGenerator
    this.system.csoundGen.removeModule(
      module.jsonId,
      module.jsonName || module.type,
      module.typeID,
      currentLayer
    );

    // ⭐ Ставим новый слой
    module.layer = newLayer;
    
    // ⭐ Добавляем в новый слой
    this.system.layerManager.addModuleToLayer(module, newLayer);
    
    // ⭐ Добавляем в CsoundGenerator
    this.system.csoundGen.addModule({
      typeId: module.jsonName || module.type,
      instanceId: module.jsonId,
      instanceName: module.jsonName || module.type,
      layer: newLayer,
      parameters: [],
      mode: [],
      defaultParams: [],
      defaultMode: [],
      inlets: 1,
      outlets: 1,
      isUser: false,
    });

    // Перерисовка
    this.system._voiceDirty = true;
    this.system._fxDirty = true;
    this.system._cablesDirty = true;

    // Recompile
    if (this.system.csoundEngine?.state === 'running') {
      this.system._recompileDebounced();
    }

    this.system.showNotification(`✓ ${module.title} → ${newLayer.toUpperCase()}`);
    this.hide();
  }
  createHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
            padding: 8px 12px;
            background: #333;
            color: #0af;
            font-size: 12px;
            border-bottom: 1px solid #444;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

    // Название модуля
    const title = document.createElement('span');
    title.textContent = this.currentModule?.title || 'Module';

    // Тип модуля (маленьким шрифтом)
    const type = document.createElement('span');
    type.style.cssText = `
            font-size: 10px;
            color: #888;
            font-weight: normal;
        `;
    type.textContent = this.currentModule?.jsonName || '';

    header.appendChild(title);
    header.appendChild(type);

    return header;
  }

  // Действия меню
  openCsoundCode() {
    if (!this.currentModule) return;

    // Открываем окно с кодом
    if (this.system.csoundWindow) {
      this.system.csoundWindow.show(this.currentModule);
    }
  }

  // В ModuleContextMenu.js - обновленный changePanelColor()

  // В ModuleContextMenu.js - исправленный changePanelColor()

  changePanelColor(colorHex) {
    if (!this.currentModule) return;

    // 🚫 Защита от повторных вызовов
    if (this._changingColor) return;
    this._changingColor = true;

    // 🎨 Устанавливаем цвет
    this.currentModule.customColor = colorHex;

    // Перерисовываем
    if (this.currentModule.layer === 'voice') {
        this.system._voiceDirty = true;
    } else {
        this.system._fxDirty = true;
    }
    this.system.forceRedraw?.();
    this.system.showNotification(`🎨 Panel color changed`);

    // 🚫 НЕ обновляем меню! Оно и так актуально

    // Разблокируем через небольшую задержку
    setTimeout(() => {
      this._changingColor = false;
    }, 100);
  }

  // В resetPanelColor() - аналогично
  resetPanelColor() {
    if (!this.currentModule) return;

    if (this._changingColor) return;
    this._changingColor = true;

    this.currentModule.customColor = null;

    if (this.system) {
      this.system.needsRedraw = true;
      requestAnimationFrame(() => this.system.animate());
    }

    this.system.showNotification(`↺ Panel color reset to default`);

    setTimeout(() => {
      this._changingColor = false;
    }, 100);
  }

  deleteModule() {
    if (!this.currentModule) return;

    if (
      confirm(
        `Delete module "${this.currentModule.title}"? All connected cables will be removed.`,
      )
    ) {
      this.system.removeModule(this.currentModule);
      this.system.showNotification(`🗑️ Module deleted`);
    }
  }

  setupEventListeners() {
    document.addEventListener('click', (e) => {
      if (
        this.menuElement &&
        !this.menuElement.contains(e.target) &&
        this.menuElement.style.display === 'block'
      ) {
        this.hide();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.menuElement.style.display === 'block') {
        this.hide();
      }
    });
  }

  injectStyles() {
    if (document.getElementById('module-menu-styles')) return;

    const style = document.createElement('style');
    style.id = 'module-menu-styles';
    style.textContent = `
            #module-context-menu div[style*="cursor: pointer"]:hover {
                background: #3a3a3a !important;
            }
            
            #module-context-menu div[style*="cursor: pointer"]:active {
                background: #4a4a4a !important;
            }
        `;
    document.head.appendChild(style);
  }
}
