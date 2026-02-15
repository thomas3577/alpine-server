import { Router } from '@oak/oak';
import { vendorCache } from '../services/vendor.ts';
import type { IVendors } from '../types.ts';

/**
 * Builds a router that proxies and caches configured vendor CDN assets.
 *
 * @param vendors Vendor route configuration.
 */
export const createVendorRouter = (vendors: IVendors) => {
  const prefix = (vendors.route && vendors.route !== '/') ? vendors.route : undefined;
  const router = new Router({ prefix });

  // Handle all CDN requests with whitelist
  router.get('/:filename(.*)', async (ctx, next) => {
    const filename = ctx.params.filename;

    // Check whitelist
    let cdnPath = ctx.state.config.vendors.map[filename] ?? ctx.state.config.vendors.map[`/${filename}`];

    if (!cdnPath && filename?.endsWith('.map')) {
      const originalFilename = filename.slice(0, -4);
      const originalCdnPath = ctx.state.config.vendors.map[originalFilename] ?? ctx.state.config.vendors.map[`/${originalFilename}`];
      if (originalCdnPath) {
        cdnPath = `${originalCdnPath}.map`;
      }
    }

    if (!cdnPath) {
      await next();
      return;
    }

    try {
      const entry = await vendorCache.getOrFetch(cdnPath);

      // Set headers
      ctx.response.headers.set('Content-Type', entry.contentType);
      ctx.response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');

      // Set body
      ctx.response.body = entry.content;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      ctx.throw(502, `Failed to fetch vendor resource: ${message}`);
    }
  });

  return router;
};
