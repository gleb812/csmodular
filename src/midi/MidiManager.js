// src/midi/MidiManager.js
//
// Приём MIDI через Web MIDI API (браузер).
// Пока НИЧЕГО не отправляет в Csound — только:
//   - запрашивает доступ
//   - логирует входящие сообщения
//   - хранит последние N событий (для UI/дебага)
//   - сообщает подписчикам о подключении/отключении устройств и о каждом сообщении
//
// Требует secure context (https:// или http://localhost).

const MAX_HISTORY = 50;

export class MidiManager {
    constructor() {
        this.access = null;              // MIDIAccess | null
        this.state = 'idle';             // 'idle' | 'requesting' | 'ready' | 'denied' | 'unsupported'
        this.inputs = new Map();         // id -> MIDIInput
        this.history = [];               // [{ time, status, data1, data2, inputName, raw }]

        this._stateListeners = [];
        this._messageListeners = [];
        this._lastMessage = null;        // последнее сообщение (для UI)
        this._lastMessageTime = 0;
        this._sendListeners = [];
        this._midiOut = null;            // MIDIOutput | null
        this.outputs = new Map();        // id -> MIDIOutput
    }

    // ---------- подписки ----------

    onStateChange(cb) {
        this._stateListeners.push(cb);
        try { cb(this.state, this.getInfo()); } catch (e) { console.error(e); }
    }

    onMessage(cb) {
        this._messageListeners.push(cb);
    }

    // --- новые методы (рядом с onMessage) ---

    onSend(cb) {
        this._sendListeners.push(cb);
    }

    /**
     * Отправить MIDI-сообщение.
     * Лампочка OUT мигает ВСЕГДА (даже если физического out нет).
     * @returns {boolean} true, если сообщение ушло в реальное устройство
     */
    send(status, data1, data2) {
        const evt = {
            time: performance.now(),
            status, data1, data2,
            inputName: this._midiOut?.name || '(no out)',
            raw: [status, data1, data2],
        };

        // UI-подписчики (лампочка MIDI OUT) — всегда
        this._sendListeners.forEach(cb => {
            try { cb(evt); } catch (e) { console.error(e); }
        });

        // Реальная отправка, если есть устройство
        if (!this._midiOut) return false;
        try {
            this._midiOut.send([status, data1, data2], performance.now());
            return true;
        } catch (err) {
            console.warn('[MidiManager] send failed:', err);
            return false;
        }
    }

    _setState(state) {
        if (this.state === state) return;
        this.state = state;
        console.log(`[MidiManager] state → ${state}`, this.getInfo());
        this._stateListeners.forEach(cb => {
            try { cb(state, this.getInfo()); } catch (e) { console.error(e); }
        });
    }

    _emitMessage(evt) {
        this._messageListeners.forEach(cb => {
            try { cb(evt); } catch (e) { console.error(e); }
        });
    }

    // ---------- публичный API ----------

    isSupported() {
        return typeof navigator !== 'undefined' && !!navigator.requestMIDIAccess;
    }

    getInfo() {
        // --- в getInfo() добавь поля: ---
        return {
            state: this.state,
            inputCount: this.inputs.size,
            inputNames: [...this.inputs.values()].map(i => i.name || '(unnamed)'),
            outputCount: this.outputs.size,
            outputNames: [...this.outputs.values()].map(o => o.name || '(unnamed)'),
            hasOutput: !!this._midiOut,
            lastMessage: this._lastMessage,
            lastMessageTime: this._lastMessageTime,
        };
    }

    /**
     * Запросить доступ к MIDI. Должно вызываться из обработчика клика
     * (иначе Chrome может тихо отклонить запрос).
     * @param {{ sysex?: boolean }} opts
     * @returns {Promise<boolean>}
     */
    async init(opts = {}) {
        if (this.state === 'requesting' || this.state === 'ready') {
            return this.state === 'ready';
        }

        if (!this.isSupported()) {
            console.warn('[MidiManager] Web MIDI API is not supported in this browser');
            this._setState('unsupported');
            return false;
        }

        this._setState('requesting');

        try {
            this.access = await navigator.requestMIDIAccess({ sysex: !!opts.sysex });
            console.log('[MidiManager] ✓ MIDI access granted');

            // Подписка на изменение списка устройств
            this.access.onstatechange = (e) => this._onDeviceStateChange(e);

            // Подхватить уже подключённые
            this._refreshInputs();

            this._setState('ready');
            return true;
        } catch (err) {
            console.error('[MidiManager] MIDI access denied:', err);
            this._setState('denied');
            return false;
        }
    }

