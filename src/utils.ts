import { isAbsolute, relative, resolve } from '@std/path';

const isPathInside = (root: string, candidate: string): boolean => {
  const rel = relative(root, candidate);

  // Outside if it starts with '..' or is an absolute path (different drive on Windows).
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

/**
 * Resolves a user-provided static files root.
 *
 * Rules:
 * - Missing/empty input => return defaultRoot
 * - Relative paths => resolved against cwd
 * - Absolute paths => allowed only if inside cwd
 */
export const resolveStaticFilesPath = (value: unknown, defaultRoot: string): string => {
  const cwd = Deno.cwd();

  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate) {
    return defaultRoot;
  }

  const resolved = resolve(cwd, candidate);

  if (!isPathInside(cwd, resolved)) {
    throw new Error(`staticFilesPath must stay within cwd: cwd="${cwd}", staticFilesPath="${candidate}"`);
  }

  return resolved;
};
