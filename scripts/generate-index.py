#!/usr/bin/env python3
"""
Generate _index.json for a library from its .js module files.

Usage:
    python scripts/generate-index.py <lib-name>

Example:
    python scripts/generate-index.py my-lib

Reads:  public/libraries/<lib>/modules/*.js
Writes: public/libraries/<lib>/_index.json
        public/libraries/<lib>/_meta.json  (if absent)
        public/libraries/_index.json       (adds <lib> if absent)

Safe: parses with regex, no eval/import of JS.
"""

import json
import re
import sys
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
LIBS_DIR = ROOT / "public" / "libraries"


def parse_field(js_text: str, field: str) -> str | None:
    """Extract a string field like `status: 'stable'` from JS source."""
    m = re.search(rf'\b{field}\s*:\s*[\'"]([^\'"]+)[\'"]', js_text)
    return m.group(1) if m else None


def parse_module(js_path: Path) -> dict | None:
    """Parse one .js module file → index entry. Returns None if unparseable."""
    try:
        js_text = js_path.read_text(encoding="utf-8")
    except Exception as e:
        print(f"  ⚠️  Cannot read {js_path.name}: {e}")
        return None

    name = js_path.stem  # "MyMod.js" → "MyMod"

    display_name = parse_field(js_text, "displayName") or name
    category = parse_field(js_text, "category") or "custom"
    status = parse_field(js_text, "status") or "dev"

    # Validate status (warn if unknown)
    if status not in ("stable", "passable", "dev", "broken"):
        print(f"  ⚠️  {name}: unknown status '{status}' — using 'dev'")
        status = "dev"

    return {
        "name": name,
        "displayName": display_name,
        "category": category,
        "status": status,
    }


def generate_index(lib_name: str) -> int:
    """Main entry. Returns exit code."""
    lib_dir = LIBS_DIR / lib_name
    modules_dir = lib_dir / "modules"

    if not lib_dir.exists():
        print(f"❌ Library not found: {lib_dir}")
        return 1
    if not modules_dir.exists():
        print(f"❌ No modules/ directory in {lib_dir}")
        return 1

    # ── 1. Scan modules ──
    js_files = sorted(modules_dir.glob("*.js"))
    if not js_files:
        print(f"❌ No .js files in {modules_dir}")
        return 1

    modules = []
    for js_file in js_files:
        entry = parse_module(js_file)
        if entry:
            modules.append(entry)
            txt_exists = "✓" if (modules_dir / f"{js_file.stem}.txt").exists() else "⚠️  no .txt"
            print(f"  {entry['name']:<20} {entry['status']:<10} {entry['category']:<10} {txt_exists}")

    if not modules:
        print("❌ No valid modules parsed")
        return 1

    # ── 2. Write <lib>/_index.json ──
    index_path = lib_dir / "_index.json"
    index_data = {"modules": modules}
    index_path.write_text(
        json.dumps(index_data, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"\n✅ Wrote {index_path.relative_to(ROOT)} ({len(modules)} modules)")

    # ── 3. Write <lib>/_meta.json (always update, preserve createdAt) ──
    meta_path = lib_dir / "_meta.json"

    # Read existing meta (if any)
    existing_meta = {}
    if meta_path.exists():
        try:
            existing_meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"  ⚠️  Cannot parse {meta_path.name} — overwriting")

    # version from package.json (single source of truth)
    version = "0.1.0"
    pkg_path = ROOT / "package.json"
    if pkg_path.exists():
        try:
            version = json.loads(pkg_path.read_text(encoding="utf-8")).get("version", "0.1.0")
        except Exception:
            pass

    # createdAt: preserve from existing, or set now
    created_at = existing_meta.get("createdAt")
    if not created_at:
        from datetime import datetime, timezone
        created_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    meta = {
        "name": lib_name,
        "displayName": existing_meta.get("displayName") or lib_name,
        "author": existing_meta.get("author") or "unknown",
        "version": version,
        "description": existing_meta.get("description") or "",
        "createdAt": created_at,
    }

    meta_path.write_text(
        json.dumps(meta, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    action = "Updated" if existing_meta else "Created"
    print(f"✅ {action} {meta_path.relative_to(ROOT)}")

    # ── 4. Add <lib> to root _index.json ──
    root_index_path = LIBS_DIR / "_index.json"
    if root_index_path.exists():
        try:
            root_index = json.loads(root_index_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            print(f"⚠️  Cannot parse {root_index_path} — skipping root update")
            root_index = None
    else:
        root_index = {"libraries": []}

    if root_index is not None:
        libs = root_index.get("libraries", [])
        if not isinstance(libs, list):
            libs = []
        if lib_name not in libs:
            libs.append(lib_name)
            libs.sort()
            root_index["libraries"] = libs
            root_index_path.write_text(
                json.dumps(root_index, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"✅ Added '{lib_name}' to {root_index_path.relative_to(ROOT)}")
        else:
            print(f"ℹ️  '{lib_name}' already in {root_index_path.relative_to(ROOT)}")

    # ── 5. Summary ──
    print()
    print("Next:")
    print(f"  rm -rf dist node_modules/.vite")
    print(f"  npm run build")
    print(f"  git add public/libraries/{lib_name}/ public/libraries/_index.json")
    print(f'  git commit -m "Add {lib_name} ({len(modules)} modules)"')
    print(f"  git push")

    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python scripts/generate-index.py <lib-name>")
        print("Example: python scripts/generate-index.py my-lib")
        sys.exit(1)

    sys.exit(generate_index(sys.argv[1]))