// editor/ComponentRegistry.js
//
// Единый реестр компонентов редактора.
//
// Одна запись описывает ВСЁ, что нужно знать о компоненте:
//   - как создать инстанс (create)
//   - как сериализовать в JS-модуль (serialize)
//   - как восстановить из JS-модуля (deserialize)
//   - какие порты у него для Csound (csoundPorts)
//   - попадает ли он в params[] (isParametric)
//   - как выглядит в палитре (paletteSize, label, category)
//
// ⚠️ Формат serialize/deserialize согласован с рантаймом (src/ModuleFactory.js).
//    Не менять без сверки.
//
// ⚠️ Порядок params[] = порядок компонентов в components[] (НЕ сортировать!).
//    См. scripts/patch_params.py и AI Context.md.
//
// ⚠️ Известные баги рантайма (не воспроизводим в редакторе):
//    - ModuleFactory для TextEdit создаёт ButtonText
//    - LevelShift игнорирует size/width/height
//    - Line: в JSON поле называется width, в конструкторе — thickness

import { Knob } from '../src/components/Knob.js';
import { Slider } from '../src/components/Slider.js';
import { ButtonFlat } from '../src/components/ButtonFlat.js';
import { ButtonRadio } from '../src/components/ButtonRadio.js';
import { ButtonIncDec } from '../src/components/ButtonIncDec.js';
import { ButtonText } from '../src/components/ButtonText.js';
import { Input } from '../src/components/Input.js';
import { Output } from '../src/components/Output.js';
import { TextLabel } from '../src/components/TextLabel.js';
import { TextField } from '../src/components/TextField.js';
import { TextEdit } from '../src/components/TextEdit.js';
import { LevelShift } from '../src/components/LevelShift.js';
import { LED } from '../src/components/LED.js';
import { PartSelector } from '../src/components/PartSelector.js';
import { SVG } from '../src/components/SVG.js';
import { Line } from '../src/components/Line.js';
import { Graph } from '../src/components/Graph.js';
import { MiniVU } from '../src/components/MiniVU.js';


