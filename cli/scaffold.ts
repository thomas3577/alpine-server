/** Creates new alpine-server projects and adds pages to existing ones. */
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { isNotFoundError } from '../src/utils.ts';
import { buildPageFiles, buildScaffoldFiles } from './templates.ts';
import type { AddPageOptions, CreateProjectOptions } from './types.ts';

export { buildPageFiles, buildScaffoldFiles } from './templates.ts';
export type { AddPageOptions, CreateProjectOptions, ParsedCliArgs, ScaffoldFileContent } from './types.ts';
export { getHelpText, getVersion, parseCliArgs } from './parser.ts';

const isDirectoryEmpty = async (directory: string): Promise<boolean> => {
  try {
    return (await readdir(directory)).length === 0;
  } catch (error) {
    if (isNotFoundError(error)) {
      return true;
    }
    throw error;
  }
};

const ensureTargetDir = async (targetDir: string, force: boolean): Promise<void> => {
  const isEmpty = await isDirectoryEmpty(targetDir);

  if (!isEmpty && !force) {
    throw new Error('Target directory is not empty. Use --force to continue.');
  }

  await mkdir(targetDir, { recursive: true });
};

const directoryExists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch (_error) {
    return false;
  }
};

export const createProject = async (options: CreateProjectOptions): Promise<string[]> => {
  const targetDir = resolve(options.targetDir);
  const projectName = options.projectName.trim() || basename(targetDir);

  await ensureTargetDir(targetDir, options.force);

  const files = buildScaffoldFiles(projectName, options.port);
  const writtenFiles: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(targetDir, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
    writtenFiles.push(absolutePath);
  }

  return writtenFiles;
};

export const addPage = async (options: AddPageOptions): Promise<string[]> => {
  const publicDir = resolve('public');

  if (!(await directoryExists(publicDir))) {
    throw new Error('No public/ directory found. Are you in an alpine-server project?');
  }

  const pageDir = resolve(publicDir, options.pageName);

  if (!pageDir.startsWith(publicDir + '/') && !pageDir.startsWith(publicDir + '\\')) {
    throw new Error(`Invalid page name: "${options.pageName}". Page must be nested under public/.`);
  }

  if ((await directoryExists(pageDir)) && !options.force) {
    throw new Error(`Page "${options.pageName}" already exists. Use --force to overwrite.`);
  }

  await mkdir(pageDir, { recursive: true });

  const files = buildPageFiles(options.pageName);
  const writtenFiles: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(pageDir, relativePath);
    await writeFile(absolutePath, content);
    writtenFiles.push(absolutePath);
  }

  return writtenFiles;
};
