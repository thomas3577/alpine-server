import { Router } from '@oak/oak';
import { UPDATER_FILENAME } from '../config.ts';
import type { AlpineAppState } from '../types.ts';

const updater = `const sse = new EventSource('/sse'); sse.onopen = () => sse.addEventListener('reload', () => location.reload());`;
const updateDummy = ';';
const router: Router<AlpineAppState> = new Router<AlpineAppState>({ prefix: `/${UPDATER_FILENAME}` });

router.get('/', (ctx) => {
  const { hostname } = ctx.request.url;

  ctx.response.headers.append('content-type', 'application/javascript; charset=utf-8');
  ctx.response.body = hostname === 'localhost' ? updater : updateDummy;
});

export { router, UPDATER_FILENAME as updaterFilename };
