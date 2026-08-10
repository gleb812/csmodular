// src/managers/EventManager.js
export class EventManager {
  constructor(canvas, system) {
    this.canvas = canvas;
    this.system = system;

    // Состояние для обработки событий
    this.lastMouseX = null;
    this.lastMouseY = null;

    // Для throttling mousemove
    this.mouseMovePending = false;
    this.lastMouseEvent = null;

    // Кэш для определения типа под курсором (чтобы не вызывать тяжёлые функции каждый кадр)
    this._cursorCacheValid = false;
    this._cursorCache = { jack: null, module: null };

    // Настройка обработчиков
    this.setupEventListeners();
  }
  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.handleMouseWheel(e));
    this.canvas.addEventListener('contextmenu', (e) =>
      this.handleContextMenu(e),
    );
  }

  // === ОСНОВНЫЕ ОБРАБОТЧИКИ ===

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldX = (x - this.system.offsetX) / this.system.scale;
    const worldY = (y - this.system.offsetY) / this.system.scale;

    // 1A. Если уже перетаскиваем кабель - завершаем его
    if (this.system.patchManager.draggingCable) {
      this.system.patchManager.endCableDrag(this.system.patchManager.hoverJack);
      e.preventDefault();
      return;
    }

    // 1B. Разделитель между зонами
    const screenY = y;
    if (this.system.layerManager.checkDividerClick(screenY)) {
      this.system.layerManager.startDividerDrag(screenY);
      e.preventDefault();
      return;
    }

    // 1C. Удаление кабелей (Shift+клик)
    if (e.shiftKey) {
      const clickedCable = this.system.patchManager.checkCableClick(
        worldX,
        worldY,
      );
      if (clickedCable) {
        this.system.patchManager.removeCable(clickedCable);
        e.preventDefault();
        return;
      }
    }

    // === ДЖЕК-ПОРТЫ ===
    let jackClicked = false;
    for (let panel of this.system.components) {
      const jack = panel.checkJackClick(worldX, worldY);
      if (jack) {
        this.system.patchManager.startCableDrag(jack, worldX, worldY);
        jackClicked = true;
        e.preventDefault();
        break;
      }
    }
    if (jackClicked) return;

    // === ПАНЕЛИ И ИХ ЭЛЕМЕНТЫ ===
    for (let i = this.system.components.length - 1; i >= 0; i--) {
      const panel = this.system.components[i];
      if (panel.isPointInsidePanel(worldX, worldY)) {
        // Проверка элементов панели
        let elementClicked = false;
        for (let j = panel.components.length - 1; j >= 0; j--) {
          const element = panel.components[j];
          const isJack =
            element.constructor?.name === 'Input' ||
            element.constructor?.name === 'Output';
          if (isJack) continue;
          if (element.isPointInside(worldX, worldY)) {
            if (element.handleClick) {
              const result = element.handleClick(worldX, worldY);
              elementClicked = true;
              if (
                result &&
                typeof result === 'object' &&
                result.type === 'component-drag'
              ) {
                this.system.draggingComponent = result;
              }
              e.preventDefault();
              return;
            }
          }
        }
        // Клик на фоне панели
        if (!elementClicked) {
          this.system.deselectModule();
          this.system.selectModule(panel);
          const dragResult = panel.startDrag(worldX, worldY, this.system);
          if (dragResult) this.system.draggingComponent = dragResult;
          e.preventDefault();
          return;
        }
        break;
      }
    }

    // === КЛИК НА ПУСТОМ МЕСТЕ ===
    if (e.button === 2 || e.ctrlKey) {
      e.preventDefault();
      this.openContextMenuAtPosition(e.clientX, e.clientY);
      this.system.deselectModule();
      return;
    }
  }

  handleMouseMove(e) {
    this.lastMouseEvent = e;
    this._cursorCacheValid = false; // кэш устаревает при новом движении
    if (!this.mouseMovePending) {
      this.mouseMovePending = true;
      requestAnimationFrame(() => this.processMouseMove());
    }
  }

  processMouseMove() {
    this.mouseMovePending = false;
    if (!this.lastMouseEvent) return;

    const e = this.lastMouseEvent;
    this.lastMouseEvent = null;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.lastMouseX = x;
    this.lastMouseY = y;
    this.updateMousePosition(x, y);

    const worldX = (x - this.system.offsetX) / this.system.scale;
    const worldY = (y - this.system.offsetY) / this.system.scale;

    // === ПЕРЕТАСКИВАНИЕ КАБЕЛЯ ===
    if (this.system.patchManager.draggingCable) {
      this.system.patchManager.updateCableDrag(worldX, worldY);
      let hoverJack = null;
      for (let panel of this.system.components) {
        const jack = panel.checkJackClick(worldX, worldY);
        if (jack && jack !== this.system.patchManager.startJack) {
          hoverJack = jack;
          break;
        }
      }
      this.system.patchManager.hoverJack = hoverJack;
      this.canvas.style.cursor = hoverJack ? 'crosshair' : 'default';
      e.preventDefault();
      return;
    }

    // === ПЕРЕТАСКИВАНИЕ РАЗДЕЛИТЕЛЯ ===
    if (this.system.layerManager.divider.isDragging) {
      const updated = this.system.layerManager.updateDividerDrag(y);
      if (updated) this.canvas.style.cursor = 'row-resize';
      e.preventDefault();
      return;
    }

    // === ПЕРЕТАСКИВАНИЕ КОМПОНЕНТА (ручки и т.д.) ===
    if (
      this.system.draggingComponent &&
      this.system.draggingComponent.type === 'component-drag'
    ) {
      if (this.system.draggingComponent.handleDrag) {
        this.system.draggingComponent.handleDrag(worldX, worldY);
      }
      e.preventDefault();
      return;
    }

    // === ПЕРЕТАСКИВАНИЕ ПАНЕЛИ ===
    if (
      this.system.draggingComponent &&
      this.system.draggingComponent.type === 'drag' &&
      this.system.draggingComponent.module
    ) {
      if (this.system.draggingComponent.handleDrag) {
        this.system.draggingComponent.handleDrag(worldX, worldY);
      }
      e.preventDefault();
      return;
    }

    // === ПАНОРАМИРОВАНИЕ ===
    if (this.system.isPanning) {
      this.system.offsetX =
        this.system.startOffsetX + (x - this.system.startPanX);
      this.system.offsetY =
        this.system.startOffsetY + (y - this.system.startPanY);
      e.preventDefault();
      return;
    }

    // === ПРАВЫЙ КЛИК НА ДЖЕКЕ ===
    if (e.button === 2 || e.ctrlKey) {
      const jack = this._getJackAtPositionFast(worldX, worldY);
      if (jack) {
        e.preventDefault();
        e.stopPropagation();
        if (this.system.jackContextMenu) {
          this.system.jackContextMenu.show(jack, e.clientX, e.clientY);
        }
        return;
      }
    }

    // === ОБНОВЛЕНИЕ HOVER-СОСТОЯНИЙ ===
    this.system.components.forEach((module) => {
      if (module.handleMouseMove) module.handleMouseMove(worldX, worldY);
    });

    // === ИЗМЕНЕНИЕ КУРСОРА (с кэшированием) ===
    const { jack, module } = this._getCursorInfo(worldX, worldY);
    if (jack) {
      this.canvas.style.cursor = 'pointer';
    } else if (module) {
      this.canvas.style.cursor = 'context-menu';
    } else if (
      !this.system.patchManager.draggingCable &&
      !this.system.layerManager.divider.isDragging &&
      !this.system.isPanning
    ) {
      this.canvas.style.cursor = 'default';
    }
  }

  // Добавить в класс:

  _getCursorInfo(worldX, worldY) {
    if (this._cursorCacheValid) {
      return this._cursorCache;
    }
    const jack = this._getJackAtPositionFast(worldX, worldY);
    const module = jack ? null : this._getModuleAtPositionFast(worldX, worldY);
    this._cursorCache = { jack, module };
    this._cursorCacheValid = true;
    return this._cursorCache;
  }

  _getModuleAtPositionFast(worldX, worldY) {
    for (let i = this.system.components.length - 1; i >= 0; i--) {
      const module = this.system.components[i];
      if (!module.isPointInsidePanel) continue;
      if (
        worldX >= module.x &&
        worldX <= module.x + module.width &&
        worldY >= module.y &&
        worldY <= module.y + module.height
      ) {
        return module;
      }
    }
    return null;
  }

  _getJackAtPositionFast(worldX, worldY) {
    for (let i = this.system.components.length - 1; i >= 0; i--) {
      const module = this.system.components[i];
      if (!module.components) continue;
      for (let j = module.components.length - 1; j >= 0; j--) {
        const comp = module.components[j];
        if (
          (comp.constructor.name === 'Input' ||
            comp.constructor.name === 'Output') &&
          comp.isPointInside &&
          comp.isPointInside(worldX, worldY)
        ) {
          return comp;
        }
      }
    }
    return null;
  }

  handleMouseUp(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const worldX = (x - this.system.offsetX) / this.system.scale;
    const worldY = (y - this.system.offsetY) / this.system.scale;

    // Завершение перетаскивания кабеля
    if (
      this.system.patchManager.draggingCable ||
      this.system.patchManager.startJack
    ) {
      let endJack = null;
      for (let panel of this.system.components) {
        const jack = panel.checkJackClick(worldX, worldY);
        if (jack && jack !== this.system.patchManager.startJack) {
          endJack = jack;
          break;
        }
      }
      const cableCreated = this.system.patchManager.endCableDrag(endJack);
      if (!cableCreated && !endJack) {
        this.system.patchManager.cancelCableDrag();
      }
      e.preventDefault();
      return;
    }

    // Завершение перетаскивания компонента
    if (
      this.system.draggingComponent &&
      this.system.draggingComponent.type === 'component-drag'
    ) {
      if (this.system.draggingComponent.endDrag)
        this.system.draggingComponent.endDrag();
      this.system.draggingComponent = null;
      e.preventDefault();
      return;
    }

    // Завершение перетаскивания панели
    if (
      this.system.draggingComponent &&
      this.system.draggingComponent.type === 'drag'
    ) {
      if (this.system.draggingComponent.endDrag)
        this.system.draggingComponent.endDrag();
      this.system.draggingComponent = null;
      e.preventDefault();
      return;
    }

    // Завершение перетаскивания разделителя
    if (this.system.layerManager.divider.isDragging) {
      this.system.layerManager.endDividerDrag();
      this.canvas.style.cursor = 'default';
      e.preventDefault();
      return;
    }

    // Завершение панорамирования
    if (this.system.isPanning) {
      this.system.isPanning = false;
      this.canvas.style.cursor = 'default';
      e.preventDefault();
      return;
    }

    this.canvas.style.cursor = 'default';
  }

  handleMouseWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    this.system.layerManager.handleWheel(e.deltaY, y);
  }

  handleContextMenu(e) {
    e.preventDefault();
    this.openContextMenuAtPosition(e.clientX, e.clientY);
    if (this.system.patchManager.startJack) {
      this.system.patchManager.cancelCableDrag();
    }
  }

  // === ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===

  openContextMenuAtPosition(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    const worldPos = this.getWorldPosition(canvasX, canvasY);

    const jack = this.getJackAtPosition(worldPos.x, worldPos.y);
    if (jack) {
      if (this.system.jackContextMenu) {
        this.system.jackContextMenu.show(jack, screenX, screenY);
      }
      return 'jack';
    }

    const module = this.getModuleAtPosition(worldPos.x, worldPos.y);
    if (module) {
      if (this.system.moduleContextMenu) {
        this.system.moduleContextMenu.show(module, screenX, screenY);
      }
      return 'module';
    }

    if (this.system.contextMenu) {
      this.system.contextMenu.show(screenX, screenY);
    }
    return 'main';
  }

  updateMousePosition(x, y) {
    this.lastMouseX = x;
    this.lastMouseY = y;
  }

  getModuleAtPosition(worldX, worldY) {
    for (let i = this.system.components.length - 1; i >= 0; i--) {
      const module = this.system.components[i];
      if (
        module.isPointInsidePanel &&
        module.isPointInsidePanel(worldX, worldY)
      ) {
        return module;
      }
    }
    return null;
  }

  getJackAtPosition(worldX, worldY) {
    for (let panel of this.system.components) {
      const jack = panel.checkJackClick(worldX, worldY);
      if (jack) return jack;
    }
    return null;
  }

  getMousePosition() {
    return { x: this.lastMouseX, y: this.lastMouseY };
  }

  getWorldPosition(canvasX, canvasY) {
    return {
      x: (canvasX - this.system.offsetX) / this.system.scale,
      y: (canvasY - this.system.offsetY) / this.system.scale,
    };
  }
}
