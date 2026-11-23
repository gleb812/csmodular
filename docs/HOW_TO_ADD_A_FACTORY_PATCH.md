# Factory Patches

How to add a built-in patch to the Patch Browser.

## TL;DR

1. Build the patch in the app → `Save` (downloads `.json`).
2. Put the `.json` into `public/patches/`.
3. Add an entry to `public/patches/factory.json`.
4. Rebuild (`npm run build`) or just refresh dev server.
5. The patch appears in `📦 Patches` in the lower bar.

No code changes required.

## Step by step

### 1. Create and save the patch

- Open the main app (`index.html`).
- Build the patch (modules, cables, stickers, parameters).
- Save it: `Sa` (long-press) → **Save** → enter filename, e.g. `bassline.json`.
- The browser downloads `bassline.json` to your machine.

> **Note:** Save uses the standard download dialog. In Tauri it writes
> to disk via the file dialog. Either way you get a `.json` file.

### 2. Put the file into `public/patches/`

```
public/
└── patches/
    ├── factory.json        ← manifest (edit this)
    ├── startup.json        ← existing demo patch
    └── bassline.json       ← your new patch
```

Filename rules:

- Lowercase, `kebab-case` or `snake_case`. No spaces.
- Must end with `.json`.
- Must be **unique** — the filename (without `.json`) is the patch ID
  used by `loadBuiltinPatch()`.

### 3. Add an entry to `factory.json`

Open `public/patches/factory.json` and add an object to the `patches`
array:

```json
{
  "patches": [
    {
      "file": "startup.json",
      "name": "Startup",
      "author": "CsModular",
      "category": "demo",
      "version": "1.0.0",
      "short_description": "Demo patch loaded on first launch"
    },
    {
      "file": "bassline.json",
      "name": "Bassline",
      "author": "CsModular",
      "category": "bass",
      "version": "1.0.0",
      "short_description": "Acid bassline with a resonant filter"
    }
  ]
}
```

### Fields

| Field | Required | Notes |
|---|---|---|
| `file` | **yes** | Filename inside `public/patches/`, **with** `.json`. |
| `name` | **yes** | Display name shown in the browser. |
| `author` | no | Free text. Shown in the meta line. |
| `category` | no | Free text (e.g. `demo`, `bass`, `pad`). Shown in the meta line. No filtering yet. |
| `version` | no | Free text (e.g. `1.0.0`). Shown as `v1.0.0`. |
| `short_description` | no | One line. Shown under the name. |

> **Current status:** all fields except `file` and `name` are purely
> informational. No validation, no filtering, no sorting beyond the
> order in the manifest. Fill them as you see fit — mechanics will
> come in a later version.

### 4. See it in the app

- **Dev:** Vite serves `public/` directly. After saving `factory.json`,
  refresh the page (or just reopen the Patches window — the manifest
  is fetched on every `open()`).
- **Build:** `npm run build` copies `public/` → `dist/`. The patch and
  manifest end up in `dist/patches/`.

Open the lower bar `📦` button → the new patch is in the list. Click
it → it loads, the browser window closes, `UndoManager` is cleared
(new patch = new era).

## How it works internally

- `PatchBrowser` (`src/ui/PatchBrowser.js`) fetches
  `/patches/factory.json` on `open()`.
- Clicking a card calls `patchLoader.loadBuiltinPatch(name)` where
  `name` is the filename without `.json`.
- `loadBuiltinPatch` does `fetch('/patches/<name>.json')`, parses it,
  and calls `loadPatch(...)`.
- `loadBuiltinPatch` also calls `undoManager.clear()` — the undo stack
  starts fresh.

Nothing is stored in `localStorage` or IndexedDB. Factory patches are
read-only resources shipped with the app.

## Do NOT

- **Do not** put user-editable patches in `public/patches/`. That folder
  is for **factory** (built-in, read-only) patches only.
- **Do not** reference a file that doesn't exist in the manifest —
  clicking it will show an error notification.
- **Do not** use spaces or uppercase in filenames. `loadBuiltinPatch`
  builds the URL as `/patches/<name>.json`; weird characters may
  break the fetch.
- **Do not** edit the manifest by hand *while the app is open* and
  expect the list to update without reopening the Patches window.
  The manifest is fetched on each `open()` — closing and reopening
  is enough, no page reload needed.

## User patches vs factory patches

| | Factory (`public/patches/`) | User patch (`.json` on disk) |
|---|---|---|
| Where | Inside the app bundle | Anywhere on the user's machine |
| How to load | `📦` in lower bar → card | `Sa` → **Load** → file dialog |
| Editable by user | No (read-only) | Yes |
| Listed in Patches window | Yes | No |
| Survives app update | Yes (part of the build) | Yes (it's a file) |

Factory and user patches are **different things** and use **different
UI**. Do not try to merge them — `Load` is for files, `Patches` is
for built-ins.

## Tauri

Same flow. `public/patches/` is bundled into the Tauri app at build
time. The `fetch('/patches/...')` in `PatchBrowser` resolves to the
bundled resource. No extra configuration needed.

> **Note:** the Tauri filesystem plugin is not used for factory
> patches — they go through `fetch`, same as the web build. The
> `~/Documents/CsModular/` folder is for **user** libraries and
> patches, not factory ones.

## Troubleshooting

**Patch doesn't appear in the list.**
- Check `factory.json` syntax (valid JSON, no trailing commas).
- Check that `file` exactly matches the filename in `public/patches/`,
  including `.json`.
- In dev, refresh the page. The manifest is cached by the browser
  (`fetch` default) — a hard reload (`Ctrl+Shift+R`) guarantees
  a fresh copy.

**Clicking a patch does nothing / shows an error.**
- Open DevTools → Console. Look for `[PatchBrowser]` or
  `[PatchLoader] loadBuiltinPatch(...) failed`.
- Most common: the file referenced in the manifest doesn't exist, or
  Vite's SPA fallback returned `index.html` instead of JSON. The
  loader has an HTML-fallback guard — if you see "returned HTML (SPA
  fallback)", the file is missing.

**Patch loads but modules are missing.**
- The patch references a module from a library that isn't installed.
  Check the notification — `loadPatch` reports per-module failures
  in the console.
- Factory patches should only reference **builtin** libraries
  (`public/libraries/`), never user libraries.


