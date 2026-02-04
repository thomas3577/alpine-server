import { assertEquals } from '@std/assert';
import { Application } from '@oak/oak';
import { router } from './vendor.ts';

const createTestApp = (vendors: Record<string, string>) => {
  const app = new Application();

  app.use(async (ctx, next) => {
    ctx.state.config = { vendors };
    await next();
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
};

// Mock responses for different URLs
const mockFetchResponses = new Map<string, { content: string; contentType: string }>();

const originalFetch = globalThis.fetch;

const mockFetch = (url: string | URL | Request): Promise<Response> => {
  const urlString = url.toString();
  const mock = mockFetchResponses.get(urlString);

  if (!mock) {
    return Promise.resolve(new Response(null, { status: 404 }));
  }

  const body = new TextEncoder().encode(mock.content);
  return Promise.resolve(
    new Response(body, {
      status: 200,
      headers: { 'content-type': mock.contentType },
    }),
  );
};

Deno.test('vendor router', async (t) => {
  // Setup mock fetch before tests
  globalThis.fetch = mockFetch as typeof fetch;

  await t.step('should serve vendor resource from cache', async () => {
    mockFetchResponses.set('https://example.com/test.js', {
      content: 'console.log("test");',
      contentType: 'application/javascript',
    });

    const vendors = { 'test.js': 'https://example.com/test.js' };
    const app = createTestApp(vendors);

    const request = new Request('http://localhost/vendor/test.js');
    const response = await app.handle(request);

    assertEquals(response?.status, 200);
    assertEquals(response?.headers.get('content-type'), 'application/javascript');
    assertEquals(response?.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  });

  await t.step('should return 404 for non-whitelisted resources', async () => {
    const vendors = { 'test.js': 'https://example.com/test.js' };
    const app = createTestApp(vendors);

    const request = new Request('http://localhost/vendor/malicious.js');
    const response = await app.handle(request);

    assertEquals(response?.status, 404);
  });

  await t.step('should handle different content types', async () => {
    mockFetchResponses.set('https://example.com/style.css', {
      content: 'body { margin: 0; }',
      contentType: 'text/css; charset=utf-8',
    });

    const vendors = { 'style.css': 'https://example.com/style.css' };
    const app = createTestApp(vendors);

    const request = new Request('http://localhost/vendor/style.css');
    const response = await app.handle(request);

    assertEquals(response?.status, 200);
    assertEquals(response?.headers.get('content-type'), 'text/css; charset=utf-8');
  });

  // Cleanup: restore original fetch
  globalThis.fetch = originalFetch;
});
