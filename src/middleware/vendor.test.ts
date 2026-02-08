import { assertEquals } from '@std/assert';
import { Application } from '@oak/oak';
import { createVendorRouter } from './vendor.ts';
import type { IVendors } from '../types.ts';

const createTestApp = (vendors: Record<string, string>, route: string = '/') => {
  const app = new Application();
  const vendorsConfig: IVendors = { map: vendors, route };

  app.use(async (ctx, next) => {
    ctx.state.config = { vendors: vendorsConfig };
    await next();
  });

  const router = createVendorRouter(vendorsConfig);
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

    const request = new Request('http://localhost/test.js');
    const response = await app.handle(request);

    assertEquals(response?.status, 200);
    assertEquals(response?.headers.get('content-type'), 'application/javascript');
    assertEquals(response?.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  });

  await t.step('should return 404 for non-whitelisted resources', async () => {
    const vendors = { 'test.js': 'https://example.com/test.js' };
    const app = createTestApp(vendors);

    const request = new Request('http://localhost/malicious.js');
    const response = await app.handle(request);

    assertEquals(response?.status, 404);
  });

  await t.step('should serve vendor resource from custom route', async () => {
    mockFetchResponses.set('https://example.com/custom.js', {
      content: 'console.log("custom");',
      contentType: 'application/javascript',
    });

    const vendors = { 'custom.js': 'https://example.com/custom.js' };
    const app = createTestApp(vendors, '/assets');

    // Should work on custom route
    const request = new Request('http://localhost/assets/custom.js');
    const response = await app.handle(request);
    assertEquals(response?.status, 200);

    // Should NOT work on root
    const requestRoot = new Request('http://localhost/custom.js');
    const responseRoot = await app.handle(requestRoot);
    assertEquals(responseRoot?.status, 404);
  });

  await t.step('should handle different content types', async () => {
    mockFetchResponses.set('https://example.com/style.css', {
      content: 'body { margin: 0; }',
      contentType: 'text/css; charset=utf-8',
    });

    const vendors = { 'style.css': 'https://example.com/style.css' };
    const app = createTestApp(vendors);

    const request = new Request('http://localhost/style.css');
    const response = await app.handle(request);

    assertEquals(response?.status, 200);
    assertEquals(response?.headers.get('content-type'), 'text/css; charset=utf-8');
  });

  await t.step('should serve implicit map files', async () => {
    mockFetchResponses.set('https://example.com/lib.js.map', {
      content: '{"version":3}',
      contentType: 'application/json',
    });

    // Only lib.js is explicitly defined
    const vendors = { 'lib.js': 'https://example.com/lib.js' };
    const app = createTestApp(vendors);

    // Requesting lib.js.map should work
    const request = new Request('http://localhost/lib.js.map');
    const response = await app.handle(request);

    assertEquals(response?.status, 200);
    assertEquals(response?.headers.get('content-type'), 'application/json');
  });

  // Cleanup: restore original fetch
  globalThis.fetch = originalFetch;
});
