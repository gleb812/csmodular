// src/csound/MappingTables.js

/**
 * Загрузчик mapping-таблиц из csound/mapping_tables/value_maps.json.
 * 
 * Формат JSON: { "ИМЯ": [значения...], ... }
 * 
 * Использование:
 *   const tables = new MappingTables();
 *   await tables.load();
 *   tables.getAllNames();          // ['Level_dB', 'Freq_Hz', ...]
 *   tables.get('Level_dB');        // [-18, -17.7, ..., 18]
 *   tables.has('Level_dB');        // true
 */
export class MappingTables {
    constructor() {
        this.tables = {};
        this._loaded = false;
        this._loadingPromise = null;
    }

    async load() {
        if (this._loaded) return true;
        if (this._loadingPromise) return this._loadingPromise;
        
        this._loadingPromise = (async () => {
            try {
                const response = await fetch('/csound/mapping_tables/value_maps.json');
                if (!response.ok) {
                    console.warn(`⚠️ value_maps.json not found (status ${response.status})`);
                    this.tables = {};
                    this._loaded = true;
                    return false;
                }
                this.tables = await response.json();
                this._loaded = true;
                const count = Object.keys(this.tables).length;
                console.log(`📊 Loaded ${count} mapping tables`);
                return true;
            } catch (error) {
                console.error('❌ Failed to load value_maps.json:', error);
                this.tables = {};
                this._loaded = true;
                return false;
            } finally {
                this._loadingPromise = null;
            }
        })();
        
        return this._loadingPromise;
    }

    get(name) {
        return this.tables[name] || null;
    }

    has(name) {
        return !!this.tables[name];
    }

    getAllNames() {
        return Object.keys(this.tables).sort();
    }

    search(term) {
        if (!term) return this.getAllNames();
        const lower = term.toLowerCase();
        return this.getAllNames().filter(name => 
            name.toLowerCase().includes(lower)
        );
    }

    getCount() {
        return Object.keys(this.tables).length;
    }
}