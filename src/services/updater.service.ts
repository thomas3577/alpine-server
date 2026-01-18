import type { Context } from '@oak/oak';

import { Router } from '@oak/oak';

const updater = `const sse = new EventSource('/sse'); sse.onopen = () => sse.addEventListener('reload', () => location.reload());`;
const updateDummy = ';';
const router = new Router();
const updaterFilename = 'updater.js';

router.get(`/${updaterFilename}`, (context: Context) => {
  const { hostname } = context.request.url;

  context.response.headers.append('content-type', 'application/javascript; charset=utf-8');
  context.response.body = hostname === 'localhost' ? updater : updateDummy;
});

export { router, updaterFilename };
