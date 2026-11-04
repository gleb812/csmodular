
# Module Editor

Separate entry (`editor.html`) — IDE-style workspace for designing custom modules visually. Opens in its own window (Tauri) or tab (web).

Architecture in `AI Context.md` → *Module Editor*.

## Layout

Fixed dock, 4 panels + toolbar. Splitters resizable, sizes persist in `localStorage` (`csmodular:editor-layout`).

```
┌─────────────────────────────────────────────────┐
│ toolbar: [New] [Load] [Save] | Layout presets   │
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
├── ModulePropertiesWindow.js      # Headless legacy — DOM detached
├── ComponentPropertiesWindow.js   # Headless legacy — mapping browser only
└── ui/
    ├── DockLayout.js              # Split-pane + presets
    ├── Toolbar.js                 # New / Load / Save + Save As dialog
    ├── PropertiesPanel.js         # Module / Component tabs
    ├── TerminalPanel.js           # Command terminal
    ├── Toast.js                   # Notifications
    ├── ContextMenu.js             # Generic menu (with submenus)
    └── ModuleContextMenu.js       # Editor-specific menu
```

Legacy `ModulePropertiesWindow` / `ComponentPropertiesWindow` **do not render**. Kept for `ComponentPropertiesWindow._showMappingBrowser()`, still called by `PropertiesPanel`.

`EditorApp.uiManager` is a **stub** — `{ showNotification, updateZoomInfo }` from `ui/Toast.js`. No `EditorUIManager` class.

## Bootstrap

```js
const layout = new DockLayout({ root });
const canvas = document.createElement('canvas');
canvas.id = 'editorCanvas';
const app = new EditorApp(canvas);

const toolbar = new Toolbar({ app, layout });
layout.mount('toolbar', toolbar.element);

layout.mount('leftTop', canvas);
app.setupCanvas();

layout.mount('rightTop', app.codeViewerWindow.windowElement);
app.codeViewerWindow.show();

app.propertiesPanel = new PropertiesPanel(app);
layout.mount('leftBottom', app.propertiesPanel.element);

app.terminalPanel = new TerminalPanel(app);
layout.mount('rightBottom', app.terminalPanel.element);
```

`EditorApp` is constructed **before** panels mount. Constructor creates `module`, `components[]`, `codeViewerWindow`, `propertiesWindow`, `componentPropertiesWindow`.

## ComponentRegistry

Each component type described **once**:

```js
Knob: {
    label: 'Knob',
    category: 'controls',        // 'controls' | 'display' | 'jacks' | 'graphics'
    paletteSize: { width: 24, height: 24 },
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

**`mappingTable`** serialized/deserialized for `Knob` and `Slider`. Same for any future parametric component with mapping.

### Runtime quirks (registry does not mimic)

| Component | Runtime bug | Editor behaviour |
|---|---|---|
| `TextEdit` | `ModuleFactory` creates `ButtonText` | Creates `TextEdit` |
| `LevelShift` | Ignores `width`/`height`, hardcodes 15×12 | Same |
| `Line` | JSON `width`, constructor `thickness` | serialize→`width`, deserialize `width`→`thickness` |

### Helpers

`serializeComponents`, `deserializeComponents`, `collectParamIds`, `collectPorts`, `getCsoundPorts`, `getByCategory`, `createComponent`, `isParametric`, `getJackDir`, `getTypeOf`.

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
- **Category** — dropdown from `CATEGORIES` (`src/moduleCategories.js`). Default `custom`. Saved to `module.category` → used by `getModuleCategoryColor` in minimap and ContextMenu.
- **Status** — dropdown with 4 options, colored dot from `getStatusMeta(status)`:
  - `stable` — green `#3ecf6e`
  - `passable` — light green `#8fdc6e`
  - `dev` — yellow `#e8c547` (default)
  - `broken` — red `#e84a4a`

  Saved to `module.status` → written to JS by `saveService.generateJsCode` (`status: '${m.status}'`). Used by `vite.config.js` → `stableModulesOnly` build filter (`status ∈ {stable, passable}` are shipped).

### Component tab

Rendered from `static getPropertySchema()`. Field types:

| Type | UI |
|---|---|
| `select` | dropdown (`options` / `optionsFrom`) |
| `number` | numeric (min/max/step) |
| `text` | free text |
| `list` | comma-separated → array |
| `checkbox` | toggle |
| `mapping-select` | custom field + `🔍` browser |
| `mapping-multi-select` | modal with checkboxes, order = selection order |

