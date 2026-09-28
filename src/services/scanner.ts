import { homedir } from "node:os";
import * as vscode from "vscode";
import { getConfig } from "../config";
import { locateProjects } from "../discovery/locator";
import { mergeSources } from "../discovery/merge";
import { frecencyScore } from "../model/ranking";
import type { GitStatus, ProjectView } from "../model/types";
import type { GitService } from "./gitService";
import type { StateStore } from "./stateStore";

export class Scanner {
  private views: ProjectView[] = [];
  private readonly emitter = new vscode.EventEmitter<ProjectView[]>();
  readonly onDidChange: vscode.Event<ProjectView[]> = this.emitter.event;
  private scanning = false;

  constructor(
    private readonly store: StateStore,
    private readonly git: GitService,
  ) {}

  getViews(): ProjectView[] {
    return this.views;
  }

  find(id: string): ProjectView | undefined {
    return this.views.find((view) => view.id === id);
  }

  async refresh(): Promise<ProjectView[]> {
    if (this.scanning) {
      return this.views;
    }
    this.scanning = true;
    try {
      const config = getConfig();
      this.git.setConcurrency(config.concurrency);
      this.git.invalidate();

      const discovered =
        config.baseFolders.length > 0
          ? await locateProjects({
              baseFolders: config.baseFolders,
              ignoredFolders: config.ignoredFolders,
              maxDepth: config.maxDepthRecursion,
              home: homedir(),
            })
          : [];

      const merged = mergeSources(this.store.getProjects(), discovered);

      let statuses = new Map<string, GitStatus | null>();
      if (config.showGitStatus) {
        statuses = await this.git.getStatuses(
          merged.map((project) => project.rootPath),
        );
      }

      const frecency = this.store.getFrecency();
      const now = Date.now();
      this.views = merged.map((project) => {
        const opens = frecency[project.id] ?? [];
        return {
          ...project,
          git: statuses.get(project.rootPath) ?? null,
          frecency: frecencyScore(opens, now),
          lastOpenedAt: opens.length > 0 ? Math.max(...opens) : 0,
        };
      });

      this.emitter.fire(this.views);
      return this.views;
    } finally {
      this.scanning = false;
    }
  }
}
