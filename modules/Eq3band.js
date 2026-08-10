// Автоматически сгенерированный модуль: Eq3band
// Исходный файл: Eq3band.js
// Версия: 208

export const Eq3bandModule = {
    type: 'Eq3band',
        typeID: 33,
    displayName: 'Eq3band',
    gridHeight: 4,
    originalName: 'Eq3band',
    tooltip: 'Eq 3 Band',
    components: [
        {
                "componentType": "Knob",
                "id": "1",
                "x": 158,
                "y": 35,
                "infoFunc": 36,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 25,
                "y": 35,
                "infoFunc": 36,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "3",
                "x": 68,
                "y": 35,
                "infoFunc": 36,
                "size": "medium"
        },
        {
                "componentType": "TextField",
                "id": "5",
                "x": 4,
                "y": 17,
                "width": 40,
                "referenceElementId": 2
        },
        {
                "componentType": "Graph",
                "id": "0",
                "x": 182,
                "y": 4,
                "width": 52,
                "height": 28
        },
        {
                "componentType": "TextField",
                "id": "4",
                "x": 50,
                "y": 17,
                "width": 40,
                "referenceElementId": 3
        },
        {
                "componentType": "TextField",
                "id": "6",
                "x": 139,
                "y": 17,
                "width": 40,
                "referenceElementId": 1
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 8,
                "y": 34,
                "text": "Lo",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 50,
                "y": 34,
                "text": "Gain",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 142,
                "y": 34,
                "text": "Hi",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "10",
                "x": 240,
                "y": 45,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "11",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "12",
                "x": 239,
                "y": 24,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Line",
                "id": "13",
                "x": 245,
                "y": 10,
                "length": 42,
                "orientation": "Vertical"
        },
        {
                "componentType": "Knob",
                "id": "14",
                "x": 202,
                "y": 35,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "15",
                "x": 184,
                "y": 41,
                "text": "Lev",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "MiniVU",
                "id": "16",
                "x": 227,
                "y": 40,
                "width": 6,
                "height": 15,
                "orientation": "vertical"
        },
        {
                "componentType": "TextField",
                "id": "18",
                "x": 92,
                "y": 17,
                "width": 40,
                "referenceElementId": 19
        },
        {
                "componentType": "Knob",
                "id": "19",
                "x": 113,
                "y": 35,
                "infoFunc": 184,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "20",
                "x": 92,
                "y": 34,
                "text": "Freq",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "22",
                "x": 83,
                "y": 5,
                "text": "Mid",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Line",
                "id": "23",
                "x": 50,
                "y": 14,
                "length": 82,
                "orientation": "Horizontal"
        },
        {
                "componentType": "ButtonFlat",
                "id": "24",
                "x": 137,
                "y": 44,
                "width": 20,
                "height": 12,
                "labels": [
                        "6k",
                        "8k",
                        "12k"
                ]
        },
        {
                "componentType": "ButtonFlat",
                "id": "25",
                "x": 4,
                "y": 44,
                "width": 20,
                "height": 12,
                "labels": [
                        "80",
                        "110",
                        "160"
                ]
        }
]
};
