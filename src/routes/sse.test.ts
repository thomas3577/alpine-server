import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

describe('sse route', () => {
  it('returns 415 for unsupported media type', async () => {
    service.close();
    const app = createApp();

    const response = await app.request('/sse', { headers: { Accept: 'application/json' } });

    assert.deepEqual(response.status, 415);
    assert.deepEqual(service.clients.size, 0);
  });

  it('opens an event-stream connection and registers a client', async () => {
    service.close();
    const app = createApp();

    const response = await app.request('/sse', { headers: { Accept: 'text/event-stream' } });

    assert.deepEqual(response.status, 200);
    assert.ok(response.headers.get('content-type')?.includes('text/event-stream'));
    assert.deepEqual(service.clients.size, 1);

    // An initial comment flushes the headers right away (Bun holds them back until the first chunk).
    const reader = response.body!.getReader();
    const first = await reader.read();
    assert.deepEqual(new TextDecoder().decode(first.value), ': connected\n\n');
    reader.releaseLock();

    // Cancelling the body triggers stream.onAbort, which alone must clean up the client.
    await response.body?.cancel();
    assert.deepEqual(service.clients.size, 0);

    // Final cleanup in case anything was left registered.
    service.close();
  });
});
