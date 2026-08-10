// Автоматически сгенерированный модуль: Constant
// Исходный файл: Constant.js
// Версия: 206

export const ConstantModule = {
    type: 'Constant',
        typeID: 43,
    defaultParams: [64, 0],
    displayName: 'Constant',
    gridHeight: 2,
    originalName: 'Constant',
    tooltip: 'Constant Value',
    components: [
        {
                "componentType": "Output",
                "id": "1",
                "x": 240,
                "y": 10,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 163,
                "y": 5,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextField",
                "id": "3",
                "x": 187,
                "y": 8,
                "width": 28,
                "referenceElementId": 2
        },
        {
                "componentType": "Line",
                "id": "0",
                "x": 206,
                "y": 15,
                "length": 40,
                "orientation": "Horizontal"
        },
        {
                "componentType": "ButtonFlat",
                "id": "5",
                "x": 54,
                "y": 14,
                "width": 23,
                "height": 12,
                "labels": [
                        "BiP",
                        "Uni"
                ]
        }
]
};
