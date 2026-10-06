// src/csound/CsoundEngine.js
//
// Единая точка работы с Csound.
// Все обращения к Csound-инстансу — только через этот класс.
//
// Версия: @csound/browser 6.18.7 (через CDN unpkg)

export const CSOUND_VERSION = '6.18.7';
export const CSOUND_CDN = `https://www.unpkg.com/@csound/browser@${CSOUND_VERSION}/dist/csound.js`;

export class CsoundEngine {
    constructor(system) {
        this.system = system;
        this.instance = null;
        this.state = 'idle';   // 'idle' | 'initializing' | 'running' | 'error'
        
        // Подписчики на события
        this._stateListeners = [];
        this._messageListeners = [];
        // ⭐ LED-каналы
        this._ledChannels = new Set();     // имена каналов
        this._ledValues = {};              // name → value
        this._ledPollInterval = null;      // setInterval id
    }

    // ============================================
    // ПОДПИСКА НА СОБЫТИЯ
    // ============================================

    /**
     * Подписка на изменение состояния.
     * callback(state, info)
     */
    onStateChange(cb) {
        this._stateListeners.push(cb);
        // Сразу сообщаем текущее состояние
        try { cb(this.state, null); } catch (e) { console.error(e); }
    }

    /**
     * Подписка на сообщения от Csound.
     * callback(text, level)  // level: 'info' | 'error'
     */
    onMessage(cb) {
        this._messageListeners.push(cb);
    }

    _setState(state, info = null) {
        if (this.state === state) return;
        this.state = state;
        //console.log(`[CsoundEngine] state → ${state}`, info || '');
        this._stateListeners.forEach(cb => {
            try { cb(state, info); } catch (e) { console.error(e); }
        });
    }

    _emitMessage(text, level = 'info') {
        const msg = String(text).trim();
        if (!msg) return;
        
        if (level === 'error') console.error('[Csound]', msg);
        else if (level === 'warn') console.warn('[Csound]', msg);
        //else console.log('[Csound]', msg);
        
        this._messageListeners.forEach(cb => {
            try { cb(msg, level); } catch (e) { console.error(e); }
        });
    }

    // ============================================
    // ЖИЗНЕННЫЙ ЦИКЛ
    // ============================================

    async init() {
        if (this.state === 'initializing') {
            console.warn('[CsoundEngine] Already initializing');
            return false;
        }
        if (this.state === 'running') {
            console.warn('[CsoundEngine] Already running');
            return true;
        }
        
        this._setState('initializing');
        
        try {
            // Cleanup старого инстанса, если был
            await this._destroyInstance();
            
            // Импорт и создание
            //console.log(`[CsoundEngine] Loading Csound ${CSOUND_VERSION} from CDN...`);
            const { Csound } = await import(/* @vite-ignore */ CSOUND_CDN);
            
            //console.log('[CsoundEngine] Creating instance...');
            this.instance = await Csound();
            //console.log('[CsoundEngine] Instance:', this.instance.name || '(unnamed)');
            // ⭐ Для обратной совместимости со старым кодом (Knob, Slider)
            window.csound = this.instance;
            
            // Подписка на сообщения Csound
            this._attachCsoundListeners();
            
            // Настройка
            //console.log('[CsoundEngine] Setting options...');
            await this.instance.setOption('-odac');
            //await this.instance.setOption('-d');
            //await this.instance.setOption('-m16');
            
            // Генерация ORC
            //console.log('[CsoundEngine] Generating ORC...');
            const orc = await this.system.csoundGen.generateOrc();
            //console.log(`[CsoundEngine] ORC length: ${orc.length} chars`);
            
            // Компиляция
            //console.log('[CsoundEngine] Compiling ORC...');
            const result = await this.instance.compileOrc(orc);
            //console.log('[CsoundEngine] compileOrc result:', result);
            
            if (result !== 0) {
                throw new Error(`ORC compilation failed (code ${result}). Check console for Csound messages.`);
            }
            
            // ⭐ Читаем score, чтобы запустить инструменты i1, i2, i3
            //console.log('[CsoundEngine] Reading score...');
            const sco = 'i1 0 [60*60*24*7]\ni2 0 [60*60*24*7]\ni3 0 [60*60*24*7]';
            await this.instance.readScore(sco);
            
            // Запуск
            //console.log('[CsoundEngine] Starting audio...');
            await this.instance.start();
            //console.log('[CsoundEngine] ✓ Started');
            
            this._setState('running');

            // ⭐ Resync control-каналов при первом запуске
            await this._resyncAllControls();
            
            // ⭐ Перезапускаем поллинг LED после recompile
            if (this._ledChannels.size > 0) {
                if (this._ledPollInterval) {
                    clearInterval(this._ledPollInterval);
                    this._ledPollInterval = null;
                }
                this._ensureLedPolling();
            }


            return true;
            
        } catch (error) {
            console.error('[CsoundEngine] Init error:', error);
            this._emitMessage(error.message || String(error), 'error');
            this.instance = null;
            this._setState('error', error.message);
            return false;
        }
    }

