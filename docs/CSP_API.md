
# CSP API — HTTP + OSC bridge

External control for CsModular via `bridge/` (Node.js). Accepts **HTTP POST** and
**UDP OSC**, forwards to the UI over **WebSocket**. Also relays **OSC out** from
UI to external devices.

## Why a bridge

Browser cannot:
- listen on UDP (OSC) — no raw sockets
- accept incoming HTTP on a custom port (only the dev server on `:3000`)

`bridge/` solves both. UI auto-connects to `ws://127.0.0.1:8765/ws`.

## Flow

```
┌──────────────┐   HTTP POST /csp/...   ┌──────────────┐
│ curl / Python│ ─────────────────────▶ │              │
└──────────────┘                        │              │   WebSocket    ┌──────────┐
┌──────────────┐   UDP OSC :9000        │   bridge/    │ ◀────────────▶ │    UI    │
│  TouchOSC    │ ─────────────────────▶ │  (Node.js)   │                │ (browser)│
└──────────────┘                        │              │                └──────────┘
┌──────────────┐   UDP OSC :9001        │              │
│  External    │ ◀───────────────────── │              │
│  device      │                        └──────────────┘
└──────────────┘
```

## Run

```bash
# terminal 1 — UI
npm run dev                    # http://localhost:3000

# terminal 2 — bridge
cd bridge
npm install
npm start
```

Default ports:

| | |
|---|---|
| HTTP + WS | `127.0.0.1:8765` (`ws://127.0.0.1:8765/ws`) |
| OSC in | `0.0.0.0:9000` |
| OSC out | `127.0.0.1:9001` |

Configurable via `POST /csp/osc/config` or **OSC** button in BottomBar.

**If bridge is not running** — UI works normally (only OSC panel / external control disabled).

## REST

All `POST` accept JSON, return `{ ok: true, queued: N }`.

| Method | Path | Body |
|---|---|---|
| `GET`  | `/csp/ping` | — |
| `GET`  | `/csp/osc/config` | — |
| `POST` | `/csp/osc/config` | `{ inPort, outPort?, outHost? }` |
| `POST` | `/csp/main/reset` | — |
| `POST` | `/csp/main/new` | — |
| `POST` | `/csp/main/save` | `{ filename? }` |
| `POST` | `/csp/main/load` | `{ filename? }` |
| `POST` | `/csp/main/csound/start` | — |
| `POST` | `/csp/main/csound/stop` | — |
| `POST` | `/csp/module/add` | `{ type, layer? }` |
| `POST` | `/csp/module/remove` | `{ id }` |
| `POST` | `/csp/module/move` | `{ id, gridX, gridY }` |
| `POST` | `/csp/module/layer` | `{ id, layer }` (`voice`/`fx`) |
| `POST` | `/csp/cable/connect` | `{ fromId, fromJack, toId, toJack }` |
| `POST` | `/csp/cable/remove` | `{ cableId }` |
| `POST` | `/csp/midi/send` | `{ status, data1, data2 }` |
| `POST` | `/csp/osc/send` | `{ address, args: [...] }` |

## OSC addresses (incoming)

```
/csp/main/reset
/csp/main/new
/csp/main/csound/start
/csp/main/csound/stop
/csp/module/add   <type:s> [layer:s]
/csp/midi/send    <status:i> <data1:i> <data2:i>
/csp/osc/send     <address:s> <arg...>
```

Any other OSC address is accepted too — it goes to the UI history (OSC indicator flashes), no action. Useful for capturing TouchOSC events (OSC routing — TODO).

## Examples

```bash
# New patch
curl -X POST http://127.0.0.1:8765/csp/main/new

# Add VCO to voice layer
curl -X POST http://127.0.0.1:8765/csp/module/add \
     -H 'Content-Type: application/json' \
     -d '{"type":"VCO","layer":"voice"}'

# MIDI Note On (channel 1, note 60, velocity 100)
curl -X POST http://127.0.0.1:8765/csp/midi/send \
     -H 'Content-Type: application/json' \
     -d '{"status":144,"data1":60,"data2":100}'
```

```python
# Python (python-osc)
from pythonosc.udp_client import SimpleUDPClient
c = SimpleUDPClient("127.0.0.1", 9000)
c.send_message("/csp/module/add", ["VCO", "voice"])
```

## Security

- HTTP/WS bind to `127.0.0.1` — **local only**.
- OSC in binds to `0.0.0.0` — **all interfaces**. Use firewall, or change to `127.0.0.1` if TouchOSC runs on the same machine.
- **No auth**. Do not expose `8765` to the internet.

## Tauri

Tauri app is a separate window; bridge runs **outside** (same as web — `cd bridge && npm start`). UI auto-connects. Bundling bridge into Tauri as a sidecar — TODO.
```


