import * as vscode from "vscode";
import { createActions, type DeckActions, registerCommands } from "./commands";
import { getConfig, setSortMode } from "./config";
import { GitService } from "./services/gitService";
import { Scanner } from "./services/scanner";
import { StateStore } from "./services/stateStore";
import { registerWatchers } from "./services/watcher";
import { StatusBar } from "./statusBar";
import {
  type DashboardHandlers,
  DashboardViewProvider,
} from "./views/dashboardViewProvider";
import { ProjectTreeProvider } from "./views/treeProvider";

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const store = new StateStore(context);
  const git = new GitService(getConfig().concurrency);
  const scanner = new Scanner(store, git);
  const refresh = (): Promise<void> => scanner.refresh().then(() => undefined);

  const tree = new ProjectTreeProvider(scanner);
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider("projectDeck.groups", tree),
  );

  const actions: DeckActions = createActions({ scanner, store, refresh });
  registerCommands(context, actions);

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
    refresh: () => void actions.refresh(),
  };

  const dashboard = new DashboardViewProvider(
    context.extensionUri,
    scanner,
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
    statusBar.update(scanner.getViews(), getConfig().statusBar);
  };
  scanner.onDidChange(updateStatus);
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(updateStatus),
  );

  context.subscriptions.push(registerWatchers(scanner, git));

  // Never block activation on the scan: the views register instantly and the
  // first result is pushed when it is ready.
  void refresh();
  updateStatus();
}

export function deactivate(): void {
  // no-op
}
