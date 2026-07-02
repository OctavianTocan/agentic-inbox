# Desktop / Tauri Patterns

Patterns for `apps/desktop` — Tauri 2.x with Vite + React + TanStack Router.

## Stack

- **Tauri 2.x** — Rust backend for native OS integration
- **Vite** — Frontend bundler (same as `apps/app`)
- **TanStack Router** — Client-side routing (shares `@comcom/app-core` route tree)
- **Tauri Plugins** — deep-link, shell, store

## Architecture

The desktop app is essentially the web product app (`apps/app`) wrapped in Tauri:

```
apps/desktop/
  src/                  Vite React frontend
    main.tsx            Entry point (createRoot)
    app.tsx             App component with routing
    globals.css         Tailwind styles
  src-tauri/
    tauri.conf.json     Tauri configuration
    src/
      lib.rs            Rust backend
```

## Entry Point

```tsx
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app';
import '@/globals.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

## Tauri Configuration

```json
{
  "app": {
    "windows": [{ "width": 1200, "height": 800, "resizable": true }]
  },
  "plugins": {
    "deep-link": { "desktop": { "schemes": ["tcc"] } }
  },
  "build": { "devUrl": "http://localhost:1420", "frontendDist": "../dist" }
}
```

## Tauri Plugins

### Deep Link (OAuth)

Handles `tcc://` URL scheme for OAuth callback:

```typescript
import { onOpenUrl } from '@tauri-apps/plugin-deep-link';

await onOpenUrl((urls) => {
  // Parse the callback URL and extract auth tokens
});
```

### Shell

Opens URLs in the system browser:

```typescript
import { open } from '@tauri-apps/plugin-shell';
await open('https://example.com');
```

### Store

Local persistent storage (replaces localStorage for Tauri):

```typescript
import { Store } from '@tauri-apps/plugin-store';
const store = await Store.load('settings.json');
await store.set('key', value);
const val = await store.get('key');
```

## Window Dragging

Custom title bar regions use `data-tauri-drag-region`:

```tsx
<div data-tauri-drag-region className="h-8 flex items-center">
  {/* Window controls */}
</div>
```

## Platform Detection

```typescript
const isTauri = '__TAURI__' in window;
// or
import { platform } from '@tauri-apps/plugin-os';
```

## Shared Code with Web

The desktop app imports from the same packages as `apps/app`:
- `@comcom/app-core` — routes, hooks, features
- `@comcom/app-shared` — shared components
- `@ui/design-system` — UI components
- `@platform/auth/client` — auth client

The difference is the auth flow (OAuth via deep-link instead of redirect) and native capabilities (file system, shell, store).
