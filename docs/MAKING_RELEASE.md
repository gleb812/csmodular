
# Making a Release

How to publish a new alpha/beta/release of CsModular.

**Companion docs:**
- `CONTRIBUTING.md` — adding modules
- `TODO.md` — roadmap
- `TROUBLESHOOTING.md` — known issues

---

## Overview

```
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  1. Bump version │───▶│  2. Git tag      │───▶│  3. CI builds    │
│  (script)        │    │  + push          │    │  (GitHub Actions)│
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────┐
                                                │  4. Draft release│
                                                │  → Publish       │
                                                └──────────────────┘
```

**Automation:** version bump → git tag → push → GitHub Actions builds all platforms → draft release → **you** review and publish.

---

## Prerequisites

- **Python 3.10+** (for `scripts/release.py`)
- **Git** (obviously)
- **GitHub repo** with Actions enabled
- **`gh` CLI** (optional, for faster release review)

---

## Step 1 — Bump the version

Version lives in **three** files (the script syncs them):

| File | Field |
|---|---|
| `package.json` | `"version"` |
| `src-tauri/Cargo.toml` | `[package] version` |
| `src-tauri/tauri.conf.json` | `"version"` (if present; Tauri falls back to `Cargo.toml`) |

### Bump by kind (patch / minor / major)

```bash
python scripts/release.py patch     # 0.1.2 → 0.1.3   (bug fixes, small changes)
python scripts/release.py minor     # 0.1.2 → 0.2.0   (new features, backwards-compatible)
python scripts/release.py major     # 0.1.2 → 1.0.0   (breaking changes)
```

### Explicit version

```bash
python scripts/release.py 0.2.0
```

### Dry-run first (recommended)

```bash
python scripts/release.py patch --dry-run
```

Shows what would change, writes nothing. **Run this first** to verify the version jump is what you want.

### What the script does

1. Reads current version from `package.json`
2. Computes new version (bump or explicit)
3. Updates `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`
4. Prints next steps (git commands)

**Safety:**
- Refuses to run if `git status` is dirty (use `--force` to override)
- Validates semver (`X.Y.Z` only)
- Only touches `[package] version` in `Cargo.toml` (not dependencies)

---

## Step 2 — Commit + tag + push

### One command (with `--push`)

```bash
python scripts/release.py patch --push
```

Does everything:
```bash
git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: release v0.1.3"
git tag v0.1.3
git push
git push origin v0.1.3
```

### Manual (if you want to review the diff first)

```bash
python scripts/release.py patch         # only updates files

git diff package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
# ── review ──

git add package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: release v0.1.3"
git tag v0.1.3
git push
git push origin v0.1.3
```

### Version tag convention

| Tag | Meaning |
|---|---|
| `v0.1.3` | release |
| `v0.1.3-alpha` | alpha (pre-release) |
| `v0.1.3-beta` | beta (pre-release) |

The workflow triggers on `v*` — any tag starting with `v`. **Pre-release tags** are fine; mark the GitHub release as pre-release manually (Step 4).

---

## Step 3 — CI builds automatically

Pushing a `v*` tag triggers `.github/workflows/release.yml`.

**Matrix:**

| Platform | Target | Bundle |
|---|---|---|
| Linux (ubuntu-22.04) | x86_64 | `.AppImage`, `.deb`, `.rpm` |
| macOS (macos-latest) | aarch64 (M1/M2/M3) | `.dmg`, `.app` |
| macOS (macos-latest) | x86_64 (Intel) | `.dmg`, `.app` |
| Windows (windows-latest) | x86_64 | `.msi`, `.exe` |

**Watch progress:**
```
https://github.com/<user>/<repo>/actions
```

First build: ~15–20 min (Rust compiles from scratch). Subsequent: ~5–10 min (Rust cache).

**Common failures:**

| Error | Fix |
|---|---|
| `tauri-plugin-fs (vX) : @tauri-apps/plugin-fs (vY)` | Sync versions in `Cargo.toml` + `package.json` |
| Linux: missing `libwebkit2gtk-4.1-dev` | Check `apt-get install` step in workflow |
| Rust: timeout | Re-run workflow (transient) |
| macOS: "app is damaged" | Confirm `signingIdentity: "-"` (ad-hoc) in `tauri.conf.json` |

