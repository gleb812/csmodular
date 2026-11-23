// src/ui/PatchBrowser.js
//
// Модальное окно выбора заводских патчей.
// Список берётся из /patches/factory.json (манифест).
// Клик по карточке → patchLoader.loadBuiltinPatch(name).

export class PatchBrowser {
    constructor(system) {
        this.system = system;
        this.element = null;
        this._backdrop = null;
        this._listEl = null;
        this._manifest = null;
        this._isOpen = false;

        this._injectStyles();
    }

    _injectStyles() {
        if (document.getElementById('patch-browser-styles')) return;
        const style = document.createElement('style');
        style.id = 'patch-browser-styles';
        style.textContent = `
#patch-browser-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 20000;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(3px);
}
#patch-browser {
    width: min(560px, 90vw);
    max-height: min(70vh, 600px);
    display: flex;
    flex-direction: column;
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 10px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    color: #ddd;
    font-family: 'JetBrains Mono', 'Consolas', monospace;
    font-size: 12px;
    overflow: hidden;
}
#patch-browser .pb-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    font-size: 13px;
    letter-spacing: 0.5px;
}
#patch-browser .pb-close {
    width: 24px; height: 24px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 4px;
    color: #aaa;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
}
#patch-browser .pb-close:hover {
    background: rgba(255,255,255,0.08);
    color: #fff;
}
#patch-browser .pb-body {
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}
#patch-browser .pb-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    cursor: pointer;
    transition: background 0.08s, border-color 0.08s;
}
#patch-browser .pb-item:hover {
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.10);
}
#patch-browser .pb-item-name {
    color: #fff;
    font-size: 13px;
}
#patch-browser .pb-item-meta {
    color: #888;
    font-size: 10px;
    letter-spacing: 0.5px;
}
#patch-browser .pb-empty {
    padding: 24px;
    text-align: center;
    color: #888;
    font-size: 11px;
}
#patch-browser .pb-error {
    padding: 24px;
    text-align: center;
    color: #e84a4a;
    font-size: 11px;
}
`;
        document.head.appendChild(style);
    }

    async open() {
        if (this._isOpen) return;
        this._isOpen = true;
        this._build();
        document.body.appendChild(this._backdrop);
        document.addEventListener('keydown', this._onKeyDown, true);
        await this._loadManifest();
    }

    close() {
        if (!this._isOpen) return;
        this._isOpen = false;
        document.removeEventListener('keydown', this._onKeyDown, true);
        this._backdrop?.remove();
        this._backdrop = null;
        this.element = null;
        this._listEl = null;
    }

    _onKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            this.close();
        }
    };

    _build() {
        this._backdrop = document.createElement('div');
        this._backdrop.id = 'patch-browser-backdrop';
        this._backdrop.addEventListener('click', (e) => {
            if (e.target === this._backdrop) this.close();
        });

        this.element = document.createElement('div');
        this.element.id = 'patch-browser';

        const header = document.createElement('div');
        header.className = 'pb-header';
        const title = document.createElement('span');
        title.textContent = 'FACTORY PATCHES';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'pb-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.title = 'Close (Escape)';
        closeBtn.addEventListener('click', () => this.close());
        header.appendChild(title);
        header.appendChild(closeBtn);

        this._listEl = document.createElement('div');
        this._listEl.className = 'pb-body';
        this._listEl.innerHTML = '<div class="pb-empty">Loading…</div>';

        this.element.appendChild(header);
        this.element.appendChild(this._listEl);
        this._backdrop.appendChild(this.element);
    }

    async _loadManifest() {
        try {
            const res = await fetch('/patches/factory.json');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            if (/^\s*<(!doctype|html)/i.test(text)) {
                throw new Error('factory.json returned HTML (SPA fallback)');
            }
            this._manifest = JSON.parse(text);
            this._renderList();
        } catch (e) {
            console.error('[PatchBrowser] manifest load failed:', e);
            this._listEl.innerHTML =
                `<div class="pb-error">Failed to load factory patches:<br>${this._esc(e.message)}</div>`;
        }
    }

    _renderList() {
        const patches = this._manifest?.patches ?? [];
        if (patches.length === 0) {
            this._listEl.innerHTML = '<div class="pb-empty">No factory patches.</div>';
            return;
        }
        this._listEl.innerHTML = '';
        for (const p of patches) {
            const item = document.createElement('div');
            item.className = 'pb-item';
            item.dataset.file = p.file;

            const name = document.createElement('div');
            name.className = 'pb-item-name';
            name.textContent = p.name || p.file;

            const meta = document.createElement('div');
            meta.className = 'pb-item-meta';
            const bits = [];
            if (p.author) bits.push(p.author);
            if (p.category) bits.push(p.category);
            if (p.version) bits.push('v' + p.version);
            meta.textContent = bits.join(' · ');

            item.appendChild(name);
            if (meta.textContent) item.appendChild(meta);

            if (p.short_description) {
                const desc = document.createElement('div');
                desc.className = 'pb-item-meta';
                desc.textContent = p.short_description;
                item.appendChild(desc);
            }

            item.addEventListener('click', () => this._loadPatch(p));
            this._listEl.appendChild(item);
        }
    }

    async _loadPatch(p) {
        const name = String(p.file || '').replace(/\.json$/i, '');
        if (!name) return;
        this.close();
        try {
            const res = await this.system.patchLoader.loadBuiltinPatch(name);
            if (res?.success) {
                this.system.showNotification?.(`✅ Patch loaded: ${p.name || name}`);
            } else {
                this.system.showNotification?.(`❌ ${res?.error || 'Failed to load patch'}`);
            }
        } catch (e) {
            console.error('[PatchBrowser] load failed:', e);
            this.system.showNotification?.(`❌ ${e.message}`);
        }
    }

    _esc(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[c]));
    }
}