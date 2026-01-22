import { assertEquals } from '@std/assert';
import { staticFiles } from './static-files.ts';
import type { Context } from '@oak/oak';
import type { AlpineAppState } from '../types.ts';

const createMockContext = (pathname: string, staticExtensions: string[]): Context<AlpineAppState> => {
  const ctx = {
    request: {
      url: new URL(`http://localhost${pathname}`),
    },
    state: {
      config: {
        staticFilesPath: './public',
        staticExtensions,
        dev: false,
        production: true,
        vendors: {},
      },
    },
  } as unknown as Context<AlpineAppState>;

  return ctx;
};

Deno.test('staticFiles', async (t) => {
  await t.step('should call next for non-static extensions', async () => {
    const ctx = createMockContext('/api/data', ['.html', '.css', '.js']);
    let nextCalled = false;

    await staticFiles(ctx, async () =>
      await Promise.resolve().then(() => {
        nextCalled = true;
      }));

    assertEquals(nextCalled, true);
  });

  await t.step('should call next for paths without extension', async () => {
    const ctx = createMockContext('/', ['.html', '.css', '.js']);
    let nextCalled = false;

    await staticFiles(ctx, async () =>
      await Promise.resolve().then(() => {
        nextCalled = true;
      }));

    assertEquals(nextCalled, true);
  });

  await t.step('should not call next for .html files', async () => {
    const ctx = createMockContext('/index.html', ['.html', '.css', '.js']);
    let nextCalled = false;

    try {
      await staticFiles(ctx, async () =>
        await Promise.resolve().then(() => {
          nextCalled = true;
        }));
    } catch (_err) {
      // File not found is expected, ignore
    }

    assertEquals(nextCalled, false);
  });

  await t.step('should not call next for .css files', async () => {
    const ctx = createMockContext('/style.css', ['.html', '.css', '.js']);
    let nextCalled = false;

    try {
      await staticFiles(ctx, async () =>
        await Promise.resolve().then(() => {
          nextCalled = true;
        }));
    } catch (_err) {
      // File not found is expected, ignore
    }

    assertEquals(nextCalled, false);
  });

  await t.step('should not call next for .js files', async () => {
    const ctx = createMockContext('/app.js', ['.html', '.css', '.js']);
    let nextCalled = false;

    try {
      await staticFiles(ctx, async () =>
        await Promise.resolve().then(() => {
          nextCalled = true;
        }));
    } catch (_err) {
      // File not found is expected, ignore
    }

    assertEquals(nextCalled, false);
  });

  await t.step('should respect custom staticExtensions list', async () => {
    const ctx = createMockContext('/data.json', ['.json']);
    let nextCalled = false;

    try {
      await staticFiles(ctx, async () =>
        await Promise.resolve().then(() => {
          nextCalled = true;
        }));
    } catch (_err) {
      // File not found is expected, ignore
    }

    assertEquals(nextCalled, false);
  });

  await t.step('should call next for extensions not in list', async () => {
    const ctx = createMockContext('/image.png', ['.html', '.css', '.js']);
    let nextCalled = false;

    await staticFiles(ctx, async () =>
      await Promise.resolve().then(() => {
        nextCalled = true;
      }));

    assertEquals(nextCalled, true);
  });
});
