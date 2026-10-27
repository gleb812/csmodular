// src/PatchManager.js
import { Cable } from './Cable.js';
import { getCurrentTheme } from './theme/currentTheme.js';
import { CABLE_COLORS } from './constants.js';

export class PatchManager {
  constructor(system) {
    this.system = system;
    this.cables = [];
    this.draggingCable = null;
    this.startJack = null;
    this.hoverJack = null;

    // ⭐ CABLE_COLORS теперь из constants.js
    this.CABLE_COLORS = CABLE_COLORS;
  }

  // === ОСНОВНЫЕ ОПЕРАЦИИ С КАБЕЛЯМИ ===

  addCable(fromJack, toJack) {
      if (!this.canConnect(fromJack, toJack)) {
          return null;
      }

      let actualFrom = fromJack;
      let actualTo = toJack;
      
      if (fromJack.direction === 'input' && toJack.direction === 'output') {
          actualFrom = toJack;
          actualTo = fromJack;
          console.log('🔄 Swapped jacks: input → output corrected to output → input');
      }

      const cableColor = this.determineCableColor(actualFrom);

      const cable = new Cable(actualFrom, actualTo, cableColor);
      this.cables.push(cable);

      this.updateJackConnection(actualFrom, cable);
      this.updateJackConnection(actualTo, cable);

      console.log(`✅ Cable added (color: ${cableColor}). Total: ${this.cables.length}`);
      
      if (this.system) {
          this.system._cablesDirty = true;
      }

      if (this.system && this.system.csoundGen) {
          this.system.csoundGen.addCable(cable);
      }
      
      if (this.system?.csoundEngine?.state === 'running') {
          this.system._recompileDebounced();
      }

      if (this.system?.recomputeVariantUI) {
          this.system.recomputeVariantUI();
      }

      return cable;
  }


  getCablesForJack(jack) {
    return this.cables.filter(
      (cable) => cable.fromJack === jack || cable.toJack === jack,
    );
  }

  disconnectJack(jack) {
    const cables = this.getCablesForJack(jack);
    console.log(
      `Отключаем ${cables.length} кабелей от джека ${jack.label || jack.id}`,
    );

    cables.forEach((cable) => {
      this.removeCable(cable);
    });

    return cables.length;
  }

  changeCableColor(jack, colorHex, isVisual = true) {
      if (!isVisual) {
          console.warn('Functional cable color is determined by jack type');
          return 0;
      }
      const cables = this.getCablesForJack(jack);
      cables.forEach(c => c.setVisualColor(colorHex));
      if (this.system) {
          this.system._cablesDirty = true;
          if (this.system.forceRedraw) this.system.forceRedraw();
      }
      return cables.length;
  }

  resetCableColors(jack) {
      const cables = this.getCablesForJack(jack);
      cables.forEach(c => c.resetVisualColor());
      jack.updateCenterColor(jack.getEffectiveColor());
      if (this.system) {
          this.system._cablesDirty = true;
          if (this.system.forceRedraw) this.system.forceRedraw();
      }
      return cables.length;
  }

  determineCableColor(fromJack) {
      return CABLE_COLORS[fromJack.type] || CABLE_COLORS.other;
  }


  updateJackConnection(jack, cable) {
      jack.addCable(cable);
      // ⭐ цвет центра = тип самого джека, не цвет кабеля
      jack.updateCenterColor(jack.getEffectiveColor());
  }

  removeCable(cable) {
      const index = this.cables.indexOf(cable);
      if (index > -1) {
          const fromJack = cable.fromJack;
          const toJack = cable.toJack;

          if (fromJack) fromJack.removeCable(cable);
          if (toJack) toJack.removeCable(cable);

          cable.disconnect();
          this.cables.splice(index, 1);

          // ⭐ сразу вернуть цвета джеков к их текущему типу
          if (fromJack) fromJack.updateCenterColor(fromJack.getEffectiveColor());
          if (toJack) toJack.updateCenterColor(toJack.getEffectiveColor());
          
          if (this.system) {
              this.system._cablesDirty = true;
              if (this.system.forceRedraw) this.system.forceRedraw();
          }
          
          if (this.system && this.system.csoundGen) {
              this.system.csoundGen.removeCable(cable);
          }
          
          if (this.system?.csoundEngine?.state === 'running') {
              this.system._recompileDebounced();
          }

          if (this.system?.recomputeVariantUI) {
              this.system.recomputeVariantUI();
          }
      }
  }

