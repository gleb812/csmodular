// Автоматически сгенерированный модуль: CtrlRcv
// Исходный файл: CtrlRcv.js
// Версия: 210

export const CtrlRcvModule = {
    type: 'CtrlRcv',
        typeID: 147,
    defaultParams: [7, 0],
    displayName: 'CtrlRcv',
    gridHeight: 2,
    originalName: 'CtrlRcv',
    tooltip: 'MIDI Control Receive',
    components: [
        {
                "componentType": "TextField",
                "id": "0",
                "x": 139,
                "y": 12,
                "width": 29,
                "referenceElementId": 1
        },
        {
                "componentType": "TextField",
                "id": "1",
                "x": 95,
                "y": 12,
                "width": 20,
                "referenceElementId": 0
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 143,
                "y": 2,
                "text": "Chan",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "5",
                "x": 171,
                "y": 5,
                "infoFunc": 109
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 97,
                "y": 2,
                "text": "Ctrl",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "7",
                "x": 118,
                "y": 5,
                "infoFunc": 179
        },
        {
                "componentType": "Output",
                "id": "2",
                "x": 240,
                "y": 13,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "3",
                "x": 239,
                "y": 3,
                "text": "Val",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "8",
                "x": 210,
                "y": 13,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 207,
                "y": 3,
                "text": "Rcv",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