export const ComponentRegistry = {

    // ─────────────────────────── CONTROLS ───────────────────────────

    Knob: {
        label: 'Knob',
        category: 'controls',
        paletteSize: { width: 24, height: 24 },
        isParametric: true,
        isJack: false,

        create: (opts = {}) => new Knob(
            opts.x ?? 0, opts.y ?? 0,
            opts.size ?? 'medium',
            opts.min ?? 0, opts.max ?? 127,
            opts.defaultValue ?? 64,
            false,
            opts.infoFunc ?? 0
        ),

        serialize: (c) => {
            const out = {
                componentType: 'Knob',
                id: String(c.id),
                x: Math.round(c.relX ?? 0),
                y: Math.round(c.relY ?? 0),
                infoFunc: c.infoFunc ?? 0,
                size: c.sizeParam ?? 'medium',
            };
            if (c.min !== undefined && c.min !== 0) out.min = c.min;
            if (c.max !== undefined && c.max !== 127) out.max = c.max;
            if (c.value !== undefined) out.defaultValue = c.value;
            if (c.mappingTable) out.mappingTable = c.mappingTable;   // ⭐ NEW
            return out;
        },

        deserialize: (d, ctx) => {
            const c = new Knob(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.size ?? 'medium',
                d.min ?? 0, d.max ?? 127,
                d.defaultValue ?? 64,
                false,
                d.infoFunc ?? 0
            );
            c.relX = d.x;
            c.relY = d.y;
            if (d.mappingTable) c.mappingTable = d.mappingTable;   // ⭐ NEW
            return c;
        },

        csoundPorts: () => null,
    },


    Slider: {
        label: 'Slider',
        category: 'controls',
        paletteSize: { width: 14, height: 50 },
        isParametric: true,
        isJack: false,

        create: (opts = {}) => new Slider(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 10, opts.height ?? 60,
            opts.min ?? 0, opts.max ?? 127,
            opts.defaultValue ?? 64
        ),

        serialize: (c) => {
            const out = {
                componentType: 'Slider',
                id: String(c.id),
                x: Math.round(c.relX ?? 0),
                y: Math.round(c.relY ?? 0),
                width: c.width ?? 10,
                height: c.height ?? 60,
                min: c.min ?? 0,
                max: c.max ?? 127,
                defaultValue: c.value ?? 0,
            };
            if (c.mappingTable) out.mappingTable = c.mappingTable;   // ⭐ NEW
            return out;
        },

        deserialize: (d, ctx) => {
            const c = new Slider(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 10, d.height ?? 60,
                d.min ?? 0, d.max ?? 127,
                d.defaultValue ?? 0
            );
            c.relX = d.x;
            c.relY = d.y;
            if (d.mappingTable) c.mappingTable = d.mappingTable;   // ⭐ NEW
            return c;
        },

        csoundPorts: () => null,
    },


    ButtonFlat: {
        // ⚠️ currentIndex НЕ сохраняется (потом решим)
        label: 'Btn',
        category: 'controls',
        paletteSize: { width: 50, height: 16 },
        isParametric: true,
        isJack: false,

        create: (opts = {}) => new ButtonFlat(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 50, opts.height ?? 16,
            opts.labels ?? 'Off,On'
        ),

        serialize: (c) => ({
            componentType: 'ButtonFlat',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 50,
            height: c.height ?? 16,
            labels: Array.isArray(c.positions) ? c.positions : ['Off', 'On'],
        }),

        deserialize: (d, ctx) => {
            const labels = d.labels ?? ['Off', 'On'];
            const c = new ButtonFlat(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 50, d.height ?? 16,
                Array.isArray(labels) ? labels.join(',') : String(labels)
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    ButtonRadio: {
        label: 'Radio',
        category: 'controls',
        paletteSize: { width: 120, height: 16 },
        isParametric: true,
        isJack: false,

        create: (opts = {}) => new ButtonRadio(
            opts.x ?? 0, opts.y ?? 0,
            opts.buttonCount ?? 4,
            opts.buttonWidth ?? 30,
            opts.labels ?? 'One,Two,Three,Four',
            opts.orientation ?? 'horizontal'
        ),

        serialize: (c) => ({
            componentType: 'ButtonRadio',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            buttonCount: c.buttonCount ?? 4,
            buttonWidth: c.buttonWidth ?? 30,
            labels: Array.isArray(c.labels) ? c.labels : ['One', 'Two', 'Three', 'Four'],
            orientation: c.orientation ?? 'horizontal',
        }),

        deserialize: (d, ctx) => {
            const labels = d.labels ?? ['One', 'Two', 'Three', 'Four'];
            const c = new ButtonRadio(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.buttonCount ?? 4,
                d.buttonWidth ?? 30,
                Array.isArray(labels) ? labels.join(',') : String(labels),
                d.orientation ?? 'horizontal'
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    ButtonIncDec: {
        label: 'IncDec',
        category: 'controls',
        paletteSize: { width: 50, height: 16 },
        isParametric: true,
        isJack: false,

        create: (opts = {}) => new ButtonIncDec(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 50,
            opts.items ?? 'One,Two,Three,Four',
            opts.initialIndex ?? 0
        ),

        serialize: (c) => ({
            componentType: 'ButtonIncDec',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 50,
            items: Array.isArray(c.items) ? c.items : ['One', 'Two', 'Three', 'Four'],
            initialIndex: c.currentIndex ?? 0,
        }),

        deserialize: (d, ctx) => {
            const items = d.items ?? ['One', 'Two', 'Three', 'Four'];
            const c = new ButtonIncDec(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 50,
                Array.isArray(items) ? items.join(',') : String(items),
                d.initialIndex ?? 0
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    ButtonText: {
        label: 'Toggle',
        category: 'controls',
        paletteSize: { width: 40, height: 16 },
        isParametric: true,
        isJack: false,

        create: (opts = {}) => new ButtonText(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 40,
            opts.text ?? 'M',
            opts.initialState !== undefined ? opts.initialState : true
        ),

        serialize: (c) => ({
            componentType: 'ButtonText',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 40,
            text: c.text ?? 'M',
            initialState: c.isActive !== undefined ? c.isActive : true,
        }),

        deserialize: (d, ctx) => {
            const c = new ButtonText(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 40,
                d.text ?? 'M',
                d.initialState !== undefined ? d.initialState : true
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    // ──────────────────────────── JACKS ─────────────────────────────

    Input: {
        label: 'In',
        category: 'jacks',
        paletteSize: { width: 14, height: 14 },
        isParametric: false,
        isJack: 'in',

        create: (opts = {}) => {
            const jackType = opts.jackType ?? 'audio';
            const c = new Input(0, 0, {
                type: jackType,
                jackType,
                bandwidth: opts.bandwidth ?? 'dynamic',
                index: opts.ConnectorIndex,
            });
            c._jackType = jackType;
            c._isAudioJack = jackType === 'audio';
            return c;
        },

        serialize: (c) => ({
            componentType: 'Input',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            jackType: c._jackType ?? c.type ?? 'audio',
            bandwidth: 'dynamic',
            ConnectorName: c.label ?? c.ConnectorName ?? 'In',
            ConnectorIndex: c.ConnectorIndex ?? 0,
        }),

        deserialize: (d, ctx) => {
            const jackType = d.jackType ?? 'audio';
            const c = new Input(
                ctx.module.x + d.x, ctx.module.y + d.y,
                { type: jackType, jackType, bandwidth: d.bandwidth ?? 'dynamic' }
            );
            c.relX = d.x;
            c.relY = d.y;
            c._jackType = jackType;
            c._isAudioJack = jackType === 'audio';
            c.ConnectorIndex = d.ConnectorIndex ?? 0;
            c.label = d.ConnectorName ?? (jackType === 'audio' ? 'In' : 'In(C)');
            return c;
        },

        csoundPorts: (c) => ({
            kind: c._jackType ?? c.type ?? 'audio',
            dir: 'in',
        }),
    },


    Output: {
        label: 'Out',
        category: 'jacks',
        paletteSize: { width: 14, height: 14 },
        isParametric: false,
        isJack: 'out',

        create: (opts = {}) => {
            const jackType = opts.jackType ?? 'audio';
            const c = new Output(0, 0, {
                type: jackType,
                jackType,
                bandwidth: opts.bandwidth ?? 'dynamic',
                index: opts.ConnectorIndex,
            });
            c._jackType = jackType;
            c._isAudioJack = jackType === 'audio';
            return c;
        },

        serialize: (c) => ({
            componentType: 'Output',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            jackType: c._jackType ?? c.type ?? 'audio',
            bandwidth: 'dynamic',
            ConnectorName: c.label ?? c.ConnectorName ?? 'Out',
            ConnectorIndex: c.ConnectorIndex ?? 0,
        }),

        deserialize: (d, ctx) => {
            const jackType = d.jackType ?? 'audio';
            const c = new Output(
                ctx.module.x + d.x, ctx.module.y + d.y,
                { type: jackType, jackType, bandwidth: d.bandwidth ?? 'dynamic' }
            );
            c.relX = d.x;
            c.relY = d.y;
            c._jackType = jackType;
            c._isAudioJack = jackType === 'audio';
            c.ConnectorIndex = d.ConnectorIndex ?? 0;
            c.label = d.ConnectorName ?? (jackType === 'audio' ? 'Out' : 'Out(C)');
            return c;
        },

        csoundPorts: (c) => ({
            kind: c._jackType ?? c.type ?? 'audio',
            dir: 'out',
        }),
    },


    // ─────────────────────────── DISPLAY ────────────────────────────

    TextLabel: {
        label: 'Label',
        category: 'display',
        paletteSize: { width: 60, height: 16 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new TextLabel(
            opts.x ?? 0, opts.y ?? 0,
            opts.text ?? 'Label',
            opts.fontSize ?? 10,
            opts.color ?? '#888888',
            opts.align ?? 'left',
            opts.valign ?? 'top'
        ),

        serialize: (c) => ({
            componentType: 'TextLabel',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            text: c.text ?? 'Label',
            fontSize: c.fontSize ?? 10,
            color: c.color ?? '#888888',
        }),

        deserialize: (d, ctx) => {
            const c = new TextLabel(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.text ?? 'Label',
                d.fontSize ?? 10,
                d.color ?? '#888888',
                d.align ?? 'left',
                'top'
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    TextField: {
        label: 'Field',
        category: 'display',
        paletteSize: { width: 50, height: 16 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new TextField(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 50,
            opts.referenceElementId ?? null,
            opts.format ?? 'number',
            opts.tableName ?? null
        ),

        serialize: (c) => ({
            componentType: 'TextField',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 50,
            referenceElementId: c.targetId ?? null,
            format: c.format ?? 'number',
            tableName: c.tableName ?? null,
        }),

        deserialize: (d, ctx) => {
            const c = new TextField(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 50,
                d.referenceElementId ?? null,
                d.format ?? 'number',
                d.tableName ?? null
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    TextEdit: {
        // ⚠️ Рантайм (ModuleFactory) для TextEdit создаёт ButtonText — это баг.
        //    Здесь создаём правильный TextEdit.
        //    initialState (isActive) НЕ сохраняем — потом решим.
        label: 'Edit',
        category: 'display',
        paletteSize: { width: 50, height: 16 },
        isParametric: true,
        isJack: false,

        create: (opts = {}) => new TextEdit(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 50,
            opts.text ?? 'Ch 1',
            false
        ),

        serialize: (c) => ({
            componentType: 'TextEdit',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 50,
            text: c.text ?? '',
        }),

        deserialize: (d, ctx) => {
            const c = new TextEdit(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 50,
                d.text ?? '',
                false
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    LED: {
        label: 'LED',
        category: 'display',
        paletteSize: { width: 16, height: 10 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new LED(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 16, opts.height ?? 10
        ),

        serialize: (c) => {
            const out = {
                componentType: 'LED',
                id: String(c.id),
                x: Math.round(c.relX ?? 0),
                y: Math.round(c.relY ?? 0),
                width: c.width ?? 16,
                height: c.height ?? 10,
            };
            if (c.sourceComponentId !== null && c.sourceComponentId !== undefined) {
                out.sourceComponentId = String(c.sourceComponentId);
            }
            if (c.ledType) out.ledType = c.ledType;
            return out;
        },

        deserialize: (d, ctx) => {
            const c = new LED(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 16, d.height ?? 10
            );
            c.relX = d.x;
            c.relY = d.y;
            if (d.sourceComponentId !== undefined && d.sourceComponentId !== null) {
                c.sourceComponentId = d.sourceComponentId;
            }
            if (d.ledType) c.ledType = d.ledType;
            return c;
        },

        csoundPorts: () => null,
    },


    LevelShift: {
        // ⚠️ Конструктор игнорирует size/width/height, ставит 15×12.
        //    В NM2 идёт в modes[], не в params[] — сейчас не сохраняем.
        label: 'Level',
        category: 'display',
        paletteSize: { width: 15, height: 12 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new LevelShift(
            opts.x ?? 0, opts.y ?? 0,
            opts.size ?? 'small'
        ),

        serialize: (c) => ({
            componentType: 'LevelShift',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 15,
            height: c.height ?? 12,
            size: c.sizeParam ?? 'small',
        }),

        deserialize: (d, ctx) => {
            const c = new LevelShift(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.size ?? 'small'
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    PartSelector: {
        label: 'Select',
        category: 'display',
        paletteSize: { width: 70, height: 16 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new PartSelector(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 70, opts.height ?? 16,
            opts.imageCount ?? 5,
            opts.menuOffset ?? 0,
            opts.menuItems ?? ['Item1', 'Item2', 'Item3', 'Item4', 'Item5']
        ),

        serialize: (c) => ({
            componentType: 'PartSelector',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 70,
            height: c.height ?? 16,
            imageCount: c.imageCount ?? 5,
            menuOffset: c.menuOffset ?? 0,
            menuItems: c.menuItems ?? ['Item1', 'Item2', 'Item3', 'Item4', 'Item5'],
        }),

        deserialize: (d, ctx) => {
            const c = new PartSelector(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 70, d.height ?? 16,
                d.imageCount ?? 5,
                d.menuOffset ?? 0,
                d.menuItems ?? ['Item1', 'Item2', 'Item3', 'Item4', 'Item5']
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    // ─────────────────────────── GRAPHICS ───────────────────────────

    SVG: {
        label: 'SVG',
        category: 'graphics',
        paletteSize: { width: 28, height: 28 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => {
            const svgData = opts.svgSrc ?? ('data:image/svg+xml,' + encodeURIComponent(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#0af" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M8 12h8"/>
                </svg>
            `));
            return new SVG(
                opts.x ?? 0, opts.y ?? 0,
                opts.width ?? 28, opts.height ?? 28,
                svgData,
                opts.color ?? null
            );
        },

        serialize: (c) => ({
            componentType: 'SVG',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 28,
            height: c.height ?? 28,
            svgSrc: c.svgSrc ?? '',
            color: c.color ?? null,
        }),

        deserialize: (d, ctx) => {
            const c = new SVG(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 28, d.height ?? 28,
                d.svgSrc ?? '',
                d.color ?? null
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    Line: {
        // ⚠️ Конструктор называет поле `thickness`, а рантайм (ModuleFactory)
        //    читает/пишет `width`. Согласовано: JSON = width, объект = thickness.
        label: 'Line',
        category: 'graphics',
        paletteSize: { width: 60, height: 2 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new Line(
            opts.x ?? 0, opts.y ?? 0,
            opts.length ?? 60,
            opts.orientation ?? 'Horizontal',
            opts.thickness ?? 1,
            opts.color ?? '#444444'
        ),

        serialize: (c) => ({
            componentType: 'Line',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            length: c.length ?? 60,
            orientation: c.orientation ?? 'Horizontal',
            width: c.thickness ?? 1,
            color: c.color ?? '#444444',
        }),

        deserialize: (d, ctx) => {
            const c = new Line(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.length ?? 60,
                d.orientation ?? 'Horizontal',
                d.width ?? 1,
                d.color ?? '#444444'
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    Graph: {
        label: 'Graph',
        category: 'graphics',
        paletteSize: { width: 60, height: 24 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new Graph(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 60, opts.height ?? 24
        ),

        serialize: (c) => ({
            componentType: 'Graph',
            id: String(c.id),
            x: Math.round(c.relX ?? 0),
            y: Math.round(c.relY ?? 0),
            width: c.width ?? 60,
            height: c.height ?? 24,
        }),

        deserialize: (d, ctx) => {
            const c = new Graph(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 60, d.height ?? 24
            );
            c.relX = d.x;
            c.relY = d.y;
            return c;
        },

        csoundPorts: () => null,
    },


    MiniVU: {
        label: 'VU',
        category: 'graphics',
        paletteSize: { width: 40, height: 24 },
        isParametric: false,
        isJack: false,

        create: (opts = {}) => new MiniVU(
            opts.x ?? 0, opts.y ?? 0,
            opts.width ?? 40, opts.height ?? 24
        ),

        serialize: (c) => {
            const out = {
                componentType: 'MiniVU',
                id: String(c.id),
                x: Math.round(c.relX ?? 0),
                y: Math.round(c.relY ?? 0),
                width: c.width ?? 40,
                height: c.height ?? 24,
            };
            if (c.sourceComponentId !== null && c.sourceComponentId !== undefined) {
                out.sourceComponentId = String(c.sourceComponentId);
            }
            return out;
        },

        deserialize: (d, ctx) => {
            const c = new MiniVU(
                ctx.module.x + d.x, ctx.module.y + d.y,
                d.width ?? 40, d.height ?? 24
            );
            c.relX = d.x;
            c.relY = d.y;
            if (d.sourceComponentId !== undefined && d.sourceComponentId !== null) {
                c.sourceComponentId = d.sourceComponentId;
            }
            return c;
        },

        csoundPorts: () => null,
    },
};


// ═══════════════════════════════════════════════════════════════════
//  ХЕЛПЕРЫ
// ═══════════════════════════════════════════════════════════════════

/**
 * Тип компонента по его классу (constructor.name).
 * Возвращает null, если компонент не зарегистрирован.
 */
export function getTypeOf(component) {
    if (!component) return null;
    const name = component.constructor?.name;
    return ComponentRegistry[name] ? name : null;
}

/**
 * Все зарегистрированные типы в порядке объявления.
 */
export function getAllTypes() {
    return Object.keys(ComponentRegistry);
}

/**
 * Записи реестра, сгруппированные по категориям.
 * Используется для генерации палитры.
 */
export function getByCategory() {
    const out = { controls: [], display: [], jacks: [], graphics: [] };
    for (const [type, def] of Object.entries(ComponentRegistry)) {
        const cat = def.category ?? 'controls';
        if (!out[cat]) out[cat] = [];
        out[cat].push({ type, ...def });
    }
    return out;
}

/**
 * Является ли компонент параметрическим (в params[]).
 */
export function isParametric(component) {
    const t = getTypeOf(component);
    return t ? ComponentRegistry[t].isParametric === true : false;
}

/**
 * Является ли компонент джеком. Возвращает 'in' | 'out' | false.
 */
export function getJackDir(component) {
    const t = getTypeOf(component);
    return t ? (ComponentRegistry[t].isJack || false) : false;
}

/**
 * Создать компонент по типу.
 */
export function createComponent(type, opts = {}) {
    const def = ComponentRegistry[type];
    if (!def) {
        console.warn(`[ComponentRegistry] Unknown type: ${type}`);
        return null;
    }
    return def.create(opts);
}

/**
 * Сериализовать все компоненты (для сохранения модуля).
 * Пропускает _isNewDragging.
 */
export function serializeComponents(components) {
    const out = [];
    for (const c of components) {
        if (c._isNewDragging) continue;
        const t = getTypeOf(c);
        if (!t) {
            console.warn(`[ComponentRegistry] Cannot serialize unknown component:`, c);
            continue;
        }
        out.push(ComponentRegistry[t].serialize(c));
    }
    return out;
}

/**
 * Восстановить компоненты из массива данных.
 * @param {Array} dataArray — components[] из JS-модуля
 * @param {Object} ctx — { module }
 */
export function deserializeComponents(dataArray, ctx) {
    const out = [];
    for (const d of dataArray) {
        const def = ComponentRegistry[d.componentType];
        if (!def) {
            console.warn(`[ComponentRegistry] Unknown componentType: ${d.componentType}`);
            continue;
        }
        const c = def.deserialize(d, ctx);
        if (c) {
            c.id = d.id;
            c.originalID = d.id;
            c.parameterId = parseInt(d.id);
            c.parent = ctx.module;
            c._editorModule = ctx.module;
            c._isNewDragging = false;
            out.push(c);
        }
    }
    return out;
}

/**
 * Собрать ID параметрических компонентов (для params[]).
 * ⚠️ БЕЗ сортировки — порядок = порядок в components[].
 *    См. AI Context.md и scripts/patch_params.py.
 */
export function collectParamIds(components) {
    return components
        .filter(c => !c._isNewDragging)
        .filter(c => isParametric(c))
        .map(c => parseInt(c.id))
        .filter(id => !isNaN(id));
}

/**
 * Собрать входы и выходы (для inputs[] / outputs[]).
 * Порядок — как в components[].
 */
export function collectPorts(components) {
    const inputs = [];
    const outputs = [];

    for (const c of components) {
        if (c._isNewDragging) continue;
        const dir = getJackDir(c);
        if (dir === 'in') inputs.push(parseInt(c.id));
        else if (dir === 'out') outputs.push(parseInt(c.id));
    }

    return { inputs, outputs };
}

/**
 * Пройтись по компоненту и вернуть Csound-порт (если есть).
 * Используется в CodeViewerWindow для генерации opcode-строк.
 */
export function getCsoundPorts(component) {
    const t = getTypeOf(component);
    if (!t) return null;
    const def = ComponentRegistry[t];
    return typeof def.csoundPorts === 'function' ? def.csoundPorts(component) : null;
}