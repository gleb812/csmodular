// Автоматически сгенерированный модуль: FltVoice
// Исходный файл: FltVoice.js
// Версия: 208

export const FltVoiceModule = {
    type: 'FltVoice',
        typeID: 0,
    defaultParams: [0, 1, 2, 100, 64, 0, 64, 0, 64, 1],
    displayName: 'FltVoice',
    gridHeight: 4,
    originalName: 'FltVoice',
    tooltip: 'Filter Voice',
    components: [
        {
                "componentType": "Output",
                "id": "0",
                "x": 240,
                "y": 45,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "1",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "2",
                "x": 239,
                "y": 24,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Line",
                "id": "3",
                "x": 245,
                "y": 11,
                "length": 44,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "4",
                "x": 139,
                "y": 15,
                "width": 17,
                "referenceElementId": 1
        },
        {
                "componentType": "ButtonIncDec",
                "id": "5",
                "x": 157,
                "y": 12,
                "infoFunc": 78
        },
        {
                "componentType": "TextField",
                "id": "6",
                "x": 176,
                "y": 15,
                "width": 17,
                "referenceElementId": 2
        },
        {
                "componentType": "ButtonIncDec",
                "id": "7",
                "x": 194,
                "y": 12,
                "infoFunc": 78
        },
        {
                "componentType": "TextField",
                "id": "8",
                "x": 102,
                "y": 15,
                "width": 17,
                "referenceElementId": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "9",
                "x": 120,
                "y": 12,
                "infoFunc": 78
        },
        {
                "componentType": "Knob",
                "id": "10",
                "x": 164,
                "y": 33,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Knob",
                "id": "11",
                "x": 42,
                "y": 29,
                "infoFunc": 17,
                "size": "medium"
        },
        {
                "componentType": "Input",
                "id": "12",
                "x": 4,
                "y": 44,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "13",
                "x": 18,
                "y": 37,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "14",
                "x": 8,
                "y": 47,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextLabel",
                "id": "15",
                "x": 42,
                "y": 19,
                "text": "Freq",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Knob",
                "id": "17",
                "x": 70,
                "y": 29,
                "infoFunc": 17,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "18",
                "x": 73,
                "y": 19,
                "text": "Res",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "19",
                "x": 124,
                "y": 44,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "Knob",
                "id": "20",
                "x": 138,
                "y": 37,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "21",
                "x": 128,
                "y": 47,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Knob",
                "id": "22",
                "x": 215,
                "y": 14,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "23",
                "x": 213,
                "y": 4,
                "text": "Level",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "24",
                "x": 122,
                "y": 3,
                "text": "Vowel navigator",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Line",
                "id": "16",
                "x": 97,
                "y": 5,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "25",
                "x": 209,
                "y": 5,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "MiniVU",
                "id": "26",
                "x": 230,
                "y": 40,
                "width": 6,
                "height": 15,
                "orientation": "vertical"
        }
]
};
