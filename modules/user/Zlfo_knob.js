// Автоматически сгенерированный модуль: Zlfo_knob
        // Создан в Module Editor

        export const Zlfo_knobModule = {
            type: 'Zlfo_knob',
            typeID: 999,
            defaultParams: [],
            displayName: 'Zlfo_knob',
            gridHeight: 3,
            originalName: 'Zlfo_knob',
            tooltip: 'Zlfo_knob',
            customColor: 'hsl(180, 80%, 60%)',
            params: [2],
            inputs: [],
            outputs: [1],
            components: [
        {
                "componentType": "Output",
                "id": "1",
                "x": 230,
                "y": 10,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 30,
                "y": 15,
                "size": "medium",
                "min": 0,
                "max": 127,
                "defaultValue": 64,
                "infoFunc": 0
        }
]
        };