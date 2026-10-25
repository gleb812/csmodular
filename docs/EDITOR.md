
# Module Editor

The **Module Editor** is a separate HTML entry point (`editor.html`) used to
design custom modules visually. It runs in a browser tab (web) or in its own
native window (Tauri).

This document describes the editor's architecture, panel layout, component
registry, terminal DSL, and code generation.

---

## Overview

The editor is **IDE-style**: a fixed dock layout with four panels plus a
toolbar. There are **no floating windows**. Panels are resizable via splitters
and their sizes persist in `localStorage`.

```
┌───────────────────────────────────────────────────────────┐
│ toolbar: [New] [Load] [Save]  |  Layout: [Default] [Code] │
├───────────────────────────┬───────────────────────────────┤
│                           │                               │
│   Canvas (module)         │   Csound Code                 │
│                           │   (opcode editor)             │
│                           │                               │
├───────────────────────────┼───────────────────────────────┤
│                           │                               │
│   Properties              │   Terminal                    │
│   (Module / Component)    │   (command language)          │
│                           │                               │
└───────────────────────────┴───────────────────────────────┘
```

### Panel purposes

| Panel | Purpose |
|-------|---------|
| **Canvas** | Visual module layout. Drag components, resize module, right-click for context menu. |
| **Properties** | Two tabs: **Module** (name, height, color) and **Component** (schema-driven). |
| **Csound Code** | Live-generated `opcode` code, syntax-highlighted, editable. |
| **Terminal** | Command DSL for fast module editing (add, del, mv, align, ...). |

### Layout presets

Three built-in presets, switchable from the toolbar:

- **Default** — balanced (65% left column).
- **Code** — code-focused (45% left, taller code panel).
- **Canvas** — canvas-focused (85% left, taller canvas).

Preset and splitter sizes persist in `csmodular:editor-layout`.

---

## File structure

```
editor/
├── editor.html                    # Entry point
├── editor.js                      # Bootstrap: builds dock, wires panels
├── EditorApp.js                   # Main controller (canvas, events, animation)
├── EditorPanel.js                 # The module panel on canvas
├── ComponentRegistry.js           # Single source of truth for components
├── CodeViewerWindow.js            # Csound code editor
├── ModulePropertiesWindow.js      # Headless (legacy) — save API
├── ComponentPropertiesWindow.js   # Headless (legacy) — mapping browser
└── ui/
    ├── DockLayout.js              # Split-pane container with presets
    ├── Toolbar.js                 # New / Load / Save + layout presets
    ├── PropertiesPanel.js         # Module / Component tabs
    ├── TerminalPanel.js           # Command terminal
    ├── ContextMenu.js             # Generic context menu (with submenus)
    └── ModuleContextMenu.js       # Editor-specific menu builder
```

### Legacy files

`ModulePropertiesWindow.js` and `ComponentPropertiesWindow.js` still exist,
but **do not render** — their DOM is detached from `document.body` in the
editor bootstrap. They are kept for two APIs:

- `ModulePropertiesWindow.saveModule()` — full save (collect data, generate
  JS code, call `moduleStore.save`).
- `ComponentPropertiesWindow._showMappingBrowser()` — the mapping table
  browser used by the `PropertiesPanel` mapping-select field.

**Plan**: replace both with a `saveService` and a `MappingBrowser` modal,
then delete these files.

---

## Bootstrap flow

`editor.html` → `editor.js`:

