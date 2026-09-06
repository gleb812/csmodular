// Автоматически сгенерированный модуль: test_inpout
    // Создан в Module Editor

    export const test_inpoutModule = {
        type: 'test_inpout',
        typeID: 999,
        defaultParams: [],
        displayName: 'test_inpout',
        gridHeight: 3,
        originalName: 'test_inpout',
        tooltip: 'test_inpout',
        inputs: [2, 5],
        outputs: [3, 4],
        components: [
        {
                "componentType": "Knob",
                "id": "1",
                "x": 35,
                "y": 10,
                "size": "medium",
                "min": 0,
                "max": 127,
                "defaultValue": 64,
                "infoFunc": 0
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 85,
                "y": 10,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Output",
                "id": "3",
                "x": 220,
                "y": 10,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "Out(C)",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Output",
                "id": "4",
                "x": 195,
                "y": 20,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Input",
                "id": "5",
                "x": 70,
                "y": 30,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "In(C)",
                "ConnectorIndex": 1
        },
        {
                "componentType": "ButtonFlat",
                "id": "8",
                "x": 115,
                "y": 10,
                "width": 50,
                "height": 16,
                "labels": [
                        "Off",
                        "On"
                ]
        }
]
    };