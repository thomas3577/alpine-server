/** Path resolution and validation helpers. */
import { isAbsolute, relative, resolve } from 'node:path';
import process from 'node:process';

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
  const cwd = process.cwd();

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

/**
 * Whether an error means "file not found": Node-style `ENOENT`/`ENOTDIR` codes
 * (all runtimes), or a Deno `NotFound` error thrown by user code.
 *
 * @param {unknown} err Caught error.
 *
 * @returns {boolean} True if the error signals a missing file.
 */
export const isNotFoundError = (err: unknown): boolean => {
  if (!(err instanceof Error)) {
    return false;
  }

  const code = (err as { code?: unknown }).code;

  return code === 'ENOENT' || code === 'ENOTDIR' || err.name === 'NotFound';
};
