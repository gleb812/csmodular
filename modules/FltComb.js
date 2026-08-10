// Автоматически сгенерированный модуль: FltComb
// Исходный файл: FltComb.js
// Версия: 232

export const FltCombModule = {
    type: 'FltComb',
        typeID: 162,
    defaultParams: [64, 0, 0, 64, 0, 0, 127, 1],
    displayName: 'FltComb',
    gridHeight: 4,
    originalName: 'FltComb',
    tooltip: 'Filter Comb',
    components: [
        {
                "componentType": "Output",
                "id": "0",
                "x": 240,
                "y": 45,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "1",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "3",
                "x": 239,
                "y": 24,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Line",
                "id": "2",
                "x": 245,
                "y": 7,
                "length": 44,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "5",
                "x": 66,
                "y": 18,
                "width": 50,
                "referenceElementId": 4
        },
        {
                "componentType": "Knob",
                "id": "4",
                "x": 81,
                "y": 35,
                "infoFunc": 173,
                "size": "medium"
        },
        {
                "componentType": "Input",
                "id": "7",
                "x": 4,
                "y": 44,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "6",
                "x": 18,
                "y": 37,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "9",
                "x": 9,
                "y": 47,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 82,
                "y": 8,
                "text": "Freq",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 114,
                "y": 5,
                "text": "FB",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Knob",
                "id": "11",
                "x": 204,
                "y": 37,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "MiniVU",
                "id": "12",
                "x": 227,
                "y": 40,
                "width": 6,
                "height": 15,
                "orientation": "vertical"
        },
        {
                "componentType": "Knob",
                "id": "13",
                "x": 125,
                "y": 5,
                "infoFunc": 17,
                "size": "medium"
        },
        {
                "componentType": "Graph",
                "id": "14",
                "x": 182,
                "y": 4,
                "width": 52,
                "height": 28
        },
        {
                "componentType": "Input",
                "id": "15",
                "x": 4,
                "y": 28,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextLabel",
                "id": "16",
                "x": 17,
                "y": 28,
                "text": "Pitch",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "17",
                "x": 42,
                "y": 44,
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
                "id": "18",
                "x": 47,
                "y": 34,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "19",
                "x": 153,
                "y": 10,
                "text": "Type",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "20",
                "x": 122,
                "y": 44,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "21",
                "x": 136,
                "y": 37,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "22",
                "x": 124,
                "y": 47,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "ButtonFlat",
                "id": "23",
                "x": 149,
                "y": 20,
                "width": 30,
                "height": 12,
                "labels": [
                        "Notch",
                        "Peak",
                        "Deep"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "24",
                "x": 185,
                "y": 42,
                "text": "Lev",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "25",
                "x": 122,
                "y": 35,
                "text": "FB",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
