/** Converts thrown errors into HTTP responses. */
import type { ErrorHandler } from '@hono/hono';
import { HTTPException } from '@hono/hono/http-exception';
import type { AlpineAppState } from '../types.ts';
import { error } from '@std/log';

/**
 * Converts thrown errors into HTTP responses with optional debug details.
 *
 * Registered via `app.onError()` rather than `app.use()`: Hono's dispatcher
 * resolves thrown errors into a response at the point they occur (via the
 * app-wide error handler) before a wrapping try/catch middleware would ever
 * see them, so a plain try/catch-around-next() middleware cannot intercept
 * handler errors here the way it can in oak.
 */
export const errorHandler: ErrorHandler<{ Variables: AlpineAppState }> = (err, c) => {
  if (err instanceof HTTPException) {
    const { message, status, stack } = err;
    const includeStack = c.get('config').dev;
    const acceptsJson = (c.req.header('Accept') ?? '').includes('application/json');

    if (acceptsJson) {
      return c.json(includeStack ? { message, status, stack } : { message, status }, status);
    }

    return c.text(includeStack ? `${status} ${message}\n\n${stack ?? ''}` : `${status} ${message}`, status);
  } else if (err instanceof Deno.errors.NotFound) {
    // Avoid crashing/logging on benign filesystem probes.
    return c.text('Not Found', 404);
  } else {
    error(err);

    return c.text(c.get('config').dev ? `Internal Server Error\n\n${String(err)}` : 'Internal Server Error', 500);
  }
};
