import { Router } from '@oak/oak';
import { UPDATER_FILENAME } from '../config.ts';
import type { AlpineAppState } from '../types.ts';

const NOOP_SCRIPT = ';';
const updaterScriptUrl = new URL('./updater-client.js', import.meta.url);
let updaterScriptPromise: Promise<string> | undefined;

const getUpdaterScript = async (dev: boolean): Promise<string> => {
  if (!dev) {
    return NOOP_SCRIPT;
  }

  if (!updaterScriptPromise) {
    updaterScriptPromise = (async () => {
      try {
        const permission = await Deno.permissions.query({ name: 'read', path: updaterScriptUrl });
        if (permission.state !== 'granted') {
          console.warn('Read permission for updater script is not granted. Returning no-op script.');
          return NOOP_SCRIPT;
        }

        return await Deno.readTextFile(updaterScriptUrl);
      } catch (error) {
        console.error('Failed to read updater script:', error);
        return NOOP_SCRIPT;
      }
    })();
  }

  return await updaterScriptPromise;
};

const router: Router<AlpineAppState> = new Router<AlpineAppState>({ prefix: `/${UPDATER_FILENAME}` });

router.get('/', async (ctx) => {
  ctx.response.body = await getUpdaterScript(ctx.state.config.dev);
  ctx.response.headers.append('content-type', 'application/javascript; charset=utf-8');
});

export { router };
