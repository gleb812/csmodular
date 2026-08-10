// Автоматически сгенерированный модуль: Reverb
// Исходный файл: Reverb.js
// Версия: 208

export const ReverbModule = {
    type: 'Reverb',
        typeID: 12,
    mode: [0],
    defaultParams: [64, 64, 64, 1],
    displayName: 'Reverb',
    gridHeight: 3,
    originalName: 'Reverb',
    tooltip: 'Reverb',
    components: [
        {
                "componentType": "Knob",
                "id": "0",
                "x": 94,
                "y": 20,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "1",
                "x": 80,
                "y": 10,
                "text": "Time",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "2",
                "x": 56,
                "y": 27,
                "width": 35,
                "referenceElementId": 0
        },
        {
                "componentType": "Knob",
                "id": "9",
                "x": 149,
                "y": 20,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 120,
                "y": 10,
                "text": "Brightness",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "11",
                "x": 120,
                "y": 27,
                "width": 26,
                "referenceElementId": 9
        },
        {
                "componentType": "Knob",
                "id": "12",
                "x": 180,
                "y": 20,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "PartSelector",
                "id": "13",
                "x": 4,
                "y": 27,
                "width": 50,
                "height": 14,
                "imageCount": 4,
                "menuOffset": 0
        },
        {
                "componentType": "TextLabel",
                "id": "14",
                "x": 4,
                "y": 17,
                "text": "Type",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "15",
                "x": 220,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Input",
                "id": "16",
                "x": 220,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "ButtonText",
                "id": "17",
                "x": 204,
                "y": 29,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Output",
                "id": "19",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "TextLabel",
                "id": "20",
                "x": 234,
                "y": 6,
                "text": "R",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "21",
                "x": 214,
                "y": 6,
                "text": "L",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "23",
                "x": 171,
                "y": 10,
                "text": "Dry/Wet",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "3",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "static"
        },
        {
                "componentType": "Line",
                "id": "8",
                "x": 225,
                "y": 11,
                "length": 20,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "24",
                "x": 245,
                "y": 12,
                "length": 20,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "4",
                "x": 196,
                "y": 34,
                "length": 16,
                "orientation": "Horizontal"
        }
]
};
