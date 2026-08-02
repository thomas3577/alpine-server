import { assert, assertEquals } from '@std/assert';
import { Hono } from '@hono/hono';
import { join } from '@std/path';
import { router } from './views.ts';
import { UPDATER_FILENAME } from '../config.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';
import type { AlpineAppState, IRuntimeConfig } from '../types.ts';

const createApp = (config: IRuntimeConfig): Hono<{ Variables: AlpineAppState }> => {
  const app = new Hono<{ Variables: AlpineAppState }>();

  app.use(async (c, next) => {
    c.set('config', config);
    await next();
  });
  app.route('/', router);

  return app;
};

Deno.test('views route', async (t) => {
  await t.step('injects absolute updater path in dev mode', async () => {
    const root = await Deno.makeTempDir();

    try {
      await Deno.mkdir(join(root, 'foo'), { recursive: true });
      await Deno.writeTextFile(
        join(root, 'foo', 'index.html'),
        '<!doctype html><html><head><title>Foo</title></head><body>OK</body></html>',
      );

      const app = createApp(createRuntimeConfig(true, root));
      const response = await app.request('/foo');

      assertEquals(response.status, 200);

      const html = await response.text();
      const updaterSrc = `src="/${UPDATER_FILENAME}"`;
      assert(html.includes(updaterSrc));
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });

  await t.step('returns 404 for file-like paths', async () => {
    const root = await Deno.makeTempDir();

    try {
      const app = createApp(createRuntimeConfig(false, root));
      const response = await app.request('/vendor/phpunit.xsd');

      assertEquals(response.status, 404);
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });

  await t.step('returns 404 for path traversal attempts', async () => {
    const root = await Deno.makeTempDir();

    try {
      const app = createApp(createRuntimeConfig(false, root));
      const response = await app.request('/%2e%2e/secret');

      assertEquals(response.status, 404);
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });
});
