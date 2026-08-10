// Автоматически сгенерированный модуль: WindSw
// Исходный файл: WindSw.js
// Версия: 206

export const WindSwModule = {
    type: 'WindSw',
        typeID: 85,
    defaultParams: [40, 80],
    displayName: 'WindSw',
    gridHeight: 2,
    originalName: 'WindSw',
    tooltip: 'Window Switch',
    components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 4,
                "y": 15,
                "jackType": "control",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextLabel",
                "id": "1",
                "x": 18,
                "y": 17,
                "text": "Ctrl",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Knob",
                "id": "2",
                "x": 105,
                "y": 5,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextField",
                "id": "3",
                "x": 77,
                "y": 12,
                "width": 25,
                "referenceElementId": 2
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 79,
                "y": 2,
                "text": "From",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Knob",
                "id": "5",
                "x": 157,
                "y": 5,
                "infoFunc": 16,
                "size": "medium"
        },
        {
                "componentType": "TextField",
                "id": "6",
                "x": 129,
                "y": 12,
                "width": 25,
                "referenceElementId": 5
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 136,
                "y": 2,
                "text": "To",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "8",
                "x": 210,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "9",
                "x": 240,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "SVG",
                "id": "10",
                "x": 218,
                "y": 6,
                "width": 23,
                "height": 16,
                "color": "#ffffff"
        },
        {
                "componentType": "Line",
                "id": "11",
                "x": 186,
                "y": 6,
                "length": 43,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Output",
                "id": "12",
                "x": 181,
                "y": 13,
                "jackType": "logic",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Line",
                "id": "13",
                "x": 186,
                "y": 6,
                "length": 10,
                "orientation": "Vertical"
        },
        {
                "componentType": "LED",
                "id": "14",
                "x": 198,
                "y": 15
        }
]
};
