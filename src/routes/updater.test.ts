import { assert, assertEquals } from '@std/assert';
import { Hono } from '@hono/hono';
import { router } from './updater.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';
import type { AlpineAppState } from '../types.ts';

const createApp = (dev: boolean): Hono<{ Variables: AlpineAppState }> => {
  const app = new Hono<{ Variables: AlpineAppState }>();

  app.use(async (c, next) => {
    c.set('config', createRuntimeConfig(dev, Deno.cwd()));
    await next();
  });
  app.route('/updater.js', router);
  app.route('/updater.js/', router);

  return app;
};

Deno.test('updater route', async (t) => {
  await t.step('returns noop script in production', async () => {
    const app = createApp(false);
    const response = await app.request('/updater.js/');

    assertEquals(response.status, 200);
    assertEquals(await response.text(), ';');

    const canonicalResponse = await app.request('/updater.js');

    assertEquals(canonicalResponse.status, 200);
    assertEquals(await canonicalResponse.text(), ';');
  });

  await t.step('returns updater client script in development', async () => {
    const app = createApp(true);
    const response = await app.request('/updater.js/');

    assertEquals(response.status, 200);

    const script = await response.text();
    assert(script.length > 1);
    assert(script.includes('EventSource'));

    const canonicalResponse = await app.request('/updater.js');

    assertEquals(canonicalResponse.status, 200);
    const canonicalScript = await canonicalResponse.text();
    assert(canonicalScript.length > 1);
    assert(canonicalScript.includes('EventSource'));
  });
});
