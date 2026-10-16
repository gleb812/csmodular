
```markdown
# TODO — CsModular

## Current tasks

- [ ] Reinit problem: adding a module that contains controllers
- [ ] `Mix1-1A` — exp/lin selector change leads to error
- [ ] Some DSP code still contains `d` parameter in `@map` line — should be eliminated
- [ ] Csound code window in Editor mode behaves badly *(partially resolved — see Module Editor section)*
- [ ] At zoom 50% and lower the working area also resizes

### P2 — UX

- [ ] Make 2–3 demo patches
- [ ] Demo screenshots / preview in README

---

## 🎨 Theme / Design Settings

- [x] Theme system: `classic` / `lcd` presets
- [x] `Theme.js` — semantic methods (`getAccentColor`, `getCableWidth`, ...)
- [x] `themeStore` (localStorage)
- [x] `currentTheme` + `window.__theme__` for debugging
- [x] Design Settings panel (opens with `D` or 🎨)
- [x] All components use `getCurrentTheme()`
- [x] LCD style: glow, transparent panels, monochrome
- [x] Solid backgrounds + image presets
- [x] `_isColorValue()` — distinguishes hex / rgb / url
- [ ] **Custom background upload** (file input → dataURL → localStorage)
- [ ] **Custom LCD palette** — save custom colors to localStorage
- [ ] **Theme presets** — save multiple theme sets
- [ ] **Preview canvas** in the panel — mini-module to preview changes
- [ ] **Dark grey / black** LCD presets (`#4a4a4a`, `#1a1a1a`)
- [ ] **Parallax toggle** in the panel
- [ ] **Line weight** per type (panel border, cable, jack)

---

## 🌍 Infinite world / Layers

- [x] Canvas = window, infinite world
- [x] Pan: `Space + drag` / middle mouse
- [x] Zoom: `Ctrl + wheel` (around cursor)
- [x] Scroll: `wheel` / `Shift + wheel`
- [x] `LayerManager` without physical bounds
- [x] `getLayerAtPoint` → always `'voice'`
- [x] **Layer attribute** on module: `'voice'` / `'fx'`
- [x] **Auto-layout FX**: `_getFxFloorY()` — new FX below voice
- [x] **Shift FX on load**: `_fxStartY` in `PatchLoader`
- [x] **setLayer** via `ModuleContextMenu` (with confirmation, cable cleanup)
- [x] **`removeModuleFromLayer`** — searches all layers
- [x] FX stripe on the left side of the module
- [ ] **Remove dead code** from `LayerManager` (`updateLayerSizes`, `drawLayerGrid`, `updateGridCache`, `divider`)
- [ ] **Remove dead `updateCanvasSize`** from `main.js` (references `this.divider`)
- [ ] **Remove `fetch('/api/list-user-modules')`** from `loadAvailableModules` in `main.js`
- [ ] **Verify**: switching layer on a module with cables — all cables removed
- [ ] **Verify**: loading a large patch (20+ modules) — FX auto-layout works
- [ ] **Optional**: physical divider for new FX (UX decision)

---

## 🖥 Tauri / Desktop

- [x] Tauri shell (windows, fs)
- [x] `moduleStore` for Tauri (fs) — user modules in `Documents/CsModular/`
- [x] Module Editor in a separate window (`WebviewWindow`)
- [x] Capabilities for `main` and `editor` windows
- [x] Design Settings works in Tauri
- [x] Theme persisted in localStorage (works in Tauri)
- [x] Web `moduleStore` (localStorage) — user modules persist in browser
- [ ] **IndexedDB** for web `moduleStore` (larger modules, no quota issues)
- [ ] **Sync** between web and Tauri (`.zip` import/export?)
- [ ] **App icon** (currently default Tauri)
- [ ] **Remove fallback download** from `ModulePropertiesWindow.saveModule()`
- [ ] **Tauri events**: `module-saved` → main window refreshes list
- [ ] **CI**: auto-build for Windows / Linux / macOS
- [ ] **Android / iOS** targets (later)
- [ ] **Rebuild exe** after design updates

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

- [ ] **Variant switching**: `k` ↔ `a` opcode based on input cable types (NM2-style)
- [ ] **Jack recoloring** on variant switch
- [ ] Record Csound output to WAV
- [ ] MIDI input (Web MIDI API + indicator)
- [ ] Custom UDOs for `debug` signals

---

## 🧩 Components

### Real-time visual elements

- [ ] `VUMeter` — level indicator (RMS, peak)
- [ ] `Oscilloscope` — integrated into the editor
- [ ] `Spectrum` — FFT analyzer

### Interactive components

- [ ] Clean up `ButtonRadio`, `ButtonIncDec`, `TextField`, `TextEdit`
- [ ] Full `ComponentPropertiesWindow` for all types
- [ ] LED threshold — verify save / load
- [ ] **`TextField`** — not a parameter (display only)
- [ ] **`ComponentPropertiesWindow`** — open on click (currently only via button)

