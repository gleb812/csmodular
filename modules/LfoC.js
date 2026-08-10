// Автоматически сгенерированный модуль: LfoC
// Исходный файл: LfoC.js
// Версия: 206

export const LfoCModule = {
    type: 'LfoC',
        typeID: 24,
    mode: [0],
    defaultParams: [64, 0, 4, 1, 1],
    displayName: 'LfoC',
    gridHeight: 2,
    originalName: 'LfoC',
    tooltip: 'LFO C',
    components: [
        {
                "componentType": "Knob",
                "id": "3",
                "x": 165,
                "y": 5,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "PartSelector",
                "id": "6",
                "x": 189,
                "y": 4,
                "width": 31,
                "height": 22,
                "imageCount": 8,
                "menuOffset": 0
        },
        {
                "componentType": "Output",
                "id": "7",
                "x": 239,
                "y": 15,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "8",
                "x": 238,
                "y": 3,
                "width": 13,
                "text": "M"
        },
        {
                "componentType": "Input",
                "id": "9",
                "x": 4,
                "y": 15,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "0",
                "x": 18,
                "y": 17,
                "text": "Rate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "4",
                "x": 77,
                "y": 9,
                "width": 42,
                "height": 12,
                "labels": [
                        "Rate Sub",
                        "Rate Lo",
                        "Rate Hi",
                        "BPM",
                        "Clk"
                ]
        },
        {
                "componentType": "TextField",
                "id": "2",
                "x": 122,
                "y": 8,
                "width": 40,
                "referenceElementId": 3
        },
        {
                "componentType": "LevelShift",
                "id": "1",
                "x": 222,
                "y": 14
        },
        {
                "componentType": "LED",
                "id": "5",
                "x": 226,
                "y": 4
        },
        {
                "componentType": "ButtonFlat",
                "id": "10",
                "x": 42,
                "y": 14,
                "width": 30,
                "height": 12,
                "labels": [
                        "Poly",
                        "Mono"
                ]
        }
]
};
