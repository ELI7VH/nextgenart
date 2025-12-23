# OSC Integration with Dankstore

This document describes how OSC signals flow through the system to update dankstore and URL search parameters in the nextgenart sketchy-3d sketch.

## Architecture Overview

The OSC integration follows this data flow:

```
OSC Message (UDP)
  ↓
Relay Service (Go - port 57121)
  ↓
WebSocket Broadcast (wss://relay.elijahlucian.ca/ws)
  ↓
Sketch WebSocket Client (sketchy-3d/src/main.ts)
  ↓
OSC Message Handler
  ↓
Dankstore.set(key, value)
  ↓
localStorage + URL Search Params Update
```

## Components

### 1. Relay Service OSC Server

**Location**: `/relay/main.go` and `/relay/osc/`

The relay service listens for OSC messages on UDP port 57121 and broadcasts them to all connected WebSocket clients.

**Key Features**:
- Receives OSC messages over UDP (port 57121)
- Broadcasts to WebSocket clients at `/ws` endpoint
- Written in Go for high performance
- Handles multiple simultaneous connections

**Connection URL**:
- Development: `ws://localhost:8080/ws`
- Production: `wss://relay.elijahlucian.ca/ws`

### 2. Client-Side WebSocket Connection

**Location**: `/references/nextgenart/sketchy-3d/src/main.ts`

The sketch connects to the relay service using a custom WebSocket client (RelaySocket).

**Connection** (main.ts):
```typescript
socket: new RelaySocket(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca',
)
```

**RelaySocket Features** (src/lib/RelaySocket.ts):
- Automatic protocol conversion (http → ws, https → wss)
- Automatic `/ws` path appending
- Reconnection logic with 3-second retry interval
- Socket.IO-like event interface for compatibility
- Connection state tracking (connected, id)

### 3. OSC Message Handler

**Location**: `/references/nextgenart/sketchy-3d/src/main.ts` (lines 335-372)

The handler processes incoming OSC messages and updates dankstore accordingly.

#### Specific Handlers

The following OSC addresses have specific behavior:

- **`/bpm`**: Updates BPM, resets beat mapper, saves to dankstore
- **`/songStart`**: Resets beat mapper (no dankstore update)
- **`/cursor`**: Updates song cursor position
- **`/speed`**: Updates animation speed, saves to dankstore
- **`/xLim`**: Updates X grid limit, regenerates cubes, saves to dankstore
- **`/yLim`**: Updates Y grid limit, regenerates cubes, saves to dankstore
- **`/depth`**: Updates depth parameter, saves to dankstore

#### Generic Handler

For any other OSC address, the handler supports two patterns:

1. **`/param/{paramName}`**: Generic parameter pattern
2. **`/{paramName}`**: Direct parameter pattern

The generic handler:
- Checks if the parameter exists in dankstore
- If it exists, updates the value
- If it doesn't exist, auto-registers it with an appropriate type (range for numbers, text for strings)
- Updates the URL search parameters automatically via dankstore.set()

### 4. Dankstore

**Location**:
- CDN: `https://unpkg.com/@dank-inc/dankstore@1.0.0/dankstore.js`
- Local copy: `/references/nextgenart/sketchy-3d/src/lib/dankstore.js`

Dankstore is a browser customization overlay that:
- Saves settings to localStorage
- Reads from URL parameters on load
- Updates URL parameters in real-time as values change
- Provides a gear icon UI for manual settings adjustment

**Key Method** (dankstore.js, lines 135-139):
```javascript
set(key, value) {
  this.settings[key] = value;
  this.save();              // Save to localStorage
  this.updateURL();         // Update URL search params
}
```

**URL Update Logic** (dankstore.js, lines 90-100):
```javascript
updateURL() {
  const params = new URLSearchParams();
  Object.keys(this.settings).forEach(key => {
    const value = this.settings[key];
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });
  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newURL);
}
```

## OSC Message Format

OSC messages from the relay service arrive as JSON over WebSocket:

```json
{
  "type": "osc",
  "address": "/bpm",
  "args": [128],
  "timestamp": 1234567890
}
```

### Examples

1. **Set BPM to 128**:
   ```
   Address: /bpm
   Args: [128]
   ```

2. **Set speed to 2.5**:
   ```
   Address: /speed
   Args: [2.5]
   ```

3. **Generic parameter via /param/ pattern**:
   ```
   Address: /param/myCustomParam
   Args: [42]
   ```

4. **Direct parameter pattern**:
   ```
   Address: /myCustomParam
   Args: [42]
   ```

## Registered Parameters

