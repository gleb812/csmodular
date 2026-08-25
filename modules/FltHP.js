// Автоматически сгенерированный модуль: FltHP
    // Исходный файл: FltHP.js
    // Версия: 208

    export const FltHPModule = {
        type: 'FltHP',
            typeID: 134,
    mode: [0],
    defaultParams: [60, 0, 0, 1],
        displayName: 'FltHP',
        gridHeight: 2,
        originalName: 'FltHP',
        tooltip: 'Filter Highpass',
        inputs: [0, 4],
        outputs: [11],
        components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 63,
                "y": 14,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "Pitch",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Knob",
                "id": "1",
                "x": 77,
                "y": 7,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "2",
                "x": 67,
                "y": 17,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextField",
                "id": "3",
                "x": 99,
                "y": 8,
                "width": 44,
                "referenceElementId": 5
        },
        {
                "componentType": "Knob",
                "id": "5",
                "x": 145,
                "y": 5,
                "infoFunc": 123,
                "size": "medium"
        },
        {
                "componentType": "Input",
                "id": "4",
                "x": 210,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "In",
                "ConnectorIndex": 0
        },
        {
                "componentType": "PartSelector",
                "id": "9",
                "x": 168,
                "y": 4,
                "width": 40,
                "height": 22,
                "imageCount": 6,
                "menuOffset": -32
        },
        {
                "componentType": "Output",
                "id": "11",
                "x": 240,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "ButtonText",
                "id": "10",
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
                "id": "8",
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
    