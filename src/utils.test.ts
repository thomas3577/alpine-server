import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import { join, resolve } from 'node:path';
import { resolveStaticFilesPath } from './utils.ts';

const cwd = process.cwd();
const defaultRoot = join(cwd, 'default');

describe('resolveStaticFilesPath', () => {
  it('should return defaultRoot if value is missing or empty', () => {
    assert.deepEqual(resolveStaticFilesPath(undefined, defaultRoot), defaultRoot);
    assert.deepEqual(resolveStaticFilesPath('', defaultRoot), defaultRoot);
    assert.deepEqual(resolveStaticFilesPath('  ', defaultRoot), defaultRoot);
  });

  it('should resolve relative paths against cwd', () => {
    const relativePath = 'public';
    const expected = join(cwd, relativePath);
    assert.deepEqual(resolveStaticFilesPath(relativePath, defaultRoot), expected);
  });

  it('should allow absolute paths inside cwd', () => {
    const absolutePath = join(cwd, 'public');
    assert.deepEqual(resolveStaticFilesPath(absolutePath, defaultRoot), absolutePath);
  });

  it('should throw for absolute paths outside cwd', () => {
    const outsidePath = resolve(cwd, '..');
    assert.throws(
      () => {
        resolveStaticFilesPath(outsidePath, defaultRoot);
      },
      /staticFilesPath must stay within cwd/,
    );
  });

  it('should throw for relative paths that resolve outside cwd', () => {
    const outsideRelativePath = '../';
    assert.throws(
      () => {
        resolveStaticFilesPath(outsideRelativePath, defaultRoot);
      },
      /staticFilesPath must stay within cwd/,
    );
  });

  it('should handle nested paths correctly', () => {
    const nestedPath = 'public/assets';
    const expected = join(cwd, nestedPath);
    assert.deepEqual(resolveStaticFilesPath(nestedPath, defaultRoot), expected);
  });
});
