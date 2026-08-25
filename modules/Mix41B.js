// Автоматически сгенерированный модуль: Mix41B
    // Исходный файл: Mix41B.js
    // Версия: 206

    export const Mix41BModule = {
        type: 'Mix41B',
            typeID: 19,
    defaultParams: [100, 100, 100, 100, 0],
        displayName: 'Mix4-1B',
        gridHeight: 2,
        originalName: 'Mix4-1B',
        tooltip: 'Mixer 4-1 B',
        inputs: [1, 4, 7, 10, 15],
        outputs: [13],
        components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 76,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In1",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 90,
                "y": 5,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "3",
                "x": 85,
                "y": 4,
                "text": "1",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "4",
                "x": 114,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In2",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Knob",
                "id": "5",
                "x": 128,
                "y": 5,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 123,
                "y": 4,
                "text": "2",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "7",
                "x": 152,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In3",
                "ConnectorIndex": 2
        },
        {
                "componentType": "Knob",
                "id": "8",
                "x": 166,
                "y": 5,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 161,
                "y": 4,
                "text": "3",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "10",
                "x": 190,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In4",
                "ConnectorIndex": 3
        },
        {
                "componentType": "Knob",
                "id": "11",
                "x": 204,
                "y": 5,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "12",
                "x": 198,
                "y": 4,
                "text": "4",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "13",
                "x": 240,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "MiniVU",
                "id": "14",
                "x": 231,
                "y": 10,
                "width": 6,
                "height": 15,
                "orientation": "vertical"
        },
        {
                "componentType": "Input",
                "id": "15",
                "x": 4,
                "y": 14,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Chain",
                "ConnectorIndex": 4
        },
        {
                "componentType": "TextLabel",
                "id": "16",
                "x": 18,
                "y": 17,
                "text": "Chain",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "0",
                "x": 42,
                "y": 14,
                "width": 30,
                "height": 12,
                "labels": [
                        "Exp",
                        "Lin",
                        "dB"
                ]
        }
]
    };
    