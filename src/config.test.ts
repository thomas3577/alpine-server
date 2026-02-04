import { assertEquals } from '@std/assert';
import { join } from '@std/path';
import { RuntimeConfig } from './config.ts';

const cwd = Deno.cwd();

Deno.test('RuntimeConfig', async (t) => {
  await t.step('should use default values when no input is provided', () => {
    const config = new RuntimeConfig(undefined);
    assertEquals(config.dev, false);
    assertEquals(config.production, true);
    assertEquals(config.staticFilesPath, join(cwd, 'public'));
    assertEquals(config.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt']);
  });

  await t.step('should use default values for an empty input object', () => {
    const config = new RuntimeConfig({});
    assertEquals(config.dev, false);
    assertEquals(config.production, true);
    assertEquals(config.staticFilesPath, join(cwd, 'public'));
    assertEquals(config.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt']);
  });

  await t.step('should set dev and production flags correctly', () => {
    const config = new RuntimeConfig({ dev: true });
    assertEquals(config.dev, true);
    assertEquals(config.production, false);
  });

  await t.step('should resolve custom staticFilesPath', () => {
    const customPath = 'my-static-files';
    const config = new RuntimeConfig({ staticFilesPath: customPath });
    assertEquals(config.staticFilesPath, join(cwd, customPath));
  });

  await t.step('should use custom staticExtensions', () => {
    const customExtensions = ['.html', '.js'];
    const config = new RuntimeConfig({ staticExtensions: customExtensions });
    assertEquals(config.staticExtensions, customExtensions);
  });

  await t.step('should use default staticExtensions if provided value is not an array of strings', () => {
    // deno-lint-ignore no-explicit-any
    const config1 = new RuntimeConfig({ staticExtensions: ['a', 1] as any });
    assertEquals(config1.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt']);

    // deno-lint-ignore no-explicit-any
    const config2 = new RuntimeConfig({ staticExtensions: 'not-an-array' as any });
    assertEquals(config2.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt']);
  });

  await t.step('should use default vendors when no vendors provided', () => {
    const config = new RuntimeConfig({});
    assertEquals(config.vendors['/alpinejs.mjs'], 'https://esm.sh/alpinejs@3.15.8/es2024/alpinejs.mjs');
    assertEquals(config.vendors['/alpinejs.mjs.map'], 'https://esm.sh/alpinejs@3.15.8/es2024/alpinejs.mjs.map');
  });

  await t.step('should merge custom vendors with default vendors', () => {
    const config = new RuntimeConfig({
      vendors: {
        '/htmx.js': 'https://unpkg.com/htmx.org@1.9.10',
      },
    });

    // Should have both default and custom vendors
    assertEquals(config.vendors['/alpinejs.mjs'], 'https://esm.sh/alpinejs@3.15.8/es2024/alpinejs.mjs');
    assertEquals(config.vendors['/htmx.js'], 'https://unpkg.com/htmx.org@1.9.10');
  });

  await t.step('should allow overriding default vendors', () => {
    const config = new RuntimeConfig({
      vendors: {
        '/alpinejs.mjs': 'https://custom.cdn.com/alpine.js',
      },
    });

    // Custom should override default
    assertEquals(config.vendors['/alpinejs.mjs'], 'https://custom.cdn.com/alpine.js');
    // Other defaults should remain
    assertEquals(config.vendors['/alpinejs.mjs.map'], 'https://esm.sh/alpinejs@3.15.8/es2024/alpinejs.mjs.map');
  });
});
