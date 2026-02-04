import { Router } from '@oak/oak';
import { vendorCache } from '../services/vendor.ts';

const router = new Router({ prefix: '/vendor' });

// Handle all CDN requests with whitelist
router.get('/:filename', async (ctx) => {
  const filename = ctx.params.filename;

  // Check whitelist
  const cdnPath = ctx.state.config.vendors[filename] ?? ctx.state.config.vendors[`/${filename}`];
  if (!cdnPath) {
    ctx.throw(404, 'Resource not found in whitelist');
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

export { router };
