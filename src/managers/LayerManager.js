// src/managers/LayerManager.js
import { GRID_UNITS } from '../constants.js';

export class LayerManager {
  constructor(canvas) {
    this.canvas = canvas;

    this.frameCounter = 0;
    // Копируем структуру слоев из main.js
    this.layers = {
      voice: {
        x: 10,
        y: 10,
        width: canvas.width - 20,
        visibleHeight: 300,
        totalHeight: 2000,
        scrollY: 0,
        modules: [], // Сюда будем добавлять ссылки на модули
      },
      fx: {
        x: 10,
        y: 320,
        width: canvas.width - 20,
        visibleHeight: canvas.height - 330,
        totalHeight: 2000,
        scrollY: 0,
        modules: [],
      },
    };

    this.divider = {
      y: 310,
      height: 10,
      isDragging: false,
      dragStartY: 0,
    };

    this.debugInfo = null; // Для отладки

    // 🆕 Кеш для фонов слоев
    this.backgroundCache = {
      voice: null,
      fx: null,
    };
    this.cacheDirty = true;
    // 🆕 Кеш для сетки
    this.gridCache = {
      voice: null,
      fx: null,
    };

    this._gridCacheKeys = { voice: null, fx: null };
  }

  // === ОСНОВНЫЕ МЕТОДЫ ===

  // 🆕 Новый метод для создания кеша сетки
  updateGridCache(layerName, offsetX, offsetY, scale) {
    const layer = this.layers[layerName];
    if (!layer) return;

    // Создаем offscreen canvas для сетки
    const cache = document.createElement('canvas');
    cache.width = this.canvas.width;
    cache.height = this.canvas.height;
    const ctx = cache.getContext('2d');

    // Рисуем сетку на кеше
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.strokeStyle =
      layerName === 'voice'
        ? 'rgba(100, 200, 100, 0.1)'
        : 'rgba(200, 100, 100, 0.1)';
    ctx.lineWidth = 1 / scale;

    // Вертикальные линии
    for (let x = 0; x < layer.width; x += GRID_UNITS.X) {
      ctx.beginPath();
      ctx.moveTo(layer.x + x, layer.y);
      ctx.lineTo(layer.x + x, layer.y + layer.totalHeight);
      ctx.stroke();
    }

    // Горизонтальные линии
    for (let y = 0; y < layer.totalHeight; y += GRID_UNITS.Y) {
      ctx.beginPath();
      ctx.moveTo(layer.x, layer.y + y);
      ctx.lineTo(layer.x + layer.width, layer.y + y);
      ctx.stroke();
    }

    ctx.restore();

    this.gridCache[layerName] = cache;
  }

  getLayerAtPoint(x, y) {
    // ⭐ Все новые модули — Voice по умолчанию.
    return 'voice';
  }


  // 🆕 Метод для получения кеша сетки

  getGridCache(layerName, offsetX, offsetY, scale) {
      // Создаем ключ из параметров
      const key = `${layerName}_${Math.round(offsetX*10)}_${Math.round(offsetY*10)}_${Math.round(scale*100)}`;

      if (this.gridCache[layerName] && this._gridCacheKeys[layerName] === key) {
          return this.gridCache[layerName];
      }
      
      // Иначе обновляем кеш
      const layer = this.layers[layerName];
      if (!layer) return null;
      
      const cache = document.createElement('canvas');
      cache.width = this.canvas.width;
      cache.height = this.canvas.height;
      const ctx = cache.getContext('2d');
      
      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);
      
      ctx.strokeStyle = layerName === 'voice' 
          ? 'rgba(100, 200, 100, 0.1)' 
          : 'rgba(200, 100, 100, 0.1)';
      ctx.lineWidth = 1 / scale;
      
      // Вертикальные линии
      for (let x = 0; x < layer.width; x += GRID_UNITS.X) {
          ctx.beginPath();
          ctx.moveTo(layer.x + x, layer.y);
          ctx.lineTo(layer.x + x, layer.y + layer.totalHeight);
          ctx.stroke();
      }
      
