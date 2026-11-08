// src/ui/ComponentContextMenu.js
//
// Контекстное меню для компонентов с параметром (Knob, Slider).
// Пока — только MIDI Learn/Forget.
//
// Не путать с JackContextMenu (джеки) и ModuleContextMenu (панель).

export class ComponentContextMenu {
    constructor(system) {
        this.system = system;
        this.menuElement = null;
        this.currentComponent = null;

        this.createMenuElement();
        this.setupEventListeners();
    }

    createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'component-context-menu';
        this.menuElement.style.cssText = `
            position: fixed;
            min-width: 180px;
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            z-index: 20000;
            font-family: Arial, sans-serif;
            color: #ddd;
            display: none;
            overflow: hidden;
        `;
        document.body.appendChild(this.menuElement);
    }

    // component — Knob | Slider
    show(component, x, y) {
        if (!component) return;
        this.currentComponent = component;

        this.updateMenuContent();

        this.menuElement.style.left = `${x}px`;
        this.menuElement.style.top = `${y}px`;
        this.menuElement.style.display = 'block';

        // Закрыть прочие меню
        this.system.contextMenu?.hide?.();
        this.system.jackContextMenu?.hide?.();
        this.system.moduleContextMenu?.hide?.();
    }

    hide() {
        if (this.menuElement) {
            this.menuElement.style.display = 'none';
            this.currentComponent = null;
        }
    }

    updateMenuContent() {
        if (!this.currentComponent) return;
        this.menuElement.innerHTML = '';

        // Заголовок
        this.menuElement.appendChild(this.createHeader());

        const comp = this.currentComponent;
        const mapping = comp.midiMapping;

        if (!mapping) {
            // Нет маппинга — «Learn»
            this.menuElement.appendChild(this.createMenuItem(
                '🎹 MIDI Learn',
                () => this.startLearn(),
            ));
        } else {
            // Есть маппинг — Forget + Re-learn
            this.menuElement.appendChild(this.createMenuItem(
                `🎹 MIDI Forget (CC ${mapping.cc} ch${mapping.channel})`,
                () => this.forget(),
            ));
            this.menuElement.appendChild(this.createMenuItem(
                '🎹 Re-learn MIDI',
                () => this.startLearn(),
            ));
        }

        this.menuElement.appendChild(this.createSeparator());

        // Инфо-секция
        this.menuElement.appendChild(this.createInfoSection());
    }

    createHeader() {
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 8px 12px;
            background: #333;
            color: #0af;
            font-size: 12px;
            border-bottom: 1px solid #444;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const name = this.currentComponent?.constructor?.name || 'Component';
        const icon = name === 'Knob' ? '🌀' : name === 'Slider' ? '↕' : '⚙';

        const title = document.createElement('span');
        title.textContent = `${icon} ${name}`;

        const val = document.createElement('span');
        val.style.cssText = 'font-size:10px;color:#888;font-weight:normal;';
        const v = this.currentComponent?.value;
        val.textContent = typeof v === 'number' ? v.toFixed(0) : '';

        header.appendChild(title);
        header.appendChild(val);
        return header;
    }

    createInfoSection() {
        const sec = document.createElement('div');
        sec.style.cssText = `
            padding: 8px 12px;
            color: #666;
            font-size: 10px;
            line-height: 1.4;
        `;

        const m = this.currentComponent?.midiMapping;
        const mapLine = m
            ? `🎹 <strong>CC ${m.cc} / ch${m.channel}</strong>`
            : `<em>No MIDI mapping</em>`;

        sec.innerHTML = `
            <div>${mapLine}</div>
            <div style="margin-top:4px;color:#555;">
                <em>Right-click to bind a MIDI CC</em>
            </div>
        `;
        return sec;
    }

    createSeparator() {
        const sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:#333;margin:4px 0;';
        return sep;
    }

    createMenuItem(text, onClick) {
        const item = document.createElement('div');
        item.style.cssText = `
            padding: 8px 12px;
            cursor: pointer;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        item.innerHTML = text;
        item.onmouseenter = () => (item.style.background = '#3a3a3a');
        item.onmouseleave = () => (item.style.background = 'transparent');
        item.onclick = (e) => {
            e.stopPropagation();
            onClick();
            this.hide();
        };
        return item;
    }

    // ============================================================
    //  ДЕЙСТВИЯ
    // ============================================================

    startLearn() {
        const comp = this.currentComponent;
        if (!comp) return;

        const midi = this.system.midiManager;
        if (!midi || midi.state !== 'ready') {
            this.system.showNotification?.('❌ MIDI not enabled — click MI in bottom bar');
            return;
        }

        midi.startLearn(comp, (mapping) => {
            comp.midiMapping = mapping;
            this.system.showNotification?.(
                `🎹 ${comp.constructor.name} learned: CC ${mapping.cc} ch${mapping.channel}`,
            );
            this.system.forceRedraw?.();
        });

        this.system.showNotification?.(
            `🎹 Move a knob/fader on your MIDI controller…`,
        );
    }

    forget() {
        const comp = this.currentComponent;
        if (!comp) return;
        comp.midiMapping = null;
        this.system.showNotification?.(`🎹 MIDI mapping cleared`);
        this.system.forceRedraw?.();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (this.menuElement &&
                !this.menuElement.contains(e.target) &&
                this.menuElement.style.display === 'block') {
                this.hide();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.menuElement.style.display === 'block') {
                this.hide();
            }
        });
    }
}