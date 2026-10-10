import { after, before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { join } from 'node:path';
import process from 'node:process';
import { AlpineApp } from './app.ts';

const HOST = '127.0.0.1';

/** Sends a raw HTTP request so the path reaches the server exactly as written (no client-side URL normalization). */
const rawGet = (port: number, path: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const socket = connect(port, HOST, () => {
      socket.write(`GET ${path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n`);
    });
    let data = '';

    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      data += chunk;
    });
    socket.on('end', () => resolve(data));
    socket.on('error', reject);
  });

/** Starts an AlpineApp on a free port and returns its base URL plus a `stop()` that resolves once `run()` has. */
const start = async (dev: boolean, staticFilesPath: string): Promise<{ url: string; port: number; stop: () => Promise<void> }> => {
  const controller = new AbortController();
  let onListen!: (port: number) => void;
  const listening = new Promise<number>((resolve) => {
    onListen = resolve;
  });

  const app = new AlpineApp({
    app: { dev, staticFilesPath },
    server: { listenOptions: { port: 0, hostname: HOST, signal: controller.signal, onListen: ({ port }) => onListen(port) } },
  });
  const running = app.run();
  const port = await Promise.race([listening, running.then(() => 0)]);

  return {
    url: `http://${HOST}:${port}`,
    port,
    stop: () => {
      controller.abort();

      return running;
    },
  };
};

describe('AlpineApp.run', () => {
  // Inside cwd: staticFilesPath may not resolve outside it.
  let tmp = '';
  let root = '';
  let server: Awaited<ReturnType<typeof start>>;

  before(async () => {
    mock.method(console, 'info', () => {});
    tmp = await mkdtemp(join(process.cwd(), '.test-'));
    root = join(tmp, 'public');
    await mkdir(root);
    await writeFile(join(root, 'index.html'), '<!doctype html><html><head><title>Home</title></head><body>HOME</body></html>');
    await writeFile(join(root, 'style.css'), 'body { margin: 0; }');
    await writeFile(join(tmp, 'secret.css'), 'TOP-SECRET');
    server = await start(true, root);
  });

  after(async () => {
    await server.stop();
    await rm(tmp, { recursive: true, force: true, maxRetries: 5 });
    mock.restoreAll();
  });

  it('listens on the port reported by onListen', () => {
    assert.ok(server.port > 0);
  });

  it('serves index.html with security headers and the dev updater', async () => {
    const response = await fetch(`${server.url}/`);
    const html = await response.text();

    assert.deepEqual(response.status, 200);
    assert.ok(html.includes('HOME'));
    assert.ok(html.includes('src="/updater.js"'));
    assert.deepEqual(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(response.headers.get('content-security-policy')?.includes("default-src 'self'"));
  });

  it('serves static files', async () => {
    const response = await fetch(`${server.url}/style.css`);

    assert.deepEqual(response.status, 200);
    assert.deepEqual(response.headers.get('content-type'), 'text/css; charset=utf-8');
    assert.deepEqual(await response.text(), 'body { margin: 0; }');
  });

  it('never serves files outside the static root', async () => {
    for (const path of ['/../secret.css', '/%2e%2e/secret.css', '/..%2fsecret.css', '/%2e%2e%2fsecret.css', '/public/../../secret.css', '/../secret.css/']) {
      const response = await rawGet(server.port, path);

      assert.ok(!response.startsWith('HTTP/1.1 200'), `${path}: ${response.split('\r\n')[0]}`);
      assert.ok(!response.includes('TOP-SECRET'), path);
    }
  });

  it('sends a reload event when a static file changes', async () => {
    const response = await fetch(`${server.url}/sse`, { headers: { Accept: 'text/event-stream' } });
    assert.deepEqual(response.status, 200);

    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader();
    let received = '';
    // Keep touching the file until the watcher fires; the first write can race the SSE client registration.
    const touch = setInterval(() => writeFile(join(root, 'style.css'), `body { margin: ${Date.now()}px; }`), 100);
    const timeout = setTimeout(() => reader.cancel(), 3000);

    try {
      while (!received.includes('event: reload')) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        received += value;
      }
    } finally {
      clearInterval(touch);
      clearTimeout(timeout);
      await reader.cancel().catch(() => {});
    }

    assert.ok(received.includes('event: reload'), `received: ${JSON.stringify(received)}`);
  });

  it('shuts down when the signal aborts', async () => {
    const other = await start(false, root);
    const response = await fetch(`${other.url}/`);
    await response.body?.cancel();

    await other.stop();

    await assert.rejects(fetch(`${other.url}/`));
  });
});
