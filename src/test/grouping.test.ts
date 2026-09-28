import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ALL_KEY,
  groupProjects,
  LOCAL_KEY,
  pathGroupFor,
  UNTAGGED_KEY,
} from "../model/grouping";
import type { GitStatus, ProjectView } from "../model/types";

function git(hostOrg: string | null): GitStatus {
  return {
    branch: "main",
    detached: false,
    ahead: 0,
    behind: 0,
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicted: 0,
    upstream: null,
    lastCommit: null,
    remoteUrl: null,
    hostOrg,
  };
}

function view(overrides: Partial<ProjectView>): ProjectView {
  return {
    id: overrides.id ?? "p",
    name: overrides.name ?? "project",
    rootPath: overrides.rootPath ?? "/repo",
    kind: "git",
    tags: overrides.tags ?? [],
    pinned: false,
    favorite: false,
    createdAt: 0,
    detected: false,
    git: overrides.git ?? null,
    frecency: 0,
    lastOpenedAt: 0,
  };
}

test("pathGroupFor picks the segment at the requested depth", () => {
  const base = "/git/library";
  const root = "/git/library/acme/repo";
  assert.equal(pathGroupFor(root, [base], 1), "acme");
  assert.equal(pathGroupFor(root, [base], 2), "repo");
});

test("tag grouping lists a project in every tag when enabled", () => {
  const project = view({ id: "a", tags: ["Work", "Client"] });
  const groups = groupProjects([project], {
    groupBy: "tag",
    baseFolders: [],
    pathGroupDepth: 1,
    multiTagGroups: true,
  });
  assert.deepEqual(
    groups.map((group) => group.key),
    ["Client", "Work"],
  );
});

test("tag grouping keeps only the first tag when disabled", () => {
  const project = view({ id: "a", tags: ["Work", "Client"] });
  const groups = groupProjects([project], {
    groupBy: "tag",
    baseFolders: [],
    pathGroupDepth: 1,
    multiTagGroups: false,
  });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, "Work");
});

test("untagged projects fall into the untagged bucket", () => {
  const groups = groupProjects([view({})], {
    groupBy: "tag",
    baseFolders: [],
    pathGroupDepth: 1,
    multiTagGroups: true,
  });
  assert.equal(groups[0].key, UNTAGGED_KEY);
});

test("org grouping uses the remote host/org and a local fallback", () => {
  const remote = view({ id: "a", git: git("github.com/acme") });
  const local = view({ id: "b", git: null });
  const groups = groupProjects([remote, local], {
    groupBy: "org",
    baseFolders: [],
    pathGroupDepth: 1,
    multiTagGroups: true,
  });
  assert.deepEqual(
    groups.map((group) => group.key),
    [LOCAL_KEY, "github.com/acme"],
  );
});

test("groupBy none returns a single unlabeled group", () => {
  const groups = groupProjects([view({}), view({ id: "b" })], {
    groupBy: "none",
    baseFolders: [],
    pathGroupDepth: 1,
    multiTagGroups: true,
  });
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, ALL_KEY);
  assert.equal(groups[0].projects.length, 2);
});
