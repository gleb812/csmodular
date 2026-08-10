// Автоматически сгенерированный модуль: SwOnOffT
// Исходный файл: SwOnOffT.js
// Версия: 206

export const SwOnOffTModule = {
    type: 'SwOnOffT',
        typeID: 76,
    displayName: 'SwOnOffT',
    gridHeight: 2,
    originalName: 'SwOnOffT',
    tooltip: 'Switch On/Off Toggling',
    components: [
        {
                "componentType": "Input",
                "id": "0",
                "x": 210,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "1",
                "x": 240,
                "y": 13,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "Output",
                "id": "3",
                "x": 4,
                "y": 15,
                "jackType": "control",
                "bandwidth": "static"
        },
        {
                "componentType": "TextField",
                "id": "4",
                "x": 18,
                "y": 13,
                "width": 17,
                "referenceElementId": 0
        },
        {
                "componentType": "TextLabel",
                "id": "5",
                "x": 38,
                "y": 16,
                "text": "Ctrl",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "SVG",
                "id": "8",
                "x": 218,
                "y": 6,
                "width": 23,
                "height": 16,
                "color": "#ffffff"
        ,
        "svgSrc": "/svg/SW_onoffM_T.svg"},
        {
                "componentType": "Line",
                "id": "7",
                "x": 173,
                "y": 5,
                "length": 56,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "9",
                "x": 173,
                "y": 5,
                "length": 5,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextEdit",
                "id": "2",
                "x": 152,
                "y": 10,
                "width": 43,
                "text": "On"
        }
]
};
