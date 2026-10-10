import { afterEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Hono } from '@hono/hono';
import { logger, type LoggerState } from './logger.ts';

const createApp = (responseTime?: string, blocked?: boolean): Hono<{ Variables: LoggerState }> => {
  const app = new Hono<{ Variables: LoggerState }>();

  app.use(async (c, next) => {
    if (blocked) {
      c.set('shield', { blocked: true });
    }
    await next();
  });
  app.use(logger);
  app.all('*', (c) => {
    if (responseTime) {
      c.header('X-Response-Time', responseTime);
    }
    return c.body(null);
  });

  return app;
};

describe('logger', () => {
  afterEach(() => mock.restoreAll());

  it('should log request without errors', async () => {
    const info = mock.method(console, 'info', () => {});
    const app = createApp('10.5ms');
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('X-Response-Time'), '10.5ms');
    assert.deepEqual(info.mock.callCount(), 1);
  });

  it('should handle POST requests', async () => {
    mock.method(console, 'info', () => {});
    const app = createApp('25.3ms');
    const response = await app.request('/api/data', { method: 'POST' });

    assert.deepEqual(response.status, 200);
  });

  it('should skip logging for blocked requests', async () => {
    const info = mock.method(console, 'info', () => {});
    const app = createApp('1.0ms', true);
    const response = await app.request('/test.js');

    assert.deepEqual(response.headers.get('X-Response-Time'), '1.0ms');
    assert.deepEqual(info.mock.callCount(), 0);
  });

  it('should handle missing response time header', async () => {
    mock.method(console, 'info', () => {});
    const app = createApp();
    const response = await app.request('/');

    assert.deepEqual(response.headers.get('X-Response-Time'), null);
  });
});
