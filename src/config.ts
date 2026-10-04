import * as vscode from "vscode";
import type { GroupBy, SortMode } from "./model/types";

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

export function getConfig(): DeckConfig {
  const config = vscode.workspace.getConfiguration("projectDeck");
  return {
    baseFolders: config.get<string[]>("baseFolders", []),
    ignoredFolders: config.get<string[]>("ignoredFolders", []),
    maxDepthRecursion: config.get<number>("maxDepthRecursion", 3),
    groupBy: config.get<GroupBy>("groupBy", "path"),
    pathGroupDepth: config.get<number>("pathGroupDepth", 1),
    multiTagGroups: config.get<boolean>("multiTagGroups", true),
    sortList: config.get<SortMode>("sortList", "frecency"),
    showGitStatus: config.get<boolean>("showGitStatus", true),
    collapseGroups: config.get<boolean>("collapseGroups", false),
    concurrency: config.get<number>("concurrency", 12),
    openInNewWindow: config.get<boolean>("openInNewWindow", true),
    statusBar: config.get<boolean>("statusBar", true),
  };
}

export async function setSortMode(sort: SortMode): Promise<void> {
  await vscode.workspace
    .getConfiguration("projectDeck")
    .update("sortList", sort, vscode.ConfigurationTarget.Global);
}

export async function setPathGroupDepth(depth: number): Promise<void> {
  const value = Math.max(0, Math.min(10, Math.floor(depth)));
  await vscode.workspace
    .getConfiguration("projectDeck")
    .update("pathGroupDepth", value, vscode.ConfigurationTarget.Global);
}
