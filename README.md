# CsModular

A web-based modular synthesizer built with Csound and vanilla JavaScript + Canvas.

This project is a next level of the *pch2csd* project: https://github.com/gleb812/pch2csd

## Features

- Modular architecture with interchangeable audio modules
- Real-time Csound synthesis engine (via `@csound/browser`)
- Web-based UI with Canvas rendering
- Runs as a web app (browser) or desktop app (Tauri: Windows / Linux / macOS)
- Infinite workspace with pan, zoom and scroll
- Voice / FX layers — modules can be assigned to either, with auto-layout for FX
- Grid system with configurable step (X/Y multipliers) and snap-to-grid
- Two visual themes:
  - Classic — original NM2-style colored UI
  - LCD — monochrome glowing interface inspired by Casio watches
- Design Settings panel (press `D`) — live theme editing, color pickers, glow, line weight, cable widths, background, grid
- Custom backgrounds — solid colors or images, with parallax effect
- Module Editor — built-in IDE-style editor with dock panels and command terminal
- User modules stored as plain files (in Tauri) — easy to back up, share, version

## Architecture

- Frontend: vanilla JS (ES modules), Vite
- Audio: `@csound/browser` 6.18.7
- Desktop shell: Tauri 2.x (Rust)
- Storage:
  - Web: localStorage (`moduleStore.web.js`)
  - Desktop: filesystem via `@tauri-apps/plugin-fs` (`moduleStore.tauri.js`)
  - Abstraction: `src/api/index.js` — lazy `moduleStore` singleton
- Theme system: `src/theme/` (`Theme.js`, `themeStore.js`, `currentTheme.js`, `defaults.js`)
- Grid system: `src/grid/Grid.js`
- Csound code: UDO files in `public/csound/modules/*.txt`
- Scripts: Python patchers in `scripts/` (params, mapping tables, NM2 cleanup)

## Requirements

### For web development

- Node.js 18+
- Modern browser (Chrome / Firefox / Edge)

### For desktop build (Tauri)

