// Автоматически сгенерированный модуль: OscString
    // Исходный файл: OscString.js
    // Версия: 208

    export const OscStringModule = {
        type: 'OscString',
            typeID: 13,
    defaultParams: [64, 64, 1, 0, 0, 80, 0, 1],
        displayName: 'OscString',
        gridHeight: 3,
        originalName: 'OscString',
        tooltip: 'Osc String',
        inputs: [0, 1, 24],
        outputs: [23],
        components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 4,
                "y": 13,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "Pitch",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Input",
                "id": "1",
                "x": 4,
                "y": 29,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "PitchVar",
                "ConnectorIndex": 2
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 18,
                "y": 22,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 17,
                "y": 13,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "4",
                "x": 46,
                "y": 14,
                "width": 50,
                "referenceElementId": 6
        },
        {
                "componentType": "ButtonFlat",
                "id": "7",
                "x": 98,
                "y": 4,
                "width": 30,
                "height": 12,
                "labels": [
                        "Semi",
                        "Freq",
                        "Fac",
                        "Part"
                ]
        },
        {
                "componentType": "Knob",
                "id": "6",
                "x": 102,
                "y": 18,
                "infoFunc": 61,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "9",
                "x": 130,
                "y": 14,
                "infoFunc": 59,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 131,
                "y": 6,
                "text": "Cent",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Line",
                "id": "3",
                "x": 8,
                "y": 32,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Knob",
                "id": "10",
                "x": 164,
                "y": 20,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "15",
                "x": 161,
                "y": 9,
                "text": "Decay",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Knob",
                "id": "16",
                "x": 195,
                "y": 20,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "20",
                "x": 195,
                "y": 9,
                "text": "Damp",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "23",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Input",
                "id": "24",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "In",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Line",
                "id": "26",
                "x": 245,
                "y": 27,
                "length": 10,
                "orientation": "Vertical"
        },
        {
                "componentType": "ButtonText",
                "id": "27",
                "x": 224,
                "y": 29,
                "width": 13,
                "text": "M"
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
                "id": "11",
                "x": 55,
                "y": 31,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Line",
                "id": "13",
                "x": 240,
                "y": 17,
                "length": 11,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "14",
                "x": 240,
                "y": 27,
                "length": 11,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "17",
                "x": 245,
                "y": 8,
                "length": 10,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "18",
                "x": 250,
                "y": 17,
                "length": 11,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "19",
                "x": 240,
                "y": 17,
                "length": 11,
                "orientation": "Vertical"
        }
]
    };
    