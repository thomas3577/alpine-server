/** Serves the dev-mode hot-reload updater script. */
import { Hono } from '@hono/hono';
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

const router = new Hono<{ Variables: AlpineAppState }>();

router.get('/', async (c) => {
  const script = await getUpdaterScript(c.get('config').dev);

  return c.body(script, 200, { 'content-type': 'application/javascript; charset=utf-8' });
});

export { router };
