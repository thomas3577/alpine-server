import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe('staticFiles', () => {
  it('should call next for non-static extensions', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/api/data');

    assert.deepEqual(await response.text(), 'fallback-reached');
  });

  it('should call next for paths without extension', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/');

    assert.deepEqual(await response.text(), 'fallback-reached');
  });

  it('should not call next for .html files (404 on miss)', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/index.html');

    assert.deepEqual(response.status, 404);
  });

  it('should not call next for .css files (404 on miss)', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/style.css');

    assert.deepEqual(response.status, 404);
  });

  it('should not call next for .js files (404 on miss)', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/app.js');

    assert.deepEqual(response.status, 404);
  });

  it('should respect custom staticExtensions list', async () => {
    const app = createApp(['.json'], './public');
    const response = await app.request('/data.json');

    assert.deepEqual(response.status, 404);
  });

  it('should call next for extensions not in list', async () => {
    const app = createApp(['.html', '.css', '.js'], './public');
    const response = await app.request('/image.png');

    assert.deepEqual(await response.text(), 'fallback-reached');
  });

  it('should serve an existing static file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alpine-server-'));
    try {
      await writeFile(`${root}/style.css`, 'body { margin: 0; }');
      const app = createApp(['.html', '.css', '.js'], root);
      const response = await app.request('/style.css');

      assert.deepEqual(response.status, 200);
      assert.deepEqual(response.headers.get('content-type'), 'text/css; charset=utf-8');
      assert.deepEqual(await response.text(), 'body { margin: 0; }');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('should not serve files outside the static root', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'alpine-server-'));
    const root = join(parent, 'public');

    try {
      await mkdir(root);
      await writeFile(join(parent, 'secret.css'), 'TOP-SECRET');
      const app = createApp(['.css'], root);

      // Encoded variants survive URL normalization and reach the middleware as-is.
      for (const path of ['/%2e%2e/secret.css', '/..%2fsecret.css', '/%2e%2e%2fsecret.css', '/..%5csecret.css', '/foo/%2e%2e/%2e%2e/secret.css']) {
        const response = await app.request(path);

        assert.deepEqual(response.status, 404, path);
        assert.ok(!(await response.text()).includes('TOP-SECRET'), path);
      }
    } finally {
      await rm(parent, { recursive: true, force: true });
    }
  });

  it('should 404 for a directory matching a static extension', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alpine-server-'));

    try {
      await mkdir(join(root, 'folder.css'));
      const app = createApp(['.css'], root);
      const response = await app.request('/folder.css');

      assert.deepEqual(response.status, 404);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
