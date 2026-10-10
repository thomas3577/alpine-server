/** Starts an HTTP server on the current runtime: Deno, Bun, or Node.js. */
import type { ListenOptions } from './types.ts';

type FetchHandler = (request: Request) => Response | Promise<Response>;
type BunServer = { hostname: string; port: number; stop: (closeActiveConnections?: boolean) => Promise<void> };
type Bun = { serve: (options: { fetch: FetchHandler; hostname: string; port: number; idleTimeout: number }) => BunServer };

const DEFAULT_PORT = 8000;
const DEFAULT_HOSTNAME = '0.0.0.0';

const logListening = ({ hostname, port }: { hostname: string; port: number }): void => {
  console.info(`Listening on http://${hostname}:${port}/`);
};

/**
 * Serves `fetch` with the runtime's native server and resolves once the server
 * has shut down (after `options.signal` aborts; without a signal it never resolves).
 * Defaults match `Deno.serve`: port 8000 on hostname 0.0.0.0.
 */
export const serve = async (fetch: FetchHandler, options: ListenOptions = {}): Promise<void> => {
  if ('Deno' in globalThis) {
    await Deno.serve(options, fetch).finished;

    return;
  }

  const port = options.port ?? DEFAULT_PORT;
  const hostname = options.hostname ?? DEFAULT_HOSTNAME;
  const onListen = options.onListen ?? logListening;
  const signal = options.signal;
  const bun = (globalThis as { Bun?: Bun }).Bun;

  if (signal?.aborted) {
    return;
  }

  if (bun) {
    // idleTimeout 0: Bun's 10s default would cut long-lived SSE connections.
    const server = bun.serve({ fetch, hostname, port, idleTimeout: 0 });

    onListen({ hostname: server.hostname, port: server.port });

    await new Promise<void>((resolve) => {
      signal?.addEventListener('abort', () => server.stop(true).then(resolve), { once: true });
    });

    return;
  }

  const { serve: nodeServe } = await import('@hono/node-server');

  await new Promise<void>((resolve, reject) => {
    const server = nodeServe({ fetch, hostname, port }, (info) => onListen({ hostname, port: info.port }));

    server.once('error', reject);

    signal?.addEventListener('abort', () => {
      server.close(() => resolve());
      // Open SSE streams would otherwise keep close() waiting forever.
      (server as { closeAllConnections?: () => void }).closeAllConnections?.();
    }, { once: true });
  });
};
