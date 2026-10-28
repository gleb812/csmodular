
# AI Context — CsModular

Short system description for AI assistants. **Goal: 5 minutes to productive work.**

## What it is

**CsModular** — modular sound synthesis on Csound.
Browser + native desktop (Tauri). User builds a patch from modules, connects
with cables, hears the result.

Two entries:
- **`index.html`** — main app (patch building, playback)
- **`editor.html`** — Module Editor (design custom modules)

Debug tools: **Oscilloscope** (multi-channel waveform viewer for cables) and
**LED / MiniVU** (per-module level indicators).

## Stack

- **Frontend:** vanilla JS (ES modules), Vite
- **Audio:** `@csound/browser` 7.0.0-beta33
- **Desktop:** Tauri 2.x (Rust)
- **Storage:** `src/api/index.js` — lazy `moduleStore` singleton
  - Web: `localStorage` (`moduleStore.web.js`)
  - Tauri: `@tauri-apps/plugin-fs` (`moduleStore.tauri.js`)
    - `~/Documents/CsModular/modules/user/*.js`
    - `~/Documents/CsModular/csound/modules/user/*.txt`
- **UDO:** `public/csound/modules/*.txt`
- **Scripts:** `scripts/` (Python NM2 patchers)

## Key entities

### Patch
Modules + cables → JSON. Loaded via `PatchLoader`.

### Module (JS description)

```js
{
    type: 'Zgen',            // Csound opcode name (safe identifier)
    typeID: 999,             // for UDO file lookup (999.txt / user/Zgen.txt)
    displayName: 'Zgen',     // UI only — NEVER use in Csound names
    gridHeight: 3,
    params: [1, 2],          // component IDs in xin order (order in components[])
    inputs: [3],
    outputs: [4, 5],
    components: [
        { componentType: 'Knob', id: '1', ... },
        { componentType: 'Output', id: '4', ... },
        { componentType: 'LED', id: '6', sourceComponentId: '4', ledType: 'rms' },
        { componentType: 'MiniVU', id: '7', sourceComponentId: '3' },
    ],
}
```

**`params[]` order** = **order in `components[]`** (NOT sorted by id). Paired with UDO `xin` order.
`CsoundGenerator.formatModuleLine` reads **`moduleDef.params`** directly (not recalculated from components).
`defaultParams`, `defaultMode` — optional initial values (literal numbers), used only when `params` is empty.

**Every module has `layer`** — `'voice'` (default) or `'fx'`. Cables only within same layer.

### UDO file

```csound
opcode Zgen, 0, kkk
kParam1, kParam2, kOut1 xin     ; order = params + inputs + outputs
  ; ...
  zaw aResult, kOut1
endop
```

**Multiple variants:** some NM2 modules have several opcodes per file, parsed via `;@ ins` / `;@ outs` / `;@ variant` headers (`CsoundGenerator._parseVariants()`). Active variant: `moduleData._activeVariant`, computed by `_prepareVariants()`.

### Jack types & colors

Every `Input`/`Output` has **`type`** and **`bandwidth`**:

| `type` | Color | Csound rate | Family |
|---|---|---|---|
| `audio` | red `#ef4444` | `a` | `{audio, control}` |
| `control` | blue `#3b82f6` | `k` | `{audio, control}` |
| `logic` | yellow `#fde047` | `k` | `{logic, logicAudio}` |
| `logicAudio` | orange `#f97316` | `a` | `{logic, logicAudio}` |

`logic` / `logicAudio` — **NM2 visual only**, both are `control` in Csound.

**`bandwidth`** — per-jack, `'static'` | `'dynamic'` (default `'dynamic'`).
`static` (alias **`strict`** in UDO — `;@ strict 0 0 1`) — jack never changes its `type`.
`dynamic` — may switch **within its family only**:

- `audio ↔ control`
- `logic ↔ logicAudio`

Cross-family transitions (`logic ↔ audio`, `control ↔ logicAudio`, ...) are **forbidden** — jack stays its color, converter inserted in ORC.

**Colors:** single source of truth `CABLE_COLORS` in `src/constants.js`. `BaseJack.getEffectiveColor()` = `CABLE_COLORS[this.type]`. **Jack color always follows its own `type`, never the cable's color.**

Helpers in `constants.js`: `TYPE_FAMILY`, `canTransition(src, dst)`, `csoundRateOf(jackType)`.

### Cable
Output → Input. Bus stored in `CsoundGenerator._cableBusMap[cable.id]`.
**`cable.typeColor`** = `CABLE_COLORS[cable.fromJack.type]` (source of truth).
**`cable.visualColor`** = user override (visual only, `null` = use typeColor).
Color is visual only; **real type** for converters = `_getCableType(cable)` = `csoundRateOf(_resolveSourceType(cable))`.

