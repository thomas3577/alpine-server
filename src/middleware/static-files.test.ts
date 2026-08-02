import { assertEquals } from '@std/assert';
import { Hono } from '@hono/hono';
import { staticFiles } from './static-files.ts';
import { errorHandler } from './error-handler.ts';
import type { AlpineAppState } from '../types.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';

const createApp = (staticExtensions: string[], root: string): Hono<{ Variables: AlpineAppState }> => {
  const app = new Hono<{ Variables: AlpineAppState }>();

  app.use(async (c, next) => {
    c.set('config', { ...createRuntimeConfig(false, root), staticExtensions });
    await next();
  });
  app.onError(errorHandler);
  app.use(staticFiles);
  app.all('*', (c) => c.text('fallback-reached'));

  return app;
};

Deno.test('staticFiles', async (t) => {
  await t.step('should call next for non-static extensions', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/api/data');

    assertEquals(await response.text(), 'fallback-reached');
  });

  await t.step('should call next for paths without extension', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/');

    assertEquals(await response.text(), 'fallback-reached');
  });

  await t.step('should not call next for .html files (404 on miss)', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/index.html');

    assertEquals(response.status, 404);
  });

  await t.step('should not call next for .css files (404 on miss)', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/style.css');

    assertEquals(response.status, 404);
  });

  await t.step('should not call next for .js files (404 on miss)', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/app.js');

    assertEquals(response.status, 404);
  });

  await t.step('should respect custom staticExtensions list', async () => {
    const app = createApp(['.json'], './public');
    const response = await app.request('/data.json');

    assertEquals(response.status, 404);
  });

  await t.step('should call next for extensions not in list', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/image.png');

    assertEquals(await response.text(), 'fallback-reached');
  });

  await t.step('should serve an existing static file', async () => {
    const root = await Deno.makeTempDir();
    try {
      await Deno.writeTextFile(`${root}/style.css`, 'body { margin: 0; }');
      const app = createApp(['.html', '.css', '.js'], root);
      const response = await app.request('/style.css');

      assertEquals(response.status, 200);
      assertEquals(response.headers.get('content-type'), 'text/css; charset=utf-8');
      assertEquals(await response.text(), 'body { margin: 0; }');
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });
});
