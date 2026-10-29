// src/api/moduleStatusStore.js
//
// Статус модуля — baseline из .js (status: 'stable'|'passable'|'dev'|'broken').
// Default — 'dev'. Показывается ТОЛЬКО в DEV-режиме (Vite import.meta.env.DEV).

const VALID = ['stable', 'passable', 'dev', 'broken'];
const DEFAULT = 'dev';

export function getModuleStatus(moduleDef) {
    const raw = moduleDef?.status;
    return (typeof raw === 'string' && VALID.includes(raw)) ? raw : DEFAULT;
}

export function getStatusMeta(status) {
    switch (status) {
        case 'stable':   return { color: '#3ecf6e', label: 'OK' };              // зелёный
        case 'passable': return { color: '#8fdc6e', label: 'passable' };        // светло-зелёный
        case 'dev':      return { color: '#e8c547', label: 'under development' }; // жёлтый
        case 'broken':   return { color: '#e84a4a', label: 'broken' };          // красный
        default:         return { color: '#888',    label: 'unknown' };
    }
}

export const IS_DEV = (() => {
    try {
        return typeof import.meta !== 'undefined' &&
               import.meta.env?.DEV === true;
    } catch { return false; }
})();