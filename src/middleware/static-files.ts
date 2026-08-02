import type { Context, Next } from '@hono/hono';
import { serveStatic } from '@hono/hono/deno';
import { extname } from '@std/path';
import type { AlpineAppState } from '../types.ts';

/**
 * Serves files with allowed extensions from the configured static root.
 */
export const staticFiles = (c: Context<{ Variables: AlpineAppState }>, next: Next): Promise<Response | void> => {
  const pathname = c.req.path;
  const config = c.get('config');

  if (!config.staticExtensions.includes(extname(pathname))) {
    return next();
  }

  const serve = serveStatic({
    root: config.staticFilesPath,
    onNotFound: () => {
      // Signals a miss through the same path oak's send() used: a thrown
      // Deno.errors.NotFound caught by the app-wide error handler.
      throw new Deno.errors.NotFound(`Static file not found: ${pathname}`);
    },
  });

  return serve(c, next);
};