    async stop() {
        if (this.state === 'idle') {
            //console.log('[CsoundEngine] Already stopped');
            return;
        }
        
        //console.log('[CsoundEngine] Stopping...');
        await this._destroyInstance();
        this._setState('idle');
    }

    async _destroyInstance() {
        if (!this.instance) return;
        
        try {
            // Пробуем полное уничтожение
            if (typeof this.instance.terminateInstance === 'function') {
                await this.instance.terminateInstance();
            } else if (typeof this.instance.reset === 'function') {
                await this.instance.reset();
            }
        } catch (e) {
            console.warn('[CsoundEngine] Destroy error:', e);
        }
        
        // Обнуляем window.csound для старого кода (Knob, Slider)
        window.csound = null;
        this.instance = null;
    }

    // ============================================
    // ГОРЯЧАЯ ЗАМЕНА ORC
    // ============================================

    async recompile() {
        if (this.state !== 'running' || !this.instance) {
            return this.init();
        }
        
        console.log('[CsoundEngine] Recompiling via reset + compileOrc...');
        const t0 = performance.now();
        
        try {
            // 1. Сбросить состояние (инстанс остаётся живой)
            await this.instance.reset();
            
            // 2. Заново выставить опции (после reset они сброшены)
            await this.instance.setOption('-odac');
            await this.instance.setOption('-d');
            await this.instance.setOption('-m16');
            
            // 3. Сгенерировать ORC
            const orc = await this.system.csoundGen.generateOrc();
            
            // 4. Компилировать
            const rc = await this.instance.compileOrc(orc);
            if (rc !== 0) throw new Error(`compileOrc failed: ${rc}`);
            
            // 5. Score
            const sco = 'i1 0 [60*60*24*7]\ni2 0 [60*60*24*7]\ni3 0 [60*60*24*7]';
            const rs = await this.instance.readScore(sco);
            if (rs !== 0) throw new Error(`readScore failed: ${rs}`);
            
            // 6. Start
            const st = await this.instance.start();
            if (st !== 0) throw new Error(`start failed: ${st}`);
            
            // 7. ⭐ Resync control-каналов
            await this._resyncAllControls();
            
            // 8. Перезапуск поллинга LED
            if (this._ledChannels.size > 0) {
                if (this._ledPollInterval) {
                    clearInterval(this._ledPollInterval);
                    this._ledPollInterval = null;
                }
                this._ensureLedPolling();
            }
            
            const dt = Math.round(performance.now() - t0);
            console.log(`[CsoundEngine] ✓ Recompiled in ${dt}ms`);
            return true;
            
        } catch (e) {
            console.error('[CsoundEngine] recompile via reset failed:', e);
            console.log('[CsoundEngine] Falling back to full restart...');
            await this.stop();
            return this.init();
        }
    }

    /**
     * Переслать текущие значения всех control-каналов в Csound.
     * Нужно после recompile, потому что новый ORC видит каналы как 0.
     */
    async _resyncAllControls() {
        if (!this.isReady()) return;
        const system = this.system;
        if (!system?.components) return;
        
        const tasks = [];
        let count = 0;
        
        for (const panel of system.components) {
            if (panel.constructor.name !== 'Panel') continue;
            if (!panel.components) continue;
            
            for (const comp of panel.components) {
                if (!comp.csoundChannel) continue;
                
                const value = this._getControlValue(comp);
                tasks.push(
                    this.setChannel(comp.csoundChannel, value)
                        .then(() => { count++; })
                        .catch(e => console.warn(`[CsoundEngine] resync failed ${comp.csoundChannel}:`, e))
                );
            }
        }
        
        await Promise.all(tasks);
        console.log(`[CsoundEngine] 🔄 Resynced ${count} control(s)`);
    }

    /**
     * Достать текущее значение компонента в виде, который понимает Csound.
     */
    _getControlValue(comp) {
        const type = comp.constructor.name;
        
        // Если у компонента есть свой getValue — используем его
        if (typeof comp.getValue === 'function') {
            return comp.getValue();
        }
        
        // По типу компонента
        switch (type) {
            case 'ButtonText':
                return comp.isActive ? 1 : 0;
            case 'ButtonRadio':
            case 'ButtonFlat':
            case 'ButtonIncDec':
            case 'PartSelector':
                return comp.selectedIndex ?? comp.currentIndex ?? comp.value ?? 0;
            case 'Knob':
            case 'Slider':
            case 'LevelShift':
                return comp.value ?? comp.currentValue ?? 0;
        }
        
        // Fallback
        return comp.value ?? comp.currentValue ?? comp.selectedIndex ?? 0;
    }



    // ============================================
    // API ДЛЯ UI / КОМПОНЕНТОВ
    // ============================================

    isReady() {
        return this.instance !== null &&
               typeof this.instance.inputMessage === 'function';
    }

