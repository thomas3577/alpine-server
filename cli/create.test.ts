import { it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCreateArgs } from './create.ts';

it('normalizeCreateArgs returns help for no args', () => {
  assert.deepEqual(normalizeCreateArgs([]), ['help']);
});

it('normalizeCreateArgs prefixes new for deno create args', () => {
  assert.deepEqual(normalizeCreateArgs(['my-app', '--port', '3000']), ['new', 'my-app', '--port', '3000']);
});

it('normalizeCreateArgs keeps explicit new command', () => {
  assert.deepEqual(normalizeCreateArgs(['new', 'my-app']), ['new', 'my-app']);
});

it('normalizeCreateArgs returns help for help flags', () => {
  assert.deepEqual(normalizeCreateArgs(['--help']), ['help']);
  assert.deepEqual(normalizeCreateArgs(['-h']), ['help']);
});

it('normalizeCreateArgs returns version for version flags', () => {
  assert.deepEqual(normalizeCreateArgs(['-v']), ['version']);
  assert.deepEqual(normalizeCreateArgs(['--version']), ['version']);
});
