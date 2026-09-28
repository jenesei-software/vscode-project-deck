import assert from "node:assert/strict";
import { test } from "node:test";
import type { DiscoveredProject } from "../discovery/locator";
import { dedupeNested, idFromPath, mergeSources } from "../discovery/merge";
import type { Project } from "../model/types";

test("dedupeNested keeps the outermost repository", () => {
  const projects: DiscoveredProject[] = [
    { name: "inner", rootPath: "/git/lib/app/inner", kind: "git" },
    { name: "outer", rootPath: "/git/lib/app", kind: "git" },
  ];
  const result = dedupeNested(projects);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "outer");
});

test("mergeSources keeps saved metadata and marks detected ones", () => {
  const saved: Project[] = [
    {
      id: "saved-1",
      name: "Saved App",
      rootPath: "/git/lib/app",
      kind: "git",
      tags: ["Work"],
      pinned: true,
      favorite: true,
      createdAt: 1,
    },
  ];
  const discovered: DiscoveredProject[] = [
    { name: "app", rootPath: "/git/lib/app", kind: "git" },
    { name: "other", rootPath: "/git/lib/other", kind: "git" },
  ];
  const merged = mergeSources(saved, discovered);
  const app = merged.find((project) => project.rootPath === "/git/lib/app");
  assert.equal(app?.id, "saved-1");
  assert.equal(app?.detected, false);
  assert.deepEqual(app?.tags, ["Work"]);

  const other = merged.find((project) => project.rootPath === "/git/lib/other");
  assert.equal(other?.detected, true);
  assert.equal(other?.favorite, false);
});

test("idFromPath is stable", () => {
  assert.equal(idFromPath("/git/lib/app"), idFromPath("/git/lib/app"));
});
