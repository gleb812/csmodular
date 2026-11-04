
# Module Editor

Separate entry (`editor.html`) — IDE-style workspace for designing custom modules.
Opens in its own window (Tauri) or tab (web).

**Companion docs:**
- `AI Context.md` → *Module Editor* — full contracts, saveService steps, terminal reference
- `ARCHITECTURE.md` — high-level overview
- `CONTRIBUTING.md` — module workflow (create → export → release → share)
- `TROUBLESHOOTING.md` — known issues
- `TODO.md` — roadmap

## Layout

Fixed dock, 4 panels + toolbar. Splitters resizable, sizes persist in `localStorage` (`csmodular:editor-layout`).

```
┌─────────────────────────────────────────────────┐
│ toolbar: [New] [Load] [Save] [Export] [Import]  │
├──────────────────────┬──────────────────────────┤
│   Canvas (module)    │   Csound Code            │
├──────────────────────┼──────────────────────────┤
│   Properties         │   Terminal               │
│   (Module/Component) │   (command language)     │
└──────────────────────┴──────────────────────────┘
```

Presets: `Default` (balanced), `Code` (code-focused), `Canvas` (canvas-focused).

## Files

```
editor/
├── editor.html                    # Entry
├── editor.js                      # Bootstrap: builds dock, wires panels
├── EditorApp.js                   # Controller (canvas, events, animation)
├── EditorPanel.js                 # Module panel on canvas
├── ComponentRegistry.js           # Single source of truth for components
├── CodeViewerWindow.js            # Csound editor (protected structure)
├── saveService.js                 # Unified save (Toolbar + Terminal)
├── ui/
│   ├── DockLayout.js              # Split-pane + presets
│   ├── Toolbar.js                 # New / Load / Save / Export / Import
│   ├── PropertiesPanel.js         # Module / Component tabs
│   ├── TerminalPanel.js           # Command terminal
│   ├── Toast.js                   # Notifications
│   ├── ContextMenu.js             # Generic menu
│   └── ModuleContextMenu.js       # Editor-specific menu
```

Legacy `ModulePropertiesWindow` / `ComponentPropertiesWindow` — **headless**, DOM detached. Only `_showMappingBrowser()` still used (called by `PropertiesPanel`).

`EditorApp.uiManager` is a **stub** — `{ showNotification, updateZoomInfo }` from `ui/Toast.js`. No `EditorUIManager` class.

**Bootstrap** — `editor.js`. `EditorApp` constructed **before** panels mount (`codeViewerWindow`, `propertiesPanel`, `terminalPanel` created inside / after).

## ComponentRegistry

Each component type described **once**:

```js
Knob: {
    label: 'Knob',
    category: 'controls',        // 'controls' | 'display' | 'jacks' | 'graphics'
    paletteSize: { width: 24, height: 24 },
    autoSize: false,             // ⭐ true for TextLabel — do not overwrite width/height
    noCollision: false,          // ⭐ true for TextLabel — not checked, not an obstacle
    isParametric: true,          // goes into module.params[]
    isJack: false,               // or 'in' / 'out'
    create(opts),
    serialize(comp),
    deserialize(data, ctx),
    csoundPorts(comp),           // { kind, dir } | null
}
```

Used by `PropertiesPanel`, `TerminalPanel`, `ModuleContextMenu`, `CodeViewerWindow.generateCsoundCode`, `saveService`.

**Adding a component type = one entry.** No other file needs editing (except optional aliases in `TerminalPanel.js`).

### Categories

| Category | Types |
|---|---|
| `controls` | Knob, Slider, ButtonFlat, ButtonRadio, ButtonIncDec, ButtonText, PartSelector |
| `display`  | TextLabel, TextField, TextEdit, LED, LevelShift |
| `jacks`    | Input, Output |
| `graphics` | SVG, Line, Graph, MiniVU |

### Serialization contract

Matches `src/ModuleFactory.js`:

- `components[].x/y` — **relative to module top-left**
- `components[].id` — string, unique within module
- `params[]` — parametric component IDs, **in `components[]` order** (do NOT sort)
- `inputs[]` / `outputs[]` — jack component IDs, in order
- `width` / `height` — for all except `autoSize` (TextLabel)

