// Автоматически сгенерированный модуль: ClkDiv
    // Исходный файл: ClkDiv.js
    // Версия: 208

    export const ClkDivModule = {
        type: 'ClkDiv',
            typeID: 69,
    mode: [0],
    defaultParams: [0],
        displayName: 'ClkDiv',
        gridHeight: 2,
        originalName: 'ClkDiv',
        tooltip: 'Clock Divider',
        inputs: [0, 3],
        outputs: [9],
        components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 78,
                "y": 11,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Clk",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "2",
                "x": 97,
                "y": 13,
                "text": "Clk",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "3",
                "x": 116,
                "y": 11,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Reset",
                "ConnectorIndex": 1
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 135,
                "y": 13,
                "text": "Rst",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "1",
                "x": 129,
                "y": 11,
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
                "componentType": "TextField",
                "id": "6",
                "x": 162,
                "y": 12,
                "width": 21,
                "referenceElementId": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "7",
                "x": 186,
                "y": 5,
                "infoFunc": 2
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 155,
                "y": 3,
                "text": "Divider",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "9",
                "x": 240,
                "y": 11,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Out",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 91,
                "y": 12,
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
                "componentType": "PartSelector",
                "id": "10",
                "x": 208,
                "y": 4,
                "width": 29,
                "height": 22,
                "imageCount": 2,
                "menuOffset": 0
        }
]
    };
    