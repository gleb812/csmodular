// Автоматически сгенерированный модуль: RndClkA
    // Исходный файл: RndClkA.js
    // Версия: 238

    export const RndClkAModule = {
        type: 'RndClkA',
            typeID: 204,
    defaultParams: [127, 0, 0, 0, 1],
        displayName: 'RndClkA',
        gridHeight: 2,
        originalName: 'RndClkA',
        tooltip: 'Random Clock A',
        inputs: [1, 10, 14],
        outputs: [3],
        components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 4,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Clk",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "0",
                "x": 22,
                "y": 17,
                "text": "Clk",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "3",
                "x": 240,
                "y": 15,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 198,
                "y": 5,
                "infoFunc": 205,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 170,
                "y": 2,
                "text": "Step",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonFlat",
                "id": "5",
                "x": 36,
                "y": 14,
                "width": 30,
                "height": 12,
                "labels": [
                        "Poly",
                        "Mono"
                ]
        },
        {
                "componentType": "ButtonText",
                "id": "6",
                "x": 239,
                "y": 2,
                "width": 13,
                "text": "M"
        },
        {
                "componentType": "TextLabel",
                "id": "8",
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
                "componentType": "ButtonFlat",
                "id": "7",
                "x": 222,
                "y": 14,
                "width": 15,
                "height": 12
        },
        {
                "componentType": "TextEdit",
                "id": "9",
                "x": 122,
                "y": 8,
                "width": 38,
                "text": "Dice"
        },
        {
                "componentType": "TextField",
                "id": "11",
                "x": 163,
                "y": 12,
                "width": 32,
                "referenceElementId": 2
        },
        {
                "componentType": "Input",
                "id": "10",
                "x": 68,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Rst",
                "ConnectorIndex": 1
        },
        {
                "componentType": "TextLabel",
                "id": "13",
                "x": 86,
                "y": 17,
                "text": "Rst",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "12",
                "x": 81,
                "y": 16,
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
                "id": "14",
                "x": 103,
                "y": 14,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "Seed",
                "ConnectorIndex": 2
        },
        {
                "componentType": "TextLabel",
                "id": "15",
                "x": 98,
                "y": 4,
                "text": "Seed",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
    };
    