      // Горизонтальные линии
      for (let y = 0; y < layer.totalHeight; y += GRID_UNITS.Y) {
          ctx.beginPath();
          ctx.moveTo(layer.x, layer.y + y);
          ctx.lineTo(layer.x + layer.width, layer.y + y);
          ctx.stroke();
      }
      
      ctx.restore();
      
      // Сохраняем в кеш
      this.gridCache[layerName] = cache;
      this._gridCacheKeys[layerName] = key; 
      
      return cache;
  }

  updateBackgroundCache() {
    if (!this.cacheDirty) return;

    // Создаем offscreen canvas для voice слоя
    const voiceCache = document.createElement('canvas');
    voiceCache.width = this.layers.voice.width;
    voiceCache.height = this.layers.voice.totalHeight;
    const voiceCtx = voiceCache.getContext('2d');

    voiceCtx.fillStyle = 'rgba(75, 80, 75, 0.2)';
    voiceCtx.fillRect(0, 0, voiceCache.width, voiceCache.height);
    this.backgroundCache.voice = voiceCache;

    // Создаем offscreen canvas для fx слоя
    const fxCache = document.createElement('canvas');
    fxCache.width = this.layers.fx.width;
    fxCache.height = this.layers.fx.totalHeight;
    const fxCtx = fxCache.getContext('2d');

    fxCtx.fillStyle = 'rgba(80, 75, 75, 0.5)';
    fxCtx.fillRect(0, 0, fxCache.width, fxCache.height);
    this.backgroundCache.fx = fxCache;

    this.cacheDirty = false;
  }

  // Вызывать при изменении размеров слоя
  invalidateCache() {
    this.cacheDirty = true;
  }

  updateCanvasSize() {
    // ⭐ МИР БЕСКОНЕЧНЫЙ — размеры слоёв не привязаны к canvas
    const HUGE = 100000;

    // Voice слой
    this.layers.voice.x = 0;
    this.layers.voice.y = 0;
    this.layers.voice.width = HUGE;
    this.layers.voice.visibleHeight = HUGE;
    this.layers.voice.totalHeight = HUGE;

    // FX слой
    this.layers.fx.x = 0;
    this.layers.fx.y = 0;   // ← больше НЕ привязан к divider.y!
    this.layers.fx.width = HUGE;
    this.layers.fx.visibleHeight = HUGE;
    this.layers.fx.totalHeight = HUGE;
  }

  // Получить объект слоя по имени
  getLayer(name) {
    return this.layers[name];
  }

  // Добавить модуль в слой
  addModuleToLayer(module, layerName) {
    const layer = this.layers[layerName];
    if (layer && !layer.modules.includes(module)) {
      layer.modules.push(module);
      module.layer = layerName; // Устанавливаем слой в модуле
      return true;
    }
    return false;
  }

  removeModuleFromLayer(module) {
    // ⭐ Ищем модуль ВО ВСЕХ слоях, а не только в module.layer
    for (const layerName of ['voice', 'fx']) {
      const layer = this.layers[layerName];
      if (!layer) continue;
      
      const index = layer.modules.indexOf(module);
      if (index > -1) {
        layer.modules.splice(index, 1);
        module.layer = null;
        return true;
      }
    }
    return false;
  }

  // === РАБОТА С СЕТКОЙ И ПОЗИЦИОНИРОВАНИЕМ ===

  // Конвертация мировых координат в grid координаты слоя
  worldToLayerGrid(worldX, worldY, layerName) {
    const layer = this.layers[layerName];
    if (!layer) return null;

    const gridX = Math.floor((worldX - layer.x) / GRID_UNITS.X);
    const gridY = Math.floor((worldY - layer.y) / GRID_UNITS.Y);

    return { gridX, gridY };
  }

  // Конвертация grid координат в мировые пиксели
  layerGridToWorld(gridX, gridY, layerName) {
    const layer = this.layers[layerName];
    if (!layer) return null;

    return {
      x: layer.x + gridX * GRID_UNITS.X,
      y: layer.y + gridY * GRID_UNITS.Y,
    };
  }

  // Проверка, свободна ли ячейка в слое
  isGridCellFree(
    layerName,
    gridX,
    gridY,
    gridWidth = 1,
    gridHeight = 1,
    excludeModule = null,
  ) {
    const layer = this.layers[layerName];
    if (!layer) return false;

    // ⭐ УБРАЛИ проверку границ слоя — мир бесконечный
    // Проверяем ТОЛЬКО коллизии с модулями
    for (const module of layer.modules) {
      if (excludeModule && module === excludeModule) {
        continue;
      }

      const left1 = gridX;
      const right1 = gridX + gridWidth;
      const top1 = gridY;
      const bottom1 = gridY + gridHeight;

      const left2 = module.gridX;
      const right2 = module.gridX + module.gridWidth;
      const top2 = module.gridY;
      const bottom2 = module.gridY + module.gridHeight;

      const collision = !(
        right1 <= left2 ||
        left1 >= right2 ||
        bottom1 <= top2 ||
        top1 >= bottom2
      );

      if (collision) {
        return false;
      }
    }

    return true;
  }

  // Найти свободное место в слое
  findFreeSpace(
    layerName,
    gridWidth = 1,
    gridHeight = 1,
    startGridX = null,
    startGridY = null,
  ) {
    const layer = this.layers[layerName];
    if (!layer) return null;

    // ⭐ Ищем от startGrid, но с "разумным" лимитом — не бесконечно
    const MAX_SEARCH = 200; // искать в пределах ±200 ячеек
    
    let baseX = startGridX !== null ? startGridX : 0;
    let baseY = startGridY !== null ? startGridY : 0;

    // Сначала пробуем точку startGrid
    if (this.isGridCellFree(layerName, baseX, baseY, gridWidth, gridHeight)) {
      return { gridX: baseX, gridY: baseY };
    }

    // Затем расширяемся по спирали
    for (let radius = 1; radius < MAX_SEARCH; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          // Только граница квадрата (внутри уже проверено)
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const x = baseX + dx;
          const y = baseY + dy;
          
          if (this.isGridCellFree(layerName, x, y, gridWidth, gridHeight)) {
            return { gridX: x, gridY: y };
          }
        }
      }
    }

    return null; // не нашли (что почти невозможно при бесконечном мире)
  }
  // === ОТРИСОВКА ===

  drawLayerGrid(ctx, layerName, offsetX, offsetY, scale) {
    const layer = this.layers[layerName];
    if (!layer) return;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.strokeStyle =
      layerName === 'voice'
        ? 'rgba(100, 200, 100, 0.1)'
        : 'rgba(200, 100, 100, 0.1)';
    ctx.lineWidth = 1 / scale;

    // Вертикальные линии
    for (let x = 0; x < layer.width; x += GRID_UNITS.X) {
      ctx.beginPath();
      ctx.moveTo(layer.x + x, layer.y);
      ctx.lineTo(layer.x + x, layer.y + layer.totalHeight);
      ctx.stroke();
    }

    // Горизонтальные линии
    for (let y = 0; y < layer.totalHeight; y += GRID_UNITS.Y) {
      ctx.beginPath();
      ctx.moveTo(layer.x, layer.y + y);
      ctx.lineTo(layer.x + layer.width, layer.y + y);
      ctx.stroke();
    }

    ctx.restore();
  }

  // === DEBUG ===

  setDebugInfo(debugInfo) {
    this.debugInfo = debugInfo;
  }

  updateDebugInfo() {
    if (this.debugInfo) {
      const voiceModules = this.layers.voice.modules.length;
      const fxModules = this.layers.fx.modules.length;

      this.debugInfo.innerHTML = `
                <strong>LAYERS INFO:</strong><br>
                VOICE: ${voiceModules} modules, Scroll: ${this.layers.voice.scrollY}<br>
                FX: ${fxModules} modules, Scroll: ${this.layers.fx.scrollY}<br>
                Divider Y: ${this.divider.y}
            `;
    }
  }
}
