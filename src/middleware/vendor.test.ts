import { assertEquals } from '@std/assert';
import { vendor } from './vendor.ts';
import type { Context } from '@oak/oak';
import type { Vendor } from '../types.ts';

const createMockContext = (pathname: string, vendors: Record<string, Vendor>): Context => {
  const headers = new Map<string, string>();

  const ctx = {
    request: {
      url: new URL(`http://localhost${pathname}`),
    },
    response: {
      headers: {
        get: (key: string) => headers.get(key.toLowerCase()) ?? null,
        set: (key: string, value: string) => headers.set(key.toLowerCase(), value),
        append: (key: string, value: string) => {
          const existing = headers.get(key.toLowerCase());
          headers.set(key.toLowerCase(), existing ? `${existing}, ${value}` : value);
        },
      },
      body: null,
    },
    state: {
      config: {
        vendors,
      },
    },
  } as unknown as Context;

  return ctx;
};

Deno.test('vendor', async (t) => {
  await t.step('should serve cached vendor content', async () => {
    const vendors: Record<string, Vendor> = {
      '/test.js': {
        url: 'https://example.com/test.js',
        type: 'application/javascript',
        content: 'console.log("test");',
      },
    };

    const ctx = createMockContext('/test.js', vendors);

    await vendor(ctx, async () => {});

    assertEquals(ctx.response.body, 'console.log("test");');
    assertEquals(ctx.response.headers.get('content-type'), 'application/javascript');
  });

  await t.step('should call next for non-vendor paths', async () => {
    const vendors: Record<string, Vendor> = {
      '/test.js': {
        url: 'https://example.com/test.js',
        type: 'application/javascript',
      },
    };

    const ctx = createMockContext('/other.js', vendors);
    let nextCalled = false;

    await vendor(ctx, async () =>
      await Promise.resolve().then(() => {
        nextCalled = true;
      }));

    assertEquals(nextCalled, true);
    assertEquals(ctx.response.body, null);
  });

  await t.step('should set correct content-type header', async () => {
    const vendors: Record<string, Vendor> = {
      '/style.css': {
        url: 'https://example.com/style.css',
        type: 'text/css; charset=utf-8',
        content: 'body { margin: 0; }',
      },
    };

    const ctx = createMockContext('/style.css', vendors);

    await vendor(ctx, async () => {});

    assertEquals(ctx.response.headers.get('content-type'), 'text/css; charset=utf-8');
  });
});
