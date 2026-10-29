
# AI Context — CsModular

Short system description for AI assistants. **Goal: 5 minutes to productive work.**

## What it is

**CsModular** — modular sound synthesis on Csound. Browser + native desktop
(Tauri). User builds a patch from modules, connects with cables, hears the
result.

Two entries:
- **`index.html`** — main app (patch building, playback)
- **`editor.html`** — Module Editor (design custom modules)

Debug tools: **Oscilloscope** (waveform viewer for cables), **LED / MiniVU**
(per-module level indicators).

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
- **Tables:** `public/tables/*.json` (read by `TextField` and `;@ map` ftgens)
- **Scripts:** `scripts/` (Python NM2 patchers)

## Module status (DEV / BUILD)

`status: 'stable' | 'passable' | 'dev' | 'broken'` in JS description.
`src/api/moduleStatusStore.js` — `getModuleStatus`, `getStatusMeta`, `IS_DEV`.

| status | Color | Meaning |
|---|---|---|
| `stable` | green `#3ecf6e` | OK, checked |
| `passable` | light green `#8fdc6e` | works, not perfect |
| `dev` | yellow `#e8c547` | under development (**default**) |
| `broken` | red `#e84a4a` | doesn't work |

**DEV (`npm run dev`):**
- Context menu shows **colored dot** per module (from `_createStatusDot`).
- `ContextMenu.preloadStatuses()` runs **once** on first menu open — imports
  all `modules/*.js` into `moduleRegistry` so dots are correct immediately
  (menu opens immediately with yellow dots, then updates via `updateMenuUI`).

**BUILD (`npm run build`):**
- `vite.config.js` → `stableModulesOnly` (plugin, `apply: 'build'`).
  - Copies **only** `status: 'stable' | 'passable'` modules into `dist/modules/`.
  - Writes `dist/modules/manifest.json` = `{ modules: [names] }`.
  - **Do not include `dev` / `broken`** in the filter (currently only `stable`
    in `if (status === 'stable')` — extend to `passable` when needed).
- `main.js` (before `new ModularSystem()`) reads `/modules/manifest.json`
  into `window.__STABLE_MODULES__` (a `Set`).
- `ContextMenu.initModuleStructure()` filters `ALL_NM2` by
  `window.__STABLE_MODULES__` (undefined in DEV → all modules).
- **Dots are hidden** in BUILD (`IS_DEV = false`), stars shown instead
  (legacy rating — to be removed later).
- `preloadStatuses` is a **no-op** in BUILD (`if (!IS_DEV) return`).

## Key entities

### Patch
Modules + cables → JSON. Loaded via `PatchLoader`.

### Module (JS description)

```js
{
    type: 'Zgen',            // Csound opcode name (safe identifier)
    typeID: 999,             // UDO file lookup (999.txt / user/Zgen.txt)
    displayName: 'Zgen',     // UI only — NEVER in Csound names
    status: 'stable',        // 'stable' | 'passable' | 'dev' | 'broken' (default 'dev')
    gridHeight: 3,
    params: [1, 2],          // component IDs in xin order (components[] order)
    inputs: [3],
    outputs: [4, 5],
    components: [
        { componentType: 'Knob', id: '1', ... },
        { componentType: 'Output', id: '4', jackType: 'audio', bandwidth: 'dynamic' },
        { componentType: 'LED', id: '6', sourceComponentId: '4', ledType: 'rms' },
        { componentType: 'MiniVU', id: '7', sourceComponentId: '3' },
    ],
}
```

**`params[]` order** = **`components[]` order**. `CsoundGenerator.formatModuleLine`
reads `moduleDef.params` **directly** (not recalculated from components).
`defaultParams`, `defaultMode` — literal initial values, used only if `params` empty.

**`layer`** — `'voice'` (default) / `'fx'`. Cables only within same layer.

### UDO file

```csound
opcode Zgen, 0, kkk
kParam1, kParam2, kOut1 xin     ; order = params + inputs + outputs
  zaw aResult, kOut1
endop
```

**Variants:** `;@ ins` / `;@ outs` / `;@ variant` / `;@ strict`. Parsed by
`_parseVariants()`. Picked by `_prepareVariants()` (start from default, switch
to `a` if audio-rate cable on non-strict input, iterate ≤ 20).
**`;@ strict[i] === 1` must match `inputs[i].bandwidth === 'static'`** in JS.

### Jack types

| `type` | Color | Csound rate | Family |
|---|---|---|---|
| `audio` | red `#ef4444` | `a` | audio/control |
| `control` | blue `#3b82f6` | `k` | audio/control |
| `logic` | yellow `#fde047` | `k` | logic/logicAudio |
| `logicAudio` | orange `#f97316` | `a` | logic/logicAudio |

