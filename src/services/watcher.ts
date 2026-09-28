import * as vscode from "vscode";
import { getConfig } from "../config";
import { hasMagic } from "../util/glob";
import type { GitService } from "./gitService";
import type { Scanner } from "./scanner";

export function registerWatchers(
  scanner: Scanner,
  git: GitService,
): vscode.Disposable {
  const disposables: vscode.Disposable[] = [];
  let watchers: vscode.FileSystemWatcher[] = [];

  const rebuild = (): void => {
    for (const watcher of watchers) {
      watcher.dispose();
    }
    watchers = [];

    const config = getConfig();
    for (const base of config.baseFolders) {
      if (!base || hasMagic(base)) {
        continue;
      }
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(vscode.Uri.file(base), "**/.git/HEAD"),
      );
      const fire = (): void => {
        git.invalidate();
        void scanner.refresh();
      };
      watcher.onDidChange(fire, undefined, disposables);
      watcher.onDidCreate(fire, undefined, disposables);
      watcher.onDidDelete(fire, undefined, disposables);
      watchers.push(watcher);
    }
  };

  rebuild();

  disposables.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("projectDeck")) {
        return;
      }
      git.invalidate();
      rebuild();
      void scanner.refresh();
    }),
  );

  disposables.push({
    dispose: () => {
      for (const watcher of watchers) {
        watcher.dispose();
      }
      watchers = [];
    },
  });

  return vscode.Disposable.from(...disposables);
}
