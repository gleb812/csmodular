
# Contributing a Module

This guide is for Csound programmers who want to add a module to CsModular.
It assumes you know Csound (opcodes, `instr`, `xin`, ftgen, etc.).
It does **not** teach Csound — only the CsModular workflow.

## What is a module

A module = **two files**:

- `<Name>.js` — UI description (components, params, ports, category, status)
- `<Name>.txt` — Csound UDO (`opcode <Name>, ... endop`)

Both live in `public/libraries/<lib>/modules/`.
The module is listed in `public/libraries/<lib>/_index.json`.

## Step 1 — Create the module in the editor

1. Open the editor: **`Ed`** button in the transport (or `/editor/editor.html`).
2. Build the panel:
   - Add components via the **palette** (left side) or the **Terminal**
     (`add knob`, `add label "text"`, …).
   - Set the module name: **Properties → Module → Name** (Csound-safe identifier: `[a-zA-Z0-9_]`, no spaces).
   - Set **Height** (grid cells), **Category**, **Status** (`stable` / `passable` / `dev`).
3. Write the Csound UDO in the **Csound Code** panel.
   - The `opcode`, `xin`, `zar`/`zkr`, `zaw`/`zkw`, `endop` lines are **protected** — they are regenerated from the panel.
   - You edit only the **body** between input-jack reads and output-jack writes.
4. `Ctrl+S` in the code panel — syncs the code with the model (does not save to disk).
5. **💾 Save** → Name: `<Name>`, Library: `user` → Save.
   (This writes to IndexedDB — local only, not in git. Good for iteration.)

## Step 2 — Test in the main app

1. `Space` → **👤 user** → `<Name>` → place it in a patch.
2. Verify audio, controls, jacks, mapping tables.
3. If something is wrong — back to editor, fix, **💾 Save** again.

## Step 3 — Export for release

1. In the editor: **📂 Load** → `user` → `<Name>`.
2. **⬇ Export** — downloads `<Name>.js` and `<Name>.txt`.
3. (Tauri: same button, native save dialog.)

## Step 4 — Add to the repo

1. Create the library folder (if it doesn't exist):
   ```
   public/libraries/<lib>/
   ├── _meta.json
   ├── _index.json
   └── modules/
   ```
2. Put the exported files:
   ```
   public/libraries/<lib>/modules/<Name>.js
   public/libraries/<lib>/modules/<Name>.txt
   ```
3. Add the module to `public/libraries/<lib>/_index.json`:
   ```json
   {
     "modules": [
       { "name": "<Name>", "displayName": "<Name>", "category": "osc", "status": "passable" }
     ]
   }
   ```
   **`status`**: `stable` (ready) or `passable` (works, but not perfect).
   `dev` / `broken` — **not shipped** in release builds.

   You can generate **automatically** `_index.json` and `_meta.json` from the `.js` files:

   ```bash
   python scripts/generate-index.py <lib>
   ```

## Step 5 — Build & verify

```bash
rm -rf dist node_modules/.vite
npm run build
ls dist/libraries/<lib>/modules/        # <Name>.js + <Name>.txt here?
cat dist/libraries/<lib>/_index.json    # <Name> with your status?
```

## Step 6 — Git

```bash
git add public/libraries/<lib>/
git add public/libraries/_index.json
git commit -m "Add <lib>/<Name> module (<status>)"
git push
```

Open a PR. Maintainer reviews, merges, builds the release.

## Sharing a module with another user (no git)

1. **📂 Load** → `user` → `<Name>` → **⬇ Export** → send `.js` + `.txt`.
2. Recipient: **⬆ Import** → select both files → module appears in their `👤 user`.

No git, no build, no release. Just two files.

## Rules

- **Csound names** come from `type` / `jsonName` — never from `displayName` / `title`.
- **`params[]` order** = `components[]` order in the JS file. Never sort.
- **`xin` order** = `params[]` + `inputs[]` + `outputs[]`. Must match the UDO.
- **`;@ strict`** in the UDO must match `bandwidth: 'static' | 'dynamic'` in the JS.
- **One opcode per file.**
- **User modules** (`user/`, IndexedDB) are **not** in git. Only builtin (`public/libraries/`) is.
- **No `chnset`/`chnget` inside the UDO** — parameters come via `xin`, indicators via `led_rms` / `mVU_rms` called after the module in `instr 1/2`.

## Adding a builtin library

```
public/libraries/<lib>/
├── _meta.json       # { name, displayName, author, version, description, createdAt }
├── _index.json      # { modules: [{ name, displayName, category, status }] }
└── modules/
```

`_meta.json` is optional but recommended. `_index.json` is **required** — `stableModulesOnly` (vite plugin) reads it to filter what ships.
```

