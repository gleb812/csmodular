// Автоматически сгенерированный модуль: RndPattern
// Исходный файл: RndPattern.js
// Версия: 238

export const RndPatternModule = {
    type: 'RndPattern',
        typeID: 208,
    mode: [0],
    defaultParams: [64, 64, 127, 15, 0, 0, 1],
    displayName: 'RndPattern',
    gridHeight: 3,
    originalName: 'RndPattern',
    tooltip: 'Random Pattern',
    components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 4,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Input",
                "id": "0",
                "x": 4,
                "y": 30,
                "jackType": "logic",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "3",
                "x": 240,
                "y": 30,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextLabel",
                "id": "2",
                "x": 22,
                "y": 18,
                "text": "Clk",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 22,
                "y": 32,
                "text": "Rst",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 80,
                "y": 3,
                "text": "pattern",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Knob",
                "id": "7",
                "x": 155,
                "y": 20,
                "infoFunc": 205,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 121,
                "y": 3,
                "text": "Step/",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "11",
                "x": 183,
                "y": 30,
                "infoFunc": 2
        },
        {
                "componentType": "TextField",
                "id": "10",
                "x": 183,
                "y": 13,
                "width": 21,
                "referenceElementId": 3
        },
        {
                "componentType": "TextLabel",
                "id": "13",
                "x": 183,
                "y": 3,
                "text": "Loop",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "12",
                "x": 65,
                "y": 13,
                "width": 22,
                "referenceElementId": 0
        },
        {
                "componentType": "TextLabel",
                "id": "15",
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
                "id": "14",
                "x": 17,
                "y": 30,
                "text": "⤒",
                "fontSize": 10,
                "color": "#ffffff",
                "align": "center",
                "valign": "middle",
                "originalType": "Symbol",
                "symbolType": "Trig 2",
                "width": 12
        },
        {
                "componentType": "Input",
                "id": "16",
                "x": 51,
                "y": 15,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonFlat",
                "id": "19",
                "x": 206,
                "y": 29,
                "width": 15,
                "height": 12
        },
        {
                "componentType": "ButtonText",
                "id": "20",
                "x": 224,
                "y": 29,
                "width": 13,
                "text": "M"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "23",
                "x": 89,
                "y": 15,
                "infoFunc": 17
        },
        {
                "componentType": "ButtonIncDec",
                "id": "24",
                "x": 89,
                "y": 30,
                "infoFunc": 17
        },
        {
                "componentType": "TextField",
                "id": "8",
                "x": 65,
                "y": 28,
                "width": 22,
                "referenceElementId": 1
        },
        {
                "componentType": "Input",
                "id": "9",
                "x": 51,
                "y": 30,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "PartSelector",
                "id": "26",
                "x": 208,
                "y": 4,
                "width": 43,
                "height": 20,
                "imageCount": 2,
                "menuOffset": 0
        },
        {
                "componentType": "TextField",
                "id": "25",
                "x": 147,
                "y": 4,
                "width": 32,
                "referenceElementId": 7
        },
        {
                "componentType": "TextLabel",
                "id": "18",
                "x": 43,
                "y": 17,
                "text": "A",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "21",
                "x": 44,
                "y": 32,
                "text": "B",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "22",
                "x": 121,
                "y": 12,
                "text": "Prob",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "27",
                "x": 117,
                "y": 29,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "28",
                "x": 131,
                "y": 22,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "29",
                "x": 120,
                "y": 32,
                "length": 22,
                "orientation": "Horizontal"
        }
]
};
