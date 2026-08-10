import { BaseComponent } from './BaseComponent.js';

export class ButtonText extends BaseComponent {
  static FIXED_HEIGHT = 13;

  constructor(x, y, width = 40, text = 'M', initialState = true) {
    super(x, y, width, ButtonText.FIXED_HEIGHT);

    this.isInteractive = true;
    this.supportsDrag = false;

    this.text = text;
    this.isActive = initialState;

    // Csound-интеграция
    this.csoundChannel = null;
    this.onToggle = null;

    // Тултип
    this.showTooltip = false;
    this.tooltipTimeout = null;
    this.tooltipDelay = 300;

    // Анимация
    this.animationProgress = 0;
    this.animationDuration = 150;
    this.isAnimating = false;

    // 🆕 КЭШИРОВАНИЕ ТЕКСТА
    this.textCache = document.createElement('canvas');
    this.textCacheCtx = this.textCache.getContext('2d');
    this.cachedText = null;
    this.cachedIsActive = null;
    this.cachedWidth = null;

    // 🆕 Флаги для оптимизации
    this.needsRedraw = true;
    this.lastDrawParams = null;
  }

  // Метод для получения высоты
  getActualHeight() {
    return ButtonText.FIXED_HEIGHT;
  }

  // 🆕 МЕТОД ДЛЯ ОБНОВЛЕНИЯ КЭША ТЕКСТА
  updateTextCache(ctx) {
    // Проверяем, изменился ли текст или состояние
    if (
      this.cachedText === this.text &&
      this.cachedIsActive === this.isActive &&
      this.cachedWidth === this.width
    ) {
      return; // Кэш актуален
    }

    // Обновляем кэш
    this.textCache.width = this.width;
    this.textCache.height = ButtonText.FIXED_HEIGHT;

    const cacheCtx = this.textCacheCtx;
    cacheCtx.clearRect(0, 0, this.width, ButtonText.FIXED_HEIGHT);

    // Центр для кэша
    const centerX = this.width / 2;
    const centerY = ButtonText.FIXED_HEIGHT / 2;

    // Рисуем текст в кэш
    cacheCtx.font = 'bold 10px Arial, sans-serif';
    cacheCtx.textAlign = 'center';
    cacheCtx.textBaseline = 'middle';
    cacheCtx.fillStyle = this.isActive ? '#ffffff' : '#d1d5db';
    cacheCtx.fillText(this.text, centerX, centerY);

    // Сохраняем параметры кэша
    this.cachedText = this.text;
    this.cachedIsActive = this.isActive;
    this.cachedWidth = this.width;
  }

  // 🆕 ОПТИМИЗИРОВАННЫЙ DRAW
  draw(ctx) {
    // Сохраняем параметры для проверки изменений
    const currentParams = {
      x: this.x,
      y: this.y,
      isPressed: this.isPressed,
      animationProgress: this.animationProgress,
      isHovered: this.isHovered,
      isActive: this.isActive,
      width: this.width,
    };

    // Проверяем, нужно ли перерисовывать
    const paramsChanged =
      !this.lastDrawParams ||
      this.lastDrawParams.x !== currentParams.x ||
      this.lastDrawParams.y !== currentParams.y ||
      this.lastDrawParams.isPressed !== currentParams.isPressed ||
      this.lastDrawParams.animationProgress !==
        currentParams.animationProgress ||
      this.lastDrawParams.isHovered !== currentParams.isHovered ||
      this.lastDrawParams.isActive !== currentParams.isActive;

    if (!paramsChanged && !this.needsRedraw) {
      return; // Ничего не изменилось — не рисуем
    }

    this.lastDrawParams = currentParams;
    this.needsRedraw = false;

    ctx.save();
    ctx.lineWidth = 1;

    // Анимация нажатия
    let scale = 1;
    let offsetY = 0;
    if (this.isPressed && this.isAnimating) {
      const progress = this.animationProgress / this.animationDuration;
      scale = 1 - 0.1 * Math.sin(progress * Math.PI);
      offsetY = 1 * Math.sin(progress * Math.PI);
    }

    const centerX = this.x + this.width / 2;
    const centerY = this.y + ButtonText.FIXED_HEIGHT / 2;
    const drawX = centerX - (this.width * scale) / 2;
    const drawY = centerY - (ButtonText.FIXED_HEIGHT * scale) / 2 + offsetY;
    const drawWidth = this.width * scale;
    const drawHeight = ButtonText.FIXED_HEIGHT * scale;

    // Фон кнопки (зависит от состояния)
    if (this.isActive) {
      if (this.isPressed) {
        ctx.fillStyle = '#3730a3';
      } else if (this.isHovered) {
        ctx.fillStyle = '#3730a3';
      } else {
        ctx.fillStyle = '#4f46e5';
      }
    } else {
      if (this.isPressed) {
        ctx.fillStyle = '#4b5563';
      } else if (this.isHovered) {
        ctx.fillStyle = '#374151';
      } else {
        ctx.fillStyle = '#1f2937';
      }
    }

    // Рисуем фон
    const radius = 2;
    this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
    ctx.fill();

    // Рамка кнопки
    ctx.strokeStyle = this.isActive
      ? this.isHovered
        ? '#0af'
        : '#6366f1'
      : this.isHovered
        ? '#9ca3af'
        : '#4b5563';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, drawX, drawY, drawWidth, drawHeight, radius);
    ctx.stroke();

    // 🆕 ТЕКСТ ИЗ КЭША
    this.updateTextCache(ctx);

