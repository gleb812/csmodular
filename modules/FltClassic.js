// Автоматически сгенерированный модуль: FltClassic
// Исходный файл: FltClassic.js
// Версия: 210

export const FltClassicModule = {
    type: 'FltClassic',
        typeID: 92,
    defaultParams: [75, 0, 0, 0, 2, 1],
    displayName: 'FltClassic',
    gridHeight: 4,
    originalName: 'FltClassic',
    tooltip: 'Filter Classic',
    components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 4,
                "y": 44,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "0",
                "x": 18,
                "y": 32,
                "infoFunc": 191,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "3",
                "x": 8,
                "y": 47,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 4,
                "y": 28,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 17,
                "y": 23,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "5",
                "x": 86,
                "y": 16,
                "width": 44,
                "referenceElementId": 6
        },
        {
                "componentType": "Knob",
                "id": "6",
                "x": 97,
                "y": 33,
                "infoFunc": 123,
                "size": "medium"
        },
        {
                "componentType": "ButtonFlat",
                "id": "7",
                "x": 49,
                "y": 42,
                "width": 25,
                "height": 12,
                "labels": [
                        "Off",
                        "25%",
                        "50%",
                        "75%",
                        "100%"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 54,
                "y": 32,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 98,
                "y": 6,
                "text": "Freq",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Knob",
                "id": "10",
                "x": 150,
                "y": 35,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "11",
                "x": 153,
                "y": 6,
                "text": "Res",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Graph",
                "id": "12",
                "x": 182,
                "y": 4,
                "width": 52,
                "height": 28
        },
        {
                "componentType": "ButtonRadio",
                "id": "13",
                "x": 182,
                "y": 42,
                "buttonWidth": 18,
                "buttonCount": 3,
                "orientation": "horizontal",
                "labels": [
                        "12",
                        "18",
                        "24"
                ]
        },
        {
                "componentType": "Output",
                "id": "15",
                "x": 240,
                "y": 45,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "16",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "17",
                "x": 239,
                "y": 24,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Line",
                "id": "21",
                "x": 245,
                "y": 12,
                "length": 37,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "22",
                "x": 148,
                "y": 16,
                "width": 26,
                "referenceElementId": 10
        },
        {
                "componentType": "TextLabel",
                "id": "14",
                "x": 194,
                "y": 33,
                "text": "dB/Oct",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
