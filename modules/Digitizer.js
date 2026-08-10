// Автоматически сгенерированный модуль: Digitizer
// Исходный файл: Digitizer.js
// Версия: 208

export const DigitizerModule = {
    type: 'Digitizer',
        typeID: 118,
    defaultParams: [11, 64, 0, 1],
    displayName: 'Digitizer',
    gridHeight: 3,
    originalName: 'Digitizer',
    tooltip: 'Digitizer',
    components: [
        {
                "componentType": "ButtonText",
                "id": "0",
                "x": 239,
                "y": 17,
                "width": 13,
                "text": "B"
        },
        {
                "componentType": "Output",
                "id": "1",
                "x": 240,
                "y": 30,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Line",
                "id": "5",
                "x": 245,
                "y": 11,
                "length": 21,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "6",
                "x": 180,
                "y": 27,
                "width": 23,
                "referenceElementId": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "7",
                "x": 206,
                "y": 20,
                "infoFunc": 195
        },
        {
                "componentType": "TextLabel",
                "id": "8",
                "x": 162,
                "y": 29,
                "text": "Bits",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "10",
                "x": 161,
                "y": 10,
                "text": "Quantization",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "11",
                "x": 11,
                "y": 29,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Knob",
                "id": "12",
                "x": 25,
                "y": 22,
                "infoFunc": 0,
                "size": "medium"
        },
        {
                "componentType": "Line",
                "id": "13",
                "x": 15,
                "y": 32,
                "length": 22,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Knob",
                "id": "14",
                "x": 131,
                "y": 20,
                "infoFunc": 88,
                "size": "medium"
        },
        {
                "componentType": "TextLabel",
                "id": "15",
                "x": 85,
                "y": 10,
                "text": "Sample Rate",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextField",
                "id": "16",
                "x": 84,
                "y": 27,
                "width": 44,
                "referenceElementId": 14
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 4,
                "y": 19,
                "text": "Rate",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
