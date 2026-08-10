// Автоматически сгенерированный модуль: OscNoise
// Исходный файл: OscNoise.js
// Версия: 238

export const OscNoiseModule = {
    type: 'OscNoise',
        typeID: 106,
    defaultParams: [64, 64, 1, 0, 0, 0, 0, 1],
    displayName: 'OscNoise',
    gridHeight: 3,
    originalName: 'OscNoise',
    tooltip: 'Noise oscillator',
    components: [
        {
                "componentType": "Knob",
                "id": "0",
                "x": 195,
                "y": 18,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Output",
                "id": "2",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "3",
                "x": 180,
                "y": 8,
                "text": "Width",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "13",
                "x": 159,
                "y": 29,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "14",
                "x": 173,
                "y": 22,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "15",
                "x": 162,
                "y": 32,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "ButtonText",
                "id": "1",
                "x": 224,
                "y": 29,
                "width": 13,
                "text": "M"
        },
        {
                "componentType": "Input",
                "id": "4",
                "x": 4,
                "y": 29,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "5",
                "x": 18,
                "y": 22,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "6",
                "x": 7,
                "y": 32,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "7",
                "x": 4,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "8",
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
                "componentType": "TextField",
                "id": "11",
                "x": 46,
                "y": 14,
                "width": 50,
                "referenceElementId": 8
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 17,
                "y": 13,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "12",
                "x": 131,
                "y": 6,
                "text": "Cent",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "16",
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
                "componentType": "ButtonFlat",
                "id": "17",
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
                "id": "18",
                "x": 55,
                "y": 31,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Graph",
                "id": "19",
                "x": 220,
                "y": 4,
                "width": 31,
                "height": 22
        }
]
};
