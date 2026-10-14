// editor/ui/ModuleContextMenu.js
//
// Строит пункты контекстного меню:
//   - на пустом месте canvas: Add Component / Rename / Change Color
//   - на компоненте: Delete
//   - на модуле: Add Component / Rename / Change Color / Delete Module

import { ContextMenu } from './ContextMenu.js';
import { getByCategory, createComponent } from './../ComponentRegistry.js';

export function showCanvasContextMenu(app, screenX, screenY) {
    const items = [
        {
            label: '➕ Add Component',
            submenu: _componentSubmenu(app, screenX, screenY),
        },
        { divider: true },
        {
            label: '✏️ Rename Module',
            onClick: () => _renameModule(app),
        },
        {
            label: '🎨 Change Color',
            onClick: () => _changeColor(app),
        },
    ];
    ContextMenu.show(screenX, screenY, items);
}

export function showComponentContextMenu(app, component, screenX, screenY) {
    const items = [
        {
            label: '⚙️ Properties',
            onClick: () => {
                app.selectedComponent = component;
                if (app.propertiesPanel) {
                    app.propertiesPanel.setTab('component');
                }
            },
        },
        { divider: true },
        {
            label: '🗑️ Delete',
            danger: true,
            onClick: () => {
                app.removeComponent(component);
            },
        },
    ];
    ContextMenu.show(screenX, screenY, items);
}

// ─────────────────────────── helpers ────────────────────────────────

function _componentSubmenu(app, screenX, screenY) {
    const byCat = getByCategory();
    const categories = [
        { key: 'controls', title: 'Controls' },
        { key: 'display',  title: 'Display'  },
        { key: 'jacks',    title: 'Jacks'    },
        { key: 'graphics', title: 'Graphics' },
    ];

    const submenu = [];
    for (const cat of categories) {
        const entries = byCat[cat.key] || [];
        if (entries.length === 0) continue;

        submenu.push({ label: `— ${cat.title} —`, onClick: () => {} });

        for (const entry of entries) {
            if (cat.key === 'jacks') {
                // Input/Output — по два варианта
                submenu.push({
                    label: `${entry.type} (audio)`,
                    onClick: () => _addComponent(app, entry.type, screenX, screenY, 'audio'),
                });
                submenu.push({
                    label: `${entry.type} (control)`,
                    onClick: () => _addComponent(app, entry.type, screenX, screenY, 'control'),
                });
            } else {
                submenu.push({
                    label: entry.label || entry.type,
                    onClick: () => _addComponent(app, entry.type, screenX, screenY, null),
                });
            }
        }
    }
    return submenu;
}

function _addComponent(app, type, screenX, screenY, jackType) {
    const rect = app.canvas.getBoundingClientRect();
    const canvasX = (screenX - rect.left) * (app.width / rect.width);
    const canvasY = (screenY - rect.top) * (app.height / rect.height);

    const worldX = (canvasX - app.offsetX) / app.zoom;
    const worldY = (canvasY - app.offsetY) / app.zoom;

    const size = _paletteSizeFor(app, type, jackType);
    if (!size) return;

    // Центрируем в точке клика — как обычный компонент
    const targetX = worldX - size.width / 2;
    const targetY = worldY - size.height / 2;

    const opts = { x: targetX, y: targetY };
    if (type === 'Input' || type === 'Output') {
        opts.jackType = jackType || 'audio';
    }

    const component = createComponent(type, opts);
    if (!component) return;

    component.id = app._generateComponentId().toString();
    component.originalID = component.id;
    component.parameterId = parseInt(component.id);
    component.width = size.width;
    component.height = size.height;

    // Проверяем, что внутри модуля
    const inside = component.x >= app.module.x &&
                   component.x + component.width <= app.module.x + app.module.width &&
                   component.y >= app.module.y &&
                   component.y + component.height <= app.module.y + app.module.height;

    if (!inside) {
        app.uiManager.showNotification('❌ Component outside module');
        app._releaseComponentId(parseInt(component.id));
        return;
    }

    component.relX = component.x - app.module.x;
    component.relY = component.y - app.module.y;
    component.parent = app.module;
    component._editorModule = app.module;
    component._isNewDragging = false;

    app.components.push(component);
    app.uiManager.showNotification(`✅ ${type} added`);
}

function _paletteSizeFor(app, type, jackType) {
    // Импортируем лениво, чтобы избежать цикла
    const map = {
        Knob: { width: 24, height: 24 },
        Slider: { width: 14, height: 50 },
        ButtonFlat: { width: 50, height: 16 },
        ButtonRadio: { width: 120, height: 16 },
        ButtonIncDec: { width: 50, height: 16 },
        ButtonText: { width: 40, height: 16 },
        TextLabel: { width: 60, height: 16 },
        TextField: { width: 50, height: 16 },
        TextEdit: { width: 50, height: 16 },
        LevelShift: { width: 15, height: 12 },
        LED: { width: 16, height: 10 },
        PartSelector: { width: 70, height: 16 },
        SVG: { width: 28, height: 28 },
        Line: { width: 60, height: 2 },
        Graph: { width: 60, height: 24 },
        MiniVU: { width: 40, height: 24 },
        Input: { width: 14, height: 14 },
        Output: { width: 14, height: 14 },
    };
    return map[type] || null;
}

function _renameModule(app) {
    const current = app.module.title || 'New Module';
    const newName = prompt('Module name:', current);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    app.module.title = trimmed;

    // Обновляем код Csound, если окно открыто
    if (app.codeViewerWindow && app.codeViewerWindow.isVisible) {
        const newCode = app.codeViewerWindow.generateCsoundCode();
        app.codeViewerWindow.editor.value = newCode;
        app.codeViewerWindow.codeContent = newCode;
        app.codeViewerWindow.isDirty = false;
        app.codeViewerWindow.updateStatus('saved');
    }

    app.uiManager.showNotification(`📝 Renamed to: ${trimmed}`);
}

function _changeColor(app) {
    const colors = [
        '#2a2a2a', '#3a2a2a', '#2a3a2a', '#2a2a3a',
        '#3a3a2a', '#2a3a3a', '#3a2a3a', '#1a1a1a',
        '#4a3a2a', '#2a4a3a', '#3a2a4a', '#4a2a3a',
    ];

    // Простой prompt-выбор: используем цикл, пока не выберет или отменит
    const current = app.module.customColor || '#2a2a2a';
    const input = prompt(
        `Module color (hex). Current: ${current}\n\nPresets: ${colors.join(', ')}\n\nEnter hex or "reset":`,
        current
    );

    if (input === null) return;
    const trimmed = input.trim().toLowerCase();

    if (trimmed === 'reset' || trimmed === '') {
        app.module.customColor = null;
    } else if (/^#[0-9a-f]{6}$/.test(trimmed)) {
        app.module.customColor = trimmed;
    } else {
        alert('Invalid hex color. Use format #rrggbb');
        return;
    }

    app.uiManager.showNotification(`🎨 Color: ${app.module.customColor || 'default'}`);
}