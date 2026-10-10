import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

describe('VendorCache', () => {
  it('fetch should fetch and cache resource', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/test.js', { content: 'console.log("test");', contentType: 'application/javascript' }],
    ]);

    globalThis.fetch = createMockFetch(responses) as typeof fetch;

    const entry = await cache.fetch('https://example.com/test.js');

    assert.deepEqual(entry.path, 'https://example.com/test.js');
    assert.deepEqual(entry.contentType, 'application/javascript');
    assert.deepEqual(new TextDecoder().decode(entry.content), 'console.log("test");');
    assert.deepEqual(entry.headers.get('content-type'), 'application/javascript');
    assert.deepEqual(entry.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    // Verify it's in cache
    const cached = cache.get('https://example.com/test.js');
    assert.deepEqual(cached?.path, 'https://example.com/test.js');

    globalThis.fetch = originalFetch;
  });

  it('fetch should throw error on failed response', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/fail.js', { content: '', contentType: 'text/plain', status: 404 }],
    ]);

    globalThis.fetch = createMockFetch(responses) as typeof fetch;

    await assert.rejects(
      async () => await cache.fetch('https://example.com/fail.js'),
      /CDN fetch failed: 404 Error/,
    );

    globalThis.fetch = originalFetch;
  });

  it('get should return null for uncached resource', () => {
    const cache = new VendorCache();
    const result = cache.get('https://example.com/notfound.js');

    assert.deepEqual(result, null);
  });

  it('getOrFetch should fetch on first call', async () => {
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

    assert.deepEqual(fetchCount, 1);
    assert.deepEqual(new TextDecoder().decode(entry.content), 'console.log("first");');

    globalThis.fetch = originalFetch;
  });

  it('getOrFetch should use cache on second call', async () => {
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
    assert.deepEqual(fetchCount, 1);

    // Second call - should use cache
    const entry2 = await cache.getOrFetch('https://example.com/cached.js');
    assert.deepEqual(fetchCount, 1); // Still 1, not 2

    // Both should be the same
    assert.deepEqual(entry1.path, entry2.path);
    assert.deepEqual(entry1.contentType, entry2.contentType);

    globalThis.fetch = originalFetch;
  });

  it('should handle different content types', async () => {
    const cache = new VendorCache();
    const responses = new Map([
      ['https://example.com/style.css', { content: 'body { margin: 0; }', contentType: 'text/css; charset=utf-8' }],
      ['https://example.com/data.json', { content: '{"key":"value"}', contentType: 'application/json' }],
    ]);

    globalThis.fetch = createMockFetch(responses) as typeof fetch;

    const cssEntry = await cache.fetch('https://example.com/style.css');
    assert.deepEqual(cssEntry.contentType, 'text/css; charset=utf-8');
    assert.deepEqual(new TextDecoder().decode(cssEntry.content), 'body { margin: 0; }');

    const jsonEntry = await cache.fetch('https://example.com/data.json');
    assert.deepEqual(jsonEntry.contentType, 'application/json');
    assert.deepEqual(new TextDecoder().decode(jsonEntry.content), '{"key":"value"}');

    globalThis.fetch = originalFetch;
  });

  it('should use default content-type when missing', async () => {
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
    assert.deepEqual(entry.contentType, 'application/octet-stream');

    globalThis.fetch = originalFetch;
  });
});