```js
import { DockLayout } from './ui/DockLayout.js';
import { Toolbar } from './ui/Toolbar.js';
import { PropertiesPanel } from './ui/PropertiesPanel.js';
import { TerminalPanel } from './ui/TerminalPanel.js';
import { EditorApp } from './EditorApp.js';

const root = document.getElementById('app');
const layout = new DockLayout({ root });

// Canvas + app
const canvas = document.createElement('canvas');
canvas.id = 'editorCanvas';
const app = new EditorApp(canvas);

// Toolbar
const toolbar = new Toolbar({ app, layout });
layout.mount('toolbar', toolbar.element);

// Canvas → left top
layout.mount('leftTop', canvas);
app.setupCanvas();     // must be after mount, so parentElement exists

// Code Viewer → right top
layout.mount('rightTop', app.codeViewerWindow.windowElement);
app.codeViewerWindow.show();

// Properties → left bottom
const propertiesPanel = new PropertiesPanel(app);
app.propertiesPanel = propertiesPanel;
layout.mount('leftBottom', propertiesPanel.element);

// Terminal → right bottom
const terminal = new TerminalPanel(app);
app.terminalPanel = terminal;
layout.mount('rightBottom', terminal.element);
```

**Important**: `EditorApp` is constructed **before** panels are mounted. Its
constructor creates:
- `module` (`EditorPanel` instance, initially empty)
- `components[]` (empty array)
- `codeViewerWindow`, `propertiesWindow`, `componentPropertiesWindow`

Panel DOM is inserted into the dock slots **after** `EditorApp` is ready.

---

## DockLayout

`editor/ui/DockLayout.js` manages the four-panel grid. It has:

- **Slots**: `leftTop`, `leftBottom`, `rightTop`, `rightBottom`, `toolbar`
- **Splitters**: one vertical (between columns), one horizontal in each column
- **Sizes** (fractions of total): `leftWidth`, `leftTopHeight`, `rightTopHeight`
- **Persist**: `localStorage` key `csmodular:editor-layout`

### API

```js
layout.mount('leftTop', element);        // inject panel DOM into slot
layout.setPreset('default');             // 'default' | 'code-focus' | 'canvas-focus'
layout.getSizes();                       // → { leftWidth, leftTopHeight, rightTopHeight }
```

### Replacing with a real docking framework

The layout is intentionally minimal. If we ever need drag-to-dock, tabs
everywhere, or arbitrary splits, we can swap `DockLayout` for `dockview` or
`Golden Layout` **without touching panel code** — panels are just DOM
elements mounted into slots.

---

## ComponentRegistry — single source of truth

`editor/ComponentRegistry.js` describes every component type **once**:

```js
Knob: {
    label: 'Knob',                    // short label for menus
    category: 'controls',             // 'controls' | 'display' | 'jacks' | 'graphics'
    paletteSize: { width: 24, height: 24 },
    isParametric: true,               // goes into module.params[]
    isJack: false,                    // or 'in' / 'out'

    create(opts),                     // factory: creates an instance
    serialize(comp),                  // → plain object for JS module
    deserialize(data, ctx),           // ← instance from JS module
    csoundPorts(comp),                // → { kind, dir } | null
}
```

### Component categories

| Category | Types |
|---|---|
| `controls` | Knob, Slider, ButtonFlat, ButtonRadio, ButtonIncDec, ButtonText |
| `display`  | TextLabel, TextField, TextEdit, LED, LevelShift, PartSelector |
| `jacks`    | Input, Output |
| `graphics` | SVG, Line, Graph, MiniVU |

### Serialization contract

The format matches `src/ModuleFactory.js` — the runtime module loader:

- `components[].x`, `components[].y` — **relative to module top-left**
- `components[].id` — string, unique within module
- `params[]` — IDs of parametric components, **in order of appearance in
  `components[]`** (do NOT sort)
- `inputs[]` / `outputs[]` — IDs of jack components, in order

### Known runtime quirks (preserved in registry)

Some runtime behaviours differ from the editor; the registry keeps the
editor's correct behaviour without mimicking runtime bugs:

| Component | Runtime quirk | Editor behaviour |
|---|---|---|
| `TextEdit` | `ModuleFactory` creates a `ButtonText` for a `TextEdit` entry (bug) | Creates correct `TextEdit` |
| `LevelShift` | Constructor ignores `width` / `height`, hardcodes 15×12 | Same (size param only) |
| `Line` | JSON field is `width`, constructor param is `thickness` | Serialize writes `width`, deserialize reads `width` → `thickness` |

