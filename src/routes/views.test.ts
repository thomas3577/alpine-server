import { assert, assertEquals } from '@std/assert';
import { Application } from '@oak/oak';
import { join } from '@std/path';
import { router } from './views.ts';
import type { IRuntimeConfig } from '../types.ts';

const createRuntimeConfig = (dev: boolean, staticFilesPath: string): IRuntimeConfig => ({
  dev,
  production: !dev,
  staticFilesPath,
  staticExtensions: ['.html', '.css', '.js'],
  vendors: { map: {}, route: '/' },
});

const createApp = (config: IRuntimeConfig): Application => {
  const app = new Application();

  app.use(async (ctx, next) => {
    ctx.state.config = config;
    await next();
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

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
      const response = await app.handle(new Request('http://localhost/foo'));

      assert(response);
      assertEquals(response.status, 200);

      const html = await response.text();
      assert(html.includes('src="/updater.js"'));
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });

  await t.step('returns 404 for file-like paths', async () => {
    const root = await Deno.makeTempDir();

    try {
      const app = createApp(createRuntimeConfig(false, root));
      const response = await app.handle(new Request('http://localhost/vendor/phpunit.xsd'));

      assert(response);
      assertEquals(response.status, 404);
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });

  await t.step('returns 404 for path traversal attempts', async () => {
    const root = await Deno.makeTempDir();

    try {
      const app = createApp(createRuntimeConfig(false, root));
      const response = await app.handle(new Request('http://localhost/%2e%2e/secret'));

      assert(response);
      assertEquals(response.status, 404);
    } finally {
      await Deno.remove(root, { recursive: true });
    }
  });
});