    /**
     * Отправить ноту через instr 4 (offline rendering в шаблоне).
     */
    async sendNote(note, duration = -1, velocity = 0.7) {
        if (!this.isReady()) {
            //console.warn('[CsoundEngine] Not ready, cannot send note');
            return false;
        }
        const midiNote = typeof note === 'string'
            ? this._noteToMidi(note)
            : Math.round(note);
        
        await this.instance.inputMessage(`i4 0 ${duration} ${midiNote}`);
        return true;
    }

    async showCurrentOrc() {
        const orc = await this.system.csoundGen.generateOrc();
        console.log('\n' + '='.repeat(60));
        console.log('🎵 CURRENT ORC:');
        console.log('='.repeat(60));
        console.log(orc);
        console.log('='.repeat(60) + '\n');
        return orc;
    }


    /**
     * Отправить произвольную команду Csound.
     */
    async sendMessage(msg) {
        if (!this.isReady()) return false;
        await this.instance.inputMessage(msg);
        return true;
    }

    /**
     * Установить значение control-канала.
     */
    async setChannel(name, value) {
        if (!this.isReady()) return false;
        if (typeof this.instance.setControlChannel !== 'function') {
            //console.warn('[CsoundEngine] setControlChannel not available');
            return false;
        }
        await this.instance.setControlChannel(name, value);
        return true;
    }

    /**
     * Получить значение control-канала.
     */
    async getChannel(name) {
        if (!this.isReady()) return null;
        if (typeof this.instance.getControlChannel !== 'function') return null;
        return await this.instance.getControlChannel(name);
    }

    // LED
        // ⭐ Зарегистрировать LED-канал
    registerLedChannel(name) {
        if (!name) return;
        this._ledChannels.add(name);
        this._ensureLedPolling();
    }

    // ⭐ Убрать LED-канал
    unregisterLedChannel(name) {
        if (!name) return;
        this._ledChannels.delete(name);
        delete this._ledValues[name];
    }

    // ⭐ Очистить все LED-каналы
    clearLedChannels() {
        this._ledChannels.clear();
        this._ledValues = {};
    }

    // ⭐ Получить текущее значение
    getLedValue(name) {
        return this._ledValues[name] || 0;
    }

    // ⭐ Запустить поллинг (если ещё не запущен)
    _ensureLedPolling() {
        if (this._ledPollInterval) return;
        
        this._ledPollInterval = setInterval(async () => {
            if (this.state !== 'running' || !this.isReady()) return;
            if (this._ledChannels.size === 0) return;
            
            for (const name of this._ledChannels) {
                try {
                    const v = await this.getChannel(name);
                    if (v !== null && v !== undefined) {
                        this._ledValues[name] = typeof v === 'number' ? v : 0;
                    }
                } catch (e) {
                    // тихо игнорируем
                }
            }
        }, 50);   // 20 Hz
    }


    // ============================================
    // ВНУТРЕННЕЕ
    // ============================================

    _noteToMidi(name) {
        // 'A4' → 69, 'C4' → 60, 'C#4' → 61, 'Db4' → 61
        const m = String(name).match(/^([A-Ga-g])(#|b)?(-?\d+)$/);
        if (!m) return 60;
        const semis = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
        const letter = m[1].toUpperCase();
        let midi = semis[letter] + (parseInt(m[3]) + 1) * 12;
        if (m[2] === '#') midi++;
        if (m[2] === 'b') midi--;
        return midi;
    }

    /**
     * Подписка на сообщения Csound.
     * v6.18.7: EventEmitter (.on) + есть messageCallback() в некоторых сборках.
     */
    _attachCsoundListeners() {
        const c = this.instance;
        if (!c) return;
        
        // Вариант 1: EventEmitter API
        if (typeof c.on === 'function') {
            try {
                c.on('message', (msg) => this._emitMessage(msg, 'info'));
                //console.log('[CsoundEngine] Attached message listener via .on()');
                return;
            } catch (e) {
                console.warn('[CsoundEngine] .on() failed:', e);
            }
        }
        
        // Вариант 2: messageCallback
        if (typeof c.messageCallback === 'function') {
            try {
                c.messageCallback((msg) => this._emitMessage(msg, 'info'));
                console.log('[CsoundEngine] Attached message listener via .messageCallback()');
                return;
            } catch (e) {
                console.warn('[CsoundEngine] .messageCallback() failed:', e);
            }
        }
        
        // Вариант 3: setMessageCallback
        if (typeof c.setMessageCallback === 'function') {
            try {
                c.setMessageCallback((msg) => this._emitMessage(msg, 'info'));
                console.log('[CsoundEngine] Attached message listener via .setMessageCallback()');
                return;
            } catch (e) {
                console.warn('[CsoundEngine] .setMessageCallback() failed:', e);
            }
        }
        
        console.warn('[CsoundEngine] No message listener API found');
    }
}