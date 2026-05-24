import type { ServerSentEventInit, ServerSentEventTarget } from '@oak/oak';
import { ServerSentEvent } from '@oak/oak';

class SseService {
  #clients = new Set<ServerSentEventTarget>();

  get clients(): Set<ServerSentEventTarget> {
    return this.#clients;
  }

  /** Adds an SSE target to the private client set for future broadcasts. */
  addClient(target: ServerSentEventTarget): void {
    this.#clients.add(target);
  }

  /** Removes an SSE target from the private client set to stop broadcasts. */
  removeClient(target: ServerSentEventTarget): void {
    this.#clients.delete(target);
  }

  send(type: string, eventInit?: ServerSentEventInit): void {
    const serverSentEvent: ServerSentEvent = new ServerSentEvent(type, eventInit);

    this.#clients.forEach((target) => target.dispatchEvent(serverSentEvent));
  }

  close(): void {
    this.#clients.forEach((target) => target.close());
    this.#clients.clear();
  }
}

/** Singleton SSE service instance shared across routes and file-watch events. */
const service = new SseService();

const staticFileWatch = async (path?: string): Promise<void> => {
  if (!path) {
    return;
  }

  for await (const event of Deno.watchFs(path)) {
    service.send('reload', event as ServerSentEventInit);
    service.close();
  }
};

export { service, staticFileWatch };
