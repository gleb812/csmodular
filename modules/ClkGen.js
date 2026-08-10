// Автоматически сгенерированный модуль: ClkGen
// Исходный файл: ClkGen.js
// Версия: 203

export const ClkGenModule = {
    type: 'ClkGen',
        typeID: 68,
    defaultParams: [64, 1, 0, 2, 0],
    displayName: 'ClkGen',
    gridHeight: 4,
    originalName: 'ClkGen',
    tooltip: 'Clock Generator',
    components: [
        {
                "componentType": "TextField",
                "id": "2",
                "x": 86,
                "y": 15,
                "width": 58,
                "referenceElementId": 3
        },
        {
                "componentType": "Knob",
                "id": "3",
                "x": 150,
                "y": 6,
                "infoFunc": 45,
                "size": "medium"
        },
        {
                "componentType": "ButtonText",
                "id": "5",
                "x": 176,
                "y": 17,
                "width": 13,
                "text": "On"
        },
        {
                "componentType": "Output",
                "id": "6",
                "x": 240,
                "y": 17,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "Output",
                "id": "7",
                "x": 240,
                "y": 31,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "Output",
                "id": "8",
                "x": 240,
                "y": 3,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 220,
                "y": 19,
                "text": "1/96",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 222,
                "y": 33,
                "text": "1/16",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "11",
                "x": 192,
                "y": 5,
                "text": "Clk Active",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "12",
                "x": 100,
                "y": 5,
                "text": "Tempo",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "16",
                "x": 240,
                "y": 45,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "17",
                "x": 216,
                "y": 47,
                "text": "Sync",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "1",
                "x": 88,
                "y": 41,
                "text": "Sync every",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "13",
                "x": 140,
                "y": 39,
                "width": 22,
                "referenceElementId": 3
        },
        {
                "componentType": "ButtonIncDec",
                "id": "18",
                "x": 165,
                "y": 35,
                "infoFunc": 166
        },
        {
                "componentType": "TextLabel",
                "id": "19",
                "x": 179,
                "y": 42,
                "text": "beats",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "0",
                "x": 11,
                "y": 35,
                "text": "Source",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "4",
                "x": 4,
                "y": 44,
                "width": 42,
                "height": 12,
                "labels": [
                        "Internal",
                        "Master"
                ]
        },
        {
                "componentType": "Input",
                "id": "14",
                "x": 4,
                "y": 16,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "15",
                "x": 22,
                "y": 19,
                "text": "Reset",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "20",
                "x": 17,
                "y": 17,
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
                "componentType": "Knob",
                "id": "21",
                "x": 57,
                "y": 35,
                "infoFunc": 190,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "22",
                "x": 55,
                "y": 25,
                "text": "Swing",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