**`mappingTable`** serialized/deserialized for `Knob` and `Slider`. Same for any future parametric component with mapping.

### Helpers

`serializeComponents`, `deserializeComponents`, `collectParamIds`, `collectPorts`, `getCsoundPorts`, `getByCategory`, `createComponent`, `isParametric`, `getJackDir`, `getTypeOf`, `hasCollisions`.

## Canvas interaction

**Add:** right-click canvas → Add Component → submenu by category. Jacks have two entries per type: `Input (audio)` / `Input (control)`.

**Select:** left-click → selects, switches Properties to Component tab, drag starts immediately.

**Context menu:** right-click component → `Properties` / `Delete`.

**Rename (4 paths, all call `updateCode()` + re-render Properties if Module tab):**

- Double-click module on canvas
- Right-click → Rename Module
- Properties → Module tab → Name field (Enter or blur)
- Terminal `name <newName>`

Sanitization: strip spaces, prefix `M` if digit start, remove non-`[a-zA-Z0-9_]`. Empty → `NewModule`.

**Resize:** bottom-right handle → `gridHeight` (width always 1 cell = 13 grid units).

**Zoom/pan:** `Ctrl+wheel` / `+` / `-` (zoom around cursor), `0` (reset, canvas focus), middle mouse (pan).

**Keyboard rule:** global key handlers must skip when `e.target` is `<input>`, `<textarea>`, or `contentEditable`. Otherwise typing `0` in a numeric field triggers `resetZoom()`.

```js
const isEditable = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable;
if (isEditable) return;
```

## Properties panel

### Module tab

- **Name** — sanitized Csound-safe identifier. Enter → blur → change: `module.title` updated, `codeViewerWindow.updateCode()` (opcode line regenerated, body preserved)
- **Height** — grid cells (1..20)
- **Panel Color** — 12 presets + `↺ Default` + hex input
- **Category** — dropdown from `CATEGORIES` (`src/moduleCategories.js`). Default `custom`.
- **Status** — dropdown with 4 options, colored dot from `getStatusMeta(status)`:
  - `stable` — green `#3ecf6e`
  - `passable` — light green `#8fdc6e`
  - `dev` — yellow `#e8c547` (default)
  - `broken` — red `#e84a4a`

  Saved to `module.status` → written to JS by `saveService.generateJsCode`. Used by `vite.config.js` → `stableModulesOnly` build filter (`status ∈ {stable, passable}` are shipped).

### Component tab

Rendered from `static getPropertySchema()`. Field types:

| Type | UI |
|---|---|
| `select` | dropdown (`options` / `optionsFrom`) |
| `number` | numeric (min/max/step) |
| `text` | free text |
| `list` | comma-separated → array |
| `checkbox` | toggle |
| `size` | two number inputs (W × H) |
| `mapping-select` | custom field + `🔍` browser |
| `mapping-multi-select` | modal with checkboxes, order = selection order |

Each field supports `afterChange(comp, value)` (clamp, rebuild labels, update `width`).

**Current schemas:**

| Component | Fields |
|---|---|
| `Knob` | `mappingTable` (`mapping-select`) |
| `Slider` | `mappingTable` (`mapping-select`) |
| `TextLabel` | `text`, `fontSize`, `size` — **no `color`** (always theme) |
| `ButtonFlat` | `positions` (`list`), `currentIndex` |
| `ButtonRadio` | `labels` (`list`), `buttonCount`, `selectedIndex` |
| `ButtonIncDec` | `items` (`list`), `currentIndex` |
| `ButtonText` | `text`, `isActive` (`checkbox`), `size` |
| `MiniVU` | `size`, `sourceComponentId`, `thresholdGreen`, `thresholdYellow` |
| `PartSelector` | `items` (`list`), `selectedIndex` |

**`optionsFrom`:**

- `'ioComponents'` — all Input/Output in current module
- `'parametricComponents'` — Knob/Slider/Button*/PartSelector except current `TextField` (used by `TextField` for Controller/Mode switch)
- fallback — `propDef.options` array

**Mapping browser** (`🔍`): opens `ComponentPropertiesWindow._showMappingBrowser()` — modal, search min 2 chars, scrollable, click to bind.

