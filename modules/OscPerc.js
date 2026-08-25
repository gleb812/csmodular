// Автоматически сгенерированный модуль: OscPerc
    // Исходный файл: OscPerc.js
    // Версия: 232

    export const OscPercModule = {
        type: 'OscPerc',
            typeID: 196,
    defaultParams: [64, 64, 0, 0, 0, 64, 64, 0, 1],
        displayName: 'OscPerc',
        gridHeight: 3,
        originalName: 'OscPerc',
        tooltip: 'Osc Percussion',
        inputs: [0, 1, 5],
        outputs: [16],
        components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 4,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Pitch",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 175,
                "y": 10,
                "text": "Dcy",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "5",
                "x": 44,
                "y": 29,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "Trig",
                "ConnectorIndex": 2
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 58,
                "y": 30,
                "text": "↑",
                "fontSize": 10,
                "color": "#ffffff",
                "align": "center",
                "valign": "middle",
                "originalType": "Symbol",
                "symbolType": "Trig 1",
                "width": 9
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 45,
                "y": 20,
                "text": "Trig",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "8",
                "x": 66,
                "y": 14,
                "width": 50,
                "referenceElementId": 11
        },
        {
                "componentType": "ButtonFlat",
                "id": "10",
                "x": 117,
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
                "id": "11",
                "x": 121,
                "y": 18,
                "infoFunc": 61,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "12",
                "x": 149,
                "y": 14,
                "infoFunc": 59,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "13",
                "x": 173,
                "y": 20,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "14",
                "x": 197,
                "y": 20,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Output",
                "id": "16",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "static",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "ButtonText",
                "id": "17",
                "x": 224,
                "y": 29,
                "width": 13,
                "text": "M"
        },
        {
                "componentType": "TextLabel",
                "id": "18",
                "x": 17,
                "y": 13,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "19",
                "x": 197,
                "y": 10,
                "text": "Click",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "20",
                "x": 149,
                "y": 6,
                "text": "Cent",
                "fontSize": 9,
                "color": "#ffffff"
        },
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
                "id": "2",
                "x": 18,
                "y": 22,
                "infoFunc": 0,
                "size": "medium"
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
                "componentType": "TextLabel",
                "id": "21",
                "x": 225,
                "y": 4,
                "text": "Punch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "22",
                "x": 228,
                "y": 13,
                "width": 20,
                "height": 12,
                "labels": [
                        "Off",
                        "On"
                ]
        },
        {
                "componentType": "ButtonFlat",
                "id": "15",
                "x": 94,
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
                "id": "9",
                "x": 75,
                "y": 31,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
    };
    