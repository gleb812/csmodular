// src/ui/StickerContextMenu.js
//
// Контекстное меню для стикера.
// Правый клик по стикеру → Edit / Z-order / Color / Marquee / Delete.

export class StickerContextMenu {
    constructor(system) {
        this.system = system;
        this.isVisible = false;
        this.menuElement = null;
        this.currentSticker = null;

        this.createMenuElement();
        this.setupEventListeners();
    }

    createMenuElement() {
        this.menuElement = document.createElement('div');
        this.menuElement.id = 'sticker-context-menu';
        this.menuElement.style.cssText = `
            position: fixed;
            min-width: 180px;
            background: #1a1a1a;
            border: 1px solid #333;
            border-radius: 4px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            z-index: 21000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 12px;
            color: #ccc;
            padding: 4px 0;
            display: none;
            user-select: none;
        `;
        document.body.appendChild(this.menuElement);
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (this.isVisible && !this.menuElement.contains(e.target)) {
                this.hide();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) this.hide();
        });
    }

    /**
     * @param {Sticker} sticker
     * @param {number} screenX
     * @param {number} screenY
     */
    show(sticker, screenX, screenY) {
        this.currentSticker = sticker;
        this.menuElement.innerHTML = '';
        this._buildMenu(sticker);

        // Позиционирование с проверкой границ
        const menuW = 200;
        const menuH = this.menuElement.offsetHeight || 200;
        let left = screenX + 5;
        let top = screenY + 5;
        if (left + menuW > window.innerWidth) left = screenX - menuW - 5;
        if (top + menuH > window.innerHeight) top = screenY - menuH - 5;
        if (left < 5) left = 5;
        if (top < 5) top = 5;

        this.menuElement.style.left = `${left}px`;
        this.menuElement.style.top = `${top}px`;
        this.menuElement.style.display = 'block';
        this.isVisible = true;
    }

    hide() {
        this.menuElement.style.display = 'none';
        this.isVisible = false;
        this.currentSticker = null;
    }

    _buildMenu(sticker) {
        const m = this.menuElement;

        // === Edit ===
        m.appendChild(this._item('✏️ Edit…', () => {
            this.system.stickerProperties?.show(sticker);
            this.hide();
        }));

        m.appendChild(this._separator());

        // === Z-order ===
        m.appendChild(this._label('Z-order'));
        m.appendChild(this._radioItem('Behind modules', sticker.z === 'behind', () => {
            sticker.z = 'behind';
            this.system.forceRedraw();
            this.show(sticker, parseInt(m.style.left), parseInt(m.style.top));
        }));
        m.appendChild(this._radioItem('Front (over cables)', sticker.z === 'front', () => {
            sticker.z = 'front';
            this.system.forceRedraw();
            this.show(sticker, parseInt(m.style.left), parseInt(m.style.top));
        }));

        m.appendChild(this._separator());

        // === Color (только если тема LCD, иначе показываем Custom + White) ===
        const theme = this.system.stickers?.length >= 0
            ? window.__theme__?.get?.()
            : null;
        const isLcd = theme?.isLcd === true;

        m.appendChild(this._label('Color'));
        if (isLcd) {
            m.appendChild(this._radioItem('White', sticker.colorMode === 'white', () => {
                sticker.colorMode = 'white';
                this.system.forceRedraw();
                this.show(sticker, parseInt(m.style.left), parseInt(m.style.top));
            }));
            m.appendChild(this._radioItem('Accent', sticker.colorMode === 'accent', () => {
                sticker.colorMode = 'accent';
                this.system.forceRedraw();
                this.show(sticker, parseInt(m.style.left), parseInt(m.style.top));
            }));
        } else {
            m.appendChild(this._radioItem('Custom', sticker.colorMode === 'custom', () => {
                sticker.colorMode = 'custom';
                this.system.forceRedraw();
                this.show(sticker, parseInt(m.style.left), parseInt(m.style.top));
            }));
            m.appendChild(this._radioItem('White', sticker.colorMode === 'white', () => {
                sticker.colorMode = 'white';
                this.system.forceRedraw();
                this.show(sticker, parseInt(m.style.left), parseInt(m.style.top));
            }));
        }

        // === Marquee ===
        if (sticker.type === 'text') {
            m.appendChild(this._separator());
            m.appendChild(this._checkboxItem(
                'Marquee',
                sticker.marquee.enabled,
                () => {
                    sticker.marquee.enabled = !sticker.marquee.enabled;
                    this.system.forceRedraw();
                    this.show(sticker, parseInt(m.style.left), parseInt(m.style.top));
                },
            ));
        }

        m.appendChild(this._separator());

        // === Delete ===
        const delItem = this._item('🗑️ Delete', () => {
            this.system.removeSticker(sticker);
            this.hide();
        });
        delItem.style.color = '#ff6b6b';
        m.appendChild(delItem);
    }

    // === Хелперы для пунктов меню ===

    _item(text, onClick) {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `
            padding: 6px 14px;
            cursor: pointer;
            color: #ccc;
        `;
        el.onmouseenter = () => { el.style.background = '#2a2a2a'; };
        el.onmouseleave = () => { el.style.background = 'transparent'; };
        el.onclick = (e) => { e.stopPropagation(); onClick(); };
        return el;
    }

    _radioItem(text, isChecked, onClick) {
        const el = document.createElement('div');
        el.style.cssText = `
            padding: 5px 14px 5px 28px;
            cursor: pointer;
            color: ${isChecked ? '#0af' : '#aaa'};
            position: relative;
            font-size: 11px;
        `;
        if (isChecked) el.textContent = '● ' + text;
        else el.textContent = '○ ' + text;
        el.onmouseenter = () => { if (!isChecked) el.style.background = '#2a2a2a'; };
        el.onmouseleave = () => { if (!isChecked) el.style.background = 'transparent'; };
        el.onclick = (e) => { e.stopPropagation(); onClick(); };
        return el;
    }

    _checkboxItem(text, isChecked, onClick) {
        const el = document.createElement('div');
        el.textContent = (isChecked ? '☑ ' : '☐ ') + text;
        el.style.cssText = `
            padding: 5px 14px;
            cursor: pointer;
            color: ${isChecked ? '#0af' : '#ccc'};
            font-size: 11px;
        `;
        el.onmouseenter = () => { el.style.background = '#2a2a2a'; };
        el.onmouseleave = () => { el.style.background = 'transparent'; };
        el.onclick = (e) => { e.stopPropagation(); onClick(); };
        return el;
    }

    _label(text) {
        const el = document.createElement('div');
        el.textContent = text;
        el.style.cssText = `
            padding: 4px 14px 2px;
            font-size: 9px;
            color: #555;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        return el;
    }

    _separator() {
        const el = document.createElement('div');
        el.style.cssText = 'height: 1px; background: #2a2a2a; margin: 4px 0;';
        return el;
    }
}