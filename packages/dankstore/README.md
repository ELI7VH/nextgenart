# DankStore

Browser customization overlay with URL params, localStorage, and real-time sync.

## Features

- 🎨 Beautiful gear icon UI overlay
- 🔗 Reads from URL parameters automatically
- 💾 Saves to localStorage
- ⚡ Real-time updates to URL and state
- 🎯 Auto-creates inputs for URL params
- ⌨️ Keyboard shortcut (Cmd/Ctrl + ,)

## Installation

### Via CDN

```html
<!-- unpkg -->
<script src="https://unpkg.com/@dank-inc/dankstore"></script>

<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/npm/@dank-inc/dankstore"></script>
```

### Via npm

```bash
npm install @dank-inc/dankstore
```

## Usage

```html
<script src="https://unpkg.com/@dank-inc/dankstore"></script>
<script>
  // Access customization data
  const settings = window.dankstore.get();

  // Register customizable fields
  window.dankstore.register({
    theme: { type: 'select', options: ['dark', 'light'], default: 'dark' },
    speed: { type: 'range', min: 0, max: 100, default: 50, parse: Number },
    enabled: { type: 'checkbox', default: true }
  });

  // Or just use URL params: ?color=red&size=large
  // These will automatically create text inputs in the UI
</script>
```

## API

### `window.dankstore.get(key?)`

Get a value from the store. If no key provided, returns all settings.

```js
const bpm = window.dankstore.get('bpm')
const allSettings = window.dankstore.get()
```

### `window.dankstore.set(key, value)`

Set a value in the store. Automatically saves to localStorage and updates URL.

```js
window.dankstore.set('bpm', 120)
```

### `window.dankstore.register(schema)`

Register field schemas with types and defaults.

```js
window.dankstore.register({
  bpm: {
    type: 'range',
    min: 60,
    max: 200,
    default: 81.44,
    parse: Number // Convert URL string to number
  }
})
```

## Field Types

- `text` - Text input
- `range` - Range slider (requires `min`, `max`)
- `checkbox` - Checkbox
- `select` - Dropdown (requires `options` array)
- `color` - Color picker

## Parse Functions

Use `parse` to convert URL string params to the correct type:

```js
{
  parse: Number,      // "123" → 123
  parse: Boolean,     // "true" → true
  parse: JSON.parse,  // "[1,2,3]" → [1,2,3]
  parse: (v) => v.toUpperCase() // custom
}
```

## Keyboard Shortcut

Press `Cmd/Ctrl + ,` to open/close the settings overlay.

## License

MIT
