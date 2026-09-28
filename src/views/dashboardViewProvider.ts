import * as vscode from "vscode";
import { getConfig } from "../config";
import { groupProjects } from "../model/grouping";
import { sortProjects } from "../model/ranking";
import type { SortMode } from "../model/types";
import type { Scanner } from "../services/scanner";
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
  refresh(): void;
}

export class DashboardViewProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "projectDeck.dashboard";

  private view?: vscode.WebviewView;
  private ready = false;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly scanner: Scanner,
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
      groups: groups.map((group) => ({
        ...group,
        label: groupLabel(group.key),
      })),
      sort: config.sortList,
      showGitStatus: config.showGitStatus,
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

function buildStrings(): DashboardStrings {
  const t = vscode.l10n.t;
  return {
    searchPlaceholder: t("dashboard.searchPlaceholder"),
    empty: t("dashboard.empty"),
    noResults: t("dashboard.noResults"),
    sort: t("dashboard.sort"),
    sortFrecency: t("dashboard.sort.frecency"),
    sortAttention: t("dashboard.sort.attention"),
    sortName: t("dashboard.sort.name"),
    sortPath: t("dashboard.sort.path"),
    sortRecent: t("dashboard.sort.recent"),
    saved: t("dashboard.saved"),
    detected: t("dashboard.detected"),
    clean: t("dashboard.clean"),
    open: t("dashboard.action.open"),
    openNewWindow: t("dashboard.action.openNewWindow"),
    reveal: t("dashboard.action.reveal"),
    copyPath: t("dashboard.action.copyPath"),
    pin: t("dashboard.action.pin"),
    unpin: t("dashboard.action.unpin"),
    tags: t("dashboard.action.tags"),
  };
}
