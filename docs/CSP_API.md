# CsPanels HTTP + OSC API (csp-bridge)

Локальный мост: HTTP + WebSocket + UDP OSC in/out.

## Запуск

    cd bridge
    npm install
    npm start

Слушает:
- HTTP + WS: `http://127.0.0.1:8765` / `ws://127.0.0.1:8765/ws`
- OSC in : `udp://0.0.0.0:9000`  (настраивается)
- OSC out: `udp://127.0.0.1:9001` (настраивается)

В браузере UI подключается к `ws://127.0.0.1:8765/ws` автоматически
(URL можно поменять в настройках OSC — кнопка **OSC** в BottomBar).

## Как это работает

- REST `POST /csp/...` → мост ставит команду в очередь → по WS рассылает
  `{type:'csp-cmd', cmd:'...', args:{...}}` всем подключённым UI →
  UI выполняет действие (добавить модуль, пересоздать патч, и т.д.).
- OSC-пакет на `udp://<хост>:9000` → мост → WS `{type:'osc', address, args, from}`
  → UI (мигает лампочка OSC, история). Параллельно известные адреса
  (`/csp/...`) маппятся в те же `csp-cmd`, что и REST.
- UI шлёт `{type:'osc-out', address, args}` по WS → мост → `udp://<outHost>:<outPort>`.

## REST

Все `POST` принимают JSON, возвращают `{ok:true, queued:N}`.

### System
| Method | Path | Body | Описание |
|---|---|---|---|
| GET  | /csp/ping              | — | проверка моста |
| GET  | /csp/osc/config        | — | текущие порты |
| POST | /csp/osc/config        | `{inPort, outPort?, outHost?}` | применить порты |

### Main
| Method | Path | Body | Описание |
|---|---|---|---|
| POST | /csp/main/reset         | — | полный сброс (patch + Csound + MIDI) |
| POST | /csp/main/new           | — | новый пустой патч |
| POST | /csp/main/save          | `{filename?}` | сохранить патч |
| POST | /csp/main/load          | `{filename?}` | загрузить патч |
| POST | /csp/main/csound/start  | — | запустить Csound |
| POST | /csp/main/csound/stop   | — | остановить Csound |

### Modules
| POST | /csp/module/add    | `{type, layer?}` |
| POST | /csp/module/remove | `{id}` |
| POST | /csp/module/move   | `{id, gridX, gridY}` |
| POST | /csp/module/layer  | `{id, layer}` (`voice`/`fx`) |

### Cables
| POST | /csp/cable/connect | `{fromId, fromJack, toId, toJack}` |
| POST | /csp/cable/remove  | `{cableId}` |

### Исходящие MIDI / OSC
| POST | /csp/midi/send | `{status, data1, data2}` |
| POST | /csp/osc/send  | `{address, args:[...]}` |

## OSC-адреса (входящие на мост)

    /csp/main/reset
    /csp/main/new
    /csp/main/csound/start
    /csp/main/csound/stop
    /csp/module/add   <type:s> [layer:s]
    /csp/midi/send    <status:i> <data1:i> <data2:i>
    /csp/osc/send     <address:s> <arg...>

Любой другой OSC-адрес тоже принимается — он просто попадает в историю UI
и не вызывает действий. Это позволяет «поймать» событие из TouchOSC и
потом связать его в будущем (OSC-роутинг — TODO).

## Примеры

    # 1. Новый патч
    curl -X POST http://127.0.0.1:8765/csp/main/new

    # 2. Добавить VCO в voice-слой
    curl -X POST http://127.0.0.1:8765/csp/module/add \
         -H 'Content-Type: application/json' \
         -d '{"type":"VCO","layer":"voice"}'

    # 3. Послать MIDI Note On
    curl -X POST http://127.0.0.1:8765/csp/midi/send \
         -H 'Content-Type: application/json' \
         -d '{"status":144,"data1":60,"data2":100}'

    # 4. Отправить OSC-сообщение на внешнее устройство
    curl -X POST http://127.0.0.1:8765/csp/osc/send \
         -H 'Content-Type: application/json' \
         -d '{"address":"/fx/reverb","args":[0.7]}'

    # 5. Поменять OSC-порты моста
    curl -X POST http://127.0.0.1:8765/csp/osc/config \
         -H 'Content-Type: application/json' \
         -d '{"inPort":9100,"outPort":9101}'

    # 6. Из Python (python-osc)
    from pythonosc.udp_client import SimpleUDPClient
    c = SimpleUDPClient("127.0.0.1", 9000)
    c.send_message("/csp/module/add", ["VCO", "voice"])