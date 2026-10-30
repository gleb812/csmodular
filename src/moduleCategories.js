// src/moduleCategories.js
//
// Единственный источник правды о категориях NM2-модулей.
// Используется ContextMenu (группировка) и Minimap (цвета).

export const ALL_NM2 = {
    'In/Out': ['In2', 'Out2', 'In4', 'Out4', 'Device', 'FxIn', 'Keyboard', 'MonoKey', 'Name', 'NoteDet', 'Status'],
    'Logic':  ['8Counter', 'ADConv', 'BinCounter', 'ClkDiv', 'DAConv', 'Delay', 'FlipFlop', 'Gate', 'Invert', 'Pulse'],
    'Osc':    ['DXRouter', 'Driver', 'DrumSynth', 'MetNoise', 'Noise', 'Operator', 'OscA', 'OscB', 'OscC', 'OscD', 'OscDual', 'OscMaster', 'OscNoise', 'OscPM', 'OscPerc', 'OscShpA', 'OscShpB', 'OscString', 'Resonator'],
    'FX':     ['Compressor', 'Digitizer', 'Flanger', 'FreqShift', 'PShift', 'Phaser', 'Reverb', 'Scratch', 'StChorus'],
    'Switch': ['Mux18', 'Mux81', 'Mux81X', 'SH', 'Sw12', 'Sw12M', 'Sw14', 'Sw18', 'Sw21', 'Sw21M', 'Sw41', 'Sw81', 'SwOnOffM', 'SwOnOffT', 'T&H', 'ValSw1-2', 'ValSw2-1', 'WindSw'],
    'Mixer':  ['Fade12', 'Fade21', 'Mix11A', 'Mix11S', 'Mix21A', 'Mix21B', 'Mix41A', 'Mix41B', 'Mix41C', 'Mix41S', 'Mix81A', 'Mix81B', 'MixFader', 'MixStereo', 'Pan', 'X-Fade'],
    'Env':    ['EnvADDSR', 'EnvADR', 'EnvADSR', 'EnvAHD', 'EnvD', 'EnvH', 'EnvMulti', 'ModADSR', 'ModAHD'],
    'Note':   ['Glide', 'KeyQuant', 'LevScaler', 'NoteQuant', 'NoteScaler', 'PartQuant', 'PitchTrack', 'ZeroCnt'],
    'LFO':    ['ClkGen', 'LfoA', 'LfoB', 'LfoC', 'LfoShpA'],
    'Shaper': ['Clip', 'Overdrive', 'Rect', 'Saturate', 'ShpExp', 'ShpStatic', 'WaveWrap'],
    'Filter': ['Eq2Band', 'Eq3Band', 'EqPeak', 'FltClassic', 'FltComb', 'FltHP', 'FltLP', 'FltMulti', 'FltNord', 'FltPhase', 'FltStatic', 'FltVoice', 'Vocoder', 'WahWah'],
    'Level':  ['CompLev', 'CompSig', 'ConstSwM', 'ConstSwT', 'Constant', 'EnvFollow', 'LevAdd', 'LevAmp', 'LevConv', 'LevMod', 'LevMult', 'MinMax', 'ModAmt', 'NoiseGate'],
    'MIDI':   ['Automate', 'CtrlRcv', 'CtrlSend', 'NoteRcv', 'NoteSend', 'NoteZone', 'PCSend'],
    'Seq':    ['SeqCtr', 'SeqEvent', 'SeqLev', 'SeqNote', 'SeqVal'],
    'Delay':  ['DelayA', 'DelayB', 'DelayDual', 'DelayQuad', 'DlyClock', 'DlyEight', 'DlyShiftReg', 'DlySingleA', 'DlySingleB', 'DlyStereo'],
    'Rnd':    ['RandomA', 'RandomB', 'RndClkA', 'RndClkB', 'RndPattern', 'RndTrig'],
    'Test':   ['Blue2Red', 'Red2Blue'],
};

export const MODULE_GROUP_OF = (() => {
    const map = {};
    for (const [group, mods] of Object.entries(ALL_NM2)) {
        for (const m of mods) map[m] = group;
    }
    return map;
})();