  clear() {
      // Отключаем все кабели от джеков
      this.cables.forEach(cable => {
          if (cable.fromJack) cable.fromJack.removeCable(cable);
          if (cable.toJack) cable.toJack.removeCable(cable);
          cable.disconnect();
      });

      this.cables = [];
      
      if (this.system) {
          this.system._cablesDirty = true;
          if (this.system.forceRedraw) {
              this.system.forceRedraw();
          }
      }
      
      // ⭐ Очищаем кабели в CsoundGenerator
      if (this.system && this.system.csoundGen) {
          this.system.csoundGen.clearCables();
          //this.system.csoundGen.showFullCsd();
      }
      
      if (this.system?.csoundEngine?.state === 'running') {
          this.system._recompileDebounced();
      }
  }

  // === ПРОВЕРКИ СОЕДИНЕНИЙ ===
  canConnect(jack1, jack2) {
    //console.log('🔍 canConnect check:');
    //console.log('  Jack1:', jack1.type, jack1.direction, jack1.parentModule?.title);
    //console.log('  Jack2:', jack2.type, jack2.direction, jack2.parentModule?.title);
    // Нельзя подключить к самому себе
    if (jack1 === jack2) {
      console.log('❌ Cannot connect to itself');
      return false;
    }

    // Нельзя подключить выход к выходу
    if (jack1.direction === 'output' && jack2.direction === 'output') {
      console.log('❌ Cannot connect output to output');
      return false;
    }

    // Проверяем что джеки имеют родительские модули
    if (!jack1.parentModule || !jack2.parentModule) {
      console.error('❌ Jacks must have parent modules');
      return false;
    }

    // Проверяем слои (только если модули в разных слоях)
    if (jack1.parentModule.layer !== jack2.parentModule.layer) {
      console.error(
        `❌ Cross-layer cable: ${jack1.parentModule.layer} ↔ ${jack2.parentModule.layer}`,
      );

      if (this.system && this.system.showNotification) {
        const layerNames = { voice: 'VA', fx: 'FX' };
        this.system.showNotification(
          `❌ Cannot connect ${layerNames[jack1.parentModule.layer]} ↔ ${layerNames[jack2.parentModule.layer]}`,
        );
      }

      return false;
    }

    return true;
  }

  // === ПЕРЕТАСКИВАНИЕ КАБЕЛЕЙ ===
  startCableDrag(jack, mouseX, mouseY) {
    //console.log('🔗 START CABLE DRAG:');
    //console.log('  Джек:', jack.label);

    // Используем безопасный метод получения центра
    const jackCenter = jack.getCenter
      ? jack.getCenter()
      : jack.center || { x: mouseX, y: mouseY };

    //console.log('  Центр джека:', jackCenter);
    //console.log('  Координаты мыши:', { x: mouseX, y: mouseY });

    this.startJack = jack;
    this.draggingCable = {
      from: jack,
      to: { x: mouseX, y: mouseY }, // Используем мировые координаты мыши
      isDragging: true,
    };

    //console.log('  Установлен to:', this.draggingCable.to);

    return true;
  }

  updateCableDrag(mouseX, mouseY) {
    if (this.draggingCable) {
      this.draggingCable.to = { x: mouseX, y: mouseY };
    }
  }

  endCableDrag(endJack) {
      if (!this.startJack) {
          //console.log('❌ No start jack');
          this.cancelCableDrag();
          return null;
      }
      
      if (!endJack) {
          //console.log('❌ No end jack found');
          this.cancelCableDrag();
          return null;
      }
      
      // ⭐ Правильное направление: выход → вход
      let fromJack = this.startJack;
      let toJack = endJack;
      
      // Если начали с входа, а закончили на выходе — меняем местами
      if (fromJack.direction === 'input' && toJack.direction === 'output') {
          fromJack = endJack;
          toJack = this.startJack;
          //console.log('🔄 Swapped: input → output corrected');
      }
      
      // Проверяем, что from — выход, to — вход
      if (fromJack.direction !== 'output' || toJack.direction !== 'input') {
          console.log('❌ Invalid connection: from must be output, to must be input');
          this.cancelCableDrag();
          return null;
      }
      
      if (!this.canConnect(fromJack, toJack)) {
          console.log('Connection not allowed');
          this.cancelCableDrag();
          return null;
      }
      
      const cable = this.addCable(fromJack, toJack);
      this.cancelCableDrag();
      
      return cable;
  }
  
  cancelCableDrag() {
    this.draggingCable = null;
    this.startJack = null;
    this.hoverJack = null;
  }