`logic`/`logicAudio` — NM2 visual only, both `control` in Csound.
`bandwidth: 'static' | 'dynamic'` (default `'dynamic'`) — corresponds to UDO
`;@ strict 0|1` per input. `static` jack never changes type. `dynamic` may
switch within its family only. **Jack color always = its own `type`**
(`CABLE_COLORS[this.type]`, `BaseJack.getEffectiveColor()`).

Helpers in `constants.js`: `CABLE_COLORS`, `TYPE_FAMILY`, `canTransition`,
`csoundRateOf`.

### Cable
`cable.typeColor = CABLE_COLORS[cable.fromJack.type]`. `cable.visualColor` —
user override (`null` = use `typeColor`). **Real type** for converters =
`csoundRateOf(_resolveSourceType(cable))`.

### Zak space
Audio and control buses — separate spaces (numbers don't collide).

### Converters
Inserted in `_prepareConverters()` **before the receiving module call**, only
when **Csound rate** differs:
- `K2A <srcControlBus>, <newAudioBus>`
- `A2K <srcAudioBus>, <newControlBus>`

No converter if `csoundRateOf(src) === csoundRateOf(dst)` (i.e. `logic ↔
logicAudio`, `control ↔ logic`, `audio ↔ logicAudio` are fine).
`static` jack + mismatch → converter inserted, jack stays its color.
`dynamic` jack + compatible → jack switches type, `_applyVariantToPanel`
recolors jack and outgoing cables.

## TextField (numeric display)

`src/components/TextField.js` — schema-driven numeric indicator.
`ComponentRegistry` round-trips `referenceElementId` / `modeComponentId` /
`tableByMode` / `tableName` / `format`.

**Fields (live component):**

| Field | Type | Meaning |
|---|---|---|
| `targetId` | string \| null | **Controller** — `Knob`/`Slider`/`Button*` ID (value 0..127) |
| `modeComponentId` | string \| null | **Mode switch** — `Button*` ID; its index selects table |
| `tableByMode` | string[] \| null | Table names; index = mode value (`['LVLlev','LVLpos']`) |
| `tableName` | string \| null | Single table (used when no `tableByMode`) |
| `format` | `'number' \| 'integer'` | Display format |

**Priority:** `tableByMode[mode]` → `tableName` → raw value.
`modeValue`: `ButtonText` → `isActive ? 1 : 0`; others → `selectedIndex` /
`currentIndex` / `value`. Clamp in `[0, tableByMode.length-1]`.
Missing `modeComponent` → `tableByMode[0]` + `console.warn`.

**Tables:** `_tableCache` loads `/tables/<name>.json` (flat array), HTML-fallback
detection (Vite SPA). Display: `table[clamp(round(raw), 0, len-1)]` →
`_formatValue` (integer: `Math.round`; number: 2 digits, strip trailing zeros).

**Connected:** subscribes to `targetComponent.onChange` + `modeComponent.onChange`.

**Schema (`static getPropertySchema`)** — key is `targetId` (live field),
serialize uses `referenceElementId` (JSON field).

**Editor:** `PropertiesPanel` — `optionsFrom: 'parametricComponents'` (all
`Knob`/`Slider`/`Button*`/`PartSelector` except `TextField`), field types
`select` (Controller, Mode switch), `mapping-multi-select` (Tables by mode —
modal with checkboxes from `/tables/`, order = selection order via
`_orderBySelection`), `mapping-select` (Single table), `select` (Format).

**Constant (example):**
```js
{ componentType: 'TextField', id: '3', referenceElementId: 2,
  modeComponentId: 5, tableByMode: ['LVLlev', 'LVLpos'], format: 'integer' }
```

**Single-table (no mode):**
```js
{ componentType: 'TextField', referenceElementId: 2,
  tableName: 'dly5h8', format: 'number' }
```

## Data flow

### Create module
1. `ModuleFactory.createModule(type, gridX, gridY, layer)` → `Panel`
   (width=260, gridWidth=13, gridHeight from def)
2. `CsoundGenerator.addModule({ typeId, instanceId, instanceName: type, ... })`
3. `recomputeVariantUI()` — apply default variant to jacks **immediately**
4. Recompile → ORC regenerated

**Snap on create:** if `snap` → `gridX/gridY` snapped to multiples of
`multX/multY`. Collision → `findFreeSpace(..., stepX, stepY)` → snap again.

### Add cable
1. `PatchManager.addCable(from, to)` → `Cable` (`typeColor` = source jack color)
2. `CsoundGenerator.addCable(cable)` → assigns bus
3. `recomputeVariantUI()` (async) — variants + recolor jacks/outgoing cables
4. Recompile

### Layer change
`ModuleContextMenu.setLayer`: remove cables (confirm) → remove from all layers
→ removeModule from generator → set layer → add to layer → addModule →
forceRedraw + debounced recompile.

### ORC generation — `CsoundGenerator.generateOrc()`
1. `_prepareConverters()`
2. `_collectMappingFtgens()` — ftgen for `;@ map` tables
3. UDO section (from `includes`, sorted)
4. `instr 1` (voice) — module calls + converters + LED/MiniVU
5. `instr 2` (fx) — same
6. `instr 3` — MIDI filter; `instr 4` — offline render

### UDO loading — `_loadUdoByPath()`
- `user/<Name>.txt` → `moduleStore.load(name).dsp_code`
- `<id>.txt`, `led_rms.txt`, `miniVU.txt` → `fetch('/csound/modules/<path>')`
  with HTML-fallback detection

**Never** raw `fetch('/csound/modules/user/...')` — Vite SPA-fallback returns
`index.html` (status 200, HTML leaks into ORC).

### Recompile
`reset()` + `setOption('-odac')` + `compileOrc` + `readScore` + `start`.
After: `_resyncAllControls()` pushes UI values back.

### Oscilloscope
Right-click jack → **📊 Send to Scope** → `addScopeTable(cable)` →
`{ tableNum (≥9000), bus, isAudio }` → `_recompileDebounced()` →
`registerScopeTable` → polls `tableCopyOut` every 33 ms → `ScopeWindow`
reads buffers. **Not persisted.** Removed with cable.

Scope code (`_generateScopeCode`):
```csound
giScope_<N> ftgen <N>, 0, 4096, 2, 0
aScopeIdx_<N> phasor (sr / ksmps) / 4096
aScopeSig_<N> zar <bus>                    ; audio
tablew aScopeSig_<N>, aScopeIdx_<N>, <N>, 1
; or kScopeSig_<N> zkr <bus> + tablew kScopeSig_<N>, k(aScopeIdx_<N>), <N>, 1
```

## Indicators (LED / MiniVU)

LED — on/off (`ledType: 'rms'` default). MiniVU — 3-zone vertical VU
(green/yellow/red), thresholds `thresholdGreen`/`thresholdYellow` in 0..1.
LCD theme — single accent fill (no zones).

**Binding:** `sourceComponentId` → **any Input/Output of same module**.
Missing → indicator disabled (`console.warn`).

| Indicator on | Bus source | No cable |
|---|---|---|
| **Output** | `outletBuses[i]` (shared with cable) | tap-bus allocated automatically; opcode writes into it |
| **Input** | `inletBuses[i]` (conv.bus if converter) | skipped by design |

Type normalization: `audio`/`logicAudio` → audio, `control`/`logic` → control.
LED reads **control** — audio tap gets `A2K` (cached per tap-point).
MiniVU reads **audio** — control tap skipped + warn.

**ORC order:** `chngetLines` → `converterLines` → `tapA2KInputLines` →
`callLine` → `tapA2KOutputLines` → `ledLines` → `mvuLines`.

Channels: `led_<instanceName>_<instanceId>_<ledId>`,
`mvu_<instanceName>_<instanceId>_<compId>`. Registered via
`CsoundEngine.registerLedChannel()`, polled every 50 ms with
`getControlChannel`. UDOs `led_rms.txt` and `miniVU.txt` added to `includes`
in `CsoundGenerator` constructor.

**Schema:** `LED` — `sourceComponentId` / `ledType` / `threshold` / `gain`;
`MiniVU` — `sourceComponentId` / `thresholdGreen` / `thresholdYellow`.

## Grid system

World **infinite**. `Grid` class (`src/grid/Grid.js`) as `system.grid`.

Constants (`src/constants.js`): `PANEL_WIDTH = 260`, `BASE_STEP_X = 20`,
`BASE_STEP_Y = 15`, `PANEL_GRID_WIDTH = 13`, `NM2_HPOS_TO_GRIDX = 13`.

**Position:** `gridX/gridY` integers in base cells. `gridWidth = 13`
constant, `gridHeight` from def. Pixel = `gridX * 20`, `gridY * 15`.

**Multipliers** (`theme.settings.grid.multX/multY`, ≥ 1, default 1) —
affect snap and crosses only. **Existing modules do not move.**

**Snap:** `grid.snapToGrid(worldX, worldY)` → multiples of `multX/multY` if
snap on, else nearest base cell.

**findFreeSpace:** `LayerManager.findFreeSpace(layer, w, h, startX, startY,
stepX, stepY)` — only at multiples of step.

**Rendering:** `Grid.draw(ctx, viewport)` draws crosses once per frame in
`animate()` before modules, inside `translate(offsetX, offsetY) + scale(scale)`.

## MIDI

**Chain:** Web MIDI API → `MidiManager.onMessage` →
`CsoundEngine.midiMessage(status, d1, d2)` → Csound `instr 3` →
`gkGate`/`gkNote`.

**`MidiManager`** (`src/midi/MidiManager.js`): `init()` (from click only),
`dispose()`, `onStateChange(cb)`, `onMessage(cb)`, `getInfo()`,
`getHistory()`/`clearHistory()` (last 50). States: `idle | requesting |
ready | denied | unsupported`.

**`instr 3`:** `0x90` → `gkGate=1, gkNote=data1`; `0x80` → `gkGate=0`.
Velocity ignored (NM2 compat). Other messages pass through.

**Enable:** click **`MI`** in BottomBar (gesture requirement). State in SysInfo
popup (`i`).

**Requirements:** secure context; Chrome/Edge/Firefox; Linux via ALSA
(`aconnect -i -o`); Tauri — macOS WKWebView has no Web MIDI.

**⚠️ Known issue:** MIDI stops after `recompile()` — `@csound/browser` IPC
ports bug. Error: `csoundMainRtMidiPort, this.ipcMessagePorts is undefined`.
Workaround: restart Csound.

## Main classes

| Class | File | Role |
|---|---|---|
| `ModularSystem` | `main.js` | Coordinator (canvas, layers, animation, grid) |
| `ModuleFactory` | `src/ModuleFactory.js` | Creates modules from JS descriptions |
| `PatchManager` | `src/PatchManager.js` | Cables, jack coloring |
| `PatchLoader` | `src/PatchLoader.js` | Load/save patches |
| `LayerManager` | `src/managers/LayerManager.js` | Voice/fx arrays, collisions, findFreeSpace |
| `Grid` | `src/grid/Grid.js` | Step, snap, crosses |
| `EventManager` | `src/managers/EventManager.js` | Mouse events, pan, zoom |
| `UIManager` | `src/managers/UIManager.js` | Left control panel |
| `DesignSettingsPanel` | `src/ui/DesignSettingsPanel.js` | Theme editor (`D`) |
| `CsoundGenerator` | `src/csound/CsoundGenerator.js` | ORC assembly |
| `CsoundEngine` | `src/csound/CsoundEngine.js` | Csound instance, LED/scope polling |
| `MappingTables` | `src/csound/MappingTables.js` | `value_maps.json` |
| `Input`, `Output` | `src/components/Input.js`, `Output.js` | Jacks (type, originalType, bandwidth, getEffectiveColor, getCsoundRate) |
| `LED`, `MiniVU` | `src/components/*.js` | Indicators |
| `TextField` | `src/components/TextField.js` | Numeric display with table mapping |
| `Cable` | `src/Cable.js` | `typeColor` = source jack color |
| `moduleStore` | `src/api/index.js` | User module storage |
| `moduleStatusStore` | `src/api/moduleStatusStore.js` | Status + colors + `IS_DEV` |
| `Theme`, `themeStore`, `currentTheme` | `src/theme/*.js` | Classic / LCD presets |
| `MidiManager` | `src/midi/MidiManager.js` | Web MIDI API receiver |

## Module Editor

**Separate entry:** `editor.html` → `editor/editor.js` → `EditorApp`.

**Fixed dock:** Canvas / Code / Properties / Terminal. Splitters, 3 presets
(`Default`, `Code`, `Canvas`), sizes in `localStorage`
(`csmodular:editor-layout`).

**Editor classes:**

| Class | File | Role |
|---|---|---|
| `EditorApp` | `editor/EditorApp.js` | Controller |
| `EditorPanel` | `editor/EditorPanel.js` | Module panel on canvas |
| `ComponentRegistry` | `editor/ComponentRegistry.js` | Single source of truth |
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

### ComponentRegistry

```js
Knob: {
    label: 'Knob',
    category: 'controls',    // controls | display | jacks | graphics
    paletteSize: { width: 24, height: 24 },
    isParametric: true,      // goes into params[]
    isJack: false,           // or 'in' / 'out'
    create(opts), serialize(comp), deserialize(data, ctx), csoundPorts(comp),
}
```

**Adding a component type = one entry.** Used by serialization,
deserialization, Csound port discovery, context menu, terminal aliases,
palette sizes.

Helpers: `serializeComponents`, `deserializeComponents`, `collectParamIds`,
`collectPorts`, `getCsoundPorts`, `getByCategory`, `createComponent`,
`isParametric`, `getJackDir`, `getTypeOf`.

**Round-trip must preserve:** `mappingTable` (Knob/Slider),
`sourceComponentId` (LED/MiniVU), `jackType` + `bandwidth` (Input/Output),
`referenceElementId` + `modeComponentId` + `tableByMode` + `tableName` +
`format` (TextField).

### Properties panel
- **Module** — name, height, color
- **Component** — schema-driven from `static getPropertySchema()`

Field types: `text`, `number`, `list`, `checkbox`, `select`
(`options`/`optionsFrom`), `mapping-select` (single table from `/tables/`),
`mapping-multi-select` (multiple tables, order = selection order).
`afterChange(comp, value)` — post-update logic.

**`optionsFrom` sources:** `'ioComponents'` (Input/Output of module),
`'parametricComponents'` (Knob/Slider/Button*/PartSelector — used by
`TextField` for Controller/Mode switch).

Schemas: `Knob`/`Slider` (`mappingTable`), `TextLabel` (`text`/`fontSize`/
`color`), `ButtonFlat` (`positions`/`currentIndex`), `ButtonRadio`
(`labels`/`buttonCount`/`selectedIndex`), `ButtonIncDec` (`items`/`currentIndex`),
`ButtonText` (`text`/`isActive`), `PartSelector` (`items`/`selectedIndex`),
`LED` (`sourceComponentId`/`ledType`/`threshold`/`gain`), `MiniVU`
(`sourceComponentId`/`thresholdGreen`/`thresholdYellow`), `Input`/`Output`
(`jackType`/`bandwidth`), `TextField` (`targetId`/`modeComponentId`/
`tableByMode`/`tableName`/`format`).

### Terminal

Commands: `add`, `del`, `mv`, `set`, `map`, `align`, `distr`, `grid`, `new`,
`save`, `load`, `rm`, `lsmod`, `stats`, `help`, `clear`, `ls`, `name`.
`set` props: `text`, `items`/`labels`/`positions`, `count`, `default`, `item`,
`fontSize`, `color`, `mappingTable`, `min`/`max`/`defaultValue`, `jackType`,
`bandwidth`. History: `↑`/`↓`.

**`rm <name>`** — delete user module (`moduleStore.remove`).
**`lsmod [filter]`** — list user modules.
**⚠️ `rm` must NOT be aliased in `_cmdDel` case** — `del`/`delete` = components,
`rm`/`remove` = user modules.

### Code Viewer
Live `opcode`, syntax highlight (single regex pass in `_highlightCsound()`),
line numbers, font size, `Ctrl+S`, `⟳` resync, `📋` copy.

### Protected structure
Header 🔒 — `;@ map`, `opcode`, `xin`, mapping lines.
Body (editable) — user DSP.
Footer 🔒 — `zar`/`zkr`/`init`, `zaw`/`zkw`, `endop`.

Rules:
- Regenerated from model on any change (add/remove, rename, mapping).
- Cursor can't enter protected lines (`_clampCursorToEditable`).
- Structural keywords forbidden in body — `beforeinput` blocks,
  `onEditorInput` rechecks.
- `_structureCache` always rebuilt from current `editor.value` before compare.
- `⟳` resets everything to model placeholder.
- `restoreModuleFromData` → `_rebuildStructure()` +
  `_rebuildStructureFromCurrent()`, **NOT** `syncFromModule()`.

## Theme system

`src/theme/`:
- `defaults.js` — `DEFAULT_THEME`, `LCD_COLOR_PRESETS`, `BACKGROUND_PRESETS`
- `themeStore.js` — localStorage
- `Theme.js` — getters (`isLcd`, `getAccentColor`, `getLineColor`, `applyGlow`,
  `lineWidth`, `getCableWidth`, `getCableColor`, `getJackStyle`,
  `getBackgroundImage`, `getGridStyle`, ...)
- `currentTheme.js` — singleton + `window.__theme__`

Presets: **classic** (NM2-style colored) / **lcd** (Casio monochrome,
transparent, glow). Deep merge for `lcd`, `cables`, `background`, `grid`.

**Applying** (`DesignSettingsPanel.applyAndSave`): `setCurrentTheme(new
Theme(settings))` → `themeStore.save` → `applyGridFromTheme` →
`applyBackgroundFromTheme` → `forceRedraw`.

**All `draw()` use `getCurrentTheme()`**. Jack colors in Classic =
`CABLE_COLORS[this.type]` (never from theme). MiniVU LCD = single accent fill.

## Background & Parallax

`#parallax-bg` fills viewport. `applyBackgroundFromTheme()`: solid →
`backgroundColor`, image → `backgroundImage: url(...)`. Mouse parallax
`parallaxStrength` px, smoothed.

## User module storage

`src/api/index.js` — lazy `moduleStore`:
- Tauri → `moduleStore.tauri.js`
- Web → `moduleStore.web.js`
- Fallback → in-memory stub

```js
moduleStore.list() / load(name) / save(name, code, dspCode) /
remove(name) / isUserModule(name) / invalidateCache()
```

**Web keys:** `csmodular:user_modules`, `csmodular:user_module:<name>`.
**Platform:** `isTauri()` checks `__TAURI_INTERNALS__`. **No top-level await.**

## Tauri configuration

- `src-tauri/tauri.conf.json` — window, bundle, `frontendDist: "../dist"`
- `src-tauri/capabilities/default.json` — **`windows` must include ALL
  window labels** needing fs (`["main", "editor"]`)
- `src-tauri/src/lib.rs` — `.plugin(tauri_plugin_fs::init())`

## Vite configuration

- `server.port: 3000`
- `server.middleware` — `/editor` → `/editor/editor.html`
- `resolve.alias` — `@` → `src`, `@editor` → `editor`
- `build.rollupOptions.input` — `main` + `editor`
- **`plugins: [stableModulesOnly()]`** — build filter:
  - Copies `stable` modules into `dist/modules/`
  - Writes `dist/modules/manifest.json` = `{ modules: [names] }`
  - **`apply: 'build'`** — dev unaffected
  - **Extend** `if (status === 'stable')` to include `passable` when needed

## Keyboard shortcuts

**Main:** `Space` (menu) / `Space+drag` (pan) / `Ctrl+wheel` (zoom) /
`wheel` (v-scroll) / `Shift+wheel` (h-scroll) / `D` or `В` (Design) /
`Delete` / `Escape` / right-click (module/jack/empty).

**Editor:** `Ctrl+wheel`/`+`/`-` (zoom) / `0` (reset, canvas focus) /
`Escape` / `Delete` / right-click (canvas/component) / `Ctrl+S` (code) /
`↑`/`↓` (terminal) / `Tab` (4 spaces).

## Csound name sanitization

`sanitizeCsoundName()` from `src/utils/csoundName.js`
(`[^a-zA-Z0-9_]` → `_`, `_` prefix if digit start).
**Primary defense:** always `type`/`jsonName`, never `displayName`/`title`.

## NM2 legacy

`type` safe (Csound identifier), `displayName` UI-only.
`params` — interactive IDs in `xin` order = `components[]` order.

`scripts/patch_params.py`:
- `PARAM_TYPES = [Knob, Slider, ButtonFlat, ButtonText, ButtonRadio,
  ButtonIncDec, TextEdit]` → `params`
- `MODE_TYPES = [PartSelector, LevelShift]` → `modes` (**legacy** — PartSelector
  parametric since v228, hand-fixed NM2 modules move it to `params`)

**`;@ strict` mapping:** `strict[i] === 1` means `inputs[i]` is `static`.
Must match `bandwidth: 'static'` in JS (e.g. `EnvD`: `Trig`, `AM` static,
`In` dynamic ↔ `;@ strict 1 1 0`).

## Development rules

1. **No `chnset`/`chnget` inside UDO opcode** — parameters via `chnget` in
   `instr 1/2` outside opcode.
2. Indicators via external UDOs (`led_rms`, `mVU_rms`) called in `instr 1/2`
   after the module.
3. `ConnectorIndex` — legacy NM2, unused in runtime.
4. User modules always in `user/`. One opcode per file.
5. `params`/`inputs`/`outputs` fixed order, matches `xin`.
6. **Csound names always from `type`/`jsonName`**, never `displayName`/`title`.
7. **No direct `fetch('/api/...')`** — use `moduleStore`.
8. **No top-level await** in entry points.
9. **All draw code uses `getCurrentTheme()`**.
10. **`removeModuleFromLayer` searches ALL layers**.
11. **`getLayerAtPoint` always `'voice'`**.
12. **Keyboard shortcuts skip in `<input>`/`<textarea>`/`contentEditable`**.
13. **Component serialization via `ComponentRegistry`** — no manual `if/else`
    on `constructor.name`.
14. **`params` order = `components[]` order**, never sort. `formatModuleLine`
    reads `moduleDef.params` from JSON directly.
15. **Grid step = `BASE_STEP_X/Y * multX/multY`.** No hardcoded 20/15.
16. **`gridX/gridY` integers in base cells.** Multipliers affect only
    snap/render.
17. **Changing `multX/multY` does not move existing modules.**
18. **`findFreeSpace(..., stepX, stepY)`** with `multX/multY` (snap) or `1/1`.
19. **UDO loading via `_loadUdoByPath()`** — no raw fetch for `user/*`.
20. **`mappingTable` serialized for `Knob`/`Slider`.**
21. **`syncFromModule()` not after `restoreModuleFromData()`** — wipes body.
22. **`mappingTable` only on `Knob`/`Slider`.**
23. **`MidiManager` never touches Csound directly** — always via
    `CsoundEngine.midiMessage()`. Wired in `main.js` with `state === 'running'`.
24. **MIDI enabled by user click** (`MI`) — never auto-init.
25. **`phasor` frequency = `(sr / ksmps) / bufferSize`**, not `1/bufferSize`.
26. **`tablew` with normalized index needs `ixmode=1`.**
27. **Control-cable scope uses `k(aScopeIdx)`**; audio-cable uses a-rate
    `aScopeIdx` directly.
28. **Scope tables never persisted** — cleared on `reset()`/`removeCable`.
29. **`Panel.draw()` sets `comp._panelHeight = this.height`** before
    `comp.draw()` — needed by `PartSelector.getMenuBounds()`.
30. **`PartSelector` requires `this.onChange = null`** in constructor —
    `ModuleFactory` wraps `onChange` for Csound `setControlChannel`.
31. **Overlay drawing** via `comp.drawOverlay(ctx)` in a separate pass
    **after** all panels (`EditorApp.drawOverlays()`,
    `ModularSystem._renderCables()` overlay loop). Never inside `comp.draw()`.
32. **`rm` ≠ `del`** in terminal. `rm` must not be aliased in `_cmdDel` case.
33. **`moduleDef.params` is source of truth for `formatModuleLine`.**
    Update manually or re-save from editor if components change.
34. **Indicators require `sourceComponentId`** pointing to same-module
    Input/Output. Missing → disabled with warn.
35. **Indicator tap-buses are local to `formatModuleLine`** — recreated each
    generation. LED gets A2K for audio taps (cached in local Map). MiniVU
    skips control taps.
36. **`includes.add('led_rms.txt')` and `includes.add('miniVU.txt')`** in
    `CsoundGenerator` constructor.
37. **Jack color = its own `type`.** `BaseJack.getEffectiveColor()` only.
38. **`PatchManager.updateJackConnection` never paints jack with cable's
    color.**
39. **`synchronizeInputCables` / `findColoredCable` removed.**
40. **`changeCableColor(jack, color, isVisual)`** — only `visualColor` is
    user-editable. Functional color derived from source jack type.
41. **`_getCableType` uses `_resolveSourceType(cable)`** (respects source
    module's active variant), then `csoundRateOf()`.
42. **`logic`/`logicAudio` never get converters between each other.**
43. **`PatchManager.resetCableColors` resets `visualColor` and re-paints
    jack with `getEffectiveColor()`.**
44. **`BaseJack.originalType`** (immutable, from JS `jackType`),
    **`BaseJack.type`** (mutable, variant-applied),
    **`BaseJack.bandwidth`** (must match UDO `;@ strict`).
45. **`CABLE_COLORS` and `TYPE_FAMILY` in `src/constants.js`.** No local
    copies. `BaseJack.typeColors` gone.
46. **Status field is `status`** — `'stable' | 'passable' | 'dev' | 'broken'`,
    default `'dev'`. Colors from `getStatusMeta(status)`. Never hardcode color
    in UI.
47. **`IS_DEV`** from `moduleStatusStore` = `import.meta.env.DEV`.
    - DEV: `ContextMenu._createStatusDot` shows colored dot; `preloadStatuses()`
      runs once on first `show()`.
    - BUILD: `preloadStatuses` is a no-op; `main.js` reads
      `/modules/manifest.json` → `window.__STABLE_MODULES__`;
      `initModuleStructure` filters `ALL_NM2` by it.
48. **`vite.config.js` `stableModulesOnly`** must:
    - filter `stable` (extend for `passable` when needed)
    - write `manifest.json`
    - **never include `dev`/`broken`**
49. **In BUILD, status dots are hidden** (`IS_DEV = false`) — stars are shown
    until removed; do not add dots in BUILD.
50. **`moduleStatusStore` is a separate file** — `getModuleStatus`,
    `getStatusMeta`, `IS_DEV`. Do not read `status` inline elsewhere.
51. **`TextField` — controller field is `targetId` (live), JSON field is
    `referenceElementId`.** `ComponentRegistry` renames between them.
52. **`TextField` priority:** `tableByMode[mode]` → `tableName` → raw.
    `modeValue`: `ButtonText` → `isActive ? 1 : 0`; others → `selectedIndex` /
    `currentIndex` / `value`. Clamp `[0, tableByMode.length-1]`. Missing
    `modeComponent` → `tableByMode[0]` + warn.
53. **`TextField` tables loaded via `/tables/<name>.json`** with HTML-fallback
    detection (Vite SPA). Cache in `_tableCache`.
54. **`PropertiesPanel` `optionsFrom: 'parametricComponents'`** —
    Knob/Slider/Button*/PartSelector except the current `TextField`.
55. **`mapping-multi-select`** — modal with checkboxes from `fetch('/tables/')`
    + `_listTableNames()` (cached). Order = selection order via
    `_orderBySelection` (current first, then new in list order). Preview
    shows `Order: A → B → C`.

## Known issues

- Variant switching UI not wired (jacks/cables recolor automatically)
- `CsoundEngine._ledValues` not cleared on `stop()`
- `led_rms` signed — intentional; use `portk abs(kin)` for level
- `ModulePropertiesWindow`/`ComponentPropertiesWindow` headless (legacy)
- `TerminalPanel._cmdSave` duplicates JS code generation
- `PropertiesPanel._render()` uses `style.cssText +=` — accumulates
- Code Viewer no undo, no virtualized highlight
- Terminal no autocomplete
- **HiDPI (dpr > 1)** disabled (`dpr = 1` workaround)
- **MIDI dies after recompile** — `@csound/browser` IPC bug
- **`mappingTable` missing in old modules** — re-assign and re-save
- **`sourceComponentId` missing in old modules** — LED/MiniVU disabled
- **`bandwidth` missing in old modules** — defaults to `dynamic`, static
  jacks may have changed. Re-save.
- **`tableByMode` missing in old modules** — `TextField` falls back to
  `tableName` or raw value
- **HTML leaks into ORC** if raw `fetch` for `user/*` slips — `_loadUdoByPath`
  catches
- **`PartSelector.onChange` missing** in constructor
- **`formatModuleLine` uses `moduleDef.params`** — not recalculated
- **Module call order** — insertion order, not topological. Feedback may
  see 1 k-block delay.
- **`baseJack.typeColors` removed** — use `CABLE_COLORS[this.type]`
- **`passable` not included in BUILD filter** — extend plugin when needed
- **Dot color in first DEV menu open** — appears yellow for a moment until
  `preloadStatuses` finishes (~1 s); expected
- **`/tables/` HTML listing** — Vite in dev serves directory listing; in
  build/prod it may not. `_listTableNames` will return `[]`. Workaround:
  `public/tables/_index.json` (TODO).
- **`mapping-multi-select` reorder** — no drag/↑↓ UI; to reorder, uncheck all
  and select in desired order.

## TODO

**Main app:** variant switching UI, split 4 canvas layers, `channelPtr`,
background upload, cable width per type, HiDPI, MIDI velocity, poly voice
allocation, Tauri/macOS MIDI, OSC, **topological module sort**; scope:
Auto/ms/trigger/unipolar/larger buffer/persist; indicators: `led_peak` UDO,
MiniVU peak-hold, per-indicator gain/threshold UI; **jack type picker** in
editor; **`bandwidth` toggle** in Properties; **`logicAudio` LCD style**.

**TextField:** `displayScale` (e.g. show `kLev/64`); `_index.json` for
`/tables/` listing in build; multi-select reorder UI (↑↓ or drag).

**Editor:** remove `Change Color` from context menu, terminal autocomplete/
`!!`/`history`, unify `_cmdSave` with `ModulePropertiesWindow`, unify
`_cmdSet(mappingTable)` updateCode with `PropertiesPanel`, remove legacy
properties windows, CodeMirror, collapsible panels, align/distribute UI,
`preview` command, undo/redo, fix `cssText +=`, indicator source picker.

**Shared:** IndexedDB for web `moduleStore`, tests, undo/redo;
`patch_indicators.py` (heuristic `sourceComponentId`); `patch_textfields.py`
(heuristic `tableByMode` from `;@ map` + Button*); script to backfill
`bandwidth` from `;@ strict`.

**Release prep:** extend `stableModulesOnly` to `passable`; make sure all
modules have `status`; remove stars (legacy rating) once `status` is complete;
add **"Show unstable"** toggle in BUILD if requested.

## How to start working

1. Ask user about goal
2. Clarify affected files
3. Check TODO for related issues
4. Propose minimal patch

**Style:** Russian for user, **English for public docs and for comments in code**. No "let's try" —
concrete edits. Show diff or full methods. Do not change what wasn't asked
about.
