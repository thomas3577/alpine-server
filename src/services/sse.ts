import type { ServerSentEventInit, ServerSentEventTarget } from '@oak/oak';

import { ServerSentEvent } from '@oak/oak';

class SseService {
  #clients = new Map<string, ServerSentEventTarget>();

  get clients(): Map<string, ServerSentEventTarget> {
    return this.#clients;
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

