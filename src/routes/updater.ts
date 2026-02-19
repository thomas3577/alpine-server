import { Router } from '@oak/oak';
import { UPDATER_FILENAME } from '../config.ts';
import type { AlpineAppState } from '../types.ts';

const NOOP_SCRIPT = ';';
const updaterScriptUrl = new URL('./updater-client.js', import.meta.url);

const getUpdaterScript = async (dev: boolean): Promise<string> => {
  if (!dev) {
    return NOOP_SCRIPT;
  }

  try {
    if (updaterScriptUrl.protocol === 'file:') {
      return await Deno.readTextFile(updaterScriptUrl);
    }

    if (updaterScriptUrl.protocol === 'http:' || updaterScriptUrl.protocol === 'https:') {
      const response = await fetch(updaterScriptUrl);
      return response.ok ? await response.text() : NOOP_SCRIPT;
    }

    return NOOP_SCRIPT;
  } catch {
    return NOOP_SCRIPT;
  }
};

const router: Router<AlpineAppState> = new Router<AlpineAppState>({ prefix: `/${UPDATER_FILENAME}` });

router.get('/', async (ctx) => {
  ctx.response.body = await getUpdaterScript(ctx.state.config.dev);
  ctx.response.headers.append('content-type', 'application/javascript; charset=utf-8');
});

export { router };
