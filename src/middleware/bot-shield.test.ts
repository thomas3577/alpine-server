import { assertEquals } from '@std/assert';
import { botShield } from './bot-shield.ts';
import type { Context } from '@oak/oak';

// Helper to create a mock context
const createMockContext = (pathname: string, headers: Record<string, string> = {}): Context => {
  const ctx = {
    request: {
      url: new URL(`http://localhost${pathname}`),
      headers: new Map(Object.entries(headers)),
    },
    response: {
      status: 200,
      headers: new Map(),
      type: '',
      body: null,
    },
    state: {},
  } as unknown as Context;

  return ctx;
};

Deno.test('botShield', async (t) => {
  await t.step('should allow normal paths', async () => {
    const ctx = createMockContext('/');
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, true);
    assertEquals(ctx.response.status, 200);
  });

  await t.step('should block /vendor paths', async () => {
    const ctx = createMockContext('/vendor/test.js');
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, false);
    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.state.shield?.blocked, true);
    assertEquals(ctx.state.shield?.reason, 'denylist');
  });

  await t.step('should block /cgi-bin paths', async () => {
    const ctx = createMockContext('/cgi-bin/script');
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, false);
    assertEquals(ctx.response.status, 404);
  });

  await t.step('should block .env files', async () => {
    const ctx = createMockContext('/.env');
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, false);
    assertEquals(ctx.response.status, 404);
  });

  await t.step('should block WordPress admin paths', async () => {
    const ctx = createMockContext('/wp-admin/');
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, false);
    assertEquals(ctx.response.status, 404);
  });

  await t.step('should block .php files', async () => {
    const ctx = createMockContext('/index.php');
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, false);
    assertEquals(ctx.response.status, 404);
  });

  await t.step('should block .sql files', async () => {
    const ctx = createMockContext('/backup.sql');
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, false);
    assertEquals(ctx.response.status, 404);
  });

  await t.step('should extract IP from x-forwarded-for header', async () => {
    const ctx = createMockContext('/', { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' });
    let nextCalled = false;

    await botShield(ctx, async () => await Promise.resolve().then(() => {
      nextCalled = true;
    }));

    assertEquals(nextCalled, true);
  });

  await t.step('should rate limit excessive requests', async () => {
    // Make 181 requests (limit is 180)
    for (let i = 0; i < 181; i++) {
      const testCtx = createMockContext('/', { 'x-forwarded-for': '192.168.1.100' });
      await botShield(testCtx, async () => {});

      if (i < 180) {
        assertEquals(testCtx.response.status, 200);
      } else {
        // 181st request should be rate limited
        assertEquals(testCtx.response.status, 429);
        assertEquals(testCtx.state.shield?.blocked, true);
        assertEquals(testCtx.state.shield?.reason, 'rate-limit');
        assertEquals(testCtx.response.headers.get('Retry-After'), '60');
      }
    }
  });
});
