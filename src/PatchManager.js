// src/PatchManager.js
import { Cable } from './Cable.js';
import { getCurrentTheme } from './theme/currentTheme.js';

export class PatchManager {
  constructor(system) {
    this.system = system;
    this.cables = [];
    this.draggingCable = null;
    this.startJack = null;
    this.hoverJack = null;

    // Цвета кабелей по типам
    this.CABLE_COLORS = {
      audio: '#ef4444', // Красный
      control: '#3b82f6', // Синий
      logic: '#fde047', // Желтый
      other: '#ffffff', // Белый
    };
  }

  // === ОСНОВНЫЕ ОПЕРАЦИИ С КАБЕЛЯМИ ===

  addCable(fromJack, toJack) {
      // Проверяем возможность подключения
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

      const cableColor = this.determineCableColor(actualFrom, actualTo);

      const cable = new Cable(actualFrom, actualTo, cableColor);
      this.cables.push(cable);

      this.updateJackConnection(actualFrom, cable, cableColor);
      this.updateJackConnection(actualTo, cable, cableColor);

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

      // ⭐ Пересчёт вариантов + UI-перекраска
      if (this.system?.recomputeVariantUI) {
          this.system.recomputeVariantUI();   // асинхронный, не ждём
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
    const cables = this.getCablesForJack(jack);
    //console.log(`Меняем ${isVisual ? 'визуальный' : 'функциональный'} цвет ${cables.length} кабелей на ${colorHex}`);

    cables.forEach((cable) => {
      if (isVisual) {
        cable.setVisualColor(colorHex);
      } else {
        // Меняем тип (но лучше не делать это через UI)
        cable.typeColor = colorHex;
      }

      // Обновляем цвет центров джеков
      const otherJack = cable.fromJack === jack ? cable.toJack : cable.fromJack;
      if (otherJack && otherJack.updateCenterColor) {
        otherJack.updateCenterColor(cable.getDisplayColor());
      }
    });

    // Обновляем цвет самого джека
    if (jack.updateCenterColor) {
      jack.updateCenterColor(cables[0]?.getDisplayColor() || '#ffffff');
    }

    return cables.length;
  }

  resetCableColors(jack) {
    const cables = this.getCablesForJack(jack);

    cables.forEach((cable) => {
      cable.resetVisualColor();

      // Возвращаем цвет центров к typeColor
      const otherJack = cable.fromJack === jack ? cable.toJack : cable.fromJack;
      if (otherJack && otherJack.updateCenterColor) {
        otherJack.updateCenterColor(cable.typeColor);
      }
    });

    if (jack.updateCenterColor) {
      // Возвращаем цвет джека к типу первого кабеля
      const defaultColor =
        cables[0]?.typeColor ||
        this.CABLE_COLORS[jack.type] ||
        this.CABLE_COLORS.other;
      jack.updateCenterColor(defaultColor);
    }
    // ===== ДОБАВИТЬ ЭТОТ БЛОК =====
    if (this.system) {
      this.system._cablesDirty = true;
    }
    return cables.length;
  }

  determineCableColor(jack1, jack2) {
    // Ищем выходной джек
    let outputJack = null;

    if (jack1.direction === 'output') {
      outputJack = jack1;
    } else if (jack2.direction === 'output') {
      outputJack = jack2;
    }

    // Если есть выходной джек - берем его цвет
    if (outputJack) {
      return this.CABLE_COLORS[outputJack.type] || this.CABLE_COLORS.other;
    }

    // Оба джека - входы
    // Проверяем, есть ли у них уже цветные подключения
    const coloredCable = this.findColoredCable(jack1, jack2);
    if (coloredCable) {
      return coloredCable.color;
    }

    // Иначе белый кабель
    return this.CABLE_COLORS.other;
  }

  findColoredCable(jack1, jack2) {
    // Проверяем все кабели джека 1
    for (const cable of jack1.cables) {
      if (cable.color !== this.CABLE_COLORS.other) {
        return cable;
      }
    }

    // Проверяем все кабели джека 2
    for (const cable of jack2.cables) {
      if (cable.color !== this.CABLE_COLORS.other) {
        return cable;
      }
    }

    return null;
  }

  updateJackConnection(jack, cable, color) {
    jack.addCable(cable);
    jack.updateCenterColor(color);

    // Если это входной джек и у него несколько подключений,
    // перекрашиваем все кабели в цвет первого цветного подключения
    if (jack.direction === 'input' && jack.cables.length > 1) {
      this.synchronizeInputCables(jack);
    }
  }

  synchronizeInputCables(inputJack) {
    // Ищем первый цветной кабель
    let targetColor = this.CABLE_COLORS.other;
    for (const cable of inputJack.cables) {
      if (cable.color !== this.CABLE_COLORS.other) {
        targetColor = cable.color;
        break;
      }
    }

    // Перекрашиваем все кабели и обновляем центры
    for (const cable of inputJack.cables) {
      if (cable.color !== targetColor) {
        cable.color = targetColor;

        // Обновляем цвет центра у второго джека
        const otherJack =
          cable.fromJack === inputJack ? cable.toJack : cable.fromJack;
        if (otherJack) {
          otherJack.updateCenterColor(targetColor);
        }
      }
    }

    // Обновляем цвет центра самого джека
    inputJack.updateCenterColor(targetColor);
  }

  removeCable(cable) {
      const index = this.cables.indexOf(cable);
      if (index > -1) {
          // Удаляем ссылки из джеков
          if (cable.fromJack) {
              cable.fromJack.removeCable(cable);
          }
          if (cable.toJack) {
              cable.toJack.removeCable(cable);
          }

          // Отключаем кабель
          cable.disconnect();
          this.cables.splice(index, 1);
          
          if (this.system) {
              this.system._cablesDirty = true;
              if (this.system.forceRedraw) {
                  this.system.forceRedraw();
              }
          }
          
          // ⭐ Удаляем кабель из CsoundGenerator
          if (this.system && this.system.csoundGen) {
              this.system.csoundGen.removeCable(cable);
              //this.system.csoundGen.showFullCsd();
          }
          
          if (this.system?.csoundEngine?.state === 'running') {
              this.system._recompileDebounced();
          }

          // ⭐ Пересчёт вариантов + UI-перекраска
          if (this.system?.recomputeVariantUI) {
              this.system.recomputeVariantUI();   // асинхронный, не ждём
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
