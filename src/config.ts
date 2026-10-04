import * as vscode from "vscode";
import type { GroupBy, SortMode } from "./model/types";

export const CONFIG_SECTION = "projectDeck";

export const KEYS = {
  baseFolders: "baseFolders",
  ignoredFolders: "ignoredFolders",
  maxDepthRecursion: "maxDepthRecursion",
  groupBy: "groupBy",
  pathGroupDepth: "pathGroupDepth",
  multiTagGroups: "multiTagGroups",
  sortList: "sortList",
  showGitStatus: "showGitStatus",
  collapseGroups: "collapseGroups",
  concurrency: "concurrency",
  openInNewWindow: "openInNewWindow",
  statusBar: "statusBar",
} as const;

export interface DeckConfig {
  baseFolders: string[];
  ignoredFolders: string[];
  maxDepthRecursion: number;
  groupBy: GroupBy;
  pathGroupDepth: number;
  multiTagGroups: boolean;
  sortList: SortMode;
  showGitStatus: boolean;
  collapseGroups: boolean;
  concurrency: number;
  openInNewWindow: boolean;
  statusBar: boolean;
}

export function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

export function readDeckConfig(): DeckConfig {
  const config = getConfig();
  return {
    baseFolders: config.get<string[]>(KEYS.baseFolders, []),
    ignoredFolders: config.get<string[]>(KEYS.ignoredFolders, []),
    maxDepthRecursion: config.get<number>(KEYS.maxDepthRecursion, 3),
    groupBy: config.get<GroupBy>(KEYS.groupBy, "path"),
    pathGroupDepth: config.get<number>(KEYS.pathGroupDepth, 1),
    multiTagGroups: config.get<boolean>(KEYS.multiTagGroups, true),
    sortList: config.get<SortMode>(KEYS.sortList, "frecency"),
    showGitStatus: config.get<boolean>(KEYS.showGitStatus, true),
    collapseGroups: config.get<boolean>(KEYS.collapseGroups, false),
    concurrency: config.get<number>(KEYS.concurrency, 12),
    openInNewWindow: config.get<boolean>(KEYS.openInNewWindow, true),
    statusBar: config.get<boolean>(KEYS.statusBar, true),
  };
}

export async function setSortMode(sort: SortMode): Promise<void> {
  await getConfig().update(
    KEYS.sortList,
    sort,
    vscode.ConfigurationTarget.Global,
  );
}

export async function setPathGroupDepth(depth: number): Promise<void> {
  const value = Math.max(0, Math.min(10, Math.floor(depth)));
  await getConfig().update(
    KEYS.pathGroupDepth,
    value,
    vscode.ConfigurationTarget.Global,
  );
}
