
```markdown
# AI Context — CsModular

This document is a short description of the system for the AI assistant.
Goal: reduce onboarding time to 5 minutes.

## What it is

**CsModular** — modular sound synthesis environment built on Csound.
Runs in the browser **and** as a native desktop app (Tauri).
The user assembles a patch from modules, connects them with cables, hears the result.

Two entry points:
- **`index.html`** → main app (patch building, playback)
- **`editor.html`** → Module Editor (design custom modules)

## Stack

- **Frontend**: vanilla JS (ES modules), Vite
- **Audio**: `@csound/browser` 6.18.7
- **Desktop shell**: Tauri 2.x (Rust)
- **Storage**:
  - `src/api/index.js` — lazy `moduleStore` singleton
  - Web: `localStorage` (`moduleStore.web.js`)
  - Tauri: filesystem via `@tauri-apps/plugin-fs` (`moduleStore.tauri.js`)
    - `~/Documents/CsModular/modules/user/*.js`
    - `~/Documents/CsModular/csound/modules/user/*.txt`
- **Csound code**: UDO files in `public/csound/modules/*.txt`
- **Scripts**: Python patchers in `scripts/` (params, mapping tables, NM2 cleanup)

## Key entities

### Patch

Set of modules + cables. Saved to JSON. Loaded via `PatchLoader`.

### Module (in UI)

Visual block with components. Consists of:

- **JS description** (in `modules/` or user storage)
- **UDO file** (in `public/csound/modules/` or user storage)
- An instance of `Panel` with `components`

**Every module has a `layer` attribute** — `'voice'` (default) or `'fx'`.
- Voice modules are triggered per polyphony voice.
- FX modules are global (reverb, master compressor, etc.).
- **Cables are only allowed within one layer** — voice ↔ voice, fx ↔ fx.
- Layer can be changed via **right-click → Layer → Voice / FX** in `ModuleContextMenu`.

### Module (JS description)

```js
{
    type: 'Zgen',                    // opcode name (Csound identifier)
    typeID: 999,                     // for UDO file lookup (999.txt for user)
    displayName: 'Zgen',             // UI name — can contain spaces, dashes, etc.
    gridHeight: 3,
    params: [1, 2],                  // component IDs passed to opcode (in xin order)
    inputs: [3],                     // component IDs of Input-jacks
    outputs: [4, 5],                 // component IDs of Output-jacks
    components: [
        { componentType: 'Knob', id: '1', ... },
        { componentType: 'Output', id: '4', ... },
        { componentType: 'LED', id: '6', sourceComponentId: '4', ledType: 'rms' },
        // ...
    ]
}
```

**Important**: `type` is the Csound-valid identifier. `displayName` is only for UI. **Never use `displayName` or `title` in Csound variable names, chnget channels, or opcode calls** — only `type` / `jsonName`.

**params order**: matches the order in which components appear in the `components` array — **not sorted by id**. Patcher `scripts/patch_params.py` regenerates `params` for NM2 modules.

### UDO file (Csound)

```csound
opcode Zgen, 0, kkk
kParam1, kParam2, kOut1 xin     ; order = order in params+inputs+outputs
  ; ... DSP ...
  zaw aResult, kOut1
endop
```

Rule: `params + inputs + outputs` in this order gives the order of `xin` arguments.

**Multiple variants**: some NM2 modules have more than one opcode in the file. A variant mechanism (parsing `;@ ins` / `;@ outs` headers) is implemented via `CsoundGenerator._parseVariants()`.

### Cable

Connection Output → Input. Stores the bus number in `CsoundGenerator._cableBusMap`.

### Zak space

Csound mechanism for inter-module communication. Each output writes to its own zak-bus, each input reads from a zak-bus.
**Note**: audio-bus and control-bus are **separate spaces** (numbers do not collide).

### Converters (strict inputs)

When a cable's source type differs from the destination input type, a converter is inserted **before the receiving module's call**:

- `K2A <sourceControlBus>, <newAudioBus>` — control → audio
- `A2K <sourceAudioBus>, <newControlBus>` — audio → control

Bus allocation in `CsoundGenerator._prepareConverters()`.
Line insertion in `CsoundGenerator.formatModuleLine()`.

## Main classes (main app)

| Class | File | Role |
|-------|------|------|
| `ModularSystem` | `main.js` | Main coordinator (Canvas, layers, animation) |
| `ModuleFactory` | `src/ModuleFactory.js` | Creates modules from JS descriptions |
| `PatchManager` | `src/PatchManager.js` | Cables management |
| `PatchLoader` | `src/PatchLoader.js` | Load/save patches |
| `LayerManager` | `src/managers/LayerManager.js` | voice/fx layer arrays, grid, collision checks |
| `EventManager` | `src/managers/EventManager.js` | All mouse events, pan, zoom |
| `UIManager` | `src/managers/UIManager.js` | Control panel (left side) |
| `DesignSettingsPanel` | `src/ui/DesignSettingsPanel.js` | Theme editor (opened with `D` or 🎨 button) |
| `CsoundGenerator` | `src/csound/CsoundGenerator.js` | Assembles ORC from modules and cables |
| `CsoundEngine` | `src/csound/CsoundEngine.js` | Manages the Csound instance |
| `MappingTables` | `src/csound/MappingTables.js` | Loads `value_maps.json` for `;@ map` |
| `Input`, `Output` | `src/components/*.js` | Jacks (have `.type` — `'audio'` / `'control'` / `'logic'`) |
| `Cable` | `src/Cable.js` | `fromJack.type` is the source of truth for cable type |
| `moduleStore` | `src/api/index.js` | User module storage (lazy singleton) |
| `Theme`, `themeStore`, `currentTheme` | `src/theme/*.js` | Theme system: classic / LCD presets |

## Module Editor

**Separate HTML entry**: `editor.html` → `editor/editor.js` → `EditorApp`.

Opens in its own window (Tauri) or tab (web). Provides an **IDE-style workspace**
for designing custom modules visually.

### Layout — fixed dock

Resizable splitters + presets (`Default`, `Code`, `Canvas`). Sizes persist in
`localStorage` under `csmodular:editor-layout`.

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

### Editor classes

| Class | File | Role |
|-------|------|------|
| `EditorApp` | `editor/EditorApp.js` | Main editor controller |
| `EditorPanel` | `editor/EditorPanel.js` | Module "panel" on canvas (title, size, color) |
| `ComponentRegistry` | `editor/ComponentRegistry.js` | **Single source of truth** for all components |
| `CodeViewerWindow` | `editor/CodeViewerWindow.js` | Csound code editor with syntax highlight |
| `ModulePropertiesWindow` | `editor/ModulePropertiesWindow.js` | **Headless** (legacy) — provides `saveModule()` / `collectModuleData()` API |
| `ComponentPropertiesWindow` | `editor/ComponentPropertiesWindow.js` | **Headless** (legacy) — provides `_showMappingBrowser()` |
| `DockLayout` | `editor/ui/DockLayout.js` | Split-pane container with presets |
| `Toolbar` | `editor/ui/Toolbar.js` | New / Load / Save + layout presets |
| `PropertiesPanel` | `editor/ui/PropertiesPanel.js` | Module / Component tabs |
| `TerminalPanel` | `editor/ui/TerminalPanel.js` | Command terminal |
| `ContextMenu` | `editor/ui/ContextMenu.js` | Generic context menu (with submenus) |
| `ModuleContextMenu` | `editor/ui/ModuleContextMenu.js` | Editor-specific menu builder |

### ComponentRegistry — single source of truth

Each component type is described **once** in `editor/ComponentRegistry.js`:

```js
Knob: {
    label: 'Knob',
    category: 'controls',
    paletteSize: { width: 24, height: 24 },
    isParametric: true,       // goes into params[]
    isJack: false,            // or 'in' / 'out'
    create(opts),             // factory
    serialize(comp),          // → JS module data
    deserialize(data, ctx),   // ← JS module data
    csoundPorts(comp),        // { kind, dir } | null
}
```

Used by:
- `ModulePropertiesWindow.collectModuleData()` — serialization
- `EditorApp._createComponentFromData()` — deserialization
- `CodeViewerWindow.generateCsoundCode()` — Csound port discovery
- `ModuleContextMenu._componentSubmenu()` — context menu
- `TerminalPanel` — terminal commands
- `PropertiesPanel` — palette sizes

**Adding a new component type = adding one entry to the registry.**

Helpers exported:
- `serializeComponents(components)` → array of data
- `deserializeComponents(dataArray, ctx)` → array of instances
- `collectParamIds(components)` → params[] (order preserved, no sort)
- `collectPorts(components)` → { inputs, outputs }
- `getCsoundPorts(component)` → port or null
- `getByCategory()` → for palette generation
- `createComponent(type, opts)` → factory
- `isParametric(component)`, `getJackDir(component)`, `getTypeOf(component)`

### Properties panel — tabs

- **Module** — name, height (grid cells), color (preset buttons + hex input)
- **Component** — schema-driven fields from `static getPropertySchema()`

Clicking a component in canvas switches the tab to Component. Clicking empty canvas
keeps the tab, shows "No component selected".

### Terminal — command DSL

Persistent at right-bottom. Commands:

| Command | Description |
|---|---|
| `add <type> [x y]` | Add component |
| `in` / `out` | Shorthand for `add input` / `add output` |
| `ls [type] [-l]` | List components |
| `del <id\|type\|range>...` | Delete (`del 3`, `del knob`, `del 3 4 5`, `del 3..7`) |
| `mv <id> <x> <y>` | Move (absolute) |
| `mv <id> +dx +dy` | Move (relative) |
| `map <id> <table>` | Bind mapping table (or unset) |
| `align <ids...> l\|r\|u\|d` | Align |
| `distr <ids...> h\|v` | Distribute evenly |
| `grid on\|off\|N` | Grid toggle / step |
| `new` | Clear module |
| `save [as <name>]` | Save |
| `load <name>` | Load |
| `stats` | Statistics |
| `help [cmd]` | Help |

Command history via `↑` / `↓`. All commands go through `ComponentRegistry`.

### Code Viewer

- Live-generated `opcode` code from module components
- **Syntax highlight** via overlay method: transparent `<textarea>` on top of
  highlighted `<div>` (`#code-highlight-layer`), pointer-events: none
- Highlight rules in `_highlightCsound()` (single regex pass):
  - `;@ map ...` → pink bold
  - `;...` comments → grey italic
  - `opcode` / `endop` / `instr` / `xin` / ... → blue bold
  - numbers → yellow
  - strings → light blue
  - variables (`kFoo`, `aFoo`, `giFoo`, ...) → lavender
- **Line numbers** in `#code-gutter`, synced via `_syncScroll()`
- Font size controls `[A] [A]` — affects textarea, gutter, highlight layer
- `Ctrl+S` — save code, `⟳` — resync from module, `📋` — copy

### Editor keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + wheel` / `+` / `-` | Zoom canvas |
| `0` | Reset zoom (only when canvas has focus, not in inputs) |
| `Escape` | Cancel current drag |
| `Delete` | Delete selected component |
| `Right click` on canvas | Context menu (Add / Rename) |
| `Right click` on component | Context menu (Properties / Delete) |
| `Ctrl + S` in editor | Save Csound code |
| `↑` / `↓` in terminal | Command history |
| `Tab` in code editor | Insert 4 spaces |

**⚠️ Keyboard shortcut rule**: global handlers must skip when `e.target` is
`<input>`, `<textarea>`, or `contentEditable`. Otherwise users can't type `0`
(which used to trigger `resetZoom()`).

## World model (infinite space)

The canvas **fills the browser window**. There are no fixed bounds for the working area — the world is **infinite**.

- **Pan**: middle mouse button OR `Space + drag`
- **Zoom**: `Ctrl + mouse wheel` (zooms around cursor)
- **Vertical scroll**: `mouse wheel`
- **Horizontal scroll**: `Shift + mouse wheel`
- **Grid**: shows only when `showGrid === true`, always aligned to world grid

There is **no physical divider** between voice and fx. The distinction is **logical** (see `module.layer`), not spatial.

### Auto-layout for new FX modules

When a new FX module is added (via `addNewModuleAtPosition`), it is placed **below the lowest voice module** using `_getFxFloorY()` — this ensures voice modules stay on top.

### Loading FX modules from JSON

When loading a patch, FX modules get their `vpos` shifted down by `maxVoiceY + 10` (via `_fxStartY` computed in `PatchLoader.loadPatch`). This keeps voice and fx from overlapping visually. **Reverse transformation is not needed** — we don't export back to pch2.

## Data flow

### Creating a module (main app)

1. `main.js` → `ModuleFactory.createModule(type, ...)` → `Panel`
2. `CsoundGenerator.addModule({ typeId, instanceId, instanceName, layer, ... })`
   - **`instanceName` MUST be the module `type` (Csound-valid)**, not the UI title
3. On recompile → ORC is regenerated

### Adding a cable

1. `PatchManager.addCable(from, to)` → `Cable`
2. `CsoundGenerator.addCable(cable)` → bus assigned in `_cableBusMap`
3. On recompile → ORC is regenerated

### Changing module layer

Via `ModuleContextMenu.setLayer(newLayer)`:
1. Collect and remove all cables (with confirmation if any exist)
2. `LayerManager.removeModuleFromLayer(module)` — searches in **all** layers
3. `CsoundGenerator.removeModule(...)` for the old layer
4. `module.layer = newLayer`
5. `LayerManager.addModuleToLayer(module, newLayer)`
6. `CsoundGenerator.addModule({ ..., layer: newLayer })`
7. Force redraw + debounced recompile

### ORC generation

`CsoundGenerator.generateOrc()` assembles:

1. `_prepareConverters()` — finds type mismatches, allocates buses
2. `_collectMappingFtgens()` — ftgen for `;@ map` tables used in UDOs
3. UDO section (from `includes`)
4. `instr 1` (voice) — module calls + converters + `led_rms`
5. `instr 2` (fx) — same
6. Standard `instr 3`, `instr 4` (MIDI, offline)

Then `CsoundEngine.init()` → `compileOrc` + `readScore` + `start`.

### Recompile (hot reload)

`CsoundEngine.recompile()` uses **`reset()` + `setOption('-odac')` + `compileOrc` + `readScore` + `start`** — the instance is **not destroyed**, only reset. ~5x faster than full restart, keeps the AudioContext alive.

After recompile, `_resyncAllControls()` pushes all current UI-component values back to Csound.

### LED

- LED is bound to an Output/Input (`sourceComponentId`)
- `CsoundGenerator` generates `led_rms <bus>, "<channel>"`
- `CsoundEngine.registerLedChannel("<channel>")` on module creation
- `CsoundEngine` polls channels via `getControlChannel` every 50 ms
- `LED.draw` reads value from `CsoundEngine.getLedValue(channel)`

### Module commutation

Via zak:

- Each Output has its own bus (assigned when a cable is created)
- Module writes `zaw aOut, kOut` in opcode
- Cable connects bus of input and output

**Rule: cables only within one layer** (voice ↔ voice, fx ↔ fx). Cross-layer is forbidden (checked in `PatchManager.canConnect`).

### Cable type detection

`CsoundGenerator._getCableType(cable)`:

1. **Priority**: `cable.fromJack.type` (`'audio'` / `'control'`)
2. Fallback: `cable.toJack.type`
3. Last resort: color-based (legacy NM2 palette)

**Important**: color is **visual only**. Custom cable coloring is supported, so color must never be the primary type source.

## Theme system

`src/theme/` contains:

- `defaults.js` — `DEFAULT_THEME`, `LCD_COLOR_PRESETS`, `BACKGROUND_PRESETS`
- `themeStore.js` — load/save via localStorage (singleton `themeStore`)
- `Theme.js` — class that wraps settings and provides render-time getters:
  - `isLcd`, `isClassic`, `getLineColor`, `getAccentColor`, `getAccentAlpha`, `getSurfaceColor`, `getElementBgColor`, `getTooltipBgColor`, `getActiveFillColor`, `getInactiveOutlineColor`, `getCableWidth`, `getCableColor`, `shouldGlowCable`, `applyGlow`, `clearGlow`, `lineWidth`, `getBackgroundImage`, `isParallaxEnabled`, `getParallaxStrength`, `getJackStyle`, `_hexToRgba`, `_darken`
- `currentTheme.js` — singleton `getCurrentTheme()` / `setCurrentTheme()` / `initCurrentTheme()`; **also exposes `window.__theme__` for console debugging** (get/set/init)

### Presets

- **`classic`** — original NM2-style UI (colored panels, no glow)
- **`lcd`** — Casio-style monochrome LCD (transparent panels, glowing lines, configurable accent color)

### Applying theme

Called via `DesignSettingsPanel.applyAndSave()`:
1. `setCurrentTheme(new Theme(settings))`
2. `themeStore.save(settings)`
3. `system.applyBackgroundFromTheme()` — updates `#parallax-bg` element
4. `system.forceRedraw()`

**Important:** all components (`Panel`, `Knob`, `Slider`, `LED`, `ButtonText`, `ButtonRadio`, `ButtonIncDec`, `ButtonFlat`, `Input`, `Output`, `Cable`, `TextLabel`, `TextField`, `TextEdit`, `Line`, `SVG`, `MiniVU`, `LevelShift`, `PartSelector`) use `getCurrentTheme()` inside `draw()`.

**Do not use top-level `await import(...)`** anywhere that runs during page init — use the lazy pattern (see `src/api/index.js`).

## Background & Parallax

- `#parallax-bg` in `index.html` — a `<div>` that fills the viewport with `background-size: cover`
- `main.js.applyBackgroundFromTheme()` sets either `backgroundImage` (URL) or `backgroundColor` (solid), based on `_isColorValue()` check
- `BACKGROUND_PRESETS` in `defaults.js` mixes solid colors (`#000000`, `#1a1a1a`, `#333333`) and image URLs (`/backgrounds/*.jpg`)
- Parallax: mouse movement shifts the background by `parallaxStrength` px, smoothed with `parallaxSmoothing`

## User module storage

`src/api/index.js` exposes a **lazy** `moduleStore` singleton. It picks the implementation on first call:

- **Tauri** → `src/api/moduleStore.tauri.js` (via `@tauri-apps/plugin-fs`)
- **Web** → `src/api/moduleStore.web.js` (uses `localStorage`)
- **Fallback** → in-memory stub (returns empty / false)

API:

```js
moduleStore.list()                              // → string[] (module names)
moduleStore.load(name)                          // → { name, code, dsp_code } | null
moduleStore.save(name, code, dspCode)           // → boolean
moduleStore.remove(name)                        // → boolean
moduleStore.isUserModule(name)                  // → boolean
moduleStore.invalidateCache()                   // sync
```

**Web storage keys**:
- `csmodular:user_modules` — JSON array of names
- `csmodular:user_module:<name>` — JSON `{ code, dsp_code }`

**Platform detection**: `isTauri()` checks for `__TAURI_INTERNALS__` in `window`.

**No top-level await** — lazy init pattern keeps module graph clean.

## Tauri configuration

- `src-tauri/tauri.conf.json` — window config, bundle targets, `frontendDist: "../dist"`
- `src-tauri/capabilities/default.json` — permissions. **Important**: `windows` list must include **all** window labels that need fs access (e.g. `["main", "editor"]`)
- `src-tauri/src/lib.rs` — Tauri builder with `.plugin(tauri_plugin_fs::init())`

## Keyboard shortcuts (main app)

- `Space` — open main context menu (add module)
- `Space + drag` — pan the world
- `Ctrl + wheel` — zoom
- `Wheel` — vertical scroll
- `Shift + wheel` — horizontal scroll
- `D` (or `В` on Russian layout) — toggle Design Settings panel
- `Delete` — delete selected module
- `Escape` — deselect module / close menus
- `Right click` on module — Module Context Menu (color picker, layer switch, delete)
- `Right click` on jack — Jack Context Menu
- `Right click` on empty space — main Context Menu

## Csound name sanitization

Any string that goes into a Csound identifier (variable name, chnget channel, opcode name) must be safe. Use `sanitizeCsoundName()` from `src/utils/csoundName.js`:

- `[^a-zA-Z0-9_]` → `_`
- Prefix `_` if starts with a digit

**Primary defense**: always use `type` / `jsonName`, never `displayName` / `title`.

## NM2 legacy and params

Old NM2 modules have `type` and `displayName` that may differ (e.g. `type: 'Out2'`, `displayName: '2-Out'`). The `type` is always safe; `displayName` is only for UI.

The `params` array lists **interactive component IDs in the order they appear in the opcode's `xin`** — and this is **the order in which components appear top-down in the `components` array** (not sorted by id).

Patcher `scripts/patch_params.py` regenerates `params` for all NM2 modules:

- `PARAM_TYPES = [Knob, Slider, ButtonFlat, ButtonText, ButtonRadio, ButtonIncDec, TextEdit]` — go to `params`
- `MODE_TYPES = [PartSelector, LevelShift]` — go to `modes`

## Development rules

1. **Do not modify UDO files** — no `chnset`/`chnget` inside a module's opcode
2. Parameters via `chnget` — inside `instr 1/2`, outside opcode
3. LED via external UDO — `led_rms` called in `instr 1/2` after the module
4. `ConnectorIndex` — legacy from NM2 import, not used
5. User-modules always in `user/` — `csound/modules/user/` and `modules/user/`
6. Each user-UDO — one opcode per file
7. `params`/`inputs`/`outputs` — fixed order, matches `xin` in UDO
8. **Csound names always from `type` / `jsonName`**, never from `displayName` / `title`
9. **No direct `fetch('/api/...')`** — use `moduleStore`
10. **Don't block module graph with top-level await** in entry points
11. **All draw code uses `getCurrentTheme()`** — never hardcode colors outside of `classic` branches
12. **`removeModuleFromLayer` searches ALL layers** — never assume `module.layer` is correct
13. **`getLayerAtPoint` always returns `'voice'`** — new modules are Voice by default
14. **Keyboard shortcuts must skip when focus is in an `<input>` / `<textarea>` / `contentEditable`** — see `EditorApp.setupEvents()`
15. **Editor component serialization goes through `ComponentRegistry`** — do not hand-roll `if/else` on `constructor.name` anywhere
16. **`params` order = order in `components` array** — never sort

## Known issues (short)

- Variant switching not yet wired to UI (parsing done, switching not)
- `CsoundEngine._ledValues` not cleared on `stop()`
- `ModulePropertiesWindow` / `ComponentPropertiesWindow` are **headless** in editor — they exist only for `saveModule()` and `_showMappingBrowser()`. Will be fully replaced by `PropertiesPanel` eventually
- `TerminalPanel._cmdSave` duplicates JS code generation from `ModulePropertiesWindow.generateModuleCode` — should be unified
- `add` in terminal always uses `audio` jack type for Input/Output — control jacks only via UI
- `LayerManager` still has some dead divider code (`updateLayerSizes`, `drawLayerGrid`, `updateGridCache`)
- `main.js` still has `updateCanvasSize` (dead code referencing `this.divider`)
- `loadAvailableModules` in `main.js` still uses `fetch('/api/list-user-modules')` (legacy)
- Module Editor context menu still has `Change Color` — should be removed (color lives in Properties)
- Terminal has no autocomplete
- Code Viewer line numbers / highlight not yet virtualized (fine for typical module sizes, may lag on very large code)

## TODO (short)

**Main app:**
- Variant switching: `k` ↔ `a` module opcode based on incoming cable types
- Jack recoloring on variant switch
- Split rendering into 4 canvas layers (overlay, bg, modules, cables)
- Replace `getControlChannel` with `channelPtr` in `CsoundEngine`
- Custom background upload (image file input)
- Cable visual width per type (already partially done)
- Finish clean-up of dead divider code
- Fix `loadAvailableModules` to use `moduleStore`

**Module Editor:**
- Remove `Change Color` from context menu
- Terminal: autocomplete, `history`, `!!` repeat, `add in c` / `out c` for control jacks
- Terminal: unify JS code generation with `ModulePropertiesWindow`
- Remove legacy `ModulePropertiesWindow` / `ComponentPropertiesWindow` once `PropertiesPanel` is full
- CodeMirror (5 or 6) instead of textarea + overlay — proper undo, search, autocomplete
- `DockLayout`: collapsible panels, tabs in properties for multiple components
- Component grouping / align/distribute UI (already in terminal, not in UI)
- `preview` command — send generated UDO to main app for live playback
- Snapshot / undo-redo in editor

**Shared:**
- Web `moduleStore` — IndexedDB instead of `localStorage` (for larger modules / no quota issues)
- Tests
- Undo/Redo in main app too

## How to start working

Before any change:

1. Ask the user about the goal of the change
2. Clarify which files will be affected
3. Check if there are related issues in TODO
4. Propose the minimal patch

Style:

- Russian for the user, **English for public docs**
- No "let's try" — concrete edits
- Show diff or full methods
- Do not change things not asked about
```
