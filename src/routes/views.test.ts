import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { Hono } from '@hono/hono';
import { join } from 'node:path';
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

describe('views route', () => {
  it('injects absolute updater path in dev mode', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alpine-server-'));

    try {
      await mkdir(join(root, 'foo'), { recursive: true });
      await writeFile(
        join(root, 'foo', 'index.html'),
        '<!doctype html><html lang="de"><head><title>Foo</title></head><body>OK</body></html>',
      );

      const app = createApp(createRuntimeConfig(true, root));
      const response = await app.request('/foo');

      assert.deepEqual(response.status, 200);

      const html = await response.text();
      const updaterSrc = `src="/${UPDATER_FILENAME}"`;
      assert.ok(html.includes(updaterSrc));
      assert.ok(/^<!doctype html>/i.test(html));
      assert.ok(html.includes('<html lang="de">'));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns 404 for file-like paths', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alpine-server-'));

    try {
      const app = createApp(createRuntimeConfig(false, root));
      const response = await app.request('/vendor/phpunit.xsd');

      assert.deepEqual(response.status, 404);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('returns 404 for path traversal attempts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alpine-server-'));

    try {
      const app = createApp(createRuntimeConfig(false, root));
      const response = await app.request('/%2e%2e/secret');

      assert.deepEqual(response.status, 404);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
