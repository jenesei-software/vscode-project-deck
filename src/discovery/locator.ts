import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { ProjectKind } from "../model/types";
import { pathExists } from "../util/fs";
import { globToRegExp, hasMagic, isIgnored } from "../util/glob";
import { expandHome, normalize } from "../util/path";

export interface DiscoveredProject {
  name: string;
  rootPath: string;
  kind: ProjectKind;
}

export interface LocateOptions {
  baseFolders: readonly string[];
  ignoredFolders: readonly string[];
  maxDepth: number;
  home: string;
}

export async function locateProjects(
  options: LocateOptions,
): Promise<DiscoveredProject[]> {
  const found = new Map<string, DiscoveredProject>();

  for (const raw of options.baseFolders) {
    const base = normalize(expandHome(raw.trim(), options.home));
    if (!base) {
      continue;
    }
    const root = hasMagic(base) ? staticPrefix(base) : base;
    const matcher = hasMagic(base) ? globToRegExp(base) : null;
    if (!root || !(await pathExists(root))) {
      continue;
    }
    await walk(root, 0, matcher, options, found);
  }

  return [...found.values()];
}

async function walk(
  dir: string,
  depth: number,
  matcher: RegExp | null,
  options: LocateOptions,
  found: Map<string, DiscoveredProject>,
): Promise<void> {
  const kind = await markerKind(dir);
  if (kind && (matcher === null || matcher.test(normalize(dir)))) {
    if (!found.has(dir)) {
      found.set(dir, {
        name: path.basename(dir),
        rootPath: dir,
        kind,
      });
    }
    return;
  }

  if (depth >= options.maxDepth) {
    return;
  }

  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => []);

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) {
      continue;
    }
    if (entry.name.startsWith(".")) {
      continue;
    }
    if (isIgnored(entry.name, options.ignoredFolders)) {
      continue;
    }
    await walk(path.join(dir, entry.name), depth + 1, matcher, options, found);
  }
}

async function markerKind(dir: string): Promise<ProjectKind | null> {
  if (await pathExists(path.join(dir, ".git"))) {
    return "git";
  }
  const entries = await fs
    .readdir(dir, { withFileTypes: true })
    .catch(() => []);
  if (
    entries.some(
      (entry) => entry.isFile() && entry.name.endsWith(".code-workspace"),
    )
  ) {
    return "workspace";
  }
  return null;
}

function staticPrefix(pattern: string): string {
  const segments = pattern.split(/[\\/]/);
  const plain: string[] = [];
  for (const segment of segments) {
    if (hasMagic(segment)) {
      break;
    }
    plain.push(segment);
  }
  return plain.join(path.sep);
}
