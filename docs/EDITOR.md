
# Module Editor

The **Module Editor** is a separate HTML entry point (`editor.html`) used to
design custom modules visually. It runs in a browser tab (web) or in its own
native window (Tauri).

This document describes the editor's architecture, panel layout, component
registry, terminal DSL, code generation, and the protected code structure.

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
| **Csound Code** | Live-generated `opcode` code with protected structure, syntax-highlighted. |
| **Terminal** | Command DSL for fast module editing (add, del, mv, align, set, ...). |

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
├── CodeViewerWindow.js            # Csound code editor (protected structure)
├── ModulePropertiesWindow.js      # Headless (legacy) — save API
├── ComponentPropertiesWindow.js   # Headless (legacy) — mapping browser
└── ui/
    ├── DockLayout.js              # Split-pane container with presets
    ├── Toolbar.js                 # New / Load / Save + layout presets
    ├── PropertiesPanel.js         # Module / Component tabs
    ├── TerminalPanel.js           # Command terminal
    ├── Toast.js                   # Notifications (replaces uiManager stub)
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

**`mappingTable` is serialized and deserialized for `Knob` and `Slider`.**
If you add another parametric component with mapping support, add it to both
`serialize` and `deserialize` — otherwise round-trip load/save loses it.
Old saved modules (pre-fix) do not contain `mappingTable` — re-assign and
re-save.

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
   - Terminal aliases (add to `TYPE_ALIASES` / `JACK_TYPE_ALIASES` in `TerminalPanel.js`)
   - Serialization / deserialization
   - Csound port detection
   - `params[]` collection

No other file needs editing.

---

## Canvas interaction

### Adding components

**Right-click on canvas** → context menu → **Add Component** → submenu by
category. The component is placed at the click point (centred) and clamped
to module bounds.

For **jacks** (`Input` / `Output`), two entries are shown per type:
`Input (audio)` and `Input (control)`. All other components appear once.

### Selecting components

**Left-click** on a component → selects it, switches Properties tab to
**Component**. Drag starts immediately (move on drag).

**Left-click** on empty canvas → deselects.

### Context menu on component

**Right-click** on a component → `Properties` / `Delete`.

### Renaming module

Three paths, all now call `codeViewerWindow.updateCode()` and re-render
Properties if the Module tab is active:

- **Double-click on module** (canvas) → `prompt()`
- **Right-click → Rename Module** (context menu)
- **Properties → Module tab → Name field** (Enter or blur)
- **Terminal → `name <newName>`**

Sanitization: strip spaces, prefix `M` if starting with digit, remove
non-`[a-zA-Z0-9_]`. Empty result → `NewModule`.

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

- **Name** — text field, sanitized to Csound-safe identifier. Enter triggers
  `blur` → `change`. On change: `module.title` updated, `codeViewerWindow.updateCode()`
  called (regenerates the `opcode` line, body preserved).
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
| `list` | comma-separated input → array |
| `checkbox` | toggle |
| `mapping-select` | custom field with `🔍` browser button |

Each field supports an optional `afterChange(comp, value)` callback
(clamp indices, rebuild labels, update `width` for `ButtonRadio`, etc.).

**Current schemas:**

| Component | Fields |
|---|---|
| `Knob` | `mappingTable` (`mapping-select`) |
| `Slider` | `mappingTable` (`mapping-select`) |
| `TextLabel` | `text`, `fontSize` (`number`), `color` (`text`) |
| `ButtonFlat` | `positions` (`list`), `currentIndex` (`number`) |
| `ButtonRadio` | `labels` (`list`), `buttonCount` (`number`), `selectedIndex` (`number`) |
| `ButtonIncDec` | `items` (`list`), `currentIndex` (`number`) |
| `ButtonText` | `text`, `isActive` (`checkbox`) |

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
│ 🎵 Csound Code   [A][A] 12px ● Saved ⟳ 📋 # 🎨    🔒 │
├──────────────────────────────────────────────────────┤
│  1 │ ;@ map LEVfrq                                   │ 🔒
│  2 │ opcode MyMod, 0, kkkk                           │ 🔒
│  3 │ kKnob1, kKnob2, kIn1, kOut1 xin                 │ 🔒
│  4 │                                                 │
│  5 │ aIn1 zar kIn1                                   │ 🔒
│  6 │ aOut1 init 0                                    │ 🔒
│  7 │                                                 │
│  8 │ ; --- module body ---                           │
│  9 │ ; Add your DSP code here                        │
│ 10 │                                                 │
│ 11 │ zaw aOut1, kOut1                                │ 🔒
│ 12 │ endop                                           │ 🔒
└──────────────────────────────────────────────────────┘
```

- **Line numbers** — checkbox `#` on the right of the header
- **Syntax highlight** — checkbox 🎨
- **Font size** — `[A]` smaller / `[A]` larger
- **Status** — `● Saved` / `● Modified` / `🔒 protected` / `🚫 forbidden`
- **⟳** — resync from module (reset structure **and** body to model)
- **📋** — copy to clipboard
- **Right gutter** — 🔒 for protected lines, synced scroll