    // Рисуем закэшированный текст с учетом анимации
    if (scale !== 1 || offsetY !== 0) {
      // Если есть анимация, применяем трансформацию
      ctx.save();
      ctx.translate(centerX, centerY + offsetY);
      ctx.scale(scale, scale);
      ctx.drawImage(
        this.textCache,
        -this.width / 2,
        -ButtonText.FIXED_HEIGHT / 2,
        this.width,
        ButtonText.FIXED_HEIGHT,
      );
      ctx.restore();
    } else {
      // Без анимации — просто копируем кэш
      ctx.drawImage(
        this.textCache,
        this.x,
        this.y,
        this.width,
        ButtonText.FIXED_HEIGHT,
      );
    }

    ctx.restore();
  }

  drawTooltip(ctx) {
    ctx.save();
    const stateText = this.isActive ? 'ON' : 'OFF';
    const tooltipText = `${this.text}: ${stateText}`;
    const padding = 10;
    const tooltipHeight = 25;
    const tooltipX = this.x + this.width / 2;
    const tooltipY = this.y - tooltipHeight - 10;

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textWidth = ctx.measureText(tooltipText).width;
    const tooltipWidth = textWidth + padding * 2;

    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.beginPath();
    ctx.rect(
      tooltipX - tooltipWidth / 2,
      tooltipY,
      tooltipWidth,
      tooltipHeight,
    );
    ctx.fill();

    ctx.strokeStyle = '#666';
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.fillText(tooltipText, tooltipX, tooltipY + tooltipHeight / 2);
    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  // === ОБРАБОТКА СОБЫТИЙ ===

  handleClick(x, y) {
    if (this.isPointInside(x, y)) {
      console.log(`🟩 ButtonText.handleClick at (${x}, ${y})`);
      this.toggle();
      this.startAnimation();
      return {
        type: 'component-click',
        component: this,
        componentType: 'button-text',
      };
    }
    return false;
  }

  toggle() {
    const oldState = this.isActive;
    this.isActive = !this.isActive;

    // Помечаем, что нужно перерисовать
    this.needsRedraw = true;

    if (window.csound && this.csoundChannel) {
      const csoundValue = this.isActive ? 1 : 0;
      window.csound.setControlChannel(this.csoundChannel, csoundValue).then(
        () => {},
        () => {},
      );
    }

    if (this.onToggle) {
      this.onToggle(this.isActive, this.text, oldState);
    }

    console.log(
      `ButtonText toggled: ${this.text} = ${this.isActive ? 'ON' : 'OFF'}`,
    );
  }

  // 🆕 ОПТИМИЗИРОВАННАЯ АНИМАЦИЯ
  startAnimation() {
    if (this.isAnimating) return; // Уже анимируется

    this.isAnimating = true;
    this.animationProgress = this.animationDuration;

    const animate = () => {
      this.animationProgress -= 16;
      this.needsRedraw = true; // Помечаем для перерисовки

      if (this.animationProgress <= 0) {
        this.animationProgress = 0;
        this.isPressed = false;
        this.isAnimating = false;
        this.needsRedraw = true;
      } else {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  // === СОСТОЯНИЕ И ТУЛТИПЫ ===

  handleMouseMove(x, y) {
    const wasHovered = this.isHovered;
    super.handleMouseMove(x, y);

    if (wasHovered !== this.isHovered) {
      this.needsRedraw = true; // Изменилось состояние hover
    }

    if (!wasHovered && this.isHovered) {
      this.clearTooltipTimeout();
      this.tooltipTimeout = setTimeout(() => {
        this.showTooltip = true;
        this.needsRedraw = true;
      }, this.tooltipDelay);
    } else if (wasHovered && !this.isHovered) {
      this.hideTooltip();
    }
  }

  hideTooltip() {
    this.clearTooltipTimeout();
    if (this.showTooltip) {
      this.showTooltip = false;
      this.needsRedraw = true;
    }
  }

  clearTooltipTimeout() {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  // === УПРАВЛЕНИЕ СОСТОЯНИЕМ ===

  setActive(state) {
    const oldState = this.isActive;
    this.isActive = Boolean(state);

    if (this.isActive !== oldState) {
      this.needsRedraw = true;

      if (window.csound && this.csoundChannel) {
        const csoundValue = this.isActive ? 1 : 0;
        window.csound.setControlChannel(this.csoundChannel, csoundValue).then(
          () => {},
          () => {},
        );
      }

      if (this.onToggle) {
        this.onToggle(this.isActive, this.text, oldState);
      }
    }
  }

  setStateDirect(state) {
    const oldState = this.isActive;
    this.isActive = Boolean(state);
    if (this.isActive !== oldState) {
      this.needsRedraw = true;
    }
  }

  getState() {
    return {
      active: this.isActive,
      text: this.text,
    };
  }

  // === ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ===

  isButtonActive() {
    return this.isActive;
  }

  setText(newText) {
    const oldText = this.text;
    this.text = newText;
    if (oldText !== newText) {
      this.needsRedraw = true;
      this.cachedText = null; // Сбрасываем кэш текста
    }
  }

  getText() {
    return this.text;
  }

  // === Csound-ИНТЕГРАЦИЯ ===

  setCsoundChannel(channel) {
    this.csoundChannel = channel;
  }

  // === ОЧИСТКА ===

  destroy() {
    this.clearTooltipTimeout();
    this.textCache = null; // Освобождаем память
  }
}
