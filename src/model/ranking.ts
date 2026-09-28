import type { GitStatus, ProjectView, SortMode } from "./types";

const DAY_MS = 86_400_000;

export function frecencyScore(
  openedAt: readonly number[],
  now: number,
): number {
  let score = 0;
  for (const at of openedAt) {
    const days = (now - at) / DAY_MS;
    if (days < 0) {
      continue;
    }
    if (days < 1) {
      score += 100;
    } else if (days < 7) {
      score += 50;
    } else if (days < 30) {
      score += 25;
    } else if (days < 90) {
      score += 10;
    }
  }
  return score;
}

export function dirtyCount(git: GitStatus | null): number {
  if (!git) {
    return 0;
  }
  return git.staged + git.modified + git.untracked + git.conflicted;
}

export function needsAttention(git: GitStatus | null): boolean {
  if (!git) {
    return false;
  }
  return git.ahead > 0 || git.behind > 0 || dirtyCount(git) > 0;
}

export function compareProjects(
  a: ProjectView,
  b: ProjectView,
  sort: SortMode,
): number {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }
  switch (sort) {
    case "name":
      return a.name.localeCompare(b.name);
    case "path":
      return a.rootPath.localeCompare(b.rootPath);
    case "recent":
      return b.lastOpenedAt - a.lastOpenedAt || a.name.localeCompare(b.name);
    case "attention": {
      const flagged =
        Number(needsAttention(b.git)) - Number(needsAttention(a.git));
      if (flagged !== 0) {
        return flagged;
      }
      const dirty = dirtyCount(b.git) - dirtyCount(a.git);
      if (dirty !== 0) {
        return dirty;
      }
      return b.frecency - a.frecency || a.name.localeCompare(b.name);
    }
    default:
      return b.frecency - a.frecency || a.name.localeCompare(b.name);
  }
}

export function sortProjects(
  projects: readonly ProjectView[],
  sort: SortMode,
): ProjectView[] {
  return [...projects].sort((a, b) => compareProjects(a, b, sort));
}
