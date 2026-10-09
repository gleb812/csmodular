
```markdown

# AI Context — CsModular

This document is a short description of the system for the AI assistant.
Goal: reduce onboarding time to 5 minutes.

## What it is

**CsModular** — modular sound synthesis environment built on Csound.
Runs in the browser **and** as a native desktop app (Tauri).
The user assembles a patch from modules, connects them with cables, hears the result.

## Stack

- **Frontend**: vanilla JS (ES modules), Vite
- **Audio**: `@csound/browser` 6.18.7
- **Desktop shell**: Tauri 2.x (Rust)
- **Storage**:
  - `src/api/moduleStore.js` — unified interface for user modules
  - Web: IndexedDB / localStorage (planned)
  - Tauri: filesystem via `@tauri-apps/plugin-fs`
    - `~/Documents/CsModular/modules/user/*.js`
    - `~/Documents/CsModular/csound/modules/user/*.txt`
- **Csound code**: UDO files in `public/csound/modules/*.txt`
- **Scripts**: Python patchers in `scripts/` (params, mapping tables, NM2 cleanup)

## Key entities

### Patch

Set of modules + cables. Saved to JSON. Loaded via `PatchLoader`.

### Module (in UI)

Visual block with components. Consists of:

- **JS description** (in `modules/` or user storage)
- **UDO file** (in `public/csound/modules/` or user storage)
- An instance of `Panel` with `components`

### Module (JS description)

```js
{
    type: 'Zgen',                    // opcode name (Csound identifier)
    typeID: 999,                     // for UDO file lookup (999.txt for user)
    displayName: 'Zgen',             // UI name — can contain spaces, dashes, etc.
    gridHeight: 3,
    params: [1, 2],                  // component IDs passed to opcode (in xin order)
    inputs: [3],                     // component IDs of Input-jacks
    outputs: [4, 5],                 // component IDs of Output-jacks
    components: [
        { componentType: 'Knob', id: '1', ... },
        { componentType: 'Output', id: '4', ... },
        { componentType: 'LED', id: '6', sourceComponentId: '4', ledType: 'rms' },
        // ...
    ]
}
```

**Important**: `type` is the Csound-valid identifier. `displayName` is only for UI. **Never use `displayName` or `title` in Csound variable names, chnget channels, or opcode calls** — only `type` / `jsonName`.

### UDO file (Csound)

```csound
opcode Zgen, 0, kkk
kParam1, kParam2, kOut1 xin     ; order = order in params+inputs+outputs
  ; ... DSP ...
  zaw aResult, kOut1
endop
```

Rule: `params + inputs + outputs` in this order gives the order of `xin` arguments.

**Multiple variants**: some NM2 modules have more than one opcode in the file. A variant mechanism (parsing `;@ ins` / `;@ outs` headers) is implemented via `CsoundGenerator._parseVariants()`.

### Cable

Connection Output → Input. Stores the bus number in `CsoundGenerator._cableBusMap`.

### Zak space

Csound mechanism for inter-module communication. Each output writes to its own zak-bus, each input reads from a zak-bus.
**Note**: audio-bus and control-bus are **separate spaces** (numbers do not collide).

### Converters (strict inputs)

When a cable's source type differs from the destination input type, a converter is inserted **before the receiving module's call**:

- `K2A <sourceControlBus>, <newAudioBus>` — control → audio
- `A2K <sourceAudioBus>, <newControlBus>` — audio → control

Bus allocation in `CsoundGenerator._prepareConverters()`.
Line insertion in `CsoundGenerator.formatModuleLine()`.

## Main classes

| Class | File | Role |
|-------|------|------|
| `ModularSystem` | `main.js` | Main coordinator (Canvas, layers, animation) |
| `ModuleFactory` | `src/ModuleFactory.js` | Creates modules from JS descriptions |
| `PatchManager` | `src/PatchManager.js` | Cables management |
| `PatchLoader` | `src/PatchLoader.js` | Load/save patches |
| `LayerManager` | `src/managers/LayerManager.js` | voice/fx layers, grid, divider |
| `EventManager` | `src/managers/EventManager.js` | All mouse events |
| `UIManager` | `src/managers/UIManager.js` | Control panel (right side) |
| `CsoundGenerator` | `src/csound/CsoundGenerator.js` | Assembles ORC from modules and cables |
| `CsoundEngine` | `src/csound/CsoundEngine.js` | Manages the Csound instance |
| `MappingTables` | `src/csound/MappingTables.js` | Loads `value_maps.json` for `;@ map` |
| `Input`, `Output` | `src/components/*.js` | Jacks (have `.type` — `'audio'` / `'control'` / `'logic'`) |
| `Cable` | `src/Cable.js` | `fromJack.type` is the source of truth for cable type |
| `moduleStore` | `src/api/moduleStore.*.js` | User module storage (Tauri fs / web stub) |

## Data flow

### Creating a module

1. `main.js` → `ModuleFactory.createModule(type, ...)` → `Panel`
2. `CsoundGenerator.addModule({ typeId, instanceId, instanceName, ... })`
   - **`instanceName` MUST be the module `type` (Csound-valid)**, not the UI title
3. On recompile → ORC is regenerated

### Adding a cable

1. `PatchManager.addCable(from, to)` → `Cable`
2. `CsoundGenerator.addCable(cable)` → bus assigned in `_cableBusMap`
3. On recompile → ORC is regenerated

### ORC generation

`CsoundGenerator.generateOrc()` assembles:

1. `_prepareConverters()` — finds type mismatches, allocates buses
2. `_collectMappingFtgens()` — ftgen for `;@ map` tables used in UDOs
3. UDO section (from `includes`)
4. `instr 1` (voice) — module calls + converters + `led_rms`
5. `instr 2` (fx) — same
6. Standard `instr 3`, `instr 4` (MIDI, offline)

Then `CsoundEngine.init()` → `compileOrc` + `readScore` + `start`.

### Recompile (hot reload)

`CsoundEngine.recompile()` uses **`reset()` + `setOption('-odac')` + `compileOrc` + `readScore` + `start`** — the instance is **not destroyed**, only reset. ~5x faster than full restart, keeps the AudioContext alive.

After recompile, `_resyncAllControls()` pushes all current UI-component values back to Csound.

### LED

- LED is bound to an Output/Input (`sourceComponentId`)
- `CsoundGenerator` generates `led_rms <bus>, "<channel>"`
- `CsoundEngine.registerLedChannel("<channel>")` on module creation
- `CsoundEngine` polls channels via `getControlChannel` every 50 ms
- `LED.draw` reads value from `CsoundEngine.getLedValue(channel)`

### Module commutation

Via zak:

- Each Output has its own bus (assigned when a cable is created)
- Module writes `zaw aOut, kOut` in opcode
- Cable connects bus of input and output

**Rule: cables only within one layer** (voice ↔ voice, fx ↔ fx). Cross-layer is forbidden.

### Cable type detection

`CsoundGenerator._getCableType(cable)`:

1. **Priority**: `cable.fromJack.type` (`'audio'` / `'control'`)
2. Fallback: `cable.toJack.type`
3. Last resort: color-based (legacy NM2 palette)

**Important**: color is **visual only**. Custom cable coloring is supported, so color must never be the primary type source.

## User module storage

`src/api/index.js` exposes a `moduleStore` singleton. It picks the implementation lazily:

- **Tauri** → `src/api/moduleStore.tauri.js` (via `@tauri-apps/plugin-fs`)
- **Web** → `src/api/moduleStore.web.js` (currently a stub; IndexedDB planned)

API:

```js
moduleStore.list()                              // → string[] (module names)
moduleStore.load(name)                          // → { name, code, dsp_code } | null
moduleStore.save(name, code, dspCode)           // → boolean
moduleStore.remove(name)                        // → boolean
moduleStore.isUserModule(name)                  // → boolean
```

**Platform detection**: `isTauri()` checks for `__TAURI_INTERNALS__` in `window`.

**Do not use top-level `await import(...)`** in `index.js` — it blocks the whole module graph and breaks UI init. Use the lazy `_getImpl()` pattern.

## Tauri configuration

- `src-tauri/tauri.conf.json` — window config, bundle targets, `frontendDist: "../dist"`
- `src-tauri/capabilities/default.json` — permissions. **Important**: `windows` list must include **all** window labels that need fs access (e.g. `["main", "editor"]`)
- `src-tauri/src/lib.rs` — Tauri builder with `.plugin(tauri_plugin_fs::init())`

## Csound name sanitization

Any string that goes into a Csound identifier (variable name, chnget channel, opcode name) must be safe. Use `sanitizeCsoundName()` from `src/utils/csoundName.js`:

- `[^a-zA-Z0-9_]` → `_`
- Prefix `_` if starts with a digit

**Primary defense**: always use `type` / `jsonName`, never `displayName` / `title`.

## NM2 legacy and params

Old NM2 modules have `type` and `displayName` that may differ (e.g. `type: 'Out2'`, `displayName: '2-Out'`). The `type` is always safe; `displayName` is only for UI.

The `params` array lists **interactive component IDs in the order they appear in the opcode's `xin`** — and this is **the order in which components appear top-down in the `components` array** (not sorted by id).

Patcher `scripts/patch_params.py` regenerates `params` for all NM2 modules:

- `PARAM_TYPES = [Knob, Slider, ButtonFlat, ButtonText, ButtonRadio, ButtonIncDec, TextEdit]` — go to `params`
- `MODE_TYPES = [PartSelector, LevelShift]` — go to `modes`

## Development rules

1. **Do not modify UDO files** — no `chnset`/`chnget` inside a module's opcode
2. Parameters via `chnget` — inside `instr 1/2`, outside opcode
3. LED via external UDO — `led_rms` called in `instr 1/2` after the module
4. `ConnectorIndex` — legacy from NM2 import, not used
5. User-modules always in `user/` — `csound/modules/user/` and `modules/user/`
6. Each user-UDO — one opcode per file
7. `params`/`inputs`/`outputs` — fixed order, matches `xin` in UDO
8. **Csound names always from `type` / `jsonName`**, never from `displayName` / `title`
9. **No direct `fetch('/api/...')`** — use `moduleStore`
10. **Don't block module graph with top-level await** in entry points

## Known issues (short)

- Variant switching not yet wired to UI (parsing done, switching not)
- `CsoundEngine._ledValues` not cleared on `stop()`
- `ComponentPropertiesWindow` opens only via button
- Web `moduleStore` is a stub — user modules don't persist in browser yet

## TODO (short)

- Web `moduleStore` via IndexedDB
- Variant switching: `k` ↔ `a` module opcode based on incoming cable types
- Jack recoloring on variant switch
- Split rendering into 4 canvas layers
- Replace `getControlChannel` with `channelPtr` in `CsoundEngine`
- Undo/Redo
- Tests
- Design Settings panel

## How to start working

Before any change:

1. Ask the user about the goal of the change
2. Clarify which files will be affected
3. Check if there are related issues in TODO
4. Propose the minimal patch

Style:

- Russian for the user, **English for public docs**
- No "let's try" — concrete edits
- Show diff or full methods
- Do not change things not asked about


```