Each field supports `afterChange(comp, value)` (clamp, rebuild labels, update `width`).

**Current schemas:**

| Component | Fields |
|---|---|
| `Knob` | `mappingTable` (`mapping-select`) |
| `Slider` | `mappingTable` (`mapping-select`) |
| `TextLabel` | `text`, `fontSize`, `color` |
| `ButtonFlat` | `positions` (`list`), `currentIndex` |
| `ButtonRadio` | `labels` (`list`), `buttonCount`, `selectedIndex` |
| `ButtonIncDec` | `items` (`list`), `currentIndex` |
| `ButtonText` | `text`, `isActive` (`checkbox`) |
| `PartSelector` | `items` (`list`), `selectedIndex` |

**`optionsFrom`:**

- `'mappingTables'` — all names in `MappingTables`
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

**Rules:**

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

### Syntax highlight

Overlay: transparent `<textarea>` over highlighted `<div>` (pointer-events: none). Both scroll sync via `_syncScroll()`.

Single regex pass `_highlightCsound()`:

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

**Do NOT chain `.replace()` calls** — the second would match inside HTML tags injected by the first.

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

### Save — `saveService.js` (single source of truth)

**All save paths go through `saveService.saveModule()`.** No duplication between Toolbar and Terminal.

```js
import { saveModule, sanitizeName, generateJsCode } from '../saveService.js';

const result = await saveModule(app, { lib: 'user', name: null });
// → { lib: 'user', name: 'MyOsc' }
```

**What `saveModule` does:**

1. `sanitizeName(name || app.module.title)` — Csound-safe identifier
2. If `lib !== 'user'` and library doesn't exist → `libraryStore.createLibrary(lib, { displayName: lib })`
3. Collects `moduleData` from `app.components[]` via `ComponentRegistry` (`serializeComponents`, `collectParamIds`, `collectPorts`)
4. Generates JS via `generateJsCode()` — single template, includes `category`, `status`, `gridHeight`, `customColor`, `params`, `inputs`, `outputs`, `components`
5. `dspCode` from `app.codeViewerWindow.getCode()` (live content, **not** `_userCsoundCode`)
6. `libraryStore.saveModule(lib, name, jsCode, dspCode)`
7. Syncs `app.module.title`, `app.module.status`, `app._sourceLibrary`

### Save — Toolbar

`💾 Save` → `Toolbar._showSaveDialog()`:

```
┌─ Save Module ──────────────────────────┐
│ Name:    [MyOsc                      ] │
│ Library: [👤 user ▾]  [+ New]           │
│                                         │
│ [Cancel]  [Save]                       │
└─────────────────────────────────────────┘
```

- **Name** — prefilled from `app.module.title`, sanitized on save
- **Library** — dropdown from `libraryStore.listLibraries()`, `user` first
- **`+ New`** — reveals inline form: `name` (a-z, 0-9, _ -), `author` (optional) → `libraryStore.createLibrary()`. If library exists — error, use dropdown instead.
- **Enter** in input → Save, **Escape** → Cancel

### Save — Terminal

`save` → `saveService.saveModule(app, { lib: 'user', name })`:

| Command | Effect |
|---|---|
| `save` | Save to `user` under current name |
| `save as <Name>` | Save to `user` under new name |

**Save always targets a chosen library.** Builtin libraries (`test-lib`, `nm2`, ...) are **read-only** — `libraryStore.saveModule` writes only to `user` / IndexedDB / `$DOCUMENT/CsModular/libraries/`.

### Load — Toolbar

`📂 Load` dialog from `libraryStore.listLibraries()` + `listModules()`:

- Shows `[lib]` + `displayName` + colored status dot (`getStatusMeta(status)`)
- **Fast** — `listModules` reads `_index.json` only, no JS eval
- Click → `libraryStore.loadModule(lib, name)` → `app.restoreModuleFromData(description, dspCode)` → `app._sourceLibrary = lib`

### Load — Terminal

| Command | Effect |
|---|---|
| `load` | List all modules in all libraries |
| `load <name>` | Search `user` first, then all libraries |
| `load <lib>/<name>` | From specific library |
| `load <lib> <name>` | Same, space-separated |

**Ambiguity:** if `load <name>` and the name exists in multiple libraries — **`user` wins** (first in order). Other libraries are searched in `listLibraries()` order. No error, no prompt.

