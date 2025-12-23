# Relay SSE Integration

The relay service now supports multiple connection methods for receiving OSC data in real-time:

1. **WebSocket** - Bidirectional, lower latency (existing)
2. **Server-Sent Events (SSE)** - One-way streaming, more reliable through proxies and firewalls (new)
3. **Hybrid Client** - Automatically tries WebSocket first, falls back to SSE (recommended)

## Connection Methods

### WebSocket (RelaySocket)

The original implementation using native WebSocket API.

```typescript
import { RelaySocket } from './lib/RelaySocket'

const socket = new RelaySocket('https://relay.elijahlucian.ca')

socket.on('connect', () => {
  console.log('Connected:', socket.id)
})

socket.on('osc', (data) => {
  console.log('OSC:', data.address, data.args)
})
```

**Pros:**
- Bidirectional communication
- Lower latency
- Can send messages back to server

**Cons:**
- May be blocked by corporate firewalls/proxies
- Requires upgrade handshake

### Server-Sent Events (RelaySSE)

New implementation using the EventSource API for one-way streaming.

```typescript
import { RelaySSE } from './lib/RelaySSE'

const sse = new RelaySSE('https://relay.elijahlucian.ca')

sse.on('connect', () => {
  console.log('Connected:', sse.id)
})

sse.on('osc', (data) => {
  console.log('OSC:', data.address, data.args)
})

// SSE provides state caching
const bpmValue = sse.get('/bpm')
console.log('Current BPM:', bpmValue)
```

**Pros:**
- Works through most firewalls and proxies
- Automatic reconnection built into browser
- Provides state snapshot on connect
- Caches latest values for each OSC address

**Cons:**
- One-way only (server to client)
- Slightly higher latency than WebSocket

### Hybrid Client (RelayClient) - Recommended

Automatically selects the best connection method with fallback support.

```typescript
import { RelayClient } from './lib/RelayClient'

// Tries WebSocket first, falls back to SSE after 5 seconds
const relay = new RelayClient('https://relay.elijahlucian.ca')

// Or force SSE mode
const relaySSE = new RelayClient('https://relay.elijahlucian.ca', {
  preferSSE: true
})

relay.on('connect', () => {
  console.log('Connected via:', relay.getMode())
  console.log('Connection ID:', relay.id)
})

relay.on('osc', (data) => {
  console.log('OSC:', data.address, data.args)
})

// Works with both modes (only returns data in SSE mode)
const bpmValue = relay.get('/bpm')
```

**Pros:**
- Automatic fallback for reliability
- Uses best available connection method
- Unified API regardless of mode
- Production-ready with minimal configuration

**Cons:**
- Slightly more complex initialization

## Relay Endpoints

### `/ws` - WebSocket

Standard WebSocket endpoint for bidirectional communication.

**URL:** `wss://relay.elijahlucian.ca/ws`

**Protocol:** WebSocket

**Message Format:**
```json
{
  "type": "osc",
  "address": "/bpm",
  "args": [120],
  "timestamp": 1234567890
}
```

### `/state` - State Snapshot

HTTP endpoint that returns the current state of all OSC values.

**URL:** `https://relay.elijahlucian.ca/state`

**Method:** GET

**Response Format:**
```json
{
  "/bpm": {
    "args": [120],
    "updated_at": "2025-12-09T18:42:13.051608118Z"
  },
  "/fft3": {
    "args": [0.5, 0.3, 0.8],
    "updated_at": "2025-12-09T18:42:14.123456789Z"
  }
}
```

**Use Cases:**
- Initialize visualizations with current values
- Debug OSC state
- Build status dashboards

### `/state/stream` - SSE Stream

Server-Sent Events endpoint for real-time OSC updates.

**URL:** `https://relay.elijahlucian.ca/state/stream`

**Protocol:** Server-Sent Events (EventSource)

**Event Types:**

1. **`update`** - OSC value changed
   ```json
   {
     "address": "/bpm",
     "args": [128],
     "updated_at": "2025-12-09T18:42:13.051608118Z"
   }
   ```

2. **`meta`** - System metadata
   ```json
   {
     "uptime": "40m28s",
     "client_count": 5
   }
   ```

## Migration Guide

### From RelaySocket to RelayClient

The API is almost identical, making migration straightforward:

**Before:**
```typescript
import { RelaySocket } from './lib/RelaySocket'

const socket = new RelaySocket(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
)

socket.on('osc', (e) => {
  // Handle OSC
})
```

**After:**
```typescript
import { RelayClient } from './lib/RelayClient'

const relay = new RelayClient(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
)

relay.on('osc', (e) => {
  // Handle OSC (same code)
})
```

### New Features with SSE

When using SSE mode (either directly or via RelayClient), you get additional features:

#### 1. State Caching

Get the latest value for any OSC address without waiting for an update:

```typescript
relay.on('connect', () => {
  // Get current BPM value immediately
  const bpm = relay.get('/bpm')
  if (bpm) {
    console.log('Current BPM:', bpm[0])
  }
})
```

#### 2. Initial State Snapshot

Load all current values when connecting:

```typescript
relay.on('snapshot', (state) => {
  console.log('Initial state loaded:', state)

  // Initialize visualization with current values
  if (state['/bpm']) {
    beatMapper.bpm = state['/bpm'].args[0]
  }
  if (state['/fft3']) {
    const [low, mid, high] = state['/fft3'].args
    fft.low = low
    fft.mid = mid
    fft.high = high
  }
})
```

#### 3. Meta Events

Track system status:

```typescript
relay.on('meta', (meta) => {
  console.log('Server uptime:', meta.uptime)
  console.log('Connected clients:', meta.client_count)
})
```

## Example: Complete Integration

Here's a complete example integrating the hybrid client with a visualization:

