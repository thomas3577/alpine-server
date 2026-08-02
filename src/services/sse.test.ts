import { assertEquals } from '@std/assert';
import { service, SseClient } from './sse.ts';

Deno.test('SseClient', async (t) => {
  await t.step('queues a push made before iteration starts', async () => {
    const client = new SseClient();
    client.push({ event: 'reload' });
    client.push(null);

    const received: unknown[] = [];
    for await (const message of client) {
      received.push(message);
    }

    assertEquals(received, [{ event: 'reload' }]);
  });

  await t.step('delivers a push made while iteration is already waiting', async () => {
    const client = new SseClient();
    const received: unknown[] = [];

    const consumer = (async () => {
      for await (const message of client) {
        received.push(message);
      }
    })();

    await new Promise((resolve) => setTimeout(resolve, 5));
    client.push({ event: 'reload', data: 'x' });
    client.push(null);
    await consumer;

    assertEquals(received, [{ event: 'reload', data: 'x' }]);
  });

  await t.step('ignores pushes after close', async () => {
    const client = new SseClient();
    client.push(null);
    client.push({ event: 'reload' });

    const received: unknown[] = [];
    for await (const message of client) {
      received.push(message);
    }

    assertEquals(received, []);
  });
});

Deno.test('SseService', async (t) => {
  await t.step('addClient registers a client for broadcast', () => {
    service.close();

    const client = service.addClient();

    assertEquals(service.clients.has(client), true);
    service.close();
  });

  await t.step('removeClient stops future broadcasts to that client', async () => {
    service.close();

    const client = service.addClient();
    service.removeClient(client);
    service.send('reload');
    client.push(null);

    const received: unknown[] = [];
    for await (const message of client) {
      received.push(message);
    }

    assertEquals(received, []);
    service.close();
  });

  await t.step('send fans out to every connected client', async () => {
    service.close();

    const clientA = service.addClient();
    const clientB = service.addClient();
    const gotA: unknown[] = [];
    const gotB: unknown[] = [];

    const consumerA = (async () => {
      for await (const message of clientA) gotA.push(message);
    })();
    const consumerB = (async () => {
      for await (const message of clientB) gotB.push(message);
    })();

    await new Promise((resolve) => setTimeout(resolve, 5));
    service.send('reload');
    service.close();
    await Promise.all([consumerA, consumerB]);

    assertEquals(gotA, [{ event: 'reload', data: undefined }]);
    assertEquals(gotB, [{ event: 'reload', data: undefined }]);
  });

  await t.step('close clears the client set', () => {
    service.close();
    service.addClient();
    service.addClient();

    service.close();

    assertEquals(service.clients.size, 0);
  });
});