### Protected code structure

The code is split into three zones by `generateCsoundCode()`:

- **Header (🔒 protected)** — `;@ map`, `opcode`, `xin`, mapping table lines
- **Body (editable)** — user DSP code, between input-jack block and output-jack block
- **Footer (🔒 protected)** — `zar` / `zkr` / `init` lines, `zaw` / `zkw` lines, `endop`

**Rules:**

- Protected lines are **regenerated from the module model** on any change:
  add/remove component, rename module, mapping change. The body is preserved.
- The cursor cannot enter protected lines (`_clampCursorToEditable` on
  `selectionchange` / `click` / `keyup` / `select`). `beforeinput` blocks
  destructive edits that would touch the boundaries.
- **Enter in the body** inserts new lines; the footer shifts down.
  **Backspace at the start of the body** stops at the upper boundary.
- Structural keywords (`zar`, `zkr`, `zaw`, `zkw`, `xin`, `opcode`, `endop`)
  are **forbidden inside the body**:
  - `beforeinput` blocks `insertText` / `insertFromPaste` / `insertFromDrop`
    when the resulting body would contain one of these tokens (not just the
    inserted text — the hypothetical body is checked).
  - `onEditorInput` checks again as a fallback, reverts the body to
    `_lastValidBody`.
  - Leftover keywords (e.g. from older modules) are highlighted with a red
    background in the body.
- `_structureCache` holds `bodyStart`, `bodyEnd`, `protectedLineIndices`,
  `bodyStartLine`, `bodyEndLine`. `onEditorInput` **always** rebuilds it from
  the current `editor.value` via `_rebuildStructureFromCurrent()` before
  comparing — index shifts after body edits do not corrupt the model.
- `updateCode()` (called on component/mapping/model changes) replaces only
  protected ranges with the reference, keeps the body from the current
  `editor.value`. Cursor position is preserved relative to the new
  `bodyStart`.
- `syncFromModule()` (⟳) **resets everything** to the model — body becomes
  the `; Add your DSP code here` placeholder. Used to discard user edits.

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
| protected line (whole line) | `#7a8a9a` (muted) |
| forbidden keyword in body | red background |

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

`isDirty` now only tracks **body edits** — `updateCode()` is **not** skipped
when dirty; it always replaces protected ranges and preserves the body.
`⟳` (`syncFromModule`) resets everything, including the body.

---

## Terminal

`editor/ui/TerminalPanel.js` — command line for fast module editing.

### Command reference

| Command | Description |
|---|---|
| `add <type> [x y]` | Add component. Without args — prints full list by category |
| `add label <text> [x y]` | Add `TextLabel` with text |
| `add <buttonflat\|radio\|incdec> <a,b,c> [x y]` | Multi-position button with labels |
| `ina` / `ink` / `outa` / `outk` [x y] | Add audio/control Input or Output |
| `in` / `out` | Shorthand for `ina` / `outa` (audio) |
| `ls [type] [-l]` | List components (verbose shows `text`, `items`/`labels`/`positions`, `mappingTable`, `jackType`) |
| `del <id\|type\|range>...` | Delete (see examples below) |
| `mv <id> <x> <y>` | Move (absolute) |
| `mv <id> +dx +dy` | Move (relative) |
| `set <id> <prop> <value>` | Set component property (see below) |
| `map <id> <table>` | Bind mapping table — shorthand for `set <id> mappingTable <table>` |
| `map <id>` | Unbind mapping table |
| `align <ids...> l\|r\|u\|d` | Align left / right / up / down |
| `distr <ids...> h\|v` | Distribute evenly, horizontal / vertical |
| `grid` | Show current grid state |
| `grid on\|off` | Toggle micro-grid |
| `grid <N>` | Set step to N pixels |
| `new [name]` | Clear module (optionally set name) and reset DSP code |
| `name <newName>` | Rename module (same as `new` name argument, but without clearing) |
| `save [as <name>]` | Save module |
| `load [<name>]` | Load (no arg — list available) |
| `stats` | Module statistics |
| `clear` | Clear output |
| `help [cmd]` | Help |