### Adding a new component

1. Add one entry to `ComponentRegistry.js`.
2. Done. It appears in:
   - Context menu (auto from `getByCategory()`)
   - Terminal aliases (add to `TYPE_ALIASES` in `TerminalPanel.js`)
   - Serialization / deserialization
   - Csound port detection
   - `params[]` collection

No other file needs editing.

---

## Canvas interaction

### Adding components

**Right-click on canvas** → context menu → **Add Component** → submenu by
category. The component is placed at the click point (centred).

For **jacks** (`Input` / `Output`), two entries are shown per type:
`Input (audio)` and `Input (control)`. All other components appear once.

### Selecting components

**Left-click** on a component → selects it, switches Properties tab to
**Component**. Drag starts immediately (move on drag).

**Left-click** on empty canvas → deselects.

### Context menu on component

**Right-click** on a component → `Properties` / `Delete`.

### Resizing module

Module has a **resize handle** in the bottom-right corner. Drag to change
`gridHeight` (width is always 1). Properties panel updates live.

### Zoom & pan

- `Ctrl + wheel` / `+` / `-` — zoom (around cursor)
- `0` — reset zoom (**only when focus is on canvas**, not in inputs)
- Middle mouse button — pan

### Important: keyboard shortcut rule

Global key handlers **must skip** when `e.target` is `<input>`, `<textarea>`,
or `contentEditable`. Otherwise typing `0` in a numeric field triggers
`resetZoom()` and the digit never appears.

See `EditorApp.setupEvents()` — the guard is:

```js
const isEditable = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable;
if (isEditable) return;
```

---

## Properties panel

`editor/ui/PropertiesPanel.js` — a two-tab panel.

### Module tab

- **Name** — text field, sanitized to Csound-safe identifier
- **Height** — grid cells (1..20)
- **Panel Color** — 12 preset buttons + `↺ Default` + hex input

### Component tab

Rendered from `static getPropertySchema()` on the component's class.
Supported field types:

| Type | UI |
|---|---|
| `select` | dropdown |
| `number` | numeric input (min/max/step) |
| `text` | free text |
| `mapping-select` | custom field with `🔍` browser button |
| `checkbox` | toggle |

**Example** — `Knob.getPropertySchema()` returns:

```js
[{
    key: 'mappingTable',
    label: 'Mapping Table',
    type: 'mapping-select',
    optionsFrom: 'mappingTables',
    help: 'Value mapping table (0..127 → real value). Optional.',
}]
```

### `optionsFrom` values

- `'mappingTables'` — all names in `MappingTables`
- `'ioComponents'` — all Input/Output components in the current module
- (nothing) — fall back to `propDef.options` array

### Mapping browser

The `🔍` button opens `ComponentPropertiesWindow._showMappingBrowser()` — a
modal with search (min 2 chars), scrollable list, click to bind. This is one
of the two reasons `ComponentPropertiesWindow` still exists.

---

## Csound Code panel

`editor/CodeViewerWindow.js` — displays live-generated `opcode` code.

### Layout

```
┌──────────────────────────────────────────────────────┐
│ 🎵 Csound Code   [A][A] 12px ● Saved ⟳ 📋 # 🎨       │
├──────────────────────────────────────────────────────┤
│  1 │ ;@ map LEVfrq                                   │
│  2 │ opcode MyMod, 0, kkkk                           │
│  3 │ kKnob1, kKnob2, kIn1, kOut1 xin                 │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

- **Line numbers** — checkbox `#` on the right of the header
- **Syntax highlight** — checkbox 🎨
- **Font size** — `[A]` smaller / `[A]` larger
- **Status** — `● Saved` / `● Modified` / `⚠ Error`
- **⟳** — resync from module (discard edits)
- **📋** — copy to clipboard

### Syntax highlight method

Overlay approach — a transparent `<textarea>` on top of a highlighted `<div>`:

```html
<div id="code-highlight-layer" style="pointer-events: none;">...</div>
<textarea id="code-editor" style="color: transparent; caret-color: #8f8;"></textarea>
```

