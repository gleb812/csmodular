
# CsModular

A web-based modular synthesizer built with Csound and vanilla JavaScript + Canvas.

This project is a next level of the *pch2csd* project: https://github.com/gleb812/pch2csd

## Features

- Modular architecture with interchangeable audio modules
- Real-time Csound synthesis engine (via `@csound/browser`)
- Web-based UI with Canvas rendering
- Runs as a **web app** (browser) or **desktop app** (Tauri: Windows / Linux / macOS)
- **Infinite workspace** with pan, zoom and scroll
- **Voice / FX layers** — modules can be assigned to either, with auto-layout for FX
- **Two visual themes**:
  - **Classic** — original NM2-style colored UI
  - **LCD** — monochrome glowing interface inspired by Casio watches
- **Design Settings panel** (press `D`) — live theme editing, color pickers, glow, line weight, cable widths, background
- **Custom backgrounds** — solid colors or images, with parallax effect
- Built-in graphical editor for user modules
- User modules stored as plain files (in Tauri) — easy to back up, share, version

## Architecture

- **Frontend**: vanilla JS (ES modules), Vite
- **Audio**: `@csound/browser` 6.18.7
- **Desktop shell**: Tauri 2.x (Rust)
- **Storage**:
  - Web: IndexedDB / localStorage (planned)
  - Desktop: filesystem via `@tauri-apps/plugin-fs`
  - Abstraction: `src/api/moduleStore.js`
- **Theme system**: `src/theme/` (`Theme.js`, `themeStore.js`, `currentTheme.js`, `defaults.js`)
- **Csound code**: UDO files in `public/csound/modules/*.txt`
- **Scripts**: Python patchers in `scripts/` (params, mapping tables, NM2 cleanup)

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

- **Windows**: `C:\Users\<User>\Documents\CsModular\`
- **macOS**: `~/Documents/CsModular/`
- **Linux**: `~/Documents/CsModular/`

### Build desktop executable

```
npx tauri build
```

Output:
- `src-tauri/target/release/csmodular.exe` — standalone executable
- `src-tauri/target/release/bundle/msi/*.msi` — MSI installer
- `src-tauri/target/release/bundle/nsis/*.exe` — NSIS installer

## Keyboard shortcuts

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

## Project Structure

```
.
├── src/                 # Frontend JavaScript + Canvas UI
│   ├── api/             # moduleStore — unified user-module interface
│   ├── csound/          # CsoundEngine, CsoundGenerator, MappingTables
│   ├── components/      # UI components (Knob, Slider, Input, Output, ...)
│   ├── managers/        # EventManager, LayerManager, UIManager
│   ├── theme/           # Theme system (Classic / LCD)
│   └── ui/              # ContextMenu, DesignSettingsPanel, CSoundWindow, ...
├── editor/              # Module editor (separate HTML entry)
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

- **Voice** — triggered per polyphony voice (default)
- **FX** — global effects, master processing

Rules:
- Cables are only allowed **within one layer** (voice ↔ voice, fx ↔ fx)
- Change layer via **right-click → Layer → Voice / FX**
- When changing layer, all cables are removed (with confirmation)
- New FX modules are **automatically placed below the lowest voice module**

## Themes

The UI supports two visual themes, switchable in Design Settings (`D`):

- **Classic** — original NM2-style, colored panels
- **LCD** — monochrome Casio-style, transparent panels, glowing lines

Design Settings allows live editing of:
- Preset (Classic / LCD)
- Accent color (with presets and color picker)
- Glow intensity
- Panel opacity
- Line weight
- Cable widths (audio / control)
- Background (solid colors or images)
- Parallax strength

All settings are saved to `localStorage`.

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

**Note:** Do not run `npm run dev` and `npx tauri dev` simultaneously — both use port 3000.

## Troubleshooting

**Csound WASM not loading:**
- Check browser console for errors
- Ensure `@csound/browser` is accessible (CDN or bundled)

**Tauri build fails:**
- On Windows: install Microsoft C++ Build Tools
- Install WebView2 Runtime (Windows 10)
- Ensure `rustc --version` works

**Port 3000 already in use:**
- Kill the process, or change port in `vite.config.js`

**Background not changing:**
- Check DevTools Console for errors
- Ensure theme has `background` section — reset via `localStorage.removeItem('csmodular.theme')`

**User modules not visible in browser:**
- Web `moduleStore` is currently a stub — user modules only persist in Tauri
- For web persistence, IndexedDB support is planned

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

**Gleb Rogozinski** — [GitHub](https://github.com/gleb812)

