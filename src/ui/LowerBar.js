// src/ui/LowerBar.js
//
// Нижняя узкая панелька: [↶ ↷] │ [Patches] │ [VoiceAllocation]

export class LowerBar {
    constructor(system, { container = document.body } = {}) {
        this.system = system;
        this.element = null;
        this._undoBtn = null;
        this._redoBtn = null;
        this._patchesBtn = null;

        this._injectStyles();
        this._build(container);
        this.refreshState();
    }

    _injectStyles() {
        if (document.getElementById('lower-bar-styles')) return;
        const style = document.createElement('style');
        style.id = 'lower-bar-styles';
        style.textContent = `
#lower-bar {
    position: fixed;
    left: 8px;
    bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 6px;
    background: rgba(0,0,0,0.35);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    z-index: 15000;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 11px;
    user-select: none;
    backdrop-filter: blur(6px);
}
#lower-bar .lb-group {
    display: flex;
    align-items: center;
    gap: 2px;
}
#lower-bar .lb-sep {
    width: 1px;
    height: 16px;
    background: rgba(255,255,255,0.14);
    margin: 0 2px;
    flex: 0 0 auto;
}
#lower-bar .lb-btn {
    height: 22px;
    min-width: 22px;
    padding: 0 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 4px;
    color: #ddd;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
    transition: background 0.08s, border-color 0.08s, color 0.08s;
}
#lower-bar .lb-btn:hover:not(:disabled) {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.20);
    color: #fff;
}
#lower-bar .lb-btn:active:not(:disabled) {
    background: rgba(255,255,255,0.18);
}
#lower-bar .lb-btn:disabled {
    opacity: 0.3;
    cursor: default;
}
#lower-bar .lb-btn-label {
    font-size: 11px;
    letter-spacing: 0.5px;
}
#lower-bar .lb-mount {
    display: flex;
    align-items: center;
}
`;
        document.head.appendChild(style);
    }

    _build(container) {
        this.element = document.createElement('div');
        this.element.id = 'lower-bar';

        // ── Group 1: Undo / Redo ──────────────────────────────
        const undoGroup = document.createElement('div');
        undoGroup.className = 'lb-group';

        this._undoBtn = document.createElement('button');
        this._undoBtn.className = 'lb-btn';
        this._undoBtn.type = 'button';
        this._undoBtn.textContent = '↶';
        this._undoBtn.title = 'Undo (Ctrl+Z)';
        this._undoBtn.addEventListener('click', () => this.system.undoManager?.undo());

        this._redoBtn = document.createElement('button');
        this._redoBtn.className = 'lb-btn';
        this._redoBtn.type = 'button';
        this._redoBtn.textContent = '↷';
        this._redoBtn.title = 'Redo (Ctrl+Shift+Z / Ctrl+Y)';
        this._redoBtn.addEventListener('click', () => this.system.undoManager?.redo());

        undoGroup.appendChild(this._undoBtn);
        undoGroup.appendChild(this._redoBtn);
        this.element.appendChild(undoGroup);

        this.element.appendChild(this._sep());

        // ── Group 2: Patches ──────────────────────────────────
        const patchesGroup = document.createElement('div');
        patchesGroup.className = 'lb-group';

        this._patchesBtn = document.createElement('button');
        this._patchesBtn.className = 'lb-btn';
        this._patchesBtn.type = 'button';
        this._patchesBtn.textContent = '📦';
        this._patchesBtn.title = 'Factory patches';
        this._patchesBtn.addEventListener('click', () => this.system.patchBrowser?.open());

        patchesGroup.appendChild(this._patchesBtn);
        this.element.appendChild(patchesGroup);

        this.element.appendChild(this._sep());

        // ── Group 3: Voice allocation mount ───────────────────
        const voiceMount = document.createElement('div');
        voiceMount.className = 'lb-mount';
        voiceMount.id = 'lower-bar-voice-mount';
        this.element.appendChild(voiceMount);

        container.appendChild(this.element);
    }

    _sep() {
        const s = document.createElement('div');
        s.className = 'lb-sep';
        return s;
    }

    refreshState() {
        if (!this._undoBtn || !this._redoBtn) return;
        const um = this.system?.undoManager;
        this._undoBtn.disabled = !um?.canUndo();
        this._redoBtn.disabled = !um?.canRedo();
        const u = um?.getUndoLabel();
        const r = um?.getRedoLabel();
        if (u) this._undoBtn.title = `Undo: ${u} (Ctrl+Z)`;
        if (r) this._redoBtn.title = `Redo: ${r} (Ctrl+Shift+Z)`;
    }
}