import { basename, dirname, join, resolve } from '@std/path';

import { buildPageFiles, buildScaffoldFiles } from './templates.ts';
import type { AddPageOptions, CreateProjectOptions } from './types.ts';

export { buildPageFiles, buildScaffoldFiles } from './templates.ts';
export type { AddPageOptions, CreateProjectOptions, ParsedCliArgs, ScaffoldFileContent } from './types.ts';
export { getHelpText, getVersion, parseCliArgs } from './parser.ts';

const isDirectoryEmpty = async (directory: string): Promise<boolean> => {
  try {
    for await (const _entry of Deno.readDir(directory)) {
      return false;
    }
    return true;
  } catch (_error) {
    return true;
  }
};

const ensureTargetDir = async (targetDir: string, force: boolean): Promise<void> => {
  const hasDirectory = await isDirectoryEmpty(targetDir);

  if (!hasDirectory && !force) {
    throw new Error('Target directory is not empty. Use --force to continue.');
  }

  await Deno.mkdir(targetDir, { recursive: true });
};

const directoryExists = async (path: string): Promise<boolean> => {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
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
    await Deno.mkdir(dirname(absolutePath), { recursive: true });
    if (content instanceof Uint8Array) {
      await Deno.writeFile(absolutePath, content);
    } else {
      await Deno.writeTextFile(absolutePath, content);
    }
    writtenFiles.push(absolutePath);
  }

  return writtenFiles;
};

export const addPage = async (options: AddPageOptions): Promise<string[]> => {
  const publicDir = resolve('public');

  if (!(await directoryExists(publicDir))) {
    throw new Error('No public/ directory found. Are you in an alpine-server project?');
  }

  const pageDir = join(publicDir, options.pageName);

  if ((await directoryExists(pageDir)) && !options.force) {
    throw new Error(`Page "${options.pageName}" already exists. Use --force to overwrite.`);
  }

  await Deno.mkdir(pageDir, { recursive: true });

  const files = buildPageFiles(options.pageName);
  const writtenFiles: string[] = [];

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(pageDir, relativePath);
    await Deno.writeTextFile(absolutePath, content);
    writtenFiles.push(absolutePath);
  }

  return writtenFiles;
};