Both scroll in sync via `_syncScroll()`. Clicks and typing go to the
textarea (higher z-index).

**Highlight rules** (single regex pass in `_highlightCsound()`):

| Token | Color |
|---|---|
| `;@ map ...` | pink bold |
| `;...` comment | grey italic |
| `opcode` / `endop` / `instr` / `xin` / `init` / `ftgen` / ... | blue bold |
| numbers | yellow |
| strings `"..."` | light blue |
| variables `kFoo`, `aFoo`, `giFoo`, ... | lavender |

**Important**: highlight is a single regex pass with alternatives. Do NOT
chain `.replace()` calls — the second replace would match inside the HTML
tags injected by the first one.

### Code generation

`generateCsoundCode()` walks all components and produces:

```csound
;@ map TABLE1 TABLE2                ; if any component has mappingTable
opcode ModuleName, 0, kkkk
kKnob1, kButton1, kIn1, kOut1 xin   ; allParams

    ; --- mapping tables ---
    kKnob1 table kKnob1, giTABLE1
    ; ----------------------

aIn1 zar kIn1                       ; audio inputs
kIn2 zkr kIn2                       ; control inputs
aOut1 init 0                        ; audio outputs
kOut2 init 0                        ; control outputs

; --- module body ---
; Add your DSP code here

zaw aOut1, kOut1                    ; audio outputs write
zkw kOut2, kOut2                    ; control outputs write
endop
```

**Parameter naming**:

| Component | Variable pattern |
|---|---|
| Knob | `kKnob1`, `kKnob2`, ... |
| Slider | `kSlider1`, ... |
| Button (all) | `kButton1`, ... |
| TextEdit | `kText1`, ... |
| LevelShift | `kLevel1`, ... |
| Input (audio) | `kIn1` |
| Input (control) | `kIn1` |
| Output (audio) | `kOut1` |
| Output (control) | `kOut1` |

**Counters are per-type**, shared across audio/control for jacks (first
audio and first control jack both get `kIn1` — this matches the runtime's
numbering).

### Save behavior

- **Auto-save** 60s after last edit (via `setTimeout`)
- **Ctrl+S** — immediate save
- Saved to `app.module._userCsoundCode`
- **Not saved on window close** — auto-save only; if you close the tab
  within 60s of the last edit, the code is lost

### Dirty state

If `isDirty` — automatic updates (from `updateCode()`) are **skipped**.
Only `syncFromModule()` (⟳ button) overwrites user edits.

---

## Terminal

`editor/ui/TerminalPanel.js` — command line for fast module editing.

### Command reference

| Command | Description |
|---|---|
| `add <type> [x y]` | Add component (auto-place or at x,y) |
| `in` / `out` | Shorthand for `add input` / `add output` |
| `ls [type] [-l]` | List components (optionally verbose) |
| `del <id\|type\|range>...` | Delete (see examples below) |
| `mv <id> <x> <y>` | Move (absolute) |
| `mv <id> +dx +dy` | Move (relative) |
| `map <id> <table>` | Bind mapping table |
| `map <id>` | Unbind mapping table |
| `align <ids...> l\|r\|u\|d` | Align left / right / up / down |
| `distr <ids...> h\|v` | Distribute evenly, horizontal / vertical |
| `grid` | Show current grid state |
| `grid on\|off` | Toggle micro-grid |
| `grid <N>` | Set step to N pixels |
| `new` | Clear module |
| `save [as <name>]` | Save module |
| `load [<name>]` | Load (no arg — list available) |
| `stats` | Module statistics |
| `clear` | Clear output |
| `help [cmd]` | Help |

### Type aliases

```
knob, k               → Knob
slider, s, sl         → Slider
button, btn           → ButtonFlat
radio                 → ButtonRadio
incdec                → ButtonIncDec
toggle                → ButtonText
label                 → TextLabel
field                 → TextField
edit                  → TextEdit
level                 → LevelShift
led                   → LED
select                → PartSelector
svg                   → SVG
line                  → Line
graph                 → Graph
vu                    → MiniVU
input, in             → Input
output, out           → Output
```

