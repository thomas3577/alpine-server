/** Serves the dev-mode hot-reload updater script. */
import { Hono } from '@hono/hono';
import type { AlpineAppState } from '../types.ts';

const NOOP_SCRIPT = ';';

// Inline rather than a separate .js file read from disk, so it ships with the
// module graph on every runtime and registry (JSR, npm compatibility layer).
const UPDATER_SCRIPT = `const sse = new EventSource('/sse');
sse.onopen = () => sse.addEventListener('reload', () => location.reload());
console.log('SSE connection established');
`;

const router = new Hono<{ Variables: AlpineAppState }>();

router.get('/', (c) => {
  const script = c.get('config').dev ? UPDATER_SCRIPT : NOOP_SCRIPT;

  return c.body(script, 200, { 'content-type': 'application/javascript; charset=utf-8' });
});

export { router };
