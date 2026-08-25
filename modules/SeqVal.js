// Автоматически сгенерированный модуль: SeqVal
    // Исходный файл: SeqVal.js
    // Версия: 210

    export const SeqValModule = {
        type: 'SeqVal',
            typeID: 145,
        displayName: 'SeqVal',
        gridHeight: 8,
        originalName: 'SeqVal',
        tooltip: 'Sequencer Values',
        inputs: [0, 1, 3, 5, 82, 115],
        outputs: [8, 58, 114],
        components: [
        {
                "componentType": "Input",
                "id": "1",
                "x": 4,
                "y": 25,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Clk",
                "ConnectorIndex": 0
        },
        {
                "componentType": "Input",
                "id": "0",
                "x": 4,
                "y": 47,
                "jackType": "logic",
                "bandwidth": "static",
                "ConnectorName": "Rst",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Input",
                "id": "3",
                "x": 4,
                "y": 69,
                "jackType": "logic",
                "bandwidth": "static",
                "ConnectorName": "Loop",
                "ConnectorIndex": 2
        },
        {
                "componentType": "TextLabel",
                "id": "2",
                "x": 4,
                "y": 16,
                "text": "Clk",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "4",
                "x": 4,
                "y": 38,
                "text": "Rst",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "5",
                "x": 204,
                "y": 4,
                "jackType": "logic",
                "bandwidth": "static",
                "ConnectorName": "Park",
                "ConnectorIndex": 3
        },
        {
                "componentType": "LED",
                "id": "6",
                "x": 242,
                "y": 7
        },
        {
                "componentType": "TextLabel",
                "id": "7",
                "x": 218,
                "y": 6,
                "text": "Park",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Output",
                "id": "8",
                "x": 240,
                "y": 26,
                "jackType": "logic",
                "bandwidth": "static",
                "ConnectorName": "Link",
                "ConnectorIndex": 0
        },
        {
                "componentType": "TextLabel",
                "id": "9",
                "x": 234,
                "y": 17,
                "text": "Link",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonText",
                "id": "26",
                "x": 29,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "29",
                "x": 41,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "28",
                "x": 65,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "31",
                "x": 53,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "30",
                "x": 77,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "33",
                "x": 89,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "32",
                "x": 113,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "35",
                "x": 101,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "34",
                "x": 125,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "37",
                "x": 137,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "36",
                "x": 161,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "39",
                "x": 149,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "38",
                "x": 173,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "41",
                "x": 185,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "40",
                "x": 209,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "ButtonText",
                "id": "43",
                "x": 197,
                "y": 104,
                "width": 12,
                "text": ""
        },
        {
                "componentType": "LED",
                "id": "42",
                "x": 29,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "45",
                "x": 41,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "44",
                "x": 53,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "47",
                "x": 65,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "46",
                "x": 173,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "49",
                "x": 185,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "48",
                "x": 197,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "51",
                "x": 209,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "50",
                "x": 125,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "53",
                "x": 137,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "52",
                "x": 149,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "55",
                "x": 161,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "54",
                "x": 77,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "57",
                "x": 89,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "56",
                "x": 101,
                "y": 35
        },
        {
                "componentType": "LED",
                "id": "59",
                "x": 113,
                "y": 35
        },
        {
                "componentType": "Output",
                "id": "58",
                "x": 240,
                "y": 105,
                "jackType": "logic",
                "bandwidth": "dynamic",
                "ConnectorName": "Trig",
                "ConnectorIndex": 2
        },
        {
                "componentType": "Line",
                "id": "60",
                "x": 218,
                "y": 110,
                "length": 26,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextLabel",
                "id": "62",
                "x": 17,
                "y": 48,
                "text": "⤒",
                "fontSize": 10,
                "color": "#ffffff",
                "align": "center",
                "valign": "middle",
                "originalType": "Symbol",
                "symbolType": "Trig 2",
                "width": 12
        },
        {
                "componentType": "TextLabel",
                "id": "65",
                "x": 33,
                "y": 25,
                "text": "1",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "64",
                "x": 44,
                "y": 25,
                "text": "2",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "67",
                "x": 56,
                "y": 25,
                "text": "3",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "66",
                "x": 68,
                "y": 25,
                "text": "4",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "69",
                "x": 80,
                "y": 25,
                "text": "5",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "68",
                "x": 92,
                "y": 25,
                "text": "6",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "71",
                "x": 104,
                "y": 25,
                "text": "7",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "70",
                "x": 116,
                "y": 25,
                "text": "8",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "73",
                "x": 128,
                "y": 25,
                "text": "9",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "72",
                "x": 139,
                "y": 25,
                "text": "10",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "75",
                "x": 152,
                "y": 25,
                "text": "11",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "74",
                "x": 163,
                "y": 25,
                "text": "12",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "77",
                "x": 175,
                "y": 25,
                "text": "13",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "76",
                "x": 187,
                "y": 25,
                "text": "14",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "79",
                "x": 199,
                "y": 25,
                "text": "15",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "TextLabel",
                "id": "78",
                "x": 211,
                "y": 25,
                "text": "16",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "81",
                "x": 145,
                "y": 4,
                "infoFunc": 2
        },
        {
                "componentType": "TextField",
                "id": "80",
                "x": 167,
                "y": 4,
                "width": 16,
                "referenceElementId": 33
        },
        {
                "componentType": "TextLabel",
                "id": "83",
                "x": 114,
                "y": 6,
                "text": "Length",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "Input",
                "id": "82",
                "x": 4,
                "y": 105,
                "jackType": "logic",
                "bandwidth": "static",
                "ConnectorName": "Trig",
                "ConnectorIndex": 5
        },
        {
                "componentType": "Line",
                "id": "84",
                "x": 9,
                "y": 110,
                "length": 26,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextField",
                "id": "86",
                "x": 24,
                "y": 45,
                "width": 21,
                "referenceElementId": 0
        },
        {
                "componentType": "TextField",
                "id": "88",
                "x": 36,
                "y": 62,
                "width": 21,
                "referenceElementId": 1
        },
        {
                "componentType": "TextField",
                "id": "89",
                "x": 48,
                "y": 45,
                "width": 21,
                "referenceElementId": 2
        },
        {
                "componentType": "Line",
                "id": "90",
                "x": 58,
                "y": 38,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "11",
                "x": 46,
                "y": 38,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "12",
                "x": 34,
                "y": 38,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "ButtonIncDec",
                "id": "13",
                "x": 29,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "14",
                "x": 41,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "15",
                "x": 53,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "16",
                "x": 65,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "17",
                "x": 77,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "18",
                "x": 89,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "19",
                "x": 101,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "20",
                "x": 113,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "21",
                "x": 125,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "22",
                "x": 137,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "23",
                "x": 149,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "24",
                "x": 161,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "25",
                "x": 173,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "27",
                "x": 185,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "61",
                "x": 197,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "ButtonIncDec",
                "id": "63",
                "x": 209,
                "y": 79,
                "infoFunc": 0
        },
        {
                "componentType": "TextField",
                "id": "85",
                "x": 60,
                "y": 62,
                "width": 21,
                "referenceElementId": 3
        },
        {
                "componentType": "TextField",
                "id": "87",
                "x": 72,
                "y": 45,
                "width": 21,
                "referenceElementId": 4
        },
        {
                "componentType": "Line",
                "id": "91",
                "x": 82,
                "y": 38,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "92",
                "x": 70,
                "y": 38,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "93",
                "x": 84,
                "y": 62,
                "width": 21,
                "referenceElementId": 5
        },
        {
                "componentType": "TextField",
                "id": "94",
                "x": 96,
                "y": 45,
                "width": 21,
                "referenceElementId": 6
        },
        {
                "componentType": "Line",
                "id": "95",
                "x": 106,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "96",
                "x": 94,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "97",
                "x": 108,
                "y": 62,
                "width": 21,
                "referenceElementId": 7
        },
        {
                "componentType": "TextField",
                "id": "98",
                "x": 120,
                "y": 45,
                "width": 21,
                "referenceElementId": 8
        },
        {
                "componentType": "Line",
                "id": "99",
                "x": 130,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "100",
                "x": 118,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "101",
                "x": 132,
                "y": 62,
                "width": 21,
                "referenceElementId": 9
        },
        {
                "componentType": "TextField",
                "id": "102",
                "x": 144,
                "y": 45,
                "width": 21,
                "referenceElementId": 10
        },
        {
                "componentType": "Line",
                "id": "103",
                "x": 154,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "104",
                "x": 142,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "105",
                "x": 156,
                "y": 62,
                "width": 21,
                "referenceElementId": 11
        },
        {
                "componentType": "TextField",
                "id": "106",
                "x": 168,
                "y": 45,
                "width": 21,
                "referenceElementId": 12
        },
        {
                "componentType": "Line",
                "id": "107",
                "x": 178,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "108",
                "x": 166,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "109",
                "x": 180,
                "y": 62,
                "width": 21,
                "referenceElementId": 13
        },
        {
                "componentType": "TextField",
                "id": "110",
                "x": 192,
                "y": 45,
                "width": 21,
                "referenceElementId": 14
        },
        {
                "componentType": "Line",
                "id": "111",
                "x": 202,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Line",
                "id": "112",
                "x": 190,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "TextField",
                "id": "113",
                "x": 204,
                "y": 62,
                "width": 21,
                "referenceElementId": 15
        },
        {
                "componentType": "Line",
                "id": "116",
                "x": 214,
                "y": 39,
                "length": 50,
                "orientation": "Vertical"
        },
        {
                "componentType": "Output",
                "id": "114",
                "x": 240,
                "y": 84,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "Val",
                "ConnectorIndex": 1
        },
        {
                "componentType": "Input",
                "id": "115",
                "x": 4,
                "y": 84,
                "jackType": "control",
                "bandwidth": "dynamic",
                "ConnectorName": "Val",
                "ConnectorIndex": 4
        },
        {
                "componentType": "Line",
                "id": "117",
                "x": 8,
                "y": 89,
                "length": 28,
                "orientation": "Horizontal"
        },
        {
                "componentType": "Line",
                "id": "118",
                "x": 220,
                "y": 89,
                "length": 21,
                "orientation": "Horizontal"
        },
        {
                "componentType": "TextLabel",
                "id": "119",
                "x": 4,
                "y": 60,
                "text": "Loop",
                "fontSize": 9,
                "color": "#ffffff"
        },
        {
                "componentType": "ButtonText",
                "id": "122",
                "x": 231,
                "y": 55,
                "width": 20,
                "text": "Rnd"
        },
        {
                "componentType": "ButtonText",
                "id": "123",
                "x": 231,
                "y": 41,
                "width": 20,
                "text": "Clr"
        },
        {
                "componentType": "ButtonFlat",
                "id": "124",
                "x": 87,
                "y": 4,
                "width": 20,
                "height": 12
        },
        {
                "componentType": "ButtonFlat",
                "id": "10",
                "x": 223,
                "y": 104,
                "width": 13,
                "height": 12,
                "labels": [
                        "T",
                        "G"
                ]
        },
        {
                "componentType": "ButtonFlat",
                "id": "120",
                "x": 231,
                "y": 69,
                "width": 20,
                "height": 12,
                "labels": [
                        "BiP",
                        "Uni"
                ]
        },
        {
                "componentType": "TextLabel",
                "id": "121",
                "x": 17,
                "y": 70,
                "text": "⤒",
                "fontSize": 10,
                "color": "#ffffff",
                "align": "center",
                "valign": "middle",
                "originalType": "Symbol",
                "symbolType": "Trig 2",
                "width": 12
        },
        {
                "componentType": "TextLabel",
                "id": "125",
                "x": 199,
                "y": 5,
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
                "componentType": "TextLabel",
                "id": "126",
                "x": 17,
                "y": 26,
                "text": "↑",
                "fontSize": 10,
                "color": "#ffffff",
                "align": "center",
                "valign": "middle",
                "originalType": "Symbol",
                "symbolType": "Trig 1",
                "width": 9
        }
]
    };
    