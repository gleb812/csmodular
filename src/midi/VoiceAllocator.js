// src/midi/VoiceAllocator.js
//
// Voice allocation для полифонии / унисона.
// НИЧЕГО не знает про Csound и DOM.
// Просто держит состояние голосов и нотифицирует подписчиков.
//
// Этюд: NUM_VOICES = 8 константой, mode = 'poly' по умолчанию.
// Позже — настройки из UI.

const NUM_VOICES = 8;   // ⭐ константа, потом на панель

export class VoiceAllocator {
    constructor({ numVoices = NUM_VOICES, mode = 'poly', csoundEngine = null } = {}) {
        this.numVoices = numVoices;
        this.mode = mode;   // 'poly' | 'unison'
        this.csoundEngine = csoundEngine;  

        // Голоса: id, note (null = свободен), startedAt (для вытеснения), active
        this.voices = Array.from({ length: numVoices }, (_, id) => ({
            id,
            note: null,
            startedAt: 0,
            active: false,
        }));

        this._listeners = [];
        this._onChange();
    }

    // ---------- подписка ----------

    onChange(cb) {
        this._listeners.push(cb);
        try { cb(this.getVoices(), this.mode); } catch (e) { console.error(e); }
    }

    _onChange() {
        const snapshot = this.getVoices();
        this._listeners.forEach(cb => {
            try { cb(snapshot, this.mode); } catch (e) { console.error(e); }
        });
    }

    // ---------- публичный API ----------

    getVoices() {
        // Возвращаем копию, чтобы снаружи не мутировали
        return this.voices.map(v => ({ ...v }));
    }

    getMode() {
        return this.mode;
    }

    setMode(mode) {
        if (mode !== 'poly' && mode !== 'unison') return;
        if (this.mode === mode) return;
        this.mode = mode;
        this._resetAll();
        this._onChange();
    }

    setNumVoices(n) {
        const next = Math.max(1, Math.min(8, parseInt(n, 10) || 8));
        if (next === this.numVoices) return;

        this.numVoices = next;

        // Пересоздаём массив голосов (сбрасываем активные)
        this.voices = Array.from({ length: next }, (_, id) => ({
            id,
            note: null,
            startedAt: 0,
            active: false,
        }));

        this._onChange();
    }

    // ---------- MIDI ----------

    /**
     * Принять MIDI-событие.
     * Сейчас обрабатываем только note-on / note-off.
     * Всё остальное игнорируем (CC, clock, pitch-bend и т.п.).
     */
    handleMidiMessage(evt) {
        if (!evt) return;
        const type = evt.status & 0xF0;

        if (type === 0x90 && evt.data2 > 0) {
            this.noteOn(evt.data1, evt.data2);
        } else if (type === 0x80 || (type === 0x90 && evt.data2 === 0)) {
            this.noteOff(evt.data1);
        }
        // остальное — мимо
    }

    noteOn(note, velocity) {
        const events = [];   // ⭐ что отправить в Csound
        if (this.mode === 'unison') {
            this._noteOnUnison(note, velocity, events);
        } else {
            this._noteOnPoly(note, velocity, events);
        }
        this._sendEvents(events);
        this._onChange();
    }

    noteOff(note) {
        const events = [];
        if (this.mode === 'unison') {
            this._noteOffUnison(note, events);
        } else {
            this._noteOffPoly(note, events);
        }
        this._sendEvents(events);
        this._onChange();
    }

    // ---------- poly ----------

    _noteOnPoly(note, velocity, events) {
        const now = performance.now();

        // 1. Retrigger: нота уже звучит?
        const existing = this.voices.find(v => v.active && v.note === note);
        if (existing) {
            existing.startedAt = now;
            events.push({ type: 'on', voiceId: existing.id, note, vel: velocity });
            return;
        }

        // 2. Свободный голос
        let target = this.voices.find(v => !v.active);

        // 3. Все заняты — вытесняем старейший
        if (!target) {
            target = this.voices.reduce((oldest, v) =>
                v.startedAt < oldest.startedAt ? v : oldest
            );
            // ⭐ старому голосу — gate=0 (до того, как займём его новой нотой)
            events.push({ type: 'off', voiceId: target.id });
        }

        target.note = note;
        target.startedAt = now;
        target.active = true;
        events.push({ type: 'on', voiceId: target.id, note, vel: velocity });
    }

    _noteOffPoly(note, events) {
        for (const v of this.voices) {
            if (v.active && v.note === note) {
                v.note = null;
                v.active = false;
                v.startedAt = 0;
                events.push({ type: 'off', voiceId: v.id });
            }
        }
    }

    // ---------- unison ----------

    _noteOnUnison(note, velocity, events) {
        const now = performance.now();
        for (const v of this.voices) {
            v.note = note;
            v.startedAt = now;
            v.active = true;
            events.push({ type: 'on', voiceId: v.id, note, vel: velocity });
        }
    }

    _noteOffUnison(note, events) {
        const current = this.voices.find(v => v.active)?.note;
        if (current === note) {
            for (const v of this.voices) {
                if (v.active) events.push({ type: 'off', voiceId: v.id });
            }
            this._resetAll();
        }
    }

    // ---------- утилиты ----------

    _resetAll() {
        for (const v of this.voices) {
            v.note = null;
            v.startedAt = 0;
            v.active = false;
        }
    }

    // ---------- отправка в Csound ----------

    _sendEvents(events) {
        if (!this.csoundEngine || events.length === 0) return;
        for (const e of events) {
            if (e.type === 'on') {
                // ⭐ порядок важен: pch → vel → gate=1
                this.csoundEngine.setChannel(`pch_${e.voiceId}`, e.note);
                this.csoundEngine.setChannel(`vel_${e.voiceId}`, (e.vel ?? 127) / 127);
                this.csoundEngine.setChannel(`gate_${e.voiceId}`, 1);
            } else {
                this.csoundEngine.setChannel(`gate_${e.voiceId}`, 0);
            }
        }
    }

}