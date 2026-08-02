import type { HTMLScriptElement } from 'linkedom';
import { Hono } from '@hono/hono';
import { join } from '@std/path';
import { DOMParser } from 'linkedom';
import type { AlpineAppState } from '../types.ts';
import { UPDATER_FILENAME } from '../config.ts';

const router = new Hono<{ Variables: AlpineAppState }>();
const domParser = new DOMParser();

const isPathTraversalAttempt = (path: string): boolean => {
  // Hono params are already decoded; reject any attempt to escape the static root.
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

const injectUpdater = (html: string): string => {
  const document = domParser.parseFromString(html, 'text/html');
  const script: HTMLScriptElement = document.createElement('script', undefined);
  script.setAttribute('src', `/${UPDATER_FILENAME}`);
  script.setAttribute('defer', '');

  document.head.appendChild(script);

  return document.documentElement.innerHTML;
};

router.get('/:site{.*}', async (c) => {
  const sitePath = c.req.param('site') ?? '';

  if (isPathTraversalAttempt(sitePath) || looksLikeFileRequest(sitePath)) {
    return c.text('', 404);
  }

  const path: string = join(c.get('config').staticFilesPath, sitePath, 'index.html');

  try {
    const text: string = await Deno.readTextFile(path);
    const body: string = !c.get('config').dev ? text : injectUpdater(text);

    return c.html(body);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      return c.text('', 404);
    }

    throw err;
  }
});

export { router };
