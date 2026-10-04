import { homedir } from "node:os";
import * as vscode from "vscode";
import { readDeckConfig } from "../config";
import { type DiscoveredProject, locateProjects } from "../discovery/locator";
import { mergeSources } from "../discovery/merge";
import { frecencyScore } from "../model/ranking";
import type { GitStatus, ProjectView } from "../model/types";
import type { GitService } from "./gitService";
import type { StateStore } from "./stateStoreService";

export class Scanner {
  private views: ProjectView[] = [];
  private discovered: DiscoveredProject[] = [];
  private readonly emitter = new vscode.EventEmitter<ProjectView[]>();
  readonly onDidChange: vscode.Event<ProjectView[]> = this.emitter.event;
  private scanning = false;
  private pending = false;
  private scanned = false;

  constructor(
    private readonly store: StateStore,
    private readonly git: GitService,
  ) {}

  getViews(): ProjectView[] {
    return this.views;
  }

  isScanning(): boolean {
    return this.scanning;
  }

  hasScanned(): boolean {
    return this.scanned;
  }

  find(id: string): ProjectView | undefined {
    return this.views.find((view) => view.id === id);
  }

  async refresh(force = false): Promise<ProjectView[]> {
    if (this.scanning) {
      this.pending = true;
      return this.views;
    }
    this.scanning = true;
    try {
      const config = readDeckConfig();
      this.git.setConcurrency(config.concurrency);
      if (force) {
        this.git.invalidate();
      }

      const discovered =
        config.baseFolders.length > 0
          ? await locateProjects({
              baseFolders: config.baseFolders,
              ignoredFolders: config.ignoredFolders,
              maxDepth: config.maxDepthRecursion,
              home: homedir(),
            })
          : [];

      this.discovered = discovered;
      this.scanned = true;

      const merged = mergeSources(this.store.getProjects(), discovered);
      const frecency = this.store.getFrecency();
      const now = Date.now();
      const build = (statuses: Map<string, GitStatus | null>): ProjectView[] =>
        merged.map((project) => {
          const opens = frecency[project.id] ?? [];
          return {
            ...project,
            git: statuses.get(project.rootPath) ?? null,
            frecency: frecencyScore(opens, now),
            lastOpenedAt: opens.length > 0 ? Math.max(...opens) : 0,
          };
        });

      // Publish discovered projects immediately so the views fill fast, then
      // refine them with Git status once it is ready.
      this.views = build(new Map());
      this.emitter.fire(this.views);

      if (config.showGitStatus) {
        const statuses = new Map<string, GitStatus | null>();
        let lastFire = 0;
        await this.git.getStatuses(
          merged.map((project) => project.rootPath),
          (rootPath, status) => {
            statuses.set(rootPath, status);
            const now = Date.now();
            if (now - lastFire < 150) {
              return;
            }
            lastFire = now;
            this.views = build(statuses);
            this.emitter.fire(this.views);
          },
        );
        this.git.retain(merged.map((project) => project.rootPath));
        this.views = build(statuses);
        this.emitter.fire(this.views);
      }

      return this.views;
    } catch (error) {
      this.scanned = true;
      this.emitter.fire(this.views);
      throw error;
    } finally {
      this.scanning = false;
      if (this.pending) {
        this.pending = false;
        void this.refresh();
      }
    }
  }

  softRefresh(): void {
    if (!this.scanned) {
      void this.refresh();
      return;
    }
    const merged = mergeSources(this.store.getProjects(), this.discovered);
    const previous = new Map(this.views.map((view) => [view.id, view]));
    const frecency = this.store.getFrecency();
    const now = Date.now();
    this.views = merged.map((project) => {
      const before = previous.get(project.id);
      const opens = frecency[project.id] ?? [];
      return {
        ...project,
        git: before?.git ?? null,
        frecency: frecencyScore(opens, now),
        lastOpenedAt: opens.length > 0 ? Math.max(...opens) : 0,
      };
    });
    this.emitter.fire(this.views);
  }
}
