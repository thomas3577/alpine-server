import { assertEquals, assertThrows } from '@std/assert';
import * as path from '@std/path';

import { resolveStaticFilesPath } from './utils.ts';

const cwd = Deno.cwd();
const defaultRoot = path.join(cwd, 'default');

Deno.test('resolveStaticFilesPath', async (t) => {
  await t.step('should return defaultRoot if value is missing or empty', () => {
    assertEquals(resolveStaticFilesPath(undefined, defaultRoot), defaultRoot);
    assertEquals(resolveStaticFilesPath('', defaultRoot), defaultRoot);
    assertEquals(resolveStaticFilesPath('  ', defaultRoot), defaultRoot);
  });

  await t.step('should resolve relative paths against cwd', () => {
    const relativePath = 'public';
    const expected = path.join(cwd, relativePath);
    assertEquals(resolveStaticFilesPath(relativePath, defaultRoot), expected);
  });

  await t.step('should allow absolute paths inside cwd', () => {
    const absolutePath = path.join(cwd, 'public');
    assertEquals(resolveStaticFilesPath(absolutePath, defaultRoot), absolutePath);
  });

  await t.step('should throw for absolute paths outside cwd', () => {
    const outsidePath = path.resolve(cwd, '..');
    assertThrows(() => {
      resolveStaticFilesPath(outsidePath, defaultRoot);
    }, Error, `staticFilesPath must stay within cwd`);
  });

  await t.step('should throw for relative paths that resolve outside cwd', () => {
    const outsideRelativePath = '../';
    assertThrows(() => {
      resolveStaticFilesPath(outsideRelativePath, defaultRoot);
    }, Error, `staticFilesPath must stay within cwd`);
  });

  await t.step('should handle nested paths correctly', () => {
    const nestedPath = 'public/assets';
    const expected = path.join(cwd, nestedPath);
    assertEquals(resolveStaticFilesPath(nestedPath, defaultRoot), expected);
  });
});
