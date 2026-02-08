# @dx/alpine-server

[![JSR Version](https://jsr.io/badges/@dx/alpine-server)](https://jsr.io/@dx/alpine-server)
[![JSR Score](https://jsr.io/badges/@dx/alpine-server/score)](https://jsr.io/@dx/alpine-server/score)
[![ci](https://github.com/thomas3577/alpine-server/actions/workflows/deno.yml/badge.svg)](https://github.com/thomas3577/alpine-server/actions/workflows/deno.yml)

> ⚠️ **EXPERIMENTAL**: This library is in early development and highly experimental. APIs may change without notice. Not recommended for production use.

A secure, production-ready Oak (Deno) web server optimized for serving Alpine.js applications with built-in development tools, security hardening, and automatic hot-reloading.

## Features

- 🚀 **Static File Serving** – Configurable root directory with extension filtering
- 🔄 **Hot Reload** – Automatic browser refresh via SSE when files change (dev mode)
- 🛡️ **Security Hardening** – CSP, HSTS, bot/exploit blocking, rate limiting
- 📦 **Vendor CDN Proxy** – Configurable CDN resources with in-memory caching (Alpine.js included by default)
- ⚡ **Performance** – Response timing headers, Server-Timing API
- 🎯 **Alpine.js Ready** – Auto-injects updater script in dev, CSP configured for Alpine
- 📝 **Request Logging** – Colored console logs with timing info

## Versions

- **Oak**: v17.2.0
- **Alpine.js**: v3.15.8 (default configuration)

## Installation

```bash
deno add jsr:@dx/alpine-server
```

## Usage

### Basic Setup

```typescript
import { AlpineApp } from '@dx/alpine-server';

const app = new AlpineApp({
  app: {
    dev: true,
    staticFilesPath: './public',
  },
  oak: {
    listenOptions: { port: 3000 },
  },
});

await app.run();
```

### Custom Middleware

Add custom middleware using the `use()` method. Middleware runs after system middlewares (logging, security) but before routes:

```typescript
import { AlpineApp } from '@dx/alpine-server';

const app = new AlpineApp({
  oak: { listenOptions: { port: 3000 } },
});

// Add custom middleware
app.use(async (ctx, next) => {
  console.log(`Processing: ${ctx.request.url.pathname}`);
  await next();
});

// Add authentication middleware
app.use(async (ctx, next) => {
  const token = ctx.request.headers.get('Authorization');
  if (!token && ctx.request.url.pathname.startsWith('/api/')) {
    ctx.response.status = 401;
    ctx.response.body = { error: 'Unauthorized' };
    return;
  }
  await next();
});

await app.run();
```

### Custom Routes

Add custom routes using the `append()` method with an Oak Router:

```typescript
import { AlpineApp } from '@dx/alpine-server';
import { Router } from '@oak/oak';

const app = new AlpineApp({
  oak: { listenOptions: { port: 3000 } },
});

// Create a router with API endpoints
const apiRouter = new Router();

apiRouter.get('/api/users', (ctx) => {
  ctx.response.body = { users: ['Alice', 'Bob'] };
});

apiRouter.post('/api/users', async (ctx) => {
  const body = await ctx.request.body.json();
  ctx.response.body = { message: 'User created', user: body };
});

// Append the router to the app
app.append(apiRouter);

await app.run();
```

### Combining Middleware and Routes

```typescript
import { AlpineApp } from '@dx/alpine-server';
import { Router } from '@oak/oak';

const app = new AlpineApp({
  app: { dev: true, staticFilesPath: './public' },
  oak: { listenOptions: { port: 3000 } },
});

// Add logging middleware
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url.pathname} - ${Date.now() - start}ms`);
});

// Add API routes
const router = new Router();
router.get('/api/health', (ctx) => {
  ctx.response.body = { status: 'ok', timestamp: Date.now() };
});
app.append(router);

await app.run();
```

### Directory Structure

Place your HTML/CSS/JS files in the static directory (default: `./public`):

```shell
your-project/
├── public/
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── about/
│       └── index.html
└── main.ts
```

Access files at:

- `http://localhost:3000/` → `public/index.html`
- `http://localhost:3000/pages/about` → `public/pages/about/index.html`
- `http://localhost:3000/styles.css` → `public/styles.css`

## Configuration

### `AlpineAppConfig`

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

### Default Values

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

### Example: Custom Vendors

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

## Development Mode

Enable `dev: true` for:

- **Hot Reload**: File watcher + SSE auto-reloads the browser when files in `staticFilesPath` change
- **Verbose Errors**: Stack traces included in error responses (JSON + plain text)
- **Updater Script**: Auto-injected `<script src="updater.js">` into HTML responses (connects to `/sse` endpoint)

## Endpoints

| Path             | Description                                                   |
| ---------------- | ------------------------------------------------------------- |
| `GET /`          | Serves `index.html` from static root                          |
| `GET /:path*`    | Serves static files or `index.html` from subdirectories       |
| `GET /:filename` | Vendor CDN proxy with whitelist (default route, customizable) |

## Example HTML with Alpine.js

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>My Alpine App</title>
    <script type="module" src="/alpinejs.mjs"></script>
  </head>
  <body>
    <div x-data="{ count: 0 }">
      <button @click="count++">Increment</button>
      <span x-text="count"></span>
    </div>
  </body>
</html>
```

## License

MIT

## Contributing

Contributions welcome!
