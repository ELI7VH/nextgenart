# Relay Integration Quick Start

Quick reference for connecting nextgenart sketches to the relay service for real-time OSC data.

## TL;DR

```typescript
import { RelayClient } from './lib/RelayClient'

const relay = new RelayClient('https://relay.elijahlucian.ca')

relay.on('osc', (e) => {
  console.log(e.address, e.args)
})
```

That's it. WebSocket with automatic SSE fallback.

## Choose Your Connection Method

| Method | When to Use | Import |
|--------|-------------|--------|
| **RelayClient** (Recommended) | Production, automatic fallback | `import { RelayClient } from './lib/RelayClient'` |
| **RelaySocket** | Local dev, known stable network | `import { RelaySocket } from './lib/RelaySocket'` |
| **RelaySSE** | Known firewall/proxy issues | `import { RelaySSE } from './lib/RelaySSE'` |

## Basic Usage

### Connect and Listen

```typescript
const relay = new RelayClient('https://relay.elijahlucian.ca')

// Connection established
relay.on('connect', () => {
  console.log('Connected via', relay.getMode())
})

// OSC message received
relay.on('osc', (e) => {
  console.log('OSC:', e.address, e.args)
  // e.address = '/bpm'
  // e.args = [120]
})

// Connection lost
relay.on('disconnect', () => {
  console.log('Disconnected')
})
```

### Handle Specific OSC Addresses

```typescript
relay.on('osc', (e) => {
  switch (e.address) {
    case '/bpm':
      beatMapper.bpm = e.args[0]
      break

    case '/fft3':
      const [low, mid, high] = e.args
      fft.low = low
      fft.mid = mid
      fft.high = high
      break

    case '/songStart':
      beatMapper.reset()
      break
  }
})
```

### Initialize from Current State (SSE Mode)

```typescript
// This event only fires in SSE mode
relay.on('snapshot', (state) => {
  if (state['/bpm']) {
    beatMapper.bpm = state['/bpm'].args[0]
  }
})
```

## Common OSC Addresses

| Address | Args | Description |
|---------|------|-------------|
| `/bpm` | `[number]` | Beats per minute (60-200) |
| `/fft3` | `[low, mid, high]` | FFT bands (0.0-1.0) |
| `/cursor` | `[position]` | Song position (0.0-1.0) |
| `/songStart` | `[]` | Song started/reset |
| `/speed` | `[number]` | Animation speed (0-5) |
| `/param/{name}` | `[value]` | Generic parameter |

## Environment Setup

Create `.env.development`:

```bash
VITE_SOCKET_URL=http://localhost:8080
```

Create `.env.production`:

```bash
VITE_SOCKET_URL=https://relay.elijahlucian.ca
```

Use in code:

```typescript
const relay = new RelayClient(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
)
```

## Relay Endpoints

- **WebSocket**: `wss://relay.elijahlucian.ca/ws`
- **SSE Stream**: `https://relay.elijahlucian.ca/state/stream`
- **State Snapshot**: `https://relay.elijahlucian.ca/state`

## Testing

### Check Current State

```bash
curl https://relay.elijahlucian.ca/state | jq
```

### Send Test OSC

```bash
cd .references/nextgenart/sketchy-3d
node test-osc.js
```

### Browser Console Test

```javascript
// WebSocket test
const ws = new WebSocket('wss://relay.elijahlucian.ca/ws')
ws.onmessage = (e) => console.log('WS:', e.data)

// SSE test
const es = new EventSource('https://relay.elijahlucian.ca/state/stream')
es.addEventListener('update', (e) => console.log('SSE:', e.data))

// HTTP test
fetch('https://relay.elijahlucian.ca/state')
  .then(r => r.json())
  .then(console.log)
```

## Integration with Dankstore

Automatically sync OSC values to URL parameters:

```typescript
// Register parameter
window.dankstore.register({
  bpm: { type: 'range', min: 60, max: 200, default: 120, parse: Number }
})

// Update from OSC
relay.on('osc', (e) => {
  if (e.address === '/bpm') {
    window.dankstore.set('bpm', e.args[0])
    // URL automatically updates: ?bpm=128
  }
})
```

## Connection Modes

| Mode | Latency | Firewall-Friendly | Bidirectional | State Cache |
|------|---------|-------------------|---------------|-------------|
| **WebSocket** | 10-50ms | No | Yes | No |
| **SSE** | 50-200ms | Yes | No | Yes |

RelayClient tries WebSocket first, falls back to SSE after 5 seconds.

## Troubleshooting

### No Connection

```typescript
relay.on('error', (error) => {
  console.error('Relay error:', error)
})

// Check mode
console.log('Mode:', relay.getMode())

// Check if connected
console.log('Connected:', relay.connected)
```

### No Data Received

1. Verify relay is running: `curl https://relay.elijahlucian.ca/state`
2. Check OSC is being sent: Check relay logs
3. Verify OSC address matches: `console.log(e.address)`
4. Test with: `node test-osc.js`

### WebSocket Blocked

Force SSE mode:

```typescript
const relay = new RelayClient('https://relay.elijahlucian.ca', {
  preferSSE: true
})
```

## Complete Example

```typescript
import { create3dSketch } from '@dank-inc/sketchy-3d'
import { RelayClient } from './lib/RelayClient'
import { BeatMapper } from './lib/BeatMapper'

const relay = new RelayClient('https://relay.elijahlucian.ca')

const data = {
  beatMapper: new BeatMapper(120),
  fft: { low: 0.5, mid: 0.5, high: 0.2 },
}

relay.on('connect', () => {
  console.log('Connected via', relay.getMode())
})

relay.on('osc', (e) => {
  switch (e.address) {
    case '/bpm':
      data.beatMapper.bpm = e.args[0]
      data.beatMapper.reset()
      break

    case '/fft3':
      [data.fft.low, data.fft.mid, data.fft.high] = e.args
      break
  }
})

relay.on('snapshot', (state) => {
  if (state['/bpm']) {
    data.beatMapper.bpm = state['/bpm'].args[0]
  }
})

// Use data.fft and data.beatMapper in your sketch
```

## Migration from RelaySocket

Only 2 lines change:

```typescript
// Before
import { RelaySocket } from './lib/RelaySocket'
const socket = new RelaySocket(url)

// After
import { RelayClient } from './lib/RelayClient'
const relay = new RelayClient(url)
```

All event handlers stay the same.

## Documentation

- **RELAY_SSE.md** - Complete SSE integration guide
- **RELAY_CONNECTION.md** - WebSocket details
- **EXAMPLE_RELAY_CLIENT.md** - Migration examples
- **RELAY_INTEGRATION_SUMMARY.md** - Technical overview
- **OSC_DANKSTORE_INTEGRATION.md** - OSC parameter handling

## Key Takeaways

1. Use `RelayClient` for automatic fallback
2. Handle `osc` event for real-time updates
3. Handle `snapshot` event for initial state (SSE mode)
4. Use environment variables for different URLs
5. Test both WebSocket and SSE modes
6. Clean up with `relay.close()` when done

## Need Help?

Check the full documentation:
- `/sketchy-3d/RELAY_SSE.md`
- `/sketchy-3d/EXAMPLE_RELAY_CLIENT.md`
