import { baseName, isSubPath, parentDir, relativeSegments } from "../util/path";
import { compareProjects } from "./ranking";
import type { GroupBy, ProjectView, SortMode } from "./types";

export const ALL_KEY = "__all__";
export const UNTAGGED_KEY = "__untagged__";
export const LOCAL_KEY = "__local__";

export interface ProjectGroup {
  key: string;
  label: string;
  projects: ProjectView[];
}

export interface GroupOptions {
  groupBy: GroupBy;
  baseFolders: readonly string[];
  pathGroupDepth: number;
  multiTagGroups: boolean;
}

export function pathGroupFor(
  rootPath: string,
  baseFolders: readonly string[],
  depth: number,
): string {
  let best: string | null = null;
  for (const base of baseFolders) {
    if (!base || !isSubPath(base, rootPath)) {
      continue;
    }
    if (best === null || base.length > best.length) {
      best = base;
    }
  }

  if (best) {
    const base = baseName(best) || "Projects";
    if (depth <= 0) {
      return base;
    }
    const segments = relativeSegments(best, rootPath);
    const parents = segments.slice(0, -1);
    if (parents.length === 0) {
      return base;
    }
    const index = Math.min(depth, parents.length) - 1;
    return parents[index] || base;
  }

  return baseName(parentDir(rootPath)) || baseName(rootPath) || "Projects";
}

export function groupProjects(
  projects: readonly ProjectView[],
  options: GroupOptions,
): ProjectGroup[] {
  if (options.groupBy === "none") {
    return [{ key: ALL_KEY, label: "", projects: [...projects] }];
  }

  const buckets = new Map<string, ProjectView[]>();
  const push = (key: string, project: ProjectView): void => {
    const list = buckets.get(key);
    if (list) {
      list.push(project);
    } else {
      buckets.set(key, [project]);
    }
  };

  for (const project of projects) {
    if (options.groupBy === "path") {
      push(
        pathGroupFor(
          project.rootPath,
          options.baseFolders,
          options.pathGroupDepth,
        ),
        project,
      );
    } else if (options.groupBy === "org") {
      push(project.git?.hostOrg ?? LOCAL_KEY, project);
    } else if (project.tags.length === 0) {
      push(UNTAGGED_KEY, project);
    } else {
      const tags = options.multiTagGroups ? project.tags : [project.tags[0]];
      for (const tag of tags) {
        push(tag, project);
      }
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, list]) => ({ key, label: key, projects: list }));
}

export function sortGroups(
  groups: readonly ProjectGroup[],
  sort: SortMode,
): ProjectGroup[] {
  return [...groups].sort((a, b) => {
    const first = a.projects[0];
    const second = b.projects[0];
    if (first && second) {
      const compared = compareProjects(first, second, sort);
      if (compared !== 0) {
        return compared;
      }
    }
    return a.key.localeCompare(b.key);
  });
}
