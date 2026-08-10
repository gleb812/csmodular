// Автоматически сгенерированный модуль: LfoB
// Исходный файл: LfoB.js
// Версия: 231

export const LfoBModule = {
    type: 'LfoB',
        typeID: 190,
    defaultParams: [64, 0, 1, 0, 0, 0, 0, 1, 4, 0],
    displayName: 'LfoB',
    gridHeight: 4,
    originalName: 'LfoB',
    tooltip: 'LFO B',
    components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 45,
                "y": 44,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "0",
                "x": 59,
                "y": 37,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "3",
                "x": 48,
                "y": 47,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 28,
                "y": 44,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "5",
                "x": 87,
                "y": 35,
                "infoFunc": 61,
                "size": "medium"
        },
        {
                "componentType": "ButtonRadio",
                "id": "4",
                "x": 126,
                "y": 4,
                "buttonWidth": 18,
                "buttonCount": 4,
                "orientation": "horizontal",
                "labels": [
                        "1",
                        "2",
                        "3",
                        "4",
                        "5"
                ]
        },
        {
                "componentType": "Output",
                "id": "6",
                "x": 240,
                "y": 45,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "7",
                "x": 224,
                "y": 44,
                "width": 13,
                "text": "M"
        },
        {
                "componentType": "TextField",
                "id": "8",
                "x": 78,
                "y": 18,
                "width": 40,
                "referenceElementId": 5
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 143,
                "y": 23,
                "text": "Phase",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "LevelShift",
                "id": "10",
                "x": 206,
                "y": 44
        },
        {
                "componentType": "LED",
                "id": "11",
                "x": 242,
                "y": 36
        },
        {
                "componentType": "ButtonFlat",
                "id": "13",
                "x": 112,
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
                "id": "14",
                "x": 116,
                "y": 35,
                "text": "KBT",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "15",
                "x": 77,
                "y": 4,
                "width": 42,
                "height": 12,
                "labels": [
                        "Rate Sub",
                        "Rate Lo",
                        "Rate Hi",
                        "BPM",
                        "Clk"
                ]
        },
        {
                "componentType": "Graph",
                "id": "16",
                "x": 199,
                "y": 4,
                "width": 52,
                "height": 28
        },
        {
                "componentType": "Input",
                "id": "17",
                "x": 4,
                "y": 16,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Output",
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
                "componentType": "TextLabel",
                "id": "20",
                "x": 22,
                "y": 18,
                "text": "Rst",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "21",
                "x": 140,
                "y": 44,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "23",
                "x": 154,
                "y": 37,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "22",
                "x": 144,
                "y": 47,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Knob",
                "id": "25",
                "x": 176,
                "y": 35,
                "infoFunc": 163,
                "size": "medium"
        },
        {
                "componentType": "TextField",
                "id": "28",
                "x": 170,
                "y": 20,
                "width": 25,
                "referenceElementId": 25
        },
        {
                "componentType": "TextLabel",
                "id": "24",
                "x": 33,
                "y": 35,
                "text": "Rate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "26",
                "x": 4,
                "y": 36,
                "text": "Snc",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "27",
                "x": 43,
                "y": 19,
                "width": 30,
                "height": 12,
                "labels": [
                        "Poly",
                        "Mono"
                ]
        }
]
};
