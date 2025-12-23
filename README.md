you like generative art? me too. here's some cool shit

"OPTIMIZE LATER"

# Architecture

## Relay Connection (OSC Integration)

The nextgenart projects support multiple connection methods to receive OSC (Open Sound Control) messages for real-time parameter control.

### Connection Methods

1. **WebSocket** - Bidirectional, lower latency (original)
2. **Server-Sent Events (SSE)** - One-way streaming, more reliable (new)
3. **Hybrid Client** - Auto-fallback from WebSocket to SSE (recommended)

### Recommended Setup

```typescript
import { RelayClient } from './lib/RelayClient'

const relay = new RelayClient(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca'
)

relay.on('connect', () => {
  console.log('Connected via:', relay.getMode())
})

relay.on('osc', (data) => {
  console.log('OSC:', data.address, data.args)
})
```

### Endpoints

- **WebSocket**: `wss://relay.elijahlucian.ca/ws`
- **SSE Stream**: `https://relay.elijahlucian.ca/state/stream`
- **State Snapshot**: `https://relay.elijahlucian.ca/state`

### Message Flow
```
OSC Source → Relay Service (UDP:57121) → WebSocket/SSE → nextgenart → dankstore → URL params
```

### Key Features
- Multiple connection methods with automatic fallback
- State snapshot on connection (SSE mode)
- Value caching for latest OSC data
- Lower latency WebSocket with SSE reliability
- Automatic reconnection (3s interval)
- No external dependencies (uses browser APIs)
- Automatic URL parameter sync via dankstore

### Implementation Files
- `/sketchy-3d/src/lib/RelayClient.ts` - Hybrid client (recommended)
- `/sketchy-3d/src/lib/RelaySocket.ts` - WebSocket-only client
- `/sketchy-3d/src/lib/RelaySSE.ts` - SSE-only client
- `/sketchy-3d/RELAY_SSE.md` - SSE integration guide
- `/sketchy-3d/RELAY_CONNECTION.md` - WebSocket connection details
- `/sketchy-3d/OSC_DANKSTORE_INTEGRATION.md` - OSC message handling and parameter mapping

### Important Notes
- Uses **native browser APIs**, NOT Socket.IO
- RelayClient provides unified interface regardless of connection method
- Environment variable `VITE_SOCKET_URL` controls endpoint
- All OSC parameters automatically sync to URL via dankstore
- Supports generic `/param/{name}` pattern for any registered parameter
- SSE mode provides state caching and initial snapshot

# genuary 2025

[Prompts](https://genuary.art/prompts)

## day 1

- [source](https://t.me/brainnoodles42/980)
- [demo](https://t.me/brainnoodles42/1001)

## day 2

- [source](https://t.me/brainnoodles42/986)
- [demo](https://t.me/brainnoodles42/983)

## day 3

- [demo](https://t.me/brainnoodles42/995)
- []

## day 4

- [source](https://github.com/ELI7VH/nextgenart/tree/genuary-4-2025)
- [live](https://genuary.4.2025.elijahlucian.ca/)

# todo

- [ ] automated deployments based on branch name
  - https://docs.digitalocean.com/products/app-platform/how-to/create-apps/#create-resource-from-source-code-using-automation
  - https://docs.digitalocean.com/products/app-platform/how-to/manage-domains/#add-a-domain-to-an-app-using-automation
- add config / dockerfile file pointing to latest iteration of this project.
