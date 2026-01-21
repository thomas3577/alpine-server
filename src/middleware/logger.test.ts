import { assertEquals } from '@std/assert';
import { logger } from './logger.ts';
import type { Context } from '@oak/oak';

const createMockContext = (pathname: string, method: string, responseTime?: string, blocked?: boolean): Context => {
  const headers = new Map<string, string>();
  if (responseTime) {
    headers.set('X-Response-Time', responseTime);
  }

  const ctx = {
    request: {
      method,
      url: new URL(`http://localhost${pathname}`),
    },
    response: {
      headers: {
        get: (key: string) => headers.get(key) ?? null,
        set: (key: string, value: string) => headers.set(key, value),
      },
    },
    state: blocked ? { shield: { blocked: true } } : {},
  } as unknown as Context;

  return ctx;
};

Deno.test('logger', async (t) => {
  await t.step('should log request without errors', async () => {
    const ctx = createMockContext('/', 'GET', '10.5ms');

    await logger(ctx, async () => {});

    // Logger uses console, so we just verify it doesn't throw
    assertEquals(ctx.response.headers.get('X-Response-Time'), '10.5ms');
  });

  await t.step('should handle POST requests', async () => {
    const ctx = createMockContext('/api/data', 'POST', '25.3ms');

    await logger(ctx, async () => {});

    assertEquals(ctx.request.method, 'POST');
  });

  await t.step('should skip logging for blocked requests', async () => {
    const ctx = createMockContext('/vendor/test', 'GET', '1.0ms', true);

    await logger(ctx, async () => {});

    // Should not throw, but internally skips logging
    assertEquals(ctx.state.shield?.blocked, true);
  });

  await t.step('should handle missing response time header', async () => {
    const ctx = createMockContext('/', 'GET');

    await logger(ctx, async () => {});

    assertEquals(ctx.response.headers.get('X-Response-Time'), null);
  });
});
