import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseLastCommit,
  parseRemoteUrl,
  parseStatusPorcelainV2,
} from "../model/git";

test("parseStatusPorcelainV2 reads branch, tracking and changes", () => {
  const output = [
    "# branch.oid 1234567",
    "# branch.head main",
    "# branch.upstream origin/main",
    "# branch.ab +2 -3",
    "1 M. N... 100644 100644 100644 abc def file1",
    "1 .M N... 100644 100644 100644 abc def file2",
    "2 R. N... 100644 100644 100644 abc def new\told",
    "u UU N... 100644 100644 100644 abc def conflict",
    "? untracked.txt",
    "",
  ].join("\n");

  const status = parseStatusPorcelainV2(output);
  assert.equal(status.branch, "main");
  assert.equal(status.detached, false);
  assert.equal(status.ahead, 2);
  assert.equal(status.behind, 3);
  assert.equal(status.upstream, "origin/main");
  assert.equal(status.staged, 2);
  assert.equal(status.modified, 1);
  assert.equal(status.untracked, 1);
  assert.equal(status.conflicted, 1);
});

test("parseStatusPorcelainV2 detects a detached head", () => {
  const status = parseStatusPorcelainV2("# branch.head (detached)\n");
  assert.equal(status.detached, true);
  assert.equal(status.branch, "");
});

test("parseLastCommit parses the unit separator format", () => {
  const commit = parseLastCommit(
    "abc\u001fAlice\u001f2026-01-02T03:04:05Z\u001ffix auth",
  );
  assert.deepEqual(commit, {
    hash: "abc",
    author: "Alice",
    date: "2026-01-02T03:04:05Z",
    subject: "fix auth",
  });
});

test("parseLastCommit returns null for empty output", () => {
  assert.equal(parseLastCommit(""), null);
  assert.equal(parseLastCommit("only-one-field"), null);
});

test("parseRemoteUrl normalizes ssh and https remotes", () => {
  assert.equal(
    parseRemoteUrl("git@github.com:acme/repo.git"),
    "github.com/acme",
  );
  assert.equal(
    parseRemoteUrl("https://gitlab.com/acme/repo.git"),
    "gitlab.com/acme",
  );
  assert.equal(parseRemoteUrl("  "), null);
  assert.equal(parseRemoteUrl("not a url"), null);
});
