import { getCurrentTheme } from '../theme/currentTheme.js';
import {
  PANEL_WIDTH,
  PANEL_GRID_WIDTH,
  BASE_STEP_X,
  BASE_STEP_Y,
} from '../constants.js';

export class Panel {
  constructor(gridX, gridY, gridWidth, gridHeight, title, bgImage = null) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.gridWidth = gridWidth || PANEL_GRID_WIDTH;
    this.gridHeight = gridHeight;
    this.pixelX = null; // будет вычисляться
    this.pixelY = null; // будет вычисляться

    // Pixel координаты из grid
    this.width = PANEL_WIDTH;
    this.height = this.gridHeight * BASE_STEP_Y;

    this.title = title;
    this.components = [];
    this.bgImage = bgImage;
    this.originalWidth = this.width;
    this.originalHeight = this.height;

    this.opacity = 1.0;
    this.bgOpacity = 1.0;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.isResizing = false;
    this.resizeHandleSize = 10;

    this.lastValidGridX = gridX; // Добавь это
    this.lastValidGridY = gridY; // Добавь это
    this.dragOffsetGridX = 0; // Добавь это
    this.dragOffsetGridY = 0; // Добавь это
    this.isSelected = false;

    this.customColor = null; // ← ДОБАВЛЯЕМ! null = использовать дефолт '#606060'
    this.defaultColor = '#606060'; // дефолтный серый
    this.dirty = true; // по умолчанию true, чтобы отрисовался при создании
    this.parentSystem = null; // ссылка на систему (устанавливается при создании)
  }

  addComponent(component) {
    this.components.push(component);
    // Сортируем компоненты по zIndex
    this.sortComponentsByZIndex();
    return component;
  }

  sortComponentsByZIndex() {
    if (this.components.length === 0) return;
    // Сортируем от меньшего к большему (от фона к переднему плану)
    this.components.sort((a, b) => {
      const aZ = a.zIndex || 0;
      const bZ = b.zIndex || 0;
      // Если zIndex одинаковые, сохраняем исходный порядок
      if (aZ === bZ) {
        return this.components.indexOf(a) - this.components.indexOf(b);
      }
      return aZ - bZ;
    });
  }

  // Метод для установки выделения
  setSelected(selected) {
    this.isSelected = selected;
  }

  setPixelPosition(x, y) {
    this.pixelX = x;
    this.pixelY = y;

    if (this.components) {
      this.components.forEach((comp, idx) => {
        if (comp.relX !== undefined && comp.relY !== undefined) {
          // ВАЖНО: x, y должны быть мировыми координатами!
          comp.x = x + comp.relX;
          comp.y = y + comp.relY;
        }
      });
    }
    // ===== ДОБАВИТЬ =====
    this.setDirty(true);
  }

  draw(ctx) {
    if (!this.dirty) return;
    if (this.pixelX === null || this.pixelY === null) return;

    const theme = getCurrentTheme();
    const isLcd = theme.isLcd;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    // === ФОН ПАНЕЛИ ===
    if (isLcd) {
      ctx.fillStyle = theme.getSurfaceColor();
    } else {
      const bgColor = this.customColor || this.defaultColor || '#606060';
      ctx.fillStyle = bgColor;
    }
    ctx.fillRect(this.pixelX, this.pixelY, this.width, this.height);

    // === FX-ПОЛОСКА (слева, внутри панели) ===
    if (this.layer === 'fx') {
      const stripeWidth = 3;
      if (isLcd) {
        ctx.fillStyle = theme.getAccentColor();
        theme.applyGlow(ctx);
      } else {
        ctx.fillStyle = '#f59e0b';   // amber для classic
      }
      ctx.fillRect(this.pixelX, this.pixelY, stripeWidth, this.height);
      theme.clearGlow(ctx);
    }

    // === РАМКА ===
    if (isLcd) {
      ctx.strokeStyle = theme.getLineColor();
      ctx.lineWidth = theme.lineWidth(1.5);
      theme.applyGlow(ctx);
    } else {
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 2;
    }
    ctx.strokeRect(this.pixelX, this.pixelY, this.width, this.height);
    theme.clearGlow(ctx);

    // === ТЕКСТ (название модуля) ===
    if (isLcd) {
      ctx.fillStyle = theme.getTextColor();
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      theme.applyGlow(ctx);
      ctx.fillText(this.title, this.pixelX + 4, this.pixelY + 12);
      theme.clearGlow(ctx);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = '12px Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(this.title, this.pixelX + 4, this.pixelY + 12);
    }

    // === ТЕКСТ ПРОЗРАЧНОСТИ (только при bgImage) ===
    if (this.bgImage) {
      ctx.fillStyle = isLcd ? theme.getTextColor() : 'rgba(255, 255, 255, 0.8)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        `UI: ${Math.round(this.opacity * 100)}%`,
        this.pixelX + 5,
        this.pixelY + this.height - 8,
      );
    }

    // ⭐ Динамические компоненты (LED, MiniVU, Graph) рисуются на отдельном слое
    const DYNAMIC_TYPES = ['LED', 'MiniVU', 'Graph'];
    this.components.forEach((comp) => {
        if (DYNAMIC_TYPES.includes(comp.constructor.name)) return;
        comp.draw(ctx);
    });

    ctx.restore();
    this.dirty = false;
  }

  setUIOpacity(opacity) {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }

  // В Panel.js - добавь метод

  setDirty(dirty = true) {
      this.dirty = dirty;

      if (this.components) {
          this.components.forEach((comp) => {
              if (typeof comp.setDirty === 'function') {
                  comp.setDirty(dirty);
              } else {
                  comp.dirty = dirty;
              }
          });
      }

      if (this.parentSystem) {
          if (this.layer === 'voice') {
              this.parentSystem._voiceDirty = true;
          } else if (this.layer === 'fx') {
              this.parentSystem._fxDirty = true;
          }
      }
  }


  setLedDirty() {
      this.dirty = true;
      if (this.parentSystem) {
          if (this.layer === 'voice') {
              this.parentSystem._voiceDirty = true;
          } else if (this.layer === 'fx') {
              this.parentSystem._fxDirty = true;
          }
          this.parentSystem._cablesDirty = true;   // ← ВЕРНУТЬ
      }
  }

  setBackground(image) {
    this.bgImage = image;
    if (image) {
      this.originalWidth = image.width;
      this.originalHeight = image.height;
      this.width = image.width;
      this.height = image.height;
    }
  }

  checkJackClick(x, y) {
    // Проверяем клик на джеках
    for (const component of this.components) {
      if (
        (component.constructor?.name === 'Input' ||
          component.constructor?.name === 'Output') &&
        component.contains(x, y, this)
      ) {
        // Добавляем ссылку на модуль
        component.module = this;
        component.moduleId = this.moduleId;

        return component;
      }
    }
    return null;
  }

  handleMouseMove(x, y) {
    this.components.forEach((comp) => {
      if (comp.handleMouseMove) comp.handleMouseMove(x, y);
    });
  }

  startDrag(startX, startY, systemRef) {
    if (!this.isPointInsidePanel(startX, startY)) return null;

    this.isDragging = true;

    // ⭐ Используем system.grid
    const grid = systemRef?.grid;
    if (!grid) {
      console.warn('startDrag: no grid in system');
      return null;
    }

    // Позиция курсора в grid-координатах (с учётом snap)
    const snapped = grid.snapToGrid(startX, startY);

    // Запоминаем смещение курсора относительно модуля (в grid-координатах)
    this.dragOffsetGridX = snapped.gridX - this.gridX;
    this.dragOffsetGridY = snapped.gridY - this.gridY;

    return {
      handleDrag: (x, y) => this.handlePanelDrag(x, y, systemRef),
      endDrag: () => {
        this.isDragging = false;
      },
      type: 'drag',
      module: this,
    };
  }

  // Временная отладка в Panel.js
  isPointInsidePanel(px, py) {
    if (this.pixelX === null || this.pixelY === null) {
      return false;
    }

    const isInside =
      px >= this.pixelX &&
      px <= this.pixelX + this.width &&
      py >= this.pixelY &&
      py <= this.pixelY + this.height;
    return isInside;
  }

  handlePanelDrag(x, y, systemRef = null) {
    if (!this.isDragging) return;

    const grid = systemRef?.grid;
    if (!grid) return;

    // ⭐ Snap к сетке
    const snapped = grid.snapToGrid(x, y);
    const targetGridX = snapped.gridX - this.dragOffsetGridX;
    const targetGridY = snapped.gridY - this.dragOffsetGridY;

    if (systemRef && this.layer) {
      const canMove = systemRef.isGridCellFree(
        this.layer,
        targetGridX,
        targetGridY,
        this.gridWidth,
        this.gridHeight,
        this,
      );

      if (canMove) {
        this.gridX = targetGridX;
        this.gridY = targetGridY;
        this.lastValidGridX = targetGridX;
        this.lastValidGridY = targetGridY;
        this.setDirty(true);
      }
    } else {
      this.gridX = targetGridX;
      this.gridY = targetGridY;
      this.setDirty(true);
    }
  }

  endPanelDrag() {
    this.isDragging = false;
    this.isResizing = false;
  }

  setOpacity(opacity) {
    this.opacity = Math.max(0, Math.min(1, opacity));
  }
}
