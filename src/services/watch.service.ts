import type { ServerSentEventInit } from '@oak/oak';

import { service as sseService } from './sse.service.ts';

export const staticFileWatch = async (path?: string): Promise<void> => {
  if (!path) {
    return;
  }

  for await (const event of Deno.watchFs(path)) {
    sseService.send('reload', event as ServerSentEventInit);
    sseService.close();
  }
};
