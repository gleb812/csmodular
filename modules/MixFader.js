// Автоматически сгенерированный модуль: MixFader
// Исходный файл: MixFader.js
// Версия: 210

export const MixFaderModule = {
    type: 'MixFader',
        typeID: 161,
    defaultParams: [100, 100, 100, 100, 100, 100, 100, 100, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    displayName: 'MixFader',
    gridHeight: 9,
    originalName: 'MixFader',
    tooltip: 'Mixer 8-1 Fader',
    components: [
        {
                "componentType": "Slider",
                "id": "0",
                "x": 12,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "TextEdit",
                "id": "1",
                "x": 4,
                "y": 117,
                "width": 27,
                "text": "Ch1"
        },
        {
                "componentType": "Input",
                "id": "2",
                "x": 12,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "3",
                "x": 4,
                "y": 37,
                "width": 28,
                "referenceElementId": 0
        },
        {
                "componentType": "Input",
                "id": "4",
                "x": 41,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "5",
                "x": 33,
                "y": 37,
                "width": 28,
                "referenceElementId": 18
        },
        {
                "componentType": "Input",
                "id": "6",
                "x": 70,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "7",
                "x": 62,
                "y": 37,
                "width": 28,
                "referenceElementId": 19
        },
        {
                "componentType": "Input",
                "id": "8",
                "x": 99,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "9",
                "x": 91,
                "y": 37,
                "width": 28,
                "referenceElementId": 20
        },
        {
                "componentType": "Input",
                "id": "10",
                "x": 128,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "11",
                "x": 120,
                "y": 37,
                "width": 28,
                "referenceElementId": 21
        },
        {
                "componentType": "Input",
                "id": "12",
                "x": 157,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "13",
                "x": 149,
                "y": 37,
                "width": 28,
                "referenceElementId": 22
        },
        {
                "componentType": "Input",
                "id": "14",
                "x": 186,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "15",
                "x": 178,
                "y": 37,
                "width": 28,
                "referenceElementId": 23
        },
        {
                "componentType": "Input",
                "id": "16",
                "x": 215,
                "y": 22,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextField",
                "id": "17",
                "x": 207,
                "y": 37,
                "width": 28,
                "referenceElementId": 24
        },
        {
                "componentType": "Slider",
                "id": "18",
                "x": 41,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "Slider",
                "id": "19",
                "x": 70,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "Slider",
                "id": "20",
                "x": 99,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "Slider",
                "id": "21",
                "x": 128,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "Slider",
                "id": "22",
                "x": 157,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "Slider",
                "id": "23",
                "x": 186,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "Slider",
                "id": "24",
                "x": 215,
                "y": 53,
                "infoFunc": 0,
                "width": 10,
                "height": 60
        },
        {
                "componentType": "Output",
                "id": "25",
                "x": 240,
                "y": 120,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "TextEdit",
                "id": "26",
                "x": 33,
                "y": 117,
                "width": 27,
                "text": "Ch2"
        },
        {
                "componentType": "TextEdit",
                "id": "27",
                "x": 62,
                "y": 117,
                "width": 27,
                "text": "Ch3"
        },
        {
                "componentType": "TextEdit",
                "id": "28",
                "x": 91,
                "y": 117,
                "width": 27,
                "text": "Ch4"
        },
        {
                "componentType": "TextEdit",
                "id": "29",
                "x": 120,
                "y": 117,
                "width": 27,
                "text": "Ch5"
        },
        {
                "componentType": "TextEdit",
                "id": "30",
                "x": 149,
                "y": 117,
                "width": 27,
                "text": "Ch6"
        },
        {
                "componentType": "TextEdit",
                "id": "31",
                "x": 178,
                "y": 117,
                "width": 27,
                "text": "Ch7"
        },
        {
                "componentType": "TextEdit",
                "id": "32",
                "x": 207,
                "y": 117,
                "width": 27,
                "text": "Ch8"
        },
        {
                "componentType": "TextLabel",
                "id": "33",
                "x": 237,
                "y": 92,
                "text": "Out",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "37",
                "x": 209,
                "y": 24,
                "text": "8",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "38",
                "x": 180,
                "y": 24,
                "text": "7",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "39",
                "x": 151,
                "y": 24,
                "text": "6",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "40",
                "x": 122,
                "y": 24,
                "text": "5",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "41",
                "x": 93,
                "y": 24,
                "text": "4",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "42",
                "x": 64,
                "y": 24,
                "text": "3",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "43",
                "x": 35,
                "y": 24,
                "text": "2",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "44",
                "x": 7,
                "y": 24,
                "text": "1",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "MiniVU",
                "id": "45",
                "x": 242,
                "y": 102,
                "width": 6,
                "height": 15,
                "orientation": "vertical"
        },
        {
                "componentType": "TextLabel",
                "id": "46",
                "x": 216,
                "y": 5,
                "text": "Chain",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "47",
                "x": 240,
                "y": 4,
                "jackType": "audio",
                "bandwidth": "dynamic"
        },
        {
                "componentType": "ButtonFlat",
                "id": "35",
                "x": 90,
                "y": 4,
                "width": 25,
                "height": 12,
                "labels": [
                        "Exp",
                        "Lin",
                        "dB"
                ]
        },
        {
                "componentType": "ButtonFlat",
                "id": "48",
                "x": 177,
                "y": 4,
                "width": 30,
                "height": 12,
                "labels": [
                        "0dB",
                        "-6dB",
                        "-12dB"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "34",
                "x": 159,
                "y": 6,
                "text": "Pad",
                "fontSize": 9,
                "color": "#ffffff"
        }
]
};
