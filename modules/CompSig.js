// Автоматически сгенерированный модуль: CompSig
    // Исходный файл: CompSig.js
    // Версия: 210

    export const CompSigModule = {
        type: 'CompSig',
            typeID: 159,
    defaultParams: [],
        displayName: 'CompSig',
        gridHeight: 2,
        originalName: 'CompSig',
        tooltip: 'Compare to Signal',
        inputs: [0, 1],
        outputs: [2],
        components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 150,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "B",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Input",
                "id": "1",
                "x": 120,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "A",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Output",
                "id": "2",
                "x": 240,
                "y": 11,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "3",
                "x": 110,
                "y": 13,
                "text": "A",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 142,
                "y": 13,
                "text": "B",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 214,
                "y": 13,
                "text": "A>=B",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
    };
    