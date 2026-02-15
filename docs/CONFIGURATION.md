# Configuration

## Interface `AlpineAppConfig`

```typescript
type AlpineAppConfig = {
  app?: {
    dev?: boolean; // Enable dev mode (hot reload, verbose errors)
    staticFilesPath?: string; // Path to static files (relative or absolute, must be inside cwd)
    staticExtensions?: string[]; // Allowed file extensions
    vendors?: Record<string, string>; // Custom vendor CDN mappings (filename -> URL)
  };
  oak?: {
    listenOptions?: ListenOptions; // Oak server listen options (port, hostname, etc.)
  };
};
```

## Default Values

- **`dev`**: `false` (production mode)
- **`staticFilesPath`**: `./public` (resolved against `Deno.cwd()`)
- **`staticExtensions`**: `['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt']`
- **`vendors`**: Alpine.js from esm.sh (can be extended or overridden)
- **`listenOptions`**: Oak defaults (port `8000`)

### Example: Production Config

```typescript
const app = new AlpineApp({
  app: {
    dev: false,
    staticFilesPath: './dist',
    staticExtensions: ['.html', '.css', '.js', '.svg', '.png', '.jpg', '.ico'],
  },
  oak: {
    listenOptions: {
      port: 8080,
      hostname: '0.0.0.0',
    },
  },
});
```

## Example: Custom Vendors

Add additional CDN resources or override defaults:

```typescript
const app = new AlpineApp({
  app: {
    vendors: {
      map: {
        // Add HTMX
        'htmx.js': 'https://unpkg.com/htmx.org@1.9.10',
        // Add Petite Vue
        'petite-vue.js': 'https://unpkg.com/petite-vue@0.4.1/dist/petite-vue.es.js',
        // Override default Alpine.js version
        'alpinejs.mjs': 'https://esm.sh/alpinejs@3.14.0/es2024/alpinejs.mjs',
      },
      // Optional: Serve vendors under a prefix (default: '/')
      // route: '/vendor'
    },
  },
});
```

Access vendors relative to root (or configured route):

```html
<script type="module" src="/alpinejs.mjs"></script>
<script src="/htmx.js"></script>
```
