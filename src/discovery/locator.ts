import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { ProjectKind } from "../model/types";
import { mapWithConcurrency } from "../util/concurrency";
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
  const budget = { visited: 0 };

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
    await walk(root, 0, matcher, options, found, budget);
  }

  return [...found.values()];
}

const MAX_DIRECTORIES = 50_000;

async function walk(
  dir: string,
  depth: number,
  matcher: RegExp | null,
  options: LocateOptions,
  found: Map<string, DiscoveredProject>,
  budget: { visited: number },
): Promise<void> {
  if (budget.visited >= MAX_DIRECTORIES) {
    return;
  }
  budget.visited++;

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

  const children = entries.filter(
    (entry) =>
      entry.isDirectory() &&
      !entry.isSymbolicLink() &&
      !entry.name.startsWith(".") &&
      !isIgnored(entry.name, options.ignoredFolders),
  );

  await mapWithConcurrency(children, 8, (entry) =>
    walk(
      path.join(dir, entry.name),
      depth + 1,
      matcher,
      options,
      found,
      budget,
    ),
  );
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