## Csound Code panel

`editor/CodeViewerWindow.js` — live-generated `opcode` code.

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

- **Line numbers** `#`, **highlight** 🎨, **font size** `[A][A]`
- **Status:** `● Saved` / `● Modified` / `🔒 protected` / `🚫 forbidden`
- **⟳** resync (reset structure + body to model), **📋** copy
- **Right gutter:** 🔒 for protected lines, synced scroll

### Protected structure

Three zones from `generateCsoundCode()`:

- **Header 🔒** — `;@ map`, `opcode`, `xin`, mapping lines
- **Body (editable)** — user DSP between input-jack and output-jack blocks
- **Footer 🔒** — `zar`/`zkr`/`init`, `zaw`/`zkw`, `endop`

**Rules (easy to break — see `AI Context.md` → *Editor rules*):**

- Protected lines **regenerated from model** on any change (add/remove component, rename, mapping). Body preserved.
- Cursor cannot enter protected lines (`_clampCursorToEditable` on `selectionchange`/`click`/`keyup`/`select`). `beforeinput` blocks boundary edits.
- **Enter** in body inserts lines (footer shifts). **Backspace** at body start stops at upper boundary.
- Structural keywords (`zar`, `zkr`, `zaw`, `zkw`, `xin`, `opcode`, `endop`) **forbidden in body**:
  - `beforeinput` blocks `insertText`/`insertFromPaste`/`insertFromDrop` when hypothetical body would contain one
  - `onEditorInput` rechecks, reverts to `_lastValidBody`
  - Leftovers highlighted red
- `_structureCache` (`bodyStart`, `bodyEnd`, `protectedLineIndices`, `bodyStartLine`, `bodyEndLine`) **always rebuilt** from current `editor.value` in `onEditorInput` before comparing
- `updateCode()` replaces protected ranges only, keeps body from `editor.value`. Cursor position preserved relative to new `bodyStart`
- `syncFromModule()` (⟳) resets everything to placeholder `; Add your DSP code here`
- **`restoreModuleFromData` → `_rebuildStructure()` + `_rebuildStructureFromCurrent()`, NOT `syncFromModule()`.**

### Syntax highlight

Overlay: transparent `<textarea>` over highlighted `<div>` (pointer-events: none). Both scroll sync via `_syncScroll()`.

Single regex pass `_highlightCsound()` — **do NOT chain `.replace()` calls** (second matches inside HTML tags injected by first).

| Token | Color |
|---|---|
| `;@ map` | pink bold |
| `;...` | grey italic |
| `opcode` / `endop` / `instr` / `xin` / `init` / `ftgen` | blue bold |
| numbers | yellow |
| strings `"..."` | light blue |
| variables `kFoo`, `aFoo`, `giFoo` | lavender |
| protected line | `#7a8a9a` |
| forbidden in body | red bg |

### Code generation

