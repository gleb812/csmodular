// Автоматически сгенерированный модуль: OscMaster
    // Исходный файл: OscMaster.js
    // Версия: 234

    export const OscMasterModule = {
        type: 'OscMaster',
            typeID: 27,
    defaultParams: [64, 64, 1, 0, 0],
        displayName: 'OscMaster',
        gridHeight: 3,
        originalName: 'OscMaster',
        tooltip: 'Osc Master',
        inputs: [1, 2],
        outputs: [6],
        components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 4,
                "y": 29,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "PitchVar",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Knob",
                "id": "0",
                "x": 18,
                "y": 22,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "3",
                "x": 7,
                "y": 33,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 4,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Pitch",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Knob",
                "id": "5",
                "x": 102,
                "y": 18,
                "infoFunc": 61,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "4",
                "x": 130,
                "y": 14,
                "infoFunc": 59,
                "size": "medium"
        },
        {
                "componentType": "Output",
                "id": "6",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextField",
                "id": "8",
                "x": 46,
                "y": 14,
                "width": 50,
                "referenceElementId": 5
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 17,
                "y": 13,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 131,
                "y": 6,
                "text": "Cent",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "11",
                "x": 98,
                "y": 4,
                "width": 30,
                "height": 12,
                "labels": [
                        "Semi",
                        "Freq",
                        "Fac"
                ]
        },
        {
                "componentType": "ButtonFlat",
                "id": "12",
                "x": 74,
                "y": 29,
                "width": 20,
                "height": 12,
                "labels": [
                        "Off",
                        "On"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 55,
                "y": 31,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "13",
                "x": 230,
                "y": 20,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
    };
    