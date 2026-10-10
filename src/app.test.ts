import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AlpineApp } from './app.ts';

describe('AlpineApp', () => {
  it('should construct with full config', () => {
    const alpineApp = new AlpineApp({
      app: {
        dev: true,
        staticFilesPath: './public',
        staticExtensions: ['.html', '.css', '.js'],
      },
      server: {
        listenOptions: {
          port: 8000,
        },
      },
    });

    assert.ok(alpineApp);
    assert.deepEqual(typeof alpineApp.run, 'function');
  });

  it('should construct without config', () => {
    const alpineApp = new AlpineApp();
    assert.ok(alpineApp);
    assert.deepEqual(typeof alpineApp.run, 'function');
  });

  it('should construct with minimal config', () => {
    const alpineApp = new AlpineApp({});
    assert.ok(alpineApp);
    assert.deepEqual(typeof alpineApp.run, 'function');
  });

  it('should construct with only app config', () => {
    const alpineApp = new AlpineApp({
      app: {
        dev: false,
        staticFilesPath: './dist',
        staticExtensions: ['.html'],
      },
    });

    assert.ok(alpineApp);
  });

  it('should construct with only server config', () => {
    const alpineApp = new AlpineApp({
      server: {
        listenOptions: {
          port: 3000,
          hostname: 'localhost',
        },
      },
    });

    assert.ok(alpineApp);
  });
});
