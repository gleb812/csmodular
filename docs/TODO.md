
# TODO — CsModular

Roadmap for the alpha and beyond. Done items are removed, not struck through.
NM2 legacy is gone — no `patch_params.py`, no `moduleStore`, no `typeID`.

## 🔥 Now (alpha blockers)

- [ ] **`libraryStore` round-trip** — save → reload → ORC identical (regression test)
- [ ] **Reinit problem** — adding a module with controllers (repro + fix)
- [ ] **Save confirmation** — `saveModule` overwrites silently; check `loadModule` first, `confirm()` if exists
- [ ] **`ConfirmDialog`** — replace `window.confirm()` (Tauri macOS WKWebView unreliable)
- [ ] **MIDI dies after recompile** — `@csound/browser` IPC bug; try 7.0.0-beta or 6.18.5; document workaround
- [ ] **HiDPI (`dpr > 1`)** — modules don't drag on macOS Retina / Windows 125–150%; `resizeCanvasToWindow` hardcodes `dpr = 1`

## 📦 Alpha release prep

- [ ] **`stableModulesOnly`** — extend `passable` in build filter (currently only `stable`)
- [ ] **All modules have `status`** — audit `public/libraries/*/modules/*.js`
- [ ] **Demo library** — `test-lib` with 2–3 modules, `_meta.json`, `_index.json`
- [ ] **2–3 demo patches** — save as `.json`, include in repo (`public/patches/`)
- [ ] **Screenshots / preview** — README + GitHub repo
- [ ] **Remove stars** (legacy rating) once `status` is complete
- [ ] **App icon** — replace default Tauri icon

## 🎛 Csound / Engine

### Stability
- [ ] `recompile` with 20+ modules — stress test
- [ ] ORC compilation errors → show in UI (not just console)
- [ ] Csound messages → dedicated panel (not just console)

### Performance
- [ ] `channelPtr` (SharedArrayBuffer) instead of `getChannel` — 10x faster; requires COOP/COEP headers
- [ ] AudioWorklet restart — verify

### Features
- [ ] **Variant switching UI** — jacks/cables recolor automatically, but no manual picker
- [ ] **Jack type picker** — in editor Properties
- [ ] **`bandwidth` toggle** — `static` / `dynamic` in Properties
- [ ] Record Csound output to WAV
- [ ] **Topological module sort** — currently insertion order, feedback sees 1 k-block delay

### UDO
- [ ] `led_peak` UDO variant with `abs()` — positive-period LED (currently `led_rms` signed)
- [ ] `led_rms` — keep signed (intentional for LFO); document

## 🎹 MIDI

### Features
- [ ] Velocity support (`gkVelocity` — currently ignored)
- [ ] Polyphonic voice allocation — `gkGate` / `gkNote` global; need per-voice state
- [ ] MIDI channel filter — separate instruments per channel
- [ ] MIDI Learn — **multiple CCs per component** (currently one mapping)
- [ ] MIDI Learn — **CC range / curve** (min/max, linear/log per mapping)
- [ ] Device selection UI — pick one input out of many
- [ ] Tauri/macOS — WKWebView has no Web MIDI; needs plugin or Rust-side (`midir` crate)
- [ ] OSC — after MIDI is stable

### Testing
- [ ] Chrome / Edge (Web MIDI out of the box)
- [ ] Firefox on Windows / macOS
- [ ] Tauri on Windows (WebView2)
- [ ] Tauri on Linux (WebKitGTK)
- [ ] Tauri on macOS (WKWebView — expected to fail, needs plugin)

## 🎨 Theme / Design Settings

- [ ] Custom background upload (file input → dataURL → localStorage)
- [ ] Custom LCD palette — save custom colors
- [ ] Theme presets — save multiple theme sets
- [ ] Preview canvas in the panel — mini-module to preview changes
- [ ] Dark grey / black LCD presets (`#4a4a4a`, `#1a1a1a`)
- [ ] Parallax toggle in the panel
- [ ] Line weight per type (panel border, cable, jack)
- [ ] **`logicAudio` LCD style** — currently same as `logic`

## 🕸 Grid system

