
# Module Editor

Separate entry (`editor.html`) — IDE-style workspace for designing custom modules visually. Opens in its own window (Tauri) or tab (web).

Full architecture in `AI Context.md` → *Module Editor*.

## Overview

Fixed dock, 4 panels + toolbar. Resizable splitters, sizes persist in `localStorage` (`csmodular:editor-layout`).

```
┌─────────────────────────────────────────────────┐
│ toolbar: [New] [Load] [Save] | Layout presets   │
├──────────────────────┬──────────────────────────┤
│                      │                          │
│   Canvas (module)    │   Csound Code            │
│                      │                          │
├──────────────────────┼──────────────────────────┤
│                      │                          │
│   Properties         │   Terminal               │
│   (Module/Component) │   (command language)     │
│                      │                          │
└──────────────────────┴──────────────────────────┘
```

**Presets:** `Default` (balanced), `Code` (code-focused), `Canvas` (canvas-focused).

## File Structure

```
editor/
├── editor.html                    # Entry
├── editor.js                      # Bootstrap: builds dock, wires panels
├── EditorApp.js                   # Controller (canvas, events, animation)
├── EditorPanel.js                 # Module panel on canvas
├── ComponentRegistry.js           # Single source of truth for components
├── CodeViewerWindow.js            # Csound editor (protected structure)
├── ModulePropertiesWindow.js      # Headless (legacy) — save API
├── ComponentPropertiesWindow.js   # Headless (legacy) — mapping browser
└── ui/
    ├── DockLayout.js              # Split-pane + presets
    ├── Toolbar.js                 # New / Load / Save + presets
    ├── PropertiesPanel.js         # Module / Component tabs
    ├── TerminalPanel.js           # Command terminal
    ├── Toast.js                   # Notifications
    ├── ContextMenu.js             # Generic menu (with submenus)
    └── ModuleContextMenu.js       # Editor-specific menu
```

**Legacy files:** `ModulePropertiesWindow.js` / `ComponentPropertiesWindow.js` **do not render** (DOM detached in bootstrap). Kept for two APIs:
- `ModulePropertiesWindow.saveModule()`
- `ComponentPropertiesWindow._showMappingBrowser()`

**Plan:** replace with `saveService` + `MappingBrowser` modal, then delete.

## Bootstrap

`editor.html` → `editor.js`:

```js
const layout = new DockLayout({ root });
const canvas = document.createElement('canvas');
canvas.id = 'editorCanvas';
const app = new EditorApp(canvas);

const toolbar = new Toolbar({ app, layout });
layout.mount('toolbar', toolbar.element);

layout.mount('leftTop', canvas);
app.setupCanvas();     // after mount, so parentElement exists

layout.mount('rightTop', app.codeViewerWindow.windowElement);
app.codeViewerWindow.show();

app.propertiesPanel = new PropertiesPanel(app);
layout.mount('leftBottom', app.propertiesPanel.element);

app.terminalPanel = new TerminalPanel(app);
layout.mount('rightBottom', app.terminalPanel.element);
```

**Important:** `EditorApp` is constructed **before** panels are mounted. `EditorApp` constructor creates: `module`, `components[]`, `codeViewerWindow`, `propertiesWindow`, `componentPropertiesWindow`.

## DockLayout

`editor/ui/DockLayout.js`:

- **Slots:** `leftTop`, `leftBottom`, `rightTop`, `rightBottom`, `toolbar`
- **Splitters:** vertical (between columns), horizontal in each column
- **Sizes:** `leftWidth`, `leftTopHeight`, `rightTopHeight` (fractions)
- **Persist:** `csmodular:editor-layout`

```js
layout.mount('leftTop', element);
layout.setPreset('default');   // 'default' | 'code-focus' | 'canvas-focus'
layout.getSizes();             // → { leftWidth, leftTopHeight, rightTopHeight }
```

Panels are pure DOM, mounted into slots. Swap `DockLayout` for `dockview`/`Golden Layout` without touching panel code if ever needed.

## ComponentRegistry — single source of truth

Each component type is described **once**:

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

**Used by:** `ModulePropertiesWindow.collectModuleData()`, `EditorApp._createComponentFromData()`, `CodeViewerWindow.generateCsoundCode()`, `ModuleContextMenu._componentSubmenu()`, `TerminalPanel`, `PropertiesPanel` (palette sizes).

**Adding a new component type = one entry in registry.** No other file needs editing (except optionally aliases in `TerminalPanel.js`).

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

**Sanitization:** strip spaces, prefix `M` if digit start, remove non-`[a-zA-Z0-9_]`. Empty → `NewModule`.

**Resize:** bottom-right handle → `gridHeight` (width always 1).

**Zoom/pan:** `Ctrl+wheel` / `+` / `-` (zoom around cursor), `0` (reset, canvas focus), middle mouse (pan).

**⚠️ Keyboard rule:** global key handlers must skip when `e.target` is `<input>`, `<textarea>`, or `contentEditable`. Otherwise typing `0` in a numeric field triggers `resetZoom()`.

```js
const isEditable = target.tagName === 'INPUT' ||
                  target.tagName === 'TEXTAREA' ||
                  target.isContentEditable;
if (isEditable) return;
```

## Properties panel

`editor/ui/PropertiesPanel.js` — two tabs.

### Module tab

- **Name** — sanitized Csound-safe identifier. Enter → blur → change: `module.title` updated, `codeViewerWindow.updateCode()` (opcode line regenerated, body preserved)
- **Height** — grid cells (1..20)
- **Panel Color** — 12 presets + `↺ Default` + hex input

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