### `set` supported properties

| Property | Applies to | Notes |
|---|---|---|
| `text` (aliases `label`, `value`, `content`) | `TextLabel`, `ButtonText`, `TextEdit` | Free text |
| `items` / `labels` / `positions` (alias `list`) | `ButtonIncDec` / `ButtonRadio` / `ButtonFlat` | Comma-separated |
| `count` | `ButtonRadio` | 1..16, rebuilds labels and `width` |
| `default` | `ButtonFlat`, `ButtonRadio`, `ButtonIncDec` (index), `ButtonText` (bool) | Default index / state |
| `item` | `ButtonIncDec` | Replaces current item |
| `fontSize` (alias `size`) | `TextLabel` | 4..72 |
| `color` (alias `colour`) | `TextLabel`, `ButtonText` | `#rgb` / `#rrggbb` |
| `mappingTable` (aliases `mapping`, `table`) | `Knob`, `Slider` | Empty / `null` unsets |
| `min` / `max` / `defaultValue` | `Knob`, `Slider` | Numeric |
| `jackType` (alias `jack`) | `Input`, `Output` | `audio` / `control` |

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
input, in             → Input (audio)
output, out           → Output (audio)
ina                   → Input (audio)
ink                   → Input (control)
outa                  → Output (audio)
outk                  → Output (control)
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

⚠️ **`load` must not call `syncFromModule()`** after `restoreModuleFromData`
— that would wipe the loaded DSP body and reset it to the placeholder.

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
- `app.codeViewerWindow.getCode()` (live content of the editor)

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
   (includes `mappingTable` for `Knob` / `Slider`)
4. Centers module on canvas
5. Loads DSP into `app.module._userCsoundCode` and Code Viewer:
   - `cv.editor.value = dspCode`
   - `cv._lastValidBody = null`
   - `cv._rebuildStructure()` (reference from model)
   - `cv._rebuildStructureFromCurrent()` (cache from actual `editor.value`)
   - `cv._updateGutter()` / `cv._updateHighlight()`
   - **Not** `syncFromModule()` — it would wipe the loaded body

### Storage backends

- **Web** — `localStorage`
  - `csmodular:user_modules` — JSON array of names
  - `csmodular:user_module:<name>` — JSON `{ code, dsp_code }`
- **Tauri** — filesystem
  - `~/Documents/CsModular/modules/user/<name>.js`
  - `~/Documents/CsModular/csound/modules/user/<name>.txt`

The `moduleStore` singleton (`src/api/index.js`) picks the backend lazily
via `isTauri()` check.

### Round-trip guarantees

Load → Save → Load preserves:

- `mappingTable` on `Knob` / `Slider`
- Multi-position labels on `ButtonFlat` / `ButtonRadio` / `ButtonIncDec`
- Default index/state on all button-like components
- `TextLabel` text, font size, color
- The DSP body (protected structure is rebuilt around it)

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

### Why protected structure in Code Viewer?

Because the `opcode` / `xin` / `zar` / `zaw` / `endop` lines are
**determined by the module model** (which components exist, their order,
their jack types). Letting the user edit them by hand leads to silent
breakage:

- Removing a `zaw` line leaves an output permanently dead.
- Adding a manual `zaw` to a different bus confuses `CsoundGenerator`.
- Reordering `xin` desyncs `params[]` from the runtime.

The editor regenerates these lines from the model and locks them. The user
only owns the **body** — the DSP code between the input-jack block and the
output-jack block. This is where all creative work happens.

