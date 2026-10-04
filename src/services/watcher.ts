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
      const fire = (uri: vscode.Uri): void => {
        const root = repoRootFromHead(uri.fsPath);
        git.invalidate(root);
        void scanner.refresh();
      };
      watcher.onDidChange(fire, undefined, disposables);
      watcher.onDidCreate(fire, undefined, disposables);
      watcher.onDidDelete(fire, undefined, disposables);
      watchers.push(watcher);
    }
  };

  rebuild();

  const discoveryKeys = [
    "baseFolders",
    "ignoredFolders",
    "maxDepthRecursion",
    "concurrency",
    "showGitStatus",
  ];

  disposables.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("projectDeck")) {
        return;
      }
      if (event.affectsConfiguration("projectDeck.baseFolders")) {
        rebuild();
      }
      const needsScan = discoveryKeys.some((key) =>
        event.affectsConfiguration(`projectDeck.${key}`),
      );
      if (needsScan) {
        git.invalidate();
        void scanner.refresh();
      } else {
        scanner.softRefresh();
      }
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

function repoRootFromHead(fsPath: string): string | undefined {
  const marker = "/.git/HEAD";
  const index = fsPath.replace(/\\/g, "/").lastIndexOf(marker);
  return index > 0 ? fsPath.slice(0, index) : undefined;
}
