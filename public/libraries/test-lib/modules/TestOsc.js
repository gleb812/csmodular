// public/libraries/test-lib/modules/TestOsc.js
// Тестовый модуль для проверки libraryStore. Минимальный, без вариантов.

export const TestOscModule = {
    type: 'TestOsc',
    displayName: 'Test Osc',
    category: 'osc',          // ⭐ обязательное поле, из CATEGORIES
    status: 'stable',
    gridHeight: 2,
    defaultParams: [0],
    params: [1],
    inputs: [],
    outputs: [2],
    components: [
        {
            componentType: 'Knob',
            id: '1',
            x: 18,
            y: 18,
            size: 'medium',
            min: 0,
            max: 127,
            defaultValue: 64,
        },
        {
            componentType: 'Output',
            id: '2',
            x: 240,
            y: 20,
            jackType: 'audio',
            bandwidth: 'dynamic',
        },
    ],
};