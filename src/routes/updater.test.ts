import { assert, assertEquals } from '@std/assert';
import { Application } from '@oak/oak';
import { router } from './updater.ts';
import { createRuntimeConfig } from '../test/runtime-config.ts';

const createApp = (dev: boolean): Application => {
  const app = new Application();

  app.use(async (ctx, next) => {
    ctx.state.config = createRuntimeConfig(dev, Deno.cwd());
    await next();
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
};

Deno.test('updater route', async (t) => {
  await t.step('returns noop script in production', async () => {
    const app = createApp(false);
    const response = await app.handle(new Request('http://localhost/updater.js/'));

    assert(response);
    assertEquals(response.status, 200);
    assertEquals(await response.text(), ';');

    const canonicalResponse = await app.handle(new Request('http://localhost/updater.js'));

    assert(canonicalResponse);
    assertEquals(canonicalResponse.status, 200);
    assertEquals(await canonicalResponse.text(), ';');
  });

  await t.step('returns updater client script in development', async () => {
    const app = createApp(true);
    const response = await app.handle(new Request('http://localhost/updater.js/'));

    assert(response);
    assertEquals(response.status, 200);

    const script = await response.text();
    assert(script.length > 1);
    assert(script.includes('EventSource'));

    const canonicalResponse = await app.handle(new Request('http://localhost/updater.js'));

    assert(canonicalResponse);
    assertEquals(canonicalResponse.status, 200);
    const canonicalScript = await canonicalResponse.text();
    assert(canonicalScript.length > 1);
    assert(canonicalScript.includes('EventSource'));
  });
});
