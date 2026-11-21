#!/usr/bin/env python3
"""
Remove modules from a builtin library.

Usage:
    python scripts/remove-modules.py <lib-name> <Module1> [<Module2> ...]
    python scripts/remove-modules.py <lib-name> --all

Examples:
    python scripts/remove-modules.py my-lib VCO OldMod
    python scripts/remove-modules.py my-lib --all

Removes:
    public/libraries/<lib>/modules/<Name>.js
    public/libraries/<lib>/modules/<Name>.txt
    entries from public/libraries/<lib>/_index.json
    (optionally) same files under dist/libraries/<lib>/modules/

Does NOT:
    - delete the library itself (even if it becomes empty — warns only)
    - touch public/libraries/_index.json (library entry stays)
    - touch _meta.json

Safe: dry-run by default? No — direct. Use --dry-run to preview.
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIBS_DIR = ROOT / "public" / "libraries"
DIST_LIBS_DIR = ROOT / "dist" / "libraries"


def remove_from_index(index_path: Path, names: set[str], dry_run: bool) -> int:
    """Remove entries with name in `names` from <lib>/_index.json. Returns count removed."""
    if not index_path.exists():
        print(f"  ⚠️  {index_path.name} not found — skipping")
        return 0
    try:
        data = json.loads(index_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"  ❌ Cannot parse {index_path}: {e}")
        return 0

    mods = data.get("modules", [])
    before = len(mods)
    kept = []
    removed_names = []
    for m in mods:
        # entries may be strings (legacy) or objects with "name"
        name = m if isinstance(m, str) else m.get("name")
        if name in names:
            removed_names.append(name)
        else:
            kept.append(m)

    if not removed_names:
        print(f"  ℹ️  No matching entries in {index_path.name}")
        return 0

    data["modules"] = kept
    if not dry_run:
        index_path.write_text(
            json.dumps(data, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    print(f"  {'[dry] ' if dry_run else ''}Updated {index_path.name}: "
          f"removed {len(removed_names)} / {before} entries ({', '.join(removed_names)})")
    return len(removed_names)


def remove_file(path: Path, dry_run: bool) -> bool:
    if not path.exists():
        return False
    print(f"  {'[dry] ' if dry_run else ''}rm {path.relative_to(ROOT)}")
    if not dry_run:
        path.unlink()
    return True


def remove_modules(lib: str, names: list[str], dry_run: bool = False) -> int:
    lib_dir = LIBS_DIR / lib
    modules_dir = lib_dir / "modules"

    if not lib_dir.exists():
        print(f"❌ Library not found: {lib_dir}")
        return 1
    if not modules_dir.exists():
        print(f"❌ No modules/ directory in {lib_dir}")
        return 1

    # --all → collect all names from modules/
    if names == ["--all"]:
        names = sorted(p.stem for p in modules_dir.glob("*.js"))
        if not names:
            print(f"❌ No .js files in {modules_dir}")
            return 1
        print(f"⚠️  --all: will remove {len(names)} module(s): {', '.join(names)}")
        print()

    names_set = set(names)

    # 1. Verify existence
    missing = []
    for n in names:
        js = modules_dir / f"{n}.js"
        txt = modules_dir / f"{n}.txt"
        if not js.exists() and not txt.exists():
            missing.append(n)
    if missing:
        print(f"⚠️  Not found (skipped): {', '.join(missing)}")
        print()

    # 2. Remove files
    removed_count = 0
    for n in names:
        js = modules_dir / f"{n}.js"
        txt = modules_dir / f"{n}.txt"
        removed = False
        if remove_file(js, dry_run): removed = True
        if remove_file(txt, dry_run): removed = True
        if removed:
            removed_count += 1

    # 3. Remove from <lib>/_index.json
    index_path = lib_dir / "_index.json"
    remove_from_index(index_path, names_set, dry_run)

    # 4. Optionally — clean dist for same names
    dist_modules = DIST_LIBS_DIR / lib / "modules"
    if dist_modules.exists():
        for n in names:
            remove_file(dist_modules / f"{n}.js", dry_run)
            remove_file(dist_modules / f"{n}.txt", dry_run)

    # 5. Warn if library is empty
    remaining = [p for p in modules_dir.glob("*.js")]
    if not remaining:
        print()
        print(f"⚠️  Library '{lib}' is now empty.")
        print(f"   To remove it entirely:")
        print(f"     rm -rf public/libraries/{lib}")
        print(f"     # and remove '{lib}' from public/libraries/_index.json")

    # 6. Summary
    print()
    print(f"{'[dry] ' if dry_run else ''}Done: {removed_count} module(s) removed from '{lib}'")
    if not dry_run:
        print()
        print("Next:")
        print(f"  rm -rf dist node_modules/.vite")
        print(f"  npm run build")
        print(f"  git add public/libraries/{lib}/")
        print(f"  git commit -m \"Remove {', '.join(sorted(names_set))} from {lib}\"")
        print(f"  git push")

    return 0


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args:
        print("Usage: python scripts/remove-modules.py <lib-name> <Module1> [<Module2> ...]")
        print("       python scripts/remove-modules.py <lib-name> --all [--dry-run]")
        sys.exit(1)

    dry_run = "--dry-run" in args
    args = [a for a in args if a != "--dry-run"]

    if len(args) < 2:
        print("❌ Need at least: <lib-name> <Module1>")
        sys.exit(1)

    lib = args[0]
    names = args[1:]
    sys.exit(remove_modules(lib, names, dry_run=dry_run))