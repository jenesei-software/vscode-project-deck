import { homedir } from "node:os";
import * as vscode from "vscode";
import { getConfig } from "./config";
import { idFromPath } from "./discovery/merge";
import {
  type ImportedProject,
  readProjectManagerProjects,
} from "./discovery/pmImport";
import { dirtyCount, sortProjects } from "./model/ranking";
import type { Project, ProjectView } from "./model/types";
import type { Scanner } from "./services/scanner";
import type { StateStore } from "./services/stateStore";
import { pathExists } from "./util/fs";
import { joinPath, pathKey } from "./util/path";

export interface ActionDeps {
  scanner: Scanner;
  store: StateStore;
  refresh: () => Promise<void>;
}

export interface DeckActions {
  open(id?: string): Promise<void>;
  openInNewWindow(id?: string): Promise<void>;
  switchProject(): Promise<void>;
  saveCurrent(): Promise<void>;
  removeProject(id?: string): Promise<void>;
  togglePin(id?: string): Promise<void>;
  editTags(id?: string): Promise<void>;
  refresh(): Promise<void>;
  reveal(id?: string): Promise<void>;
  copyPath(id?: string): Promise<void>;
  importProjects(): Promise<void>;
  exportProjects(): Promise<void>;
}

interface ProjectPick extends vscode.QuickPickItem {
  id: string;
}

function t(message: string, ...args: Array<string | number>): string {
  return vscode.l10n.t(message, ...args);
}

