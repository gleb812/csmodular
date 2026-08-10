// Автоматически сгенерированный модуль: AREnv
// Исходный файл: AREnv.js
// Версия: 206

export const AREnvModule = {
    type: 'AR-Env',
        typeID: 0,
    displayName: 'AR-Env',
    gridHeight: 3,
    originalName: 'AR-Env',
    tooltip: 'AR Envelope',
    components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 239,
                "y": 3,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "0",
                "x": 239,
                "y": 29,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "LevelShift",
                "id": "2",
                "x": 191,
                "y": 28
        },
        {
                "componentType": "Output",
                "id": "5",
                "x": 223,
                "y": 29,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Graph",
                "id": "4",
                "x": 191,
                "y": 3,
                "width": 45,
                "height": 24
        },
        {
                "componentType": "Input",
                "id": "7",
                "x": 4,
                "y": 29,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "LED",
                "id": "8",
                "x": 6,
                "y": 18
        },
        {
                "componentType": "Input",
                "id": "9",
                "x": 49,
                "y": 29,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 48,
                "y": 19,
                "text": "AM",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "14",
                "x": 100,
                "y": 3,
                "width": 35,
                "referenceElementId": 16
        },
        {
                "componentType": "TextField",
                "id": "17",
                "x": 151,
                "y": 3,
                "width": 35,
                "referenceElementId": 19
        },
        {
                "componentType": "Knob",
                "id": "16",
                "x": 112,
                "y": 19,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "19",
                "x": 163,
                "y": 19,
                "infoFunc": 28,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "20",
                "x": 100,
                "y": 19,
                "text": "A",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "23",
                "x": 152,
                "y": 19,
                "text": "R",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 18,
                "y": 18,
                "text": "Gate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Stub",
                "id": "11",
                "x": 93,
                "y": 27,
                "width": 20,
                "height": 20,
                "originalType": "EnvCurve",
                "color": "#ff0000"
        },
        {
                "componentType": "Stub",
                "id": "12",
                "x": 144,
                "y": 27,
                "width": 20,
                "height": 20,
                "originalType": "EnvCurve",
                "color": "#ff0000"
        },
        {
                "componentType": "SVG",
                "id": "3",
                "x": 240,
                "y": 12,
                "width": 11,
                "height": 21,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonText",
                "id": "13",
                "x": 18,
                "y": 29,
                "width": 20,
                "text": "KB"
        }
]
};