### `del` examples

```
del 3                 delete component with id=3
del knob              delete all Knobs
del 3 4 5             delete ids 3, 4, 5
del 3..7              delete ids 3, 4, 5, 6, 7
del knob button       delete all Knobs and Buttons
```

### Collision rules

- **`add <type>` without coords** — scans a 5px grid for the first free spot
  (top-left to bottom-right). If none — error.
- **`add <type> x y`** — checks bounds and collisions. If collides — error.
- **`mv <id> x y`** — same checks. On collision — error, no move.
- **`mv <id> +dx +dy`** — same checks against new position.

### Command history

- `↑` — previous command
- `↓` — next command
- History kept per session (not persisted)

### Output

- **Errors** — red, prefixed `✗`
- **Success** — green, prefixed `✓`
- **Info** — blue
- **Echo** — grey

### Save / load from terminal

`save` uses `moduleStore.save()`. It generates JS code inline (duplicates
`ModulePropertiesWindow.generateModuleCode` — should be unified into a
`saveService`).

`load <name>` parses the stored JS with the same regex used by
`EditorUIManager._parseModuleCode`:

```js
/export\s+const\s+\w+\s*=\s*(\{[\s\S]*\});?\s*$/m
```

Then calls `app.restoreModuleFromData(moduleData, dsp_code)`.

---

## Module save / load

### Save

Triggered from:
- **Toolbar `💾 Save`** — calls `app.propertiesWindow.saveModule()`
- **Terminal `save`** — inline generation in `TerminalPanel._cmdSave`

Both eventually call `moduleStore.save(name, jsCode, dspCode)`.

`jsCode` is:

```js
export const NameModule = {
    type: 'Name',
    typeID: 999,
    defaultParams: [],
    displayName: 'Name',
    gridHeight: N,
    originalName: 'Name',
    tooltip: 'Name',
    customColor: '#2a2a2a' | null,
    params: [...],
    inputs: [...],
    outputs: [...],
    components: [...]
};
```

`dspCode` is either:
- `app.module._userCsoundCode` (if the user edited the code), or
- `app.codeViewerWindow.generateCsoundCode()` (fresh)

### Load

Load dialog:
- **Toolbar `📂 Load`** → `uiManager.showLoadDialog()`
- **Terminal `load`** → lists names, `load <name>` loads

Both parse JS with the regex above and call
`restoreModuleFromData(moduleData, dspCode)`.

`restoreModuleFromData`:
1. Clears `components[]`, resets `_nextComponentId`
2. Resizes module from `gridHeight`
3. Deserializes all components via `ComponentRegistry.deserializeComponents`
4. Centers module on canvas
5. Loads DSP into `app.module._userCsoundCode` and Code Viewer

### Storage backends

- **Web** — `localStorage`
  - `csmodular:user_modules` — JSON array of names
  - `csmodular:user_module:<name>` — JSON `{ code, dsp_code }`
- **Tauri** — filesystem
  - `~/Documents/CsModular/modules/user/<name>.js`
  - `~/Documents/CsModular/csound/modules/user/<name>.txt`

The `moduleStore` singleton (`src/api/index.js`) picks the backend lazily
via `isTauri()` check.

---

## Keyboard shortcuts (editor)

| Shortcut | Action |
|---|---|
| `Ctrl + wheel` / `+` / `-` | Zoom canvas |
| `0` | Reset zoom (only when canvas has focus) |
| `Escape` | Cancel current drag |
| `Delete` | Delete selected component |
| `Right click` on canvas | Context menu (Add / Rename) |
| `Right click` on component | Context menu (Properties / Delete) |
| `Ctrl + S` (in code editor) | Save Csound code |
| `↑` / `↓` (in terminal) | Command history |
| `Tab` (in code editor) | Insert 4 spaces |

