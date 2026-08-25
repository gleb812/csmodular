// Автоматически сгенерированный модуль: EnvMulti
    // Исходный файл: EnvMulti.js
    // Версия: 206

    export const EnvMultiModule = {
        type: 'EnvMulti',
            typeID: 52,
    defaultParams: [127, 45, 64, 0, 0, 30, 30, 14, 0, 2, 0, 1, 0],
        displayName: 'EnvMulti',
        gridHeight: 6,
        originalName: 'EnvMulti',
        tooltip: 'Envelope Multi',
        inputs: [1, 6, 10],
        outputs: [2, 5],
        components: [
        {
                "componentType": "Graph",
                "id": "0",
                "x": 92,
                "y": 4,
                "width": 84,
                "height": 28
        },
        {
                "componentType": "Input",
                "id": "1",
                "x": 210,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Output",
                "id": "2",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Output",
                "id": "5",
                "x": 240,
                "y": 21,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "Env",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Input",
                "id": "6",
                "x": 4,
                "y": 28,
                "jackType": "logic",
                "bandwidth": "static",
                "ConnectorName": "Gate",
                "ConnectorIndex": 0
        },
        {
                "componentType": "LED",
                "id": "7",
                "x": 6,
                "y": 18
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 17,
                "y": 30,
                "text": "Gate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 40,
                "y": 19,
                "text": "AM",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "10",
                "x": 42,
                "y": 28,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "AM",
                "ConnectorIndex": 2
        },
        {
                "componentType": "TextField",
                "id": "11",
                "x": 47,
                "y": 49,
                "width": 24,
                "referenceElementId": 12
        },
        {
                "componentType": "Knob",
                "id": "12",
                "x": 49,
                "y": 65,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "13",
                "x": 55,
                "y": 40,
                "text": "L1",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "14",
                "x": 107,
                "y": 49,
                "width": 24,
                "referenceElementId": 15
        },
        {
                "componentType": "Knob",
                "id": "15",
                "x": 109,
                "y": 65,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "16",
                "x": 115,
                "y": 40,
                "text": "L2",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "17",
                "x": 167,
                "y": 49,
                "width": 24,
                "referenceElementId": 18
        },
        {
                "componentType": "Knob",
                "id": "18",
                "x": 169,
                "y": 65,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "19",
                "x": 173,
                "y": 40,
                "text": "L3",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "20",
                "x": 227,
                "y": 49,
                "width": 24,
                "referenceElementId": 21
        },
        {
                "componentType": "Knob",
                "id": "21",
                "x": 229,
                "y": 65,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "22",
                "x": 232,
                "y": 40,
                "text": "L4",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "23",
                "x": 13,
                "y": 49,
                "width": 32,
                "referenceElementId": 24
        },
        {
                "componentType": "Knob",
                "id": "24",
                "x": 22,
                "y": 65,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "25",
                "x": 27,
                "y": 40,
                "text": "T1",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "26",
                "x": 73,
                "y": 49,
                "width": 32,
                "referenceElementId": 27
        },
        {
                "componentType": "Knob",
                "id": "27",
                "x": 80,
                "y": 65,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "28",
                "x": 85,
                "y": 40,
                "text": "T2",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "29",
                "x": 133,
                "y": 49,
                "width": 32,
                "referenceElementId": 30
        },
        {
                "componentType": "Knob",
                "id": "30",
                "x": 140,
                "y": 65,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "31",
                "x": 145,
                "y": 40,
                "text": "T3",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "32",
                "x": 193,
                "y": 49,
                "width": 32,
                "referenceElementId": 33
        },
        {
                "componentType": "Knob",
                "id": "33",
                "x": 200,
                "y": 65,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "34",
                "x": 204,
                "y": 40,
                "text": "T4",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "41",
                "x": 59,
                "y": 15,
                "text": "Sustain",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonText",
                "id": "4",
                "x": 16,
                "y": 16,
                "width": 18,
                "text": "KB"
        },
        {
                "componentType": "ButtonFlat",
                "id": "40",
                "x": 179,
                "y": 20,
                "width": 20,
                "height": 12
        },
        {
                "componentType": "LevelShift",
                "id": "42",
                "x": 205,
                "y": 20
        },
        {
                "componentType": "TextLabel",
                "id": "43",
                "x": 178,
                "y": 10,
                "text": "Shape",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "38",
                "x": 68,
                "y": 24,
                "width": 20,
                "height": 12,
                "labels": [
                        "L1",
                        "L2",
                        "L3",
                        "Trg"
                ]
        },
        {
                "componentType": "SVG",
                "id": "3",
                "x": 219,
                "y": 4,
                "width": 24,
                "height": 11,
                "color": "#ffffff"
        },
        {
                "componentType": "Line",
                "id": "36",
                "x": 39,
                "y": 42,
                "length": 12,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "37",
                "x": 99,
                "y": 42,
                "length": 12,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "39",
                "x": 158,
                "y": 42,
                "length": 12,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "44",
                "x": 217,
                "y": 42,
                "length": 12,
                "orientation": "Horizontal"
        },
        {
                "componentType": "ButtonFlat",
                "id": "45",
                "x": 4,
                "y": 74,
                "width": 15,
                "height": 12
        },
        {
                "componentType": "TextLabel",
                "id": "35",
                "x": 223,
                "y": 22,
                "text": "Env",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
    };
    