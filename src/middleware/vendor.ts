import { Hono } from '@hono/hono';
import { HTTPException } from '@hono/hono/http-exception';
import { error } from '@std/log';
import { vendorCache } from '../services/vendor.ts';
import type { AlpineAppState } from '../types.ts';

/**
 * Builds a sub-app that proxies and caches configured vendor CDN assets.
 * Mount at `vendors.route` (defaults to `/`) via `app.route(...)`.
 * The whitelist is read from request-time config (`c.get('config').vendors.map`),
 * so no build-time vendor map needs to be passed in here.
 */
export const createVendorRouter = (): Hono<{ Variables: AlpineAppState }> => {
  const router = new Hono<{ Variables: AlpineAppState }>();

  // Handle all CDN requests with whitelist
  router.get('/:filename{.*}', async (c, next) => {
    const filename = c.req.param('filename');
    const vendorMap = c.get('config').vendors.map;

    // Check whitelist
    let cdnPath = vendorMap[filename] ?? vendorMap[`/${filename}`];

    if (!cdnPath && filename?.endsWith('.map')) {
      const originalFilename = filename.slice(0, -4);
      const originalCdnPath = vendorMap[originalFilename] ?? vendorMap[`/${originalFilename}`];
      if (originalCdnPath) {
        cdnPath = `${originalCdnPath}.map`;
      }
    }

    if (!cdnPath) {
      return next();
    }

    try {
      const entry = await vendorCache.getOrFetch(cdnPath);

      c.header('Content-Type', entry.contentType);
      c.header('Cache-Control', 'public, max-age=31536000, immutable');

      return c.body(entry.content as Uint8Array<ArrayBuffer>);
    } catch (err) {
      error(`Failed to fetch vendor resource ${cdnPath}: ${err instanceof Error ? err.message : String(err)}`);

      throw new HTTPException(502, { message: 'Failed to fetch vendor resource' });
    }
  });

  return router;
};
