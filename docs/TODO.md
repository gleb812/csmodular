
# TODO — CsModular

## Current tasks

- [ ] Reinit problem: adding a module that contains controllers
- [ ] `Mix1-1A` — exp/lin selector change leads to error
- [ ] Some DSP code still contains `d` parameter in `@map` line — should be eliminated
- [ ] At zoom 50% and lower the working area also resizes

### P2 — UX

- [ ] Make 2–3 demo patches
- [ ] Demo screenshots / preview in README

---

## 🎨 Theme / Design Settings

- [ ] Custom background upload (file input → dataURL → localStorage)
- [ ] Custom LCD palette — save custom colors to localStorage
- [ ] Theme presets — save multiple theme sets
- [ ] Preview canvas in the panel — mini-module to preview changes
- [ ] Dark grey / black LCD presets (`#4a4a4a`, `#1a1a1a`)
- [ ] Parallax toggle in the panel
- [ ] Line weight per type (panel border, cable, jack)

---

## 🕸 Grid system

- [ ] HiDPI: fix `dpr > 1` drag bug (modules don't drag on macOS Retina). Currently `resizeCanvasToWindow` hardcodes `dpr = 1`
- [ ] Auto-align on drag (first drag after multipliers change) — verify that modules placed at non-multiple positions are aligned cleanly
- [ ] Grid visual styles: minor / major crosses (like graphics editors), optional
- [ ] Crosses size LOD — reduce visual density when zoomed out
- [ ] Highlight nearest grid node under cursor (helpful for precise placement)
- [ ] Grid toggle in main UI (not only via theme settings)
- [ ] `grid` command in editor terminal — currently independent from main app; consider unifying step semantics

---

## 🌍 Infinite world / Layers

- [ ] Verify: switching layer on a module with cables — all cables removed
- [ ] Verify: loading a large patch (20+ modules) — FX auto-layout works
- [ ] Optional: physical divider for new FX (UX decision)

---

## 🖥 Tauri / Desktop

- [x] Tauri shell (windows, fs)
- [x] `moduleStore` for Tauri (fs) — user modules in `Documents/CsModular/`
- [x] Module Editor in a separate window (`WebviewWindow`)
- [x] Capabilities for `main` and `editor` windows
- [x] Design Settings works in Tauri
- [x] Theme persisted in localStorage (works in Tauri)
- [x] Web `moduleStore` (localStorage) — user modules persist in browser
- [ ] IndexedDB for web `moduleStore` (larger modules, no quota issues)
- [ ] Sync between web and Tauri (`.zip` import/export?)
- [ ] App icon (currently default Tauri)
- [ ] Remove fallback download from `ModulePropertiesWindow.saveModule()`
- [ ] Tauri events: `module-saved` → main window refreshes list
- [ ] CI: auto-build for Windows / Linux / macOS
- [ ] Android / iOS targets (later)
- [ ] Rebuild exe after design updates

---

## 🎛 Csound / CsoundEngine

### Stability

- [ ] Test `CsoundEngine.recompile` with 20+ modules
- [ ] Catch ORC compilation errors → show in UI
- [ ] Log Csound messages to a dedicated panel (not just console)

### Performance

- [ ] Replace `getChannel` with `channelPtr` (SharedArrayBuffer) — 10x faster
- [ ] Requires COOP/COEP headers in Vite
- [ ] Check `AudioWorklet` restart

### Features

- [ ] Variant switching: `k` ↔ `a` opcode based on input cable types (NM2-style)
- [ ] Jack recoloring on variant switch
- [ ] Record Csound output to WAV
- [x] MIDI input (Web MIDI API + `MI` indicator + flash on message)
- [ ] MIDI: fix `recompile()` → MIDI dead (see Known issues)
- [ ] MIDI: velocity support (currently ignored, NM2 compat)
- [ ] MIDI: polyphonic voice allocation (currently `gkGate` / `gkNote` are global)
- [ ] MIDI: Tauri/macOS path (WKWebView has no Web MIDI — plugin or Rust-side)
- [ ] OSC (after MIDI stabilises)
- [ ] Custom UDOs for `debug` signals

### UDO loading

- [x] All UDO loading goes through `CsoundGenerator._loadUdoByPath()`:
  - `user/*` → `moduleStore` (web: localStorage, Tauri: fs)
  - built-in → `fetch` from `public/csound/modules/` with HTML-fallback detection
  - protects against Vite SPA-fallback (`index.html` with status 200 for missing files)
- [ ] `led_peak` UDO variant with `abs()` — for a "positive period" LED indicator
  (currently `led_rms` uses `portk kin, 0.1` without `abs`, so LFO LEDs
  follow both half-waves)

---

## 🎹 MIDI

### Done

- [x] `MidiManager` (`src/midi/MidiManager.js`) — Web MIDI API receiver
  - `requestMIDIAccess()` on user click
  - device connect/disconnect via `onstatechange`
  - message parsing → `{ status, data1, data2 }`
  - history (last 50 messages)
  - states: `idle` / `requesting` / `ready` / `denied` / `unsupported`
- [x] `CsoundEngine.midiMessage(status, data1, data2)` — forwards to `instance.midiMessage()`
- [x] `main.js` wiring: `MidiManager.onMessage → CsoundEngine.midiMessage()` (guarded by `state === 'running'`)
- [x] BottomBar `MI` button — enable / disable, flashes on incoming message
- [x] SysInfo popup — MIDI state, input count, last message
- [x] Csound `instr 3` (NM2-compatible MIDI filter) → `gkGate` / `gkNote`
- [x] Tested on Linux + Firefox + Tapco Link.MIDI 4x4 (ALSA sequencer)

### Bugs

- [ ] **MIDI dies after `CsoundEngine.recompile()`** — `@csound/browser` 6.18.7
  does not recreate internal IPC message ports after `reset()`.
  Symptoms:
  - after recompile — MIDI silently stops reaching Csound (no error)
  - on next `stop()` → `init()` — throws
    `TypeError: can't access property "csoundMainRtMidiPort", this.ipcMessagePorts is undefined`
  - **not caused by project code** — upstream bug
  - **workaround**: restart Csound (`■` → `▶`) after recompile; MIDI comes back
  - **candidate fix**: try `@csound/browser` 7.0.0-beta* or 6.18.5
- [ ] MIDI input lost if `midiMessage()` is called immediately after recompile —
  same root cause; guard with a short delay / readiness check if needed

### Not implemented (next steps)

- [ ] Velocity support (`gkVelocity` or similar — currently ignored, NM2 compat)
- [ ] Polyphonic voice allocation — `gkGate` / `gkNote` are **global**; need
  per-voice state in `instr 1`
- [ ] MIDI learn — map CC to knobs / sliders
- [ ] MIDI channel filter — separate instruments per channel
- [ ] Clock / transport (Start / Stop / Continue / Clock)
- [ ] Device selection UI — pick one input out of many
- [ ] Tauri/macOS — WKWebView does not expose Web MIDI; needs plugin or
  Rust-side MIDI (`midir` crate)
- [ ] OSC — after MIDI is stable

### Testing

- [ ] Chrome / Edge (Web MIDI works out of the box)
- [ ] Firefox on Linux (tested — OK via ALSA sequencer)
- [ ] Firefox on Windows / macOS
- [ ] Tauri on Windows (WebView2 — should work)
- [ ] Tauri on Linux (WebKitGTK — check distro)
- [ ] Tauri on macOS (WKWebView — expected to fail, needs plugin)

## 🧩 Components

### Real-time visual elements

- [ ] `VUMeter` — level indicator (RMS, peak)
- [ ] `Oscilloscope` — integrated into the editor
- [ ] `Spectrum` — FFT analyzer

### Interactive components

- [x] `getPropertySchema()` for `TextLabel`, `ButtonFlat`, `ButtonRadio`,
  `ButtonIncDec`, `ButtonText`
- [x] `mappingTable` serialize/deserialize for `Knob` and `Slider`
- [ ] Full `ComponentPropertiesWindow` for all types (currently mapped via schema)
- [ ] LED threshold — verify save / load
- [ ] `TextField` — not a parameter (display only)
- [ ] `ComponentPropertiesWindow` — open on click (currently only via button)
- [ ] `ButtonFlat` / `ButtonIncDec` — reposition and width recalculation after
  changing `items` / `positions` via Properties (currently width fixed)

---

## 🎨 Main app UX

- [ ] Undo / Redo (Command pattern)
- [ ] Copy / paste modules (Ctrl+C/V)
- [ ] Rubber-band selection
- [ ] Save camera in patch (offsetX/Y, scale) — reopen where you closed
- [ ] Search / filter modules when adding
- [ ] Jack context menu with active channels
- [ ] Hotkey summary in UI (or About)
- [ ] Minimap of the world (for large patches)

---

## 📐 Module Editor

### In progress / near term

- [ ] Remove `Change Color` from context menu (color is in Properties now)
- [ ] Terminal: autocomplete on Tab
- [ ] Terminal: `history` command, `!!` repeat, `!N` repeat by index
- [ ] Terminal: unify `_cmdSave` JS generation with `ModulePropertiesWindow.generateModuleCode`
- [ ] Terminal: `snapshot` — save / restore module state in session
- [ ] Terminal: `export json` / `export dsp` / `export csd`
- [ ] Terminal: richer output coloring (`id=3` → clickable to select component)
- [ ] Terminal: `find <pattern>`, `props <id>`, `id free`
- [ ] `PropertiesPanel._render()` — replace `style.cssText +=` on tabs with
  `=` and base + active/inactive suffix (currently accumulates over time)
- [ ] `TerminalPanel._cmdSet` for `mappingTable` calls `updateCode()`, but
  `PropertiesPanel` (mapping-select) does **not** — unify

### Later

- [ ] CodeMirror 5 or 6 instead of textarea + overlay
  - Proper undo/redo, search, autocomplete
  - Csound mode via `defineMode`
  - Bundle via npm, not CDN (ES module compatibility)
  - Protected ranges as `readOnly` marks
- [ ] Legacy cleanup: fully remove `ModulePropertiesWindow` / `ComponentPropertiesWindow` once `PropertiesPanel` covers all features
  - `ModulePropertiesWindow.saveModule()` — replace with a `saveService`
  - `ComponentPropertiesWindow._showMappingBrowser()` — move to `PropertiesPanel`
- [ ] `add N type row` / `add N type col` in terminal (batch add with spacing)
- [ ] `clone <id>` — duplicate component
- [ ] `macro <name>` — user-defined macro commands
- [ ] Component grouping — visual groups, model support
- [ ] Collapsible panels in `DockLayout` (click header → collapse to strip)
- [ ] Tabs in properties for multiple components (multi-select)
- [ ] `preview` command — send generated UDO to main app for live playback
- [ ] Editor undo / redo (separate from main app)
- [ ] Align / distribute UI (already in terminal, add to Properties or context menu)

### Known issues in Editor

- [ ] Code Viewer highlight not virtualized — may lag on very large code
- [ ] Code Viewer — undo/redo is browser-default (single textarea), not per-code
- [ ] `DockLayout` — no collapse, no tabs, no drag-reorder yet
- [ ] Terminal `_cmdSave` duplicates logic from `PropertiesPanel` — should be one service
- [ ] Editor keyboard shortcuts must skip when focus is in `<input>` / `<textarea>` — already fixed in `EditorApp`, but verify no other handlers
- [ ] Old saved modules do not contain `mappingTable` on `Knob` / `Slider`
  (from pre-fix era) — re-assign and re-save; otherwise LFO runs too fast
  and oscilloscope breaks

---

## 🧪 Quality

### Tests

- [ ] `Vitest` + `jsdom`
- [ ] `ModuleFactory.createModule`
- [ ] `PatchManager.addCable`
- [ ] `LayerManager.isGridCellFree`
- [ ] `LayerManager.findFreeSpace` (with `stepX/stepY`)
- [ ] `Grid.snapToGrid` (snap on/off, multX/multY)
- [ ] `CsoundGenerator.formatModuleLine`
- [ ] `CsoundGenerator.addModule` / `removeModule`
- [ ] `CsoundGenerator._loadUdoByPath` (user vs built-in, HTML fallback)
- [ ] `Theme` methods (`getCableWidth`, `getGridStyle`, `_isColorValue`)
- [ ] `removeModuleFromLayer` (multi-layer search)
- [ ] `ComponentRegistry` — round-trip serialize / deserialize for each type
  (including `mappingTable` for `Knob` / `Slider`)

### Documentation

- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/MODULE_FORMAT.md` — module structure (params, inputs, outputs, components)
- [ ] `docs/DATA_FLOW.md` — pch2 → JSON → JS → ORC → Csound
- [ ] `docs/THEME.md` — how to add a component to the theme
- [ ] `docs/GRID.md` — grid system (steps, multipliers, snap, crosses)
- [ ] `docs/CONTRIBUTING.md`

### Refactoring

- [ ] Extract `CsoundEngine` into a separate package
- [ ] Remove `window.csound` — all access via `CsoundEngine`
- [ ] `Knob.setValue` / `Slider.setValue` — remove `window.csound.setControlChannel` (use callbacks)
- [ ] Split `main.js` (2000+ lines) into modules
- [ ] Remove duplicates in `CsoundGenerator` (double `_findCablesForOutput`)
- [ ] Split `Panel` from `src/components/` into `Model` / `View`
- [ ] `Panel.draw` — move FX stripe to a separate method
- [ ] `Theme.js` — split into `ThemeClassic` / `ThemeLcd` (strategy pattern)
- [ ] Unify save service — `TerminalPanel._cmdSave`, `PropertiesPanel`, `Toolbar._onSave` all do slightly different things
- [ ] `Theme` constructor — merge `DEFAULT_THEME` sections explicitly (currently done for `lcd`, `cables`, `background`, `grid`)

---

## 🛠 User modules

- [ ] Auto-generate `typeID` for user modules (starting from 201, unique)
- [ ] Improve module parsing in `ModuleFactory._parseModuleDefinition` (regex → proper parser?)
- [ ] Export module as single `.zip` (JS + DSP + icon)
- [x] `_nextComponentId` — reset on `Load Module` in the editor (`restoreModuleFromData`)
- [ ] `_availableIds` — also reset on `Load Module` (currently reset on `New` only)

---

## 🐛 Known issues

- [ ] Artifact: cable over LED is erased on LED redraw (fixed via overlayCanvas)
- [ ] `CsoundEngine._ledValues` not cleared on `stop()` — may show stale values 1–2 frames
- [ ] Fast LED toggling looks uneven due to `setInterval(50ms)`
- [ ] `led_rms` shows signed value (no `abs`) — for LFO the LED follows both half-waves. Intentional for now, `led_peak` variant in TODO
- [ ] `ComponentPropertiesWindow` doesn't open on click (only via button)
- [ ] `PATCH_LOAD`: on error — may leave partially loaded patch
- [ ] `setLayer` — module may lose `customColor` on layer switch (verify)
- [ ] FX stripe may overlap content on modules with `customColor` (verify)
- [ ] `getLayerAtPoint` always returns `'voice'` — old code may depend on `y`
- [ ] HiDPI (`dpr > 1`) — modules don't drag correctly on macOS Retina and Windows 125–150% scaling. `resizeCanvasToWindow` currently hardcodes `dpr = 1` as a workaround. Investigate coordinate conversion between CSS px and physical px.
- [ ] **HTML leaked into ORC** for user modules when `fetch('/csound/modules/user/...')` returned Vite `index.html` (status 200). Fixed via `_loadUdoByPath` + HTML detection. If it happens again, check console for `⚠️ Got HTML instead of UDO for …`
- [ ] **Old saved modules without `mappingTable`** — after loading, LFO runs too fast (knob bypasses mapping), oscilloscope is broken. Re-assign `set <id> mappingTable <name>` and re-save.
- [ ] **DSP body lost on module load** — fixed by removing `syncFromModule()` from `TerminalPanel._cmdLoad` and rebuilding structure in `restoreModuleFromData`. If it happens again, check that `_cmdLoad` / `Toolbar._onLoad` do **not** call `syncFromModule()`.

---

## 📝 Notes

- Storage:
  - Tauri: user modules in `Documents/CsModular/`
  - Web: `localStorage` (`csmodular:user_modules` list, `csmodular:user_module:<name>` data)
- Editor layout persist: `csmodular:editor-layout` in localStorage
- Opening editor: browser — `window.open`, Tauri — `WebviewWindow` (see `ContextMenu.openModuleEditor`)
- Capabilities: when adding a new window — add its label to `src-tauri/capabilities/default.json`
- `ConnectorIndex` — not used in ORC generation, kept for NM2 import compatibility
- `typeID = 999` for all user modules — temporary, plan to generate unique
- `params` in a module = opcode argument order. Must match `xin` in UDO. Not sorted by id — order in `components` array.
- `formatModuleLine` builds: `<params>` + `<mode>` + `<inputs>` + `<outputs>`. Order is fixed.
- All user UDOs — in `csound/modules/user/`. Built-in — in `csound/modules/`.
- Includes are loaded lazily via `CsoundGenerator.includes` (Set of paths).
- **UDO loading goes through `CsoundGenerator._loadUdoByPath()`** — never raw `fetch` for `user/*`.
- Do not use top-level `await import(...)` in `src/api/index.js` — blocks the whole UI init
- `window.__theme__` available in console for theme debugging (`get`, `set`, `init`)
- `removeModuleFromLayer` searches in all layers — protects from phantoms
- `getLayerAtPoint` always returns `'voice'` — new modules are Voice by default
- FX auto-layout uses `_getFxFloorY()` — new FX modules fall below voice
- `_isColorValue()` in `main.js` and `DesignSettingsPanel` — distinguishes hex/rgb from image URL
- Keyboard shortcuts rule — global key handlers must skip when `e.target` is `<input>`, `<textarea>`, or `contentEditable`. Otherwise typing `0` in editor triggers `resetZoom()`.
- `ComponentRegistry` — single source of truth for component creation / serialization / Csound ports. Adding a new component type = one entry in `editor/ComponentRegistry.js`.
- Grid step = `BASE_STEP_X/Y * multX/multY`. `gridX/gridY` — integers in base cells (20×15). Changing `multX/multY` does not move existing modules. All placement / `findFreeSpace` should use `stepX/stepY = multX/multY` (if snap) or `1/1`.
- **Protected code structure** in editor Code Viewer:
  - Header (🔒) — `;@ map`, `opcode`, `xin`, mapping lines
  - Body (editable) — user DSP
  - Footer (🔒) — `zar`/`zkr`/`init`, `zaw`/`zkw`, `endop`
  - Structural keywords (`zar`, `zkr`, `zaw`, `zkw`, `xin`, `opcode`, `endop`) forbidden in body
  - `updateCode()` preserves body; `syncFromModule()` resets it
  - `_structureCache` rebuilt from `editor.value` on each `input` — index drift safe
- **`mappingTable` on `Knob` / `Slider`** is serialized and deserialized. Any new component with mapping support must update both `serialize` and `deserialize` in `ComponentRegistry.js`.
- **`load` must not call `syncFromModule()`** — it wipes the loaded DSP body. `restoreModuleFromData` already rebuilds the structure correctly.
- **MIDI chain**: `MidiManager.onMessage` → `CsoundEngine.midiMessage()` →
  Csound `instr 3` (`midiin`) → `gkGate` / `gkNote`. `MidiManager` never
  touches Csound directly — always via `CsoundEngine`.
- **MIDI enabled only by user click** (`MI` in BottomBar) — browsers require
  a user gesture for `requestMIDIAccess()`. Never auto-init on page load.
- **`instr 3`** — NM2-compatible MIDI filter. Velocity is **ignored** by
  design (`gkGate` / `gkNote` only). Other messages (CC, pitch bend) pass
  through `midiin` and are available via `gkstat` / `gkchan` / `gkdata1` /
  `gkdata2`.
