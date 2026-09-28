// Автоматически сгенерированный модуль: ztank
    // Создан в Module Editor

    export const ztankModule = {
        type: 'ztank',
        typeID: 999,
        defaultParams: [],
        displayName: 'ztank',
        gridHeight: 6,
        originalName: 'ztank',
        tooltip: 'ztank',
        inputs: [],
        outputs: [2],
        components: [
        {
                "componentType": "Output",
                "id": "2",
                "x": 240,
                "y": 10,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Slider",
                "id": "3",
                "x": 15,
                "y": 15,
                "width": 14,
                "height": 50,
                "min": 0,
                "max": 127,
                "defaultValue": 64
        },
        {
                "componentType": "Knob",
                "id": "4",
                "x": 230,
                "y": 55,
                "size": "medium",
                "min": 0,
                "max": 127,
                "defaultValue": 64,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonFlat",
                "id": "5",
                "x": 180,
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