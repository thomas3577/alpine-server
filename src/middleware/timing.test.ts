import { assertEquals } from '@std/assert';
import { timing } from './timing.ts';
import type { Context } from '@oak/oak';

const createMockContext = (): Context => {
  const headers = new Map<string, string>();

  const ctx = {
    response: {
      headers: {
        get: (key: string) => headers.get(key) ?? null,
        set: (key: string, value: string) => headers.set(key, value),
        append: (key: string, value: string) => {
          const existing = headers.get(key);
          headers.set(key, existing ? `${existing}, ${value}` : value);
        },
      },
    },
  } as unknown as Context;

  return ctx;
};

Deno.test('timing', async (t) => {
  await t.step('should set X-Response-Time header', async () => {
    const ctx = createMockContext();

    await timing(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    const responseTime = ctx.response.headers.get('X-Response-Time');
    assertEquals(typeof responseTime, 'string');
    assertEquals(responseTime?.endsWith('ms'), true);
  });

  await t.step('should set Server-Timing header', async () => {
    const ctx = createMockContext();

    await timing(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    const serverTiming = ctx.response.headers.get('Server-Timing');
    assertEquals(typeof serverTiming, 'string');
    assertEquals(serverTiming?.startsWith('app;dur='), true);
  });

  await t.step('should measure time correctly', async () => {
    const ctx = createMockContext();

    await timing(ctx, async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const responseTime = ctx.response.headers.get('X-Response-Time');
    const timeValue = parseFloat(responseTime?.replace('ms', '') || '0');

    // Should be at least 50ms, but allow some variance
    assertEquals(timeValue >= 50, true);
  });
});
