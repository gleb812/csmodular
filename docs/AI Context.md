
# AI Context — CsModular

Short system description for AI assistants. **Goal: 5 minutes to productive work.**

**Companion docs:**
- `ARCHITECTURE.md` — high-level overview (modules, jacks, variants, pipeline)
- `CONTRIBUTING.md` — module workflow (create, export, release, share)
- `EDITOR.md` — module editor internals
- `TROUBLESHOOTING.md` — known issues
- `TODO.md` — roadmap

## What it is

**CsModular** — modular sound synthesis on Csound. Browser + native desktop (Tauri).
User builds a patch from modules, connects with cables, hears the result.

Two entries:
- **`index.html`** — main app (patch building, playback)
- **`editor.html`** — Module Editor (design custom modules)

## Storage

`src/api/index.js` → `libraryStore` (lazy proxy). **Only** module I/O. No raw `fetch` for UDOs, no manual IndexedDB.

| | Builtin | User |
|---|---|---|
| Web | `public/libraries/` (read-only) | IndexedDB (`csmodular/libraries`) |
| Tauri | `public/libraries/` (read-only) | `~/Documents/CsModular/libraries/` |

**Web: `index.html` и `editor.html` — разные вкладки.** У каждой свой
`WebLibraryStore` инстанс с `_moduleCache` (`Map<"lib/Name", { description, dspCode }>`).
`saveModule` в редакторе инвалидирует **только свой** кэш. Основное окно при
`loadModule` может вернуть старую версию из памяти — вызывать
`libraryStore.invalidateCache()` перед перечитыванием (см. *Hot-reload*).

**Library structure** (`public/libraries/<lib>/`):
- `_index.json` — `{ modules: [{ name, displayName, category, status }] }`
- `_meta.json` — `{ name, displayName, author, version, description, createdAt }` (optional)
- `modules/<Name>.js` — JS description
- `modules/<Name>.txt` — Csound UDO

`public/libraries/_index.json` — `{ libraries: ["lib1", "lib2"] }`.

**Both backends update `_index.json` on `saveModule` / `removeModule`.**

**Helpers** (exported from `libraryStore.js`):
- `parseModuleDefinition(code)` — extracts `export const XModule = {...}`
- `looksLikeHtml(text)` — Vite SPA fallback detection

## Bridge (external API)

`bridge/` — Node.js process, **separate** from main app. HTTP `POST /csp/...` + UDP OSC → WebSocket → UI. UI auto-connects to `ws://127.0.0.1:8765/ws`. If bridge is down, UI works normally.

Only sends **UI commands** — never touches `CsoundEngine` directly. Full API → `CSP_API.md`.

## Module (JS description)

```js
{
    type: 'Zgen',            // Csound opcode name (safe identifier)
    library: 'test-lib',     // ⭐ injected by ModuleFactory.loadModule — source library
    displayName: 'Zgen',     // UI only — NEVER in Csound names
    category: 'osc',         // ⭐ REQUIRED — from CATEGORIES in moduleCategories.js
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

**Contracts (not derivable from code):**
- **`params[]` order** = `components[]` order. Never sort. `formatModuleLine` reads `moduleDef.params` directly.
- **`xin` order** = `params[]` + `inputs[]` + `outputs[]`. Must match UDO.
- **`;@ strict[i] === 1`** must match `inputs[i].bandwidth === 'static'` in JS.
- **Csound names** from `type` / `jsonName` — never from `displayName` / `title`.
- **`library`** field is injected by `ModuleFactory.loadModule` — not stored in JS.

**`layer`** — `'voice'` (default) / `'fx'`. Cables only within same layer.

**`category`** — required, must be in `CATEGORIES` (`src/moduleCategories.js`). `normalizeCategory` falls back to `'custom'`.

## Module status (DEV / BUILD)

`src/api/moduleStatusStore.js` — `getModuleStatus`, `getStatusMeta`, `IS_DEV`.

| status | Color | Meaning |
|---|---|---|
| `stable` | green `#3ecf6e` | OK, checked |
| `passable` | light green `#8fdc6e` | works, not perfect |
| `dev` | yellow `#e8c547` | under development (default) |
| `broken` | red `#e84a4a` | doesn't work |

**DEV:** `ContextMenu._createStatusDot` shows colored dot; reads `status` from `libraryStore.listModules()` (which reads `_index.json`).

