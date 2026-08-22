// src/managers/UIManager.js
import { Panel } from '../components/Panel.js';

export class UIManager {
  constructor(system) {
    this.system = system;
    this.container = null;
    this.elements = {};
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };

    // Для кэширования значений
    this.lastValues = {
      modules: 0,
      cables: 0,
      fps: 0,
      times: {
        total: 0,
        clear: 0,
        drawVoice: 0,
        drawFx: 0,
        drawDivider: 0,
        drawCables: 0,
      },
      profilerEnabled: false,
    };

    this.createUIContainer();
    this.makeDraggable();
    this.createCsoundControls();
    this.createZoomControls();
    this.createDebugInfo();

    // Запускаем периодическое обновление (вместо requestAnimationFrame)
    this.startPeriodicUpdates();
  }

  // === НОВЫЙ МЕТОД: запускает обновления раз в 200 мс ===
  startPeriodicUpdates() {
    setInterval(() => this.updateBasicInfoIfNeeded(), 500);
    setInterval(() => this.updateProfilerIfNeeded(), 1000);
  }

  // === ОБНОВЛЕНИЕ БАЗОВОЙ ИНФОРМАЦИИ (FPS, модули, кабели) ===
  updateBasicInfoIfNeeded() {
    if (!this.elements.basicInfo || !this.system) return;

    const modules =
      this.system.components?.filter?.(
        (c) => c.constructor?.name === 'Panel' || c instanceof Panel,
      ).length || 0;

    const cables = this.system.patchManager?.cables?.length || 0;
    const fps = this.system.currentFPS || 0;

    if (
      this.lastValues.modules === modules &&
      this.lastValues.cables === cables &&
      this.lastValues.fps === fps
    ) {
      return;
    }

    this.lastValues.modules = modules;
    this.lastValues.cables = cables;
    this.lastValues.fps = fps;

    let fpsColor = '#6f6';
    if (fps < 30) fpsColor = '#f66';
    else if (fps < 50) fpsColor = '#ff6';

    const basicDiv = this.elements.basicInfo;
    if (!basicDiv._fpsSpan) {
      basicDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
          <span>🎯 FPS:</span>
          <span id="fpsValue" style="font-weight: bold;"></span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px;">
          <span>📦 Modules:</span>
          <span id="modulesValue" style="color: #0af;"></span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>🔌 Cables:</span>
          <span id="cablesValue" style="color: #f0f;"></span>
        </div>
      `;
      basicDiv._fpsSpan = basicDiv.querySelector('#fpsValue');
      basicDiv._modulesSpan = basicDiv.querySelector('#modulesValue');
      basicDiv._cablesSpan = basicDiv.querySelector('#cablesValue');
    }

    basicDiv._fpsSpan.textContent = fps;
    basicDiv._fpsSpan.style.color = fpsColor;
    basicDiv._modulesSpan.textContent = modules;
    basicDiv._cablesSpan.textContent = cables;
  }

  // === ОБНОВЛЕНИЕ ПРОФАЙЛЕРА ===
  updateProfilerIfNeeded() {
    if (!this.elements.profilerMetrics || !this.system?.profiler) return;

    const profiler = this.system.profiler;
    const enabled = profiler.enabled;
    const times = profiler.times || {};

    if (
      this.lastValues.profilerEnabled === enabled &&
      this.lastValues.times.total === times.total &&
      this.lastValues.times.clear === times.clear &&
      this.lastValues.times.drawVoice === times.drawVoice &&
      this.lastValues.times.drawFx === times.drawFx &&
      this.lastValues.times.drawDivider === times.drawDivider &&
      this.lastValues.times.drawCables === times.drawCables
    ) {
      return;
    }

    this.lastValues.profilerEnabled = enabled;
    this.lastValues.times = { ...times };

    const metricsDiv = this.elements.profilerMetrics;

    if (!enabled) {
      metricsDiv.innerHTML = `
        <div style="grid-column: span 2; text-align: center; color: #666;">
          ⚙️ Profiler disabled
        </div>
      `;
      return;
    }

    const frameTime = times.total || 0;
    let frameColor = '#6f6';
    if (frameTime > 33) frameColor = '#f66';
    else if (frameTime > 20) frameColor = '#ff6';
    else if (frameTime > 16) frameColor = '#fa6';

    const bottlenecks = [];
    if (times.drawVoice > 10) bottlenecks.push('Voice');
    if (times.drawFx > 10) bottlenecks.push('FX');
    if (times.drawCables > 8) bottlenecks.push('Cables');

    if (!metricsDiv._spans) {
      metricsDiv.innerHTML = `
        <div style="grid-column: span 2; margin-bottom: 4px;">
          <span id="frameTimeSpan"></span>
          <span id="bottleneckSpan" style="margin-left: 8px;"></span>
        </div>
        <div>Clear:</div><div id="clearSpan" style="text-align: right;"></div>
        <div>Voice:</div><div id="voiceSpan" style="text-align: right;"></div>
        <div>FX:</div><div id="fxSpan" style="text-align: right;"></div>
        <div>Divider:</div><div id="dividerSpan" style="text-align: right;"></div>
        <div>Cables:</div><div id="cablesSpan" style="text-align: right;"></div>
      `;
      metricsDiv._spans = {
        frameTime: metricsDiv.querySelector('#frameTimeSpan'),
        bottleneck: metricsDiv.querySelector('#bottleneckSpan'),
        clear: metricsDiv.querySelector('#clearSpan'),
        voice: metricsDiv.querySelector('#voiceSpan'),
        fx: metricsDiv.querySelector('#fxSpan'),
        divider: metricsDiv.querySelector('#dividerSpan'),
        cables: metricsDiv.querySelector('#cablesSpan'),
      };
    }

    const spans = metricsDiv._spans;
    spans.frameTime.innerHTML = `⏱️ ${Math.round(frameTime)}ms`;
    spans.frameTime.style.color = frameColor;

    if (bottlenecks.length) {
      spans.bottleneck.innerHTML = `⚠️ ${bottlenecks.join('/')}`;
      spans.bottleneck.style.color = '#f66';
    } else {
      spans.bottleneck.innerHTML = '';
    }

    spans.clear.textContent = `${Math.round(times.clear || 0)}ms`;
    spans.voice.textContent = `${Math.round(times.drawVoice || 0)}ms`;
    spans.voice.style.color = times.drawVoice > 10 ? '#f66' : '#6f6';
    spans.fx.textContent = `${Math.round(times.drawFx || 0)}ms`;
    spans.fx.style.color = times.drawFx > 10 ? '#f66' : '#6f6';
    spans.divider.textContent = `${Math.round(times.drawDivider || 0)}ms`;
    spans.cables.textContent = `${Math.round(times.drawCables || 0)}ms`;
    spans.cables.style.color = times.drawCables > 8 ? '#f66' : '#6f6';
  }

  // === ПЕРЕТАСКИВАНИЕ ПАНЕЛИ (draggable) ===
  makeDraggable() {
    if (!this.container) return;

    const header = document.createElement('div');
    header.style.cssText = `
      height: 20px;
      background: #333;
      cursor: move;
      border-radius: 8px 8px 0 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #aaa;
      font-size: 11px;
      user-select: none;
      will-change: transform;
    `;
    header.textContent = '≡ Control Panel';
    header.title = 'grab to move';

    this.container.insertBefore(header, this.container.firstChild);

    this.container.style.position = 'fixed';
    this.container.style.left = '0';
    this.container.style.top = '0';
    this.container.style.right = 'auto';
    this.container.style.willChange = 'transform';

    this.currentX = 10;
    this.currentY = 10;
    this.updatePositionTransform();

    header.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      const rect = this.container.getBoundingClientRect();
      this.dragOffset.x = e.clientX - rect.left;
      this.dragOffset.y = e.clientY - rect.top;
      this.container.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      const maxX = window.innerWidth - this.container.offsetWidth;
      const maxY = window.innerHeight - this.container.offsetHeight;
      this.currentX = Math.max(0, Math.min(newX, maxX));
      this.currentY = Math.max(0, Math.min(newY, maxY));
      this.updatePositionTransform();
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.isDragging = false;
        this.container.style.cursor = '';
      }
    });
  }

  updatePositionTransform() {
    this.container.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
  }

  // === СОЗДАНИЕ КОНТЕЙНЕРА ===
  createUIContainer() {
    this.container = document.createElement('div');
    this.container.id = 'modular-ui-panel';
    this.container.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 220px;
      background: rgba(30, 30, 30, 0.85);
      padding: 15px;
      border-radius: 8px;
      color: white;
      font-family: Arial, sans-serif;
      border: 1px solid #444;
      z-index: 1000;
      max-height: 90vh;
      overflow-y: auto;
      pointer-events: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(5px);
      -webkit-backdrop-filter: blur(5px);
      will-change: transform;
    `;

    document.body.appendChild(this.container);
    this.updatePositionTransform();
  }

  setTransparency(alpha = 0.85) {
    if (this.container) {
      const r = 30,
        g = 30,
        b = 30;
      this.container.style.background = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  // === ZOOM КОНТРОЛЫ ===
  createZoomControls() {
    const zoomContainer = document.createElement('div');
    zoomContainer.style.marginTop = '15px';

    zoomContainer.innerHTML = `
      <div style="margin-bottom: 5px;">Zoom:</div>
      <div style="display: flex; gap: 5px; margin-bottom: 5px;">
        <button id="zoomOutBtn" style="flex: 1; padding: 8px; background: #444; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">-</button>
        <button id="zoomResetBtn" style="flex: 1; padding: 8px; background: #444; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">100%</button>
        <button id="zoomInBtn" style="flex: 1; padding: 8px; background: #444; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">+</button>
      </div>
      <div id="zoomInfo" style="text-align: center; font-size: 12px; color: #aaa;">100%</div>
    `;

    zoomContainer.querySelector('#zoomOutBtn').onclick = () =>
      this.system.zoom(-0.2);
    zoomContainer.querySelector('#zoomResetBtn').onclick = () =>
      this.system.resetZoom();
    zoomContainer.querySelector('#zoomInBtn').onclick = () =>
      this.system.zoom(0.2);

    this.container.appendChild(zoomContainer);
    this.elements.zoomInfo = zoomContainer.querySelector('#zoomInfo');
  }

  // === CSOUND КОНТРОЛЫ ===
  createCsoundControls() {
    const csoundContainer = document.createElement('div');
    csoundContainer.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 8px;
      border: 1px solid #0af;
      box-shadow: 0 2px 8px rgba(0, 170, 255, 0.2);
    `;

    csoundContainer.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 10px;">
        <div style="color: #0af; font-weight: bold; font-size: 14px; flex: 1;">🎵 Csound Engine</div>
        <div id="csoundStatus" style="font-size: 10px; background: #333; padding: 2px 6px; border-radius: 10px; color: #8f8;">READY</div>
      </div>
      <div style="display: flex; gap: 5px; margin-bottom: 8px;">
        <button id="initCsoundBtn" style="flex: 1; padding: 8px; background: linear-gradient(to bottom, #0a5, #083); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">⚡ Initialize</button>
        <button id="testCsoundBtn" style="flex: 1; padding: 8px; background: linear-gradient(to bottom, #f80, #d60); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">🔊 Test Tone</button>
      </div>
      <div style="display: flex; gap: 5px;">
        <button id="stopCsoundBtn" style="flex: 1; padding: 8px; background: linear-gradient(to bottom, #a00, #800); color: white; border: none; border-radius: 6px; cursor: pointer;">⏹ Stop</button>
        <button id="noteBtn" style="flex: 1; padding: 8px; background: linear-gradient(to bottom, #808, #606); color: white; border: none; border-radius: 6px; cursor: pointer;">🎹 Note A4</button>
      </div>
      <div style="margin-top: 8px; font-size: 10px; color: #aaa; text-align: center; line-height: 1.3;">
        <div>Render patch to Csound code</div>
        <div id="csoundInfo">Not initialized</div>
      </div>
    `;

    csoundContainer.querySelector('#initCsoundBtn').onclick = () =>
      this.system.initCsound();
    csoundContainer.querySelector('#testCsoundBtn').onclick = () =>
      this.system.testCsound();
    csoundContainer.querySelector('#stopCsoundBtn').onclick = () =>
      this.system.stopCsound();
    csoundContainer.querySelector('#noteBtn').onclick = () =>
      this.system.playNote();

    this.container.appendChild(csoundContainer);
    this.elements.csoundStatus = csoundContainer.querySelector('#csoundStatus');
    this.elements.csoundInfo = csoundContainer.querySelector('#csoundInfo');
  }

  // === ДЕБАГ ИНФОРМАЦИЯ ===
  createDebugInfo() {
    const container = document.createElement('div');
    container.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background: #222;
      border-radius: 4px;
      font-size: 11px;
      font-family: monospace;
      max-height: 250px;
      overflow-y: auto;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #444;
    `;

    const title = document.createElement('span');
    title.textContent = '📊 SYSTEM INFO';
    title.style.color = '#0af';

    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = 'Toggle Profiler';
    toggleBtn.style.cssText = `
      background: #333;
      border: 1px solid #555;
      color: #0af;
      padding: 2px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 9px;
    `;

    toggleBtn.onclick = () => {
      if (this.system.toggleProfiler) {
        const enabled = this.system.toggleProfiler();
        toggleBtn.style.color = enabled ? '#0f0' : '#f00';
        toggleBtn.textContent = enabled ? 'Profiler ON' : 'Profiler OFF';
        this.lastValues.profilerEnabled = !enabled;
      }
    };

    header.appendChild(title);
    header.appendChild(toggleBtn);

    this.elements.basicInfo = document.createElement('div');
    this.elements.basicInfo.style.cssText = `
      background: #1a1a1a;
      padding: 6px;
      border-radius: 3px;
      margin-bottom: 8px;
      font-weight: bold;
    `;

    this.elements.profilerMetrics = document.createElement('div');
    this.elements.profilerMetrics.style.cssText = `
      background: #1a1a1a;
      padding: 6px;
      border-radius: 3px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px;
    `;

    container.appendChild(header);
    container.appendChild(this.elements.basicInfo);
    container.appendChild(this.elements.profilerMetrics);

    this.elements.debugInfo = container;
    this.container.appendChild(container);
  }

  // === ПРОСТЫЕ МЕТОДЫ ОБНОВЛЕНИЯ ===
  updateZoomInfo(scale) {
    if (this.elements.zoomInfo) {
      this.elements.zoomInfo.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  updateCsoundStatus(text, color = '#fff') {
    if (this.elements.csoundStatus) {
      this.elements.csoundStatus.textContent = text;
      this.elements.csoundStatus.style.color = color;
    }
  }

  updateCsoundInfo(text) {
    if (this.elements.csoundInfo) {
      this.elements.csoundInfo.textContent = text;
    }
  }

  updatePatchInfo(filename, moduleCount, cableCount) {
    if (this.elements.patchInfo) {
      this.elements.patchInfo.style.display = 'block';
      this.elements.patchInfo.innerHTML = `
        <strong>${filename}</strong><br>
        Modules: ${moduleCount}<br>
        Cables: ${cableCount}<br>
        Loaded successfully
      `;
    }
  }

  updateDebugInfo(text) {
    if (this.elements.debugInfo) {
      this.elements.debugInfo.innerHTML = text;
      this.elements.debugInfo.scrollTop = this.elements.debugInfo.scrollHeight;
    }
  }

  // === УВЕДОМЛЕНИЯ ===
  showNotification(message, duration = 2000) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 15px;
      background: rgba(0, 170, 85, 0.9);
      color: white;
      border-radius: 4px;
      z-index: 2000;
      font-family: Arial, sans-serif;
      font-size: 14px;
      animation: fadeInOut ${duration}ms ease;
      will-change: opacity, transform;
    `;

    if (!document.querySelector('#notification-animation')) {
      const style = document.createElement('style');
      style.id = 'notification-animation';
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, duration);

    return notification;
  }
}
