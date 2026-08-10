// Автоматически сгенерированный модуль: EnvD
// Исходный файл: EnvD.js
// Версия: 206

export const EnvDModule = {
    type: 'EnvD',
        typeID: 55,
    defaultParams: [54, 0],
    displayName: 'EnvD',
    gridHeight: 2,
    originalName: 'EnvD',
    tooltip: 'Envelope Decay',
    components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 4,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "1",
                "x": 17,
                "y": 16,
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
                "id": "3",
                "x": 22,
                "y": 17,
                "text": "Trig",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "LED",
                "id": "2",
                "x": 40,
                "y": 18
        },
        {
                "componentType": "Input",
                "id": "5",
                "x": 49,
                "y": 15,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 62,
                "y": 17,
                "text": "AM",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "7",
                "x": 81,
                "y": 12,
                "width": 35,
                "referenceElementId": 6
        },
        {
                "componentType": "Knob",
                "id": "6",
                "x": 119,
                "y": 5,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "Graph",
                "id": "9",
                "x": 142,
                "y": 4,
                "width": 31,
                "height": 22
        },
        {
                "componentType": "Input",
                "id": "8",
                "x": 210,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "11",
                "x": 240,
                "y": 11,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "LevelShift",
                "id": "13",
                "x": 176,
                "y": 14
        },
        {
                "componentType": "Output",
                "id": "12",
                "x": 194,
                "y": 13,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "SVG",
                "id": "10",
                "x": 221,
                "y": 11,
                "width": 21,
                "height": 11,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "14",
                "x": 191,
                "y": 3,
                "text": "Env",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
