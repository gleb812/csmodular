# AI Context — CsModular

This document is a short description of the system for the AI assistant.
Goal: reduce onboarding time to 5 minutes.

## What it is

**CsModular** — modular sound synthesis environment built on Csound.
Runs in the browser **and** as a native desktop app (Tauri).
The user assembles a patch from modules, connects them with cables, hears the result.

## Stack

- **Frontend**: vanilla JS (ES modules), Vite
- **Audio**: `@csound/browser` 6.18.7
- **Desktop shell**: Tauri 2.x (Rust)
- **Storage**:
  - `src/api/moduleStore.js` — unified interface for user modules
  - Web: IndexedDB / localStorage (planned)
  - Tauri: filesystem via `@tauri-apps/plugin-fs`
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

## Main classes

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
| `moduleStore` | `src/api/moduleStore.*.js` | User module storage (Tauri fs / web stub) |
| `Theme`, `themeStore`, `currentTheme` | `src/theme/*.js` | Theme system: classic / LCD presets |

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

### Creating a module

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

`src/api/index.js` exposes a `moduleStore` singleton. It picks the implementation lazily:

- **Tauri** → `src/api/moduleStore.tauri.js` (via `@tauri-apps/plugin-fs`)
- **Web** → `src/api/moduleStore.web.js` (currently a stub; IndexedDB planned)

API:

```js
moduleStore.list()                              // → string[] (module names)
moduleStore.load(name)                          // → { name, code, dsp_code } | null
moduleStore.save(name, code, dspCode)           // → boolean
moduleStore.remove(name)                        // → boolean
moduleStore.isUserModule(name)                  // → boolean
```

**Platform detection**: `isTauri()` checks for `__TAURI_INTERNALS__` in `window`.

## Tauri configuration

- `src-tauri/tauri.conf.json` — window config, bundle targets, `frontendDist: "../dist"`
- `src-tauri/capabilities/default.json` — permissions. **Important**: `windows` list must include **all** window labels that need fs access (e.g. `["main", "editor"]`)
- `src-tauri/src/lib.rs` — Tauri builder with `.plugin(tauri_plugin_fs::init())`

## Keyboard shortcuts

- `Space` — open main context menu (add module)
- `Space + drag` — pan the world
- `Ctrl + wheel` — zoom
- `Wheel` — vertical scroll
- `Shift + wheel` — horizontal scroll
- `D` (or `В` on Russian layout) — toggle Design Settings panel
- `Delete` — delete selected module
- `Escape` — deselect module / close menus
- `Right click` on module — open Module Context Menu (color picker, layer switch, delete)
- `Right click` on jack — open Jack Context Menu
- `Right click` on empty space — open main Context Menu

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

## Known issues (short)

- Variant switching not yet wired to UI (parsing done, switching not)
- `CsoundEngine._ledValues` not cleared on `stop()`
- `ComponentPropertiesWindow` opens only via button
- Web `moduleStore` is a stub — user modules don't persist in browser yet
- `LayerManager` still has some dead divider code (`updateLayerSizes`, `drawLayerGrid`, `updateGridCache`)
- `main.js` still has `updateCanvasSize` (dead code referencing `this.divider`)
- `loadAvailableModules` in `main.js` still uses `fetch('/api/list-user-modules')` (legacy)

## TODO (short)

- Web `moduleStore` via IndexedDB
- Variant switching: `k` ↔ `a` module opcode based on incoming cable types
- Jack recoloring on variant switch
- Split rendering into 4 canvas layers (overlay, bg, modules, cables)
- Replace `getControlChannel` with `channelPtr` in `CsoundEngine`
- Undo/Redo
- Tests
- Finish clean-up of dead divider code
- Custom background upload (image file input)
- Cable visual width per type (already partially done)

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
