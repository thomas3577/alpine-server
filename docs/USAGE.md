# Usage

## CLI Quickstart

Create a new project scaffold:

```sh
deno create jsr:@dx/alpine-server my-app
```

Alternative using the explicit CLI entrypoint:

```sh
deno run -A jsr:@dx/alpine-server/cli new my-app
```

With options:

```sh
deno create jsr:@dx/alpine-server my-app --port 3000 --force
```

Then run the generated app:

```sh
cd my-app
deno run --allow-net --allow-read --allow-write --allow-env --watch main.ts
```

## Basic Setup

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

## Custom Middleware

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

## Custom Routes

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

## Combining Middleware and Routes

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

## Directory Structure

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