**BUILD:** `vite.config.js` → `stableModulesOnly` plugin (`apply: 'build'`):
- copies `public/libraries/*` → `dist/libraries/*`
- filters modules by `status ∈ {stable, passable}`
- rewrites each `<lib>/_index.json` (kept modules only)
- rewrites root `dist/libraries/_index.json` (non-empty libs only)
- writes `dist/libraries/manifest.json` = `{ modules: [names] }`

Dots hidden in BUILD (`IS_DEV = false`), stars shown.

## Jack types

| `type` | Color | Csound rate | Family |
|---|---|---|---|
| `audio` | red `#ef4444` | `a` | audio/control |
| `control` | blue `#3b82f6` | `k` | audio/control |
| `logic` | yellow `#fde047` | `k` | logic/logicAudio |
| `logicAudio` | orange `#f97316` | `a` | logic/logicAudio |

`logic`/`logicAudio` — NM2 visual only, both `control` in Csound.
`bandwidth: 'static' | 'dynamic'` — corresponds to UDO `;@ strict 0|1`.

**Jack color = its own `type`** (`CABLE_COLORS[this.type]`, `BaseJack.getEffectiveColor()`).
**Cable color = source jack's current type.**

Converters (`K2A` / `A2K`) inserted in `_prepareConverters()` only when **Csound rate** differs.
`logic ↔ logicAudio`, `control ↔ logic`, `audio ↔ logicAudio` — **no converter**.

Helpers in `src/constants.js`: `CABLE_COLORS`, `TYPE_FAMILY`, `canTransition`, `csoundRateOf`.

Full rules → `ARCHITECTURE.md` → *Jacks*.

## TextField (numeric display)

`src/components/TextField.js` — schema-driven numeric indicator.
`ComponentRegistry` round-trips `referenceElementId` / `modeComponentId` / `tableByMode` / `tableName` / `format`.

| Field | Type | Meaning |
|---|---|---|
| `targetId` | string \| null | Controller — `Knob`/`Slider`/`Button*` ID |
| `modeComponentId` | string \| null | Mode switch — `Button*` ID; index selects table |
| `tableByMode` | string[] \| null | Tables; index = mode value |
| `tableName` | string \| null | Single table (no mode) |
| `format` | `'number' \| 'integer'` | Display format |

**Priority:** `tableByMode[mode]` → `tableName` → raw value.
`modeValue`: `ButtonText` → `isActive ? 1 : 0`; others → `selectedIndex` / `currentIndex` / `value`. Clamp `[0, tableByMode.length-1]`.
Missing `modeComponent` → `tableByMode[0]` + `console.warn`.

Tables loaded via `/tables/<name>.json` (flat array), HTML-fallback detection, cache in `_tableCache`.

**Schema:** `targetId` (live) → `referenceElementId` (JSON). `ComponentRegistry` renames between them.

**Editor:** `PropertiesPanel` — `optionsFrom: 'parametricComponents'` (Knob/Slider/Button*/PartSelector except current `TextField`), `select` (Controller, Mode switch), `mapping-multi-select` (Tables by mode — order = selection order), `mapping-select` (Single table), `select` (Format).

## Data flow

### Create module
1. `ModuleFactory.createModule(type, gridX, gridY, layer)` → `Panel`
2. `CsoundGenerator.addModule(...)`
3. `recomputeVariantUI()` — apply default variant to jacks immediately
4. Recompile

### Add cable
1. `PatchManager.addCable(from, to)` → `Cable` (`typeColor` = source jack color)
2. `CsoundGenerator.addCable(cable)` → assigns bus
3. `recomputeVariantUI()` (async)
4. Recompile

### ORC generation — `CsoundGenerator.generateOrc()`
1. `_prepareConverters()` — K2A / A2K before receiving module
2. `_collectMappingFtgens()` — ftgen for `;@ map` tables
3. UDO section (from `includes`, sorted)
4. `instr 1` (voice) — module calls + converters + LED/MiniVU
5. `instr 2` (fx) — same
6. `instr 3` — MIDI filter; `instr 4` — offline render

### UDO loading — `_loadUdoByPath()`
- `library/<lib>/<Name>.txt` → `libraryStore.loadUdo(lib, name)`
- `<id>.txt`, `led_rms.txt`, `mVU_rms.txt` → `fetch('/csound/modules/<path>')` with HTML-fallback detection

