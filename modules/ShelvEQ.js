// Автоматически сгенерированный модуль: ShelvEQ
// Исходный файл: ShelvEQ.js
// Версия: 208

export const ShelvEQModule = {
    type: 'ShelvEQ',
        typeID: 0,
    displayName: 'ShelvEQ',
    gridHeight: 4,
    originalName: 'ShelvEQ',
    tooltip: 'Shelving equalizer',
    components: [
        {
                "componentType": "Knob",
                "id": "1",
                "x": 65,
                "y": 34,
                "infoFunc": 38,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 112,
                "y": 34,
                "infoFunc": 36,
                "size": "medium"
        },
        {
                "componentType": "TextField",
                "id": "3",
                "x": 43,
                "y": 17,
                "width": 44,
                "referenceElementId": 1
        },
        {
                "componentType": "Graph",
                "id": "4",
                "x": 181,
                "y": 4,
                "width": 52,
                "height": 28
        },
        {
                "componentType": "TextField",
                "id": "5",
                "x": 92,
                "y": 17,
                "width": 44,
                "referenceElementId": 2
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 44,
                "y": 34,
                "text": "Freq",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 93,
                "y": 34,
                "text": "Gain",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "11",
                "x": 239,
                "y": 42,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "10",
                "x": 239,
                "y": 6,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "13",
                "x": 238,
                "y": 24,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Line",
                "id": "12",
                "x": 245,
                "y": 12,
                "length": 31,
                "orientation": "Vertical"
        },
        {
                "componentType": "Knob",
                "id": "15",
                "x": 203,
                "y": 34,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "14",
                "x": 177,
                "y": 40,
                "text": "Level",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "MiniVU",
                "id": "17",
                "x": 229,
                "y": 39,
                "width": 6,
                "height": 15,
                "orientation": "vertical"
        },
        {
                "componentType": "ButtonRadio",
                "id": "0",
                "x": 151,
                "y": 17,
                "buttonWidth": 17,
                "buttonCount": 2,
                "orientation": "vertical",
                "labels": [
                        "Hi",
                        "Lo"
                ]
        }
]
};
