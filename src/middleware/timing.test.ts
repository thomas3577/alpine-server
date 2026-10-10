import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from '@hono/hono';
import { timing } from './timing.ts';

const createApp = (delayMs: number): Hono => {
  const app = new Hono();

  app.use(timing);
  app.get('/', async (c) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return c.text('ok');
  });

  return app;
};

describe('timing', () => {
  it('should set X-Response-Time header', async () => {
    const app = createApp(10);
    const response = await app.request('/');

    const responseTime = response.headers.get('X-Response-Time');
    assert.deepEqual(typeof responseTime, 'string');
    assert.deepEqual(responseTime?.endsWith('ms'), true);
  });

  it('should set Server-Timing header', async () => {
    const app = createApp(5);
    const response = await app.request('/');

    const serverTiming = response.headers.get('Server-Timing');
    assert.deepEqual(typeof serverTiming, 'string');
    assert.deepEqual(serverTiming?.startsWith('app;dur='), true);
  });

  it('should measure time correctly', async () => {
    const app = createApp(50);
    const response = await app.request('/');

    const responseTime = response.headers.get('X-Response-Time');
    const timeValue = parseFloat(responseTime?.replace('ms', '') || '0');

    // setTimeout(50) may fire a few ms early on Windows (coarse timer resolution).
    assert.ok(timeValue >= 45, `expected >= 45ms, got ${timeValue}ms`);
  });
});
