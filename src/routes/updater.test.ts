import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { Hono } from '@hono/hono';
import { router } from './updater.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';
import type { AlpineAppState } from '../types.ts';

const createApp = (dev: boolean): Hono<{ Variables: AlpineAppState }> => {
  const app = new Hono<{ Variables: AlpineAppState }>();

  app.use(async (c, next) => {
    c.set('config', createRuntimeConfig(dev, process.cwd()));
    await next();
  });
  app.route('/updater.js', router);
  app.route('/updater.js/', router);

  return app;
};

describe('updater route', () => {
  it('returns noop script in production', async () => {
    const app = createApp(false);
    const response = await app.request('/updater.js/');

    assert.deepEqual(response.status, 200);
    assert.deepEqual(await response.text(), ';');

    const canonicalResponse = await app.request('/updater.js');

    assert.deepEqual(canonicalResponse.status, 200);
    assert.deepEqual(await canonicalResponse.text(), ';');
  });

  it('returns updater client script in development', async () => {
    const app = createApp(true);
    const response = await app.request('/updater.js/');

    assert.deepEqual(response.status, 200);

    const script = await response.text();
    assert.ok(script.length > 1);
    assert.ok(script.includes('EventSource'));

    const canonicalResponse = await app.request('/updater.js');

    assert.deepEqual(canonicalResponse.status, 200);
    const canonicalScript = await canonicalResponse.text();
    assert.ok(canonicalScript.length > 1);
    assert.ok(canonicalScript.includes('EventSource'));
  });
});
