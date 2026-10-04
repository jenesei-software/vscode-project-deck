import * as vscode from "vscode";
import { getConfig } from "../config";
import { groupProjects, sortGroups } from "../model/grouping";
import { sortProjects } from "../model/ranking";
import type { SortMode } from "../model/types";
import type { Scanner } from "../services/scanner";
import type { StateStore } from "../services/stateStore";
import { groupLabel } from "./groupLabel";
import {
  type DashboardState,
  type DashboardStrings,
  getDashboardHtml,
} from "./webview/dashboardHtml";

export interface DashboardHandlers {
  open(id: string): void;
  openInNewWindow(id: string): void;
  reveal(id: string): void;
  copyPath(id: string): void;
  togglePin(id: string): void;
  editTags(id: string): void;
  setSort(sort: SortMode): void;
  setGroupDepth(depth: number): void;
  refresh(): void;
}

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "projectDeck.dashboard";

  private view?: vscode.WebviewView;
  private ready = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly scanner: Scanner,
    private readonly store: StateStore,
    private readonly handlers: DashboardHandlers,
  ) {
    scanner.onDidChange(() => this.post());
  }

  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };
    view.webview.html = getDashboardHtml(view.webview, buildStrings());
    view.webview.onDidReceiveMessage((message: unknown) =>
      this.handleMessage(message),
    );
    view.onDidChangeVisibility(() => {
      if (view.visible) {
        this.post();
      }
    });
  }

  post(): void {
    if (!this.view || !this.ready) {
      return;
    }
    void this.view.webview.postMessage(this.buildState());
  }

  private buildState(): DashboardState {
    const config = getConfig();
    const sorted = sortProjects(this.scanner.getViews(), config.sortList);
    const groups = groupProjects(sorted, {
      groupBy: config.groupBy,
      baseFolders: config.baseFolders,
      pathGroupDepth: config.pathGroupDepth,
      multiTagGroups: config.multiTagGroups,
    });
    return {
      type: "state",
      groups: sortGroups(groups, config.sortList).map((group) => ({
        ...group,
        label: groupLabel(group.key),
      })),
      sort: config.sortList,
      pathGroupDepth: config.pathGroupDepth,
      showGitStatus: config.showGitStatus,
      collapseGroups: config.collapseGroups,
      collapsedGroups: this.store.getUi().collapsedGroups ?? {},
      loading: !this.scanner.hasScanned(),
      strings: buildStrings(),
    };
  }

  private handleMessage(message: unknown): void {
    if (!isRecord(message)) {
      return;
    }
    const type = typeof message.type === "string" ? message.type : "";

    if (type === "ready") {
      this.ready = true;
      this.post();
      return;
    }
    if (type === "refresh") {
      this.handlers.refresh();
      return;
    }
    if (type === "setSort" && typeof message.sort === "string") {
      this.handlers.setSort(message.sort as SortMode);
      return;
    }
    if (type === "setGroupDepth" && typeof message.depth === "number") {
      this.handlers.setGroupDepth(message.depth);
      return;
    }
    if (type === "setCollapsed" && isRecord(message.collapsed)) {
      void this.store.setUi({
        collapsedGroups: sanitizeCollapsed(message.collapsed),
      });
      return;
    }

    const id = typeof message.id === "string" ? message.id : "";
    if (!id) {
      return;
    }
    switch (type) {
      case "open":
        this.handlers.open(id);
        break;
      case "openNewWindow":
        this.handlers.openInNewWindow(id);
        break;
      case "reveal":
        this.handlers.reveal(id);
        break;
      case "copyPath":
        this.handlers.copyPath(id);
        break;
      case "togglePin":
        this.handlers.togglePin(id);
        break;
      case "editTags":
        this.handlers.editTags(id);
        break;
      default:
        break;
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeCollapsed(
  value: Record<string, unknown>,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const [key, collapsed] of Object.entries(value)) {
    if (typeof collapsed === "boolean") {
      result[key] = collapsed;
    }
  }
  return result;
}

function buildStrings(): DashboardStrings {
  const t = vscode.l10n.t;
  return {
    searchPlaceholder: t("Search projects"),
    empty: t("No projects yet. Add base folders in settings, then refresh."),
    noResults: t("No project matches your search."),
    loading: t("Scanning projects…"),
    sort: t("Sort"),
    sortFrecency: t("Frecency"),
    sortAttention: t("Needs attention"),
    sortName: t("Name"),
    sortPath: t("Path"),
    sortRecent: t("Recent"),
    sortTag: t("By tag"),
    groupDepth: t("Depth"),
    collapseAll: t("Collapse All"),
    expandAll: t("Expand All"),
    clean: t("Clean"),
    open: t("Open"),
    openNewWindow: t("Open in New Window"),
    reveal: t("Reveal"),
    copyPath: t("Copy Path"),
    pin: t("Pin"),
    unpin: t("Unpin"),
    tags: t("Tags"),
  };
}
