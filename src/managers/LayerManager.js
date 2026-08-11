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

    this._gridCacheKey = null;
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

  // 🆕 Метод для получения кеша сетки

  getGridCache(layerName, offsetX, offsetY, scale) {
      // Создаем ключ из параметров
      const key = `${layerName}_${Math.round(offsetX*10)}_${Math.round(offsetY*10)}_${Math.round(scale*100)}`;
      
      // Если кеш есть и ключ совпадает - возвращаем существующий
      if (this.gridCache[layerName] && this._gridCacheKey === key) {
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
      this._gridCacheKey = key;
      
      return cache;
  }

  updateBackgroundCache() {
    if (!this.cacheDirty) return;

    // Создаем offscreen canvas для voice слоя
    const voiceCache = document.createElement('canvas');
    voiceCache.width = this.layers.voice.width;
    voiceCache.height = this.layers.voice.totalHeight;
    const voiceCtx = voiceCache.getContext('2d');

    voiceCtx.fillStyle = 'rgba(75, 80, 75, 1.0)';
    voiceCtx.fillRect(0, 0, voiceCache.width, voiceCache.height);
    this.backgroundCache.voice = voiceCache;

    // Создаем offscreen canvas для fx слоя
    const fxCache = document.createElement('canvas');
    fxCache.width = this.layers.fx.width;
    fxCache.height = this.layers.fx.totalHeight;
    const fxCtx = fxCache.getContext('2d');

    fxCtx.fillStyle = 'rgba(80, 75, 75, 1.0)';
    fxCtx.fillRect(0, 0, fxCache.width, fxCache.height);
    this.backgroundCache.fx = fxCache;

    this.cacheDirty = false;
  }

  // Вызывать при изменении размеров слоя
  invalidateCache() {
    this.cacheDirty = true;
  }

  // Геттер для получения divider (если нужен доступ извне)
  getDivider() {
    return this.divider;
  }

  // Получить позицию divider
  getDividerY() {
    return this.divider.y;
  }

  // Установить позицию divider (с проверками)
  setDividerY(newY) {
    const minY = 50;
    const maxY = this.canvas.height - 50;

    if (newY >= minY && newY <= maxY) {
      this.divider.y = newY;
      this.updateLayerSizes();
      return true;
    }
    return false;
  }

  // Проверить, находится ли точка на divider
  isPointOnDivider(x, y) {
    const halfHeight = this.divider.height / 2;
    return Math.abs(y - this.divider.y) < halfHeight * 2;
  }

  // Получить divider для отрисовки
  getDividerForDrawing() {
    return {
      y: this.divider.y,
      height: this.divider.height,
      isDragging: this.divider.isDragging,
    };
  }

  updateLayerSizes() {
    this.layers.voice.visibleHeight = this.divider.y - this.layers.voice.y;
    this.layers.fx.y = this.divider.y + 10;
    this.layers.fx.visibleHeight = this.canvas.height - this.layers.fx.y - 10;

    // 🆕 При изменении размеров - кеш надо обновить
    this.invalidateCache();
  }

  // LayerManager.js - updateCanvasSize():
  updateCanvasSize() {
    // Используем ФИКСИРОВАННЫЕ размеры canvas
    const canvasWidth = this.system.baseCanvasWidth || 1200;
    const canvasHeight = this.system.baseCanvasHeight || 800;

    // UI панель справа (фиксированная ширина)
    //const uiPanelWidth = 250; // пикселей

    // Voice слой
    this.layers.voice.x = 0; // Отступ от левого края canvas
    this.layers.voice.y = 0; // Отступ от верхнего края canvas
    this.layers.voice.width = canvasWidth; // Оставляем место под UI
    this.layers.voice.visibleHeight = this.divider.y;
    this.layers.voice.totalHeight = 2500;

    // FX слой
    this.layers.fx.x = 0; // ТАКОЙ ЖЕ ОТСТУП
    this.layers.fx.y = this.divider.y + 10;
    this.layers.fx.width = canvasWidth;
    this.layers.fx.visibleHeight = canvasHeight - this.layers.fx.y;
    this.layers.fx.totalHeight = 2500;
  }

  // Проверка, находится ли точка в слое
  getLayerAtPoint(x, y) {
    // Проверяем в экранных координатах
    if (y < this.divider.y) {
      return 'voice';
    } else {
      return 'fx';
    }
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

  // Удалить модуль из слоя
  removeModuleFromLayer(module) {
    if (module.layer && this.layers[module.layer]) {
      const layer = this.layers[module.layer];
      const index = layer.modules.indexOf(module);
      if (index > -1) {
        layer.modules.splice(index, 1);
        module.layer = null;
        return true;
      }
    }
    return false;
  }

  // === РАБОТА С РАЗДЕЛИТЕЛЕМ ===

  checkDividerClick(y) {
    const dividerHalfHeight = this.divider.height / 2;
    return Math.abs(y - this.divider.y) < dividerHalfHeight * 2;
  }

  startDividerDrag(y) {
    this.divider.isDragging = true;
    this.divider.dragStartY = y;
  }

  updateDividerDrag(y) {
    if (!this.divider.isDragging) return;

    const deltaY = y - this.divider.dragStartY;
    const newDividerY = this.divider.y + deltaY;

    // Ограничиваем движение
    const minY = 50;
    const maxY = this.canvas.height - 50;

    if (newDividerY >= minY && newDividerY <= maxY) {
      this.divider.y = newDividerY;
      this.divider.dragStartY = y;

      // Обновляем размеры зон
      this.updateLayerSizes();
      return true;
    }
    return false;
  }

  endDividerDrag() {
    this.divider.isDragging = false;
  }

  updateLayerSizes() {
    this.layers.voice.visibleHeight = this.divider.y - this.layers.voice.y;
    this.layers.fx.y = this.divider.y + 10;
    this.layers.fx.visibleHeight = this.canvas.height - this.layers.fx.y - 10;
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

    // Проверяем границы слоя
    const maxGridX = Math.floor(layer.width / GRID_UNITS.X) - gridWidth;
    const maxGridY =
      Math.floor(layer.visibleHeight / GRID_UNITS.Y) - gridHeight;

    if (gridX < 0 || gridX > maxGridX || gridY < 0 || gridY > maxGridY) {
      return false;
    }

    // Проверяем все модули в слое
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

    const maxGridX = Math.floor(layer.width / GRID_UNITS.X) - gridWidth;
    const maxGridY =
      Math.floor(layer.visibleHeight / GRID_UNITS.Y) - gridHeight;

    let startX = startGridX !== null ? startGridX : 0;
    let startY = startGridY !== null ? startGridY : 0;

    for (let y = startY; y <= maxGridY; y++) {
      for (let x = startX; x <= maxGridX; x++) {
        if (this.isGridCellFree(layerName, x, y, gridWidth, gridHeight)) {
          return { gridX: x, gridY: y };
        }
      }
      startX = 0;
    }

    return null;
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

  drawDivider(ctx) {
    ctx.save();

    // Линия разделителя
    ctx.strokeStyle = '#0af';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, this.divider.y);
    ctx.lineTo(this.canvas.width, this.divider.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Кружок для перетаскивания
    ctx.fillStyle = '#0af';
    ctx.beginPath();
    ctx.arc(this.canvas.width / 2, this.divider.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Подписи зон
    ctx.fillStyle = '#0af';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VOICE', this.canvas.width / 2, this.layers.voice.y + 20);
    ctx.fillText('FX', this.canvas.width / 2, this.layers.fx.y + 20);

    ctx.restore();
  }

  // === СКРОЛЛ ===

  handleWheel(deltaY, y) {
    if (y < this.divider.y) {
      // Voice зона
      this.layers.voice.scrollY -= deltaY;
      this.layers.voice.scrollY = Math.max(
        0,
        Math.min(
          this.layers.voice.totalHeight - this.layers.voice.visibleHeight,
          this.layers.voice.scrollY,
        ),
      );
      return 'voice';
    } else {
      // FX зона
      this.layers.fx.scrollY -= deltaY;
      this.layers.fx.scrollY = Math.max(
        0,
        Math.min(
          this.layers.fx.totalHeight - this.layers.fx.visibleHeight,
          this.layers.fx.scrollY,
        ),
      );
      return 'fx';
    }
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
