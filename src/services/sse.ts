export type SseMessage = { event: string; data?: string };

/**
 * A single SSE connection's push/pull message queue.
 *
 * Hono's `streamSSE` only exposes a writable stream from *inside* the request
 * callback holding that one connection open — unlike oak's `sendEvents()`,
 * there is no handle to push into from outside a request. This queue bridges
 * that gap: external code (the fs watcher) calls `push()`, and the connection
 * handler drains it via `for await`.
 */
export class SseClient {
  #queue: (SseMessage | null)[] = [];
  #resolve: ((result: IteratorResult<SseMessage>) => void) | null = null;
  #done = false;

  /** Pushes a message to this client, or `null` to end the stream. */
  push(message: SseMessage | null): void {
    if (this.#done) {
      return;
    }
    if (message === null) {
      this.#done = true;
    }

    if (this.#resolve) {
      const resolve = this.#resolve;
      this.#resolve = null;
      resolve(message === null ? { value: undefined, done: true } : { value: message, done: false });
      return;
    }

    this.#queue.push(message);
  }

  [Symbol.asyncIterator](): AsyncIterator<SseMessage> {
    return {
      next: (): Promise<IteratorResult<SseMessage>> => {
        if (this.#queue.length > 0) {
          const value = this.#queue.shift() as SseMessage | null;
          return Promise.resolve(value === null ? { value: undefined, done: true } : { value, done: false });
        }
        if (this.#done) {
          return Promise.resolve({ value: undefined, done: true });
        }

        return new Promise((resolve) => {
          this.#resolve = resolve;
        });
      },
    };
  }
}

class SseService {
  #clients = new Set<SseClient>();

  get clients(): Set<SseClient> {
    return new Set(this.#clients);
  }

  /** Registers a new client for future broadcasts and returns it for iteration. */
  addClient(): SseClient {
    const client = new SseClient();
    this.#clients.add(client);

    return client;
  }

  /** Removes a client from the private client set to stop broadcasts. */
  removeClient(client: SseClient): void {
    this.#clients.delete(client);
  }

  /** Broadcasts an event to every connected client. */
  send(type: string, data?: string): void {
    this.#clients.forEach((client) => client.push({ event: type, data }));
  }

  /** Ends every connected client's stream and clears the client set. */
  close(): void {
    this.#clients.forEach((client) => client.push(null));
    this.#clients.clear();
  }
}

/** Singleton SSE service instance shared across routes and file-watch events. */
const service = new SseService();

const staticFileWatch = async (path?: string): Promise<void> => {
  if (!path) {
    return;
  }

  for await (const _event of Deno.watchFs(path)) {
    service.send('reload');
    service.close();
  }
};

export { service, staticFileWatch };
