
# CsModular

A web-based modular synthesizer built with Csound and vanilla JavaScript + Canvas.
A next step of the [pch2csd](https://github.com/gleb812/pch2csd) project.

## Features

- **Four jack types** — `audio` / `control` (Csound a/k) + `logic` / `logicAudio` (visual).
- **Dynamic jacks** — auto-switch by connection; `static` jacks keep their type (converters inserted in ORC).
- **Module variants** — `;@ variant k/a`, auto-promote on audio-rate cable.
- **MIDI input** (Web MIDI API) → Csound.
- **MIDI Learn** — right-click any knob/slider, move a CC, done.
- **Tempo transport** — 7-segment BPM display, drag to change, or lock to external **MIDI Clock** (`EXT`).
- **Oscilloscope** (multi-channel), **LED / MiniVU** indicators.
- **Two themes** — Classic / LCD; live editor (`D`).
- **Module Editor** (`editor.html`) — IDE-style, protected Csound structure, user module libraries.
- **External control** — HTTP + OSC bridge (`CSP_API.md`) for scripting and remote patching.

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

User libraries (desktop) live in `~/Documents/CsModular/libraries/`.

## Keyboard Shortcuts

**Main app**

| Key | Action |
|---|---|
| `Space` | Context menu (add module) |
| `Space + drag` | Pan |
| `Ctrl + wheel` | Zoom around cursor |
| `wheel` / `Shift + wheel` | Vertical / horizontal scroll |
| `D` (or `В`) | Design Settings panel |
| `M` (or `Ь`) | Toggle minimap |
| `Delete` | Delete selected module |
| `Escape` | Deselect / close menus |
| Right-click module / jack / **knob** / empty | Context menus |

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
│   ├── api/             # libraryStore — module libraries (web / Tauri)
│   ├── csound/          # CsoundEngine, CsoundGenerator, MappingTables
│   ├── components/      # UI components (Knob, Slider, LED, MiniVU, ...)
│   ├── managers/        # EventManager, LayerManager, UIManager
│   ├── theme/           # Classic / LCD themes
│   └── ui/              # ContextMenu, DesignSettingsPanel, ScopeWindow, ...
├── editor/              # Module Editor (separate HTML entry)
│   ├── editor.html      # entry point
│   ├── ComponentRegistry.js   # single source of truth for components
│   └── ui/              # DockLayout, Toolbar, PropertiesPanel, TerminalPanel, ...
├── public/              # Static assets (libraries, csound modules, tables, backgrounds)
├── src-tauri/           # Tauri (Rust) shell
└── scripts/             # Python utility scripts
```

## Adding Custom Modules

Open the **Module Editor** (`Space → Editor`, or `editor.html`), design the panel,
pick a **category**, write the DSP body, save.
Modules appear in `Space → Add Module → 👤 user` immediately.

For **release** (builtin library, in git) and **sharing** (export/import `.js` + `.txt`) —
see **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Development

```bash
npm run dev         # web only — fast iteration, full DevTools
npx tauri dev       # verify Tauri-specific (fs, native windows)
```

Don't run both — port 3000 is shared.

## Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — add a module, export, release, share
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — modules, cables, jacks, Csound pipeline
- **[EDITOR.md](EDITOR.md)** — module editor internals
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — known issues, workarounds
- **[TODO.md](TODO.md)** — roadmap
- **[AI Context.md](AI Context.md)** — full AI-facing context
- **[CSP_API.md](CSP_API.md)** — HTTP + OSC bridge for external control (OSC, Python, curl)

## Contributing

Issues, PRs, new modules, new themes — all welcome. See **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Acknowledgments

- [Csound](https://csound.com/)
- [Tauri](https://tauri.app/)
- Canvas API

## License

MIT — see `LICENSE`.

## Author

Gleb Rogozinski — [GitHub](https://github.com/gleb812)
```
