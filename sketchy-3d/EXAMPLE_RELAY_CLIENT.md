# Example: Using RelayClient in sketchy-3d

This example shows how to update an existing sketch to use the new `RelayClient` with automatic WebSocket/SSE fallback.

## Migration from RelaySocket to RelayClient

### Before (RelaySocket only)

```typescript
import { RelaySocket } from './lib/RelaySocket'

const data = {
  beatMapper: new BeatMapper(120),
  fft: { low: 0.5, mid: 0.5, high: 0.2 },
  socket: new RelaySocket(
    import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
  ),
}

// Handle OSC messages
data.socket.on('osc', (e: any) => {
  switch (e.address) {
    case '/bpm':
      data.beatMapper.bpm = e.args[0]
      data.beatMapper.reset()
      window.dankstore.set('bpm', e.args[0])
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

data.socket.on('connect', () => {
  console.log('connected', data.socket.id)
})

data.socket.on('disconnect', () => {
  console.log('disconnected')
})
```

### After (RelayClient with fallback)

```typescript
import { RelayClient } from './lib/RelayClient'

const data = {
  beatMapper: new BeatMapper(120),
  fft: { low: 0.5, mid: 0.5, high: 0.2 },
  relay: new RelayClient(
    import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
  ),
}

// Handle OSC messages (same code as before)
data.relay.on('osc', (e: any) => {
  switch (e.address) {
    case '/bpm':
      data.beatMapper.bpm = e.args[0]
      data.beatMapper.reset()
      window.dankstore.set('bpm', e.args[0])
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

// Handle connection with mode detection
data.relay.on('connect', () => {
  console.log('connected via', data.relay.getMode(), 'id:', data.relay.id)

  // Initialize from cached state if available (SSE mode only)
  const bpm = data.relay.get('/bpm')
  if (bpm) {
    console.log('Initialized BPM from cache:', bpm[0])
    data.beatMapper.bpm = bpm[0]
    window.dankstore.set('bpm', bpm[0])
  }
})

// NEW: Handle initial state snapshot (SSE mode only)
data.relay.on('snapshot', (state: any) => {
  console.log('Initial state loaded:', Object.keys(state).length, 'values')

  // Initialize all parameters from snapshot
  if (state['/bpm']) {
    data.beatMapper.bpm = state['/bpm'].args[0]
    window.dankstore.set('bpm', state['/bpm'].args[0])
  }

  if (state['/fft3']) {
    const [low, mid, high] = state['/fft3'].args
    data.fft.low = low
    data.fft.mid = mid
    data.fft.high = high
  }
})

// NEW: Handle system metadata (SSE mode only)
data.relay.on('meta', (meta: any) => {
  console.log('Relay uptime:', meta.uptime, 'clients:', meta.client_count)
})

data.relay.on('disconnect', () => {
  console.log('disconnected')
})

data.relay.on('error', (error: any) => {
  console.error('relay error:', error)
})
```

## Complete Example: Audio-Reactive Visualization

Here's a complete example showing how to build an audio-reactive visualization using the relay client:

