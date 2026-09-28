import assert from "node:assert/strict";
import { test } from "node:test";
import { mapProjectManagerProjects } from "../discovery/pmImport";

test("mapProjectManagerProjects reads the flat object form", () => {
  const result = mapProjectManagerProjects({
    id1: { name: "App", rootPath: "/git/app", tags: ["Work"] },
    id2: { name: "Docs", rootPath: "/git/docs" },
    bad: { name: "NoPath" },
  });
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    name: "App",
    rootPath: "/git/app",
    tags: ["Work"],
  });
  assert.deepEqual(result[1].tags, []);
});

test("mapProjectManagerProjects reads the nested projects form", () => {
  const result = mapProjectManagerProjects({
    projects: { id1: { name: "App", rootPath: "/git/app" } },
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].rootPath, "/git/app");
});

test("mapProjectManagerProjects tolerates junk input", () => {
  assert.deepEqual(mapProjectManagerProjects(null), []);
  assert.deepEqual(mapProjectManagerProjects("nope"), []);
  assert.deepEqual(mapProjectManagerProjects({ a: 1 }), []);
});
