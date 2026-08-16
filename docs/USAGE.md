# Usage

## CLI Quickstart

Create a new project scaffold:

```sh
deno create jsr:@dx/alpine-server -- my-app
```

Alternative using the explicit CLI entrypoint:

```sh
deno run -A jsr:@dx/alpine-server/cli new my-app
```

With options:

```sh
deno create jsr:@dx/alpine-server -- my-app --port 3000 --force
```

Then run the generated app:

```sh
cd my-app
deno task dev
```

## Adding Pages

Inside your project, add new pages using the local CLI:

```sh
deno task alp add about
deno task alp add contact
```

This creates `public/<page-name>/index.html` with an Alpine.js template that shares the root `style.css` and `main.js`.

Page names must be lowercase with optional hyphens (e.g. `about`, `about-us`, `contact`).

Use `--force` to overwrite an existing page:

```sh
deno task alp add about --force
```

### Global CLI Installation

For convenience, install the CLI globally:

```sh
deno install -gA jsr:@dx/alpine-server/cli --name alp
```

Then use it directly:

```sh
alp new my-app
cd my-app
alp add about
```

## Basic Setup

```typescript
import { AlpineApp } from '@dx/alpine-server';

const app = new AlpineApp({
  app: {
    dev: true,
    staticFilesPath: './public',
  },
  server: {
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
  server: { listenOptions: { port: 3000 } },
});

// Add custom middleware
app.use(async (c, next) => {
  console.log(`Processing: ${c.req.path}`);
  await next();
});

// Add authentication middleware
app.use(async (c, next) => {
  const token = c.req.header('Authorization');
  if (!token && c.req.path.startsWith('/api/')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});

await app.run();
```

## Custom Routes

Add custom routes using the `append()` method with a Hono instance:

```typescript
import { AlpineApp, Hono } from '@dx/alpine-server';

const app = new AlpineApp({
  server: { listenOptions: { port: 3000 } },
});

// Create a sub-app with API endpoints
const apiRouter = new Hono();

apiRouter.get('/api/users', (c) => {
  return c.json({ users: ['Alice', 'Bob'] });
});

apiRouter.post('/api/users', async (c) => {
  const body = await c.req.json();
  return c.json({ message: 'User created', user: body });
});

// Append the sub-app to the app
app.append(apiRouter);

await app.run();
```

### Using the Full Hono API

`@dx/alpine-server` re-exports `Hono`/`Context`/`Middleware`/`Next` from its main entrypoint for building sub-apps. For additional Hono utilities like `HTTPException` or the cookie helpers, import them from `@dx/alpine-server/hono` instead of adding `hono`/`@hono/hono` as a direct dependency:

```typescript
import { Hono } from '@dx/alpine-server';
import { HTTPException } from '@dx/alpine-server/hono';
import { getCookie, setCookie } from '@dx/alpine-server/hono';

const apiRouter = new Hono();

apiRouter.get('/api/profile', (c) => {
  const sessionId = getCookie(c, 'session_id');
  if (!sessionId) {
    throw new HTTPException(401, { message: 'Not authenticated' });
  }
  setCookie(c, 'last_seen', new Date().toISOString());
  return c.json({ sessionId });
});
```

## Combining Middleware and Routes

```typescript
import { AlpineApp, Hono } from '@dx/alpine-server';

const app = new AlpineApp({
  app: { dev: true, staticFilesPath: './public' },
  server: { listenOptions: { port: 3000 } },
});

// Add logging middleware
app.use(async (c, next) => {
  const start = Date.now();
  await next();
  console.log(`${c.req.method} ${c.req.path} - ${Date.now() - start}ms`);
});

// Add API routes
const router = new Hono();
router.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: Date.now() });
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
└── app.ts
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