```csound
;@ map TABLE1 TABLE2                ; if any component has mappingTable
opcode ModuleName, 0, kkkk
kKnob1, kButton1, kIn1, kOut1 xin   ; allParams

    ; --- mapping tables ---
    kKnob1 table kKnob1, giTABLE1

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

**Naming:** `kKnob1`, `kSlider1`, `kButton1`, `kText1`, `kLevel1`, `kIn1` / `kOut1` (jacks — **shared counter** across audio/control).

### Dirty state

`isDirty` tracks body edits only. `updateCode()` always replaces protected ranges, preserves body. `⟳` (`syncFromModule`) resets everything.

## Save / Load

**All saves go through `saveService.saveModule(app, { lib, name })`.** Full steps → `AI Context.md` → *Module Editor* → *Save / Load*.

**Toolbar:**
- `💾 Save` → `SaveDialog` (Name + Library dropdown + `+ New`)
- `📂 Load` → `LoadDialog` (libraries + modules, status dot, `listModules` from `_index.json`)
- `⬇ Export` → downloads `<Name>.js` + `<Name>.txt` (web: Blob; Tauri: native save dialog)
- `⬆ Import` → select `.js` + `.txt` → `libraryStore.saveModule('user', ...)`

**Terminal:**
- `save` / `save as <Name>` → `user`
- `load` / `load <name>` / `load <lib>/<name>` → `restoreModuleFromData` (⚠️ **not** `syncFromModule`)
- `rm <name>` → `libraryStore.removeModule('user', name)`
- `lsmod [filter]` → list user modules

**Storage:**

| | Web | Tauri |
|---|---|---|
| Builtin | `public/libraries/` (read-only) | `public/libraries/` (read-only) |
| User | IndexedDB (`csmodular/libraries`) | `~/Documents/CsModular/libraries/` |

**Round-trip preserves:** `mappingTable`, multi-position labels, default index/state, `TextLabel` text/fontSize, DSP body, `category`, `status`, `width`/`height` (except `autoSize`).

`library` field is **not** stored in JS — it's the storage location.

## Terminal

`editor/ui/TerminalPanel.js` — command line. Full reference → `AI Context.md` → *Module Editor* → *Terminal*.

```
add <type> [x y]           add component (or `add label <text>`, `add <btn> <a,b,c>`)
ina / ink / outa / outk    add audio/control Input or Output
ls [type] [-l]             list components
del <id|type|range>...     delete components (`del 3`, `del knob`, `del 3..7`)
mv <id> <x> <y>            move absolute or `mv <id> +dx +dy` relative
set <id> <prop> <value>    set property (text, items, count, default, mappingTable, jackType, ...)
map <id> [table]           bind / unbind mapping table
align <ids...> l|r|u|d     align
distr <ids...> h|v         distribute
grid / grid on|off / N     micro-grid
new [name]                 clear + reset DSP
name <newName>             rename (no clear)
save [as <name>]           save to user library
load [<name>|<lib>/<name>] load (no arg — list all)
rm <name>                  delete user module
lsmod [filter]             list user modules
category <cat>             set module category
stats                      statistics
help [cmd]                 help
```

⚠️ **`rm` ≠ `del`** — `del`/`delete` = components, `rm`/`remove` = user modules. `rm` must NOT be aliased in `_cmdDel` case.

**`set` properties:** `text` (`label`/`value`/`content`), `items`/`labels`/`positions` (`list`), `count` (ButtonRadio), `default`, `item` (ButtonIncDec), `fontSize`, `color` (ButtonText only), `mappingTable`, `min`/`max`/`defaultValue`, `jackType`, `category`.

**Type aliases:** `TYPE_ALIASES` / `JACK_TYPE_ALIASES` — the only place for lowercase → `ClassName`. Lookup via `ComponentRegistry`.

**History:** `↑` / `↓` (per session, not persisted).

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + wheel` / `+` / `-` | Zoom canvas |
| `0` | Reset zoom (canvas focus) |
| `Escape` | Cancel current drag |
| `Delete` | Delete selected component |
| Right-click canvas | Context menu (Add / Rename) |
| Right-click component | Context menu (Properties / Delete) |
| `Ctrl + S` (code editor) | Save Csound code |
| `↑` / `↓` (terminal) | Command history |
| `Tab` (code editor) | Insert 4 spaces |

## Development rules

**See `AI Context.md` → *Development rules (short)* and *Editor rules*.** Key ones for the editor:

1. **`updateCode()` preserves body.** Never call `syncFromModule()` from `updateCode()`.
2. **`syncFromModule()` resets everything.** Only from ⟳ / `New` flow. **Never** after `restoreModuleFromData()`.
3. **`mappingTable` on `Knob`/`Slider` — in both `serialize` and `deserialize`.**
4. **`autoSize: true`** (TextLabel) — `EditorPanel`, `ModuleContextMenu`, `TerminalPanel` must **not** overwrite `width`/`height` after `createComponent`.
5. **`noCollision: true`** (TextLabel) — not checked, not an obstacle (`EditorApp._hasCollision`, `TerminalPanel._collides`).
6. **Component serialization via `ComponentRegistry`** — no manual `if (constructor.name === ...)`.
7. **`DockLayout` is the only place for panel positioning.** Panels expose `this.element`, no `position: fixed`, no `document.body.appendChild`.
8. **`params[]` order = `components[]` order** — never sort.
9. **`generateJsCode()` lives only in `saveService.js`.**
10. **`rm` ≠ `del`** in terminal `switch`.
```