export function createActions(deps: ActionDeps): DeckActions {
  const openProject = async (
    project: ProjectView,
    forceNewWindow: boolean,
  ): Promise<void> => {
    if (!(await pathExists(project.rootPath))) {
      void vscode.window.showErrorMessage(
        t("Project path is missing: {0}", project.rootPath),
      );
      return;
    }
    await deps.store.recordOpen(project.id);
    await vscode.commands.executeCommand(
      "vscode.openFolder",
      vscode.Uri.file(project.rootPath),
      { forceNewWindow },
    );
  };

  const resolve = async (
    id: string | undefined,
    placeHolder: string,
  ): Promise<ProjectView | undefined> => {
    if (id) {
      const found = deps.scanner.find(id);
      if (found) {
        return found;
      }
    }
    return pickProject(deps, placeHolder);
  };

  return {
    open: async (id) => {
      const project = await resolve(id, t("Pick a project"));
      if (project) {
        await openProject(project, false);
      }
    },
    openInNewWindow: async (id) => {
      const project = await resolve(id, t("Pick a project"));
      if (project) {
        await openProject(project, true);
      }
    },
    switchProject: async () => {
      const config = getConfig();
      const views = sortProjects(deps.scanner.getViews(), "frecency");
      if (views.length === 0) {
        void vscode.window.showInformationMessage(
          t("No projects yet. Add base folders in settings, then refresh."),
        );
        return;
      }
      const items: ProjectPick[] = views.map((project) => ({
        label: project.name,
        description: describe(project),
        detail: project.rootPath,
        id: project.id,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: t("Pick a project"),
        matchOnDetail: true,
      });
      if (!picked) {
        return;
      }
      const project = deps.scanner.find(picked.id);
      if (project) {
        await openProject(project, config.openInNewWindow);
      }
    },
    saveCurrent: async () => {
      const folder = vscode.workspace.workspaceFolders?.[0];
      if (!folder) {
        return;
      }
      const rootPath = folder.uri.fsPath;
      const stored = deps.store.getProjects();
      const existing = stored.find(
        (project) => pathKey(project.rootPath) === pathKey(rootPath),
      );
      const name = await vscode.window.showInputBox({
        prompt: t("Project name"),
        value: existing?.name ?? folder.name,
      });
      if (!name) {
        return;
      }
      await deps.store.upsertProject({
        id: existing?.id ?? idFromPath(rootPath),
        name,
        rootPath,
        kind: existing?.kind ?? "git",
        tags: existing?.tags ?? [],
        pinned: existing?.pinned ?? false,
        favorite: true,
        createdAt: existing?.createdAt ?? Date.now(),
      });
      deps.scanner.softRefresh();
    },
    removeProject: async (id) => {
      let project = id ? deps.scanner.find(id) : undefined;
      if (!project) {
        const saved = deps.scanner
          .getViews()
          .filter((candidate) => candidate.favorite);
        project = await pickProject(deps, t("Pick a project to remove"), saved);
      }
      if (!project) {
        return;
      }
      await deps.store.removeProject(project.id);
      deps.scanner.softRefresh();
    },
    togglePin: async (id) => {
      const project = await resolve(id, t("Pick a project to pin or unpin"));
      if (!project) {
        return;
      }
      const existing = deps.store
        .getProjects()
        .find((candidate) => candidate.id === project.id);
      if (existing) {
        await deps.store.upsertProject({
          ...existing,
          pinned: !existing.pinned,
        });
      } else {
        await deps.store.upsertProject(toSaved(project, true, true));
      }
      deps.scanner.softRefresh();
    },
    editTags: async (id) => {
      const project = await resolve(id, t("Pick a project to tag"));
      if (!project) {
        return;
      }
      const config = getConfig();
      const value = await vscode.window.showInputBox({
        prompt: t("Tags (comma separated)"),
        value: project.tags.join(", "),
        placeHolder: config.tags.join(", "),
      });
      if (value === undefined) {
        return;
      }
      const tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      const existing = deps.store
        .getProjects()
        .find((candidate) => candidate.id === project.id);
      const base = existing ?? toSaved(project, true, project.pinned);
      await deps.store.upsertProject({ ...base, tags });
      deps.scanner.softRefresh();
    },
    refresh: async () => {
      await deps.refresh();
    },
    reveal: async (id) => {
      const project = await resolve(id, t("Pick a project"));
      if (project) {
        await vscode.commands.executeCommand(
          "revealFileInOS",
          vscode.Uri.file(project.rootPath),
        );
      }
    },
    copyPath: async (id) => {
      const project = await resolve(id, t("Pick a project"));
      if (project) {
        await vscode.env.clipboard.writeText(project.rootPath);
      }
    },
    importProjects: async () => {
      const file = await pickProjectManagerFile();
      if (!file) {
        return;
      }
      const imported = await readProjectManagerProjects(file);
      if (imported.length === 0) {
        void vscode.window.showInformationMessage(
          t("No projects found in the selected file."),
        );
        return;
      }
      const saved = deps.store.getProjects();
      const known = new Set(saved.map((project) => pathKey(project.rootPath)));
      let added = 0;
      for (const item of imported) {
        const key = pathKey(item.rootPath);
        if (known.has(key)) {
          continue;
        }
        known.add(key);
        saved.push(toImported(item));
        added++;
      }
      await deps.store.setProjects(saved);
      await deps.refresh();
      void vscode.window.showInformationMessage(
        t("Imported {0} project(s) from Project Manager.", added),
      );
    },
    exportProjects: async () => {
      const target = await vscode.window.showSaveDialog({
        title: t("Save Project Deck projects"),
        defaultUri: vscode.Uri.file(joinPath(homedir(), "project-deck.json")),
        filters: { JSON: ["json"] },
      });
      if (!target) {
        return;
      }
      const projects = deps.store.getProjects();
      await vscode.workspace.fs.writeFile(
        target,
        Buffer.from(JSON.stringify(projects, null, 2), "utf8"),
      );
      void vscode.window.showInformationMessage(
        t("Exported {0} project(s).", projects.length),
      );
    },
  };
}

export function registerCommands(
  context: vscode.ExtensionContext,
  actions: DeckActions,
): void {
  const register = (
    command: string,
    handler: (arg?: string) => unknown,
  ): void => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, (arg?: unknown) => {
        const id = typeof arg === "string" ? arg : undefined;
        return handler(id);
      }),
    );
  };

  register("projectDeck.open", (id) => actions.open(id));
  register("projectDeck.openInNewWindow", (id) => actions.openInNewWindow(id));
  register("projectDeck.switch", () => actions.switchProject());
  register("projectDeck.saveCurrent", () => actions.saveCurrent());
  register("projectDeck.removeProject", (id) => actions.removeProject(id));
  register("projectDeck.togglePin", (id) => actions.togglePin(id));
  register("projectDeck.pin", (id) => actions.togglePin(id));
  register("projectDeck.unpin", (id) => actions.togglePin(id));
  register("projectDeck.editTags", (id) => actions.editTags(id));
  register("projectDeck.refresh", () => actions.refresh());
  register("projectDeck.reveal", (id) => actions.reveal(id));
  register("projectDeck.copyPath", (id) => actions.copyPath(id));
  register("projectDeck.importFromProjectManager", () =>
    actions.importProjects(),
  );
  register("projectDeck.exportJson", () => actions.exportProjects());
  register("projectDeck.openSettings", () =>
    vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "projectDeck",
    ),
  );
}

