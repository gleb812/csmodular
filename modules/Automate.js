// Автоматически сгенерированный модуль: Automate
// Исходный файл: Automate.js
// Версия: 210

export const AutomateModule = {
    type: 'Automate',
        typeID: 57,
    defaultParams: [7, 64, 0, 0],
    displayName: 'Automate',
    gridHeight: 2,
    originalName: 'Automate',
    tooltip: 'MIDI Control Automate',
    components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 10,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextField",
                "id": "0",
                "x": 208,
                "y": 12,
                "width": 29,
                "referenceElementId": 2
        },
        {
                "componentType": "TextField",
                "id": "2",
                "x": 108,
                "y": 12,
                "width": 23,
                "referenceElementId": 0
        },
        {
                "componentType": "TextField",
                "id": "3",
                "x": 154,
                "y": 12,
                "width": 23,
                "referenceElementId": 4
        },
        {
                "componentType": "Knob",
                "id": "4",
                "x": 180,
                "y": 5,
                "infoFunc": 179,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 212,
                "y": 2,
                "text": "Chan",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "6",
                "x": 240,
                "y": 5,
                "infoFunc": 108
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 111,
                "y": 2,
                "text": "Ctrl",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "8",
                "x": 134,
                "y": 5,
                "infoFunc": 179
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 154,
                "y": 2,
                "text": "Value",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "11",
                "x": 65,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "12",
                "x": 24,
                "y": 17,
                "text": "Send",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "15",
                "x": 4,
                "y": 15,
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
                "componentType": "SVG",
                "id": "16",
                "x": 46,
                "y": 14,
                "width": 20,
                "height": 12,
                "color": "#ffffff"
        ,
        "svgSrc": "/svg/ctrsend_pcsend_automate.svg"},
        {
                "componentType": "ButtonFlat",
                "id": "13",
                "x": 81,
                "y": 14,
                "width": 20,
                "height": 12,
                "labels": [
                        "Off",
                        "On"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "17",
                "x": 81,
                "y": 3,
                "text": "Echo",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