    /**
     * Отключить все устройства и закрыть доступ.
     */
    dispose() {
        for (const input of this.inputs.values()) {
            try { input.onmidimessage = null; } catch (e) {}
        }
        this.inputs.clear();
        this.outputs.clear();
        this._midiOut = null;
        if (this.access) {
            try { this.access.onstatechange = null; } catch (e) {}
        }
        this.access = null;
        this._setState('idle');
    }

    /**
     * Последние N сообщений (для дебага).
     */
    getHistory() {
        return this.history.slice();
    }

    clearHistory() {
        this.history = [];
    }

    // ---------- внутреннее ----------

    _onDeviceStateChange(e) {
        const port = e.port;
        console.log(`[MidiManager] device ${port.type} ${port.state}: ${port.name || port.id}`);
        this._refreshInputs();
        this._setState(this.inputs.size > 0 ? 'ready' : 'ready'); // state остаётся ready
        // ⭐ отдельно сообщим подписчикам, что список изменился
        this._stateListeners.forEach(cb => {
            try { cb(this.state, this.getInfo()); } catch (err) { console.error(err); }
        });
    }

    // --- замени _refreshInputs() полностью на: ---

    _refreshInputs() {
        if (!this.access) return;

        // ---- INPUTS ----
        const seenIn = new Set();
        for (const input of this.access.inputs.values()) {
            seenIn.add(input.id);
            if (this.inputs.has(input.id)) continue;

            console.log(`[MidiManager] 🎹 input connected: ${input.name || input.id}`);
            input.onmidimessage = (evt) => this._onMidiMessage(evt, input);
            this.inputs.set(input.id, input);
        }
        for (const [id, input] of this.inputs) {
            if (!seenIn.has(id)) {
                console.log(`[MidiManager] 🔌 input disconnected: ${input.name || id}`);
                try { input.onmidimessage = null; } catch (e) {}
                this.inputs.delete(id);
            }
        }

        // ---- OUTPUTS ----
        const seenOut = new Set();
        for (const output of this.access.outputs.values()) {
            seenOut.add(output.id);
            if (!this.outputs.has(output.id)) {
                console.log(`[MidiManager] 🎹 output connected: ${output.name || output.id}`);
                this.outputs.set(output.id, output);
            }
        }
        for (const [id, output] of this.outputs) {
            if (!seenOut.has(id)) {
                console.log(`[MidiManager] 🔌 output disconnected: ${output.name || id}`);
                this.outputs.delete(id);
                if (this._midiOut?.id === id) this._midiOut = null;
            }
        }

        // Автовыбор первого out-устройства (если ещё не выбран или пропал)
        if (!this._midiOut || !this.outputs.has(this._midiOut.id)) {
            const first = this.outputs.values().next().value || null;
            this._midiOut = first;
            if (first) console.log(`[MidiManager] ↳ using output: ${first.name || first.id}`);
        }
    }

    _onMidiMessage(event, input) {
        const data = event.data;
        if (!data || data.length < 1) return;

        const status = data[0];
        const data1 = data.length > 1 ? data[1] : 0;
        const data2 = data.length > 2 ? data[2] : 0;

        const evt = {
            time: performance.now(),
            status,
            data1,
            data2,
            inputName: input?.name || input?.id || '(unknown)',
            raw: Array.from(data),
        };

        // История (ограниченная)
        this.history.push(evt);
        if (this.history.length > MAX_HISTORY) this.history.shift();

        this._lastMessage = evt;
        this._lastMessageTime = performance.now();

        this._emitMessage(evt);
    }

    /**
     * Человекочитаемое описание для лога.
     */
    _describe(status, data1, data2) {
        const type = status & 0xf0;
        const channel = (status & 0x0f) + 1;
        switch (type) {
            case 0x90: return data2 > 0
                ? `Note ON  ch${channel} note=${data1} vel=${data2}`
                : `Note OFF ch${channel} note=${data1} (vel0)`;
            case 0x80: return `Note OFF ch${channel} note=${data1} vel=${data2}`;
            case 0xb0: return `CC       ch${channel} cc=${data1} value=${data2}`;
            case 0xe0: return `PitchBend ch${channel} value=${(data2 << 7) | data1}`;
            case 0xc0: return `ProgChg  ch${channel} program=${data1}`;
            case 0xd0: return `ChanPress ch${channel} pressure=${data1}`;
            case 0xa0: return `PolyPress ch${channel} note=${data1} pressure=${data2}`;
            case 0xf0:
                if (status === 0xf8) return 'Clock';
                if (status === 0xfa) return 'Start';
                if (status === 0xfb) return 'Continue';
                if (status === 0xfc) return 'Stop';
                return `System   0x${status.toString(16)}`;
            default:   return `Unknown  0x${status.toString(16)}`;
        }
    }
}