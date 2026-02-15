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
 *
 * @param {unknown} value User input for static files path.
 * @param {string} defaultRoot Default static files path to use when input is missing/empty.
 *
 * @returns {string} Resolved absolute path to static files root.
 * @throws {Error} If resolved path is outside cwd.
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
