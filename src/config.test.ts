import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { join } from 'node:path';
import { ALPINE_VERSION, RuntimeConfig } from './config.ts';

const cwd = process.cwd();

describe('RuntimeConfig', () => {
  it('should use default values when no input is provided', () => {
    const config = new RuntimeConfig(undefined);
    assert.deepEqual(config.dev, false);
    assert.deepEqual(config.production, true);
    assert.deepEqual(config.staticFilesPath, join(cwd, 'public'));
    assert.deepEqual(config.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt', '.woff2', '.woff', '.ttf']);
  });

  it('should use default values for an empty input object', () => {
    const config = new RuntimeConfig({});
    assert.deepEqual(config.dev, false);
    assert.deepEqual(config.production, true);
    assert.deepEqual(config.staticFilesPath, join(cwd, 'public'));
    assert.deepEqual(config.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt', '.woff2', '.woff', '.ttf']);
  });

  it('should set dev and production flags correctly', () => {
    const config = new RuntimeConfig({ dev: true });
    assert.deepEqual(config.dev, true);
    assert.deepEqual(config.production, false);
  });

  it('should resolve custom staticFilesPath', () => {
    const customPath = 'my-static-files';
    const config = new RuntimeConfig({ staticFilesPath: customPath });
    assert.deepEqual(config.staticFilesPath, join(cwd, customPath));
  });

  it('should use custom staticExtensions', () => {
    const customExtensions = ['.html', '.js'];
    const config = new RuntimeConfig({ staticExtensions: customExtensions });
    assert.deepEqual(config.staticExtensions, customExtensions);
  });

  it('should use default staticExtensions if provided value is not an array of strings', () => {
    // deno-lint-ignore no-explicit-any
    const config1 = new RuntimeConfig({ staticExtensions: ['a', 1] as any });
    assert.deepEqual(config1.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt', '.woff2', '.woff', '.ttf']);

    // deno-lint-ignore no-explicit-any
    const config2 = new RuntimeConfig({ staticExtensions: 'not-an-array' as any });
    assert.deepEqual(config2.staticExtensions, ['.html', '.css', '.js', '.ico', '.svg', '.jpg', '.png', '.mp4', '.json', '.ts', '.mjs', '.mjs.map', '.txt', '.woff2', '.woff', '.ttf']);
  });

  it('should use default vendors when no vendors provided', () => {
    const config = new RuntimeConfig({});
    assert.deepEqual(config.vendors.map['alpinejs.mjs'], `https://esm.sh/alpinejs@${ALPINE_VERSION}/es2024/alpinejs.mjs`);
    assert.deepEqual(config.vendors.map['alpinejs-sort.mjs'], `https://esm.sh/@alpinejs/sort@${ALPINE_VERSION}/es2024/sort.mjs`);
  });

  it('should merge custom vendors with default vendors', () => {
    const config = new RuntimeConfig({
      vendors: {
        map: {
          'htmx.js': 'https://unpkg.com/htmx.org@1.9.10',
        },
      },
    });

    // Should have both default and custom vendors
    assert.deepEqual(config.vendors.map['alpinejs.mjs'], `https://esm.sh/alpinejs@${ALPINE_VERSION}/es2024/alpinejs.mjs`);
    assert.deepEqual(config.vendors.map['htmx.js'], 'https://unpkg.com/htmx.org@1.9.10');
  });

  it('should allow overriding default vendors', () => {
    const config = new RuntimeConfig({
      vendors: {
        map: {
          'alpinejs.mjs': 'https://custom.cdn.com/alpine.js',
        },
      },
    });

    // Custom should override default
    assert.deepEqual(config.vendors.map['alpinejs.mjs'], 'https://custom.cdn.com/alpine.js');
  });
});
