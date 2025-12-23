# Environment Configuration

This sketch uses Vite environment variables to configure the WebSocket connection to the relay service.

## Environment Files

The project supports multiple environment files:

- `.env.development` - Used when running `npm run dev`
- `.env.production` - Used when running `npm run build`
- `.env.example` - Template file (tracked in git)

## WebSocket Configuration

The WebSocket URL is controlled by the `VITE_SOCKET_URL` environment variable. The application uses a custom WebSocket client (RelaySocket) that connects directly to the relay service at the `/ws` endpoint.

### Development Mode

```bash
npm run dev
```

Connects to: `ws://localhost:8080/ws` (configured in `.env.development`, `/ws` path is auto-appended)

### Production Build

```bash
npm run build
```

Connects to: `wss://relay.elijahlucian.ca/ws` (configured in `.env.production`, `/ws` path is auto-appended)

### Fallback Behavior

If `VITE_SOCKET_URL` is not defined, the application defaults to `https://relay.elijahlucian.ca`.

## Setup Instructions

1. Copy `.env.example` to create your environment files:
   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   ```

2. Edit the files with your desired WebSocket URLs:
   ```bash
   # .env.development
   VITE_SOCKET_URL=http://localhost:8080

   # .env.production
   VITE_SOCKET_URL=https://relay.elijahlucian.ca
   ```

   Note: The `/ws` path is automatically appended by RelaySocket. Do not include it in the URL.

3. Run the appropriate npm command:
   - Development: `npm run dev`
   - Production build: `npm run build`

## Custom WebSocket URL

To use a custom WebSocket URL without modifying environment files, you can create a `.env.local` file:

```bash
# .env.local (not tracked in git)
VITE_SOCKET_URL=http://your-custom-server:3000
```

This will override the default environment settings.

## TypeScript Support

The `VITE_SOCKET_URL` environment variable is typed in `src/vite-env.d.ts`:

```typescript
interface ImportMetaEnv {
  readonly VITE_SOCKET_URL: string
}
```

This provides autocomplete and type checking when accessing `import.meta.env.VITE_SOCKET_URL`.

## Implementation

The WebSocket connection is initialized in `src/main.ts`:

```typescript
socket: new RelaySocket(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca',
)
```

The RelaySocket class (in `src/lib/RelaySocket.ts`) handles:
- Automatic protocol conversion (http:// → ws://, https:// → wss://)
- Automatic `/ws` path appending
- Reconnection logic
- Socket.IO-like event interface for compatibility
