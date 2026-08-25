// Автоматически сгенерированный модуль: FltStatic
    // Исходный файл: FltStatic.js
    // Версия: 208

    export const FltStaticModule = {
        type: 'FltStatic',
            typeID: 54,
    defaultParams: [75, 0, 0, 1, 0],
        displayName: 'FltStatic',
        gridHeight: 3,
        originalName: 'FltStatic',
        tooltip: 'Filter Static',
        inputs: [23],
        outputs: [22],
        components: [
        {
                "componentType": "TextField",
                "id": "9",
                "x": 6,
                "y": 27,
                "width": 44,
                "referenceElementId": 10
        },
        {
                "componentType": "Knob",
                "id": "10",
                "x": 53,
                "y": 18,
                "infoFunc": 123,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "13",
                "x": 19,
                "y": 17,
                "text": "Freq",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonRadio",
                "id": "14",
                "x": 127,
                "y": 4,
                "buttonWidth": 18,
                "buttonCount": 3,
                "orientation": "horizontal",
                "labels": [
                        "LP",
                        "BP",
                        "HP"
                ]
        },
        {
                "componentType": "TextField",
                "id": "15",
                "x": 81,
                "y": 27,
                "width": 26,
                "referenceElementId": 16
        },
        {
                "componentType": "Knob",
                "id": "16",
                "x": 110,
                "y": 20,
                "infoFunc": 124,
                "size": "medium"
        },
        {
                "componentType": "ButtonText",
                "id": "17",
                "x": 136,
                "y": 29,
                "width": 18,
                "text": "GC"
        },
        {
                "componentType": "TextLabel",
                "id": "18",
                "x": 86,
                "y": 17,
                "text": "Res",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Graph",
                "id": "19",
                "x": 182,
                "y": 4,
                "width": 52,
                "height": 28
        },
        {
                "componentType": "Output",
                "id": "22",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Input",
                "id": "23",
                "x": 240,
                "y": 3,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "In",
                "ConnectorIndex": 0
        },
        {
                "componentType": "ButtonText",
                "id": "24",
                "x": 239,
                "y": 16,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Line",
                "id": "25",
                "x": 245,
                "y": 11,
                "length": 25,
                "orientation": "Vertical"
        }
]
    };
    