---

## Step 4 — Publish the draft release

After CI finishes, a **draft release** appears in GitHub.

1. **Releases** → find draft `CsModular v0.1.3`
2. **Review artifacts:**
   - Linux: `csmodular_0.1.3_amd64.AppImage`, `.deb`, `.rpm`
   - macOS: `csmodular_0.1.3_x64.dmg`, `aarch64.dmg`
   - Windows: `csmodular_0.1.3_x64_en-US.msi`, `.exe`
3. **Download and verify** at least one platform locally:
   - Run `.AppImage` (Linux) — sound, editor, `my-lib`
   - Run `.dmg` (macOS) — right-click → Open (ad-hoc unsigned)
   - Run `.msi` (Windows) — SmartScreen warning → "More info" → "Run anyway"
4. **Edit release notes** (optional):
   - Highlights, new modules, breaking changes
   - Known issues
5. **Publish release** (button)

⚠️ **Draft only** — users can't see it until you publish.

**Pre-release flag:** if alpha/beta — check "This is a pre-release" in release settings.

---

## Step 5 — Announce

- Link to release: `https://github.com/<user>/<repo>/releases/tag/v0.1.3`
- Demo patch (`.json`) — users load it to hear sound immediately
- Known issues (link `TROUBLESHOOTING.md`)

---

## Manual build (local, for testing)

If you want to test a build **before** pushing a tag:

### Linux

```bash
npx tauri build
./src-tauri/target/release/bundle/appimage/*.AppImage
```

### macOS

```bash
npx tauri build
open src-tauri/target/release/bundle/dmg/*.dmg
```

### Windows

```powershell
npx tauri build
start src-tauri\target\release\bundle\msi\*.msi
```

**Note:** macOS builds only on macOS, Windows only on Windows (no cross-compile). Use CI for multi-platform.

---

## Hotfix release (urgent bug)

```bash
python scripts/release.py patch --push
```

Same as normal, but:
- Use `patch` (not `minor`/`major`)
- Release notes: what was fixed, which version it replaces
- Publish immediately (don't wait for announcement)

---

## Version numbering

| Change | Bump | Example |
|---|---|---|
| Bug fix | `patch` | 0.1.2 → 0.1.3 |
| New feature (backwards-compatible) | `minor` | 0.1.2 → 0.2.0 |
| Breaking change | `major` | 0.1.2 → 1.0.0 |
| Alpha/beta iteration | `patch` | 0.1.2-alpha → 0.1.2-alpha.2 |

**For alpha:** `0.x.y` is fine (no need for `1.0.0` until stable).

---

## Troubleshooting

### CI build fails on Linux

Check `apt-get install` step — needs `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`.

### CI build fails on macOS

- **"app is damaged"** — `signingIdentity: "-"` must be in `tauri.conf.json` (ad-hoc signing)
- **"cannot be opened because the developer cannot be verified"** — users right-click → Open, or `xattr -cr /Applications/CsModular.app`

### CI build fails on Windows

- **WebView2 missing** — Windows 10 users need [WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) (Windows 11 has it)
- **SmartScreen warning** — expected for unsigned apps

### Version mismatch

Run `python scripts/release.py patch --dry-run` — check all three files would be updated. If one is skipped (e.g. `tauri.conf.json` has no `version`), that's expected (Tauri reads from `Cargo.toml`).

### Release not visible to users

You forgot to **publish** the draft. Releases → draft → **Publish release**.

---

## Files involved

| File | Role |
|---|---|
| `scripts/release.py` | Version bump + git automation |
| `.github/workflows/release.yml` | CI build for all platforms |
| `package.json` | npm version |
| `src-tauri/Cargo.toml` | Rust version |
| `src-tauri/tauri.conf.json` | Tauri config (version optional) |

---

## Quick reference

```bash
# Dry-run (safe)
python scripts/release.py patch --dry-run

# Bump + push (one command)
python scripts/release.py patch --push

# Manual review
python scripts/release.py patch
git diff package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git add -u && git commit -m "chore: release v0.1.3"
git tag v0.1.3 && git push && git push origin v0.1.3

# After CI
# → GitHub Releases → draft → verify → Publish
```

