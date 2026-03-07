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

export interface HelpArgs {
  command: 'help';
}

export interface VersionArgs {
  command: 'version';
}

export interface NewArgs {
  command: 'new';
  targetDir: string;
  port: number;
  force: boolean;
}

export interface AddArgs {
  command: 'add';
  pageName: string;
  force: boolean;
}

export type ParsedCliArgs = HelpArgs | VersionArgs | NewArgs | AddArgs;

export type ScaffoldFileContent = string | Uint8Array;