- [ ] **HiDPI `dpr > 1`** — see 🔥 Now
- [ ] Auto-align on drag after multipliers change
- [ ] Grid visual styles — minor / major crosses
- [ ] Crosses size LOD — reduce density when zoomed out
- [ ] Highlight nearest grid node under cursor
- [ ] Grid toggle in main UI (not only via theme settings)

## 🌍 Infinite world / Layers

- [ ] Verify: switching layer on a module with cables — all cables removed
- [ ] Verify: loading a large patch (20+ modules) — FX auto-layout works
- [ ] Optional: physical divider for new FX (UX decision)

## 🧩 Components

### Real-time visual
- [ ] `VUMeter` — level indicator (RMS, peak)
- [ ] `Oscilloscope` — integrated into the editor
- [ ] `Spectrum` — FFT analyzer

### Interactive
- [ ] **`TextField`** — not a parameter (display only) — verify
- [ ] **LED threshold** — verify save / load
- [ ] **`ButtonFlat` / `ButtonIncDec`** — reposition + width recalculation after `items` / `positions` change via Properties
- [ ] **`ComponentPropertiesWindow`** — open on click (currently only via button)
- [ ] **MIDI Learn indicator on knob** — small 🎹 dot on canvas (currently only in tooltip)
- [ ] **MIDI Learn on `ButtonFlat` / `ButtonIncDec` / `PartSelector`** — currently Knob/Slider only
- [ ] **MIDI Learn visual feedback during learn** — knob glows / pulses while waiting for CC

### Indicators
- [ ] `LED` / `MiniVU` — per-indicator gain/threshold UI in Properties
- [ ] MiniVU peak-hold
- [ ] `led_peak` UDO variant

## 🖥 Tauri / Desktop

- [ ] **Export / import library as `.zip`** (web + Tauri)
- [ ] **`libraryStore.createLibrary(name)`** — mkdir on Tauri, first key on web
- [ ] **Sync web ↔ Tauri** — `.zip` import/export
- [ ] **Tauri events** — `library-changed` / `module-saved` → main window refreshes menu
- [ ] **CI** — auto-build for Windows / Linux / macOS
- [ ] **`libraryStore.tauri.js` in dev** — `BaseDirectory.Resource` empty in `target/debug/`; needs fallback or manual copy
- [ ] **Remove fallback download** from `ModulePropertiesWindow.saveModule()`
- [ ] **Rebuild exe** after design updates
- [ ] Android / iOS targets (later)
- **Auto hot-reload** — `BroadcastChannel('csmodular-library')` из
  `saveService`/`libraryStore.saveModule` → `ModularSystem.reloadUserModules()`
  без кнопки. Web: работает между вкладками. Tauri: тот же `BroadcastChannel`
  в WebView (проверить).


## 🔌 Bridge / External API

- [ ] Bundle bridge into Tauri as sidecar (no separate `npm start`)
- [ ] OSC routing — map arbitrary OSC addresses to module params (currently only `/csp/...` known addresses)
- [ ] Auth token for REST/WS (if exposed beyond `127.0.0.1`)
- [ ] WebSocket reconnect if bridge restarts
- [ ] Full OSC address list — add `/csp/module/remove`, `/csp/module/move`, `/csp/cable/connect`, `/csp/cable/remove` (currently REST-only)
- [ ] Document `bridge/` structure in `ARCHITECTURE.md`

## 🎨 Main app UX