```typescript
import {
  create3dSketch,
  createParams,
  useMesh,
  useBox,
  useStandardMaterial,
} from '@dank-inc/sketchy-3d'
import { RelayClient } from './lib/RelayClient'
import { BeatMapper } from './lib/BeatMapper'

// Wait for dankstore to be ready
const waitForDankstore = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.dankstore) {
      resolve()
    } else {
      const checkInterval = setInterval(() => {
        if (window.dankstore) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 10)
    }
  })
}

;(async () => {
  await waitForDankstore()

  // Register parameters with dankstore
  window.dankstore.register({
    bpm: { type: 'range', min: 30, max: 200, default: 120, parse: Number },
    speed: { type: 'range', min: 0, max: 5, default: 1, parse: Number },
  })

  const params = createParams({
    element: document.getElementById('root')!,
    animate: true,
  })

  const sketch = create3dSketch(({ scene, renderer, time, dt }) => {
    // Create a cube
    const cube = useMesh(
      useBox([1, 1, 1]),
      useStandardMaterial(0xff69b4)
    )
    scene.add(cube)

    // Initialize data
    const data = {
      beatMapper: new BeatMapper(window.dankstore.get('bpm')),
      speed: window.dankstore.get('speed'),
      fft: {
        low: 0.5,
        mid: 0.5,
        high: 0.2,
      },
      relay: new RelayClient(
        import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
      ),
    }

    // Handle relay connection
    data.relay.on('connect', () => {
      const mode = data.relay.getMode()
      console.log(`🔗 Connected to relay via ${mode}`)

      // If SSE mode, initialize from cached state
      if (mode === 'sse') {
        const bpm = data.relay.get('/bpm')
        if (bpm) {
          data.beatMapper.bpm = bpm[0]
          window.dankstore.set('bpm', bpm[0])
        }
      }
    })

    // Handle OSC messages
    data.relay.on('osc', (e: any) => {
      console.log('OSC received:', e.address, e.args)

      switch (e.address) {
        case '/bpm':
          const bpm = e.args[0]
          data.beatMapper.bpm = bpm
          data.beatMapper.reset()
          window.dankstore.set('bpm', bpm)
          console.log(`→ BPM updated: ${bpm}`)
          break

        case '/speed':
          data.speed = e.args[0]
          window.dankstore.set('speed', data.speed)
          console.log(`→ Speed updated: ${data.speed}`)
          break

        case '/fft3':
          const [low, mid, high] = e.args
          data.fft.low = low
          data.fft.mid = mid
          data.fft.high = high
          break

        case '/songStart':
          data.beatMapper.reset()
          console.log('→ Song started, beat mapper reset')
          break
      }
    })

    // Handle initial state snapshot (SSE mode)
    data.relay.on('snapshot', (state: any) => {
      console.log('📸 Initial state snapshot loaded')

      // Initialize all parameters from current state
      if (state['/bpm']) {
        data.beatMapper.bpm = state['/bpm'].args[0]
        window.dankstore.set('bpm', state['/bpm'].args[0])
        console.log('→ Initialized BPM:', state['/bpm'].args[0])
      }

      if (state['/speed']) {
        data.speed = state['/speed'].args[0]
        window.dankstore.set('speed', data.speed)
        console.log('→ Initialized speed:', data.speed)
      }

      if (state['/fft3']) {
        const [low, mid, high] = state['/fft3'].args
        data.fft.low = low
        data.fft.mid = mid
        data.fft.high = high
        console.log('→ Initialized FFT:', { low, mid, high })
      }
    })

    // Handle system metadata
    data.relay.on('meta', (meta: any) => {
      console.log(`⚙️ Relay status: ${meta.uptime} | ${meta.client_count} clients`)
    })

    // Handle disconnection
    data.relay.on('disconnect', () => {
      console.log('❌ Relay disconnected')
    })

    // Handle errors
    data.relay.on('error', (error: any) => {
      console.error('❌ Relay error:', error)
    })

    // Animation loop
    return ({ time, dt }) => {
      // Update beat mapper
      data.beatMapper.update(dt)

      // Rotate cube based on speed
      cube.rotation.x = time * data.speed
      cube.rotation.y = time * data.speed * 0.7

      // Scale cube based on FFT low frequencies
      const scale = 0.5 + data.fft.low * 1.5
      cube.scale.set(scale, scale, scale)

      // Change color on each beat
      if (data.beatMapper.beat !== data.beatMapper.prevBeat) {
        const colors = [0xff69b4, 0x00ffff, 0x9b2339, 0x23399b]
        const colorIndex = data.beatMapper.beat % colors.length
        cube.material.color.set(colors[colorIndex])
      }

      // Set background based on FFT high frequencies
      const high = Math.floor(data.fft.high * 255).toString(16).padStart(2, '0')
      renderer.setClearColor(`#${high}${high}${high}`)
    }
  }, params)

  sketch.run()
})()
```

## Testing the Integration

### 1. Start the Development Server

```bash
cd /Users/elijahlucian/repos/elijahlucian.ca/.references/nextgenart/sketchy-3d
npm run dev
```

### 2. Check Connection Mode

Open browser console and look for:
```
Attempting WebSocket connection...
WebSocket connected successfully
🔗 Connected to relay via websocket
```

Or if WebSocket fails:
```
Attempting WebSocket connection...
WebSocket connection timeout, falling back to SSE...
Using SSE connection...
SSE connected successfully
🔗 Connected to relay via sse
📸 Initial state snapshot loaded
```

### 3. Send Test OSC Messages

Use the test scripts to send OSC data:

```bash
# From the sketchy-3d directory
node test-osc.js

