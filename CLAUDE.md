# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

`@dx/alpine-server` is a Deno + TypeScript library wrapping Hono to serve Alpine.js applications, with built-in security hardening, static file serving, vendor CDN proxying, and dev-mode hot-reload. Published on JSR; still experimental/pre-1.0 — the public API (`mod.ts`) can change, but changes should be deliberate, not incidental. It includes a separate CLI (`cli/`) for scaffolding new projects.

## Commands

```sh
deno task check                          # deno fmt --check && deno lint
deno task test                           # run the full test suite
deno test --allow-run --allow-read --allow-write src/middleware/vendor.test.ts   # run a single test file
deno task example                        # runs example/app.ts on :8000 for manual verification
deno task update                         # deno outdated --update --latest
```

Tests live next to the module they cover (`*.test.ts`), using `Deno.test` with `t.step` for grouped cases.

## Architecture

### Request pipeline (`src/app.ts`)

`AlpineApp` wraps a `Hono<{ Variables: AlpineAppState }>` instance. `run()` registers middleware/routes in a fixed order — preserve this order unless there's a strong reason to change it:

1. state-seed (`c.set('config', runtime)`)
2. `app.onError(errorHandler)`
3. `logger` → `timing` → `securityHeaders` (each runs its own logic _after_ `await next()`)
4. vendor sub-app, mounted at `runtime.vendors.route`
5. user middlewares (registered via `.use()`)
6. user sub-apps (registered via `.append()`, mounted at `/`)
7. updater route (mounted at both `/updater.js` and `/updater.js/` — see note below)
8. `staticFiles`
9. `sse` sub-app (mounted at `/sse`)
10. `views` sub-app (catch-all `/:site{.*}`, mounted at `/`) — must stay last since it matches almost anything

**Error handling is not a middleware.** Hono's `compose()` resolves a thrown error into a response at the dispatch level closest to where it's thrown, via the app-wide `onError` handler — _before_ a wrapping `try/catch` middleware would ever see it. This means the oak/Express-style "error-handling middleware wraps `next()` in try/catch" pattern silently does nothing in Hono. `src/middleware/error-handler.ts` is registered via `app.onError(errorHandler)`, not `app.use(errorHandler)`. One consequence: middlewares registered _before_ the error site (`logger`, `timing`, `securityHeaders`) still run their post-`next()` code on an error response, since the promise never actually rejects up the chain — e.g. a 404 still gets timing/security headers applied.

**Route mounting quirk:** Hono's `app.route(prefix, subApp)` does not automatically match both `prefix` and `prefix/` the way oak's `Router({ prefix })` did. Routes that need both forms (see `updater` in `app.ts`) are mounted twice, once per path variant.

### Public API surface (`mod.ts`)

Re-exports `AlpineApp`, config/state types, and Hono's `Hono`/`Context`/`Middleware`(`MiddlewareHandler`)/`Next` — consumers build custom middleware/sub-apps directly against Hono's API and pass them to `AlpineApp.use()` / `.append()`. Changing these exports, or the shape of `AlpineAppConfig` (`{ app: AlpineAppRuntimeConfig, server: ServerModuleConfig }`), is a breaking change for consumers, not an internal detail — treat it accordingly (see `docs/USAGE.md` for the documented consumer-facing patterns).

`src/hono.ts` (exported as `./hono`, i.e. `@dx/alpine-server/hono`) separately re-exports the _full_ `@hono/hono` surface, including subpaths like `http-exception` and `cookie` that `mod.ts` doesn't cover. Its overlap with `mod.ts` on `Hono`/`Context`/`Middleware`/`Next` is deliberate — a convenience duplication, not an oversight — so consumers never need `hono`/`@hono/hono` as a direct dependency, whether they only need the core types (`mod.ts`) or the wider API (`/hono`).

### SSE / dev-mode hot reload (`src/services/sse.ts`, `src/routes/sse.ts`)

Hono's `streamSSE()` only exposes a writable stream _inside_ the per-connection callback — there's no handle to push into from outside a request the way oak's `sendEvents()` provided. `SseClient` is a small custom async push/pull queue bridging that gap: the filesystem watcher (`staticFileWatch`, running outside any request) calls `client.push(...)`, and each connection's `streamSSE` callback drains its own client via `for await`. `SseService` is the broadcast hub holding the set of connected clients. The browser side (`src/routes/updater-client.js`) only listens for a `'reload'` event name and calls `location.reload()` — event `data` is not read.

### Static files vs. views

Two different code paths serve content, split by whether the path has a known static-file extension:

- `src/middleware/static-files.ts`: extension-gated (`config.staticExtensions`), serves individual files via Hono's Deno `serveStatic`, with a custom `onNotFound` hook that throws `Deno.errors.NotFound` so misses flow through the same `errorHandler` path as everything else (Hono's `serveStatic` normally falls through to `next()` instead of throwing).
- `src/routes/views.ts`: catch-all `/:site{.*}` route for directory-style requests, reads `index.html` directly via `Deno.readTextFile`, and in dev mode injects the updater `<script>` tag via `linkedom`. `isPathTraversalAttempt`/`looksLikeFileRequest` guard against escaping the static root and against directory routes swallowing file-like requests that should 404 instead.

`resolveStaticFilesPath` (`src/utils.ts`) is the single point enforcing that a configured `staticFilesPath` can't resolve outside `Deno.cwd()`.

### Vendor CDN proxying (`src/middleware/vendor.ts`, `src/services/vendor.ts`)

A whitelist-based reverse proxy/cache for CDN assets (default: Alpine.js and its plugins from esm.sh, see `defaultVendors` in `src/config.ts`). The whitelist is read from request-time context (`c.get('config').vendors.map`), not a value captured when the router was built. `VendorCache` is an in-memory `Map` keyed by CDN URL, populated lazily on first request.

### CLI (`cli/`)

Separate from the runtime library — scaffolds new projects (`cli/scaffold.ts`, `cli/templates.ts`) and adds pages to existing ones. Exposed via `jsr:@dx/alpine-server/cli` and `deno create`. If `AlpineAppConfig`'s shape changes, `cli/templates.ts`'s generated `app.ts` template needs updating too; already-scaffolded consumer projects are out of scope.

## Conventions

- 2-space indentation, single quotes, semicolons; concise JSDoc on exported APIs.
- Never relax CSP/HSTS/security headers without explicit justification in code comments and docs.
- Dev-only behavior must stay guarded by config flags (`config.dev`); production defaults must stay safe.
- If behavior or configuration changes, update `docs/USAGE.md` / `docs/CONFIGURATION.md` / `README.md` alongside the code, and update `mod.ts` + its tests if exports change.

## Git Guidelines

- Do not add 'Co-Authored-By', generator tags, or any AI references to commit messages or PR descriptions.
- Keep commit messages concise and strictly focused on changes.
