// main.js
import { ModuleFactory } from './src/ModuleFactory.js';
import { initCurrentTheme } from './src/theme/currentTheme.js';
import { GRID_UNITS } from './constants.js';
import { Panel } from './src/components/Panel.js';
import { PatchManager } from './src/PatchManager.js';
import { PatchLoader } from './src/PatchLoader.js';
import { LayerManager } from './src/managers/LayerManager.js';
import { EventManager } from './src/managers/EventManager.js';
import { UIManager } from './src/managers/UIManager.js';
import { ContextMenu } from './src/ui/ContextMenu.js';
import { JackContextMenu } from './src/ui/JackContextMenu.js';
import { ModuleContextMenu } from './src/ui/ModuleContextMenu.js'; 
import { CSoundWindow } from './src/ui/CSoundWindow.js'; 
import { CsoundGenerator } from './src/csound/CsoundGenerator.js';
import { CsoundEngine } from './src/csound/CsoundEngine.js';
import { DesignSettingsPanel } from './src/ui/DesignSettingsPanel.js';
import { MappingTables } from './src/csound/MappingTables.js';
import { debounce } from './src/utils/debounce.js';

// Глобальный обработчик ошибок
window.addEventListener('error', (event) => {
  console.error('💥 GLOBAL ERROR:', event.error);
  console.error('💥 Error in:', event.filename, 'line:', event.lineno);

  if (modularSystem) {
    modularSystem.showNotification(
      `💥 Error: ${event.error?.message || 'Unknown error'}`,
    );
  }

  // Не останавливаем распространение
});



// Глобальное логирование для Csound
window.csoundLog = [];

function logCsound(message, data = null) {
    const entry = {
        time: new Date().toISOString(),
        message: message,
        data: data,
        stack: new Error().stack?.split('\n').slice(2, 5).join('\n')
    };
    window.csoundLog.push(entry);
    console.log(`🎵 [Csound] ${message}`, data || '');
}

// Перехватываем ошибки Csound
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('csound') || 
        event.reason?.message?.includes('Csound')) {
        logCsound('UNHANDLED CSOUND ERROR', {
            message: event.reason.message,
            stack: event.reason.stack
        });
    }
});


