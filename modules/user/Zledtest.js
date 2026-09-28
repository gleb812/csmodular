// Автоматически сгенерированный модуль: Zledtest
        // Создан в Module Editor

        export const ZledtestModule = {
            type: 'Zledtest',
            typeID: 999,
            defaultParams: [],
            displayName: 'Zledtest',
            gridHeight: 3,
            originalName: 'Zledtest',
            tooltip: 'Zledtest',
            params: [],
            inputs: [1, 3],
            outputs: [2],
            components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 5,
                "y": 20,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Output",
                "id": "2",
                "x": 240,
                "y": 15,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "Out(C)",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Input",
                "id": "3",
                "x": 20,
                "y": 20,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "In(C)",
                "ConnectorIndex": 1
        },
        {
                "componentType": "LED",
                "id": "4",
                "x": 20,
                "y": 5,
                "width": 16,
                "height": 10,
                "sourceComponentId": "3",
                "ledType": "rms"
        },
        {
                "componentType": "LED",
                "id": "5",
                "x": 220,
                "y": 20,
                "width": 16,
                "height": 10,
                "sourceComponentId": "2",
                "ledType": "rms"
        }
]
        };