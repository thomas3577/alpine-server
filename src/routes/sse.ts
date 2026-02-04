import type { Context, ServerSentEventTarget } from '@oak/oak';
import { Router, Status } from '@oak/oak';
import { cyan, green } from '@std/fmt/colors';
import * as log from '@std/log';
import { service } from '../services/sse.ts';

const router = new Router({ prefix: '/sse' });

router.get('/', async (context: Context) => {
  context.assert(context.request.accepts('text/event-stream'), Status.UnsupportedMediaType);

  const connection: string = context.request.ip;
  const target: ServerSentEventTarget = await context.sendEvents();

  service.clients.set(connection, target);

  log.info(`${green('SSE connected')} ${cyan(connection)}`);

  target.addEventListener('close', () => {
    log.info(`${green('SSE disconnect')} ${cyan(connection)}`);
    service.clients.delete(connection);
  });
});

export { router };
