import * as vscode from "vscode";
import type { ProjectView } from "./model/types";

export class StatusBar {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      50,
    );
    this.item.command = "projectDeck.switch";
  }

  update(views: ProjectView[], enabled: boolean): void {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!enabled || !folder) {
      this.item.hide();
      return;
    }

    const current = views.find((view) => view.rootPath === folder.uri.fsPath);
    const name = current?.name ?? folder.name;
    const branch = current?.git?.branch
      ? `$(git-branch) ${current.git.branch}`
      : "";
    const dirty =
      current?.git && hasChanges(current) ? " $(circle-filled)" : "";

    this.item.text = `$(folder) ${name} ${branch}${dirty}`
      .replace(/\s+/g, " ")
      .trim();
    this.item.tooltip = vscode.l10n.t("Switch project");
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}

function hasChanges(view: ProjectView): boolean {
  const git = view.git;
  if (!git) {
    return false;
  }
  return git.staged + git.modified + git.untracked + git.conflicted > 0;
}