The sketch registers these parameters on initialization (main.ts, lines 82-88):

```typescript
window.dankstore.register({
  bpm: { type: 'range', min: 60, max: 200, default: 81.44, parse: Number },
  speed: { type: 'range', min: 0, max: 5, default: 1, parse: Number },
  xLim: { type: 'range', min: 1, max: 20, default: 7, parse: Number },
  yLim: { type: 'range', min: 1, max: 20, default: 11, parse: Number },
  depth: { type: 'range', min: 5, max: 50, default: 20, parse: Number },
})
```

## Testing

Test scripts are provided at `/references/nextgenart/sketchy-3d/test-osc.js` and `/relay/test-osc.go`.

**Usage (JavaScript)**:
```bash
# Test against localhost
node test-osc.js

# Test against remote server
node test-osc.js relay.elijahlucian.ca
```

**Usage (Go)**:
```bash
cd /relay
go run test-osc.go localhost 57121
```

The test script sends a sequence of OSC messages to verify the integration:
- Sets BPM to 128
- Sets speed to 2.5
- Sets xLim to 10
- Sets yLim to 15
- Sets depth to 30
- Tests generic /param/ pattern
- Triggers songStart event

## Monitoring

When OSC messages are received, the console will show:

```
OSC received: /bpm [128]
→ Updated dankstore & URL: bpm=128
Current URL: http://localhost:5173/?bpm=128&speed=1&xLim=7&yLim=11&depth=20
```

This allows you to verify that:
1. OSC messages are being received
2. Dankstore is being updated
3. URL search parameters are being modified

## URL State Persistence

The URL search parameters serve multiple purposes:

1. **Shareability**: You can share the current state by copying the URL
2. **Persistence**: Refreshing the page maintains the current settings
3. **Deep linking**: You can link directly to a specific configuration
4. **History**: Browser back/forward buttons work with parameter changes

Example URL with parameters:
```
https://nextgenart.elijahlucian.ca/?bpm=140&speed=2.5&xLim=10&yLim=15&depth=25
```

## Troubleshooting

### OSC messages not reaching the sketch

1. Check WebSocket connection:
   ```javascript
   data.socket.on('connect', () => {
     console.log('connected', data.socket.id, data.socket.connected)
   })
   ```

2. Verify relay service is receiving OSC:
   - Relay logs should show: `Received OSC message: /bpm [128]`

3. Check network connectivity to relay.elijahlucian.ca

4. Verify WebSocket endpoint is correct:
   - Development: `ws://localhost:8080/ws`
   - Production: `wss://relay.elijahlucian.ca/ws`

5. Check for CORS issues in browser console

### URL not updating

1. Verify dankstore is loaded before sketch initialization
   - The sketch waits for dankstore with `waitForDankstore()`

2. Check browser console for errors

3. Verify dankstore.set() is being called:
   - Console should show: `→ Updated dankstore & URL: {param}={value}`

### Parameters not persisting

1. Check localStorage is enabled in browser
2. Verify dankstore.save() is not throwing errors
3. Clear localStorage and test again:
   ```javascript
   localStorage.removeItem('dankstore_settings')
   ```

### WebSocket connection failing

1. Check if relay service is running:
   ```bash
   docker compose ps relay
   ```

2. Test WebSocket endpoint directly:
   ```javascript
   const ws = new WebSocket('wss://relay.elijahlucian.ca/ws')
   ws.onopen = () => console.log('Connected!')
   ws.onerror = (e) => console.error('Error:', e)
   ```

3. Check firewall/network settings for WebSocket support

## Direct Relay Connection

The sketchy-3d project connects **directly to the relay service**, not through the main server. This provides:

- **Lower latency**: Direct connection reduces message routing delays
- **Better scalability**: Relay service handles WebSocket connections independently
- **Separation of concerns**: Main server handles API, relay handles real-time OSC
- **Simplified architecture**: No intermediary routing needed

The relay service endpoint is:
- Development: `http://localhost:8080` (auto-converts to `ws://localhost:8080/ws`)
- Production: `https://relay.elijahlucian.ca` (auto-converts to `wss://relay.elijahlucian.ca/ws`)

## Future Enhancements

Potential improvements to the OSC integration:

1. **Bi-directional OSC**: Send sketch state back to OSC controllers
2. **Parameter validation**: Add min/max validation for dynamic parameters
3. **Type inference**: Better automatic type detection for new parameters
4. **Preset management**: Save/load parameter presets via OSC
5. **OSC address mapping**: Allow custom OSC address → parameter mappings
6. **Rate limiting**: Throttle rapid OSC updates to prevent performance issues
