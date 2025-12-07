# Environment Configuration

This sketch uses Vite environment variables to configure the socket.io connection address.

## Environment Files

The project supports multiple environment files:

- `.env.development` - Used when running `npm run dev`
- `.env.production` - Used when running `npm run build`
- `.env.example` - Template file (tracked in git)

## Socket Configuration

The socket URL is controlled by the `VITE_SOCKET_URL` environment variable.

### Development Mode

```bash
npm run dev
```

Connects to: `http://localhost:8080` (configured in `.env.development`)

### Production Build

```bash
npm run build
```

Connects to: `https://relay.elijahlucian.ca` (configured in `.env.production`)

### Fallback Behavior

If `VITE_SOCKET_URL` is not defined, the application defaults to `https://relay.elijahlucian.ca`.

## Setup Instructions

1. Copy `.env.example` to create your environment files:
   ```bash
   cp .env.example .env.development
   cp .env.example .env.production
   ```

2. Edit the files with your desired socket URLs:
   ```bash
   # .env.development
   VITE_SOCKET_URL=http://localhost:8080

   # .env.production
   VITE_SOCKET_URL=https://relay.elijahlucian.ca
   ```

3. Run the appropriate npm command:
   - Development: `npm run dev`
   - Production build: `npm run build`

## Custom Socket URL

To use a custom socket URL without modifying environment files, you can create a `.env.local` file:

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

The socket connection is initialized in `src/main.ts`:

```typescript
socket: io(
  import.meta.env.VITE_SOCKET_URL || 'https://relay.elijahlucian.ca',
)
```
