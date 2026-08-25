// Автоматически сгенерированный модуль: XFade
    // Исходный файл: XFade.js
    // Версия: 206

    export const XFadeModule = {
        type: 'XFade',
            typeID: 18,
    defaultParams: [0, 64, 0],
        displayName: 'X-Fade',
        gridHeight: 2,
        originalName: 'X-Fade',
        tooltip: 'Cross Fader',
        inputs: [1, 2, 3],
        outputs: [6],
        components: [
        {
                "componentType": "Input",
                "id": "3",
                "x": 87,
                "y": 14,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Mod",
                "ConnectorIndex": 2
        },
        {
                "componentType": "Knob",
                "id": "4",
                "x": 101,
                "y": 7,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "5",
                "x": 91,
                "y": 17,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Knob",
                "id": "0",
                "x": 140,
                "y": 3,
                "infoFunc": 17,
                "size": "medium"
        },
        {
                "componentType": "Input",
                "id": "1",
                "x": 180,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In1",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 210,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In2",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Output",
                "id": "6",
                "x": 240,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 134,
                "y": 17,
                "text": "1",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 162,
                "y": 17,
                "text": "2",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 176,
                "y": 16,
                "text": "1",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 204,
                "y": 16,
                "text": "2",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "13",
                "x": 42,
                "y": 14,
                "width": 30,
                "height": 12,
                "labels": [
                        "Log",
                        "Lin"
                ]
        },
        {
                "componentType": "SVG",
                "id": "12",
                "x": 184,
                "y": 4,
                "width": 62,
                "height": 9,
                "color": "#ffffff"
        }
]
    };
    