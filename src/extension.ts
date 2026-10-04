import * as vscode from "vscode";
import { createActions, type DeckActions, registerCommands } from "./commands";
import { readDeckConfig, setPathGroupDepth, setSortMode } from "./config";
import { GitService } from "./services/gitService";
import { Scanner } from "./services/scannerService";
import { StateStore } from "./services/stateStoreService";
import { registerWatchers } from "./services/watcherService";
import { StatusBar } from "./statusBar";
import {
  type DashboardHandlers,
  DashboardViewProvider,
} from "./views/dashboardViewProvider";
import { ProjectTreeProvider } from "./views/projectTreeProvider";

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const store = new StateStore(context);
  const git = new GitService(readDeckConfig().concurrency);
  const scanner = new Scanner(store, git);
  const refresh = (force = false): Promise<void> =>
    scanner.refresh(force).then(
      () => undefined,
      (error) => {
        console.error("Project Deck scan failed", error);
      },
    );

  const actions: DeckActions = createActions({ scanner, store, refresh });
  registerCommands(context, actions);

  // Never block activation on the scan: the views register instantly and the
  // first result is pushed when it is ready.
  void refresh();

  const tree = new ProjectTreeProvider(scanner);
  const treeView = vscode.window.createTreeView("projectDeck.groups", {
    treeDataProvider: tree,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);
  const updateTreeMessage = (): void => {
    treeView.message = scanner.hasScanned()
      ? undefined
      : vscode.l10n.t("Scanning projects…");
  };
  scanner.onDidChange(updateTreeMessage);
  updateTreeMessage();

  const handlers: DashboardHandlers = {
    open: (id) => void actions.open(id),
    openInNewWindow: (id) => void actions.openInNewWindow(id),
    reveal: (id) => void actions.reveal(id),
    copyPath: (id) => void actions.copyPath(id),
    togglePin: (id) => void actions.togglePin(id),
    editTags: (id) => void actions.editTags(id),
    setSort: (sort) => {
      void setSortMode(sort);
    },
    setGroupDepth: (depth) => {
      void setPathGroupDepth(depth);
    },
    refresh: () => void actions.refresh(),
  };

  const dashboard = new DashboardViewProvider(
    context.extensionUri,
    scanner,
    store,
    handlers,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DashboardViewProvider.viewType,
      dashboard,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  const statusBar = new StatusBar();
  context.subscriptions.push(statusBar);
  const updateStatus = (): void => {
    statusBar.update(scanner.getViews(), readDeckConfig().statusBar);
  };
  scanner.onDidChange(updateStatus);
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(updateStatus),
  );

  context.subscriptions.push(registerWatchers(scanner, git));

  updateStatus();
}

export function deactivate(): void {
  // Disposables are released through the extension context.
}
