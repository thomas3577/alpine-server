import { Hono } from '@hono/hono';
import { streamSSE } from '@hono/hono/streaming';
import { HTTPException } from '@hono/hono/http-exception';
import { green } from '@std/fmt/colors';
import { service } from '../services/sse.ts';

const router = new Hono();

router.get('/', (c) => {
  const accepts = c.req.header('Accept') ?? '';
  if (!accepts.includes('text/event-stream')) {
    throw new HTTPException(415);
  }

  return streamSSE(c, async (stream) => {
    const client = service.addClient();

    console.info(green('SSE connected'));

    stream.onAbort(() => {
      console.info(green('SSE disconnect'));
      service.removeClient(client);
      client.push(null);
    });

    // An SSE comment flushes the headers now; Bun otherwise holds them back until the first event,
    // so EventSource's `onopen` (where the updater attaches its reload listener) would never fire.
    await stream.write(': connected\n\n');

    for await (const message of client) {
      await stream.writeSSE({ event: message.event, data: message.data ?? '' });
    }
  });
});

export { router };
