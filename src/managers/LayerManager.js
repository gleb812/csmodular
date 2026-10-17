// src/managers/LayerManager.js
import { BASE_STEP_X, BASE_STEP_Y } from '../constants.js';

export class LayerManager {
  constructor(canvas) {
    this.canvas = canvas;

    this.frameCounter = 0;
    // Копируем структуру слоев из main.js
    // ⭐ Мир бесконечный. Слои — только логические (voice/fx).
    // Никаких x/y/width/height — всё в мировых координатах.
    this.layers = {
      voice: { modules: [] },
      fx:    { modules: [] },
    };

    this.debugInfo = null; // Для отладки
  }

  // === ОСНОВНЫЕ МЕТОДЫ ===


  getLayerAtPoint(x, y) {
    // ⭐ Все новые модули — Voice по умолчанию.
    return 'voice';
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

  findFreeSpace(
    layerName,
    gridWidth = 1,
    gridHeight = 1,
    startGridX = null,
    startGridY = null,
    stepX = 1,
    stepY = 1,
  ) {
    const layer = this.layers[layerName];
    if (!layer) return null;

    const MAX_SEARCH = 200;
    
    let baseX = Number.isFinite(startGridX) ? startGridX : 0;
    let baseY = Number.isFinite(startGridY) ? startGridY : 0;

    // ⭐ Округляем base до разрешённой сетки
    baseX = Math.round(baseX / stepX) * stepX;
    baseY = Math.round(baseY / stepY) * stepY;

    // Сначала пробуем точку startGrid
    if (this.isGridCellFree(layerName, baseX, baseY, gridWidth, gridHeight)) {
      return { gridX: baseX, gridY: baseY };
    }

    // Затем расширяемся по спирали (шаг = stepX/stepY)
    for (let radius = 1; radius < MAX_SEARCH; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const x = baseX + dx * stepX;
          const y = baseY + dy * stepY;
          
          if (this.isGridCellFree(layerName, x, y, gridWidth, gridHeight)) {
            return { gridX: x, gridY: y };
          }
        }
      }
    }

    return null;
  }

  // === DEBUG ===

  setDebugInfo(debugInfo) {
    this.debugInfo = debugInfo;
  }
}