  // === ОТРИСОВКА ===
  draw(ctx, layerName = null) {
    // Рисуем кабели указанного слоя
    //console.log('🎨 PatchManager.draw() called');
    //console.log('  Total cables:', this.cables.length);
    //console.log('  Layer filter:', layerName);
    if (layerName) {
      this.cables.forEach((cable) => {
        const fromModule = cable.fromJack?.parentModule;
        const toModule = cable.toJack?.parentModule;

        if (!fromModule || !toModule) return;

        if (fromModule.layer === layerName && toModule.layer === layerName) {
          cable.draw(ctx);
        }
      });
    } else {
      // Рисуем все кабели
      this.cables.forEach((cable) => cable.draw(ctx));
    }

    // Рисуем перетаскиваемый кабель поверх всего
    if (this.draggingCable && this.draggingCable.isDragging) {
      this.drawDraggingCable(ctx);
    }
  }

  drawDraggingCable(ctx, offsetX = 0, offsetY = 0, scale = 1) {
    if (!this.draggingCable) return;

    const theme = getCurrentTheme();
    const isLcd = theme.isLcd;
    const jack = this.draggingCable.from;
    const cableType = jack?.type || 'audio';

    const from = jack.center || { x: 0, y: 0 };
    const to = this.draggingCable.to;

    // Простое преобразование в экранные координаты
    const screenFrom = {
      x: from.x * scale + offsetX,
      y: from.y * scale + offsetY,
    };

    const screenTo = {
      x: to.x * scale + offsetX,
      y: to.y * scale + offsetY,
    };

    // ⭐ Цвет как у обычного кабеля: LCD → из темы, classic → из палитры
    const strokeColor = isLcd
      ? theme.getCableColor(cableType)
      : (this.CABLE_COLORS[cableType] || this.CABLE_COLORS.other);

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = theme.getCableWidth(cableType);
    ctx.lineCap = 'round';

    // ⭐ Свечение в LCD
    if (theme.shouldGlowCable()) {
      theme.applyGlow(ctx);
    }

    ctx.setLineDash([5, 3]);

    ctx.beginPath();
    ctx.moveTo(screenFrom.x, screenFrom.y);

    const midX = (screenFrom.x + screenTo.x) / 2;
    const dx = Math.abs(screenTo.x - screenFrom.x);
    const dy = Math.abs(screenTo.y - screenFrom.y);

    const sagBase = Math.min(dx * 0.3, 100) + dy * 0.15;
    const sag = sagBase;   // для перетаскивания без randomFactor — детерминированно

    const ctrl1Y = screenFrom.y + sag;
    const ctrl2Y = screenTo.y   + sag;

    ctx.bezierCurveTo(
        midX, ctrl1Y,
        midX, ctrl2Y,
        screenTo.x, screenTo.y
    );
    ctx.stroke();
    ctx.setLineDash([]);

    theme.clearGlow(ctx);
  }


  /**
   * Сдвинуть все кабели патча в случайные положения.
   * @param {number} range — максимальный сдвиг в px
   */
  shakeAllCables(range = 80) {
    this.cables.forEach((cable, i) => {
      // Небольшая задержка — эффект «волны»
      const delay = i * 40;
      setTimeout(() => cable.nextShape(range), delay);
    });
  }

  /**
   * Сдвинуть только кабели, подключённые к джеку.
   */
  shakeJackCables(jack, range = 80) {
    const cables = this.getCablesForJack(jack);
    cables.forEach((cable, i) => {
      const delay = i * 30;
      setTimeout(() => cable.nextShape(range), delay);
    });
    return cables.length;
  }

  /** Есть ли хоть один активный переход формы. */
  hasActiveTransitions() {
    return this.cables.some((c) => c.isTransitioning());
  }

  /** Обновить все активные переходы (вызывается из animate). */
  updateShapes() {
    this.cables.forEach((c) => c.updateShape());
  }

  /** Сбросить форму всех кабелей в базовую. */
  resetAllShapes() {
    this.cables.forEach((c, i) => {
      setTimeout(() => c.resetShape(), i * 30);
    });
  }


  // === УТИЛИТЫ ===

  findCableById(id) {
    return this.cables.find((c) => c.id === id);
  }

  findCablesByModule(moduleId) {
    return this.cables.filter((cable) => {
      const fromModuleId = cable.fromJack?.parentModule?.moduleId;
      const toModuleId = cable.toJack?.parentModule?.moduleId;

      return fromModuleId === moduleId || toModuleId === moduleId;
    });
  }

  checkCableClick(x, y) {
    for (let i = this.cables.length - 1; i >= 0; i--) {
      if (this.cables[i].contains(x, y)) {
        return this.cables[i];
      }
    }
    return null;
  }
}
