// Автоматически сгенерированный модуль: FltLP
// Исходный файл: FltLP.js
// Версия: 208

export const FltLPModule = {
    type: 'FltLP',
        typeID: 87,
    mode: [0],
    defaultParams: [75, 0, 0, 1],
    displayName: 'FltLP',
    gridHeight: 2,
    originalName: 'FltLP',
    tooltip: 'Filter Lowpass',
    components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 63,
                "y": 14,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "0",
                "x": 77,
                "y": 7,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "3",
                "x": 67,
                "y": 17,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextField",
                "id": "2",
                "x": 99,
                "y": 8,
                "width": 44,
                "referenceElementId": 4
        },
        {
                "componentType": "Knob",
                "id": "4",
                "x": 145,
                "y": 5,
                "infoFunc": 123,
                "size": "medium"
        },
        {
                "componentType": "Input",
                "id": "5",
                "x": 210,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "PartSelector",
                "id": "8",
                "x": 168,
                "y": 4,
                "width": 40,
                "height": 22,
                "imageCount": 6,
                "menuOffset": -32
        },
        {
                "componentType": "Output",
                "id": "10",
                "x": 240,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "11",
                "x": 224,
                "y": 10,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "ButtonFlat",
                "id": "6",
                "x": 24,
                "y": 14,
                "width": 26,
                "height": 12,
                "labels": [
                        "Off",
                        "25%",
                        "50%",
                        "75%",
                        "100%"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 4,
                "y": 17,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Graph",
                "id": "9",
                "x": 168,
                "y": 4,
                "width": 32,
                "height": 22
        },
        {
                "componentType": "Line",
                "id": "12",
                "x": 215,
                "y": 16,
                "length": 32,
                "orientation": "Horizontal"
        }
]
};
