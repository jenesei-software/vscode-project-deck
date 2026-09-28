export type ProjectKind = "git" | "workspace" | "folder";

export type SortMode = "frecency" | "attention" | "name" | "path" | "recent";

export type GroupBy = "path" | "tag" | "org" | "none";

export interface LastCommit {
  hash: string;
  author: string;
  date: string;
  subject: string;
}

export interface GitStatus {
  branch: string;
  detached: boolean;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
  conflicted: number;
  upstream: string | null;
  lastCommit: LastCommit | null;
  remoteUrl: string | null;
  hostOrg: string | null;
}

export interface Project {
  id: string;
  name: string;
  rootPath: string;
  kind: ProjectKind;
  tags: string[];
  group?: string;
  pinned: boolean;
  favorite: boolean;
  createdAt: number;
}

export interface ProjectView extends Project {
  detected: boolean;
  git: GitStatus | null;
  frecency: number;
  lastOpenedAt: number;
}
