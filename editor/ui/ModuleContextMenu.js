// editor/ui/ModuleContextMenu.js
//
// Строит пункты контекстного меню:
//   - на пустом месте canvas: Add Component / Rename / Change Color
//   - на компоненте: Delete
//   - на модуле: Add Component / Rename / Change Color / Delete Module

import { ContextMenu } from './ContextMenu.js';
import { getByCategory, createComponent, ComponentRegistry } from './../ComponentRegistry.js';

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

    const clickInside =
        worldX >= app.module.x && worldX <= app.module.x + app.module.width &&
        worldY >= app.module.y && worldY <= app.module.y + app.module.height;

    if (!clickInside) {
        app.uiManager.showNotification('❌ Click inside the module first');
        return;
    }

    // ⭐ Размер — из ComponentRegistry, не из локальной копии
    const def = ComponentRegistry[type];
    if (!def) {
        app.uiManager.showNotification(`❌ Unknown component type: ${type}`);
        return;
    }
    const size = def.paletteSize;

    const maxX = app.module.x + app.module.width - size.width;
    const maxY = app.module.y + app.module.height - size.height;
    const targetX = Math.max(app.module.x, Math.min(maxX, worldX - size.width / 2));
    const targetY = Math.max(app.module.y, Math.min(maxY, worldY - size.height / 2));

    const opts = { x: targetX, y: targetY };
    if (type === 'Input' || type === 'Output') {
        opts.jackType = jackType || 'audio';
    }

    const component = createComponent(type, opts);
    if (!component) {
        app.uiManager.showNotification(`❌ Could not create: ${type}`);
        return;
    }

    console.log('[_addComponent]', type,
        'autoSize=', def.autoSize,
        'after create:', component.width, '×', component.height);

    component.id = app._generateComponentId().toString();
    component.originalID = component.id;
    component.parameterId = parseInt(component.id);

    // ⭐ autoSize — не перезаписываем (TextLabel сам считает по тексту)
    if (!def.autoSize) {
        component.width = size.width;
        component.height = size.height;
    }

    component.relX = component.x - app.module.x;
    component.relY = component.y - app.module.y;
    component.parent = app.module;
    component._editorModule = app.module;
    component._isNewDragging = false;

    app.components.push(component);

    if (app.codeViewerWindow) {
        app.codeViewerWindow.updateCode();
    }

    const jackLabel = (type === 'Input' || type === 'Output') ? ` (${jackType || 'audio'})` : '';
    app.uiManager.showNotification(`✅ ${type}${jackLabel} added`);
}



function _renameModule(app) {
    const current = app.module.title || 'New Module';
    const newName = prompt('Module name:', current);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) return;

    let name = trimmed.replace(/\s/g, '');
    if (/^[0-9]/.test(name)) name = 'M' + name;
    name = name.replace(/[^a-zA-Z0-9_]/g, '') || 'NewModule';

    app.module.title = name;

    if (app.codeViewerWindow) app.codeViewerWindow.updateCode();
    if (app.propertiesPanel && app.propertiesPanel.activeTab === 'module') {
        app.propertiesPanel._render();
    }

    app.uiManager.showNotification(`📝 Renamed to: ${name}`);
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