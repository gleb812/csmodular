// Автоматически сгенерированный модуль: PCSend
// Исходный файл: PCSend.js
// Версия: 210

export const PCSendModule = {
    type: 'PCSend',
        typeID: 142,
    defaultParams: [0, 0],
    displayName: 'PCSend',
    gridHeight: 2,
    originalName: 'PCSend',
    tooltip: 'MIDI Program Change Send',
    components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 10,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextField",
                "id": "1",
                "x": 208,
                "y": 12,
                "width": 29,
                "referenceElementId": 1
        },
        {
                "componentType": "TextField",
                "id": "2",
                "x": 154,
                "y": 12,
                "width": 23,
                "referenceElementId": 5
        },
        {
                "componentType": "Knob",
                "id": "5",
                "x": 180,
                "y": 5,
                "infoFunc": 179,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 212,
                "y": 2,
                "text": "Chan",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "7",
                "x": 240,
                "y": 5,
                "infoFunc": 108
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 139,
                "y": 2,
                "text": "Program",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "10",
                "x": 65,
                "y": 15,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "11",
                "x": 140,
                "y": 15,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "14",
                "x": 23,
                "y": 17,
                "text": "Send",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "16",
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
                "id": "15",
                "x": 45,
                "y": 14,
                "width": 20,
                "height": 12,
                "color": "#ffffff"
        ,
        "svgSrc": "/svg/ctrsend_pcsend_automate.svg"}
]
};
