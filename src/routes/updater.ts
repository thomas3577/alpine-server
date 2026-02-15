import { Router } from '@oak/oak';
import { UPDATER_FILENAME } from '../config.ts';
import type { AlpineAppState } from '../types.ts';

const updaterScriptPromise = Deno.readTextFile(new URL('./updater-client.js', import.meta.url));
const NOOP_SCRIPT = ';';

const router: Router<AlpineAppState> = new Router<AlpineAppState>({ prefix: `/${UPDATER_FILENAME}` });

router.get('/', async (ctx) => {
  const { hostname } = ctx.request.url;
  const updaterScript = await updaterScriptPromise;

  ctx.response.headers.append('content-type', 'application/javascript; charset=utf-8');
  ctx.response.body = hostname === 'localhost' ? updaterScript : NOOP_SCRIPT;
});

export { router, UPDATER_FILENAME as updaterFilename };
