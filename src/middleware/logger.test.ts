import { assertEquals } from '@std/assert';
import { restore, stub } from '@std/testing/mock';
import { getLogger } from '@std/log';
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

Deno.test('logger', async (t) => {
  await t.step('should log request without errors', async () => {
    const infoStub = stub(getLogger('default'), 'info');
    try {
      const app = createApp('10.5ms');
      const response = await app.request('/');

      assertEquals(response.headers.get('X-Response-Time'), '10.5ms');
      assertEquals(infoStub.calls.length, 1);
    } finally {
      restore();
    }
  });

  await t.step('should handle POST requests', async () => {
    const app = createApp('25.3ms');
    const response = await app.request('/api/data', { method: 'POST' });

    assertEquals(response.status, 200);
  });

  await t.step('should skip logging for blocked requests', async () => {
    const infoStub = stub(getLogger('default'), 'info');
    try {
      const app = createApp('1.0ms', true);
      const response = await app.request('/test.js');

      assertEquals(response.headers.get('X-Response-Time'), '1.0ms');
      assertEquals(infoStub.calls.length, 0);
    } finally {
      restore();
    }
  });

  await t.step('should handle missing response time header', async () => {
    const app = createApp();
    const response = await app.request('/');

    assertEquals(response.headers.get('X-Response-Time'), null);
  });
});
