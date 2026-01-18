import type { Context, ServerSentEventInit, ServerSentEventTarget } from '@oak/oak';

import { Router, ServerSentEvent, Status } from '@oak/oak';
import { cyan, green } from '@std/fmt/colors';
import * as log from '@std/log';

const router = new Router();
const sseClients = new Map<string, ServerSentEventTarget>();

class SseService {
  public send(type: string, eventInit?: ServerSentEventInit): void {
    const serverSentEvent: ServerSentEvent = new ServerSentEvent(type, eventInit);

    sseClients.forEach((target) => target.dispatchEvent(serverSentEvent));
  }

  public close(): void {
    sseClients.forEach((target) => target.close());
    sseClients.clear();
  }
}

const service = new SseService();

router.get('/sse', async (context: Context) => {
  context.assert(context.request.accepts('text/event-stream'), Status.UnsupportedMediaType);

  const connection: string = context.request.ip;
  const target: ServerSentEventTarget = await context.sendEvents();

  sseClients.set(connection, target);

  log.info(`${green('SSE connected')} ${cyan(connection)}`);

  target.addEventListener('close', () => {
    log.info(`${green('SSE disconnect')} ${cyan(connection)}`);
    sseClients.delete(connection);
  });
});

export { router, service };