---

## 🎨 Main app UX

- [ ] **Undo / Redo** (Command pattern)
- [ ] **Copy / paste modules** (Ctrl+C/V)
- [ ] **Rubber-band selection**
- [ ] **Save camera** in patch (offsetX/Y, scale) — reopen where you closed
- [ ] **Search / filter** modules when adding
- [ ] **Jack context menu** with active channels
- [ ] **Hotkey summary** in UI (or About)
- [ ] **Minimap** of the world (for large patches)

---

## 📐 Module Editor

### Done

- [x] Separate HTML entry: `editor.html` → `editor/editor.js`
- [x] **Fixed dock layout** (`DockLayout.js`) with split panes
- [x] **Layout presets**: `Default`, `Code`, `Canvas`
- [x] Layout persists in localStorage (`csmodular:editor-layout`)
- [x] **Toolbar** (`Toolbar.js`): New / Load / Save + layout presets
- [x] **ComponentRegistry** — single source of truth for components
- [x] **Context menu** on canvas / on component (`ContextMenu.js` + `ModuleContextMenu.js`)
- [x] **Properties panel** with `Module` / `Component` tabs (`PropertiesPanel.js`)
- [x] **Module tab**: name, height, color (preset buttons + hex input)
- [x] **Component tab**: schema-driven fields from `getPropertySchema()`
- [x] **Csound Code panel** with syntax highlight, line numbers, font controls
- [x] **Terminal panel** (`TerminalPanel.js`) — command DSL:
  - `add` / `in` / `out`, `ls`, `del`, `mv`, `map`, `align`, `distr`, `grid`, `new`, `save`, `load`, `stats`, `help`, `clear`
- [x] Web `moduleStore` via localStorage — save / load works in browser
- [x] Tauri `moduleStore` — save / load writes to `Documents/CsModular/`

### In progress / near term

- [ ] **Remove `Change Color`** from context menu (color is in Properties now)
- [ ] **Terminal**: autocomplete on Tab
- [ ] **Terminal**: `history` command, `!!` repeat, `!N` repeat by index
- [ ] **Terminal**: `add in c` / `add out c` for control jacks
- [ ] **Terminal**: unify `_cmdSave` JS generation with `ModulePropertiesWindow.generateModuleCode`
- [ ] **Terminal**: `snapshot` — save / restore module state in session
- [ ] **Terminal**: `export json` / `export dsp` / `export csd`
- [ ] **Terminal**: richer output coloring (`id=3` → clickable to select component)
- [ ] **Terminal**: `find <pattern>`, `props <id>`, `id free`

### Later

- [ ] **CodeMirror 5 or 6** instead of textarea + overlay
  - Proper undo/redo, search, autocomplete
  - Csound mode via `defineMode`
  - Bundle via npm, not CDN (ES module compatibility)
- [ ] **Legacy cleanup**: fully remove `ModulePropertiesWindow` / `ComponentPropertiesWindow` once `PropertiesPanel` covers all features
  - `ModulePropertiesWindow.saveModule()` — replace with a `saveService`
  - `ComponentPropertiesWindow._showMappingBrowser()` — move to `PropertiesPanel`
- [ ] **`add N type row`** / **`add N type col`** in terminal (batch add with spacing)
- [ ] **`clone <id>`** — duplicate component
- [ ] **`macro <name>`** — user-defined macro commands
- [ ] **Component grouping** — visual groups, model support
- [ ] **Collapsible panels** in `DockLayout` (click header → collapse to strip)
- [ ] **Tabs in properties for multiple components** (multi-select)
- [ ] **`preview` command** — send generated UDO to main app for live playback
- [ ] **Editor undo / redo** (separate from main app)
- [ ] **Align / distribute UI** (already in terminal, add to Properties or context menu)

### Known issues in Editor

- [ ] **Terminal** always uses `audio` jack type for Input / Output (control jacks only via UI)
- [ ] **Terminal output** doesn't support links / click-to-select yet
- [ ] **Code Viewer** highlight not virtualized — may lag on very large code
- [ ] **Code Viewer** — undo/redo is browser-default (single textarea), not per-code
- [ ] **`DockLayout`** — no collapse, no tabs, no drag-reorder yet
- [ ] **Terminal `_cmdSave`** duplicates logic from `PropertiesPanel` — should be one service
- [ ] **Editor** keyboard shortcuts must skip when focus is in `<input>` / `<textarea>` — already fixed in `EditorApp`, but verify no other handlers

---

## 🧪 Quality

### Tests

- [ ] `Vitest` + `jsdom`
- [ ] `ModuleFactory.createModule`
- [ ] `PatchManager.addCable`
- [ ] `LayerManager.isGridCellFree`
- [ ] `LayerManager.findFreeSpace`
- [ ] `CsoundGenerator.formatModuleLine`
- [ ] `CsoundGenerator.addModule` / `removeModule`
- [ ] `Theme` methods (`getCableWidth`, `_isColorValue`)
- [ ] `removeModuleFromLayer` (multi-layer search)
- [ ] `ComponentRegistry` — round-trip serialize / deserialize for each type

