// Автоматически сгенерированный модуль: EnvAHD
    // Исходный файл: EnvAHD.js
    // Версия: 206

    export const EnvAHDModule = {
        type: 'EnvAHD',
            typeID: 46,
    defaultParams: [0, 0, 32, 0, 14, 0, 1],
        displayName: 'EnvAHD',
        gridHeight: 4,
        originalName: 'EnvAHD',
        tooltip: 'Envelope AHD',
        inputs: [2, 7, 9],
        outputs: [10, 13],
        components: [
        {
                "componentType": "TextLabel",
                "id": "0",
                "x": 23,
                "y": 32,
                "text": "Trig",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "LED",
                "id": "1",
                "x": 6,
                "y": 18
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 4,
                "y": 30,
                "jackType": "logic",
                "bandwidth": "static",
                "ConnectorName": "Trig",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "3",
                "x": 18,
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
                "componentType": "Input",
                "id": "7",
                "x": 4,
                "y": 45,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "AM",
                "ConnectorIndex": 1
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 18,
                "y": 47,
                "text": "AM",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "9",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "In",
                "ConnectorIndex": 2
        },
        {
                "componentType": "Output",
                "id": "10",
                "x": 240,
                "y": 45,
                "jackType": "audio",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 1
        },
        {
                "componentType": "LevelShift",
                "id": "12",
                "x": 203,
                "y": 44
        },
        {
                "componentType": "Output",
                "id": "13",
                "x": 223,
                "y": 45,
                "jackType": "control",
                "bandwidth": "static",
                "ConnectorName": "Env",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Graph",
                "id": "14",
                "x": 176,
                "y": 4,
                "width": 58,
                "height": 28
        },
        {
                "componentType": "TextField",
                "id": "15",
                "x": 51,
                "y": 18,
                "width": 35,
                "referenceElementId": 17
        },
        {
                "componentType": "TextField",
                "id": "16",
                "x": 137,
                "y": 18,
                "width": 35,
                "referenceElementId": 18
        },
        {
                "componentType": "Knob",
                "id": "17",
                "x": 64,
                "y": 35,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "18",
                "x": 150,
                "y": 35,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "21",
                "x": 52,
                "y": 34,
                "text": "A",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "22",
                "x": 138,
                "y": 34,
                "text": "D",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "23",
                "x": 94,
                "y": 18,
                "width": 35,
                "referenceElementId": 24
        },
        {
                "componentType": "Knob",
                "id": "24",
                "x": 107,
                "y": 35,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "25",
                "x": 96,
                "y": 35,
                "text": "H",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "SVG",
                "id": "11",
                "x": 240,
                "y": 20,
                "width": 11,
                "height": 21,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "30",
                "x": 220,
                "y": 35,
                "text": "Env",
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
                "id": "5",
                "x": 178,
                "y": 44,
                "width": 20,
                "height": 12
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 177,
                "y": 34,
                "text": "Shape",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "20",
                "x": 46,
                "y": 44,
                "width": 15,
                "height": 12
        },
        {
                "componentType": "Line",
                "id": "19",
                "x": 245,
                "y": 9,
                "length": 16,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "26",
                "x": 245,
                "y": 37,
                "length": 16,
                "orientation": "Vertical"
        }
]
    };
    