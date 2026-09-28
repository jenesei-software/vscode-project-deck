import assert from "node:assert/strict";
import { test } from "node:test";
import { globToRegExp, hasMagic, isIgnored } from "../util/glob";

test("hasMagic detects wildcard patterns", () => {
  assert.equal(hasMagic("/git/*"), true);
  assert.equal(hasMagic("/git/**/src"), true);
  assert.equal(hasMagic("/git/library"), false);
});

test("globToRegExp matches a single segment wildcard", () => {
  const regex = globToRegExp("/git/*");
  assert.equal(regex.test("/git/alpha"), true);
  assert.equal(regex.test("/git/alpha/beta"), false);
});

test("globToRegExp supports globstar", () => {
  const regex = globToRegExp("/git/**");
  assert.equal(regex.test("/git/alpha/beta"), true);
});

test("isIgnored matches names and glob patterns", () => {
  assert.equal(isIgnored("node_modules", ["node_modules"]), true);
  assert.equal(isIgnored("dist-2024", ["dist-*"]), true);
  assert.equal(isIgnored("src", ["node_modules"]), false);
  assert.equal(isIgnored("src", ["  "]), false);
});
