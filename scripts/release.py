#!/usr/bin/env python3
"""
Bump version across CsModular files, optionally commit + tag + push.

Usage:
    python scripts/release.py patch            # 0.1.2 → 0.1.3
    python scripts/release.py minor            # 0.1.2 → 0.2.0
    python scripts/release.py major            # 0.1.2 → 1.0.0
    python scripts/release.py 0.1.3            # explicit version
    python scripts/release.py patch --push     # bump + commit + tag + push
    python scripts/release.py patch --dry-run  # show changes, don't write

Files updated:
    package.json                    → "version"
    src-tauri/Cargo.toml            → [package] version = "..."
    src-tauri/tauri.conf.json       → "version" (if present; else skipped)

Safety:
    - Refuses to run if git working tree is dirty (unless --force)
    - Validates semver format
    - Shows diff before write (with --dry-run)
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PKG_JSON = ROOT / "package.json"
CARGO_TOML = ROOT / "src-tauri" / "Cargo.toml"
TAURI_CONF = ROOT / "src-tauri" / "tauri.conf.json"

SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+$")


# ── Helpers ─────────────────────────────────────────────────────────

def run(cmd, check=True, capture=True):
    """Run a shell command."""
    result = subprocess.run(
        cmd, shell=True, cwd=ROOT,
        capture_output=capture, text=True,
    )
    if check and result.returncode != 0:
        print(f"❌ Command failed: {cmd}")
        if capture:
            print(result.stderr)
        sys.exit(1)
    return result


def parse_version(v: str) -> tuple:
    """'0.1.2' → (0, 1, 2)"""
    if not SEMVER_RE.match(v):
        raise ValueError(f"Invalid semver: {v}")
    return tuple(int(x) for x in v.split("."))


def bump(version: str, kind: str) -> str:
    """Bump version by kind (patch/minor/major)."""
    major, minor, patch = parse_version(version)
    if kind == "patch":
        patch += 1
    elif kind == "minor":
        minor += 1
        patch = 0
    elif kind == "major":
        major += 1
        minor = 0
        patch = 0
    else:
        raise ValueError(f"Unknown bump: {kind}")
    return f"{major}.{minor}.{patch}"


# ── Read current version ────────────────────────────────────────────

def read_current_version() -> str:
    if not PKG_JSON.exists():
        print(f"❌ {PKG_JSON} not found")
        sys.exit(1)
    pkg = json.loads(PKG_JSON.read_text(encoding="utf-8"))
    version = pkg.get("version")
    if not version:
        print(f"❌ No 'version' in {PKG_JSON}")
        sys.exit(1)
    return version


# ── Update files ────────────────────────────────────────────────────

def update_package_json(new_version: str) -> None:
    pkg = json.loads(PKG_JSON.read_text(encoding="utf-8"))
    pkg["version"] = new_version
    PKG_JSON.write_text(
        json.dumps(pkg, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def update_cargo_toml(new_version: str) -> None:
    text = CARGO_TOML.read_text(encoding="utf-8")
    # Only replace the first `version = "..."` inside [package]
    pattern = re.compile(r'(\[package\][^\[]*?\nversion\s*=\s*)"[^"]+"', re.DOTALL)
    new_text, count = pattern.subn(rf'\1"{new_version}"', text, count=1)
    if count == 0:
        print(f"⚠️  No [package] version found in {CARGO_TOML} — skipped")
        return
    CARGO_TOML.write_text(new_text, encoding="utf-8")


def update_tauri_conf(new_version: str) -> None:
    if not TAURI_CONF.exists():
        print(f"⚠️  {TAURI_CONF} not found — skipped")
        return
    conf = json.loads(TAURI_CONF.read_text(encoding="utf-8"))
    if "version" in conf:
        conf["version"] = new_version
        TAURI_CONF.write_text(
            json.dumps(conf, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    else:
        print(f"ℹ️  No 'version' in {TAURI_CONF} — skipped (Tauri reads from Cargo.toml)")


# ── Git status check ────────────────────────────────────────────────

def is_git_dirty() -> bool:
    result = run("git status --porcelain", check=False)
    return bool(result.stdout.strip())


# ── Main ────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Bump CsModular version.")
    ap.add_argument("target", help="patch | minor | major | X.Y.Z")
    ap.add_argument("--push", action="store_true",
                    help="Commit, tag and push")
    ap.add_argument("--dry-run", action="store_true",
                    help="Show what would change, don't write")
    ap.add_argument("--force", action="store_true",
                    help="Proceed even if working tree is dirty")
    ap.add_argument("--message", default=None,
                    help="Commit message (default: 'chore: release vX.Y.Z')")
    args = ap.parse_args()

    current = read_current_version()
    print(f"📦 Current version: {current}")

    # Compute new version
    if args.target in ("patch", "minor", "major"):
        new_version = bump(current, args.target)
    elif SEMVER_RE.match(args.target):
        new_version = args.target
    else:
        print(f"❌ Invalid target: {args.target}")
        print("   Use: patch | minor | major | X.Y.Z")
        sys.exit(1)

    if new_version == current:
        print(f"⚠️  Version already {current} — nothing to do")
        sys.exit(0)

    print(f"🆕 New version:     {new_version}")
    print()

    # Git dirty check
    if not args.dry_run and not args.force and is_git_dirty():
        print("❌ Working tree is dirty. Commit your changes first, or use --force.")
        print()
        run("git status --short", check=False)
        sys.exit(1)

    # Dry-run: show what would change
    if args.dry_run:
        print("🔍 Dry run — would update:")
        print(f"   {PKG_JSON.relative_to(ROOT)}: {current} → {new_version}")
        print(f"   {CARGO_TOML.relative_to(ROOT)}: {current} → {new_version}")
        print(f"   {TAURI_CONF.relative_to(ROOT)}: {current} → {new_version}")
        if args.push:
            print(f"   git commit + tag v{new_version} + push")
        print()
        print("   (dry-run — nothing written)")
        return

    # Write files
    update_package_json(new_version)
    update_cargo_toml(new_version)
    update_tauri_conf(new_version)
    print("✅ Updated files:")
    print(f"   {PKG_JSON.relative_to(ROOT)}")
    print(f"   {CARGO_TOML.relative_to(ROOT)}")
    if TAURI_CONF.exists():
        print(f"   {TAURI_CONF.relative_to(ROOT)}")
    print()

    # Commit + tag + push
    if args.push:
        commit_msg = args.message or f"chore: release v{new_version}"
        print(f"🔨 git add + commit + tag + push")
        run(f'git add "{PKG_JSON}" "{CARGO_TOML}" "{TAURI_CONF}"')
        run(f'git commit -m "{commit_msg}"')
        run(f"git tag v{new_version}")
        run("git push")
        run(f"git push origin v{new_version}")
        print()
        print(f"✅ Pushed v{new_version}")
        print()
        print("GitHub Actions will start building automatically.")
        print("Watch progress: https://github.com/<your-repo>/actions")
        print("When done, publish the draft release:")
        print("  https://github.com/<your-repo>/releases")
    else:
        print("Next steps:")
        print(f'  git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json')
        print(f'  git commit -m "chore: release v{new_version}"')
        print(f"  git tag v{new_version}")
        print(f"  git push && git push origin v{new_version}")


if __name__ == "__main__":
    main()