```typescript
import { RelayClient } from './lib/RelayClient'
import { BeatMapper } from './lib/BeatMapper'

// Initialize relay client
const relay = new RelayClient(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
)

// Initialize visualization data
const data = {
  beatMapper: new BeatMapper(120),
  fft: { low: 0.5, mid: 0.5, high: 0.2 },
}

// Handle connection
relay.on('connect', () => {
  console.log(`Connected via ${relay.getMode()}`)

  // Initialize from cached state if available
  const bpm = relay.get('/bpm')
  if (bpm) {
    data.beatMapper.bpm = bpm[0]
  }
})

// Handle OSC updates
relay.on('osc', (e) => {
  switch (e.address) {
    case '/bpm':
      const bpm = e.args[0]
      data.beatMapper.bpm = bpm
      data.beatMapper.reset()
      window.dankstore?.set('bpm', bpm)
      break

    case '/fft3':
      const [low, mid, high] = e.args
      data.fft.low = low
      data.fft.mid = mid
      data.fft.high = high
      break

    case '/songStart':
      data.beatMapper.reset()
      break
  }
})

// Handle initial state snapshot (SSE mode only)
relay.on('snapshot', (state) => {
  console.log('Loading initial state...')

  if (state['/bpm']) {
    data.beatMapper.bpm = state['/bpm'].args[0]
    window.dankstore?.set('bpm', state['/bpm'].args[0])
  }

  if (state['/fft3']) {
    const [low, mid, high] = state['/fft3'].args
    data.fft.low = low
    data.fft.mid = mid
    data.fft.high = high
  }
})

// Handle disconnection
relay.on('disconnect', () => {
  console.log('Relay disconnected')
})

// Handle errors
relay.on('error', (error) => {
  console.error('Relay error:', error)
})
```

## Troubleshooting

### WebSocket Connection Fails

If WebSocket fails to connect:
1. Check browser console for error messages
2. Verify relay service is running: `curl https://relay.elijahlucian.ca/state`
3. Check for CORS or firewall issues
4. The hybrid client will automatically fall back to SSE

### SSE Connection Fails

If SSE fails to connect:
1. Check browser console for error messages
2. Verify `/state/stream` endpoint: `curl https://relay.elijahlucian.ca/state/stream`
3. Check for proxy/firewall blocking SSE
4. Try the `/state` endpoint to see if HTTP works: `curl https://relay.elijahlucian.ca/state`

### No OSC Data Received

If connected but no data arrives:
1. Verify OSC messages are being sent to relay service (check relay logs)
2. Test with curl: `curl https://relay.elijahlucian.ca/state` (should show current values)
3. Check OSC handler is registered correctly in your code
4. Verify the OSC addresses match what your source is sending

### State Cache Not Working

The state cache only works in SSE mode:
1. Check connection mode: `relay.getMode()` should return `'sse'`
2. Force SSE mode: `new RelayClient(url, { preferSSE: true })`
3. Wait for `snapshot` event before calling `relay.get()`

## Performance Considerations

### WebSocket Mode
- Lower latency (~10-50ms)
- Better for high-frequency updates (>30 updates/second)
- Recommended for local development
- Requires stable network connection

### SSE Mode
- Slightly higher latency (~50-200ms)
- Better for moderate update rates (<30 updates/second)
- More reliable through proxies/firewalls
- Automatic browser-level reconnection
- State caching reduces need for perfect synchronization

### Hybrid Mode (Recommended)
- Best of both worlds
- Uses WebSocket when available
- Falls back to SSE when needed
- Production-ready configuration

## Testing

### Test WebSocket Connection

```bash
# In browser console
const ws = new WebSocket('wss://relay.elijahlucian.ca/ws')
ws.onmessage = (e) => console.log('WS:', e.data)
```

### Test SSE Connection

```bash
# In browser console
const es = new EventSource('https://relay.elijahlucian.ca/state/stream')
es.addEventListener('update', (e) => console.log('SSE:', e.data))
```

### Test State Endpoint

```bash
# From terminal
curl https://relay.elijahlucian.ca/state | jq

# Or in browser
fetch('https://relay.elijahlucian.ca/state')
  .then(r => r.json())
  .then(console.log)
```

## Best Practices

1. **Use RelayClient** - Let it handle connection method selection
2. **Handle snapshot event** - Initialize from current state when using SSE
3. **Cache relay reference** - Don't create multiple connections
4. **Clean up on unmount** - Call `relay.close()` when done
5. **Use error handlers** - Log connection issues for debugging
6. **Test both modes** - Verify your code works with WebSocket and SSE

## API Reference

### RelayClient

**Constructor:**
- `new RelayClient(url: string, options?: { preferSSE?: boolean })`

**Properties:**
- `connected: boolean` - Connection state
- `id: string` - Client ID

**Methods:**
- `on(event: string, callback: (data: any) => void)` - Register event handler
- `get(address: string): any[] | undefined` - Get cached OSC value (SSE only)
- `send(data: any)` - Send message (WebSocket only)
- `getMode(): 'websocket' | 'sse' | 'disconnected'` - Get connection mode
- `close()` - Close connection

**Events:**
- `connect` - Connected to relay
- `disconnect` - Disconnected from relay
- `error` - Connection error
- `osc` - OSC message received: `{ address, args }`
- `snapshot` - Initial state loaded (SSE only)
- `meta` - System metadata (SSE only): `{ uptime, client_count }`
- `message` - Generic message

### RelaySSE

Same API as RelayClient, but always uses SSE mode.

**Additional Methods:**
- `getAll(): Map<string, any[]>` - Get all cached OSC values

### RelaySocket

Original WebSocket-only implementation. Same event API as RelayClient.

**Note:** Consider using RelayClient instead for automatic fallback support.