**Never** raw `fetch('/csound/modules/user/...')` — Vite SPA-fallback returns `index.html`.

**Tauri:** user UDOs in `<lib>/modules/<Name>.txt`, not `csound/modules/`.

### Recompile
`reset()` + `setOption('-odac')` + `compileOrc` + `readScore` + `start`.
After: `_resyncAllControls()` pushes UI values back.

### Hot-reload module (main app, user only)
`BottomBar ⟳` → `ModularSystem.reloadUserModules()` →
`libraryStore.invalidateCache()` → `moduleFactory.loadModule(lib, type)` →
`moduleFactory.refreshPanel(panel, newDef)` →
`csoundGen.removeModule` + `addModule` → `recomputeVariantUI()` (recompile).
Full pipeline + ограничения → *Module Editor* → *Hot-reload*.

## Oscilloscope

Right-click jack → **📊 Send to Scope** → `addScopeTable(cable)` → `_recompileDebounced()` → `registerScopeTable` → polls `tableCopyOut` every 33 ms → `ScopeWindow`.

**Not persisted.** Removed with cable.

## Indicators (LED / MiniVU)

LED — on/off (`ledType: 'rms'`). MiniVU — 3-zone vertical VU, `thresholdGreen` / `thresholdYellow` in 0..1. LCD theme — single accent fill.

**Binding:** `sourceComponentId` → any Input/Output of same module. Missing → disabled (`console.warn`).

| Indicator on | Bus source | No cable |
|---|---|---|
| Output | `outletBuses[i]` | tap-bus allocated automatically |
| Input | `inletBuses[i]` (conv.bus if converter) | skipped |

LED reads **control** — audio tap gets `A2K`. MiniVU reads **audio** — control tap skipped + warn.

Channels: `led_<instanceName>_<instanceId>_<ledId>`, `mvu_<instanceName>_<instanceId>_<compId>`. Polled every 50 ms.

UDOs `led_rms.txt` / `miniVU.txt` added to `includes` in `CsoundGenerator` constructor.

**Schema:** `LED` — `sourceComponentId` / `ledType` / `threshold` / `gain`; `MiniVU` — `sourceComponentId` / `thresholdGreen` / `thresholdYellow`.

## Grid system

World **infinite**. `Grid` class (`src/grid/Grid.js`) as `system.grid`.

Constants (`src/constants.js`): `PANEL_WIDTH = 260`, `BASE_STEP_X = 20`, `BASE_STEP_Y = 15`, `PANEL_GRID_WIDTH = 13`, `MAX_SANE_DISTANCE_GRID = 80`.

**Position:** `gridX/gridY` integers in base cells. `gridWidth = 13`, `gridHeight` from def.

**Multipliers** (`theme.settings.grid.multX/multY`) affect snap and crosses only. **Existing modules do not move.**

**Snap:** `grid.snapToGrid(worldX, worldY)` → multiples of `multX/multY` if snap on.

**findFreeSpace:** `LayerManager.findFreeSpace(layer, w, h, startX, startY, stepX, stepY)` — only at multiples of step.

### Soft limit (`MAX_SANE_DISTANCE_GRID = 80`)

`LayerManager.checkSaneDistance(...)` — Chebyshev between rects. Returns `{ ok, distance, nearest }`.

- `Panel.handlePanelDrag` — block drag if `!sane.ok`, throttle notifications 600 ms
- `main.addNewModuleAtPosition` — `findFreeSpace` near `sane.nearest`
- **Outliers** — modules beyond `MAX_SANE_DISTANCE_GRID` from bbox median. Shown **only** in minimap as arrows (8 octants), **not drawn** on canvas.

### Minimap (`src/ui/Minimap.js`)

Figma-style, right-top, `MINIMAP_WIDTH=220`, `MINIMAP_HEIGHT=160`. Toggle: hotkey `M` / `ь`, button `Mp` in `BottomBar`. Hidden by default.

**Render:** own `<canvas id="csmodular-minimap">`, `z-index: 13000`, `position: fixed`. `main.js` `animate()` → `minimap.draw()` every frame.

