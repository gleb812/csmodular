// src/ui/ModuleContextMenu.js
import { ColorPicker } from './ColorPicker.js';
import { injectColorPickerStyles } from './ColorPickerStyles.js';
import { isValidCategory, normalizeCategory } from '../moduleCategories.js';
import { libraryStore } from '../api/index.js';
const IS_DEV = import.meta.env.DEV;
export class ModuleContextMenu {
  constructor(system) {
    this.system = system;
    this.menuElement = null;
    this.currentModule = null;

    this.createMenuElement();
    this.setupEventListeners();
    this.injectStyles();
    ColorPicker.injectStyles();
  }

  createMenuElement() {
    this.menuElement = document.createElement('div');
    this.menuElement.id = 'module-context-menu';
    this.menuElement.style.cssText = `
            position: fixed;
            min-width: 150px;
            max-width: 170px;
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
    if (this.system?.locked) {
      this.system.showNotification?.('🔒 Patch is locked');
      return;
    }
    this.currentModule = module;
    this.updateMenuContent();

    this.menuElement.style.left = `${x}px`;
    this.menuElement.style.top = `${y}px`;
    this.menuElement.style.display = 'block';

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

    // === ЗАГОЛОВОК ===
    this.menuElement.appendChild(this.createHeader());

    // === LAYER SWITCHER ===
    const layerSection = document.createElement('div');
    layerSection.style.cssText = `
            padding: 6px 8px;
            border-bottom: 1px solid #333;
        `;

    const layerTitle = document.createElement('div');
    layerTitle.style.cssText = `
            color: #aaa;
            font-size: 10px;
            margin-bottom: 4px;
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
            padding: 5px 6px;
            background: ${isVoice ? '#0a3a5a' : '#2a2a2a'};
            border: 1px solid ${isVoice ? '#0af' : '#444'};
            color: ${isVoice ? '#0af' : '#aaa'};
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            letter-spacing: 0.2px;
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
            padding: 5px 6px;
            background: ${isFx ? '#3a2a0a' : '#2a2a2a'};
            border: 1px solid ${isFx ? '#f59e0b' : '#444'};
            color: ${isFx ? '#f59e0b' : '#aaa'};
            border-radius: 4px;
            cursor: pointer;
            font-size: 10px;
            letter-spacing: 0.2px;
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

    // === OPEN IN EDITOR ===
    this.menuElement.appendChild(
      this.createMenuItem(
        'Open in Editor',
        () => this.openModuleInEditor(),
      ),
    );
    this.menuElement.appendChild(this.createSeparator());

    // === PANEL COLOR (dev only — legacy Classic feature) ===
    if (IS_DEV) {
        const colorSection = document.createElement('div');
        colorSection.style.cssText = `
                padding: 4px 8px;
                border-bottom: 1px solid #333;
            `;

        const colorTitle = document.createElement('div');
        colorTitle.style.cssText = `
                padding: 6px 8px;
                color: #aaa;
                font-size: 10px;
            `;
        colorTitle.textContent = 'Panel color:';
        colorSection.appendChild(colorTitle);

        if (!this.colorPicker) {
            this.colorPicker = new ColorPicker({
                columns: 8,
                rows: 4,
                cellSize: 14,
                showReset: true,
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
    }

    // === DELETE ===
    this.menuElement.appendChild(this.createSeparator());
    this.menuElement.appendChild(
      this.createMenuItem(
        '🗑️ Delete Module',
        () => this.deleteModule(),
        '#ff6b6b',
      ),
    );
  }

  // ============================================================
  //  ЗАГОЛОВОК
  // ============================================================

  createHeader() {
    const header = document.createElement('div');
    header.style.cssText = `
            padding: 6px 8px;
            background: #333;
            color: #0af;
            font-size: 11px;
            border-bottom: 1px solid #444;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

    // Название модуля (слева, синим)
    const title = document.createElement('span');
    title.textContent = this.currentModule?.title || 'Module';

    // ⭐ Категория (справа, серым) — вместо дублирующего jsonName
    const category = document.createElement('span');
    category.style.cssText = `
            font-size: 10px;
            color: #888;
            font-weight: normal;
            margin-left: 6px;
            white-space: nowrap;
        `;
    category.textContent = this._getModuleCategoryLabel();

    header.appendChild(title);
    header.appendChild(category);

    return header;
  }

  _getModuleCategoryLabel() {
    const m = this.currentModule;
    if (!m) return '';

    // library-система: category обязательна и должна быть из CATEGORIES
    if (isValidCategory(m.category)) {
      return m.category.charAt(0).toUpperCase() + m.category.slice(1);
    }

    // category есть, но невалидна → normalizeCategory даст 'custom' + warn
    if (m.category !== undefined && m.category !== null) {
      const { category } = normalizeCategory(m, `ModuleContextMenu/${m.jsonName || m.title || '?'}`);
      return category.charAt(0).toUpperCase() + category.slice(1);
    }

    // category нет вообще (старый модуль до library-системы) → Custom
    return 'Custom';
  }

  // ============================================================
  //  ПУНКТЫ МЕНЮ
  // ============================================================

  createMenuItem(text, onClick) {
    const item = document.createElement('div');
    item.style.cssText = `
            padding: 6px 8px;
            cursor: pointer;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 6px;
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

  // ============================================================
  //  OPEN IN EDITOR
  // ============================================================

  async openModuleInEditor() {
    const module = this.currentModule;
    if (!module) return;

    const def = this.system.moduleFactory?.moduleRegistry?.[module.jsonName];
    const baseName = module.jsonName || module.type || module.title;
    const srcLib = module.library || def?.library || 'user';

    this.system.showNotification?.(`⏳ Preparing ${baseName}…`);

    // 1. Проверить, что оригинал читается (быстрый fail до открытия окна)
    let data = null;
    try {
      data = await libraryStore.loadModule(srcLib, baseName);
    } catch (e) {
      console.warn('[ModuleContextMenu] loadModule failed:', e);
    }
    if (!data) {
      this.system.showNotification?.(`❌ Cannot read source of ${srcLib}/${baseName}`);
      return;
    }

    // 2. Свободное имя <base>_vN (в user)
    const copyName = await this._findFreeCopyName(baseName);

    // 3. Открыть редактор с ?module=<copyName>&source=<baseName>&lib=<srcLib>
    //    Файл НЕ создаём — это сделает Save в редакторе.
    this._openEditorWithModule(copyName, baseName, srcLib);
    this.system.showNotification?.(`✏️ ${copyName} opened in Editor (unsaved)`);
    this.hide();
  }

  /**
   * Первое свободное имя <base>_v1, <base>_v2, … среди user-модулей.
   * Учитывает также built-in, чтобы не было коллизий по type
   * (Csound opcode — глобальный).
   */
  async _findFreeCopyName(baseName) {
    const taken = new Set();

    // user
    try {
      const mods = await libraryStore.listModules('user');
      for (const m of mods) taken.add(m.name);
    } catch { /* ignore */ }

    // built-in (на случай если base уже занят в другой lib)
    try {
      const libs = await libraryStore.listLibraries();
      for (const lib of libs) {
        if (lib.name === 'user') continue;
        try {
          const mods = await libraryStore.listModules(lib.name);
          for (const m of mods) taken.add(m.name);
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }

    let n = 1;
    while (taken.has(`${baseName}_v${n}`)) n++;
    return `${baseName}_v${n}`;
  }

  /**
   * Fallback: если libraryStore.loadModule вернул description, но не jsCode
   * (например, старый формат), собираем JS-код из description.
   * В текущем libraryStore.loadModule jsCode не возвращается — только
   * description и dspCode, поэтому этот метод нужен.
   */
  _regenerateJsCode(exportName, description) {
    const obj = description || {};
    const json = JSON.stringify(obj, null, 4);
    // exportName: 'VCO_v1' → 'VCO_v1Module'
    const safeExport = String(exportName).replace(/[^a-zA-Z0-9_]/g, '_');
    return (
      `// Automatically generated by CsModular Module Editor\n` +
      `export const ${safeExport}Module = ${json};\n`
    );
  }

  _openEditorWithModule(moduleName, sourceName, srcLib) {
    const qs = new URLSearchParams({
      module: moduleName,
      source: sourceName,
      lib: srcLib,
    }).toString();
    const url = `/editor/editor.html?${qs}`;
    const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

    if (isTauri) {
      import('@tauri-apps/api/webviewWindow').then(async ({ WebviewWindow }) => {
        try {
          const existing = await WebviewWindow.getByLabel('editor');
          if (existing) await existing.close();
          const w = new WebviewWindow('editor', {
            url,
            title: `CsModular — ${moduleName}`,
            width: 1400, height: 900, resizable: true, center: true,
          });
          w.once('tauri://error', (e) => console.error('Editor window error:', e));
        } catch (e) {
          console.error('Failed to open editor window:', e);
        }
      });
    } else {
      window.open(url, '_blank');
    }
  }

  // ============================================================
  //  LAYER
  // ============================================================

  setLayer(newLayer) {
    if (this.system?.locked) {
      this.system.showNotification?.('🔒 Patch is locked');
      return;
    }
    if (!this.currentModule) return;

    const currentLayer = this.currentModule.layer || 'voice';
    if (currentLayer === newLayer) return;

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

    this.system.layerManager.removeModuleFromLayer(module);

    this.system.csoundGen.removeModule(
      module.jsonId,
      module.jsonName || module.type,
      module.typeID,
      currentLayer
    );

    module.layer = newLayer;

    this.system.layerManager.addModuleToLayer(module, newLayer);

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

    this.system._voiceDirty = true;
    this.system._fxDirty = true;
    this.system._cablesDirty = true;

    if (this.system.csoundEngine?.state === 'running') {
      this.system._recompileDebounced();
    }

    this.system.showNotification(`✓ ${module.title} → ${newLayer.toUpperCase()}`);
    this.hide();
  }

  // ============================================================
  //  ЦВЕТ ПАНЕЛИ
  // ============================================================

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

  changePanelColor(colorHex) {
    if (!this.currentModule) return;

    if (this._changingColor) return;
    this._changingColor = true;

    this.currentModule.customColor = colorHex;

    if (this.currentModule.layer === 'voice') {
        this.system._voiceDirty = true;
    } else {
        this.system._fxDirty = true;
    }
    this.system.forceRedraw?.();
    this.system.showNotification(`🎨 Panel color changed`);

    setTimeout(() => {
      this._changingColor = false;
    }, 100);
  }

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

  // ============================================================
  //  DELETE
  // ============================================================

  deleteModule() {
      if (this.system?.locked) {
          this.system.showNotification?.('🔒 Patch is locked');
          return;
      }
      if (!this.currentModule) return;

      this.system.removeModule(this.currentModule);
  }

  // ============================================================
  //  EVENTS / STYLES
  // ============================================================

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