### Zak space
Csound inter-module communication. Audio and control buses — **separate spaces** (numbers don't collide).

### Converters

Inserted in `_prepareConverters()` **before the receiving module call**, only when **Csound rate** differs:

- `K2A <srcControlBus>, <newAudioBus>` — `control`/`logic` → `audio`/`logicAudio`
- `A2K <srcAudioBus>, <newControlBus>` — `audio`/`logicAudio` → `control`/`logic`

**No converter** if `csoundRateOf(src) === csoundRateOf(dst)` — i.e. `logic ↔ logicAudio`, `control ↔ logic`, `audio ↔ logicAudio` are all fine (same rate in Csound).

**`static` jack + mismatch** → converter inserted, **jack stays its color**.
**`dynamic` jack + compatible type** → jack switches type, `_applyVariantToPanel` re-colors it and its output cables.

### Module variants

UDO may declare per-variant metadata:

```csound
;@ variant k default
;@ strict 0 0 1
;@ ins k k k
opcode Foo_k, ...
...
;@ variant a
;@ ins a a a
opcode Foo_a, ...
```

`CsoundGenerator._parseVariants()` reads `;@ ins`, `;@ outs`, `;@ variant`, `;@ strict`, `;@ default`. `_prepareVariants()` picks per-module variant:

1. Start from `defaultSuffix` (`k` or `a`).
2. If an **audio-rate** cable reaches a **non-strict** input → switch to `a`.
3. Iterate until stable (`MAX_ITER = 20`).

Variant resolution for source type uses `_resolveSourceType(cable)` — returns `logic`/`logicAudio` as-is, `audio`/`control` per active variant of the source module.

**UI sync:** `ModularSystem.recomputeVariantUI()` is called from `PatchManager.addCable` / `removeCable`:

1. `csoundGen._prepareVariants()`
2. For each panel, if `_activeVariant` changed → `_applyVariantToPanel(panel, variant)`
3. `_applyVariantToPanel` — sets `comp.type` from `_typeFromSuffix(variant.ins/outs[i], comp.originalType)`, re-colors jacks (`comp.updateCenterColor(comp.getEffectiveColor())`), re-colors **outgoing cables** (`cable.typeColor = CABLE_COLORS[sourceType]`). Incoming cables not touched (their color = their source).
4. `forceRedraw()`

## Indicators (LED / MiniVU)

**LED** — on/off level indicator (`ledType: 'rms'` default). **MiniVU** — 3-zone vertical
VU meter (green / yellow / red), `thresholdGreen` / `thresholdYellow` in 0..1.

**Binding:** each indicator has `sourceComponentId` → **any `Input` or `Output` of the same module**.
Without it the indicator is disabled (`console.warn`).

**Signal source (tap-bus):**

| Indicator on | Bus source | No cable |
|---|---|---|
| **Output** | `outletBuses[i]` (shared with audio cable) | tap-bus of the Output's type is **allocated automatically**; opcode writes into it |
| **Input** | `inletBuses[i]` (already `conv.bus` if converter) | **indicator is skipped** (by design — nothing to show) |

**Type normalization** (`_normalizeJackType`): `audio`/`logicAudio` → `audio`, `control`/`logic` → `control`.
LED reads **control** bus — audio tap gets `A2K` converter (one per tap-point, cached). MiniVU reads **audio** bus — control tap → **skipped** + warn.

**ORC order in `formatModuleLine`:** `chngetLines` → `converterLines` → `tapA2KInputLines`
→ `callLine` → `tapA2KOutputLines` → `ledLines` → `mvuLines`.

**Channel names:** `led_<instanceName>_<instanceId>_<ledId>`, `mvu_<instanceName>_<instanceId>_<compId>`.
Registered via `CsoundEngine.registerLedChannel()`, polled every 50 ms with `getControlChannel`.

**UDO:** `led_rms.txt` (`led_rms <bus>, "<channel>"`), `miniVU.txt` (`mVU_rms <bus>, "<channel>"`).
Both added to `CsoundGenerator.includes` in constructor.

## Data flow

### Creating a module
1. `ModuleFactory.createModule(type, gridX, gridY, layer)` → `Panel` (width=260 constant, gridWidth=13 constant, gridHeight from def)
2. `CsoundGenerator.addModule({ typeId, instanceId, instanceName: type, layer, ... })`
3. Recompile → ORC regenerated

**Snap on create:** `addNewModuleAtPosition` snaps `gridX/gridY` to multiples of `multX/multY` if `snap`. Collision → `findFreeSpace(..., stepX, stepY)` → snap again.
`ContextMenu.handleModuleSelect`: `snapToGrid(worldX, worldY)` first.

### Adding a cable
1. `PatchManager.addCable(from, to)` → `Cable` (`typeColor = CABLE_COLORS[from.type]`)
2. `CsoundGenerator.addCable(cable)` → assigns bus
3. `recomputeVariantUI()` (async) — recalc variants + re-color jacks/cables
4. Recompile

### Changing module layer
`ModuleContextMenu.setLayer`:
1. Remove all cables (with confirm)
2. `LayerManager.removeModuleFromLayer(module)` (searches all layers)
3. `CsoundGenerator.removeModule(...)` (old layer)
4. `module.layer = newLayer`
5. `LayerManager.addModuleToLayer(module, newLayer)`
6. `CsoundGenerator.addModule({ ...layer: newLayer })`
7. `forceRedraw` + debounced recompile

### ORC generation — `CsoundGenerator.generateOrc()`
1. `_prepareConverters()` — type mismatches, bus allocation
2. `_collectMappingFtgens()` — ftgen for `;@ map` tables
3. UDO section (from `includes`, sorted)
4. `instr 1` (voice) — module calls + converters + LED/MiniVU
5. `instr 2` (fx) — same
6. `instr 3` — MIDI filter → `gkGate`/`gkNote`; `instr 4` — offline render

Then `CsoundEngine.init()` → `compileOrc` + `readScore` + `start`.

### UDO loading — `CsoundGenerator._loadUdoByPath()`
- `user/<Name>.txt` → `moduleStore.load(name).dsp_code`
- `<id>.txt`, `led_rms.txt`, `miniVU.txt` → `fetch('/csound/modules/<path>')` with **HTML-fallback detection** (`<!DOCTYPE`/`<html` in first 200 chars → missing)

**Never** raw `fetch('/csound/modules/user/...')` — Vite SPA-fallback returns `index.html` (status 200, HTML leaks into ORC).

### Recompile (hot reload)
`CsoundEngine.recompile()` = `reset()` + `setOption('-odac')` + `compileOrc` + `readScore` + `start`. ~5x faster than full restart, AudioContext kept alive.
After: `_resyncAllControls()` pushes UI values back to Csound.

### Oscilloscope
- Right-click jack → **📊 Send to Scope** → `JackContextMenu.sendToScope()`
- `CsoundGenerator.addScopeTable(cable)` → `{ tableNum (≥9000), bus, isAudio }`
- `_recompileDebounced()` → ORC with `giScope_<N>` ftgen + `tablew`
- `CsoundEngine.registerScopeTable(cableId, tableNum)` → polls `tableCopyOut` every 33 ms
- `ScopeWindow` reads buffers each frame
- **Not persisted** in patch JSON
- `removeCable` → `removeScopeTable` + `unregisterScopeTable`

**Scope Csound code** (`_generateScopeCode()`):
```csound
giScope_<N> ftgen <N>, 0, 4096, 2, 0
; in instr 1/2 after module calls:
aScopeIdx_<N> phasor (sr / ksmps) / 4096
aScopeSig_<N> zar <bus>                         ; audio
tablew aScopeSig_<N>, aScopeIdx_<N>, <N>, 1
; or
kScopeSig_<N> zkr <bus>                         ; control
tablew kScopeSig_<N>, k(aScopeIdx_<N>), <N>, 1
```

## Grid system

World is **infinite**. Managed by `Grid` class (`src/grid/Grid.js`) as `system.grid`.

**Constants** (`src/constants.js`):
- `PANEL_WIDTH = 260` (always constant, NM2 compat)
- `BASE_STEP_X = 20`, `BASE_STEP_Y = 15`
- `PANEL_GRID_WIDTH = 13` (= 260/20)
- `NM2_HPOS_TO_GRIDX = 13` (NM2: `gridX = hpos * 13`)

**Module position:** `module.gridX/gridY` — integers in base cells. `gridWidth = 13` constant, `gridHeight` from def. Pixel: `gridX * 20`, `gridY * 15`.

**Multipliers** (`theme.settings.grid.multX/multY`, ≥ 1, default 1): grid crosses drawn with step; snap uses it. **Existing modules do NOT move when multipliers change.**

**Snap:** `grid.snapToGrid(worldX, worldY)` → `{ gridX, gridY }`, multiples of `multX/multY` if snap on. Off → nearest base cell.

**Drag:** `Panel.startDrag` / `handlePanelDrag` call `snapToGrid`, then round to multiples of `multX/multY`.

**findFreeSpace:** `LayerManager.findFreeSpace(layer, w, h, startX, startY, stepX, stepY)` — searches **only at multiples** of step. `main.js` passes `multX/multY` (snap on) or `1/1`.

**Rendering:** `Grid.draw(ctx, viewport)` draws **crosses** once per frame in `animate()` before modules, inside `translate(offsetX, offsetY) + scale(scale)`. Style: `theme.getGridStyle()` — color, size, lineWidth, glow.

## MIDI

**Chain:** Web MIDI API → `MidiManager.onMessage` → `CsoundEngine.midiMessage(status, d1, d2)` → Csound `instr 3` → `gkGate`/`gkNote`.

**`MidiManager`** (`src/midi/MidiManager.js`):
- `init()` — `navigator.requestMIDIAccess()`, **must be from click handler**
- `dispose()`, `onStateChange(cb)`, `onMessage(cb)`
- `getInfo()` → `{ state, inputCount, inputNames, lastMessage, ... }`
- `getHistory()` / `clearHistory()` — last 50 messages
- States: `'idle' | 'requesting' | 'ready' | 'denied' | 'unsupported'`

**`instr 3`** (fixed block in `CsoundGenerator`):
```csound
gkstat, gkchan, gkdata1, gkdata2 midiin
0x90 → gkGate=1, gkNote=data1
0x80 → gkGate=0
```
Velocity **ignored** (NM2 compat). Other messages pass through.

**Enabling:** click **`MI`** in BottomBar (browser gesture requirement). State in SysInfo popup (`i`).

**Requirements:** secure context; Chrome/Edge/Firefox; Linux via ALSA (`aconnect -i -o`); Tauri — macOS WKWebView has no Web MIDI (needs plugin/Rust-side).

**⚠️ Known issue:** after `recompile()` MIDI stops. `@csound/browser` doesn't recreate IPC ports after `reset()`. Error: `csoundMainRtMidiPort, this.ipcMessagePorts is undefined`. Workaround: restart Csound (`■`→`▶`).

## Main classes

| Class | File | Role |
|---|---|---|
| `ModularSystem` | `main.js` | Main coordinator (canvas, layers, animation, grid) |
| `ModuleFactory` | `src/ModuleFactory.js` | Creates modules from JS descriptions |
| `PatchManager` | `src/PatchManager.js` | Cables management, jack coloring |
| `PatchLoader` | `src/PatchLoader.js` | Load/save patches |
| `LayerManager` | `src/managers/LayerManager.js` | Voice/fx arrays, collisions, findFreeSpace |
| `Grid` | `src/grid/Grid.js` | Step, snap, crosses |
| `EventManager` | `src/managers/EventManager.js` | Mouse events, pan, zoom |
| `UIManager` | `src/managers/UIManager.js` | Left control panel |
| `DesignSettingsPanel` | `src/ui/DesignSettingsPanel.js` | Theme editor (`D`) |
| `CsoundGenerator` | `src/csound/CsoundGenerator.js` | ORC assembly |
| `CsoundEngine` | `src/csound/CsoundEngine.js` | Csound instance, LED/scope polling |
| `MappingTables` | `src/csound/MappingTables.js` | `value_maps.json` for `;@ map` |
| `Input`, `Output` | `src/components/Input.js`, `Output.js` | Jacks. `type` ∈ audio/control/logic/logicAudio, `originalType` (immutable), `bandwidth` static/dynamic, `getEffectiveColor()`, `getCsoundRate()` |
| `LED`, `MiniVU` | `src/components/*.js` | Level indicators (`sourceComponentId` → jack) |
| `Cable` | `src/Cable.js` | `fromJack.type` = source of truth for `typeColor` |
| `moduleStore` | `src/api/index.js` | User module storage (lazy singleton) |
| `Theme`, `themeStore`, `currentTheme` | `src/theme/*.js` | Classic / LCD presets |
| `MidiManager` | `src/midi/MidiManager.js` | Web MIDI API receiver |

## Module Editor

**Separate entry:** `editor.html` → `editor/editor.js` → `EditorApp`.

**Fixed dock layout**: Canvas / Code / Properties / Terminal. Splitters resize, 3 presets (`Default`, `Code`, `Canvas`), sizes in `localStorage` (`csmodular:editor-layout`).

**Editor classes:**

| Class | File | Role |
|---|---|---|
| `EditorApp` | `editor/EditorApp.js` | Controller |
| `EditorPanel` | `editor/EditorPanel.js` | Module panel on canvas |
| `ComponentRegistry` | `editor/ComponentRegistry.js` | **Single source of truth** for components |
| `CodeViewerWindow` | `editor/CodeViewerWindow.js` | Csound editor (protected structure) |
| `ModulePropertiesWindow` | `editor/ModulePropertiesWindow.js` | Headless (legacy) — `saveModule()` |
| `ComponentPropertiesWindow` | `editor/ComponentPropertiesWindow.js` | Headless (legacy) — `_showMappingBrowser()` |
| `DockLayout` | `editor/ui/DockLayout.js` | Split-pane + presets |
| `Toolbar` | `editor/ui/Toolbar.js` | New / Load / Save + presets |
| `PropertiesPanel` | `editor/ui/PropertiesPanel.js` | Module/Component tabs |
| `TerminalPanel` | `editor/ui/TerminalPanel.js` | Command terminal |
| `Toast` | `editor/ui/Toast.js` | Notifications |
| `ContextMenu` | `editor/ui/ContextMenu.js` | Generic context menu |
| `ModuleContextMenu` | `editor/ui/ModuleContextMenu.js` | Editor menu builder |

### ComponentRegistry — single source of truth

```js
Knob: {
    label: 'Knob',
    category: 'controls',       // 'controls' | 'display' | 'jacks' | 'graphics'
    paletteSize: { width: 24, height: 24 },
    isParametric: true,         // goes into params[]
    isJack: false,              // or 'in' / 'out'
    create(opts),
    serialize(comp),
    deserialize(data, ctx),
    csoundPorts(comp),          // { kind, dir } | null
}
```

**Adding a new component type = one entry in registry.** Used by: serialization, deserialization, Csound port discovery, context menu, terminal aliases, palette sizes.

Helpers: `serializeComponents`, `deserializeComponents`, `collectParamIds`, `collectPorts`, `getCsoundPorts`, `getByCategory`, `createComponent`, `isParametric`, `getJackDir`, `getTypeOf`.

**`mappingTable`** on `Knob` and `Slider` is part of `serialize`/`deserialize`.
**`sourceComponentId`** on `LED` and `MiniVU` is part of `serialize`/`deserialize`.
**`jackType`** and **`bandwidth`** on `Input`/`Output` are part of `serialize`/`deserialize` — must round-trip for correct variant behavior.

### Properties panel
- **Module** — name, height, color
- **Component** — schema-driven from `static getPropertySchema()`

Field types: `text`, `number` (min/max/step), `list` (comma → array), `checkbox`, `select` (`options`/`optionsFrom`), `mapping-select` (🔍 browser).
`afterChange(comp, value)` — post-update logic.

Current schemas: `Knob`/`Slider` (`mappingTable`), `TextLabel` (`text`/`fontSize`/`color`), `ButtonFlat` (`positions`/`currentIndex`), `ButtonRadio` (`labels`/`buttonCount`/`selectedIndex`), `ButtonIncDec` (`items`/`currentIndex`), `ButtonText` (`text`/`isActive`), `PartSelector` (`items`/`selectedIndex`), `LED` (`sourceComponentId`/`ledType`/`threshold`/`gain`), `MiniVU` (`sourceComponentId`/`thresholdGreen`/`thresholdYellow`), `Input`/`Output` (`jackType`/`bandwidth`).

### Terminal commands

`add`, `del`, `mv`, `set`, `map`, `align`, `distr`, `grid`, `new`, `save`, `load`, `rm`, `lsmod`, `stats`, `help`, `clear`, `ls`, `name`.
`set` properties: `text`, `items`/`labels`/`positions`, `count`, `default`, `item`, `fontSize`, `color`, `mappingTable`, `min`/`max`/`defaultValue`, `jackType`, `bandwidth`.
History: `↑`/`↓`.

**`rm <name>`** — delete user module (via `moduleStore.remove`). **`lsmod [filter]`** — list user modules.
**⚠️ `rm` must NOT be aliased in `_cmdDel` case** — `del`/`delete` = components, `rm` = user modules.

### Code Viewer
- Live `opcode` code from components
- **Syntax highlight** — transparent `<textarea>` over highlighted `<div>`, single regex pass in `_highlightCsound()`
- Line numbers, font size `[A][A]`, `Ctrl+S` save, `⟳` resync, `📋` copy

### Protected structure
- **Header 🔒** — `;@ map`, `opcode`, `xin`, mapping lines
- **Body (editable)** — user DSP
- **Footer 🔒** — `zar`/`zkr`/`init`, `zaw`/`zkw`, `endop`

Rules:
- Protected lines **regenerated from model** on add/remove component, rename, mapping change
- Cursor cannot enter protected lines (`_clampCursorToEditable`)
- Structural keywords (`zar`, `zkr`, `zaw`, `zkw`, `xin`, `opcode`, `endop`) **forbidden in body** — `beforeinput` blocks, `onEditorInput` rechecks
- `_structureCache` (bodyStart/bodyEnd/protectedLineIndices) always rebuilt from current `editor.value` before comparing
- `⟳` (Sync) resets everything to model placeholder
- `restoreModuleFromData` calls `_rebuildStructure()` + `_rebuildStructureFromCurrent()` — **NOT** `syncFromModule()`

## Theme system

`src/theme/`:
- `defaults.js` — `DEFAULT_THEME`, `LCD_COLOR_PRESETS`, `BACKGROUND_PRESETS`
- `themeStore.js` — localStorage persistence
- `Theme.js` — wrapper with getters (`isLcd`, `getAccentColor`, `getLineColor`, `applyGlow`, `lineWidth`, `getCableWidth`, `getCableColor`, `getJackStyle`, `getBackgroundImage`, `getGridStyle`, ...)
- `currentTheme.js` — singleton + `window.__theme__` for debugging

Presets: **`classic`** (NM2-style colored) / **`lcd`** (Casio-style monochrome, transparent, glow).

**Merging:** `Theme` constructor deep-merges `DEFAULT_THEME` with settings (for `lcd`, `cables`, `background`, `grid`). Unknown fields kept.

**Applying** (`DesignSettingsPanel.applyAndSave`): `setCurrentTheme(new Theme(settings))` → `themeStore.save` → `system.applyGridFromTheme()` → `system.applyBackgroundFromTheme()` → `forceRedraw()`.

**All `draw()` methods use `getCurrentTheme()`** — no hardcoded colors outside `classic` branches.
**Jack colors in Classic** — `CABLE_COLORS[this.type]` (never `theme.getJackStyle` for fill; that's LCD only).

**MiniVU in LCD:** no 3-zone coloring — single accent fill (monochrome). Classic: green → yellow → red zones.

## Background & Parallax

`#parallax-bg` `<div>` fills viewport. `applyBackgroundFromTheme()`: solid → `backgroundColor`, image → `backgroundImage: url(...)`. Mouse parallax `parallaxStrength` px, smoothed.

## User module storage

`src/api/index.js` — lazy `moduleStore` singleton:
- Tauri → `moduleStore.tauri.js` (`@tauri-apps/plugin-fs`)
- Web → `moduleStore.web.js` (`localStorage`)
- Fallback → in-memory stub

```js
moduleStore.list()          // → string[]
moduleStore.load(name)      // → { name, code, dsp_code } | null
moduleStore.save(name, code, dspCode)  // → boolean
moduleStore.remove(name)    // → boolean
moduleStore.isUserModule(name)
moduleStore.invalidateCache()
```

**Web keys:** `csmodular:user_modules`, `csmodular:user_module:<name>`.
**Platform detection:** `isTauri()` checks `__TAURI_INTERNALS__`.
**No top-level await** — lazy init pattern.

## Tauri configuration

- `src-tauri/tauri.conf.json` — window config, bundle, `frontendDist: "../dist"`
- `src-tauri/capabilities/default.json` — **`windows` list must include ALL window labels** needing fs access (`["main", "editor"]`)
- `src-tauri/src/lib.rs` — `.plugin(tauri_plugin_fs::init())`

## Keyboard shortcuts

**Main app:** `Space` (menu) / `Space+drag` (pan) / `Ctrl+wheel` (zoom) / `wheel` (v-scroll) / `Shift+wheel` (h-scroll) / `D` or `В` (Design) / `Delete` / `Escape` / right-click (module/jack/empty).

**Editor:** `Ctrl+wheel` / `+` / `-` (zoom) / `0` (reset zoom, canvas focus) / `Escape` / `Delete` / right-click (canvas/component) / `Ctrl+S` (code) / `↑`/`↓` (terminal history) / `Tab` (4 spaces in code).

## Csound name sanitization

Any Csound identifier must be safe. Use `sanitizeCsoundName()` from `src/utils/csoundName.js` (`[^a-zA-Z0-9_]` → `_`, `_` prefix if digit start).

**Primary defense:** always `type` / `jsonName`, never `displayName` / `title`.

## NM2 legacy and params

`type` is safe (Csound identifier); `displayName` is UI-only.

`params` — interactive component IDs in **`xin` order** = **`components[]` order** (not sorted).

Patcher `scripts/patch_params.py`:
- `PARAM_TYPES = [Knob, Slider, ButtonFlat, ButtonText, ButtonRadio, ButtonIncDec, TextEdit]` → `params`
- `MODE_TYPES = [PartSelector, LevelShift]` → `modes` (legacy: **`modes[]` no longer used** — PartSelector is parametric since v228, hand-fixed NM2 modules move it to `params`)

**NM2 `;@ strict` mapping:** `strict[i] === 1` means `inputs[i]` is `static`. Must match `bandwidth: 'static'` in the JS description (`EnvD.js` example: `Trig`, `AM` static, `In` dynamic ↔ `;@ strict 1 1 0`).

## Development rules

1. **No `chnset`/`chnget` inside UDO opcode** — parameters via `chnget` in `instr 1/2` outside opcode.
2. Indicators via external UDOs — `led_rms` / `mVU_rms` called in `instr 1/2` after the module.
3. `ConnectorIndex` — legacy NM2, not used in runtime.
4. User modules always in `user/` (`csound/modules/user/` + `modules/user/`). One opcode per file.
5. `params`/`inputs`/`outputs` — fixed order, matches `xin`.
6. **Csound names always from `type`/`jsonName`**, never `displayName`/`title`.
7. **No direct `fetch('/api/...')`** — use `moduleStore`.
8. **No top-level await** in entry points.
9. **All draw code uses `getCurrentTheme()`**.
10. **`removeModuleFromLayer` searches ALL layers**.
11. **`getLayerAtPoint` always `'voice'`** — new modules are Voice.
12. **Keyboard shortcuts skip when focus in `<input>`/`<textarea>`/`contentEditable`**.
13. **Component serialization via `ComponentRegistry`** — no hand-rolled `if/else` on `constructor.name`.
14. **`params` order = `components[]` order** — never sort. **`CsoundGenerator.formatModuleLine` reads `moduleDef.params` from JSON directly** (source of truth for NM2-imported modules; do not recalculate from components[]).
15. **Grid step = `BASE_STEP_X/Y * multX/multY`.** No hardcoded 20/15 — use `system.grid.stepX/stepY` or constants.
16. **`gridX/gridY` integers in base cells.** Multipliers affect only snap/render.
17. **Changing `multX/multY` does not move existing modules.**
18. **`findFreeSpace(..., stepX, stepY)`** with `multX/multY` (snap) or `1/1`.
19. **UDO loading via `CsoundGenerator._loadUdoByPath()`** — no raw fetch for `user/*`.
20. **`mappingTable` serialized for `Knob`/`Slider`** — else round-trip loses it.
21. **`syncFromModule()` not after `restoreModuleFromData()`** — wipes DSP body.
22. **`mappingTable` only on `Knob`/`Slider`.**
23. **`MidiManager` never touches Csound directly** — always via `CsoundEngine.midiMessage()`. `main.js` wires with `state === 'running'` guard.
24. **MIDI enabled by user click** (`MI`) — never auto-init.
25. **`phasor` frequency = `(sr / ksmps) / bufferSize`**, not `1/bufferSize` — small values stall.
26. **`tablew` with normalized index needs `ixmode=1`.** `phasor` already 0..1.
27. **Control-cable scope: `k(aScopeIdx)`** — matching types required. Audio: a-rate `aScopeIdx` directly.
28. **Scope tables never persisted** — cleared on `reset()`/`removeCable`.
29. **`Panel.draw()` sets `comp._panelHeight = this.height`** before `comp.draw()` — needed by `PartSelector.getMenuBounds()`.
30. **`PartSelector` requires `this.onChange = null`** in constructor — `ModuleFactory` wraps `onChange` for Csound `setControlChannel`. Without it, values don't reach Csound.
31. **Overlay drawing** (menus, tooltips) — via `comp.drawOverlay(ctx)` in a separate pass **after** all panels (`EditorApp.drawOverlays()`, `ModularSystem._renderCables()` overlay loop). Never inside `comp.draw()`.
32. **`rm` ≠ `del`** in terminal: `del`/`delete` — components, `rm`/`remove` — user modules. `rm` must not be aliased in `_cmdDel` case.
33. **`moduleDef.params` is the source of truth for `formatModuleLine`.** If you change `components[]` order or add parametric components — update `params` in JSON manually, or re-save from editor (which rebuilds via `collectParamIds`).
34. **Indicators require `sourceComponentId`.** `LED`/`MiniVU` without it are disabled with `console.warn`. It must point to an `Input` or `Output` **of the same module**. On Outputs without a cable a tap-bus is allocated automatically; on Inputs without a cable the indicator is skipped (by design).
35. **Indicator tap-buses are local to `formatModuleLine`.** No persistent state — recreated each ORC generation. LED gets `A2K` for audio taps (one per tap-point, cached in local `Map`). MiniVU skips control taps with `console.warn`.
36. **`includes.add('led_rms.txt')` and `includes.add('miniVU.txt')`** in `CsoundGenerator` constructor — without them opcodes are missing from ORC (`unable to find opcode with name: mVU_rms`).
37. **Jack color = its own `type`.** Never `CABLE_COLORS[cable.typeColor]` on a jack. `BaseJack.getEffectiveColor()` is the only place.
38. **`PatchManager.updateJackConnection` never paints a jack with the cable's color** — only `jack.updateCenterColor(jack.getEffectiveColor())`.
39. **`synchronizeInputCables` and `findColoredCable` removed.** Do not re-introduce them. Each cable's color is independent (= its source), each jack's color is independent (= its type).
40. **`changeCableColor(jack, color, isVisual)`** — only `visualColor` is user-editable. Functional color is derived from source jack type; the `isVisual=false` branch is a no-op with warning.
41. **Cable type (`_getCableType`) uses `_resolveSourceType(cable)`** — respects the source module's active variant for `audio`/`control`, returns `logic`/`logicAudio` as-is. Then maps through `csoundRateOf()` for converter decisions.
42. **`logic`/`logicAudio` never get converters between each other** — both are `control` in Csound.
43. **`PatchManager.resetCableColors` resets `visualColor` and re-paints the jack with `getEffectiveColor()`** — never with `cables[0].typeColor`.
44. **`BaseJack.originalType`** — immutable field, comes from JS description (`jackType`). **`BaseJack.type`** — current effective type, mutated by variant application. **`BaseJack.bandwidth`** — `'static'` | `'dynamic'` from JS (`bandwidth`) — must match UDO `;@ strict` mask per variant.
45. **`CABLE_COLORS` and `TYPE_FAMILY` live in `src/constants.js`.** No local copies in `PatchManager` / `BaseJack` / `Input` / `Output`. `BaseJack.typeColors` is gone — use `CABLE_COLORS[this.type]` or `getEffectiveColor()`.

## Known issues (short)

- Variant switching: parsing done, UI not wired (jacks/cables recolor automatically)
- `CsoundEngine._ledValues` not cleared on `stop()` (cosmetic)
- `led_rms` signed (`portk kin, 0.1` without `abs`) — intentional; LED may blink on audio signals, use `portk abs(kin)` for level
- `ModulePropertiesWindow`/`ComponentPropertiesWindow` headless (legacy)
- `TerminalPanel._cmdSave` duplicates JS code generation
- `PropertiesPanel._render()` uses `style.cssText +=` — accumulates
- Code Viewer no undo, no virtualized highlight
- Terminal no autocomplete
- **HiDPI (dpr > 1)** disabled — `dpr = 1` workaround
- **MIDI dies after recompile** — `@csound/browser` IPC ports bug, restart Csound
- **`mappingTable` missing in old saved modules** — re-assign and re-save
- **`sourceComponentId` missing in old modules** — LED/MiniVU silently disabled, re-assign in Properties or JS
- **`bandwidth` missing in old saved modules** — defaults to `'dynamic'`. `static` jacks saved before this patch may become `dynamic`. Re-save module or fix `bandwidth` in JSON.
- **HTML leaks into ORC** if any `fetch` for `user/*` slips through — `_loadUdoByPath` catches
- **`PartSelector.onChange` missing** in constructor → Csound channel not updated on change (see rule 30)
- **`formatModuleLine` uses `moduleDef.params`** — not recalculated from `components[]`; NM2 imported modules must have `params` manually fixed
- **Module call order** — `this.modules` is `Map` in insertion order, not topological. Feedback-style patches may see 1 k-block delay. Topological sort — TODO.
- **`baseJack.typeColors` removed** — if any code still references it, replace with `CABLE_COLORS[this.type]` or `this.getEffectiveColor()`. `Input.js`/`Output.js` already migrated.
- **Variant switching UI not wired** — `recomputeVariantUI` recolors jacks/cables but no explicit UI toggle. Variant is inferred purely from active cables.

## TODO (short)

**Main app:** variant switching to UI, split 4 canvas layers, `channelPtr` instead of `getControlChannel`, background upload, cable width per type, HiDPI fix, MIDI velocity, poly voice allocation, Tauri/macOS MIDI, OSC; **topological module sort**; oscilloscope: Auto/ms/adjustable trigger/unipolar/larger buffer/persist channels; indicators: `led_peak` UDO variant, MiniVU peak-hold, per-indicator gain/threshold UI in main app; **jack type picker** in Module Editor (choose `audio`/`control`/`logic`/`logicAudio` per jack); **`bandwidth` toggle** per jack in Properties (currently only via JSON / UDO `;@ strict`); **`logicAudio` visual in LCD theme** — `getJackStyle('logicAudio')` needs a distinct style (currently falls through to `logic`).

**Editor:** remove `Change Color` from context menu, terminal autocomplete/`!!`/`history`, unify `_cmdSave` with `ModulePropertiesWindow`, unify `_cmdSet(mappingTable)` updateCode with `PropertiesPanel`, remove legacy properties windows, CodeMirror, collapsible panels, align/distribute UI, `preview` command, undo/redo, fix `cssText +=`, indicator source picker in PropertiesPanel (`optionsFrom: 'ioComponents'`) — verify it lists `Input`/`Output` only.

**Shared:** IndexedDB for web `moduleStore`, tests, undo/redo in main app; script `patch_indicators.py` — heuristic `sourceComponentId` assignment for NM2-imported modules (nearest Input/Output by geometry, log ambiguous cases); script to backfill `bandwidth` in old saved modules from `;@ strict` of the UDO variant.

## How to start working

1. Ask user about goal
2. Clarify affected files
3. Check TODO for related issues
4. Propose minimal patch

**Style:**
- Russian for user, **English for public docs**
- No "let's try" — concrete edits
- Show diff or full methods
- Do not change what wasn't asked about
