# Troubleshooting

Known issues, workarounds, and fixes.

## HTML inside Csound ORC

**Symptom:** Csound fails to compile, ORC contains `<!DOCTYPE html>` or similar.

**Cause:** Vite SPA-fallback returns `index.html` for missing `/csound/modules/user/*.txt` (status 200, content-type HTML). The ORC then gets HTML instead of Csound code.

**Fix:** `_loadUdoByPath()` and `_fetchText()` both detect HTML via `looksLikeHtml()`. If you add a new UDO loader, **always** go through `libraryStore.loadUdo()` — never raw `fetch` for user UDOs.

## LED / MiniVU does not light up

**Symptom:** indicator renders but stays dark.

**Cause:** `sourceComponentId` missing, or points to a component that is not an Input/Output of the same module.

**Fix:** set `sourceComponentId` in the editor (Properties → *Source*) or in the module JS. On **Inputs** without a cable — disabled by design. On **Outputs** — tap-bus allocated automatically.

## Jack color changes when a cable is connected

**Cause:** jack painted with cable color (legacy bug).

**Fix:** jack color = its own `jackType`, never the cable's. `BaseJack.getEffectiveColor()`. `PatchManager` no longer paints jacks with cable color. `synchronizeInputCables` / `findColoredCable` removed.

## `logic` / `logicAudio` jacks turn red/blue

**Cause:** `logic`/`logicAudio` are a separate family. Only re-color to each other, and only if `dynamic`.

**In Csound:** both are `control` — no converter between them. `audio ↔ logicAudio`, `control ↔ logic`, `logic ↔ logicAudio` — no converter.

## MIDI dies after recompile

**Symptom:** MIDI works until a patch change; after recompile — silent.

**Cause:** `@csound/browser` IPC ports not recreated after recompile.

**Workaround:** restart Csound (reload page). Upstream issue.

## LED / oscilloscope erratic after load

**Cause:** `mappingTable` was not serialized for `Knob`/`Slider` — scope reads wrong bus.

**Fix:** `mappingTable` is serialized in `ComponentRegistry`. Re-save modules from the editor if they were created before this fix.

## HiDPI drag is off

**Cause:** `resizeCanvasToWindow` uses `dpr = 1` workaround.

**Status:** known, planned fix.