# Or with Python
python3 test-osc.py
```

### 4. Verify Data Reception

Watch the browser console for:
```
OSC received: /bpm [128]
→ BPM updated: 128
Current URL: http://localhost:5173/?bpm=128
```

### 5. Test SSE Mode

Force SSE mode to test the fallback:

```typescript
const relay = new RelayClient(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca',
  { preferSSE: true }
)
```

## Debugging Tips

### Check Relay Service

```bash
# Check if relay is accessible
curl https://relay.elijahlucian.ca/state

# Should return JSON with current OSC values
```

### Test WebSocket Directly

```javascript
// In browser console
const ws = new WebSocket('wss://relay.elijahlucian.ca/ws')
ws.onopen = () => console.log('WS Open')
ws.onmessage = (e) => console.log('WS Message:', e.data)
ws.onerror = (e) => console.error('WS Error:', e)
```

### Test SSE Directly

```javascript
// In browser console
const es = new EventSource('https://relay.elijahlucian.ca/state/stream')
es.addEventListener('update', (e) => console.log('SSE Update:', e.data))
es.addEventListener('meta', (e) => console.log('SSE Meta:', e.data))
es.onerror = (e) => console.error('SSE Error:', e)
```

### Common Issues

**"WebSocket connection timeout, falling back to SSE"**
- This is normal if WebSocket is blocked by firewall/proxy
- SSE fallback should work automatically
- Check that `/state/stream` endpoint is accessible

**"SSE error: [object Event]"**
- Check relay service is running
- Verify CORS headers are set correctly
- Try accessing `/state` endpoint directly in browser

**"OSC messages not received"**
- Verify OSC messages are being sent to correct port (57121)
- Check relay service logs for incoming OSC messages
- Test with curl: `curl https://relay.elijahlucian.ca/state`

## Advanced Usage

### Custom Initialization Logic

Handle different connection modes with custom initialization:

```typescript
data.relay.on('connect', () => {
  const mode = data.relay.getMode()

  if (mode === 'websocket') {
    console.log('Using WebSocket - low latency mode')
    // Request initial state from relay
    data.relay.send({ type: 'request_state' })
  } else if (mode === 'sse') {
    console.log('Using SSE - reliable mode with caching')
    // State snapshot will arrive via 'snapshot' event
  }
})
```

### Monitoring Connection Quality

Track connection status and quality:

```typescript
const stats = {
  mode: 'disconnected',
  reconnects: 0,
  messageCount: 0,
  lastMessage: 0,
}

data.relay.on('connect', () => {
  stats.mode = data.relay.getMode()
  stats.reconnects++
})

data.relay.on('osc', (e) => {
  stats.messageCount++
  stats.lastMessage = Date.now()
})

// Check connection health every 5 seconds
setInterval(() => {
  const timeSinceLastMessage = Date.now() - stats.lastMessage
  if (timeSinceLastMessage > 10000) {
    console.warn('No messages in 10s - connection may be stale')
  }
  console.log('Stats:', stats)
}, 5000)
```

### Graceful Shutdown

Clean up relay connection when sketch is destroyed:

```typescript
// In sketch cleanup/unmount
if (data.relay) {
  data.relay.close()
  console.log('Relay connection closed')
}
```

## Performance Considerations

### WebSocket Mode
- Lower latency: ~10-50ms
- Better for high-frequency updates (>30 updates/second)
- Ideal for local development
- Requires stable network connection

### SSE Mode
- Higher latency: ~50-200ms
- Better for moderate update rates (<30 updates/second)
- More reliable through proxies/firewalls
- State caching reduces sync issues
- Automatic browser-level reconnection

### Hybrid Mode (Default)
- Best of both worlds
- Uses WebSocket when available (5s timeout)
- Falls back to SSE when needed
- Production-ready configuration
