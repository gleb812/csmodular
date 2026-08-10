// Автоматически сгенерированный модуль: FltNord
// Исходный файл: FltNord.js
// Версия: 208

export const FltNordModule = {
    type: 'FltNord',
        typeID: 51,
    defaultParams: [75, 0, 0, 1, 0, 1, 1, 0, 0, 0],
    displayName: 'FltNord',
    gridHeight: 5,
    originalName: 'FltNord',
    tooltip: 'Filter Nord',
    components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 4,
                "y": 59,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "1",
                "x": 18,
                "y": 47,
                "infoFunc": 191,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "2",
                "x": 8,
                "y": 62,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "3",
                "x": 4,
                "y": 43,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 17,
                "y": 38,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "4",
                "x": 45,
                "y": 59,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "6",
                "x": 59,
                "y": 52,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "7",
                "x": 50,
                "y": 62,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 46,
                "y": 42,
                "text": "FM Lin",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "9",
                "x": 32,
                "y": 18,
                "width": 44,
                "referenceElementId": 10
        },
        {
                "componentType": "Knob",
                "id": "10",
                "x": 79,
                "y": 14,
                "infoFunc": 123,
                "size": "medium"
        },
        {
                "componentType": "ButtonFlat",
                "id": "11",
                "x": 83,
                "y": 57,
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
                "id": "12",
                "x": 87,
                "y": 47,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "13",
                "x": 81,
                "y": 4,
                "text": "Freq",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonRadio",
                "id": "14",
                "x": 161,
                "y": 4,
                "buttonWidth": 18,
                "buttonCount": 4,
                "orientation": "vertical",
                "labels": [
                        "BR",
                        "HP",
                        "BP",
                        "LP"
                ]
        },
        {
                "componentType": "TextField",
                "id": "15",
                "x": 108,
                "y": 18,
                "width": 26,
                "referenceElementId": 16
        },
        {
                "componentType": "Knob",
                "id": "16",
                "x": 137,
                "y": 15,
                "infoFunc": 124,
                "size": "medium"
        },
        {
                "componentType": "ButtonText",
                "id": "17",
                "x": 112,
                "y": 34,
                "width": 18,
                "text": "GC"
        },
        {
                "componentType": "TextLabel",
                "id": "18",
                "x": 139,
                "y": 5,
                "text": "Res",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Graph",
                "id": "19",
                "x": 182,
                "y": 4,
                "width": 52,
                "height": 28
        },
        {
                "componentType": "ButtonRadio",
                "id": "20",
                "x": 192,
                "y": 50,
                "buttonWidth": 18,
                "buttonCount": 2,
                "orientation": "horizontal",
                "labels": [
                        "12",
                        "24"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "21",
                "x": 194,
                "y": 40,
                "text": "dB/Oct",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "22",
                "x": 240,
                "y": 60,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "23",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "24",
                "x": 239,
                "y": 31,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Line",
                "id": "25",
                "x": 245,
                "y": 9,
                "length": 56,
                "orientation": "Vertical"
        },
        {
                "componentType": "Input",
                "id": "26",
                "x": 124,
                "y": 59,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "27",
                "x": 138,
                "y": 52,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "28",
                "x": 128,
                "y": 62,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextLabel",
                "id": "29",
                "x": 120,
                "y": 49,
                "text": "Res",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
