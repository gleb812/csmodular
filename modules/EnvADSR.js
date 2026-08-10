// Автоматически сгенерированный модуль: EnvADSR
// Исходный файл: EnvADSR.js
// Версия: 206

export const EnvADSRModule = {
    type: 'EnvADSR',
        typeID: 20,
    defaultParams: [0, 0, 54, 100, 14, 0, 1, 0],
    displayName: 'EnvADSR',
    gridHeight: 4,
    originalName: 'EnvADSR',
    tooltip: 'Envelope ADSR',
    components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "1",
                "x": 240,
                "y": 45,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "LevelShift",
                "id": "3",
                "x": 204,
                "y": 44
        },
        {
                "componentType": "Output",
                "id": "4",
                "x": 223,
                "y": 45,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Graph",
                "id": "5",
                "x": 173,
                "y": 4,
                "width": 61,
                "height": 28
        },
        {
                "componentType": "TextField",
                "id": "6",
                "x": 42,
                "y": 17,
                "width": 32,
                "referenceElementId": 8
        },
        {
                "componentType": "TextField",
                "id": "7",
                "x": 139,
                "y": 17,
                "width": 32,
                "referenceElementId": 9
        },
        {
                "componentType": "Knob",
                "id": "8",
                "x": 53,
                "y": 35,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "9",
                "x": 150,
                "y": 35,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "12",
                "x": 43,
                "y": 33,
                "text": "A",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "13",
                "x": 143,
                "y": 33,
                "text": "R",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "14",
                "x": 76,
                "y": 17,
                "width": 32,
                "referenceElementId": 15
        },
        {
                "componentType": "Knob",
                "id": "15",
                "x": 87,
                "y": 35,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "16",
                "x": 80,
                "y": 33,
                "text": "D",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "10",
                "x": 4,
                "y": 30,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "LED",
                "id": "11",
                "x": 6,
                "y": 17
        },
        {
                "componentType": "TextLabel",
                "id": "17",
                "x": 17,
                "y": 32,
                "text": "Gate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "18",
                "x": 4,
                "y": 45,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "19",
                "x": 17,
                "y": 47,
                "text": "AM",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "20",
                "x": 110,
                "y": 17,
                "width": 27,
                "referenceElementId": 21
        },
        {
                "componentType": "Knob",
                "id": "21",
                "x": 117,
                "y": 35,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "22",
                "x": 111,
                "y": 33,
                "text": "S",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonText",
                "id": "23",
                "x": 16,
                "y": 16,
                "width": 18,
                "text": "KB"
        },
        {
                "componentType": "SVG",
                "id": "2",
                "x": 240,
                "y": 20,
                "width": 11,
                "height": 21,
                "color": "#ffffff"
        ,
        "svgSrc": "/svg/levscaler_ADSR.svg"},
        {
                "componentType": "TextLabel",
                "id": "25",
                "x": 223,
                "y": 35,
                "text": "Env",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "24",
                "x": 178,
                "y": 44,
                "width": 20,
                "height": 12
        },
        {
                "componentType": "TextLabel",
                "id": "27",
                "x": 176,
                "y": 35,
                "text": "Shape",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "28",
                "x": 35,
                "y": 44,
                "width": 15,
                "height": 12
        },
        {
                "componentType": "Line",
                "id": "26",
                "x": 245,
                "y": 10,
                "length": 15,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "29",
                "x": 245,
                "y": 37,
                "length": 15,
                "orientation": "Vertical"
        }
]
};