### Documentation

- [ ] `docs/ARCHITECTURE.md`
- [ ] `docs/MODULE_FORMAT.md` — module structure (params, inputs, outputs, components)
- [ ] `docs/DATA_FLOW.md` — pch2 → JSON → JS → ORC → Csound
- [ ] `docs/THEME.md` — how to add a component to the theme
- [ ] `docs/EDITOR.md` — editor architecture, dock layout, terminal commands
- [ ] `docs/CONTRIBUTING.md`

### Refactoring

- [ ] Extract `CsoundEngine` into a separate package
- [ ] Remove `window.csound` — all access via `CsoundEngine`
- [ ] `Knob.setValue` / `Slider.setValue` — remove `window.csound.setControlChannel` (use callbacks)
- [ ] **Split `main.js`** (2000+ lines) into modules
- [ ] Remove duplicates in `CsoundGenerator` (double `_findCablesForOutput`)
- [ ] Split `Panel` from `src/components/` into `Model` / `View`
- [ ] **Remove dead code** `divider` from `LayerManager` and `main.js`
- [ ] **`Panel.draw`** — move FX stripe to a separate method
- [ ] **`Theme.js`** — split into `ThemeClassic` / `ThemeLcd` (strategy pattern)
- [ ] **Unify save service** — `TerminalPanel._cmdSave`, `PropertiesPanel`, `Toolbar._onSave` all do slightly different things

---

## 🛠 User modules

- [ ] Auto-generate `typeID` for user modules (starting from 201, unique)
- [ ] Improve module parsing in `ModuleFactory._parseModuleDefinition` (regex → proper parser?)
- [ ] Export module as single `.zip` (JS + DSP + icon)
- [ ] **`_nextComponentId`** — reset on `Load Module` in the editor

---

## 🐛 Known issues

- [ ] Artifact: cable over LED is erased on LED redraw (fixed via overlayCanvas)
- [ ] `CsoundEngine._ledValues` not cleared on `stop()` — may show stale values 1–2 frames
- [ ] Fast LED toggling looks uneven due to `setInterval(50ms)`
- [ ] `ComponentPropertiesWindow` doesn't open on click (only via button)
- [ ] `PATCH_LOAD`: on error — may leave partially loaded patch
- [ ] **`setLayer`** — module may lose `customColor` on layer switch (verify)
- [ ] **FX stripe** may overlap content on modules with `customColor` (verify)
- [ ] **`getLayerAtPoint`** always returns `'voice'` — old code may depend on `y`
- [ ] **`updateLayerSizes`** called from dead `updateDividerDrag` — remove
- [ ] **`loadAvailableModules`** still uses `fetch('/api/...')` — will fail in Tauri

---

## 📝 Notes

- **Storage**:
  - Tauri: user modules in `Documents/CsModular/`
  - Web: `localStorage` (`csmodular:user_modules` list, `csmodular:user_module:<name>` data)
- **Editor layout persist**: `csmodular:editor-layout` in localStorage
- **Opening editor**: browser — `window.open`, Tauri — `WebviewWindow` (see `ContextMenu.openModuleEditor`)
- **Capabilities**: when adding a new window — add its label to `src-tauri/capabilities/default.json`
- `ConnectorIndex` — not used in ORC generation, kept for NM2 import compatibility
- `typeID = 999` for all user modules — temporary, plan to generate unique
- `params` in a module = opcode argument order. Must match `xin` in UDO. **Not sorted by id — order in `components` array.**
- `formatModuleLine` builds: `<params>` + `<mode>` + `<inputs>` + `<outputs>`. Order is fixed.
- All user UDOs — in `csound/modules/user/`. Built-in — in `csound/modules/`.
- Includes are loaded **lazily** via `CsoundGenerator.includes` (Set of paths)
- **Do not use top-level `await import(...)`** in `src/api/index.js` — blocks the whole UI init
- **`window.__theme__`** available in console for theme debugging (`get`, `set`, `init`)
- **`removeModuleFromLayer`** searches in **all** layers — protects from phantoms
- **`getLayerAtPoint`** always returns `'voice'` — new modules are Voice by default
- **FX auto-layout** uses `_getFxFloorY()` — new FX modules fall below voice
- **`_isColorValue()`** in `main.js` and `DesignSettingsPanel` — distinguishes hex/rgb from image URL
- **Keyboard shortcuts rule** — global key handlers must skip when `e.target` is `<input>`, `<textarea>`, or `contentEditable`. Otherwise typing `0` in editor triggers `resetZoom()`.
- **`ComponentRegistry`** — single source of truth for component creation / serialization / Csound ports. Adding a new component type = one entry in `editor/ComponentRegistry.js`.
```
