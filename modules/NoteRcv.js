// Автоматически сгенерированный модуль: NoteRcv
// Исходный файл: NoteRcv.js
// Версия: 210

export const NoteRcvModule = {
    type: 'NoteRcv',
        typeID: 148,
    defaultParams: [64, 0],
    displayName: 'NoteRcv',
    gridHeight: 2,
    originalName: 'NoteRcv',
    tooltip: 'MIDI Note Receive',
    components: [
        {
                "componentType": "TextField",
                "id": "0",
                "x": 79,
                "y": 12,
                "width": 26,
                "referenceElementId": 1
        },
        {
                "componentType": "Knob",
                "id": "1",
                "x": 108,
                "y": 5,
                "infoFunc": 13,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "2",
                "x": 82,
                "y": 2,
                "text": "Note",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "3",
                "x": 210,
                "y": 13,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 209,
                "y": 3,
                "text": "Vel",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "5",
                "x": 188,
                "y": 13,
                "jackType": "logic",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "6",
                "x": 185,
                "y": 3,
                "text": "Gate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "7",
                "x": 139,
                "y": 12,
                "width": 29,
                "referenceElementId": 1
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 143,
                "y": 2,
                "text": "Chan",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "9",
                "x": 171,
                "y": 5,
                "infoFunc": 109
        },
        {
                "componentType": "Output",
                "id": "11",
                "x": 232,
                "y": 13,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "12",
                "x": 225,
                "y": 3,
                "text": "RelVel",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