async function pickProject(
  deps: ActionDeps,
  placeHolder: string,
  source?: readonly ProjectView[],
): Promise<ProjectView | undefined> {
  const views = source ?? sortProjects(deps.scanner.getViews(), "frecency");
  if (views.length === 0) {
    void vscode.window.showInformationMessage(
      t("No projects yet. Add base folders in settings, then refresh."),
    );
    return undefined;
  }
  const items: ProjectPick[] = views.map((project) => ({
    label: project.name,
    description: describe(project),
    detail: project.rootPath,
    id: project.id,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    placeHolder,
    matchOnDetail: true,
  });
  return picked ? deps.scanner.find(picked.id) : undefined;
}

function describe(project: ProjectView): string {
  const parts: string[] = [];
  if (project.tags.length > 0) {
    parts.push(project.tags.join(", "));
  }
  if (project.git?.branch) {
    parts.push(project.git.branch);
  }
  if (project.git && (project.git.ahead > 0 || project.git.behind > 0)) {
    parts.push(`↑${project.git.ahead} ↓${project.git.behind}`);
  }
  const dirty = dirtyCount(project.git);
  if (dirty > 0) {
    parts.push(`● ${dirty}`);
  }
  return parts.join("  ");
}

function toSaved(
  project: ProjectView,
  favorite: boolean,
  pinned: boolean,
): Project {
  return {
    id: project.id,
    name: project.name,
    rootPath: project.rootPath,
    kind: project.kind,
    tags: project.tags,
    group: project.group,
    pinned,
    favorite,
    createdAt: project.createdAt || Date.now(),
  };
}

function toImported(item: ImportedProject): Project {
  return {
    id: idFromPath(item.rootPath),
    name: item.name,
    rootPath: item.rootPath,
    kind: "git",
    tags: item.tags,
    pinned: false,
    favorite: true,
    createdAt: Date.now(),
  };
}

function projectManagerCandidates(): string[] {
  const candidates: string[] = [];
  const appData = process.env.APPDATA;
  if (appData) {
    candidates.push(
      joinPath(
        appData,
        "Code",
        "User",
        "globalStorage",
        "alefragnani.project-manager",
        "projects.json",
      ),
    );
  }
  const home = homedir();
  candidates.push(
    joinPath(
      home,
      ".config",
      "Code",
      "User",
      "globalStorage",
      "alefragnani.project-manager",
      "projects.json",
    ),
    joinPath(home, ".vscode", "projects.json"),
  );
  return candidates;
}

async function pickProjectManagerFile(): Promise<string | undefined> {
  for (const candidate of projectManagerCandidates()) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    title: t("Select the Project Manager projects.json file"),
    filters: { JSON: ["json"] },
  });
  return picked?.[0]?.fsPath;
}