---

## Architecture notes

### Why not floating windows?

Earlier versions used 5 independent floating panels with a shared
`makeDraggable` pattern. Problems:

- Overlapping windows, no docking
- No persistence of position
- Hard to see code + canvas + properties at once
- 4 copies of drag logic

The dock layout solves all of this with ~250 lines of code and no
dependencies.

### Why a registry instead of per-file `if/else`?

Before `ComponentRegistry.js`, component handling was scattered across:

- `ModulePropertiesWindow.collectModuleData()` — serialize
- `EditorApp._createComponentFromData()` — deserialize
- `CodeViewerWindow.generateCsoundCode()` — Csound ports
- `EditorUIManager.createUIContainer()` — palette
- `EditorApp.startDraggingNewComponent()` — creation

Adding a component type meant editing **5 files**. Now it's **1 line** in
the registry.

### Why the terminal?

The canvas is good for spatial editing, but:

- Bulk operations (align 5 knobs) are tedious
- Precise positions require pixel-perfect dragging
- Power users want text

The terminal gives a **scriptable interface** without forcing a heavy
form UI on everyone.

### Why no CodeMirror yet?

CodeMirror would be a step up (proper undo, search, autocomplete,
folding). But:

- It's ~80KB (CM5) or ~200KB (CM6)
- Adds a global (`window.CodeMirror`) or complex ES-module integration
- Current overlay approach works for typical module sizes

**Plan**: switch to CodeMirror 5 when code complexity justifies it
(modules > 100 lines, or when search/replace is requested).

---

## Development rules

1. **Panel components should mount cleanly.** A panel exposes
   `this.element` (root DOM) and does not assume where it's mounted.
   No `position: fixed`, no `document.body.appendChild` from panel code.

2. **Global key handlers must check `isEditable`.** See
   `EditorApp.setupEvents()`.

3. **Component serialization goes through `ComponentRegistry`.** Never
   hand-roll `if (comp.constructor.name === ...)` in editor code.

4. **`params[]` order = order in `components[]`.** Never sort.

5. **Highlight uses a single regex pass.** Do not chain `.replace()` calls
   in `_highlightCsound()`.

6. **`TerminalPanel` should use `ComponentRegistry` for component lookup.**
   `TYPE_ALIASES` is the only place where lowercase names → `ClassName`.

7. **`DockLayout` is the only place where panel positioning lives.** Panels
   must not manipulate their own top/left/width/height.

8. **Adding a new panel**:
   - Create `editor/ui/MyPanel.js` with `this.element`
   - Mount via `layout.mount('slotName', panel.element)` in `editor.js`
   - If the panel needs to persist size — handled by `DockLayout` sizes,
     not the panel itself.

---

## Known issues

- `TerminalPanel._cmdSave` duplicates `ModulePropertiesWindow.generateModuleCode`
- `TerminalPanel` always uses `audio` jack type for `Input` / `Output`
- `ModulePropertiesWindow` and `ComponentPropertiesWindow` are headless
  — should be deleted once `PropertiesPanel` covers all cases
- Code Viewer has no proper undo/redo (browser-default for `<textarea>`)
- `DockLayout` has no collapse, no tabs (only Properties has tabs)
- Code Viewer does not virtualize highlight — may lag on very large code
- `add in c` / `add out c` not supported yet (control jacks only via context menu)
- Terminal has no autocomplete

## Roadmap

Short-term:
- Remove `Change Color` from context menu
- Terminal: autocomplete, `!!`, `history`
- Terminal: `add in c` / `out c` for control jacks
- Unify save service (one place, used by Toolbar / Terminal / Properties)

Mid-term:
- CodeMirror 5 or 6 in Code Viewer
- Collapse panels in `DockLayout`
- Editor undo/redo (separate from main app)
- Snapshot / restore in terminal

Long-term:
- Component grouping (visual)
- Live preview (`preview` command — send UDO to main app)
- Macro recording in terminal
- Multi-select in Properties (edit N components at once)
