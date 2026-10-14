// editor/ui/ContextMenu.js
//
// Универсальное контекстное меню.
//
// Использование:
//   ContextMenu.show(x, y, [
//       { label: 'Add Component', submenu: [...] },
//       { label: 'Rename', onClick: () => {} },
//       { divider: true },
//       { label: 'Delete', onClick: () => {}, danger: true },
//   ]);
//
//   ContextMenu.hide();

let currentMenu = null;

export class ContextMenu {
    static show(x, y, items) {
        ContextMenu.hide();
        currentMenu = new ContextMenuInstance(x, y, items);
    }

    static hide() {
        if (currentMenu) {
            currentMenu.destroy();
            currentMenu = null;
        }
    }
}

class ContextMenuInstance {
    constructor(x, y, items) {
        this.items = items;
        this.submenus = [];
        this._build(x, y);
        this._setupDismiss();
    }

    _build(x, y, asSubmenu = false, parentEl = null) {
        const el = document.createElement('div');
        el.style.cssText = `
            position: fixed;
            background: #252525;
            border: 1px solid #444;
            border-radius: 6px;
            padding: 4px 0;
            min-width: 180px;
            z-index: ${asSubmenu ? 10001 : 10000};
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.7);
            font-family: Arial, sans-serif;
            font-size: 12px;
            user-select: none;
        `;

        for (const item of this.items) {
            if (item.divider) {
                const d = document.createElement('div');
                d.style.cssText = 'height: 1px; background: #333; margin: 4px 0;';
                el.appendChild(d);
                continue;
            }

            const row = this._makeItem(item, el);
            el.appendChild(row);
        }

        document.body.appendChild(el);

        // Позиция: не выходить за экран
        if (!asSubmenu) {
            this.element = el;
            const rect = el.getBoundingClientRect();
            if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 4;
            if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 4;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
        }
    }

    _makeItem(item, parentEl) {
        const row = document.createElement('div');
        const hasSub = Array.isArray(item.submenu) && item.submenu.length > 0;

        row.style.cssText = `
            padding: 6px 14px;
            cursor: pointer;
            color: ${item.danger ? '#ff6b6b' : '#ddd'};
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            white-space: nowrap;
        `;

        const label = document.createElement('span');
        label.textContent = item.label || '';
        row.appendChild(label);

        if (hasSub) {
            const arrow = document.createElement('span');
            arrow.textContent = '▶';
            arrow.style.cssText = 'color: #666; font-size: 9px;';
            row.appendChild(arrow);
        }

        row.addEventListener('mouseenter', () => {
            row.style.background = item.danger ? '#3a1a1a' : '#333';
            if (hasSub) this._showSubmenu(row, item.submenu);
            else this._hideSubmenus();
        });
        row.addEventListener('mouseleave', () => {
            row.style.background = 'transparent';
        });

        if (!hasSub && item.onClick) {
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                ContextMenu.hide();
                item.onClick();
            });
        }

        return row;
    }

    _showSubmenu(parentRow, subItems) {
        this._hideSubmenus();

        const rect = parentRow.getBoundingClientRect();
        const sub = new ContextMenuInstance(0, 0, subItems);

        // Позиционируем справа от родителя
        sub.element.style.left = `${rect.right + 2}px`;
        sub.element.style.top = `${rect.top - 4}px`;
        sub.element.style.zIndex = '10001';

        // Если вылезает за правый край — показываем слева
        const subRect = sub.element.getBoundingClientRect();
        if (subRect.right > window.innerWidth) {
            sub.element.style.left = `${rect.left - subRect.width - 2}px`;
        }

        this.submenus.push(sub);
        sub._dismissOnParentUnhover = true;
    }

    _hideSubmenus() {
        for (const s of this.submenus) s.destroy();
        this.submenus = [];
    }

    _setupDismiss() {
        // Закрытие по клику вне
        const onMouseDown = (e) => {
            if (this.element && this.element.contains(e.target)) return;
            for (const s of this.submenus) {
                if (s.element && s.element.contains(e.target)) return;
            }
            ContextMenu.hide();
        };

        const onKey = (e) => {
            if (e.key === 'Escape') ContextMenu.hide();
        };

        // Отложенно, чтобы текущий клик не закрыл сразу
        setTimeout(() => {
            document.addEventListener('mousedown', onMouseDown);
            document.addEventListener('keydown', onKey);
        }, 0);

        this._cleanup = () => {
            document.removeEventListener('mousedown', onMouseDown);
            document.removeEventListener('keydown', onKey);
        };
    }

    destroy() {
        this._hideSubmenus();
        if (this._cleanup) this._cleanup();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}