# `remove-modules.py` — Manual

## What it does

Removes one or more modules from a **builtin** library under `public/libraries/`. For each module it:

1. Deletes `public/libraries/<lib>/modules/<Name>.js`
2. Deletes `public/libraries/<lib>/modules/<Name>.txt`
3. Removes the `<Name>` entry from `public/libraries/<lib>/_index.json`
4. If `dist/libraries/<lib>/modules/` exists — also deletes the same files there (so you don't have to rebuild just to verify the module is gone from a local build)
5. Warns if the library becomes empty (but does **not** delete the library itself)

It does **not** touch:
- `public/libraries/_index.json` (the library entry stays — otherwise `listLibraries()` won't see it)
- `public/libraries/<lib>/_meta.json`
- Any `user` modules in IndexedDB (those are local, not in the repo)
- `git` (no auto-commit — you decide)

---

## Usage

```bash
python scripts/remove-modules.py <lib-name> <Module1> [<Module2> ...] [--dry-run]
python scripts/remove-modules.py <lib-name> --all [--dry-run]
```

### Remove one module

```bash
python scripts/remove-modules.py my-lib VCO
```

### Remove several modules

```bash
python scripts/remove-modules.py my-lib VCO OldMod LegacyOsc
```

### Remove all modules from a library

```bash
python scripts/remove-modules.py my-lib --all
```

> Prompts nothing — deletes everything immediately. Combine with `--dry-run` first if unsure.

### Preview without deleting (`--dry-run`)

```bash
python scripts/remove-modules.py my-lib VCO --dry-run
```

Prints what **would** be deleted, but leaves files and `_index.json` untouched.

---

## Output — what you'll see

```
  [dry] rm public/libraries/my-lib/modules/VCO.js
  [dry] rm public/libraries/my-lib/modules/VCO.txt
  [dry] Updated _index.json: removed 1 / 5 entries (VCO)

[dry] Done: 1 module(s) removed from 'my-lib'
```

Without `--dry-run`, the same lines appear without the `[dry]` prefix, and the "Next" block is printed:

```
Done: 1 module(s) removed from 'my-lib'

Next:
  rm -rf dist node_modules/.vite
  npm run build
  git add public/libraries/my-lib/
  git commit -m "Remove VCO from my-lib"
  git push
```

---

## Typical workflow — replacing a module with a new version

If you're upgrading a module **with the same contract** (same `type`, same jacks, same params):

1. Iterate in the editor → `user` (IndexedDB).
2. Export `<Name>.js` + `<Name>.txt`.
3. Overwrite `public/libraries/<lib>/modules/<Name>.js` and `.txt` **manually** — do **not** run `remove-modules.py`. Old entry in `_index.json` stays (same `name`).
4. Update `status` in `_index.json` if needed (`dev` → `stable`).
5. `rm -rf dist && npm run build`.

If you're upgrading **with a breaking change** (different jacks, params, or `type`):

1. Pick a **new** name (`VCO2`), keep the old `VCO`.
2. Add `VCO2` files, update `_index.json` (`python scripts/generate-index.py <lib>`).
3. Mark old `VCO` as `deprecated` (or leave as `passable`) in `_index.json`.
4. Later — when you're sure no one needs the old one — remove it:
   ```bash
   python scripts/remove-modules.py <lib> VCO --dry-run
   python scripts/remove-modules.py <lib> VCO
   rm -rf dist && npm run build
   ```

---

## Safety notes

- **`--dry-run` first.** Especially with `--all`.
- **User modules are never touched.** The script only looks in `public/libraries/`. IndexedDB `user/*` is out of scope.
- **`dist` cleanup is partial.** It removes `<Name>.*` for the modules you named, but a full `npm run build` will overwrite `dist/libraries/` anyway. Always rebuild after removal.
- **No auto-git.** The script prints the `git` commands but does not run them. Review `git status` before committing.
- **Empty library warning.** If you remove the last module from a library, the script **warns** but does not delete the library. To remove the library itself:
  ```bash
  rm -rf public/libraries/<lib>
  # then remove "<lib>" from public/libraries/_index.json
  ```
- **Dangling patches.** Old patches that reference a removed module will fail to load it. `PatchLoader` will log a warning and create a placeholder module (if the placeholder mechanism is in place). No silent data loss — but the patch won't sound as before.

---

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success (files removed, index updated) |
| `1` | Library not found, `modules/` missing, or `--all` on an empty folder |

Errors within a single module (e.g. file can't be deleted) are **not** fatal — the script skips that file and continues. Check the summary line for the actual removed count.

---

## When **not** to use it

- **User modules** (`~/Documents/CsModular/libraries/` on Tauri, IndexedDB on web) — use the editor's **rm** command in the Terminal, or delete the IndexedDB key directly.
- **Builtin libraries that you're retiring entirely** — use `rm -rf public/libraries/<lib>` plus editing `public/libraries/_index.json`. The script only handles individual modules.
- **Renaming a module** — this is not removal + re-add. Rename in the editor, re-export, overwrite files, and update `_index.json` `name` field (or regenerate via `generate-index.py`). Removing the old name first will break existing patches.

---

## Companion script

`scripts/generate-index.py <lib>` — regenerates `<lib>/_index.json` and `<lib>/_meta.json` from the current `modules/*.js` files. Use it after **adding** new modules or **renaming** existing ones. Use `remove-modules.py` only for **removing**.

Typical round-trip:

```bash
# Add a new module
cp ~/Downloads/MyMod.js public/libraries/my-lib/modules/
cp ~/Downloads/MyMod.txt public/libraries/my-lib/modules/
python scripts/generate-index.py my-lib

# Remove an old one
python scripts/remove-modules.py my-lib OldMod --dry-run
python scripts/remove-modules.py my-lib OldMod

# Rebuild
rm -rf dist node_modules/.vite
npm run build
```