# Direct Relay Service Connection

The sketchy-3d project now connects directly to the relay service using standard WebSocket protocol.

## What Changed

### Before
- Used Socket.IO client library
- Connected to Socket.IO server endpoint
- Dependency on `socket.io-client` package

### After
- Uses native WebSocket with custom RelaySocket wrapper
- Connects directly to relay service at `/ws` endpoint
- No external dependencies (uses browser WebSocket API)

## Architecture

```
┌─────────────────┐
│   OSC Source    │
│  (ThinAmp/etc)  │
└────────┬────────┘
         │ UDP :57121
         ▼
┌─────────────────┐
│  Relay Service  │  (Go server)
│   Port 8080     │
└────────┬────────┘
         │ WebSocket /ws
         ▼
┌─────────────────┐
│   Sketchy-3D    │  (Browser client)
│   (RelaySocket) │
└─────────────────┘
```

## Key Features

### RelaySocket Class
Located at `/src/lib/RelaySocket.ts`, this custom WebSocket wrapper provides:

- **Automatic Protocol Conversion**: Converts http:// → ws://, https:// → wss://
- **Automatic Path Appending**: Adds `/ws` to the base URL
- **Reconnection Logic**: Automatically reconnects every 3 seconds on disconnect
- **Socket.IO-like Interface**: Compatible event API (`.on()`, `.emit()`)
- **Connection State Tracking**: Exposes `.connected` and `.id` properties

### Configuration

Environment variables control the WebSocket URL:

```bash
# Development (.env.development)
VITE_SOCKET_URL=http://localhost:8080

# Production (.env.production)
VITE_SOCKET_URL=https://relay.elijahlucian.ca
```

The `/ws` path is automatically appended by RelaySocket.

## Benefits

1. **Direct Connection**: No intermediary routing through main server
2. **Lower Latency**: Fewer hops between OSC source and client
3. **Better Performance**: Native WebSocket is faster than Socket.IO
4. **Simplified Stack**: One less dependency to maintain
5. **Clear Separation**: Relay handles OSC, main server handles API

## Migration Notes

### Removed
- `socket.io-client` package from dependencies
- Import of `io` from 'socket.io-client'

### Added
- `/src/lib/RelaySocket.ts` - Custom WebSocket client
- Import of `RelaySocket` class

### Updated
- Socket initialization: `io(url)` → `new RelaySocket(url)`
- All socket event handlers remain unchanged (compatible API)
- Environment file documentation updated
- Integration documentation updated

## Testing

To verify the connection:

1. **Start the relay service**:
   ```bash
   docker compose up relay
   ```

2. **Run the sketch**:
   ```bash
   cd .references/nextgenart/sketchy-3d
   npm run dev
   ```

3. **Check browser console** for connection messages:
   ```
   Connecting to relay: ws://localhost:8080/ws
   WebSocket connected to relay
   Relay server: Connected to relay WebSocket server
   ```

4. **Send test OSC message**:
   ```bash
   node test-osc.js localhost
   ```

5. **Verify in console**:
   ```
   OSC received: /bpm [128]
   → Updated dankstore & URL: bpm=128
   ```

## Troubleshooting

If the connection fails:

1. Verify relay service is running: `docker compose ps relay`
2. Check relay logs: `docker compose logs -f relay`
3. Verify WebSocket endpoint: Open browser DevTools → Network → WS
4. Check for CORS errors in console
5. Verify environment variable is set correctly

## Deployment

For production deployment:

1. Ensure `relay.elijahlucian.ca` resolves to the relay service
2. Verify port 8080 is accessible for WebSocket connections
3. Use HTTPS/WSS for secure connections
4. Build with production env: `npm run build`

The production build will automatically use `wss://relay.elijahlucian.ca/ws`.