**Geometry:**
- `_computeWorldBounds()` — bbox of modules within `MAX_SANE_DISTANCE_GRID` from median + 20% padding. **Viewport NOT included.**
- `_makeTransform(bounds)` — `toCanvas` / `toGrid`, `scale`, `inner`
- `_getOutliers(bounds)` — modules beyond `MAX_SANE_DISTANCE_GRID` from center

**Drawing:** modules (`isOutputModule(m)` → green, else `getModuleCategoryColor`), viewport frame, outlier arrows.

**Interaction:** click arrow → `_jumpToModule`; click module → `_jumpToModule`; drag → pan. `_dragScale` fixed in `mousedown` (avoid feedback loop). `_onMouseUp` global.

**`isOutputModule(m)`** (`src/utils/spatial.js`) — has `Output` and **no** `Input`. `LevConv` (In+Out) → `false`. `Out2` / `Out4` / `Device` → `true`.

## Module categories

`src/moduleCategories.js` — single source of truth.

`getModuleCategoryColor(module)` (`src/constants.js`) priority:
1. `module.category` (if `isValidCategory`) → `MODULE_CATEGORY_COLORS[category]`
2. `MODULE_GROUP_OF[module.jsonName || type || title]` → `GROUP_TO_CATEGORY → color` (legacy)
3. `module.isUser` → `custom`
4. else → `unknown` (#64748b)

`MODULE_CATEGORY_COLORS` — `osc`, `noise`, `sample`, `lfo`, `env`, `filter`, `fx`, `dynamics`, `mixer`, `switch`, `logic`, `math`, `util`, `io`, `midi`, `control`, `custom`, `unknown`.

## MIDI

**Chain:** Web MIDI API → `MidiManager.onMessage` → `CsoundEngine.midiMessage(status, d1, d2)` → Csound `instr 3` → `gkGate`/`gkNote`.

`MidiManager` (`src/midi/MidiManager.js`): `init()` (from click only), `dispose()`, `onStateChange`, `onMessage`, `getInfo`, `getHistory` (last 50). States: `idle | requesting | ready | denied | unsupported`.

**`instr 3`:** `0x90` → `gkGate=1, gkNote=data1`; `0x80` → `gkGate=0`. Velocity ignored. Other messages pass.

**Enable:** click **`MI`** in BottomBar (gesture requirement). State in SysInfo popup (`i`).

**Requirements:** secure context; Chrome/Edge/Firefox; Linux via ALSA; Tauri — macOS WKWebView has no Web MIDI.

## Main classes

| Class | File | Role |
|---|---|---|
| `ModularSystem` | `main.js` | Coordinator (canvas, layers, animation, grid, minimap, reloadUserModules |
| `ModuleFactory` | `src/ModuleFactory.js` | `loadModule(lib, name)`, `createModule(type, ...)` |
| `PatchManager` | `src/PatchManager.js` | Cables, jack coloring |
| `PatchLoader` | `src/PatchLoader.js` | Load/save patches |
| `LayerManager` | `src/managers/LayerManager.js` | Voice/fx arrays, collisions, `findFreeSpace`, `checkSaneDistance` |
| `Grid` | `src/grid/Grid.js` | Step, snap, crosses |
| `EventManager` | `src/managers/EventManager.js` | Mouse events, pan, zoom |
| `UIManager` | `src/managers/UIManager.js` | Left control panel |
| `BottomBar` | `src/ui/BottomBar.js` | Bottom actions, `Mp` toggle minimap |
| `Minimap` | `src/ui/Minimap.js` | World overview |
| `Splash` | `src/ui/Splash.js` | Splash / About (session-once) |
| `DesignSettingsPanel` | `src/ui/DesignSettingsPanel.js` | Theme editor (`D`) |
| `CsoundGenerator` | `src/csound/CsoundGenerator.js` | ORC assembly |
| `CsoundEngine` | `src/csound/CsoundEngine.js` | Csound instance, LED/scope polling |
| `MappingTables` | `src/csound/MappingTables.js` | `value_maps.json` |
| `Input`, `Output` | `src/components/Input.js`, `Output.js` | Jacks |
| `LED`, `MiniVU` | `src/components/*.js` | Indicators |
| `TextField` | `src/components/TextField.js` | Numeric display with table mapping |
| `Cable` | `src/Cable.js` | `typeColor` = source jack color |
| `libraryStore` | `src/api/libraryStore.js` | Module libraries |
| `moduleStatusStore` | `src/api/moduleStatusStore.js` | Status + colors + `IS_DEV` |
| `moduleCategories` | `src/moduleCategories.js` | `ALL_NM2`, `MODULE_GROUP_OF` |
| `spatial` | `src/utils/spatial.js` | `median`, `bboxNearModules`, `groupByOctant`, `isOutputModule` |
| `Theme`, `themeStore`, `currentTheme` | `src/theme/*.js` | Classic / LCD |
| `MidiManager` | `src/midi/MidiManager.js` | Web MIDI API receiver |

## Module Editor

Separate entry: `editor.html` → `editor/editor.js` → `EditorApp`.

Fixed dock: Canvas / Code / Properties / Terminal. Splitters, 3 presets (`Default`, `Code`, `Canvas`), sizes in `localStorage` (`csmodular:editor-layout`).

| Class | File | Role |
|---|---|---|
| `EditorApp` | `editor/EditorApp.js` | Controller |
| `EditorPanel` | `editor/EditorPanel.js` | Module panel on canvas |
| `ComponentRegistry` | `editor/ComponentRegistry.js` | Single source of truth |
| `CodeViewerWindow` | `editor/CodeViewerWindow.js` | Csound editor (protected structure) |
| `saveService` | `editor/saveService.js` | Unified save (Toolbar + Terminal) |
| `DockLayout` | `editor/ui/DockLayout.js` | Split-pane + presets |
| `Toolbar` | `editor/ui/Toolbar.js` | New / Load / Save / Export / Import |
| `PropertiesPanel` | `editor/ui/PropertiesPanel.js` | Module/Component tabs |
| `TerminalPanel` | `editor/ui/TerminalPanel.js` | Command terminal |
| `Toast` | `editor/ui/Toast.js` | Notifications |
| `ContextMenu` | `editor/ui/ContextMenu.js` | Generic context menu |
| `ModuleContextMenu` | `editor/ui/ModuleContextMenu.js` | Editor menu builder |

Legacy `ModulePropertiesWindow` / `ComponentPropertiesWindow` — headless, DOM detached. Only `_showMappingBrowser()` still used.

`EditorApp.uiManager` is a stub — `{ showNotification, updateZoomInfo }` from `ui/Toast.js`.

### ComponentRegistry

```js
Knob: {
    label: 'Knob',
    category: 'controls',    // controls | display | jacks | graphics
    paletteSize: { width: 24, height: 24 },
    autoSize: false,         // ⭐ true for TextLabel
    noCollision: false,      // ⭐ true for TextLabel
    isParametric: true,      // goes into params[]
    isJack: false,           // or 'in' / 'out'
    create(opts), serialize(comp), deserialize(data, ctx), csoundPorts(comp),
}
```

**Adding a component type = one entry.** Used by serialization, deserialization, Csound port discovery, context menu, terminal aliases, palette sizes.

Helpers: `serializeComponents`, `deserializeComponents`, `collectParamIds`, `collectPorts`, `getCsoundPorts`, `getByCategory`, `createComponent`, `isParametric`, `getJackDir`, `getTypeOf`, `hasCollisions`.

**Round-trip must preserve:** `mappingTable` (Knob/Slider), `sourceComponentId` (LED/MiniVU), `jackType` + `bandwidth` (Input/Output), `referenceElementId` + `modeComponentId` + `tableByMode` + `tableName` + `format` (TextField), `width` + `height` (all except `autoSize`).

### Properties panel

- **Module** — name, height, color, category, status
- **Component** — schema-driven from `static getPropertySchema()`

Field types: `text`, `number`, `list`, `checkbox`, `select` (`options`/`optionsFrom`), `mapping-select`, `mapping-multi-select`, `size`.
`afterChange(comp, value)` — post-update logic.

**`optionsFrom`:** `'ioComponents'` (Input/Output of module), `'parametricComponents'` (Knob/Slider/Button*/PartSelector except current `TextField`).

### Terminal

Commands: `add`, `del`, `mv`, `set`, `map`, `align`, `distr`, `grid`, `new`, `save`, `load`, `rm`, `lsmod`, `stats`, `help`, `clear`, `ls`, `name`.

**⚠️ `rm` ≠ `del`** — `del`/`delete` = components, `rm`/`remove` = user modules. `rm` must NOT be aliased in `_cmdDel` case.

Full command reference → `EDITOR.md`.

### Code Viewer — protected structure

Header 🔒 — `;@ map`, `opcode`, `xin`, mapping lines.
Body (editable) — user DSP.
Footer 🔒 — `zar`/`zkr`/`init`, `zaw`/`zkw`, `endop`.

**Rules:**
- Regenerated from model on any change (add/remove, rename, mapping). Body preserved.
- Cursor can't enter protected lines (`_clampCursorToEditable`).
- Structural keywords forbidden in body — `beforeinput` blocks, `onEditorInput` rechecks.
- `_structureCache` rebuilt from current `editor.value` before compare.
- **`updateCode()` preserves body. `syncFromModule()` (⟳) resets everything.**
- **`restoreModuleFromData` → `_rebuildStructure()` + `_rebuildStructureFromCurrent()`, NOT `syncFromModule()`.**

### Save / Load

**All saves go through `saveService.saveModule(app, { lib, name })`.** `generateJsCode()` lives only in `saveService.js`.

`saveModule` steps:
1. `sanitizeName(name || app.module.title)`
2. If `lib !== 'user'` and doesn't exist → `libraryStore.createLibrary(lib, ...)`
3. Collects `moduleData` via `ComponentRegistry` (`serializeComponents`, `collectParamIds`, `collectPorts`)
4. `generateJsCode()` — single template
5. `dspCode` from `app.codeViewerWindow.getCode()`
6. `libraryStore.saveModule(lib, name, jsCode, dspCode)`
7. Syncs `app.module.title`, `app.module.status`, `app._sourceLibrary`

**Round-trip preserves:** `mappingTable`, multi-position labels, default index/state, `TextLabel` text/fontSize, DSP body, `category`, `status`.

`library` field is **not** stored in JS — it's the storage location.

### Hot-reload (main app)

**Кнопка `⟳` в `BottomBar`** → `ModularSystem.reloadUserModules()` — обновляет
user-модули, стоящие в патче, **без перезагрузки страницы**.

Pipeline:
1. `libraryStore.invalidateCache()` — ⭐ **обязательно**. Web: `index.html` и
   `editor.html` — разные вкладки, у каждой свой `WebLibraryStore` с
   `_moduleCache`. `saveModule` в редакторе чистит **только кэш редактора**.
   Без `invalidateCache()` основное окно читает старую версию из памяти.
2. `moduleFactory.loadModule(lib, type)` для каждого user-модуля в патче
   (перечитывает `_index.json` + `<Name>.js` + `<Name>.txt`).
3. `moduleFactory.refreshPanel(panel, newDef)` — in-place:
   - существующие компоненты (совпадает `id` + `componentType`) → `_mergeComponentDef`:
     обновляет описание (`x/y/labels/mappingTable/csoundName/jackType/bandwidth/sourceComponentId`),
     **сохраняет** `value` / `isActive` / `selectedIndex` / `currentIndex` /
     `connected` / `cables` / `csoundChannel`.
   - новые → `_createOneComponent`.
   - удалённые → `removed[]` (кабели удаляются в `reloadUserModules`).
4. `csoundGen.removeModule` + `addModule` — обновляет `inlets`/`outlets`/
   `defaultParams` (могли измениться). Bus'ы существующих кабелей
   (`_cableBusMap`, привязаны к `cable.id`) **не трогаются**.
5. `csoundGen._variantsCache` — сбросить ключи `*/<type>.txt` (варианты могли
   поменяться в txt).
6. `recomputeVariantUI()` — сам триггерит recompile; явный
   `_recompileDebounced` **не нужен** (иначе двойной recompile).

**Ограничения (осознанные):**
- `csoundName` **не перезаписывается** из txt, если у инстанса уже задан
  (пользователь мог переименовать в Properties — его правка приоритетнее).
- Удаление джека → его кабели удаляются; новый джек **не** восстанавливает
  кабели автоматически.
- **Только user-модули** (builtin read-only, их не правим).
- **Нет авто hot-reload** — только по кнопке. `BroadcastChannel` для авто —
  в `TODO.md`.

**⚠️ `ModuleFactory.loadModule`:** условие коллизии `prev.library !== lib`
должно быть `prev.library && prev.library !== lib` — иначе при `prev.library
=== undefined` (старые регистрации) перезагрузка того же type из того же lib
**молча пропускается**, и `refreshPanel` получает старый definition.

### Editor rules (non-obvious)

1. **`params[]` order = `components[]` order** — never sort.
2. **Highlight = single regex pass** — no `.replace()` chains.
3. **`DockLayout` is the only place for panel positioning.** Panels expose `this.element`, no `position: fixed`, no `document.body.appendChild`.
4. **`updateCode()` preserves body.** Never call `syncFromModule()` from `updateCode()`.
5. **`syncFromModule()` resets everything.** Only from user's ⟳ / `New` flow. **Never** after `restoreModuleFromData()`.
6. **`_cmdNew` / `Toolbar._onNew` must reset `_userCsoundCode`** and rebuild code panel (`clearModule({ title, resetColor })`).
7. **`mappingTable` on `Knob`/`Slider` — in both `serialize` and `deserialize`.**
8. **`autoSize: true`** (TextLabel) — `EditorPanel`, `ModuleContextMenu`, `TerminalPanel` must **not** overwrite `width`/`height` after `createComponent`.
9. **`noCollision: true`** (TextLabel) — not checked, not an obstacle. `EditorApp._hasCollision`, `TerminalPanel._collides`.
10. **`ComponentRegistry` is single source of truth.** No manual `if (comp.constructor.name === ...)` outside.

## Theme system

`src/theme/`:
- `defaults.js` — `DEFAULT_THEME`, `LCD_COLOR_PRESETS`, `BACKGROUND_PRESETS`
- `themeStore.js` — localStorage
- `Theme.js` — getters (`isLcd`, `getAccentColor`, `applyGlow`, `lineWidth`, `getCableWidth`, `getJackStyle`, `getGridStyle`, ...)
- `currentTheme.js` — singleton + `window.__theme__`

Presets: **classic** / **lcd**. Deep merge for `lcd`, `cables`, `background`, `grid`.

**All `draw()` use `getCurrentTheme()`.** Jack colors in Classic = `CABLE_COLORS[type]` (never from theme). MiniVU LCD = single accent fill.

## Tauri

- `src-tauri/tauri.conf.json` — `frontendDist: "../dist"`, **no `version` field** (Tauri reads `Cargo.toml`)
- `src-tauri/Cargo.toml` — **`version`** (single source of truth for Tauri)
- `src-tauri/capabilities/default.json` — `windows` must include ALL window labels needing fs (`["main", "editor"]`)
- `src-tauri/src/lib.rs` — plugins (`tauri_plugin_fs`, `tauri_plugin_dialog`)

## Vite

- `server.port: 3000`
- `server.middleware` — `/editor` → `/editor/editor.html`
- `resolve.alias` — `@` → `src`, `@editor` → `editor`
- `build.rollupOptions.input` — `main` + `editor`
- **`plugins: [stableModulesOnly()]`** — build filter (see *Module status*)

## Keyboard shortcuts

**Main:** `Space` (menu) / `Space+drag` (pan) / `Ctrl+wheel` (zoom) / `D` or `В` (Design) / `Delete` / `Escape` / right-click.

**Editor:** `Ctrl+wheel` / `+` / `-` (zoom) / `0` (reset) / `Escape` / `Delete` / right-click / `Ctrl+S` (code) / `↑`/`↓` (terminal) / `Tab` (4 spaces).

## Development rules (short)

Only non-obvious rules that are easy to violate. Full list → `ARCHITECTURE.md` → *Development rules (short)*.

1. **No `chnset`/`chnget` inside UDO** — parameters via `xin`, indicators via `led_rms`/`mVU_rms` called after module in `instr 1/2`.
2. **Csound names always from `type`/`jsonName`**, never `displayName`/`title`.
3. **No direct `fetch('/api/...')`** — use `libraryStore`.
4. **No top-level `await import()`** in `src/api/index.js`.
5. **All `draw()` use `getCurrentTheme()`**.
6. **`removeModuleFromLayer` searches ALL layers.**
7. **Keyboard shortcuts skip in `<input>`/`<textarea>`/`contentEditable`.**
8. **Component serialization via `ComponentRegistry`** — no manual `if/else` on `constructor.name`.
9. **`params` order = `components[]` order**, never sort.
10. **Grid step = `BASE_STEP_X/Y * multX/multY`.** No hardcoded 20/15.
11. **UDO loading via `_loadUdoByPath()`** — no raw fetch for `user/*`.
12. **`mappingTable` only on `Knob`/`Slider`.**
13. **`MidiManager` never touches Csound directly** — always via `CsoundEngine.midiMessage()`.
14. **MIDI enabled by user click** (`MI`) — never auto-init.
15. **`phasor` frequency = `(sr / ksmps) / bufferSize`**, not `1/bufferSize`.
16. **`tablew` with normalized index needs `ixmode=1`.**
17. **Overlay drawing** via `comp.drawOverlay(ctx)` in separate pass after all panels (`EditorApp.drawOverlays()`, `ModularSystem._renderCables()` overlay loop). Never inside `comp.draw()`.
18. **`Panel.draw()` sets `comp._panelHeight = this.height`** before `comp.draw()` — needed by `PartSelector.getMenuBounds()`.
19. **`PartSelector` requires `this.onChange = null`** in constructor — `ModuleFactory` wraps `onChange` for Csound `setControlChannel`.
20. **`indicator`** requires `sourceComponentId` pointing to same-module Input/Output. Missing → disabled with warn.
21. **`includes.add('led_rms.txt')` and `includes.add('miniVU.txt')`** in `CsoundGenerator` constructor.
22. **`PatchManager.updateJackConnection` never paints jack with cable's color.**
23. **`BaseJack.originalType`** (immutable), **`.type`** (mutable, variant-applied), **`.bandwidth`** (must match UDO `;@ strict`).
24. **`CABLE_COLORS` and `TYPE_FAMILY` in `src/constants.js`.** No local copies.
25. **Status field is `status`** — colors from `getStatusMeta(status)`. Never hardcode color in UI.
26. **`moduleStatusStore` is separate file** — `getModuleStatus`, `getStatusMeta`, `IS_DEV`. Do not read `status` inline elsewhere.
27. **`ModuleFactory.loadModule(lib, name)`** — the only way to register a module. Sets `definition.library` and `definition.isUser`. On type collision from a different library: console warning, **returns `true`**.
28. **`saveService.saveModule(app, { lib, name })`** — the only save path. Used by Toolbar and Terminal. `generateJsCode()` lives **only** in `saveService.js`.
29. **`libraryStore.createLibrary(name, meta)`** — writes `<lib>/_meta.json` + `<lib>/modules/`. Never overwrites existing `_meta.json`.
30. **No `await import()` inside sync methods.** `PropertiesPanel._renderModuleTab` is synchronous — `getStatusMeta` imported at top.
31. **`reloadUserModules()` → `libraryStore.invalidateCache()` первым делом.**
    Web: `index.html` и `editor.html` — разные вкладки, разные инстансы
    `WebLibraryStore`, разные `_moduleCache`. Без сброса основное окно читает
    старую версию definition из памяти.
32. **`ModuleFactory.loadModule` — `prev.library && prev.library !== lib`**
    (не `prev.library !== lib`). Иначе при `undefined` library у старой
    регистрации перезагрузка того же type из того же lib пропускается.
33. **`refreshPanel` не перезаписывает runtime-состояние компонентов** —
    `value` / `isActive` / `selectedIndex` / `currentIndex` / `connected` /
    `cables` / `csoundChannel` / непустой `csoundName`. Обновляется только
    «описание» (`x/y/labels/mappingTable/jackType/bandwidth/...`).
34. **`csoundGen.removeModule` + `addModule` при hot-reload** — bus'ы
    существующих кабелей (`_cableBusMap[cable.id]`) сохраняются, т.к. привязаны
    к `cable.id`, а не к модулю. Не сбрасывать `_cableBusMap`.
35. **`recomputeVariantUI()` сам триггерит recompile** — не вызывать
    `_recompileDebounced()` перед ним в `reloadUserModules`, иначе двойной ORC.

## Style

- **Russian for user, English for public docs and code comments.**
- **No "let's try"** — concrete edits. Show diff or full methods.
- **Do not change what wasn't asked about.**
- **Minimal patch.** Ask about goal → clarify files → check `TODO.md` for related issues → propose.
```

