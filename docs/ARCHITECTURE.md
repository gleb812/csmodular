
# Architecture

High-level overview of CsModular. For AI-facing context (every class, every rule,
every known issue) — see [`AI Context.md`](AI_Context.md). For editor internals —
[`EDITOR.md`](EDITOR.md). For module creation — [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Overview

CsModular is a modular synthesizer. **Modules** are panels with UI components
(knobs, sliders, jacks) and a Csound **UDO** (opcode). **Cables** connect
**jacks** (Input/Output) between modules. A **patch** is modules + cables.

Two entries:

- `index.html` — main app (build patch, play)
- `editor.html` — module editor (design custom modules)

```
┌─────────────────────────────────────────────────────────────┐
│  Main app (index.html)                                      │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                │
│  │  Module  │───│  Cable   │───│  Module  │                │
│  │ (Panel)  │   │          │   │ (Panel)  │                │
│  └──────────┘   └──────────┘   └──────────┘                │
│       │                              │                      │
│       ▼                              ▼                      │
│  ┌──────────────────────────────────────────┐              │
│  │  CsoundGenerator → ORC → CsoundEngine    │              │
│  └──────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────┘
```

## Layers

- **Voice** — per-voice polyphony (default). `instr 1`.
- **FX** — global effects / master. `instr 2`.

Cables only within one layer. Change via right-click → Layer.

## Module

A module is **two files**:

- `<Name>.js` — UI description (components, `params`, `inputs`, `outputs`,
  `category`, `status`, `gridHeight`, `customColor`, `midiMappings`).
- `<Name>.txt` — Csound UDO (`opcode <Name>, ... endop`).

Both live in `public/libraries/<lib>/modules/` (builtin) or in
`user/` (IndexedDB on web, `~/Documents/CsModular/libraries/user/` on desktop).

The module is listed in `public/libraries/<lib>/_index.json`:

```json
{ "modules": [{ "name": "MyMod", "displayName": "MyMod", "category": "osc", "status": "passable" }] }
```

`status` — `stable` / `passable` / `dev` / `broken`. Only `stable` / `passable`
are shipped in release builds (`stableModulesOnly` Vite plugin filters
`public/libraries/*` → `dist/libraries/*`).

**`params[]` order** = `components[]` order. `CsoundGenerator.formatModuleLine`
reads `moduleDef.params` directly — never sort.

**`xin` order** = `params[]` + `inputs[]` + `outputs[]`. Must match the UDO.

**Csound names** come from `type` / `jsonName` — never from `displayName` / `title`.

## Jacks

Every Input/Output has:

| Field | Values | Effect |
|---|---|---|
| `jackType` | `audio`, `control`, `logic`, `logicAudio` | visual color; Csound rate |
| `bandwidth` | `static`, `dynamic` | whether the jack may change type |

### Families

A `dynamic` jack may switch **only inside its family**:

- `{audio, control}` — Csound `a` / `k`
- `{logic, logicAudio}` — both `control` in Csound, visual distinction only

### Rules

- Jack color = its **own** `jackType`, never the cable's color.
  `BaseJack.getEffectiveColor()`.
- Cable color = source jack's **current** type.
- `static` jack + type mismatch → **converter** inserted in ORC (`K2A` / `A2K`),
  jack **stays** its color.
- `dynamic` jack + compatible type → jack **changes** type (and outgoing
  cables re-color).
- `logic ↔ logicAudio`, `control ↔ logic`, `audio ↔ logicAudio` — **no converter**
  (same Csound rate).

```js
// src/constants.js
CABLE_COLORS, TYPE_FAMILY, canTransition, csoundRateOf
```

## Module variants

A UDO may declare:

```
;@ variant k
;@ variant a
;@ ins k k k
;@ outs k k
;@ strict 0 0 1
```

`CsoundGenerator._prepareVariants()`:

1. start with `defaultSuffix` (usually `k`);
2. if an audio-rate cable reaches a **non-strict** input → switch module to `a`;
3. iterate until stable (≤ 20).

**UI effect:** `dynamic` jacks of the module re-color when the variant flips.
`static` (strict) jacks never change.

**`;@ strict[i] === 1`** must match `inputs[i].bandwidth === 'static'` in the JS.

## Csound pipeline

```
Module (JS) + Cable (JS)
      │
      ▼
CsoundGenerator.addModule() / addCable()
      │
      ▼
CsoundGenerator.generateOrc()
  1. _prepareConverters()          — K2A / A2K before receiving module
  2. _collectMappingFtgens()       — ftgen for ;@ map tables
  3. UDO section (includes, sorted)
  4. instr 1 (voice)               — module calls + converters + LED/MiniVU
  5. instr 2 (fx)                  — same
  6. instr 3 (MIDI filter), 4 (offline render)
  7. instr 5 (BPM poller)          — reads chnget "bpm" → gkBPM
      │
      ▼
CsoundEngine.compileOrc() + start()
```

**BPM:** `gkBPM init 120` in ORC header; `instr 5` polls `chnget "bpm"` every k-cycle and updates `gkBPM` (ignored if channel is 0). `i5` is scheduled only via `generateSco()` — never hardcode `sco` in `CsoundEngine`. After `init()` / `recompile()` the engine calls `setChannel('bpm', getBPM())`, otherwise the channel is `0` and `instr 5` silently no-ops.

**UDO loading** — `_loadUdoByPath()` → `libraryStore.loadUdo(lib, name)`:

- builtin: `fetch('/libraries/<lib>/modules/<Name>.txt')`
- user: IndexedDB / Tauri fs `modules/<Name>.txt`
- non-module UDOs (`led_rms.txt`, `mVU_rms.txt`): `fetch('/csound/modules/<path>')`

**Never** raw `fetch` for `user/*` — Vite SPA-fallback returns `index.html`
(status 200, HTML leaks into ORC). `looksLikeHtml()` guards.

## Components

`src/components/` — UI components. Each extends `BaseComponent`:

| Component | Purpose |
|---|---|
| `Knob`, `Slider` | continuous parameters (0..127); override `applyMidiValue()` |
| `ButtonFlat`, `ButtonRadio`, `ButtonIncDec`, `ButtonText`, `PartSelector` | discrete parameters |
| `TextField` | numeric display with table mapping |
| `Input`, `Output` | jacks (audio / control / logic) |
| `LED`, `MiniVU` | level indicators |
| `TextLabel` | text label (theme-colored, no `color` override) |
| `SVG`, `Line`, `Graph` | graphics |
| `TextEdit` | inline text input (editable label) |
| `LevelShift` | level converter (In+Out, scales signal) |

`BaseJack` (base for `Input`/`Output`) — `getEffectiveColor()`, `getCsoundRate()`,
`originalType` (immutable), `type` (mutable, variant-applied),
`bandwidth` (must match `;@ strict`).

`BaseComponent` carries `midiMapping` (`{cc, channel}` | `null`, default `null`) — the runtime binding set by MIDI Learn. `applyMidiValue(0..127)` is a no-op in the base class; `Knob` / `Slider` override it. Persisted per module as `midiMappings[]` in the patch JSON.

## MIDI

`src/midi/MidiManager.js` — Web MIDI API receiver. Enable from a user click (`MIDI` in BottomBar) — required by the browser gesture policy. States: `idle | requesting | ready | denied | unsupported`.

**Notes → Csound:** `0x90` / `0x80` → `CsoundEngine.midiMessage()` → `instr 3` (`gkGate`, `gkNote`).

**MIDI Clock → BPM:** `0xF8` (24 ppqn). `MidiManager._handleMidiClockTick()` averages the last 48 intervals → `getMidiClockBpm()`. When `ModularSystem._bpmSource === 'external'`, the value is pushed via `_applyExternalBpm()` → `setChannel('bpm', v)`. Timeout (500 ms) marks the clock as stopped.

**MIDI Learn:** right-click `Knob`/`Slider` → `ComponentContextMenu` → «🎹 MIDI Learn». `MidiManager.startLearn(comp, onDone)` intercepts the next `0xB0` (CC), consumes it (does not reach `onMessage`), and returns `{cc, channel}`. Subsequent CCs on that binding → `main._handleMidiCC()` → `applyMidiValue()` on every match.

## Editor

`editor.html` — separate entry. IDE-style workspace:

```
┌─────────────────────────────────────────────────┐
│ toolbar: [New] [Load] [Save] [Export] [Import]  │
├──────────────────────┬──────────────────────────┤
│   Canvas (module)    │   Csound Code            │
├──────────────────────┼──────────────────────────┤
│   Properties         │   Terminal               │
│   (Module/Component) │   (command language)     │
└──────────────────────┴──────────────────────────┘
```

`ComponentRegistry` — single source of truth for components. Adding a new
component type = **one entry**:

```js
Knob: {
    label: 'Knob',
    category: 'controls',
    paletteSize: { width: 24, height: 24 },
    isParametric: true,
    create(opts), serialize(comp), deserialize(data, ctx), csoundPorts(comp),
}
```

**Protected Csound structure** — `opcode`, `xin`, `zar`/`zkr`, `zaw`/`zkw`,
`endop` are regenerated from the model. User edits only the **body** between
input-jack reads and output-jack writes.

**Properties panel** — schema-driven from `static getPropertySchema()`.
Field types: `text`, `number`, `list`, `checkbox`, `select`, `mapping-select`,
`mapping-multi-select`, `size`.

Full editor docs: [`EDITOR.md`](EDITOR.md).

## Storage

| | Builtin | User |
|---|---|---|
| Web | `public/libraries/` (read-only) | IndexedDB (`csmodular/libraries`) |
| Tauri | `public/libraries/` (read-only) | `~/Documents/CsModular/libraries/` |

`libraryStore` (`src/api/index.js`) — the only module I/O. No raw `fetch` for
UDOs, no manual IndexedDB. Both backends update `_index.json` on
`saveModule` / `removeModule`.

**Web:** `<lib>/<Name>.js`, `<lib>/<Name>.txt`, `<lib>/_index.json`,
`<lib>/_meta.json` — keys in IndexedDB.
**Tauri:** `modules/<Name>.{js,txt}`, `_index.json`, `_meta.json` — in library root.

## External API

`bridge/` — Node.js process, separate from the main app. Accepts HTTP `POST /csp/...`
and UDP OSC, forwards to the UI over WebSocket. Also relays OSC out.
UI auto-connects to `ws://127.0.0.1:8765/ws`; if bridge is down, UI works normally.

See **[CSP_API.md](CSP_API.md)**.

## Themes

`src/theme/` `Theme` class wraps settings:

```js
theme.isLcd, theme.getTextColor(), theme.getAccentColor(), theme.applyGlow(ctx), ...
```

**All `draw()` use `getCurrentTheme()`**. LCD — single accent fill.

## Patch format

```json
{
  "filename": "my_patch.json",
  "modules": [
    { "name": "Zgen", "library": "test-lib", "id": 1, "type": 0,
      "parameters": "[0,0,0]", "modes": [],
      "area": "VOICE", "hpos": 5, "vpos": 10,
      "customColor": null,
      "midiMappings": [{ "componentId": "1", "cc": 74, "channel": 1 }] }
  ],
  "cables": [...],
  "stickers": [...],
  "design": { "lcd": {...}, "cables": {...}, "background": {...}, "grid": {...} },
  "textpad": ""
}
```

`library` is injected by `ModuleFactory.loadModule` (not stored in JS).
Patch loading: `PatchLoader.loadModuleFile(lib, name)` — if `lib` specified,
checks library exists, loads; else falls back to `user`, then all libraries
(with console warning).

`midiMappings[]` is runtime-only data (not Csound). Restored in `PatchLoader.configureModule` by matching `componentId` against `components[]`. Omitted if empty.

## Known issues

See [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) (user-facing) and
[`AI Context.md`](AI Context.md) → *Known issues* (full).

## Development rules (short)

1. **Csound names** from `type` / `jsonName` — never `displayName` / `title`.
2. **`params[]` order** = `components[]` order — never sort.
3. **One opcode per file.**
4. **No `chnset`/`chnget` inside UDO** — parameters via `xin`, indicators via
   `led_rms` / `mVU_rms` called after module in `instr 1/2`.
5. **UDO loading via `_loadUdoByPath()`** — no raw `fetch` for `user/*`.
6. **Component serialization via `ComponentRegistry`** — no manual
   `if (constructor.name === ...)`.
7. **All `draw()` use `getCurrentTheme()`.**
8. **`rm` ≠ `del`** in editor terminal — `rm`/`remove` = user modules,
   `del`/`delete` = components.
9. **`mappingTable`** serialized for `Knob` / `Slider`.
10. **Indicators** (`LED` / `MiniVU`) require `sourceComponentId` pointing to
    same-module Input/Output.
11. **BPM channel is literal `"bpm"`** — `setChannel('bpm', v)` ↔ `chnget "bpm"`.
    `instr 5` must be scheduled via `generateSco()` (never hardcoded `sco`).
12. **MIDI Learn** lives on `BaseComponent.midiMapping`; `Knob`/`Slider`
    override `applyMidiValue(0..127)`. After applying, set `_voiceDirty` /
    `_fxDirty` — `setValue()` does not redraw by itself.
13. **Code comments — always English** (inline `//`, JSDoc, Csound `;`), regardless
    of user language.

Full rules: [`AI Context.md`](AI_Context.md) → *Development rules*.

```
