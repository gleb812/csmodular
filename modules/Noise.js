// Автоматически сгенерированный модуль: Noise
    // Исходный файл: Noise.js
    // Версия: 208

    export const NoiseModule = {
        type: 'Noise',
            typeID: 106,
    defaultParams: [0, 1],
        displayName: 'Noise',
        gridHeight: 2,
        originalName: 'Noise',
        tooltip: 'Noise',
        inputs: [],
        outputs: [1],
        components: [
        {
                "componentType": "Knob",
                "id": "0",
                "x": 129,
                "y": 5,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Output",
                "id": "1",
                "x": 240,
                "y": 15,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "2",
                "x": 101,
                "y": 18,
                "text": "White",
                "fontSize": 9,
                "color": "#ffffff",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "3",
                "x": 153,
                "y": 18,
                "text": "Colored",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonText",
                "id": "5",
                "x": 239,
                "y": 2,
                "width": 13,
                "text": "M"
        }
]
    };
    