import { assertEquals } from '@std/assert';

import { normalizeCreateArgs } from './create.ts';

Deno.test('normalizeCreateArgs returns help for no args', () => {
  assertEquals(normalizeCreateArgs([]), ['help']);
});

Deno.test('normalizeCreateArgs prefixes new for deno create args', () => {
  assertEquals(normalizeCreateArgs(['my-app', '--port', '3000']), ['new', 'my-app', '--port', '3000']);
});

Deno.test('normalizeCreateArgs keeps explicit new command', () => {
  assertEquals(normalizeCreateArgs(['new', 'my-app']), ['new', 'my-app']);
});

Deno.test('normalizeCreateArgs returns help for help flags', () => {
  assertEquals(normalizeCreateArgs(['--help']), ['help']);
  assertEquals(normalizeCreateArgs(['-h']), ['help']);
});
