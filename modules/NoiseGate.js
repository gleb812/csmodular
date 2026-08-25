// Автоматически сгенерированный модуль: NoiseGate
    // Исходный файл: NoiseGate.js
    // Версия: 206

    export const NoiseGateModule = {
        type: 'NoiseGate',
            typeID: 189,
    defaultParams: [20, 0, 64, 1],
        displayName: 'NoiseGate',
        gridHeight: 3,
        originalName: 'NoiseGate',
        tooltip: 'Noise Gate',
        inputs: [0],
        outputs: [1, 8],
        components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In",
                "ConnectorIndex": 0
        },
        {
                "componentType": "LED",
                "id": "9",
                "x": 213,
                "y": 32
        },
        {
                "componentType": "Knob",
                "id": "17",
                "x": 187,
                "y": 20,
                "infoFunc": 220,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "18",
                "x": 48,
                "y": 20,
                "infoFunc": 159,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "21",
                "x": 12,
                "y": 17,
                "text": "Attack",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "1",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Knob",
                "id": "3",
                "x": 113,
                "y": 20,
                "infoFunc": 160,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 76,
                "y": 17,
                "text": "Release",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 142,
                "y": 17,
                "text": "Threshold",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "6",
                "x": 142,
                "y": 27,
                "width": 42,
                "referenceElementId": 17
        },
        {
                "componentType": "ButtonText",
                "id": "7",
                "x": 239,
                "y": 17,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Output",
                "id": "8",
                "x": 223,
                "y": 30,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "Env",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Line",
                "id": "2",
                "x": 245,
                "y": 8,
                "length": 30,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "10",
                "x": 10,
                "y": 27,
                "width": 35,
                "referenceElementId": 18
        },
        {
                "componentType": "TextField",
                "id": "11",
                "x": 75,
                "y": 27,
                "width": 35,
                "referenceElementId": 3
        }
]
    };
    