### Storage

- **Web:** IndexedDB (`csmodular` → store `libraries`)
  - `<lib>/<Name>.js`, `<lib>/<Name>.txt`
  - `<lib>/_index.json` — module manifest (`{ modules: [{ name, displayName, category, status }] }`), updated on save/remove
  - `<lib>/_meta.json` — library metadata (`{ name, displayName, author, version, description, geometry, createdAt }`)
- **Tauri:** `~/Documents/CsModular/libraries/<lib>/`
  - `modules/<Name>.js`, `modules/<Name>.txt`
  - `_index.json`, `_meta.json` in library root

Builtin libraries live in `public/libraries/<lib>/` — same structure, read-only.

### Round-trip preserves

- `mappingTable` on `Knob`/`Slider`
- Multi-position labels on `ButtonFlat`/`ButtonRadio`/`ButtonIncDec`
- Default index/state on button-likes
- `TextLabel` text, fontSize, color
- DSP body (protected structure rebuilt around it)
- `category` on the module
- **`status`** on the module — `restoreModuleFromData` reads `moduleData.status`, `clearModule` resets to `'dev'`
- `library` field is **not** stored in JS (it's the storage location); module JSON only carries `category`, `status`, etc.

## Terminal

`editor/ui/TerminalPanel.js` — command line.

### Command reference

| Command | Description |
|---|---|
| `add <type> [x y]` | Add (auto-place or at x,y). No args → full list by category |
| `add label <text> [x y]` | `TextLabel` with text |
| `add <buttonflat\|radio\|incdec> <a,b,c> [x y]` | Multi-position button |
| `ina`/`ink`/`outa`/`outk` [x y] | Audio/control Input or Output |
| `in`/`out` | Shorthand for `ina`/`outa` |
| `ls [type] [-l]` | List (`-l` verbose: `text`, `items`/`labels`/`positions`, `mappingTable`, `jackType`) |
| `del <id\|type\|range>...` | Delete (`del 3`, `del knob`, `del 3 4 5`, `del 3..7`) |
| `mv <id> <x> <y>` / `mv <id> +dx +dy` | Move absolute / relative |
| `set <id> <prop> <value>` | See below |
| `map <id> [table]` | Bind / unbind mapping table |
| `align <ids...> l\|r\|u\|d` | Align |
| `distr <ids...> h\|v` | Distribute |
| `grid` / `grid on\|off` / `grid <N>` | Show / toggle / step |
| `new [name]` | Clear + reset DSP |
| `name <newName>` | Rename (no clear) |
| `save [as <name>]` | Save to `user` library |
| `load [<name>]` | Load (no arg — list all libraries) |
| `load [<lib>/<name>]` | Load from a specific library |
| `rm <name>` | Delete user module |
| `lsmod [filter]` | List user modules |
| `category <cat>` | Set module category (`osc`, `fx`, ...) |
| `stats` | Statistics |
| `clear` | Clear output |
| `help [cmd]` | Help |

⚠️ **`rm` ≠ `del`:** `del`/`delete` = components, `rm`/`remove` = user modules. `rm` must NOT be aliased in `_cmdDel` case.

### `set` properties

| Property | Applies to | Notes |
|---|---|---|
| `text` (aliases `label`/`value`/`content`) | `TextLabel`, `ButtonText`, `TextEdit` | Free text |
| `items`/`labels`/`positions` (alias `list`) | `ButtonIncDec`/`ButtonRadio`/`ButtonFlat` | Comma-separated |
| `count` | `ButtonRadio` | 1..16, rebuilds labels + `width` |
| `default` | `ButtonFlat`, `ButtonRadio`, `ButtonIncDec` (idx), `ButtonText` (bool) | |
| `item` | `ButtonIncDec` | Replace current item |
| `fontSize` (alias `size`) | `TextLabel` | 4..72 |
| `color` (alias `colour`) | `TextLabel`, `ButtonText` | `#rgb` / `#rrggbb` |
| `mappingTable` (aliases `mapping`/`table`) | `Knob`, `Slider` | Empty/null unsets |
| `min`/`max`/`defaultValue` | `Knob`, `Slider` | Numeric |
| `jackType` (alias `jack`) | `Input`, `Output` | `audio`/`control` |
| `category` (alias `cat`) | module | `osc`, `filter`, `fx`, ... from `CATEGORIES`. Default `custom`. |

### Type aliases

`TYPE_ALIASES` and `JACK_TYPE_ALIASES` — the only place for lowercase → `ClassName` / `{ type, jackType }`. Terminal lookup via `ComponentRegistry` — no hardcoded names.

### `del` examples

```
del 3                 id=3
del knob              all Knobs
del 3 4 5             ids 3, 4, 5
del 3..7              ids 3..7
del knob button       all Knobs and Buttons
```

### Collision rules

- `add` without coords — scans 5px grid for first free spot
- `add x y` / `mv` — bounds + collisions check
- Collision / out of bounds → error, no change

### History / output

- `↑` / `↓` — history (per session, not persisted)
- Errors red `✗`, success green `✓`, info blue, echo grey

### `save` / `load` / `rm` / `lsmod`

`save` uses `saveService.saveModule()` — no inline JS generation. `jsCode` from `generateJsCode()`, `dspCode` from `codeViewerWindow.getCode()`.

```js
// TerminalPanel._cmdSave (short form)
async _cmdSave(args) {
    const { saveModule, sanitizeName } = await import('../saveService.js');
    let name = null;
    if (args[0]?.toLowerCase() === 'as' && args[1]) {
        name = sanitizeName(args.slice(1).join(' '));
        if (!name) { this._printError('Invalid name for "save as"'); return; }
    }
    const result = await saveModule(this.app, { lib: 'user', name });
    this._printOk(`Saved "${result.name}" → ${result.lib}`);
}
```

`load <name>` parses with `libraryStore.loadModule`, then `app.restoreModuleFromData(moduleData, dsp_code)`.

⚠️ `load` must **not** call `syncFromModule()` after `restoreModuleFromData()` — wipes DSP body.

`rm <name>` — deletes **user module** (`libraryStore.removeModule('user', name)`). Prompts with `window.confirm`. If module is currently open — prints warning, does **not** reset the editor.

`lsmod [filter]` — lists **user modules** from `libraryStore.listModules('user')`. With filter — names containing substring. Marks current module with `← current`.

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

1. **Panel components mount cleanly.** Expose `this.element`, no `position: fixed`, no `document.body.appendChild` from panel code.
2. **Global key handlers check `isEditable`** (see `EditorApp.setupEvents()`).
3. **Component serialization via `ComponentRegistry`** — no hand-rolled `if (comp.constructor.name === ...)`.
4. **`params[]` order = `components[]` order** — never sort.
5. **Highlight = single regex pass** — no `.replace()` chains.
6. **`TerminalPanel` uses `ComponentRegistry`** for lookup. `TYPE_ALIASES` / `JACK_TYPE_ALIASES` — only place for lowercase → name.
7. **`DockLayout` is the only place for panel positioning.** Panels do not manipulate their own top/left/width/height.
8. **Adding a panel:** create `editor/ui/MyPanel.js` with `this.element`, mount via `layout.mount('slotName', panel.element)` in `editor.js`. Size persistence — `DockLayout`, not panel.
9. **`updateCode()` preserves body.** Never call `syncFromModule()` from `updateCode()`.
10. **`syncFromModule()` resets everything.** Only from user's ⟳ / `New` flow (via `clearModule`). **Never** after `restoreModuleFromData()`.
11. **`mappingTable` on `Knob`/`Slider` — in both `serialize` and `deserialize`.** Otherwise round-trip loses it (LFO too fast, oscilloscope broken). Same for any future parametric component with mapping.
12. **All saves go through `saveService.saveModule()`.** No duplication between Toolbar, Terminal, or anywhere else. `generateJsCode()` lives **only** in `saveService.js`.
13. **`_cmdNew` / `Toolbar._onNew` must reset `_userCsoundCode`** and rebuild code panel (`clearModule({ title, resetColor })`). Otherwise old DSP body leaks into "new" module.
14. **`rm` ≠ `del`** in terminal `switch` — `rm`/`remove` for user modules, `del`/`delete` for components.
15. **Save always targets an explicit library.** `saveService` takes `{ lib }`. Builtin libraries are **read-only**; `libraryStore.saveModule` writes only to `user` (or any user library on IndexedDB / Tauri fs).
16. **`category` and `status` are required in generated JS.** `saveService.generateJsCode` reads `app.module.category || 'custom'`, `app.module.status || 'dev'`. Both must be valid per `isValidCategory()` / `getStatusMeta()`.
17. **No `typeID` in generated JS.** `CsoundGenerator.addModule` builds the UDO path from `definition.library`; `typeID` is dead.
18. **`libraryStore.createLibrary(name)`** — creates `<lib>/_meta.json` and `<lib>/modules/`. Called from `Toolbar._showSaveDialog` (`+ New` button) and `saveService` (if `lib` doesn't exist). Never overwrites existing `_meta.json`.
19. **`module.status` is per-module, not per-library.** Stored in JS (`status: 'dev'`), read by `restoreModuleFromData`, written by `saveService`.
20. **No `await import()` inside sync methods.** `PropertiesPanel._renderModuleTab` is **synchronous** — `getStatusMeta` imported at top of file, not inline.

## Known issues

- `ModulePropertiesWindow` / `ComponentPropertiesWindow` headless — only `_showMappingBrowser()` still used; delete when standalone modal exists
- `PropertiesPanel` category select has no visual grouping (flat list from `CATEGORIES`)
- **Load dialog shows all libraries flat** — no search / filter; fine for small counts
- **No library-level meta UI** — `_meta.json` written by `createLibrary`, but no editor to change `author`/`version`/`description` after creation
- Code Viewer no undo/redo (browser-default for `<textarea>`)
- `DockLayout` no collapse, no tabs (only Properties has tabs)
- No virtualized highlight — may lag on very large code
- Terminal no autocomplete
- `PropertiesPanel._render()` uses `style.cssText +=` — accumulates (minor leak; fix by resetting `cssText = ''` before appending)
- **`TerminalPanel._cmdSet(mappingTable)` calls `updateCode()`, `PropertiesPanel` mapping-select doesn't** — unify
- Context menu still has `Change Color` — should be removed (color in Properties)
- Old modules lack `mappingTable` on `Knob`/`Slider` — re-assign and re-save
- **`load <name>` ambiguity:** if the name exists in multiple libraries, `user` wins silently. No error, no candidate list. Fine for MVP, but complicates debugging "wrong module loaded"
- **`save` overwrites without confirmation.** `libraryStore.saveModule` replaces `<lib>/<Name>.{js,txt}` silently. `saveService` does not check existing. Users can lose work by saving under an existing name
- **`window.confirm()` on Tauri macOS WKWebView** — unreliable. `_onNew` and `_cmdRm` use it; on macOS may return `true` without showing dialog
- **`/tables/` HTML listing** — Vite in dev serves directory listing; in build/prod may not. `_listTableNames` will return `[]`. Workaround: `public/tables/_index.json` (TODO)
- **`mapping-multi-select` reorder** — no drag/↑↓ UI; to reorder, uncheck all and select in desired order
- **`PartSelector.onChange` missing** in constructor — `ModuleFactory` wraps it for Csound `setControlChannel`

## Roadmap

**Short:**

- `PropertiesPanel` mapping-select: call `updateCode()`
- Category select in `PropertiesPanel` — add grouping (optgroup) if `CATEGORIES` grows
- **Save confirmation dialog** — check `libraryStore.loadModule(lib, name)` before save; `confirm()` if exists
- **Replace `window.confirm()`** with custom `ConfirmDialog` (Tauri macOS WKWebView issue)
- Fix `PropertiesPanel._render()` `cssText +=`
- **Library meta editor** — edit `author`/`version`/`description`/`geometry` in Toolbar after `+ New`
- **`load` ambiguity error** — show candidate list when name exists in multiple libraries

**Mid:**

- CodeMirror 5 or 6 (protected ranges as `readOnly` marks)
- Collapse panels in `DockLayout`
- Editor undo/redo (separate from main app)
- Snapshot / restore in terminal
- `led_peak` UDO variant with `abs()`
- Export / Import library (ZIP, JSZip or `CompressionStream`)
- `libraryStore` URL import (`_index.json` with `libraries: ["https://..."]`)
- **Repair patch dialog** — main app: if `user/Zgen` missing but `my-fm/Zgen` exists, offer replacement

**Long:**

- Component grouping (visual)
- Live preview (`preview` command → send UDO to main app)
- Macro recording in terminal
- Multi-select in Properties
- Community library registry (optional server / GitHub Releases)
- Patch format v2 with `libraries: []` field for portable sharing
- **`ModuleFactory` keyed by `<lib>/<type>`** — proper collision handling (currently first-wins). Allows `user/Zgen` and `my-fm/Zgen` in same patch via type mangling (`Zgen_user`, `Zgen_myfm`)
