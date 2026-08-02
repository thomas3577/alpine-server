import { assertEquals } from '@std/assert';
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

Deno.test('timing', async (t) => {
  await t.step('should set X-Response-Time header', async () => {
    const app = createApp(10);
    const response = await app.request('/');

    const responseTime = response.headers.get('X-Response-Time');
    assertEquals(typeof responseTime, 'string');
    assertEquals(responseTime?.endsWith('ms'), true);
  });

  await t.step('should set Server-Timing header', async () => {
    const app = createApp(5);
    const response = await app.request('/');

    const serverTiming = response.headers.get('Server-Timing');
    assertEquals(typeof serverTiming, 'string');
    assertEquals(serverTiming?.startsWith('app;dur='), true);
  });

  await t.step('should measure time correctly', async () => {
    const app = createApp(50);
    const response = await app.request('/');

    const responseTime = response.headers.get('X-Response-Time');
    const timeValue = parseFloat(responseTime?.replace('ms', '') || '0');

    // Should be at least 50ms, but allow some variance
    assertEquals(timeValue >= 50, true);
  });
});
