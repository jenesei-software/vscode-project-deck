import * as vscode from "vscode";
import { getConfig } from "../config";
import { groupProjects } from "../model/grouping";
import { dirtyCount, sortProjects } from "../model/ranking";
import type { ProjectView } from "../model/types";
import type { Scanner } from "../services/scanner";
import { groupLabel } from "./groupLabel";

type ProjectNode = {
  type: "project";
  project: ProjectView;
};

type GroupNode = {
  type: "group";
  key: string;
  label: string;
  projects: ProjectView[];
};

export type DeckNode = ProjectNode | GroupNode;

export class ProjectTreeProvider implements vscode.TreeDataProvider<DeckNode> {
  private readonly emitter = new vscode.EventEmitter<DeckNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<DeckNode | undefined> =
    this.emitter.event;

  constructor(private readonly scanner: Scanner) {
    scanner.onDidChange(() => this.emitter.fire(undefined));
  }

  refresh(): void {
    this.emitter.fire(undefined);
  }

  getTreeItem(node: DeckNode): vscode.TreeItem {
    if (node.type === "group") {
      const item = new vscode.TreeItem(
        node.label,
        vscode.TreeItemCollapsibleState.Expanded,
      );
      item.contextValue = "projectDeck.group";
      item.description = String(node.projects.length);
      return item;
    }
    return projectItem(node.project);
  }

  getChildren(node?: DeckNode): DeckNode[] {
    const config = getConfig();
    const sorted = sortProjects(this.scanner.getViews(), config.sortList);

    if (!node) {
      if (config.groupBy === "none") {
        return sorted.map((project) => ({ type: "project", project }));
      }
      const groups = groupProjects(sorted, {
        groupBy: config.groupBy,
        baseFolders: config.baseFolders,
        pathGroupDepth: config.pathGroupDepth,
        multiTagGroups: config.multiTagGroups,
      });
      return groups.map((group) => ({
        type: "group",
        key: group.key,
        label: groupLabel(group.key),
        projects: group.projects,
      }));
    }

    if (node.type === "group") {
      return node.projects.map((project) => ({ type: "project", project }));
    }

    return [];
  }
}

function projectItem(project: ProjectView): vscode.TreeItem {
  const item = new vscode.TreeItem(
    project.name,
    vscode.TreeItemCollapsibleState.None,
  );
  item.contextValue = project.favorite
    ? "projectDeck.project.saved"
    : "projectDeck.project.detected";
  item.tooltip = new vscode.MarkdownString(project.rootPath);
  item.iconPath = new vscode.ThemeIcon(project.git ? "git-branch" : "folder");
  item.command = {
    command: "projectDeck.open",
    title: vscode.l10n.t("Open Project"),
    arguments: [project.id],
  };

  const parts: string[] = [];
  if (project.pinned) {
    parts.push("$(pin)");
  }
  if (project.git?.branch) {
    parts.push(project.git.branch);
  }
  const dirty = dirtyCount(project.git);
  if (dirty > 0) {
    parts.push(`●${dirty}`);
  }
  item.description = parts.join(" ");

  return item;
}
