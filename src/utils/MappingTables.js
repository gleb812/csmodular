// utils/MappingTables.js - ТОЛЬКО MIDI
export class MappingTables {
    constructor() {
        this.tables = new Map(); // name → data
        this.loading = new Map(); // name → promise
    }
    
    static instance = null;
    
    static getInstance() {
        if (!MappingTables.instance) {
            MappingTables.instance = new MappingTables();
        }
        return MappingTables.instance;
    }
    
    async loadTable(name) {
        // Если уже есть
        if (this.tables.has(name)) {
            return this.tables.get(name);
        }
        
        // Если уже грузится
        if (this.loading.has(name)) {
            return this.loading.get(name);
        }
        
        // Загружаем
        const loadPromise = this._loadTable(name);
        this.loading.set(name, loadPromise);
        
        try {
            const data = await loadPromise;
            this.tables.set(name, data);
            this.loading.delete(name);
            return data;
        } catch (error) {
            this.loading.delete(name);
            throw error;
        }
    }
    
    async _loadTable(name) {
        // Просто fetch из public/tables/
        const response = await fetch(`/tables/${name}.json`);
        if (!response.ok) {
            throw new Error(`Таблица "${name}" не найдена`);
        }
        return await response.json();
    }
}

export const mappingTables = MappingTables.getInstance();