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
- 📦 **Vendor CDN Proxy** – Serve Alpine.js from esm.sh with in-memory caching
- ⚡ **Performance** – Response timing headers, Server-Timing API
- 🎯 **Alpine.js Ready** – Auto-injects updater script in dev, CSP configured for Alpine
- 📝 **Request Logging** – Colored console logs with timing info

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
│   └── pages/
│       └── about/
│           └── index.html
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

## Development Mode

Enable `dev: true` for:

- **Hot Reload**: File watcher + SSE auto-reloads the browser when files in `staticFilesPath` change
- **Verbose Errors**: Stack traces included in error responses (JSON + plain text)
- **Updater Script**: Auto-injected `<script src="updater.js">` into HTML responses (connects to `/sse` endpoint)

## Endpoints

| Path                    | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `GET /`                 | Serves `index.html` from static root                    |
| `GET /:path*`           | Serves static files or `index.html` from subdirectories |
| `GET /alpinejs.mjs`     | Alpine.js vendor proxy (esm.sh, cached in memory)       |
| `GET /alpinejs.mjs.map` | Source map for Alpine.js                                |
| `GET /sse`              | Server-Sent Events endpoint for hot reload (dev mode)   |
| `GET /updater.js`       | Hot reload client script (dev mode, localhost only)     |

## Security Features

### Bot Shield

- Blocks common exploit paths (`/vendor`, `/.env`, `/wp-admin`, etc.)
- Blocks dangerous file extensions (`.php`, `.env`, `.sql`, etc.)
- Per-IP rate limiting (180 requests/minute)

### Security Headers (Production)

- `Content-Security-Policy` (Alpine-compatible: allows `'unsafe-eval'`)
- `Strict-Transport-Security` (HSTS, production only)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Cross-Origin-Opener-Policy: same-origin`

### Path Traversal Protection

- Static file paths must stay within `staticFilesPath` (enforced at config parsing)
- URL path traversal attempts (`..`, `\`, null bytes) are blocked

## Running Tasks

```bash
# Run the app
deno task run

# Format & lint
deno task check

# Update dependencies
deno task update
```

## Permissions Required

- `--allow-net` – HTTP server + vendor CDN fetches
- `--allow-read` – Static file serving + file watching
- `--allow-env` – Optional (for environment-based config)

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

In dev mode, the server auto-injects the hot-reload script before `</head>`.

## API Reference

### `app.use(middleware)`

Registers custom middleware that runs after system middlewares but before routes.

**Parameters:**

- `middleware` – Oak middleware function `(ctx, next) => Promise<void>`

**Returns:** `this` (chainable)

### `app.append(router)`

Appends an Oak Router to the application. Routes are registered after middlewares but before internal routes.

**Parameters:**

- `router` – Oak `Router` instance

**Returns:** `this` (chainable)

### `app.run()`

Starts the application server. Can only be called once per instance.

**Returns:** `Promise<void>`

**Throws:** `Error` if the application is already running

## Architecture

Built on [Oak](https://jsr.io/@oak/oak) with middleware pipeline:

1. **Error Handler** – JSON/text error responses (verbose in dev)
2. **Logger** – Colored request logs
3. **Timing** – `X-Response-Time` + `Server-Timing` headers
4. **Security Headers** – CSP, HSTS, etc.
5. **Bot Shield** – Rate limiting + exploit blocking
6. **Vendor Proxy** – Alpine.js CDN with caching
7. **User Middlewares** – Custom middleware added via `use()`
8. **User Routes** – Custom routes added via `append()`
9. **Updater** – Hot reload client (dev)
10. **Static Files** – Serves files by extension
11. **SSE** – Hot reload event stream (dev)
12. **View Router** – Catch-all for `index.html` routing

## License

MIT

## Contributing

Contributions welcome! Please ensure `deno task check` passes before submitting PRs.
