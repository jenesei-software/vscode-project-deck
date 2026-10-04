import assert from "node:assert/strict";
import { test } from "node:test";
import {
  compareProjects,
  dirtyCount,
  frecencyScore,
  needsAttention,
  sortProjects,
} from "../model/ranking";
import type { GitStatus, ProjectView } from "../model/types";

const DAY = 86_400_000;

function git(overrides: Partial<GitStatus>): GitStatus {
  return {
    branch: "main",
    detached: false,
    ahead: 0,
    behind: 0,
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicted: 0,
    upstream: "origin/main",
    lastCommit: null,
    remoteUrl: null,
    hostOrg: null,
    ...overrides,
  };
}

function view(overrides: Partial<ProjectView>): ProjectView {
  return {
    id: overrides.id ?? "p",
    name: overrides.name ?? "project",
    rootPath: overrides.rootPath ?? "/tmp/project",
    kind: "git",
    tags: overrides.tags ?? [],
    pinned: overrides.pinned ?? false,
    createdAt: 0,
    detected: false,
    git: overrides.git ?? null,
    frecency: overrides.frecency ?? 0,
    lastOpenedAt: overrides.lastOpenedAt ?? 0,
  };
}

test("frecencyScore weights recent opens higher", () => {
  const now = 1_000 * DAY;
  const score = frecencyScore(
    [now, now - 3 * DAY, now - 40 * DAY, now - 400 * DAY],
    now,
  );
  assert.equal(score, 100 + 50 + 10);
});

test("dirtyCount and needsAttention reflect working tree state", () => {
  assert.equal(dirtyCount(git({ staged: 1, modified: 2, untracked: 3 })), 6);
  assert.equal(needsAttention(git({ behind: 1 })), true);
  assert.equal(needsAttention(git({})), false);
  assert.equal(needsAttention(null), false);
});

test("pinned projects always sort first", () => {
  const pinned = view({ id: "a", name: "z", pinned: true });
  const loose = view({ id: "b", name: "a", frecency: 999 });
  const sorted = sortProjects([loose, pinned], "name");
  assert.equal(sorted[0].id, "a");
});

test("attention sorting puts changed projects first", () => {
  const clean = view({ id: "clean", name: "clean" });
  const dirty = view({ id: "dirty", name: "dirty", git: git({ modified: 2 }) });
  assert.equal(compareProjects(dirty, clean, "attention") < 0, true);
});

test("frecency sorting is descending", () => {
  const low = view({ id: "low", frecency: 10 });
  const high = view({ id: "high", frecency: 90 });
  const sorted = sortProjects([low, high], "frecency");
  assert.equal(sorted[0].id, "high");
});

test("tag sorting puts tagged projects first by first tag", () => {
  const none = view({ id: "none", name: "a" });
  const work = view({ id: "work", name: "z", tags: ["Work"] });
  const home = view({ id: "home", name: "b", tags: ["Home"] });
  const sorted = sortProjects([none, work, home], "tag");
  assert.deepEqual(
    sorted.map((project) => project.id),
    ["home", "work", "none"],
  );
});