Structural keywords are forbidden in the body for the same reason: writing
`zaw` by hand would duplicate the auto-generated one (or target a
different bus), and there is no way to detect intent reliably.

### Why no CodeMirror yet?

CodeMirror would be a step up (proper undo, search, autocomplete,
folding). But:

- It's ~80KB (CM5) or ~200KB (CM6)
- Adds a global (`window.CodeMirror`) or complex ES-module integration
- Current overlay approach works for typical module sizes

**Plan**: switch to CodeMirror 5 when code complexity justifies it
(modules > 100 lines, or when search/replace is requested). Protected
ranges would map to `readOnly` marks.

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
   `TYPE_ALIASES` and `JACK_TYPE_ALIASES` are the only places where
   lowercase names → `ClassName` / `{ type, jackType }`.

7. **`DockLayout` is the only place where panel positioning lives.** Panels
   must not manipulate their own top/left/width/height.

8. **Adding a new panel**:
   - Create `editor/ui/MyPanel.js` with `this.element`
   - Mount via `layout.mount('slotName', panel.element)` in `editor.js`
   - If the panel needs to persist size — handled by `DockLayout` sizes,
     not the panel itself.

9. **`updateCode()` must preserve the body.** When the model changes, only
   protected ranges are replaced; the body from `editor.value` is kept.
   Never call `syncFromModule()` from `updateCode()`.

10. **`syncFromModule()` resets everything.** Only call it from the user's
    explicit action (⟳ button) or from the `New` flow (via `clearModule`).
    Never call it after `restoreModuleFromData()`.

11. **`mappingTable` on `Knob` / `Slider` must be in both `serialize` and
    `deserialize`.** Otherwise round-trip load/save loses it — the module
    silently sounds wrong (LFO too fast, oscilloscope broken). Same applies
    to any future parametric component with mapping.

12. **`save` uses `getCode()` (live editor content), not
    `_userCsoundCode`.** Auto-save interval (60s) may not have fired yet,
    and the user's body edits must be persisted.

13. **`_cmdNew` / `Toolbar._onNew` must reset `_userCsoundCode` and rebuild
    the code panel** (via `clearModule({ title, resetColor })`). Otherwise
    the old DSP body leaks into the "new" module.

---

## Known issues

- `TerminalPanel._cmdSave` duplicates `ModulePropertiesWindow.generateModuleCode`
- `ModulePropertiesWindow` and `ComponentPropertiesWindow` are headless
  — should be deleted once `PropertiesPanel` covers all cases
- Code Viewer has no proper undo/redo (browser-default for `<textarea>`)
- `DockLayout` has no collapse, no tabs (only Properties has tabs)
- Code Viewer does not virtualize highlight — may lag on very large code
- Terminal has no autocomplete
- `PropertiesPanel._render()` uses `style.cssText +=` on tabs — should be
  `=` with a base + active/inactive suffix (currently accumulates over time)
- `TerminalPanel._cmdSet` for `mappingTable` calls `updateCode()`, but
  `PropertiesPanel` (mapping-select) does **not** — unify
- Module Editor context menu still has `Change Color` — should be removed
  (color lives in Properties)
- Old saved modules do not contain `mappingTable` on `Knob` / `Slider` —
  re-assign and re-save if LFO / oscilloscope behave wrong

## Roadmap

Short-term:
- Remove `Change Color` from context menu
- Terminal: autocomplete, `!!`, `history`
- Unify save service (one place, used by Toolbar / Terminal / Properties)
- Fix `PropertiesPanel._render()` `cssText +=` accumulation
- `TerminalPanel._cmdSet(mappingTable)` → also call `updateCode()` from
  `PropertiesPanel` mapping-select

Mid-term:
- CodeMirror 5 or 6 in Code Viewer (with protected ranges as `readOnly` marks)
- Collapse panels in `DockLayout`
- Editor undo/redo (separate from main app)
- Snapshot / restore in terminal
- `led_peak` UDO variant with `abs()` for a "positive period" LED indicator

Long-term:
- Component grouping (visual)
- Live preview (`preview` command — send UDO to main app)
- Macro recording in terminal
- Multi-select in Properties (edit N components at once)
