// Автоматически сгенерированный модуль: LevConv
// Исходный файл: LevConv.js
// Версия: 210

export const LevConvModule = {
    type: 'LevConv',
        typeID: 157,
    defaultParams: [4, 0],
    displayName: 'LevConv',
    gridHeight: 2,
    originalName: 'LevConv',
    tooltip: 'Level Converter',
    components: [
        {
                "componentType": "LevelShift",
                "id": "1",
                "x": 223,
                "y": 10
        },
        {
                "componentType": "Input",
                "id": "4",
                "x": 210,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "6",
                "x": 240,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Line",
                "id": "2",
                "x": 215,
                "y": 16,
                "length": 32,
                "orientation": "Horizontal"
        },
        {
                "componentType": "ButtonRadio",
                "id": "0",
                "x": 96,
                "y": 12,
                "buttonWidth": 25,
                "buttonCount": 3,
                "orientation": "horizontal",
                "labels": [
                        "BiPol",
                        "Pos",
                        "Neg"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "3",
                "x": 105,
                "y": 2,
                "text": "In signal type",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
