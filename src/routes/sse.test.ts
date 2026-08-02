import { assert, assertEquals } from '@std/assert';
import { Hono } from '@hono/hono';
import { router } from './sse.ts';
import { errorHandler } from '../middleware/error-handler.ts';
import { service } from '../services/sse.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';
import type { AlpineAppState } from '../types.ts';

const createApp = (): Hono<{ Variables: AlpineAppState }> => {
  const app = new Hono<{ Variables: AlpineAppState }>();

  app.use(async (c, next) => {
    c.set('config', createRuntimeConfig(false, './public'));
    await next();
  });
  app.onError(errorHandler);
  app.route('/sse', router);

  return app;
};

Deno.test('sse route', async (t) => {
  await t.step('returns 415 for unsupported media type', async () => {
    service.close();
    const app = createApp();

    const response = await app.request('/sse', { headers: { Accept: 'application/json' } });

    assertEquals(response.status, 415);
    assertEquals(service.clients.size, 0);
  });

  await t.step('opens an event-stream connection and registers a client', async () => {
    service.close();
    const app = createApp();

    const response = await app.request('/sse', { headers: { Accept: 'text/event-stream' } });

    assertEquals(response.status, 200);
    assert(response.headers.get('content-type')?.includes('text/event-stream'));
    assertEquals(service.clients.size, 1);

    // Cancelling the body triggers stream.onAbort, which alone must clean up the client.
    await response.body?.cancel();
    assertEquals(service.clients.size, 0);

    // Final cleanup in case anything was left registered.
    service.close();
  });
});
