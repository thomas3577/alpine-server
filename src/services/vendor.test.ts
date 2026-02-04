import { assertEquals, assertRejects } from '@std/assert';
import { VendorCache } from './vendor.ts';

const originalFetch = globalThis.fetch;

const createMockFetch = (responses: Map<string, { content: string; contentType: string; status?: number }>) => {
  return (url: string | URL | Request): Promise<Response> => {
    const urlString = url.toString();
    const mock = responses.get(urlString);

    if (!mock) {
      return Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' }));
    }

    const body = new TextEncoder().encode(mock.content);
    return Promise.resolve(
      new Response(body, {
        status: mock.status ?? 200,
        statusText: mock.status === 200 ? 'OK' : 'Error',
        headers: { 'content-type': mock.contentType },
      }),
    );
  };
};

Deno.test('VendorCache', async (t) => {
  await t.step('fetch should fetch and cache resource', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/test.js', { content: 'console.log("test");', contentType: 'application/javascript' }],
    ]);

    globalThis.fetch = createMockFetch(responses) as typeof fetch;

    const entry = await cache.fetch('https://example.com/test.js');

    assertEquals(entry.path, 'https://example.com/test.js');
    assertEquals(entry.contentType, 'application/javascript');
    assertEquals(new TextDecoder().decode(entry.content), 'console.log("test");');
    assertEquals(entry.headers.get('content-type'), 'application/javascript');
    assertEquals(entry.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    // Verify it's in cache
    const cached = cache.get('https://example.com/test.js');
    assertEquals(cached?.path, 'https://example.com/test.js');

    globalThis.fetch = originalFetch;
  });

  await t.step('fetch should throw error on failed response', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/fail.js', { content: '', contentType: 'text/plain', status: 404 }],
    ]);

    globalThis.fetch = createMockFetch(responses) as typeof fetch;

    await assertRejects(
      async () => await cache.fetch('https://example.com/fail.js'),
      Error,
      'CDN fetch failed: 404 Error',
    );

    globalThis.fetch = originalFetch;
  });

  await t.step('get should return null for uncached resource', () => {
    const cache = new VendorCache();
    const result = cache.get('https://example.com/notfound.js');

    assertEquals(result, null);
  });

  await t.step('getOrFetch should fetch on first call', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/first.js', { content: 'console.log("first");', contentType: 'application/javascript' }],
    ]);

    let fetchCount = 0;
    globalThis.fetch = ((url: string | URL | Request) => {
      fetchCount++;
      return createMockFetch(responses)(url);
    }) as typeof fetch;

    const entry = await cache.getOrFetch('https://example.com/first.js');

    assertEquals(fetchCount, 1);
    assertEquals(new TextDecoder().decode(entry.content), 'console.log("first");');

    globalThis.fetch = originalFetch;
  });

  await t.step('getOrFetch should use cache on second call', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/cached.js', { content: 'console.log("cached");', contentType: 'application/javascript' }],
    ]);

    let fetchCount = 0;
    globalThis.fetch = ((url: string | URL | Request) => {
      fetchCount++;
      return createMockFetch(responses)(url);
    }) as typeof fetch;

    // First call - should fetch
    const entry1 = await cache.getOrFetch('https://example.com/cached.js');
    assertEquals(fetchCount, 1);

    // Second call - should use cache
    const entry2 = await cache.getOrFetch('https://example.com/cached.js');
    assertEquals(fetchCount, 1); // Still 1, not 2

    // Both should be the same
    assertEquals(entry1.path, entry2.path);
    assertEquals(entry1.contentType, entry2.contentType);

    globalThis.fetch = originalFetch;
  });

  await t.step('should handle different content types', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/style.css', { content: 'body { margin: 0; }', contentType: 'text/css; charset=utf-8' }],
      ['https://example.com/data.json', { content: '{"key":"value"}', contentType: 'application/json' }],
    ]);

    globalThis.fetch = createMockFetch(responses) as typeof fetch;

    const cssEntry = await cache.fetch('https://example.com/style.css');
    assertEquals(cssEntry.contentType, 'text/css; charset=utf-8');
    assertEquals(new TextDecoder().decode(cssEntry.content), 'body { margin: 0; }');

    const jsonEntry = await cache.fetch('https://example.com/data.json');
    assertEquals(jsonEntry.contentType, 'application/json');
    assertEquals(new TextDecoder().decode(jsonEntry.content), '{"key":"value"}');

    globalThis.fetch = originalFetch;
  });

  await t.step('should use default content-type when missing', async () => {
    const cache = new VendorCache();

    globalThis.fetch = ((_url: string | URL | Request): Promise<Response> => {
      const body = new TextEncoder().encode('content');
      return Promise.resolve(
        new Response(body, {
          status: 200,
          // No content-type header
        }),
      );
    }) as typeof fetch;

    const entry = await cache.fetch('https://example.com/unknown');
    assertEquals(entry.contentType, 'application/octet-stream');

    globalThis.fetch = originalFetch;
  });
});
