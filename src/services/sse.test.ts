import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { service, SseClient } from './sse.ts';

describe('SseClient', () => {
  it('queues a push made before iteration starts', async () => {
    const client = new SseClient();
    client.push({ event: 'reload' });
    client.push(null);

    const received: unknown[] = [];
    for await (const message of client) {
      received.push(message);
    }

    assert.deepEqual(received, [{ event: 'reload' }]);
  });

  it('delivers a push made while iteration is already waiting', async () => {
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

    assert.deepEqual(received, [{ event: 'reload', data: 'x' }]);
  });

  it('ignores pushes after close', async () => {
    const client = new SseClient();
    client.push(null);
    client.push({ event: 'reload' });

    const received: unknown[] = [];
    for await (const message of client) {
      received.push(message);
    }

    assert.deepEqual(received, []);
  });
});

describe('SseService', () => {
  it('addClient registers a client for broadcast', () => {
    service.close();

    const client = service.addClient();

    assert.deepEqual(service.clients.has(client), true);
    service.close();
  });

  it('removeClient stops future broadcasts to that client', async () => {
    service.close();

    const client = service.addClient();
    service.removeClient(client);
    service.send('reload');
    client.push(null);

    const received: unknown[] = [];
    for await (const message of client) {
      received.push(message);
    }

    assert.deepEqual(received, []);
    service.close();
  });

  it('send fans out to every connected client', async () => {
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

    assert.deepEqual(gotA, [{ event: 'reload', data: undefined }]);
    assert.deepEqual(gotB, [{ event: 'reload', data: undefined }]);
  });

  it('close clears the client set', () => {
    service.close();
    service.addClient();
    service.addClient();

    service.close();

    assert.deepEqual(service.clients.size, 0);
  });
});
