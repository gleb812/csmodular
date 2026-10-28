
# CsModular

A web-based modular synthesizer built with Csound and vanilla JavaScript + Canvas.

A next step of the [pch2csd](https://github.com/gleb812/pch2csd) project.

## Features

- Modular architecture with interchangeable audio modules
- Real-time Csound synthesis engine (`@csound/browser`)
- Web + desktop (Tauri: Windows / Linux / macOS)
- Infinite workspace with pan, zoom, scroll, snap-to-grid
- Two layers: **Voice** (per-voice) and **FX** (global)
- **Four jack types** with NM2-compatible visual semantics:
  - `audio` (red) / `control` (blue) — Csound `a` / `k` rates
  - `logic` (yellow) / `logicAudio` (orange) — NM2 visual only, both `control` in Csound
- **Dynamic jacks** — `audio ↔ control` and `logic ↔ logicAudio` auto-switch by connection;
  `static` (strict) jacks keep their type, converters (`K2A`/`A2K`) are inserted in the ORC
- **Module variants** — `;@ variant k/a` in UDO; k-rate modules auto-promote to a-rate
  when an audio-rate cable reaches a non-strict input
- MIDI input via Web MIDI API → Csound (`instr 3`, NM2-compatible `gkGate`/`gkNote`)
- Multi-channel **oscilloscope** — attach to any cable via right-click → *Send to Scope*
- **Level indicators** — LED and MiniVU (3-zone VU); tap any Input/Output, Outputs work without a cable
- Two visual themes: **Classic** (NM2-style) and **LCD** (Casio-style)
- Design Settings panel (`D`) — colors, glow, line weight, cables, grid, backgrounds
- **Module Editor** — IDE-style workspace with dock panels and command terminal
- Protected Csound structure (`opcode` / `xin` / `zaw` / `endop` locked); user edits only the DSP body
- User modules stored as plain files (Tauri) — easy to back up, share, version

## Requirements

**Web:** Node.js 18+, modern browser (Chrome / Firefox / Edge)

**Desktop (Tauri):** Rust, C++ Build Tools (Windows), WebView2 (Win10)

## Install & Run

```bash
git clone git@github.com:gleb812/csmodular.git
cd csmodular
npm install

npm run dev           # web, http://localhost:3000
npx tauri dev         # desktop
npx tauri build       # desktop executable
```

User modules (desktop) live in `~/Documents/CsModular/`.

## Keyboard Shortcuts

**Main app**

| Key | Action |
|---|---|
| `Space` | Context menu (add module) |
| `Space + drag` | Pan |
| `Ctrl + wheel` | Zoom around cursor |
| `wheel` / `Shift + wheel` | Vertical / horizontal scroll |
| `D` (or `В`) | Design Settings panel |
| `Delete` | Delete selected module |
| `Escape` | Deselect / close menus |
| Right-click module / jack / empty | Context menus |

**Module Editor**

| Key | Action |
|---|---|
| `Ctrl + wheel`, `+`, `-` | Zoom |
| `0` | Reset zoom (canvas focus) |
| `Delete` | Delete selected component |
| `Ctrl + S` (in code) | Save Csound code |
| `↑` / `↓` (in terminal) | Command history |
| `Tab` (in code) | Insert 4 spaces |

## Project Structure

```
.
├── src/                 # Frontend (main app)
│   ├── api/             # moduleStore — user module storage (web / Tauri)
│   ├── csound/          # CsoundEngine, CsoundGenerator, MappingTables
│   ├── midi/            # MidiManager (Web MIDI API)
│   ├── components/      # UI components (Knob, Slider, LED, MiniVU, PartSelector, ...)
│   ├── grid/            # Grid system
│   ├── managers/        # EventManager, LayerManager, UIManager
│   ├── theme/           # Classic / LCD themes
│   └── ui/              # ContextMenu, DesignSettingsPanel, ScopeWindow, ...
├── editor/              # Module Editor (separate HTML entry)
│   ├── editor.html      # entry point
│   ├── ComponentRegistry.js   # single source of truth for components
│   ├── CodeViewerWindow.js    # Csound code editor (protected structure)
│   └── ui/              # DockLayout, Toolbar, PropertiesPanel, TerminalPanel, ...
├── public/              # Static assets (csound modules, tables, backgrounds)
├── src-tauri/           # Tauri (Rust) shell
├── scripts/             # Python utility scripts (NM2 patchers)
└── _legacy_backend/     # Old Flask backend (reference only)
```

## Adding Custom Modules

1. Open the **Module Editor** (`Space → Editor`, or `editor.html`).
2. Design the panel, write the DSP body, save.
3. The module appears in `Space → Add Module` immediately.

**Manually:** create `modules/user/<Name>.js` (JS description) and
`csound/modules/user/<Name>.txt` (UDO), reload.

See `AI Context.md` for the module format, `EDITOR.md` for editor internals,
`TODO.md` for the roadmap.

## Jack Types & Converters

Every Input/Output has a `jackType` and a `bandwidth`:

| Field | Values | Effect |
|---|---|---|
| `jackType` | `audio`, `control`, `logic`, `logicAudio` | visual color; Csound rate |
| `bandwidth` | `static`, `dynamic` | whether the jack may change its type |

**Families** (a `dynamic` jack may switch only inside its family):

- `{audio, control}` — Csound `a` / `k`
- `{logic, logicAudio}` — both `control` in Csound, NM2 visual only

**Rules:**

- Jack color = its current type, never the cable's color.
- Cable color = source jack's current type.
- `static` jack + type mismatch → converter (`K2A` / `A2K`) in ORC, jack stays its color.
- `dynamic` jack + compatible type → jack changes type (and output cables re-color).
- `logic ↔ logicAudio`, `control ↔ logic`, `audio ↔ logicAudio` need **no** converter
  (same Csound rate).

## Module Variants

A UDO may declare `;@ variant k` / `;@ variant a`, `;@ strict 0 0 1`, `;@ ins k k k`.
`CsoundGenerator._prepareVariants()` picks the variant per module:

- start with `defaultSuffix` (usually `k`);
- if an audio-rate cable reaches a non-strict input → switch module to `a`;
- iterate until stable.

UI effect: `dynamic` jacks of the module re-color when the variant flips.
`static` (strict) jacks never change.

## Voice / FX Layers

- **Voice** — triggered per polyphony voice (default)
- **FX** — global effects / master processing

Cables only within one layer. Change via right-click → Layer.
New FX modules are auto-placed below the lowest voice module.

## Grid

- Base cell 20×15 px, panel always 13 cells wide (260 px — NM2 compat)
- Step multipliers and snap toggle in **Design Settings → Grid**
- Changing multipliers does not move existing modules
- Settings persist in `localStorage` as part of the theme

## Oscilloscope

Multi-channel waveform viewer, bound to **cables** (ZAK buses), not modules.
Right-click a jack → **📊 Send to Scope**. Up to 8 channels. Buffer 4096
samples (~85 ms at 48 kHz); audio-rate shown as-is, control-rate downsampled
by `ksmps`. Not persisted in the patch.

> For per-module level indication use **LED** / **MiniVU** components, not the scope.

## MIDI

Web MIDI API → `MidiManager` → `CsoundEngine.midiMessage()` → Csound `instr 3`.
Click **`MI`** in the bottom bar to enable (browser asks permission).
`instr 3` exposes `gkGate` / `gkNote`; velocity is currently ignored
(NM2 compatibility). See `README` → *Known issue* in `AI Context.md` for
the `@csound/browser` recompile bug.

## Themes

- **Classic** — original NM2-style, colored panels
- **LCD** — monochrome Casio-style, transparent panels, glowing lines

Both editable live in **Design Settings** (`D`): accent color, glow,
opacity, line/cable widths, grid, background, parallax. Saved to `localStorage`.

## Editor

Separate HTML entry (`editor.html`): dock layout (Canvas / Code / Properties /
Terminal), resizable splitters, three presets. Component palette in
`editor/ComponentRegistry.js` — adding a new component type = one entry.

Protected Csound structure: `opcode` / `xin` / `zar` / `zkr` / `init` /
`zaw` / `zkw` / `endop` are regenerated from the model; the user only edits
the **body** between the input-jack and output-jack blocks.

Component properties are declared via `static getPropertySchema()` and
rendered by `PropertiesPanel`. Terminal DSL for fast editing.

**LED** and **MiniVU** are in `display` / `graphics`; bind them via
Properties → *Source* (`ioComponents`).

Full editor docs: **`EDITOR.md`**.

## Development

```bash
npm run dev         # web only — fast iteration, full DevTools
npx tauri dev       # verify Tauri-specific (fs, native windows)
```

Don't run both — port 3000 is shared.

## Troubleshooting & Known Issues

See **`AI Context.md`** → *Known issues (short)* and *TODO*. Highlights:

- **HTML inside Csound ORC** — Vite SPA-fallback. Fixed via `_loadUdoByPath()`.
- **LED / oscilloscope erratic after load** — `mappingTable` was not serialized. Fixed.
- **LED / MiniVU does not light up** — `sourceComponentId` missing or not a
  jack. Set via Properties (editor) or module JS. On Inputs without a cable
  the indicator is disabled; on Outputs a tap-bus is allocated automatically.
- **Jack color changes when a cable is connected** — jack color must be its
  own `jackType`, never the cable's color. Fixed: `BaseJack.getEffectiveColor()`,
  `PatchManager` no longer paints jacks with cable color; `synchronizeInputCables`
  removed.
- **`logic` / `logicAudio` jacks turn red/blue** — `logic`/`logicAudio` are a
  separate family, only re-color to each other (`dynamic` only). In Csound
  both are `control`, so no converter between them.
- **MIDI dies after recompile** — `@csound/browser` IPC ports not recreated. Restart Csound.
- **HiDPI drag** — `resizeCanvasToWindow` uses `dpr = 1` workaround.

## Contributing

Issues, PRs, new modules, new themes — all welcome.

## Acknowledgments

- [Csound](https://csound.com/)
- [Tauri](https://tauri.app/)
- Canvas API

## License

MIT — see `LICENSE`.

## Author

Gleb Rogozinski — [GitHub](https://github.com/gleb812)
