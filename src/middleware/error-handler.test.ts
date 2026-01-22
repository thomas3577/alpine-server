import { assertEquals } from '@std/assert';
import { createHttpError } from '@oak/oak';
import { errorHandler } from './error-handler.ts';
import type { Context } from '@oak/oak';
import type { AlpineAppState } from '../types.ts';

interface ErrorResponseBody {
  message: string;
  status: number;
  stack?: string;
}

const createMockContext = (acceptsJson: boolean, dev: boolean): Context<AlpineAppState> => {
  const ctx = {
    request: {
      accepts: (type: string) => type === 'json' && acceptsJson,
    },
    response: {
      status: 200,
      body: null,
      type: '',
    },
    state: {
      config: {
        dev,
        production: !dev,
        staticFilesPath: './public',
        staticExtensions: [],
        vendors: {},
      },
    },
  } as unknown as Context<AlpineAppState>;

  return ctx;
};

Deno.test('errorHandler', async (t) => {
  await t.step('should pass through successful requests', async () => {
    const ctx = createMockContext(false, false);
    let nextCalled = false;

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        nextCalled = true;
      }));

    assertEquals(nextCalled, true);
    assertEquals(ctx.response.status, 200);
  });

  await t.step('should handle HTTP errors with JSON response', async () => {
    const ctx = createMockContext(true, false);

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        throw createHttpError(404, 'Resource not found');
      }));

    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.response.type, 'json');
    assertEquals(typeof ctx.response.body, 'object');
    const body = ctx.response.body as ErrorResponseBody;
    assertEquals(body.message, 'Resource not found');
    assertEquals(body.status, 404);
    assertEquals(body.stack, undefined);
  });

  await t.step('should handle HTTP errors with JSON response in dev mode', async () => {
    const ctx = createMockContext(true, true);

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        throw createHttpError(500, 'Server error');
      }));

    assertEquals(ctx.response.status, 500);
    assertEquals(ctx.response.type, 'json');
    const body = ctx.response.body as ErrorResponseBody;
    assertEquals(body.message, 'Server error');
    assertEquals(body.status, 500);
    assertEquals(typeof body.stack, 'string');
  });

  await t.step('should handle HTTP errors with text response', async () => {
    const ctx = createMockContext(false, false);

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        throw createHttpError(403, 'Forbidden');
      }));

    assertEquals(ctx.response.status, 403);
    assertEquals(ctx.response.type, 'text/plain');
    assertEquals(ctx.response.body, '403 Forbidden');
  });

  await t.step('should handle HTTP errors with text response in dev mode', async () => {
    const ctx = createMockContext(false, true);

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        throw createHttpError(400, 'Bad Request');
      }));

    assertEquals(ctx.response.status, 400);
    assertEquals(ctx.response.type, 'text/plain');
    assertEquals(typeof ctx.response.body, 'string');
    assertEquals((ctx.response.body as string).includes('400 Bad Request'), true);
  });

  await t.step('should handle Deno.errors.NotFound', async () => {
    const ctx = createMockContext(false, false);

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        throw new Deno.errors.NotFound('File not found');
      }));

    assertEquals(ctx.response.status, 404);
    assertEquals(ctx.response.type, 'text/plain');
    assertEquals(ctx.response.body, 'Not Found');
  });

  await t.step('should handle generic errors in production', async () => {
    const ctx = createMockContext(false, false);

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        throw new Error('Something went wrong');
      }));

    assertEquals(ctx.response.status, 500);
    assertEquals(ctx.response.type, 'text/plain');
    assertEquals(ctx.response.body, 'Internal Server Error');
  });

  await t.step('should handle generic errors in dev mode', async () => {
    const ctx = createMockContext(false, true);

    await errorHandler(ctx, async () =>
      await Promise.resolve().then(() => {
        throw new Error('Something went wrong');
      }));

    assertEquals(ctx.response.status, 500);
    assertEquals(ctx.response.type, 'text/plain');
    assertEquals(typeof ctx.response.body, 'string');
    assertEquals((ctx.response.body as string).includes('Internal Server Error'), true);
    assertEquals((ctx.response.body as string).includes('Something went wrong'), true);
  });
});
