// Автоматически сгенерированный модуль: zctrl
    // Создан в Module Editor

    export const zctrlModule = {
        type: 'zctrl',
        typeID: 999,
        defaultParams: [],
        displayName: 'zctrl',
        gridHeight: 3,
        originalName: 'zctrl',
        tooltip: 'zctrl',
        params: [1, 2],
        inputs: [],
        outputs: [3],
        components: [
        {
                "componentType": "Knob",
                "id": "1",
                "x": 15,
                "y": 10,
                "size": "medium",
                "min": 0,
                "max": 1,
                "defaultValue": 0.5,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonFlat",
                "id": "2",
                "x": 55,
                "y": 15,
                "width": 50,
                "height": 16,
                "labels": [
                        "Off",
                        "On"
                ]
        },
        {
                "componentType": "Output",
                "id": "3",
                "x": 225,
                "y": 15,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        }
]
    };