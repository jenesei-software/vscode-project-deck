import type * as vscode from "vscode";
import type { Project } from "../model/types";

const PROJECTS_KEY = "projectDeck.projects";
const FRECENCY_KEY = "projectDeck.frecency";
const UI_KEY = "projectDeck.ui";
const SYNC_KEYS = [PROJECTS_KEY, FRECENCY_KEY, UI_KEY];
const MAX_OPENS = 50;

export interface UiState {
  query?: string;
  collapsedGroups?: Record<string, boolean>;
}

export class StateStore {
  constructor(private readonly context: vscode.ExtensionContext) {
    context.globalState.setKeysForSync(SYNC_KEYS);
  }

  getProjects(): Project[] {
    return this.context.globalState.get<Project[]>(PROJECTS_KEY, []);
  }

  async setProjects(projects: Project[]): Promise<void> {
    await this.context.globalState.update(PROJECTS_KEY, projects);
  }

  async upsertProject(project: Project): Promise<void> {
    const projects = this.getProjects();
    const index = projects.findIndex(
      (candidate) => candidate.id === project.id,
    );
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    await this.setProjects(projects);
  }

  async removeProject(id: string): Promise<void> {
    const projects = this.getProjects().filter((project) => project.id !== id);
    await this.setProjects(projects);
  }

  getFrecency(): Record<string, number[]> {
    return this.context.globalState.get<Record<string, number[]>>(
      FRECENCY_KEY,
      {},
    );
  }

  async recordOpen(id: string, at = Date.now()): Promise<void> {
    const frecency = this.getFrecency();
    const opens = frecency[id] ?? [];
    opens.push(at);
    frecency[id] = opens.slice(-MAX_OPENS);
    await this.context.globalState.update(FRECENCY_KEY, frecency);
  }

  getUi(): UiState {
    return this.context.globalState.get<UiState>(UI_KEY, {});
  }

  async setUi(patch: Partial<UiState>): Promise<void> {
    await this.context.globalState.update(UI_KEY, {
      ...this.getUi(),
      ...patch,
    });
  }
}
