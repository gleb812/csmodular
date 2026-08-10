// Автоматически сгенерированный модуль: LevAmp
// Исходный файл: LevAmp.js
// Версия: 206

export const LevAmpModule = {
    type: 'LevAmp',
        typeID: 81,
    defaultParams: [64, 0],
    displayName: 'LevAmp',
    gridHeight: 2,
    originalName: 'LevAmp',
    tooltip: 'Level Amplifier',
    components: [
        {
                "componentType": "Knob",
                "id": "0",
                "x": 140,
                "y": 5,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Input",
                "id": "1",
                "x": 210,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "3",
                "x": 240,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextLabel",
                "id": "2",
                "x": 215,
                "y": 6,
                "text": "↑",
                "fontSize": 19,
                "color": "#ffffff",
                "align": "center",
                "valign": "middle",
                "originalType": "Symbol",
                "symbolType": "Amplifier",
                "width": 102
        },
        {
                "componentType": "TextField",
                "id": "5",
                "x": 164,
                "y": 10,
                "width": 32,
                "referenceElementId": 0
        },
        {
                "componentType": "Line",
                "id": "4",
                "x": 180,
                "y": 5,
                "length": 52,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "6",
                "x": 180,
                "y": 5,
                "length": 10,
                "orientation": "Vertical"
        },
        {
                "componentType": "ButtonFlat",
                "id": "7",
                "x": 54,
                "y": 14,
                "width": 23,
                "height": 12,
                "labels": [
                        "Lin",
                        "dB"
                ]
        }
]
};
