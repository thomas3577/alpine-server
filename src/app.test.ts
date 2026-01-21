import { assertEquals, assertExists } from '@std/assert';
import { AlpineApp } from './app.ts';

Deno.test('AlpineApp', async (t) => {
  await t.step('should construct with full config', () => {
    const alpineApp = new AlpineApp({
      app: {
        dev: true,
        staticFilesPath: './public',
        staticExtensions: ['.html', '.css', '.js'],
      },
      oak: {
        listenOptions: {
          port: 8000,
        },
      },
    });

    assertExists(alpineApp);
    assertEquals(typeof alpineApp.run, 'function');
  });

  await t.step('should construct with minimal config', () => {
    const alpineApp = new AlpineApp({});
    assertExists(alpineApp);
    assertEquals(typeof alpineApp.run, 'function');
  });

  await t.step('should construct with only app config', () => {
    const alpineApp = new AlpineApp({
      app: {
        dev: false,
        staticFilesPath: './dist',
        staticExtensions: ['.html'],
      },
    });

    assertExists(alpineApp);
  });

  await t.step('should construct with only oak config', () => {
    const alpineApp = new AlpineApp({
      oak: {
        listenOptions: {
          port: 3000,
          hostname: 'localhost',
        },
      },
    });

    assertExists(alpineApp);
  });
});
