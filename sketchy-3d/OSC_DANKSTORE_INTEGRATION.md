# OSC to Dankstore Integration

This document describes how OSC signals are integrated with dankstore to automatically update URL search parameters in the sketchy-3d visualization.

## Architecture

```
OSC Client (e.g., Ableton, TouchOSC)
  ↓ UDP
Server (port 57121)
  ↓ Socket.IO
sketchy-3d main.ts
  ↓ window.dankstore.set()
dankstore
  ↓ window.history.replaceState()
URL Search Params
```

## How It Works

1. **OSC Reception**: The server receives OSC messages on UDP port 57121
2. **WebSocket Broadcast**: Server forwards OSC messages to all connected clients via Socket.IO
3. **Dankstore Update**: The sketch receives the OSC message and calls `window.dankstore.set(key, value)`
4. **URL Sync**: Dankstore automatically updates the URL search parameters via `window.history.replaceState()`
5. **Persistence**: Settings are saved to localStorage and can be restored on page reload

## Supported OSC Addresses

### Specific Handlers

These addresses have custom behavior in addition to updating dankstore:

- `/bpm` - Updates BPM and resets the beat mapper
  - Args: `[number]` (e.g., 120)
  - Updates: `data.beatMapper.bpm`, dankstore 'bpm' parameter

- `/speed` - Updates animation speed
  - Args: `[number]` (0-5, e.g., 1.5)
  - Updates: `data.speed`, dankstore 'speed' parameter

- `/xLim` - Updates grid width and regenerates cubes
  - Args: `[number]` (1-20, e.g., 7)
  - Updates: `data.xLim`, dankstore 'xLim' parameter, regenerates scene

- `/yLim` - Updates grid height and regenerates cubes
  - Args: `[number]` (1-20, e.g., 11)
  - Updates: `data.yLim`, dankstore 'yLim' parameter, regenerates scene

- `/depth` - Updates depth parameter
  - Args: `[number]` (5-50, e.g., 20)
  - Updates: `data.depth`, dankstore 'depth' parameter

- `/songStart` - Resets the beat mapper
  - Args: none
  - Updates: Resets beat mapper (no dankstore update)

### Generic Parameter Handler

For any parameter registered in dankstore, you can use the generic format:

- `/param/{paramName}` - Updates any dankstore parameter
  - Args: `[value]`
  - Example: `/param/speed` with args `[2.5]` sets speed to 2.5

This allows you to control any dankstore parameter without modifying the code.

## Example OSC Messages

### From Node.js using node-osc

```javascript
const osc = require('node-osc');
const client = new osc.Client('localhost', 57121);

// Set BPM
client.send('/bpm', 128);

// Set speed
client.send('/speed', 2.0);

// Set grid dimensions
client.send('/xLim', 10);
client.send('/yLim', 15);

// Using generic parameter handler
client.send('/param/depth', 30);
client.send('/param/bpm', 140);
```

### From Python using python-osc

```python
from pythonosc import udp_client

client = udp_client.SimpleUDPClient("localhost", 57121)

# Set BPM
client.send_message("/bpm", 128)

# Set speed
client.send_message("/speed", 2.0)

# Set grid dimensions
client.send_message("/xLim", 10)
client.send_message("/yLim", 15)

# Using generic parameter handler
client.send_message("/param/depth", 30)
```

### From TouchOSC or other OSC apps

Configure your OSC client to send to:
- **Host**: Your server's IP address
- **Port**: 57121

Create controls that send to the addresses above.

## Testing the Integration

### 1. Start the Server

```bash
cd server
docker compose up server
```

The server will listen on port 57121 for OSC messages and broadcast them to connected clients.

### 2. Open the Sketch

Navigate to the sketchy-3d sketch in your browser. The Socket.IO connection will be established automatically.

### 3. Send Test OSC Messages

Use the test script or send manual OSC messages:

```bash
cd .references/nextgenart/sketchy-3d
node test-osc.js
```

Or use Python:

```bash
python3 test-osc.py
```

### 4. Verify URL Updates

Watch the browser URL bar - it should update in real-time as OSC messages arrive:

Before: `http://localhost:5173/`
After: `http://localhost:5173/?bpm=128&speed=2&xLim=10&yLim=15`

### 5. Check Console Logs

Open browser DevTools console to see:
- OSC messages being received
- Dankstore updates
- Parameter changes

## Data Flow Example