### Save

- **Auto-save** 60s after last edit (`setTimeout`)
- **Ctrl+S** immediate
- Saved to `app.module._userCsoundCode`
- **Not** saved on close — if you close within 60s of last edit, code is lost

### Dirty state

`isDirty` tracks body edits only. `updateCode()` always replaces protected ranges, preserves body. `⟳` (`syncFromModule`) resets everything.

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
| `save [as <name>]` | Save |
| `load [<name>]` | Load (no arg — list) |
| `rm <name>` | Delete user module |
| `lsmod [filter]` | List user modules |
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

### Type aliases

`TYPE_ALIASES` and `JACK_TYPE_ALIASES` — единственное место, где lowercase → `ClassName` / `{ type, jackType }`. Terminal lookup через `ComponentRegistry` — не хардкодить имена.

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

### `save` / `load`

`save` uses `moduleStore.save()` (inline JS code gen — duplicates `ModulePropertiesWindow.generateModuleCode`, should be unified into `saveService`).

`load <name>` parses with:
```js
/export\s+const\s+\w+\s*=\s*(\{[\s\S]*\});?\s*$/m
```
then `app.restoreModuleFromData(moduleData, dsp_code)`.

⚠️ `load` must **not** call `syncFromModule()` after `restoreModuleFromData()` — wipes DSP body.

## Module save / load

### Save

- Toolbar `💾 Save` → `app.propertiesWindow.saveModule()`
- Terminal `save` → inline in `TerminalPanel._cmdSave`

Both call `moduleStore.save(name, jsCode, dspCode)`.

`jsCode`:
```js
export const NameModule = {
    type: 'Name', typeID: 999, defaultParams: [],
    displayName: 'Name', gridHeight: N,
    originalName: 'Name', tooltip: 'Name',
    customColor: '#2a2a2a' | null,
    params: [...], inputs: [...], outputs: [...], components: [...]
};
```

`dspCode` = `app.module._userCsoundCode` OR `app.codeViewerWindow.getCode()`.

### Load

- Toolbar `📂 Load` → `uiManager.showLoadDialog()`
- Terminal `load` → list / `load <name>`

Both → `restoreModuleFromData(moduleData, dspCode)`:

1. Clear `components[]`, reset `_nextComponentId`
2. Resize module from `gridHeight`
3. `ComponentRegistry.deserializeComponents` (with `mappingTable`)
4. Center on canvas
5. Code Viewer:
   - `cv.editor.value = dspCode`
   - `cv._lastValidBody = null`
   - `cv._rebuildStructure()` — reference from model
   - `cv._rebuildStructureFromCurrent()` — cache from `editor.value`
   - `cv._updateGutter()` / `cv._updateHighlight()`
   - **NOT** `syncFromModule()` (would wipe body)

### Storage

- **Web:** localStorage (`csmodular:user_modules`, `csmodular:user_module:<name>`)
- **Tauri:** `~/Documents/CsModular/modules/user/<name>.js` + `~/Documents/CsModular/csound/modules/user/<name>.txt`

`moduleStore` singleton picks backend lazily via `isTauri()`.

### Round-trip preserves

- `mappingTable` on `Knob`/`Slider`
- Multi-position labels on `ButtonFlat`/`ButtonRadio`/`ButtonIncDec`
- Default index/state on button-likes
- `TextLabel` text, fontSize, color
- DSP body (protected structure rebuilt around it)

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
12. **`save` uses `getCode()`** (live editor content), not `_userCsoundCode`.
13. **`_cmdNew` / `Toolbar._onNew` must reset `_userCsoundCode`** and rebuild code panel (`clearModule({ title, resetColor })`). Otherwise old DSP body leaks into "new" module.
14. **`rm` ≠ `del`** in terminal `switch` — `rm`/`remove` for user modules, `del`/`delete` for components.

## Known issues

- `TerminalPanel._cmdSave` duplicates `ModulePropertiesWindow.generateModuleCode`
- `ModulePropertiesWindow` / `ComponentPropertiesWindow` headless — delete when `PropertiesPanel` covers all cases
- Code Viewer no undo/redo (browser-default for `<textarea>`)
- `DockLayout` no collapse, no tabs (only Properties has tabs)
- No virtualized highlight — may lag on very large code
- Terminal no autocomplete
- `PropertiesPanel._render()` uses `style.cssText +=` — accumulates
- `TerminalPanel._cmdSet(mappingTable)` calls `updateCode()`, `PropertiesPanel` mapping-select doesn't — unify
- Context menu still has `Change Color` — should be removed (color in Properties)
- Old modules lack `mappingTable` on `Knob`/`Slider` — re-assign and re-save

## Roadmap

**Short:**
- Remove `Change Color` from context menu
- Terminal: autocomplete, `!!`, `history`
- Unify save service (one place: Toolbar / Terminal / Properties)
- Fix `PropertiesPanel._render()` `cssText +=`
- `PropertiesPanel` mapping-select: call `updateCode()`

**Mid:**
- CodeMirror 5 or 6 (protected ranges as `readOnly` marks)
- Collapse panels in `DockLayout`
- Editor undo/redo (separate from main app)
- Snapshot / restore in terminal
- `led_peak` UDO variant with `abs()`

**Long:**
- Component grouping (visual)
- Live preview (`preview` command → send UDO to main app)
- Macro recording in terminal
- Multi-select in Properties
