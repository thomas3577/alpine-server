import { assert, assertEquals } from '@std/assert';
import type { Context } from '@oak/oak';
import { router } from './sse.ts';
import { service } from '../services/sse.ts';

type MockTarget = {
  addEventListener: (type: string, listener: () => void) => void;
  dispatchEvent: (_event: Event) => boolean;
  close: () => void;
};

const createContext = (accept: string, target: MockTarget): Context => {
  const listeners = new Map<string, () => void>();
  target.addEventListener = (type: string, listener: () => void) => {
    listeners.set(type, listener);
  };

  return {
    request: {
      method: 'GET',
      url: new URL('http://localhost/sse/'),
      ip: '127.0.0.1',
      accepts: (value: string) => (accept === value ? value : undefined),
    },
    response: {
      status: 200,
      headers: new Headers(),
    },
    assert: (condition: unknown, status: number) => {
      if (!condition) {
        throw { status };
      }
    },
    sendEvents: () => target,
    state: {},
  } as unknown as Context;
};

const runSseMiddleware = async (ctx: Context): Promise<void> => {
  const middleware = router.routes();
  await middleware(ctx, async () => {});
};

Deno.test('sse route', async (t) => {
  await t.step('registers a client when accepting event-stream', async () => {
    service.close();
    const target: MockTarget = {
      addEventListener: () => {},
      dispatchEvent: () => true,
      close: () => {},
    };
    const ctx = createContext('text/event-stream', target);

    await runSseMiddleware(ctx);

    assertEquals(service.clients.size, 1);

    service.close();
  });

  await t.step('returns 415 for unsupported media type', async () => {
    service.close();
    const target: MockTarget = {
      addEventListener: () => {},
      dispatchEvent: () => true,
      close: () => {},
    };
    const ctx = createContext('application/json', target);

    try {
      await runSseMiddleware(ctx);
      assert(false, 'Expected unsupported media type assertion');
    } catch (error) {
      assertEquals((error as { status?: number }).status, 415);
    }

    assertEquals(service.clients.size, 0);
  });
});
