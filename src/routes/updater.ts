import { Router } from '@oak/oak';
import { UPDATER_FILENAME } from '../config.ts';
import type { AlpineAppState } from '../types.ts';

const NOOP_SCRIPT = ';';
const updaterScriptUrl = new URL('./updater-client.js', import.meta.url);
const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);
let updaterScriptPromise: Promise<string> | undefined;

const getUpdaterScript = async (hostname: string): Promise<string> => {
  if (!localHostnames.has(hostname)) {
    return NOOP_SCRIPT;
  }

  if (!updaterScriptPromise) {
    updaterScriptPromise = (async () => {
      try {
        const permission = await Deno.permissions.query({ name: 'read', path: updaterScriptUrl });
        if (permission.state !== 'granted') {
          return NOOP_SCRIPT;
        }
      } catch {
        return NOOP_SCRIPT;
      }

      try {
        return await Deno.readTextFile(updaterScriptUrl);
      } catch (error) {
        if (
          error instanceof Deno.errors.PermissionDenied ||
          error instanceof Deno.errors.NotFound
        ) {
          return NOOP_SCRIPT;
        }

        return NOOP_SCRIPT;
      }
    })();
  }

  return await updaterScriptPromise;
};

const router: Router<AlpineAppState> = new Router<AlpineAppState>({ prefix: `/${UPDATER_FILENAME}` });

router.get('/', async (ctx) => {
  const { hostname } = ctx.request.url;

  ctx.response.body = await getUpdaterScript(hostname);
  ctx.response.headers.append('content-type', 'application/javascript; charset=utf-8');
});

export { router, UPDATER_FILENAME as updaterFilename };
