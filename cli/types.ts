export interface CreateProjectOptions {
  targetDir: string;
  projectName: string;
  port: number;
  force: boolean;
}

export interface AddPageOptions {
  pageName: string;
  force: boolean;
}

export interface ParsedCliArgs {
  command: 'new' | 'help' | 'add' | 'version';
  targetDir: string;
  port: number;
  force: boolean;
  pageName: string;
}

export type ScaffoldFileContent = string | Uint8Array;
