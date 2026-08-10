// Автоматически сгенерированный модуль: ModADSR
// Исходный файл: ModADSR.js
// Версия: 206

export const ModADSRModule = {
    type: 'ModADSR',
        typeID: 23,
    defaultParams: [0, 54, 100, 14, 0, 0, 0, 0, 0, 1],
    displayName: 'ModADSR',
    gridHeight: 5,
    originalName: 'ModADSR',
    tooltip: 'Envelope Modulation ADSR',
    components: [
        {
                "componentType": "TextField",
                "id": "0",
                "x": 30,
                "y": 14,
                "width": 35,
                "referenceElementId": 2
        },
        {
                "componentType": "TextField",
                "id": "1",
                "x": 136,
                "y": 14,
                "width": 35,
                "referenceElementId": 3
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 38,
                "y": 31,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "3",
                "x": 146,
                "y": 31,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 30,
                "y": 30,
                "text": "A",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 140,
                "y": 30,
                "text": "R",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "6",
                "x": 68,
                "y": 14,
                "width": 35,
                "referenceElementId": 7
        },
        {
                "componentType": "Knob",
                "id": "7",
                "x": 74,
                "y": 31,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 68,
                "y": 30,
                "text": "D",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "9",
                "x": 106,
                "y": 14,
                "width": 27,
                "referenceElementId": 10
        },
        {
                "componentType": "Knob",
                "id": "10",
                "x": 110,
                "y": 31,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "11",
                "x": 104,
                "y": 30,
                "text": "S",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Graph",
                "id": "12",
                "x": 173,
                "y": 4,
                "width": 61,
                "height": 28
        },
        {
                "componentType": "Input",
                "id": "13",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "14",
                "x": 240,
                "y": 60,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "LevelShift",
                "id": "16",
                "x": 200,
                "y": 59
        },
        {
                "componentType": "Output",
                "id": "17",
                "x": 223,
                "y": 60,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "18",
                "x": 4,
                "y": 45,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "LED",
                "id": "19",
                "x": 6,
                "y": 33
        },
        {
                "componentType": "TextLabel",
                "id": "20",
                "x": 17,
                "y": 47,
                "text": "Gate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "21",
                "x": 4,
                "y": 60,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "22",
                "x": 17,
                "y": 62,
                "text": "AM",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "26",
                "x": 43,
                "y": 59,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "27",
                "x": 57,
                "y": 52,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "28",
                "x": 47,
                "y": 62,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "29",
                "x": 79,
                "y": 59,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "30",
                "x": 93,
                "y": 52,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "31",
                "x": 83,
                "y": 62,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "32",
                "x": 115,
                "y": 59,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "33",
                "x": 129,
                "y": 52,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "34",
                "x": 119,
                "y": 62,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "35",
                "x": 151,
                "y": 59,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "36",
                "x": 165,
                "y": 52,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "37",
                "x": 155,
                "y": 62,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "SVG",
                "id": "15",
                "x": 240,
                "y": 27,
                "width": 11,
                "height": 21,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "39",
                "x": 220,
                "y": 50,
                "text": "Env",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonText",
                "id": "38",
                "x": 4,
                "y": 17,
                "width": 18,
                "text": "KB"
        },
        {
                "componentType": "Line",
                "id": "23",
                "x": 245,
                "y": 9,
                "length": 22,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "24",
                "x": 245,
                "y": 43,
                "length": 22,
                "orientation": "Vertical"
        }
]
};