- [ ] Undo / Redo (Command pattern)
- [ ] Copy / paste modules (Ctrl+C/V)
- [ ] Rubber-band selection
- [ ] Save camera in patch (offsetX/Y, scale) — reopen where you closed
- [ ] Search / filter modules when adding
- [ ] Jack context menu with active channels
- [ ] Hotkey summary in UI (or About)
- [ ] Library selector in ContextMenu (multiple libraries)
- [ ] **`libraryStore` import/export UI** (ZIP)
- [ ] **Repair patch dialog** — if `user/X` missing but `my-fm/X` exists, offer replacement
- [ ] **BPM automation** — record tempo changes in the patch, replay them
- [ ] **Transport:** tap-tempo on BPM display (double-click resets to 120 — verify it's discoverable)

## 📐 Module Editor

### In progress / near term
- [ ] Remove `Change Color` from context menu (color in Properties)
- [ ] **`PropertiesPanel._render()`** — replace `style.cssText +=` with `cssText = ''` + base + active/inactive
- [ ] **`TerminalPanel._cmdSet(mappingTable)`** calls `updateCode()`, `PropertiesPanel` mapping-select doesn't — unify
- [ ] **Save as → `<library>`** (default `user`)
- [ ] **Library meta editor** — edit `author` / `version` / `description` / `geometry` after `+ New`
- [ ] **`load` ambiguity error** — show candidate list when name in multiple libraries
- [ ] **Terminal autocomplete** on Tab
- [ ] **Terminal `history` command**, `!!` repeat, `!N` repeat by index
- [ ] **Terminal `snapshot`** — save / restore module state in session
- [ ] **Terminal `export json` / `export dsp` / `export csd`**
- [ ] **Terminal richer output coloring** (`id=3` → clickable to select)
- [ ] **Terminal `find <pattern>` / `props <id>` / `id free`**
- [ ] **`add N type row` / `add N type col`** — batch add with spacing
- [ ] **`clone <id>`** — duplicate component
- [ ] **`macro <name>`** — user-defined macro commands

### Later
- [ ] **CodeMirror 5 or 6** — undo/redo, search, autocomplete, Csound mode, protected ranges as `readOnly`
- [ ] **Legacy cleanup** — remove `ModulePropertiesWindow` / `ComponentPropertiesWindow`
  - `saveModule()` → `saveService`
  - `_showMappingBrowser()` → `PropertiesPanel`
- [ ] **Collapsible panels** in `DockLayout`
- [ ] **Multi-select** in Properties (tabs for multiple components)
- [ ] **Align / distribute UI** (already in terminal, add to Properties / context menu)
- [ ] **`preview` command** — send generated UDO to main app
- [ ] **Editor undo / redo** (separate from main app)
- [ ] **Component grouping** — visual groups, model support

### Known issues (Editor)
- [ ] Code Viewer — no virtualized highlight, may lag on very large code
- [ ] Code Viewer — undo/redo browser-default (single textarea), not per-code
- [ ] `DockLayout` — no collapse, no tabs, no drag-reorder
- [ ] Terminal `_cmdSave` duplicates logic from `PropertiesPanel` — should be one service
- [ ] Old modules lack `mappingTable` on `Knob` / `Slider` — re-assign and re-save
- [ ] **`/tables/` HTML listing** — `_listTableNames` returns `[]` in build/prod. Workaround: `public/tables/_index.json`
- [ ] **`mapping-multi-select` reorder** — no drag/↑↓ UI; uncheck all and select in order
- [ ] **`PartSelector.onChange`** missing in constructor — `ModuleFactory` wraps it

## 🧪 Quality

### Tests (`Vitest` + `jsdom`)
- [ ] `ModuleFactory.createModule`
- [ ] `PatchManager.addCable`
- [ ] `LayerManager.isGridCellFree` / `findFreeSpace` (with `stepX/stepY`)
- [ ] `Grid.snapToGrid` (snap on/off, multX/multY)
- [ ] `CsoundGenerator.formatModuleLine`
- [ ] `CsoundGenerator.addModule` / `removeModule`
- [ ] `CsoundGenerator._loadUdoByPath` (library / builtin, HTML fallback)
- [ ] `libraryStore.loadModule` / `loadUdo` / `saveModule` / `removeModule` (web + Tauri mocks)
- [ ] `ModuleFactory.loadModule` (collision across libraries, `library` field injected)
- [ ] `PatchLoader.loadPatch` (v2 with `library`, v1 fallback)
- [ ] `Theme` methods (`getCableWidth`, `getGridStyle`)
- [ ] `removeModuleFromLayer` (multi-layer search)
- [ ] `ComponentRegistry` — round-trip serialize/deserialize for each type (incl. `mappingTable`)

### Refactoring
- [ ] Extract `CsoundEngine` into separate package
- [ ] Remove `window.csound` — all access via `CsoundEngine`
- [ ] `Knob.setValue` / `Slider.setValue` — remove `window.csound.setControlChannel` (use callbacks)
- [ ] Split `main.js` (2000+ lines) into modules
- [ ] Remove duplicates in `CsoundGenerator` (double `_findCablesForOutput`)
- [ ] Split `Panel` from `src/components/` into `Model` / `View`
- [ ] `Panel.draw` — move FX stripe to separate method
- [ ] `Theme.js` — split into `ThemeClassic` / `ThemeLcd` (strategy pattern)
- [ ] **Unify save service** — `TerminalPanel._cmdSave`, `PropertiesPanel`, `Toolbar._onSave`
- [ ] **`ModuleFactory` keyed by `<lib>/<type>`** — proper collision handling (currently first-wins)

### Documentation


## 🐛 Known issues (app)

- [ ] Cable over LED erased on LED redraw (fixed via overlayCanvas — verify)
- [ ] `CsoundEngine._ledValues` not cleared on `stop()` — stale values 1–2 frames
- [ ] Fast LED toggling uneven (`setInterval(50ms)`)
- [ ] `led_rms` signed — intentional; `led_peak` variant in TODO
- [ ] `PATCH_LOAD`: on error — may leave partially loaded patch
- [ ] `setLayer` — module may lose `customColor` on layer switch (verify)
- [ ] FX stripe may overlap content on modules with `customColor` (verify)
- [ ] `getLayerAtPoint` always returns `'voice'` — old code may depend on `y`
- [ ] `sourceComponentId` missing in old modules — LED/MiniVU disabled
- [ ] `bandwidth` missing in old modules — defaults to `dynamic`, static jacks may have changed
- [ ] `tableByMode` missing in old modules — `TextField` falls back to `tableName` or raw
- [ ] `formatModuleLine` uses `moduleDef.params` — not recalculated
- [ ] Module call order — insertion order, not topological

## 📝 Notes

- **Storage:** Tauri — `~/Documents/CsModular/libraries/`; Web — IndexedDB (`csmodular/libraries`)
- **Editor layout:** `csmodular:editor-layout` in localStorage
- **Editor open:** browser — `window.open`, Tauri — `WebviewWindow`
- **Capabilities:** new window label → add to `src-tauri/capabilities/default.json`
- **`params`** = opcode argument order; must match `xin`. Not sorted.
- **`formatModuleLine`** = `<params>` + `<mode>` + `<inputs>` + `<outputs>` (fixed order)
- **Includes** loaded lazily via `CsoundGenerator.includes` (Set)
- **No top-level `await import()`** in `src/api/index.js`
- **`window.__theme__`** available in console
- **`removeModuleFromLayer`** searches all layers
- **`getLayerAtPoint`** always `'voice'`
- **FX auto-layout** via `_getFxFloorY()`
- **`_isColorValue()`** in `main.js` / `DesignSettingsPanel`
- **Keyboard shortcuts** skip in `<input>` / `<textarea>` / `contentEditable`
- **`ComponentRegistry`** — single source of truth for components
- **Grid step** = `BASE_STEP_X/Y * multX/multY`; `gridX/gridY` integers in base cells
- **Protected code structure** — header/body/footer; `updateCode()` preserves body; `syncFromModule()` resets it; `_structureCache` rebuilt on each input
- **`mappingTable`** on `Knob`/`Slider` — serialized/deserialized
- **`load` must not call `syncFromModule()`**
- **MIDI chain** — `MidiManager.onMessage` → `CsoundEngine.midiMessage()` → `instr 3` → `gkGate`/`gkNote`
- **MIDI enabled only by user click** (`MI`)
- **BPM channel** — literal `"bpm"`; `instr 5` polls `chnget "bpm"`; must be in `generateSco()` (never hardcode `sco` in `CsoundEngine`)
- **MIDI Learn** — `BaseComponent.midiMapping` (`{cc, channel}` | `null`); `Knob`/`Slider` override `applyMidiValue()`
- **EXT tempo** — `MIDI Clock` (`0xF8`, 24 ppqn); `_bpmSource` = `internal` | `external`
```
