// src/UndoManager.js
//
// Snapshot-based Undo/Redo for CsModular.
// Each entry = full patch JSON from ModularSystem.exportPatchToJson().
//
// Scope (MVP):
//   - add/remove module, add/remove cable, move module, add/remove sticker
//   - NOT parameters (Knob/Slider drag) — needs coalescing, later
//   - NOT theme changes
//
// "New patch — new era": the stacks are cleared in loadBuiltinPatch /
// loadPatchFromFile / resetEverything / _cmdNew. loadPatch() itself is NOT
// touched — it stays a dumb applier, otherwise undo would wipe its own stack.

const MAX_STEPS = 30;

export class UndoManager {
    constructor(system) {
        this.system = system;
        this._undo = [];          // { label, snapshot }
        this._redo = [];
        this._isApplying = false; // set during undo()/redo() — blocks push()
    }

    /** Push current patch state as an undo step. No-op during undo/redo. */
    push(label = 'Action') {
        if (this._isApplying) return;
        if (!this.system?.exportPatchToJson) return;

        let snapshot;
        try {
            snapshot = JSON.stringify(this.system.exportPatchToJson());
        } catch (e) {
            console.warn('[UndoManager] snapshot failed:', e);
            return;
        }

        this._undo.push({ label, snapshot });
        if (this._undo.length > MAX_STEPS) this._undo.shift();
        this._redo.length = 0;

        this.system.lowerBar?.refreshState?.();
    }

    /** Clear both stacks (New / Load). */
    clear() {
        this._undo.length = 0;
        this._redo.length = 0;
        this.system.lowerBar?.refreshState?.();
    }

    canUndo() { return this._undo.length > 0; }
    canRedo() { return this._redo.length > 0; }
    getUndoLabel() { return this._undo.at(-1)?.label ?? null; }
    getRedoLabel() { return this._redo.at(-1)?.label ?? null; }

    async undo() {
        if (this._isApplying || this._undo.length === 0) return false;
        const entry = this._undo.pop();

        this._redo.push({
            label: entry.label,
            snapshot: JSON.stringify(this.system.exportPatchToJson()),
        });

        return this._apply(entry.snapshot, () => {
            // rollback stacks on failure
            this._undo.push(entry);
            this._redo.pop();
        });
    }

    async redo() {
        if (this._isApplying || this._redo.length === 0) return false;
        const entry = this._redo.pop();

        this._undo.push({
            label: entry.label,
            snapshot: JSON.stringify(this.system.exportPatchToJson()),
        });

        return this._apply(entry.snapshot, () => {
            this._redo.push(entry);
            this._undo.pop();
        });
    }

    async _apply(snapshot, onFail) {
        this._isApplying = true;
        try {
            await this.system.patchLoader.loadPatch(JSON.parse(snapshot));
            return true;
        } catch (e) {
            console.error('[UndoManager] apply failed:', e);
            onFail?.();
            return false;
        } finally {
            this._isApplying = false;
            this.system.lowerBar?.refreshState?.();
        }
    }
}