1. Send OSC: `/bpm 140`
2. Server receives and logs: `OSC Message: /bpm [140]`
3. Server broadcasts via Socket.IO to all clients
4. Sketch receives: `osc { address: '/bpm', args: [140] }`
5. Handler executes:
   - `data.beatMapper.bpm = 140`
   - `data.beatMapper.reset()`
   - `window.dankstore.set('bpm', 140)`
6. Dankstore updates:
   - Saves to localStorage
   - Updates URL: `?bpm=140&speed=1&xLim=7&yLim=11&depth=20`
7. URL is now shareable and will restore these settings on reload

## Adding New Parameters

To add support for a new parameter:

### Option 1: Use Generic Handler (Recommended)

Just register the parameter in dankstore:

```typescript
window.dankstore.register({
  myNewParam: { type: 'range', min: 0, max: 100, default: 50, parse: Number },
})
```

Then send OSC to `/param/myNewParam` with a value.

### Option 2: Add Specific Handler

If you need custom behavior, add a case to the switch statement:

```typescript
case '/myNewParam':
  const value = e.args[0]
  data.myValue = value
  window.dankstore.set('myNewParam', value)
  // Custom behavior here
  break
```

## Registered Parameters

Current dankstore schema (from main.ts):

```typescript
{
  bpm: { type: 'range', min: 60, max: 200, default: 81.44, parse: Number },
  speed: { type: 'range', min: 0, max: 5, default: 1, parse: Number },
  xLim: { type: 'range', min: 1, max: 20, default: 7, parse: Number },
  yLim: { type: 'range', min: 1, max: 20, default: 11, parse: Number },
  depth: { type: 'range', min: 5, max: 50, default: 20, parse: Number },
}
```

## Troubleshooting

### OSC messages not received

- Check server is running: `docker compose ps`
- Verify OSC port: `netstat -an | grep 57121`
- Check server logs: `docker compose logs server`

### URL not updating

- Open browser console and check for errors
- Verify dankstore is loaded: `console.log(window.dankstore)`
- Check if parameter is registered: `console.log(window.dankstore.get())`

### Socket.IO not connecting

- Check CORS settings in server/src/index.ts
- Verify Socket.IO URL in main.ts (currently: `relay.elijahlucian.ca`)
- For local testing, change to: `io('http://localhost:8080')`

### Values not persisting

- Check localStorage: `localStorage.getItem('dankstore_settings')`
- Clear if corrupted: `localStorage.removeItem('dankstore_settings')`
- Reload page to reinitialize

## Advanced Usage

### Mapping Ableton Parameters

The server already has a mapping for Ableton BPM:

```typescript
if (msg[0] === "/ableton/bpm") {
  const value = args[0] as number
  const range = [20, 999]
  const bpm = Math.round(value * (range[1] - range[0]) + range[0])
  response.args = [bpm]
}
```

Add similar mappings in `/Users/elijahlucian/repos/elijahlucian.ca/server/src/index.ts` for other parameters.

### Creating Presets

Since settings are in the URL, you can create bookmarks or links for different visual presets:

- Preset 1: `?bpm=120&speed=1&xLim=7&yLim=11&depth=20`
- Preset 2: `?bpm=140&speed=2.5&xLim=15&yLim=15&depth=35`
- Preset 3: `?bpm=80&speed=0.5&xLim=3&yLim=3&depth=10`

### Bidirectional Communication

Currently, this is one-way (OSC → dankstore). To send data back:

1. Use the existing Socket.IO connection
2. Emit events from the sketch: `data.socket.emit('paramUpdate', { key, value })`
3. Handle in server and forward to OSC clients

## Implementation Details

### Key Code Locations

- **OSC Handler**: `/Users/elijahlucian/repos/elijahlucian.ca/.references/nextgenart/sketchy-3d/src/main.ts` (lines 327-393)
- **Dankstore Library**: `/Users/elijahlucian/repos/elijahlucian.ca/.references/nextgenart/packages/dankstore/dankstore.js`
- **Server OSC Bridge**: `/Users/elijahlucian/repos/elijahlucian.ca/server/src/index.ts` (lines 92-120)
- **WebSocket Service**: `/Users/elijahlucian/repos/elijahlucian.ca/server/src/services/websocket.ts`

### Type Safety

The dankstore interface is declared globally in main.ts:

```typescript
declare global {
  interface Window {
    dankstore: {
      get(key?: string): any
      set(key: string, value: any): void
      register(schema: Record<string, { ... }>): void
    }
  }
}
```

This provides TypeScript autocomplete and type checking for dankstore operations.
