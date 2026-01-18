import type { Element, HTMLDocument } from '@deno/dom';
import { Router } from '@oak/oak';
import { join } from '@std/path';
import { DOMParser } from '@deno/dom';

import type { AlpineAppState } from '../types.ts';
import { updaterFilename } from '../services/updater.service.ts';

const router: Router<AlpineAppState> = new Router<AlpineAppState>();
const domParser = new DOMParser();

const isPathTraversalAttempt = (path: string): boolean => {
  // Oak params are already decoded; reject any attempt to escape the static root.
  const segments = path.split('/');

  return segments.includes('..') || path.includes('\\') || path.includes('\0');
};

const looksLikeFileRequest = (path: string): boolean => {
  // Treat paths whose last segment has a dot as file requests (e.g. vendor/phpunit.xsd).
  // Those should be served by the static-files middleware; otherwise return 404 quickly.
  const lastSegment = path.split('/').filter(Boolean).at(-1) ?? '';
  if (!lastSegment) {
    return false;
  }

  if (lastSegment === '.well-known') {
    return false;
  }

  return lastSegment.includes('.') && !lastSegment.endsWith('.');
};

const injectUpdater = (html: string): string | null => {
  const element: HTMLDocument | null = domParser.parseFromString(html, 'text/html');
  if (element) {
    const script: Element = element.createElement('script');
    script.setAttribute('src', updaterFilename);
    script.setAttribute('defer', '');

    element.head.appendChild(script);
  }

  return element?.documentElement?.innerHTML ?? null;
};

router.get('/:site*', async (ctx) => {
  const { site } = ctx.params;
  const sitePath = site ?? '';

  if (isPathTraversalAttempt(sitePath) || looksLikeFileRequest(sitePath)) {
    ctx.response.status = 404;
    return;
  }

  const path: string = join(ctx.state.config.staticFilesPath, sitePath, 'index.html');

  try {
    const text: string = await Deno.readTextFile(path);
    const body: string | null = !ctx.state.config.dev ? text : injectUpdater(text);

    ctx.response.status = !body ? 404 : 200;
    if (body) {
      ctx.response.headers.set('Content-Type', 'text/html');
      ctx.response.body = body;
    }
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      ctx.response.status = 404;
      return;
    }

    throw err;
  }
});

export default router;
