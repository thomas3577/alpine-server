import { Hono } from '@hono/hono';
import { streamSSE } from '@hono/hono/streaming';
import { HTTPException } from '@hono/hono/http-exception';
import { getConnInfo } from '@hono/hono/deno';
import { cyan, green } from '@std/fmt/colors';
import { info } from '@std/log';
import { service } from '../services/sse.ts';

const router = new Hono();

router.get('/', (c) => {
  const accepts = c.req.header('Accept') ?? '';
  if (!accepts.includes('text/event-stream')) {
    throw new HTTPException(415);
  }

  let remote = 'unknown';
  try {
    remote = getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    // c.env is unavailable outside a real Deno.serve() connection (e.g. tests).
  }

  return streamSSE(c, async (stream) => {
    const client = service.addClient();

    info(`${green('SSE connected')} ${cyan(remote)}`);

    stream.onAbort(() => {
      info(`${green('SSE disconnect')} ${cyan(remote)}`);
      service.removeClient(client);
    });

    for await (const message of client) {
      await stream.writeSSE({ event: message.event, data: message.data ?? '' });
    }
  });
});

export { router };
