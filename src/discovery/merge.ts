import type { Project } from "../model/types";
import { hashString } from "../util/hash";
import { isSubPath, pathKey } from "../util/path";
import type { DiscoveredProject } from "./locator";

export interface MergedProject extends Project {
  detected: boolean;
}

export function dedupeNested(
  projects: readonly DiscoveredProject[],
): DiscoveredProject[] {
  const sorted = [...projects].sort(
    (a, b) => a.rootPath.length - b.rootPath.length,
  );
  const kept: DiscoveredProject[] = [];
  for (const project of sorted) {
    if (
      kept.some((candidate) => isSubPath(candidate.rootPath, project.rootPath))
    ) {
      continue;
    }
    kept.push(project);
  }
  return kept;
}

export function idFromPath(rootPath: string): string {
  return `p_${hashString(pathKey(rootPath))}`;
}

export function mergeSources(
  saved: readonly Project[],
  discovered: readonly DiscoveredProject[],
): MergedProject[] {
  const result: MergedProject[] = [];
  const seen = new Set<string>();

  for (const project of saved) {
    result.push({ ...project, detected: false });
    seen.add(pathKey(project.rootPath));
  }

  for (const project of dedupeNested(discovered)) {
    const key = pathKey(project.rootPath);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({
      id: idFromPath(project.rootPath),
      name: project.name,
      rootPath: project.rootPath,
      kind: project.kind,
      tags: [],
      pinned: false,
      favorite: false,
      createdAt: 0,
      detected: true,
    });
  }

  return result;
}
