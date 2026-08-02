import { assertEquals } from '@std/assert';
import { Hono } from '@hono/hono';
import { logger } from './logger.ts';

const createApp = (responseTime?: string, blocked?: boolean): Hono => {
  const app = new Hono();

  app.use(async (c, next) => {
    if (blocked) {
      // deno-lint-ignore no-explicit-any
      (c as any).set('shield', { blocked: true });
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
    const app = createApp('10.5ms');
    const response = await app.request('/');

    // Logger uses console, so we just verify it doesn't throw
    assertEquals(response.headers.get('X-Response-Time'), '10.5ms');
  });

  await t.step('should handle POST requests', async () => {
    const app = createApp('25.3ms');
    const response = await app.request('/api/data', { method: 'POST' });

    assertEquals(response.status, 200);
  });

  await t.step('should skip logging for blocked requests', async () => {
    const app = createApp('1.0ms', true);
    const response = await app.request('/test.js');

    // Should not throw, but internally skips logging
    assertEquals(response.headers.get('X-Response-Time'), '1.0ms');
  });

  await t.step('should handle missing response time header', async () => {
    const app = createApp();
    const response = await app.request('/');

    assertEquals(response.headers.get('X-Response-Time'), null);
  });
});
