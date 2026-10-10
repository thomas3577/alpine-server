/** Serves individual static files by extension from the configured static root. */
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Readable } from 'node:stream';
import type { Context, Next } from '@hono/hono';
import { serveStatic } from '@hono/hono/serve-static';
import { isNotFoundError } from '../utils.ts';
import type { AlpineAppState } from '../types.ts';

const getContent = async (path: string): Promise<ReadableStream | null> => {
  try {
    if (!(await stat(path)).isFile()) {
      return null;
    }
  } catch (err) {
    if (isNotFoundError(err)) {
      return null;
    }

    throw err;
  }

  return Readable.toWeb(createReadStream(path)) as ReadableStream;
};

/**
 * Serves files with allowed extensions from the configured static root.
 *
 * Uses Hono's runtime-neutral `serveStatic` core, which rejects `..` segments,
 * backslashes, repeated slashes, and any `%` (so `%2e%2e` can't sneak past
 * decoding) before a path is joined to the root; files are read via `node:fs`.
 */
export const staticFiles = (c: Context<{ Variables: AlpineAppState }>, next: Next): Promise<Response | void> => {
  const pathname = c.req.path;
  const config = c.get('config');

  if (!config.staticExtensions.includes(extname(pathname))) {
    return next();
  }

  const serve = serveStatic({
    root: config.staticFilesPath,
    join,
    getContent,
    onNotFound: () => {
      // Misses flow through the app-wide error handler like any other not-found error.
      throw Object.assign(new Error(`Static file not found: ${pathname}`), { code: 'ENOENT' });
    },
  });

  return serve(c, next);
};