- Rust (via https://rustup.rs)
- Microsoft Visual Studio C++ Build Tools (Windows)
- WebView2 Runtime (Windows 10; Windows 11 has it built-in)

## Installation

```
git clone git@github.com:gleb812/csmodular.git
cd csmodular
npm install
```

## Running

### Web (browser)

```
npm run dev
```

Open http://localhost:3000

### Desktop (Tauri)

```
npx tauri dev
```

Opens a native window with the same UI. User modules are stored in:

- Windows: `C:\Users\<User>\Documents\CsModular\`
- macOS: `~/Documents/CsModular/`
- Linux: `~/Documents/CsModular/`

### Build desktop executable

```
npx tauri build
```

Output:
- `src-tauri/target/release/csmodular.exe` — standalone executable
- `src-tauri/target/release/bundle/msi/*.msi` — MSI installer
- `src-tauri/target/release/bundle/nsis/*.exe` — NSIS installer

## Keyboard shortcuts

### Main app

| Shortcut | Action |
|---|---|
| `Space` | Open context menu (add module) |
| `Space + drag` | Pan the workspace |
| `Ctrl + wheel` | Zoom (around cursor) |
| `wheel` | Vertical scroll |
| `Shift + wheel` | Horizontal scroll |
| `D` (or `В` on Russian layout) | Toggle Design Settings panel |
| `Delete` | Delete selected module |
| `Escape` | Deselect module / close menus |
| `Right click` on module | Module menu (color, layer, delete) |
| `Right click` on jack | Jack menu |
| `Right click` on empty space | Main context menu |

### Module Editor

| Shortcut | Action |
|---|---|
| `Ctrl + wheel` / `+` / `-` | Zoom canvas |
| `0` | Reset zoom (only when canvas has focus) |
| `Escape` | Cancel current drag |
| `Delete` | Delete selected component |
| `Right click` on canvas | Context menu (add / rename module) |
| `Right click` on component | Context menu (properties / delete) |
| `Ctrl + S` (in code editor) | Save Csound code |
| `↑` / `↓` (in terminal) | Command history |
| `Tab` (in code editor) | Insert 4 spaces |

## Project Structure

```
.
├── src/                 # Frontend JavaScript + Canvas UI
│   ├── api/             # moduleStore — unified user-module interface
│   │   ├── index.js         # lazy singleton picker (Tauri / web)
│   │   ├── moduleStore.tauri.js
│   │   └── moduleStore.web.js
│   ├── csound/          # CsoundEngine, CsoundGenerator, MappingTables
│   ├── components/      # UI components (Knob, Slider, Input, Output, ...)
│   ├── grid/            # Grid system (step, snap, crosses)
│   ├── managers/        # EventManager, LayerManager, UIManager
│   ├── theme/           # Theme system (Classic / LCD)
│   └── ui/              # ContextMenu, DesignSettingsPanel, CSoundWindow, ...
├── editor/              # Module Editor (separate HTML entry)
│   ├── editor.html          # entry point
│   ├── editor.js            # bootstrap
│   ├── EditorApp.js         # main editor controller
│   ├── EditorPanel.js       # module panel (canvas)
│   ├── ComponentRegistry.js # unified component registry (create / serialize / deserialize)
│   ├── CodeViewerWindow.js  # Csound code editor (with syntax highlight)
│   ├── ModulePropertiesWindow.js    # headless (legacy, used for save API)
│   ├── ComponentPropertiesWindow.js # headless (legacy, used for mapping browser)
│   └── ui/
│       ├── DockLayout.js        # split-pane container with presets
│       ├── Toolbar.js           # New / Load / Save + layout presets
│       ├── PropertiesPanel.js   # Module / Component tabs
│       ├── TerminalPanel.js     # command terminal
│       ├── ContextMenu.js       # generic context menu
│       └── ModuleContextMenu.js # editor-specific menu builder
├── public/              # Static assets (csound/, tables/, backgrounds/)
│   ├── csound/          # UDO files, mapping tables
│   ├── tables/          # Value maps
│   └── backgrounds/     # Background images for Design Settings
├── src-tauri/           # Tauri (Rust) shell
├── scripts/             # Python utility scripts
├── _legacy_backend/     # Old Flask backend (kept for reference)
└── README.md
```

## Adding custom modules

1. Create a new module via the built-in editor (`Space → Editor`)
2. Or manually add JS description + UDO file:
   - JS: `modules/user/<Name>.js`
   - UDO: `csound/modules/user/<Name>.txt`
3. The UI auto-detects and displays it

See `TODO.md` for current development priorities and module format specifications.
See `AI Context.md` for a quick system overview.

## Voice / FX layers

Every module belongs to one of two layers:

- Voice — triggered per polyphony voice (default)
- FX — global effects, master processing

Rules:
- Cables are only allowed within one layer (voice ↔ voice, fx ↔ fx)
- Change layer via right-click → Layer → Voice / FX
- When changing layer, all cables are removed (with confirmation)
- New FX modules are automatically placed below the lowest voice module

## Grid

The world is infinite, with a configurable grid:

- Base cell 20×15 px, panel always 13 cells wide (= 260 px, NM2 compatibility)
- Step multipliers `multX` / `multY` (≥ 1) — configurable in Design Settings → Grid
- Visible as crosses (not lines), style depends on theme
- Snap to grid can be toggled on/off
- Changing multipliers does not move existing modules — only the next drag uses the new step
- Grid settings persist in localStorage as part of the theme (`settings.grid`)

## Themes

The UI supports two visual themes, switchable in Design Settings (`D`):

- Classic — original NM2-style, colored panels
- LCD — monochrome Casio-style, transparent panels, glowing lines

Design Settings allows live editing of:
- Preset (Classic / LCD)
- Accent color (with presets and color picker)
- Glow intensity
- Panel opacity
- Line weight
- Cable widths (audio / control)
- Grid: `Step X ×`, `Step Y ×`, `Cross Size`, `Snap to grid`
- Background (solid colors or images)
- Parallax strength

All settings are saved to `localStorage`.

## Module Editor

The editor is a separate HTML entry (`editor.html`) that opens in its own window
(in Tauri) or tab (web). It provides an IDE-style workspace for designing
custom modules visually.

### Layout

The editor uses a fixed dock layout with resizable splitters and presets
(`Default`, `Code`, `Canvas`). All panel sizes persist in `localStorage`.

```
┌─────────────────────────────────────────────────┐
│ toolbar: [New] [Load] [Save]  |  Layout presets │
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

- Canvas — visual module layout, drag components, resize module
- Properties — two tabs: `Module` (name, height, color) and `Component`
  (schema-driven fields from `getPropertySchema()`)
- Csound Code — live-generated `opcode` code with syntax highlighting,
  line numbers, font size controls
- Terminal — command language for the module (see below)

### Adding components

Right-click on the canvas → Add Component → pick from submenu
(Controls / Display / Jacks / Graphics).

All components live in `editor/ComponentRegistry.js` — a single source of
truth describing how each component is created, serialized, deserialized,
and what Csound ports it has. Adding a new component type = adding one
entry to the registry.

### Terminal commands

The terminal supports a small DSL for fast module editing:

| Command | Description |
|---|---|
| `add <type> [x y]` | Add component (auto-place or at x,y) |
| `in` / `out` | Shorthand for `add input` / `add output` |
| `ls [type] [-l]` | List components |
| `del <id\|type\|range>...` | Delete (e.g. `del 3`, `del knob`, `del 3 4 5`, `del 3..7`) |
| `mv <id> <x> <y>` | Move (absolute) |
| `mv <id> +dx +dy` | Move (relative) |
| `map <id> <table>` | Bind mapping table (or unset) |
| `align <ids...> l\|r\|u\|d` | Align components |
| `distr <ids...> h\|v` | Distribute evenly |
| `grid on\|off\|N` | Toggle micro-grid or set step |
| `new` | Clear module |
| `save [as <name>]` | Save module |
| `load <name>` | Load module |
| `stats` | Module statistics |
| `help [cmd]` | Help |

Component types (aliases): `knob`, `slider`, `button` (or `btn`), `radio`,
`incdec`, `toggle`, `label`, `field`, `edit`, `led`, `level`, `select`,
`svg`, `line`, `graph`, `vu`, `input` (or `in`), `output` (or `out`).

### Saving & loading

- Web: modules persist in `localStorage` under
  `csmodular:user_modules` (list) and `csmodular:user_module:<name>` (data)
- Tauri: modules are written to
  `~/Documents/CsModular/modules/user/<name>.js` and
  `~/Documents/CsModular/csound/modules/user/<name>.txt`

Both JS and DSP code are stored. Round-trip load/save preserves the module
as designed.

## Development

### Web only

```
npm run dev
```

Faster iteration, full DevTools. Use this for 90% of UI work.

### Desktop dev

```
npx tauri dev
```

Use to verify Tauri-specific functionality (fs, native windows).

Note: Do not run `npm run dev` and `npx tauri dev` simultaneously — both use port 3000.

## Troubleshooting

Csound WASM not loading:
- Check browser console for errors
- Ensure `@csound/browser` is accessible (CDN or bundled)

Tauri build fails:
- On Windows: install Microsoft C++ Build Tools
- Install WebView2 Runtime (Windows 10)
- Ensure `rustc --version` works

Port 3000 already in use:
- Kill the process, or change port in `vite.config.js`

Background not changing:
- Check DevTools Console for errors
- Ensure theme has `background` section — reset via `localStorage.removeItem('csmodular.theme')`

User modules not visible in browser:
- Web `moduleStore` uses `localStorage`
- Check DevTools → Application → Local Storage → `csmodular:user_modules`
- To reset: `localStorage.removeItem('csmodular:user_modules')`

Can't type `0` in editor inputs:
- Fixed: keyboard shortcuts now skip when focus is in an `<input>` or `<textarea>`
- If it happens again, check `EditorApp.setupEvents()` for `preventDefault()` calls

Editor layout reset:
- `localStorage.removeItem('csmodular:editor-layout')`

Grid settings reset:
- `localStorage.removeItem('csmodular.theme')` — resets theme including `settings.grid`

Modules don't drag correctly on macOS Retina (dpr > 1):
- Known issue. `resizeCanvasToWindow` temporarily uses `dpr = 1` as a workaround.
- See TODO.md → Grid system → HiDPI.

## Contributing

Contributions are welcome! Feel free to:
- Submit issues
- Create pull requests
- Add new modules
- Improve the UI/UX
- Add new themes

## Acknowledgments

- Built with [Csound](https://csound.com/)
- UI powered by Canvas API
- Desktop shell by [Tauri](https://tauri.app/)

## License

MIT License — see the [LICENSE](LICENSE) file for details.

## Author

Gleb Rogozinski — [GitHub](https://github.com/gleb812)