class ModularSystem {
  constructor() {
    this._voiceDirty = true;
    this._fxDirty = true;
    // Проверяем, не создан ли уже экземпляр
    if (window.modularSystemInstance) {
      console.warn('⚠️ ModularSystem already exists! Reusing...');
      return window.modularSystemInstance;
    }
    this.canvas = document.getElementById('modularCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.components = [];
    this.draggingComponent = null;
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isPanning = false;
    this.startPanX = 0;
    this.startPanY = 0;
    this.startOffsetX = 0;
    this.startOffsetY = 0;
    this.activePanel = null;
    this.imageUploadBtn = null;
    this.lastMouseX = null;
    this.lastMouseY = null;
    this.debugCables = false;
    this.currentPatchFilename = null;
    this.showGrid = true;   // ← НОВОЕ

    this.layerManager = new LayerManager(this.canvas);
    this.layerManager.system = this;
    this.patchManager = new PatchManager(this);
    this.eventManager = new EventManager(this.canvas, this);
    this.uiManager = new UIManager(this);
    this.contextMenu = new ContextMenu(this);
    this.jackContextMenu = new JackContextMenu(this);
    this.moduleContextMenu = new ModuleContextMenu(this);
    this.csoundWindow = new CSoundWindow(this);
    this.designSettings = new DesignSettingsPanel(this);

    this.collisionHighlight = {
      show: false,
      gridX: 0,
      gridY: 0,
    };

    this.moduleFactory = new ModuleFactory();
    this.moduleFactory.parentSystem = this;

    this.patchLoader = new PatchLoader(this);
    this.selectedModule = null; // Выбранный модуль для удаления
    window.modularSystemInstance = this;
    this.setupKeyboardListeners();
    this.setupCanvas();
    this.setupResizeHandler();
    this.animate();

    // ⭐ Parallax фон
    this.parallaxElement = document.getElementById('parallax-bg');
    this.parallaxMouseX = 0;
    this.parallaxMouseY = 0;
    this.parallaxCurrentX = 0;
    this.parallaxCurrentY = 0;
    this.parallaxStrength = 20;   // ← сила смещения в px
    this.parallaxSmoothing = 0.08; // ← плавность (0..1)


    // === ДОБАВЛЯЕМ ДЛЯ ОТЛАДКИ ===
    this.frameCount = 0;
    this.lastFPSTime = performance.now();
    this.currentFPS = 0;

    //this.maxFPS = 60; // Ограничиваем до 60 FPS
    //this.frameInterval = 1000 / this.maxFPS;
    this.lastFrameTime = 0;

    // === ИСПРАВЛЕННЫЙ ПРОФАЙЛЕР ===
    this.profiler = {
      enabled: true,
      marks: {},
      times: {
        total: 0,
        clear: 0,
        drawVoice: 0,
        drawFx: 0,
        drawDivider: 0,
        drawCables: 0,
      },
      frameCount: 0,
      lastLogTime: performance.now(),
    };

    // Добавляем методы прямо в класс
    this.startMeasure = this.startMeasure.bind(this);
    this.endMeasure = this.endMeasure.bind(this);
    this.logPerformance = this.logPerformance.bind(this);

    // ⭐ Mapping tables
    // в конструкторе:
    this.mappingTables = new MappingTables();
    this.mappingTables.load();

    // Csound Generator (генерирует ORC)
    this.csoundGen = new CsoundGenerator();
    this.csoundGen.system = this; 
    this.csoundGen.loadUserModules();

    // Csound Engine (управляет инстансом Csound)
    this.csoundEngine = new CsoundEngine(this);
    this.csoundEngine.onStateChange((state, info) => {
        this.uiManager.updateCsoundStatus(
            this._csoundStateLabel(state),
            this._csoundStateColor(state)
        );
        this.uiManager.updateCsoundInfo(info || this._csoundStateInfo(state));
        this.uiManager.updateCsoundRunButton(state);
    });

    // Debounce для recompile (не чаще раза в 300мс)
    this._recompileDebounced = debounce(
        () => this.csoundEngine.recompile(),
        300
    );
    this.setupParallax();
  }


  setupParallax() {
      if (!this.parallaxElement) return;
      
      document.addEventListener('mousemove', (e) => {
          // Нормализуем: -1..1 от центра экрана
          this.parallaxMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
          this.parallaxMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      });
  }

  updateParallax() {
      if (!this.parallaxElement) return;
      
      // Плавное приближение к целевой позиции
      const targetX = -this.parallaxMouseX * this.parallaxStrength;
      const targetY = -this.parallaxMouseY * this.parallaxStrength;
      
      this.parallaxCurrentX += (targetX - this.parallaxCurrentX) * this.parallaxSmoothing;
      this.parallaxCurrentY += (targetY - this.parallaxCurrentY) * this.parallaxSmoothing;
      
      this.parallaxElement.style.transform = 
          `translate3d(${this.parallaxCurrentX}px, ${this.parallaxCurrentY}px, 0)`;
  }


  _renderLeds() {
      const ctx = this.ctx;
      const layers = this.layerManager.layers;
      
      ctx.save();
      ctx.translate(this.offsetX, this.offsetY);
      ctx.scale(this.scale, this.scale);
      
      ['voice', 'fx'].forEach(layerName => {
          const layer = layers[layerName];
          if (!layer) return;
          
          layer.modules.forEach(module => {
              if (!module.components) return;
              if (module.pixelX === null || module.pixelY === null) return;
              
              const leds = module.components.filter(c => c.constructor.name === 'LED');
              if (leds.length === 0) return;
              
              const bgColor = module.customColor || module.defaultColor || '#606060';
              
              leds.forEach(led => {
                  // Затираем область LED цветом панели
                  ctx.fillStyle = bgColor;
                  ctx.fillRect(led.x - 1, led.y - 1, led.width + 2, led.height + 2);
                  
                  // Перерисовываем LED (внутри draw сам читает значение)
                  led.draw(ctx);
              });
          });
      });
      
      ctx.restore();
  }


  _csoundStateLabel(state) {
      return {
          'idle': 'IDLE',
          'initializing': 'INIT...',
          'running': 'RUNNING',
          'error': 'ERROR'
      }[state] || state.toUpperCase();
  }

  _csoundStateColor(state) {
      return {
          'idle': '#8f8',
          'initializing': '#ff0',
          'running': '#0f0',
          'error': '#f44'
      }[state] || '#fff';
  }

  _csoundStateInfo(state) {
      return {
          'idle': 'Not running',
          'initializing': 'Starting Csound...',
          'running': 'Csound running',
          'error': 'Csound failed to start'
      }[state] || '';
  }


  startMeasure(name) {
    // Защита от undefined
    if (!this.profiler) {
      // Если profiler не существует - создаем на лету
      this.profiler = {
        enabled: true,
        marks: {},
        times: {},
        frameCount: 0,
        lastLogTime: performance.now(),
      };
    }

    if (!this.profiler.enabled) return;
    this.profiler.marks[name] = performance.now();
  }

  endMeasure(name) {
    // Защита от undefined
    if (!this.profiler || !this.profiler.enabled) return 0;

    const start = this.profiler.marks[name];
    if (!start) return 0;

    const duration = performance.now() - start;

    // Инициализируем times[name] если нужно
    if (!this.profiler.times[name]) {
      this.profiler.times[name] = 0;
    }

    // Сглаживание
    const alpha = 0.3;
    this.profiler.times[name] =
      this.profiler.times[name] * (1 - alpha) + duration * alpha;

    delete this.profiler.marks[name];
    return duration;
  }

  resetProfiler() {
    if (!this.profiler) return;
    this.profiler.times = {
      total: 0,
      clear: 0,
      drawVoice: 0,
      drawFx: 0,
      drawDivider: 0,
      drawCables: 0,
    };
    this.profiler.frameCount = 0;
    this.profiler.lastLogTime = performance.now();
  }


  // Добавь этот метод в класс ModularSystem
  forceRedraw() {
      this._forceRedraw = true;
      this._voiceDirty = true;
      this._fxDirty = true;
      this._cablesDirty = true;
  }  


  /**
   * Пересчитать активные варианты для всех модулей патча
   * и применить к UI: обновить типы джеков, перекрасить выходные кабели.
   * 
   * Вызывается после addCable / removeCable.
   */
  async recomputeVariantUI() {
      if (!this.csoundGen) return;
      
      // 1. Убедиться, что variants загружены и активный вариант посчитан
      await this.csoundGen._loadVariantsForModules();
      this.csoundGen._prepareVariants();
      
      // 2. Пройти по всем панелям и применить _activeVariant
      const panels = this.components.filter(c => c.constructor.name === 'Panel');
      
      for (const panel of panels) {
          // Найти соответствующий moduleData в CsoundGenerator
          const moduleData = [...this.csoundGen.modules.values()]
              .find(m => m.instanceId === panel.jsonId);
          if (!moduleData) continue;
          
          const moduleDef = this.moduleFactory?.moduleRegistry?.[moduleData.typeId];
          if (!moduleDef?.variants || moduleDef.variants.length < 2) continue;
          
          const activeSuffix = moduleData._activeVariant;
          if (!activeSuffix) continue;
          
          // Сравниваем с тем, что уже применено
          if (panel._lastAppliedVariant === activeSuffix) continue;
          
          // Найти активный вариант
          const activeVariant = moduleDef.variants.find(v => v.suffix === activeSuffix);
          if (!activeVariant) continue;
          
          // Применяем к компонентам панели
          this._applyVariantToPanel(panel, activeVariant);
          
          panel._lastAppliedVariant = activeSuffix;
      }
      
      // 3. Force redraw
      this._voiceDirty = true;
      this._fxDirty = true;
      this._cablesDirty = true;
      this.forceRedraw?.();
  }

  /**
   * Применить вариант к панели: обновить типы джеков и перекрасить выходные кабели.
   */
  _applyVariantToPanel(panel, variant) {
      const moduleDef = this.moduleFactory?.moduleRegistry?.[panel.jsonName];
      if (!moduleDef) return;
      
      const inputIds = moduleDef.inputs || [];
      const outputIds = moduleDef.outputs || [];
      
      // ⭐ Обновляем типы Input
      for (let i = 0; i < inputIds.length; i++) {
          const id = inputIds[i];
          const newType = this._typeFromSuffix(variant.ins[i]);
          const comp = panel.components.find(c => String(c.id) === String(id));
          if (comp && comp.type !== newType) {
              comp.type = newType;
          }
      }
      
      // ⭐ Обновляем типы Output
      for (let i = 0; i < outputIds.length; i++) {
          const id = outputIds[i];
          const newType = this._typeFromSuffix(variant.outs[i]);
          const comp = panel.components.find(c => String(c.id) === String(id));
          if (comp && comp.type !== newType) {
              comp.type = newType;
          }
      }
      
      // ⭐ Перекрашиваем ВЫХОДНЫЕ кабели (от этой панели)
      for (const cable of this.patchManager.cables) {
          const fromPanel = cable.fromJack?.parentModule;
          if (fromPanel !== panel) continue;
          
          // Обновляем цвет кабеля по типу источника
          const sourceType = cable.fromJack.type;
          const newColor = this.patchManager.CABLE_COLORS[sourceType] 
                        || this.patchManager.CABLE_COLORS.other;
          cable.typeColor = newColor;
          
          // Обновляем цвет центра приёмного джека
          if (cable.toJack) {
              cable.toJack.updateCenterColor(cable.getDisplayColor());
          }
      }
      
      // ⭐ Перерисовка джека-источника
      panel.components.forEach(comp => {
          if (comp.constructor.name === 'Input' || comp.constructor.name === 'Output') {
              comp.connected = comp.cables.length > 0;
          }
      });
  }

  /**
   * Преобразовать суффикс варианта в тип джека.
   * 'k' → 'control', 'a' → 'audio', всё прочее — как есть.
   */
  _typeFromSuffix(suffix) {
      if (suffix === 'a') return 'audio';
      if (suffix === 'k') return 'control';
      return suffix || 'control';
  }


  toggleProfiler(enabled) {
    if (!this.profiler) return;
    this.profiler.enabled =
      enabled !== undefined ? enabled : !this.profiler.enabled;
    console.log(
      `📊 Profiler ${this.profiler.enabled ? 'enabled' : 'disabled'}`,
    );
    return this.profiler.enabled;
  }

  updateCanvasDisplay() {
    if (!this.canvas) return;

    // Базовые размеры (если не установлены)
    if (!this.baseCanvasWidth || !this.baseCanvasHeight) {
      this.baseCanvasWidth = this.canvas.width;
      this.baseCanvasHeight = this.canvas.height;
    }

    const container = this.canvas.parentElement || document.body;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Сохраняем aspect ratio базовых размеров
    const baseAspect = this.baseCanvasWidth / this.baseCanvasHeight;
    const containerAspect = containerWidth / containerHeight;

    let displayWidth, displayHeight;

    if (containerAspect > baseAspect) {
      // Контейнер шире - ограничиваем по высоте
      displayHeight = containerHeight;
      displayWidth = displayHeight * baseAspect;
    } else {
      // Контейнер выше - ограничиваем по ширине
      displayWidth = containerWidth;
      displayHeight = displayWidth / baseAspect;
    }

    // Устанавливаем CSS размеры с центрированием
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;
    this.canvas.style.margin = 'auto';
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '50%';
    this.canvas.style.top = '50%';
    this.canvas.style.transform = 'translate(-50%, -50%)';

    console.log(`Canvas display: ${displayWidth}x${displayHeight}px`);
  }

  get layers() {
    if (this.layerManager) {
      return this.layerManager.layers;
    }
    // Fallback для совместимости
    return {
      voice: { modules: [], x: 10, y: 10, width: 0, visibleHeight: 0 },
      fx: { modules: [], x: 10, y: 320, width: 0, visibleHeight: 0 },
    };
  }

  addComponent(component) {
    this.components.push(component);
    // Сортируем по zIndex при добавлении
    this.sortComponentsByZIndex();
  }

  sortComponentsByZIndex() {
    this.components.sort((a, b) => {
      return (a.zIndex || 0) - (b.zIndex || 0);
    });
  }

  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      // Только если не в поле ввода
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'Delete':
        case 'Del':
          this.deleteSelectedModule();
          break;
        case 'Escape':
          this.deselectModule();
          break;
        case 'd':
        case 'D':
        case 'в':
        case 'В':  // русская раскладка
            // Не открывать если в поле ввода
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }
            e.preventDefault();
            this.designSettings.toggle();
            break;
      }
    });
  }

  selectModule(module) {
    // Снимаем выделение с предыдущего модуля
    if (this.selectedModule && this.selectedModule !== module) {
      this.selectedModule.setSelected(false);
    }

    this.selectedModule = module;
    module.setSelected(true);

    //console.log(`🔘 Selected: ${module.title}`);
    //this.showNotification(`Selected: ${module.title} (Press Del to delete)`);
  }

  deselectModule() {
    if (this.selectedModule) {
      this.selectedModule.setSelected(false);
      this.selectedModule = null;
    }
  }

  deleteSelectedModule() {
    if (!this.selectedModule) {
      console.log('No module selected');
      return;
    }

    const moduleName = this.selectedModule.title;
    const moduleId = this.selectedModule.moduleId;

    //console.log(`🗑️ Deleting module: ${moduleName} (${moduleId})`);

    // Удаляем модуль
    this.removeModule(this.selectedModule);

    // Сбрасываем выделение
    this.selectedModule = null;

    //this.showNotification(`Deleted: ${moduleName}`);
  }

  setupCanvas() {
      // ⭐ Canvas = окно браузера
      this.resizeCanvasToWindow();

      // Прозрачный фон
      this.canvas.style.backgroundColor = 'transparent';
      this.canvas.style.border = 'none';
      this.canvas.style.zIndex = '1';
      this.canvas.style.position = 'fixed';
      this.canvas.style.left = '0';
      this.canvas.style.top = '0';
      this.canvas.style.transform = 'none';   // ← убираем центрирование
      this.canvas.style.objectFit = 'none';

      // Сохраняем базовые размеры (для GridCache и т.д.)
      this.baseCanvasWidth = this.canvas.width;
      this.baseCanvasHeight = this.canvas.height;

      // Обновляем LayerManager
      this.layerManager.updateCanvasSize();

      // Обновляем UI
      setTimeout(() => {
          if (this.uiManager && this.uiManager.updatePosition) {
              this.uiManager.updatePosition();
          }
      }, 100);

      // ⭐ Ресайз — resize canvas
      window.addEventListener('resize', () => {
          this.resizeCanvasToWindow();
          this.layerManager.updateCanvasSize();
          this.layerManager.invalidateCache();   // сбросить кеши
          this.forceRedraw();
          
          if (this.uiManager && this.uiManager.updatePosition) {
              setTimeout(() => this.uiManager.updatePosition(), 50);
          }
      });

      // Контекстное меню — запрещено
      this.canvas.addEventListener('contextmenu', (e) => {
          e.preventDefault();
      });
  }

  // ⭐ Новый метод: подогнать canvas под окно
  resizeCanvasToWindow() {
      const dpr = window.devicePixelRatio || 1;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Внутренние размеры — на весь экран (с учётом DPR)
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;

      // CSS-размеры — на весь экран
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;

      // Масштаб контекста — если DPR > 1 (Retina)
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  openContextMenuAtMousePosition() {
    if (this.eventManager) {
      this.eventManager.openContextMenuAtPosition(
        this.eventManager.lastMouseX + this.canvas.offsetLeft,
        this.eventManager.lastMouseY + this.canvas.offsetTop,
      );
    }
  }

  setupResizeHandler() {
    let resizeTimeout;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        //console.log('Window resized, updating UI...');

        // Обновляем позицию UI панели
        if (this.uiManager && this.uiManager.updatePosition) {
          this.uiManager.updatePosition();
        }

        // Пересчитываем видимую область
        this.updateVisibleArea();
      }, 100);
    });
  }

  updateVisibleArea() {
    // Левый край всегда виден (x=0)
    // Правый край может обрезаться
    const canvasRect = this.canvas.getBoundingClientRect();

    //console.log(`Visible area: x=${canvasRect.left}-${canvasRect.right}, width=${canvasRect.width}`);

    // Можно добавить индикатор, что часть canvas не видна
    // if (canvasRect.right < window.innerWidth) {
    //     console.log('✅ Весь canvas виден');
    // } else {
    //     console.log(`⚠️ Правая часть canvas обрезана на ${canvasRect.right - window.innerWidth}px`);
    // }
  }

  updateUIPosition() {
    if (!this.uiManager || !this.uiManager.updatePosition) return;

    // Получаем реальные размеры canvas на экране
    const canvasRect = this.canvas.getBoundingClientRect();

    // Передаем в UI Manager
    this.uiManager.updatePosition(canvasRect);
  }

  updateCanvasSize() {
      // ⭐ Используем актуальные размеры canvas
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;

      // Voice слой
      this.layers.voice.x = 0;
      this.layers.voice.y = 0;
      this.layers.voice.width = canvasWidth;
      this.layers.voice.visibleHeight = this.divider.y;
      this.layers.voice.totalHeight = 2500;

      // FX слой
      this.layers.fx.x = 0;
      this.layers.fx.y = this.divider.y + 10;
      this.layers.fx.width = canvasWidth;
      this.layers.fx.visibleHeight = canvasHeight - this.layers.fx.y;
      this.layers.fx.totalHeight = 2500;

      // Сбросить кеши (размеры изменились)
      this.invalidateCache();
      this._gridCacheKey = null;   // сбросить grid-кеш
  }

  async loadPatchFromJson(patchData) {
    return await this.patchLoader.loadPatch(patchData);
  }

  async createPlaceholderModule(moduleName, moduleId, hpos, vpos, layerName) {
    // Проверяем, есть ли модуль-заглушка
    const placeholderName = 'MissingModule';

    if (!this.moduleFactory.moduleRegistry[placeholderName]) {
      try {
        // Пробуем загрузить модуль-заглушку
        const modulePath = `./modules/${placeholderName}.js`;
        const module = await import(/* @vite-ignore */ modulePath);
        const moduleKey = Object.keys(module)[0];

        if (moduleKey && module[moduleKey]) {
          this.moduleFactory.registerModule(placeholderName, module[moduleKey]);
        }
      } catch (error) {
        // Создаем простую заглушку
        const placeholderDef = {
          displayName: `MISS: ${moduleName}`,
          gridHeight: 2,
          width: 100,
          height: 60,
          components: [
            {
              componentType: 'TextLabel',
              x: 10,
              y: 10,
              text: `MISSING: ${moduleName}`,
              fontSize: 10,
              color: '#ff0000',
            },
            {
              componentType: 'TextLabel',
              x: 10,
              y: 25,
              text: `ID: ${moduleId}`,
              fontSize: 8,
              color: '#888888',
            },
          ],
          ports: [],
        };

        this.moduleFactory.registerModule(placeholderName, placeholderDef);
      }
    }

    // Создаем заглушку
    const placeholder = this.moduleFactory.createModule(
      placeholderName,
      hpos,
      vpos,
      layerName,
    );

    if (placeholder) {
      placeholder.jsonId = moduleId;
      placeholder.jsonName = moduleName;
      placeholder.isPlaceholder = true;

      this.moduleMap[moduleId] = placeholder;

      return placeholder;
    }

    return null;
  }

  exportPatch() {
    // Это будет использоваться для "Save" (сохранить с текущим именем)
    if (this.currentPatchFilename) {
      this.savePatch(this.currentPatchFilename);
    } else {
      // Если имени нет - вызываем Save As
      this.savePatchAs();
    }
  }

  exportPatchToJson() {
    console.log('=== ЭКСПОРТ ПАТЧА В JSON ===');

    // Собираем данные модулей
    const modulesData = this.collectModulesForExport();

    // Собираем данные кабелей
    const cablesData = this.collectCablesForExport();

    return {
      filename: this.currentPatchFilename || 'export.json',
      modules: modulesData,
      cables: cablesData,
      textpad: '',
    };
  }

  collectModulesForExport() {
    console.log('Собираем данные модулей...');

    // Фильтруем только панели (модули)
    const panels = this.components.filter(
      (c) => c.constructor.name === 'Panel',
    );

    return panels.map((module) => {
        const parameters = this.collectModuleParameters(module);
        
        return {
            name: module.jsonName || module.type || 'Unknown',
            id: module.jsonId || this.generateJsonId(module),
            type: module.typeID || 0,
            parameters: JSON.stringify(parameters),
            modes: [],
            area: (module.layer || 'voice').toUpperCase(),
            hpos: module.gridX || 0,
            vpos: module.gridY || 0,
            customColor: module.customColor || null,
        };
    });
  }

  collectModuleParameters(module) {
    const params = [];

    module.components.forEach((component) => {
      // Используем parameterId для индексации
      if (component.parameterId !== undefined) {
        const index = component.parameterId;

        // Получаем значение компонента
        let value = 0;

        if (component.getValue) {
          value = component.getValue();
        } else if (component.value !== undefined) {
          value = component.value;
        } else if (component.currentValue !== undefined) {
          value = component.currentValue;
        } else if (component.selectedIndex !== undefined) {
          value = component.selectedIndex;
        }

        // Сохраняем по правильному индексу
        params[index] = value;
      }
    });

    // Заполняем пропуски нулями
    for (let i = 0; i < params.length; i++) {
      if (params[i] === undefined) {
        params[i] = 0;
      }
    }

    return params;
  }

  collectCablesForExport() {
    //console.log('Собираем данные кабелей...');

    return this.patchManager.cables
      .map((cable) => {
        const fromModule = cable.fromJack?.parentModule;
        const toModule = cable.toJack?.parentModule;

        if (!fromModule || !toModule) {
          //console.warn('Кабель без модулей, пропускаем');
          return null;
        }

        // Получаем ConnectorIndex джеков (НЕ component.id!)
        const fromConnectorIndex = this.getComponentJsonId(cable.fromJack);
        const toConnectorIndex = this.getComponentJsonId(cable.toJack);

        // Определяем pin по типу джека
        const fromPin =
          cable.fromJack.constructor?.name === 'Output' ? 'out' : 'in';
        const toPin = cable.toJack.constructor?.name === 'Input' ? 'in' : 'out';

        //console.log(`Кабель: ${fromModule.jsonName}[${fromConnectorIndex}] → ${toModule.jsonName}[${toConnectorIndex}]`);
        //console.log(`  From: ${cable.fromJack.constructor.name} id=${cable.fromJack.id}, ConnectorIndex=${fromConnectorIndex}`);
        //console.log(`  To: ${cable.toJack.constructor.name} id=${cable.toJack.id}, ConnectorIndex=${toConnectorIndex}`);

        return {
          from: {
            module: fromModule.jsonName || fromModule.type,
            id: fromModule.jsonId,
            jack: fromConnectorIndex, // ← ConnectorIndex!
            pin: fromPin,
          },
          to: {
            module: toModule.jsonName || toModule.type,
            id: toModule.jsonId,
            jack: toConnectorIndex, // ← ConnectorIndex!
            pin: toPin,
          },
          color: cable.typeColor, // Функциональный цвет
          customColor: cable.visualColor,
          type: 'out-in',
          area: (fromModule.layer || 'voice').toUpperCase(),
        };
      })
      .filter((cable) => cable !== null);
  }

  getComponentJsonId(component) {
    // component.id - строка ("114"), а нам нужен ConnectorIndex!
    if (!component || !component.ConnectorIndex) {
      console.warn(`Компонент не имеет ConnectorIndex:`, component);
      return 0;
    }

    // Возвращаем ConnectorIndex (число)
    return parseInt(component.ConnectorIndex) || 0;
  }

  getColorName(colorHex) {
    // Простое преобразование hex в имя
    const colorMap = {
      '#ef4444': 'red',
      '#ff0000': 'red',
      '#3b82f6': 'blue',
      '#0000ff': 'blue',
      '#fde047': 'yellow',
      '#ffff00': 'yellow',
      '#ffffff': 'white',
    };

    return colorMap[colorHex] || 'red';
  }

  generateJsonId(module) {
    // Найти максимальный существующий jsonId
    const existingIds = this.components
      .filter((c) => c.jsonId && c !== module) // исключаем текущий модуль
      .map((c) => c.jsonId);

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const newId = maxId + 1;
    //console.log(`Generate JSON ID: max=${maxId}, new=${newId}`);
    return newId;
  }

  savePatch(filename = null) {
    try {
      const patchData = this.exportPatchToJson();
      const jsonString = JSON.stringify(patchData, null, 2);

      // Если имя файла не передано, используем текущее
      const actualFilename =
        filename || this.currentPatchFilename || 'patch_export.json';

      // Создаем файл для скачивания
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = actualFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Сохраняем имя файла
      this.currentPatchFilename = actualFilename;

      this.showNotification(`✅ Patch saved as ${actualFilename}`);

      return true;
    } catch (error) {
      this.showNotification(`❌ Error saving patch: ${error.message}`);
      return false;
    }
  }

  savePatchAs() {
    // Создаем диалог для ввода имени файла
    const filename = prompt(
      'Enter filename for patch:',
      this.currentPatchFilename || 'my_patch.json',
    );

    if (filename) {
      // Добавляем .json если его нет
      const actualFilename = filename.endsWith('.json')
        ? filename
        : filename + '.json';
      return this.savePatch(actualFilename);
    }

    return false;
  }

  async loadJsonPatch() {
    try {
      if (!this.patchLoader) {
        console.error('❌ patchLoader is not available!');
        this.showNotification('❌ System error: PatchLoader not initialized');
        return false;
      }

      const result = await this.patchLoader.loadPatchFromFile();
      if (result.success) {
        // Сохраняем имя загруженного файла
        this.currentPatchFilename = result.filename;

        // Обновляем UI через UIManager
        const moduleCount = this.components.filter(
          (c) => c instanceof Panel,
        ).length;
        const cableCount = this.patchManager.cables.length;

        if (this.uiManager && this.uiManager.updatePatchInfo) {
          this.uiManager.updatePatchInfo(
            result.filename,
            moduleCount,
            cableCount,
          );
        }

        this.showNotification(`✅ Patch loaded: ${result.filename}`);
        return true;
      } else {
        console.error('❌ loadPatchFromFile failed:', result.error);
        this.showNotification(`❌ Error: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('💥 Error in loadJsonPatch:', error);
      console.error('   Stack:', error.stack);
      this.showNotification(`❌ System error: ${error.message}`);
      return false;
    }
  }

  resetEverything() {
    console.log('=== RESETTING EVERYTHING ===');

    // Очищаем все массивы
    this.components = [];
    this.selectedModule = null;
    this.activePanel = null;
    this.currentPatchFilename = null; // Сбрасываем имя файла

    // Очищаем layerManager
    if (this.layerManager) {
      this.layerManager.layers.voice.modules = [];
      this.layerManager.layers.fx.modules = [];
    }

    // Очищаем patchManager
    if (this.patchManager) {
      this.patchManager.clear();
    }

    // Обновляем UI
    if (this.uiManager && this.uiManager.updatePatchInfo) {
      this.uiManager.updatePatchInfo('New Patch', 0, 0);
    }

    this.csoundGen.reset();
    // ⭐ Очищаем LED-каналы
    if (this.csoundEngine) {
        this.csoundEngine.clearLedChannels();
    }

    console.log('System reset complete');
    this.showNotification('🆕 New patch created');
  }

  generateModuleId() {
    return Math.floor(Math.random() * 1000) + 1;
  }

  async addNewModule(moduleType, layerName, gridX = null, gridY = null) {
    // Если переданы координаты - используем их
    if (gridX !== null && gridY !== null) {
      return this.addNewModuleAtPosition(moduleType, layerName, gridX, gridY);
    }

    // Иначе ищем свободное место
    const freeSpace = this.findFreeSpace(layerName, 1, 2);
    if (freeSpace) {
      return this.addNewModuleAtPosition(
        moduleType,
        layerName,
        freeSpace.gridX,
        freeSpace.gridY,
      );
    } else {
      this.showNotification(
        `❌ Нет места в слое ${layerName === 'voice' ? 'VA' : 'FX'}`,
      );
      return null;
    }
  }

  updatePatchInfo() {
    if (this.uiManager && this.uiManager.elements.patchInfo) {
      const moduleCount = this.components.filter(
        (c) => c instanceof Panel,
      ).length;
      const cableCount = this.patchManager.cables.length;

      // Можно обновить информацию о текущем патче
      // или просто оставить как есть
    }

    // Если нужно обновлять счётчики в реальном времени
    // можно добавить отдельный UI элемент
  }

  async removeModule(module) {
      if (!module) return;

      // ⭐ 0. Снимаем регистрацию LED-каналов (ДО удаления из components)
      if (this.csoundEngine && module.components) {
          const leds = module.components.filter(c => c.constructor.name === 'LED');
          leds.forEach(led => {
              if (led.sourceChannel) {
                  this.csoundEngine.unregisterLedChannel(led.sourceChannel);
                  console.log(`💡 Unregistered LED channel: ${led.sourceChannel}`);
              }
          });
      }

      // Удаляем из csound генератора
      this.csoundGen.removeModule(
          module.jsonId,
          module.jsonName || module.type,
          module.typeID,
          module.layer,
      );

      // 1. Удаляем все кабели, подключенные к модулю
      const cablesToRemove = this.patchManager.findCablesByModule(
          module.moduleId,
      );

      cablesToRemove.forEach((cable) => {
          this.patchManager.removeCable(cable);
      });

      // 2. Удаляем из слоя через LayerManager
      if (this.layerManager) {
          this.layerManager.removeModuleFromLayer(module);
      } else {
          // Fallback для старого кода
          if (module.layer && this.layers[module.layer]) {
              const layer = this.layers[module.layer];
              const index = layer.modules.indexOf(module);
              if (index > -1) {
                  layer.modules.splice(index, 1);
              }
          }
      }

      // 3. Удаляем из общего массива components
      const compIndex = this.components.indexOf(module);
      if (compIndex > -1) {
          this.components.splice(compIndex, 1);
      } else {
          console.log(`   Module not found in components array`);
      }

      // Устанавливаем dirty-флаги для перерисовки
      if (module.layer === 'voice') this._voiceDirty = true;
      else if (module.layer === 'fx') this._fxDirty = true;
      this._cablesDirty = true;

      if (this.forceRedraw) {
          this.forceRedraw();
      }

      // 4. Обновляем информацию о патче
      this.updatePatchInfo();

      // 5. Обновляем Csound если он запущен
      if (this.csoundEngine.state === 'running') {
          this._recompileDebounced();
      }

      // 6. Если это был выбранный модуль - снимаем выделение
      if (this.selectedModule === module) {
          this.deselectModule();
      }
  }

  bringModuleToFront(module) {
    // Перемещаем модуль в конец массива (он будет рисоваться последним)
    if (module.layer && this.layerManager.layers[module.layer]) {
      const layer = this.layerManager.layers[module.layer];
      const index = layer.modules.indexOf(module);
      if (index > -1) {
        layer.modules.splice(index, 1);
        layer.modules.push(module);
      }
    }

    // Также в общем массиве components
    const index = this.components.indexOf(module);
    if (index > -1) {
      this.components.splice(index, 1);
      this.components.push(module);
    }
  }

  exportCsd() {
    if (!this.csoundGen) {
      console.error('❌ csoundGen not initialized');
      return;
    }

    // Получаем полный .csd код
    const csdCode = this.csoundGen.generateFullCsd();

    // Имя файла: myPatch.csd (можно сделать динамическим позже)
    const filename = 'myPatch.csd';

    // Создаем и скачиваем файл
    const blob = new Blob([csdCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log(`✅ Exported ${filename}`);
    this.showNotification(`✅ Exported ${filename}`);
  }

  // get lastMouseX() {
  //     return this.eventManager?.lastMouseX || null;
  // }

  // get lastMouseY() {
  //     return this.eventManager?.lastMouseY || null;
  // }

  set lastMouseX(value) {
    if (this.eventManager) this.eventManager.lastMouseX = value;
  }

  set lastMouseY(value) {
    if (this.eventManager) this.eventManager.lastMouseY = value;
  }

  isGridCellFree(
    layerName,
    gridX,
    gridY,
    gridWidth = 1,
    gridHeight = 1,
    excludeModule = null,
  ) {
    return this.layerManager.isGridCellFree(
      layerName,
      gridX,
      gridY,
      gridWidth,
      gridHeight,
      excludeModule,
    );
  }

  findFreeSpace(
    layerName,
    gridWidth = 1,
    gridHeight = 1,
    startGridX = null,
    startGridY = null,
  ) {
    return this.layerManager.findFreeSpace(
      layerName,
      gridWidth,
      gridHeight,
      startGridX,
      startGridY,
    );
  }

  showNotification(message) {
    // Делегируем UIManager
    this.uiManager.showNotification(message);
  }

  async loadModuleList(selectElement, searchInput) {
    try {
      // Добавляем VCO вручную
      this.addModuleToSelect(selectElement, 'VCO', 'VCO Oscillator');

      // Пытаемся загрузить список файлов из папки modules
      await this.loadAvailableModules(selectElement);
    } catch (error) {
      console.warn('Не удалось загрузить список модулей:', error);
    }
  }

  loadInitialModules() {
    //console.log('Загрузка начального списка модулей...');

    const select = this.moduleSelectElement;
    if (!select) {
      //console.error('select element not found!');
      return;
    }

    // Очищаем все опции кроме первой
    while (select.options.length > 1) {
      select.remove(1);
    }

    // Пытаемся загрузить модули из папки (асинхронно)
    this.loadModulesFromFolder();
  }

  addModuleOption(value, text) {
    const select = this.moduleSelectElement;
    if (!select) return;

    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.appendChild(option);
  }

  async loadModulesFromFolder() {
    try {
      console.log('Попытка загрузить список модулей из папки...');

      // Пробуем получить список файлов
      const modulesDir = './modules/';

      // Создаем запрос к директории
      const response = await fetch(modulesDir);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const htmlText = await response.text();

      // Создаем временный div для парсинга
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlText;
      const links = tempDiv.querySelectorAll('a');
      let moduleCount = 0;

      for (const link of links) {
        let filename = link.textContent || link.getAttribute('href');

        // Очищаем имя файла
        if (filename) {
          // Убираем параметры запроса если есть
          filename = filename.split('?')[0];

          // Ищем .js файлы
          if (filename.endsWith('.js') && !filename.includes('VCO.module')) {
            const moduleName = filename.replace('.js', '');

            // Пробуем загрузить модуль для получения названия
            try {
              const modulePath = `./modules/${filename}`;
              const module = await import(/* @vite-ignore */ modulePath);
              const moduleKey = Object.keys(module)[0];

              if (moduleKey && module[moduleKey]) {
                const displayName = module[moduleKey].displayName || moduleName;
                this.addModuleOption(moduleName, displayName);
              } else {
                this.addModuleOption(moduleName, moduleName);
              }
            } catch (err) {
              // Если не удалось загрузить, добавляем просто по имени
              this.addModuleOption(moduleName, moduleName);
            }

            moduleCount++;
          }
        }
      }

      console.log(`Загружено модулей из папки: ${moduleCount}`);

      // Если ничего не нашли, добавляем тестовые
      if (moduleCount === 0) {
        console.log('Папка modules пуста, добавляем тестовые модули');
        this.addModuleOption('In2', '2 Inputs');
        this.addModuleOption('Out2', '2 Outputs');
        this.addModuleOption('VCF', 'VCF Filter');
        this.addModuleOption('VCA', 'VCA Amplifier');
        this.addModuleOption('LFO', 'Low Frequency Oscillator');
        this.addModuleOption('ADSR', 'ADSR Envelope');
      }
    } catch (error) {
      console.warn('Не удалось загрузить модули из папки:', error);

      // Fallback: добавляем тестовые модули
      this.addModuleOption('In2', '2 Inputs (fallback)');
      this.addModuleOption('Out2', '2 Outputs (fallback)');
      this.addModuleOption('VCF', 'VCF Filter (fallback)');
      this.addModuleOption('VCA', 'VCA Amplifier (fallback)');
    }
  }

  filterModuleList(searchTerm) {
    const select = this.moduleSelectElement;
    if (!select) return;

    const searchLower = searchTerm.toLowerCase();

    // Показываем/скрываем опции в зависимости от поиска
    for (let i = 0; i < select.options.length; i++) {
      const option = select.options[i];

      if (i === 0) {
        // Первую опцию (заглушку) всегда показываем
        option.style.display = '';
        continue;
      }

      const text = option.textContent.toLowerCase();
      if (searchTerm === '' || text.includes(searchLower)) {
        option.style.display = '';
      } else {
        option.style.display = 'none';
      }
    }
  }

async loadAvailableModules(selectElement) {
    let builtinCount = 0;
    let userCount = 0;
    
    // ⭐ 1. Штатные модули из ./modules/
    try {
        const response = await fetch('./modules/');
        const text = await response.text();
        
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(text, 'text/html');
        const links = htmlDoc.querySelectorAll('a');
        
        for (const link of links) {
            const filename = link.getAttribute('href');
            if (filename && filename.endsWith('.js') && !filename.includes('.module.js')) {
                const moduleName = filename.replace('.js', '');
                
                try {
                    const modulePath = `./modules/${filename}`;
                    const module = await import(/* @vite-ignore */ modulePath);
                    const moduleKey = Object.keys(module)[0];
                    if (moduleKey && module[moduleKey]) {
                        const displayName = module[moduleKey].displayName || moduleName;
                        this.addModuleToSelect(selectElement, moduleName, displayName);
                        builtinCount++;
                    }
                } catch (e) {
                    this.addModuleToSelect(selectElement, moduleName, moduleName);
                    builtinCount++;
                }
            }
        }
    } catch (error) {
        console.warn('Не удалось получить список штатных модулей:', error);
    }
    
    // ⭐ 2. Пользовательские модули из /api/list-user-modules
    try {
        const response = await fetch('/api/list-user-modules');
        if (response.ok) {
            const data = await response.json();
            const userModules = data.modules || [];
            
            for (const moduleName of userModules) {
                // ⭐ Помечаем пользовательские звёздочкой
                this.addModuleToSelect(selectElement, moduleName, `★ ${moduleName}`);
                userCount++;
            }
        }
    } catch (error) {
        console.warn('Не удалось получить список пользовательских модулей:', error);
    }
    
    //console.log(`Загружено в список: ${builtinCount} штатных, ${userCount} пользовательских`);
}

  addModuleToSelect(selectElement, value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    selectElement.appendChild(option);
  }

  updateModuleList(selectElement, searchTerm) {
    const options = selectElement.querySelectorAll('option');
    const searchLower = searchTerm.toLowerCase();

    options.forEach((option) => {
      if (option.value === '') {
        // Пропускаем опцию по умолчанию
        option.style.display = '';
        return;
      }

      const text = option.textContent.toLowerCase();
      if (searchTerm === '' || text.includes(searchLower)) {
        option.style.display = '';
      } else {
        option.style.display = 'none';
      }
    });
  }

  zoom(amount) {
    const oldScale = this.scale;
    this.scale = Math.max(0.1, Math.min(5, this.scale + amount));

    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const scaleFactor = this.scale / oldScale;
    this.offsetX = centerX - (centerX - this.offsetX) * scaleFactor;
    this.offsetY = centerY - (centerY - this.offsetY) * scaleFactor;

    this.updateZoomInfo();
  }

  resetZoom() {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.updateZoomInfo();
  }

  updateZoomInfo() {
    this.uiManager.updateZoomInfo(this.scale);
  }

  animate() {
      this.updateParallax();
      const now = performance.now();

      if (!this.lastFrameTime) this.lastFrameTime = now;
      if (now - this.lastFrameTime < 22) {
          requestAnimationFrame(() => this.animate());
          return;
      }
      this.lastFrameTime = now;

      if (!this.profiler) {
          this.profiler = { enabled: true, marks: {}, times: {}, frameCount: 0, lastLogTime: now };
      }
      this.profiler.frameCount = (this.profiler.frameCount || 0) + 1;

      if (typeof this.startMeasure === 'function') this.startMeasure('total');

      this.frameCount++;
      this.layerManager.frameCounter = this.frameCount;

      // ⭐ LED — перерисовываем ТОЛЬКО сами LED, без перерисовки слоя
      if (this.frameCount % 5 === 0) {
          this._renderLeds();
      }

      // ⚠️ ИЗМЕНЕНИЕ: всегда перерисовываем хотя бы раз в 30 кадров
      const hasDragging = this.draggingComponent ||
                          this.patchManager.draggingCable?.isDragging ||
                          this.layerManager.divider.isDragging;

      // Добавляем флаг, что было перетаскивание и нужна финальная перерисовка
      if (hasDragging) {
          this._wasDragging = true;
      }

      // Перерисовываем если: есть dirty флаги, или перетаскивание, или был драг и нужна финальная отрисовка
      const needsRedraw = hasDragging ||
                          this._voiceDirty ||
                          this._fxDirty ||
                          this._cablesDirty ||
                          this._forceRedraw ||  
                          this.frameCount % 30 === 0;

      if (needsRedraw) {
          if (typeof this.startMeasure === 'function') this.startMeasure('clear');
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          if (typeof this.endMeasure === 'function') this.endMeasure('clear');

          if (this._voiceDirty || hasDragging || this.frameCount % 30 === 0 || this._forceRedraw) {
              if (typeof this.startMeasure === 'function') this.startMeasure('drawVoice');
              this.drawLayer('voice');
              if (typeof this.endMeasure === 'function') this.endMeasure('drawVoice');
              this._voiceDirty = false;
          }

          if (this._fxDirty || hasDragging || this.frameCount % 30 === 0 || this._forceRedraw) {
              if (typeof this.startMeasure === 'function') this.startMeasure('drawFx');
              this.drawLayer('fx');
              if (typeof this.endMeasure === 'function') this.endMeasure('drawFx');
              this._fxDirty = false;
          }

          if (typeof this.startMeasure === 'function') this.startMeasure('drawDivider');
          this.layerManager.drawDivider(this.ctx);
          if (typeof this.endMeasure === 'function') this.endMeasure('drawDivider');

          if (this.selectedModule) {
              this.drawModuleSelections();
          }

          if (this.patchManager.draggingCable?.isDragging) {
              if (typeof this.startMeasure === 'function') this.startMeasure('drawCables');
              this.drawDraggingCableIfNeeded();
              if (typeof this.endMeasure === 'function') this.endMeasure('drawCables');
          }

          // Сбрасываем forceRedraw после отрисовки
          if (this._forceRedraw) {
              this._forceRedraw = false;
          }
          if (this._wasDragging && !hasDragging) {
              this._wasDragging = false;
          }
          this._cablesDirty = false;
      }

      if (typeof this.endMeasure === 'function') this.endMeasure('total');

      if (this.frameCount % 60 === 0) {
          this.updateFPS(now);
      }

      if (this.frameCount % 60 === 0) {
          this.updateFPS(now);
      }

      requestAnimationFrame(() => this.animate());
  }

  logPerformance() {
    // Защита от отсутствия profiler
    if (!this.profiler) return;

    const now = performance.now();
    const elapsed = now - (this.profiler.lastLogTime || now);

    if (elapsed < 1000) return;

    const times = this.profiler.times || {};
    const frameCount = this.profiler.frameCount || 0;

    // Сбрасываем счетчики
    this.profiler.times = {
      total: 0,
      clear: 0,
      drawVoice: 0,
      drawFx: 0,
      drawDivider: 0,
      drawCables: 0,
    };
    this.profiler.frameCount = 0;
    this.profiler.lastLogTime = now;
  }

  updateFPS(now) {
    if (this.lastFPSUpdate === undefined) {
      this.lastFPSUpdate = now;
      this.frameCount = 0;
      return;
    }

    this.frameCount++;

    if (now - this.lastFPSUpdate >= 1000) {
      this.currentFPS = this.frameCount;
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }
  }

  throttledUpdateUI = (() => {
    let timeout;
    return () => {
      if (timeout) return;
      timeout = setTimeout(() => {
        this.updatePatchInfo();
        timeout = null;
      }, 100); // Не чаще чем раз в 100мс
    };
  })();

  async addNewModuleAtPosition(moduleType, layerName, gridX, gridY) {
      //console.log(
      //  `=== ADD NEW MODULE AT POSITION: ${moduleType} to ${layerName} at (${gridX}, ${gridY}) ===`,
      //);

      try {
        // Проверяем слой
        if (!layerName || !this.layerManager.layers[layerName]) {
          console.error(`Ошибка: неверный слой ${layerName}`);
          return;
        }

        // main.js - исправленная часть addNewModuleAtPosition()

        if (!this.moduleFactory.moduleRegistry[moduleType]) {
            //console.log(`📂 Module ${moduleType} not in registry, trying to load...`);
            
            let loaded = false;
            
            // ⭐ Проверяем, является ли модуль пользовательским
            const isUser = await this.moduleFactory.isUserModule(moduleType);
            //console.log(`  isUser: ${isUser}, moduleType: ${moduleType}`);
            
            if (isUser) {
                // ⭐ ПОЛЬЗОВАТЕЛЬСКИЙ → загружаем через API
                // console.log(`📂 Loading user module: ${moduleType}`);
                loaded = await this.moduleFactory.loadUserModule(moduleType);
            } else {
                // ⭐ ВСТРОЕННЫЙ → загружаем из ./modules/
                // console.log(`📂 Loading built-in module: ${moduleType}`);
                try {
                    const modulePath = `./modules/${moduleType}.js`;
                    const module = await import(/* @vite-ignore */ modulePath);
                    const moduleKey = Object.keys(module)[0];
                    if (moduleKey && module[moduleKey]) {
                        this.moduleFactory.registerModule(moduleType, module[moduleKey]);
                        loaded = true;
                        // console.log(`✅ Built-in module registered: ${moduleType}`);
                    }
                } catch (error) {
                    console.warn(`Failed to load built-in module ${moduleType}:`, error);
                }
            }
            
            if (!loaded) {
                this.showNotification(`❌ Модуль ${moduleType} не найден`);
                return;
            }
        }

        // Получаем определение модуля
        const moduleDef = this.moduleFactory.moduleRegistry[moduleType];
        if (!moduleDef) {
          console.error(`Definition not found for ${moduleType}`);
          return;
        }

        // Проверяем, свободно ли место
        const gridWidth = 1;
        const gridHeight = moduleDef.gridHeight || 2;

        if (
          !this.isGridCellFree(layerName, gridX, gridY, gridWidth, gridHeight)
        ) {
          console.log(
            `❌ Position (${gridX}, ${gridY}) is occupied, searching nearby...`,
          );
          const freeSpace = this.findFreeSpace(
            layerName,
            gridWidth,
            gridHeight,
            gridX,
            gridY,
          );
          if (!freeSpace) {
            this.showNotification(
              `❌ Нет места в слое ${layerName === 'voice' ? 'VA' : 'FX'}`,
            );
            return;
          }
          gridX = freeSpace.gridX;
          gridY = freeSpace.gridY;
          console.log(`✅ Found alternative position: (${gridX}, ${gridY})`);
        }

        // Создаем модуль
        const newModule = this.moduleFactory.createModule(
          moduleType,
          gridX,
          gridY,
          layerName,
        );

        if (newModule) {
          newModule.layer = layerName;
          newModule.parentSystem = this;
          newModule.jsonId = this.generateJsonId(newModule);
          newModule.jsonName = moduleType;

          this.csoundGen.addModule({
            typeId: moduleType,
            instanceId: newModule.jsonId,
            instanceName: moduleType,
            layer: layerName,
            parameters: [],
            mode: [],
            defaultParams: moduleDef.defaultParams || [0],
            defaultMode: moduleDef.mode || [],
            inlets: moduleDef.inputs || 1,
            outlets: moduleDef.outputs || 1,
            isUser: moduleDef.isUser === true,
          });
          newModule.typeID = moduleType;

          // Добавляем в слой
          this.layerManager.addModuleToLayer(newModule, layerName);
          this.components.push(newModule);

          if (this.patchLoader && this.patchLoader.moduleMap) {
            this.patchLoader.moduleMap.byId[newModule.jsonId] = newModule;
            this.patchLoader.moduleMap.byLayer[layerName].push(newModule);
          }


          // ⭐ Регистрируем LED-каналы
          if (this.csoundEngine && newModule.components) {
              const leds = newModule.components.filter(c => c.constructor.name === 'LED');
              leds.forEach(led => {
                  if (led.sourceComponentId === null || led.sourceComponentId === undefined) return;
                  
                  const channelName = `led_${moduleType}_${newModule.jsonId}_${led.id}`;
                  led.sourceChannel = channelName;
                  this.csoundEngine.registerLedChannel(channelName);
                  console.log(`💡 Registered LED channel: ${channelName}`);
              });
          }

          this.sortComponentsByZIndex();
          this.showNotification(
            `✅ ${moduleDef.displayName || moduleType} добавлен в (${gridX}, ${gridY})`,
          );
          if (layerName === 'voice') this._voiceDirty = true;
          else this._fxDirty = true;
          this._cablesDirty = true;

          // После добавления модуля:
          if (this.csoundEngine.state === 'running') {
              this._recompileDebounced();
          }
          //console.log(`✅ МОДУЛЬ УСПЕШНО ДОБАВЛЕН В (${gridX}, ${gridY})!`);
        }
      } catch (error) {
        console.error(`Ошибка при создании модуля ${moduleType}:`, error);
        this.showNotification(`❌ Ошибка: ${error.message}`);
      }
  }

  drawDraggingCableIfNeeded() {
    if (
      this.patchManager.draggingCable &&
      this.patchManager.draggingCable.isDragging
    ) {
      // Рисуем ПРЯМО на canvas без трансформаций
      this.patchManager.drawDraggingCable(
        this.ctx,
        this.offsetX,
        this.offsetY,
        this.scale,
      );
    }
  }

  // Метод для отрисовки кабелей конкретного слоя
  // нигде не вызывается!
  // drawCablesForLayer(layerName) {
  //     const layer = this.layerManager.layers[layerName];

  //     // Сохраняем состояние контекста
  //     this.ctx.save();

  //     // Устанавливаем область отсечения для слоя
  //     this.ctx.beginPath();
  //     this.ctx.rect(layer.x, layer.y, layer.width, layer.visibleHeight);
  //     this.ctx.clip();

  //     // Рисуем только кабели этого слоя
  //     this.patchManager.cables.forEach(cable => {
  //         const fromModule = cable.fromJack?.module;
  //         const toModule = cable.toJack?.module;

  //         if (!fromModule || !toModule) return;

  //         // Проверяем, что оба модуля в нужном слое
  //         if (fromModule.layer === layerName && toModule.layer === layerName) {
  //             cable.draw(this.ctx);
  //         }
  //     });

  //     // Восстанавливаем контекст
  //     this.ctx.restore();
  // }

  drawModuleSelections() {
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // Рисуем выделения для ВСЕХ модулей
    this.components.forEach((panel) => {
      if (panel.isSelected && panel.pixelX !== null && panel.pixelY !== null) {
        // // Рисуем голубую рамку
        // this.ctx.strokeStyle = '#0af';
        // this.ctx.lineWidth = 3;
        // //this.ctx.setLineDash([5, 3]);
        // this.ctx.strokeRect(
        //     panel.pixelX - 5,
        //     panel.pixelY - 5,
        //     panel.width + 10,
        //     panel.height + 10
        // );
        // this.ctx.setLineDash([]);

        // Полупрозрачная заливка
        this.ctx.fillStyle = 'rgba(0, 170, 255, 0.1)';
        this.ctx.fillRect(
          panel.pixelX - 5,
          panel.pixelY - 5,
          panel.width + 10,
          panel.height + 10,
        );
      }
    });

    this.ctx.restore();
  }

  drawLayer(layerName) {
    // if (layerName === 'voice' && !this._voiceDirty) {
    //   // Все равно нужно рисовать фон и сетку? Они кешированы, так что можно пропустить все.
    //   // Но если dirty false, значит ничего не изменилось, можно полностью пропустить отрисовку слоя.
    //   return;
    // }
    const layer = this.layerManager.getLayer(layerName);
    if (!layer) return;

    this.ctx.save();

    this.layerManager.updateBackgroundCache(); // обновит только если нужно
    const cache = this.layerManager.backgroundCache[layerName];
    if (cache) {
      this.ctx.drawImage(
        cache,
        layer.x,
        layer.y, // позиция на canvas
        cache.width,
        cache.height, // рисуем полностью
      );
    }

    // СЕТКА - только если включена
    if (this.showGrid) {
        const gridCache = this.layerManager.getGridCache(
            layerName,
            this.offsetX,
            this.offsetY,
            this.scale,
        );
        if (gridCache) {
            this.ctx.drawImage(gridCache, 0, 0);
        }
    }

    // Рисуем модули этого слоя с учетом скролла
    this.ctx.save();
    this.ctx.translate(this.offsetX, this.offsetY);
    this.ctx.scale(this.scale, this.scale);

    // === ПОДСВЕТКА GRID CELL ПОД КУРСОРОМ ===
    if (this.lastMouseX !== null && this.lastMouseY !== null) {
      // Конвертируем экранные координаты в мировые (уже с учетом scale из transform выше)
      const worldX = (this.lastMouseX - this.offsetX) / this.scale;
      const worldY = (this.lastMouseY - this.offsetY) / this.scale;

      // Проверяем, находится ли мышь в пределах этого слоя
      if (
        worldX >= layer.x &&
        worldX <= layer.x + layer.width &&
        worldY >= layer.y &&
        worldY <= layer.y + layer.visibleHeight
      ) {
        // Вычисляем grid координаты (относительно начала слоя)
        const gridX = Math.floor((worldX - layer.x) / GRID_UNITS.X);
        const gridY = Math.floor((worldY - layer.y) / GRID_UNITS.Y);

        // Ограничиваем grid координаты
        const maxGridX = Math.floor(layer.width / GRID_UNITS.X) - 1;
        const maxGridY = Math.floor(layer.visibleHeight / GRID_UNITS.Y) - 1;

        if (
          gridX >= 0 &&
          gridX <= maxGridX &&
          gridY >= 0 &&
          gridY <= maxGridY
        ) {
          // Рисуем подсветку ячейки (в мировых координатах)
          this.ctx.fillStyle = 'rgba(255, 255, 0, 0.15)';
          this.ctx.fillRect(
            layer.x + gridX * GRID_UNITS.X,
            layer.y + gridY * GRID_UNITS.Y,
            GRID_UNITS.X,
            GRID_UNITS.Y,
          );

          // Отображаем координаты
          this.ctx.fillStyle = '#ff0';
          this.ctx.font = 'bold 11px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(
            `${gridX},${gridY}`,
            layer.x + gridX * GRID_UNITS.X + GRID_UNITS.X / 2,
            layer.y + gridY * GRID_UNITS.Y + GRID_UNITS.Y / 2,
          );
        }
      }
    }

    // === ВИЗУАЛЬНАЯ ПОДСВЕТКА КОЛЛИЗИЙ ===
    if (
      this.draggingComponent &&
      this.draggingComponent.type === 'drag' &&
      this.draggingComponent.module &&
      this.draggingComponent.module.layer === layerName
    ) {
      const module = this.draggingComponent.module;
      const layer = this.layerManager.layers[layerName];

      // Вычисляем целевую позицию
      const worldX = (this.lastMouseX - this.offsetX) / this.scale;
      const worldY = (this.lastMouseY - this.offsetY) / this.scale;

      if (
        worldX >= layer.x &&
        worldX <= layer.x + layer.width &&
        worldY >= layer.y &&
        worldY <= layer.y + layer.visibleHeight
      ) {
        // Вычисляем grid координаты мыши
        const mouseGridX = Math.floor((worldX - layer.x) / GRID_UNITS.X);
        const mouseGridY = Math.floor((worldY - layer.y) / GRID_UNITS.Y);

        // Вычисляем целевую позицию модуля
        const targetGridX = mouseGridX - module.dragOffsetGridX;
        const targetGridY = mouseGridY - module.dragOffsetGridY;

        // Проверяем, свободно ли это место
        const isFree = this.isGridCellFree(
          layerName,
          targetGridX,
          targetGridY,
          module.gridWidth,
          module.gridHeight,
          module,
        );

        // Показываем целевую область (куда пытаемся переместить)
        const pixelX = layer.x + targetGridX * GRID_UNITS.X;
        const pixelY = layer.y + targetGridY * GRID_UNITS.Y;

        // 1. Рисуем "призрак" модуля на целевой позиции
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;

        if (isFree) {
          // Зеленый "призрак" для свободного места
          this.ctx.fillStyle = '#00ff00';
        } else {
          // Красный "призрак" для занятого места
          this.ctx.fillStyle = '#ff0000';
        }

        this.ctx.fillRect(
          pixelX,
          pixelY,
          module.gridWidth * GRID_UNITS.X,
          module.gridHeight * GRID_UNITS.Y,
        );

        this.ctx.restore();

        // 2. Рисуем контур "призрака"
        this.ctx.strokeStyle = isFree ? '#00ff00' : '#ff0000';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.strokeRect(
          pixelX,
          pixelY,
          module.gridWidth * GRID_UNITS.X,
          module.gridHeight * GRID_UNITS.Y,
        );
        this.ctx.setLineDash([]);

        // 3. Показываем текущую реальную позицию модуля
        const currentPixelX = layer.x + module.gridX * GRID_UNITS.X;
        const currentPixelY = layer.y + module.gridY * GRID_UNITS.Y;

        // Желтый контур для текущей позиции
        this.ctx.strokeStyle = '#ffff00';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(
          currentPixelX,
          currentPixelY,
          module.gridWidth * GRID_UNITS.X,
          module.gridHeight * GRID_UNITS.Y,
        );

        // 4. Добавляем текст с информацией
        this.ctx.fillStyle = isFree ? '#00ff00' : '#ff0000';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';

        if (isFree) {
          this.ctx.fillText(
            `[${targetGridX}, ${targetGridY}] ✓`,
            pixelX + (module.gridWidth * GRID_UNITS.X) / 2,
            pixelY + 5,
          );
        } else {
          this.ctx.fillText(
            `[${targetGridX}, ${targetGridY}] ✗ BLOCKED`,
            pixelX + (module.gridWidth * GRID_UNITS.X) / 2,
            pixelY + 5,
          );

          // Показываем, куда вернется модуль
          this.ctx.fillStyle = '#ffff00';
          this.ctx.fillText(
            `Will return to [${module.lastValidGridX}, ${module.lastValidGridY}]`,
            pixelX + (module.gridWidth * GRID_UNITS.X) / 2,
            pixelY + 25,
          );
        }
      }
    }

    layer.modules.forEach((module) => {
      // 1. Grid → базовые пиксели
      let pixelX = module.gridX * GRID_UNITS.X;
      let pixelY = module.gridY * GRID_UNITS.Y;

      // 2. Добавляем смещение слоя
      pixelX += layer.x;
      pixelY += layer.y - layer.scrollY;

      // 3. Устанавливаем панели
      module.setPixelPosition(pixelX, pixelY);

      // 4. Рисуем
      module.draw(this.ctx);
    });

    // КАБЕЛИ ЭТОГО СЛОЯ - ПРЯМО ЗДЕСЬ!
    this.patchManager.cables.forEach((cable) => {
      const fromModule = cable.fromJack?.module;
      const toModule = cable.toJack?.module;

      if (!fromModule || !toModule) return;

      // Только кабели этого слоя
      if (fromModule.layer === layerName && toModule.layer === layerName) {
        cable.draw(this.ctx);
        //console.log('cable updated');
      }
    });

    this.ctx.restore();
    this.ctx.restore();
  }

}

let modularSystem; // Объявляем глобально

// В конце main.js, после создания modularSystem:
window.debugModuleInfo = (index = 0) => {
  if (!modularSystem || !modularSystem.components[index]) {
    console.error('Module not found');
    return;
  }

  const module = modularSystem.components[index];
  console.log('=== DEBUG MODULE INFO ===');
  console.log('Module:', module);
  console.log('Title:', module.title);
  console.log('Type:', module.type);
  console.log('JSON Name:', module.jsonName);
  console.log('JSON ID:', module.jsonId);
  console.log('Module ID:', module.moduleId);
  console.log('Layer:', module.layer);

  // Проверяем определение
  if (modularSystem.moduleFactory) {
    const moduleType = module.jsonName || module.type;
    const definition = modularSystem.moduleFactory.moduleRegistry[moduleType];
    console.log('Definition:', definition);

    if (definition) {
      console.log('Definition keys:', Object.keys(definition));
      console.log('Has typeID?', 'typeID' in definition);
      console.log('Has type?', 'type' in definition);
    }
  }
};

window.debugAllModules = () => {
  if (!modularSystem) return;

  console.log('=== ALL MODULES ===');
  modularSystem.components.forEach((module, i) => {
    console.log(`[${i}] ${module.title || 'unnamed'}`, {
      type: module.type,
      jsonName: module.jsonName,
      jsonId: module.jsonId,
      moduleId: module.moduleId,
    });
  });
};

window.debugFactory = () => {
  if (!modularSystem?.moduleFactory?.moduleRegistry) return;

  console.log('=== MODULE FACTORY REGISTRY ===');
  const registry = modularSystem.moduleFactory.moduleRegistry;

  Object.keys(registry).forEach((key) => {
    const def = registry[key];
    console.log(`\n"${key}":`, {
      displayName: def.displayName,
      typeID: def.typeID,
      type: def.type,
      gridHeight: def.gridHeight,
      components: def.components?.length || 0,
    });
  });
};

document.addEventListener('DOMContentLoaded', async () => {
    // ⭐ Инициализируем тему ДО создания системы
    await initCurrentTheme();
    console.log('✅ Theme initialized');

    modularSystem = new ModularSystem();
    window.modularSystem = modularSystem;

  // Добавляем команды для дебага в консоли
  window.debugSystem = () => {
    console.log('=== DEBUG COMMANDS ===');
    console.log('debugSystem() - показать это сообщение');
    console.log('debugState() - состояние системы');
    console.log('debugModules() - список модулей');
    console.log('debugCables() - список кабелей');
    console.log('debugLoadTestPatch() - загрузить тестовый патч');
  };

  window.debugState = () => {
    console.log('=== SYSTEM STATE ===');
    console.log(`Components: ${modularSystem.components.length}`);
    console.log(`Cables: ${modularSystem.patchManager.cables.length}`);

    // Layer info из layerManager
    console.log('\n=== LAYERS (from layerManager) ===');
    if (modularSystem.layerManager) {
      Object.entries(modularSystem.layerManager.layers).forEach(
        ([name, layer]) => {
          console.log(`${name}: ${layer.modules.length} modules`);
        },
      );
    }

    // Module map НОВАЯ СТРУКТУРА
    if (modularSystem.patchLoader?.moduleMap) {
      console.log('\n=== MODULE MAP (NEW STRUCTURE) ===');
      console.log(
        `Total in byId: ${Object.keys(modularSystem.patchLoader.moduleMap.byId || {}).length}`,
      );
      console.log(
        `Voice layer: ${(modularSystem.patchLoader.moduleMap.byLayer?.voice || []).length}`,
      );
      console.log(
        `FX layer: ${(modularSystem.patchLoader.moduleMap.byLayer?.fx || []).length}`,
      );

      // Детали
      console.log('\n=== DETAILS ===');
      Object.entries(modularSystem.patchLoader.moduleMap.byId || {}).forEach(
        ([id, module]) => {
          console.log(
            `  ${id}: ${module.jsonName || module.title} (layer: ${module.layer})`,
          );
        },
      );
    }

    // Проверка целостности
    console.log('\n=== INTEGRITY CHECK ===');
    const panels = modularSystem.components.filter(
      (c) => c.constructor.name === 'Panel',
    );
    console.log(`Panels in components: ${panels.length}`);

    panels.forEach((panel, i) => {
      console.log(
        `  [${i}] ${panel.title} (jsonId: ${panel.jsonId}, layer: ${panel.layer})`,
      );
    });
  };

  window.debugModules = () => {
    console.log('=== MODULES ===');
    modularSystem.components.forEach((comp, i) => {
      if (comp.constructor.name === 'Panel') {
        console.log(
          `[${i}] ${comp.title} (id: ${comp.moduleId}, jsonId: ${comp.jsonId})`,
        );
      }
    });
  };

  window.debugModuleMap = () => {
    console.log('=== MODULE MAP DETAILED ===');

    if (!modularSystem.patchLoader?.moduleMap) {
      console.log('❌ moduleMap not available');
      return;
    }

    const map = modularSystem.patchLoader.moduleMap;

    console.log(`📊 By ID (${Object.keys(map.byId || {}).length}):`);
    Object.entries(map.byId || {}).forEach(([id, module]) => {
      console.log(
        `  ${id}: ${module.jsonName || module.title} (layer: ${module.layer})`,
      );
    });

    console.log(`\n📊 By Layer Voice (${(map.byLayer?.voice || []).length}):`);
    (map.byLayer?.voice || []).forEach((module) => {
      console.log(`  ${module.jsonId}: ${module.jsonName || module.title}`);
    });

    console.log(`\n📊 By Layer FX (${(map.byLayer?.fx || []).length}):`);
    (map.byLayer?.fx || []).forEach((module) => {
      console.log(`  ${module.jsonId}: ${module.jsonName || module.title}`);
    });
  };

  window.debugCables = () => {
    console.log('=== CABLES ===');
    modularSystem.patchManager.cables.forEach((cable, i) => {
      const from = cable.fromJack?.parentModule?.title || 'unknown';
      const to = cable.toJack?.parentModule?.title || 'unknown';
      console.log(`[${i}] ${from} → ${to}`);
    });
  };

  // Дебаг команды
  window.debugLoadProcess = () => {
    console.log('=== DEBUG LOAD PROCESS ===');
    console.log('1. System state:');
    console.log('   modularSystem:', !!modularSystem);
    console.log('   patchLoader:', !!modularSystem?.patchLoader);
    console.log('   patchManager:', !!modularSystem?.patchManager);
    console.log('   uiManager:', !!modularSystem?.uiManager);

    console.log('\n2. Testing file input directly...');

    // Создаем тестовый файл input напрямую
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.pch2';

    input.onchange = (e) => {
      console.log('   File input triggered!');
      console.log('   Files:', e.target.files);

      if (e.target.files[0]) {
        console.log(`   File: ${e.target.files[0].name}`);
        console.log(`   Size: ${e.target.files[0].size}`);

        // Пробуем прочитать файл
        const reader = new FileReader();
        reader.onload = (event) => {
          console.log('   FileReader loaded');
          console.log(`   Content length: ${event.target.result.length}`);

          try {
            const json = JSON.parse(event.target.result);
            console.log('   JSON parsed successfully');
            console.log('   JSON structure:', {
              modules: json.modules?.length,
              cables: json.cables?.length,
              filename: json.filename,
            });
          } catch (err) {
            console.error('   JSON parse error:', err);
          }
        };

        reader.onerror = (err) => {
          console.error('   FileReader error:', err);
        };

        reader.readAsText(e.target.files[0]);
      }
    };

    // Триггерим клик
    console.log('   Triggering click...');
    input.click();
    console.log('   Click triggered (dialog should open)');
  };

  window.testPatchLoad = async () => {
    console.log('=== TEST PATCH LOAD ===');

    if (!modularSystem?.patchLoader?.loadPatch) {
      console.error('❌ patchLoader.loadPatch not available');
      return;
    }

    // Тестовый патч
    const testPatch = {
      filename: 'test.json',
      modules: [
        {
          name: 'Digitizer',
          id: 1,
          type: 0,
          parameters: '[0,0,0,0,0,0,0,0]',
          modes: [],
          area: 'VOICE',
          hpos: 0,
          vpos: 0,
        },
      ],
      cables: [],
      textpad: '',
    };

    try {
      console.log('   Loading test patch...');
      const result = await modularSystem.patchLoader.loadPatch(testPatch);
      console.log('   Test patch load result:', result);
      console.log('   System state after:', {
        components: modularSystem.components.length,
        cables: modularSystem.patchManager.cables.length,
      });
    } catch (error) {
      console.error('💥 Test patch load failed:', error);
      console.error('   Stack:', error.stack);
    }
  };

  window.debugLoadTestPatch = async () => {
    console.log('Loading test patch...');
    const testPatch = {
      filename: 'test.json',
      modules: [
        {
          name: 'VCO',
          id: 1,
          type: 0,
          parameters: '[0,0,0,0,0,0,0,0]',
          modes: [],
          area: 'VOICE',
          hpos: 0,
          vpos: 0,
        },
        {
          name: 'VCF',
          id: 2,
          type: 0,
          parameters: '[0,0,0,0,0,0,0,0]',
          modes: [],
          area: 'VOICE',
          hpos: 1,
          vpos: 0,
        },
      ],
      cables: [],
      textpad: '',
    };

    await modularSystem.loadPatchFromJson(testPatch);
    console.log('Test patch loaded');
    debugState();
  };

  console.log(
    'ModularSystem initialized. Type debugSystem() for debug commands',
  );
});
