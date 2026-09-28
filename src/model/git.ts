import type { LastCommit } from "./types";

export interface ParsedStatus {
  branch: string;
  detached: boolean;
  ahead: number;
  behind: number;
  staged: number;
  modified: number;
  untracked: number;
  conflicted: number;
  upstream: string | null;
}

const HEAD_PREFIX = "# branch.head ";
const UPSTREAM_PREFIX = "# branch.upstream ";
const AB_PREFIX = "# branch.ab ";

export function parseStatusPorcelainV2(output: string): ParsedStatus {
  const status: ParsedStatus = {
    branch: "",
    detached: false,
    ahead: 0,
    behind: 0,
    staged: 0,
    modified: 0,
    untracked: 0,
    conflicted: 0,
    upstream: null,
  };

  for (const line of output.split(/\r?\n/)) {
    if (!line) {
      continue;
    }
    if (line.startsWith(HEAD_PREFIX)) {
      const value = line.slice(HEAD_PREFIX.length).trim();
      if (value === "(detached)") {
        status.detached = true;
      } else {
        status.branch = value;
      }
    } else if (line.startsWith(UPSTREAM_PREFIX)) {
      status.upstream = line.slice(UPSTREAM_PREFIX.length).trim() || null;
    } else if (line.startsWith(AB_PREFIX)) {
      const match = /\+(\d+)\s+-(\d+)/.exec(line.slice(AB_PREFIX.length));
      if (match) {
        status.ahead = Number(match[1]);
        status.behind = Number(match[2]);
      }
    } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      const xy = line.slice(2, 4);
      if (xy[0] !== ".") {
        status.staged++;
      }
      if (xy[1] !== ".") {
        status.modified++;
      }
    } else if (line.startsWith("u ")) {
      status.conflicted++;
    } else if (line.startsWith("? ")) {
      status.untracked++;
    }
  }

  return status;
}

export function parseLastCommit(output: string): LastCommit | null {
  const trimmed = output.replace(/\r?\n$/, "");
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split("\u001f");
  if (parts.length < 4) {
    return null;
  }
  return {
    hash: parts[0],
    author: parts[1],
    date: parts[2],
    subject: parts[3],
  };
}

export function parseRemoteUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  let host = "";
  let pathPart = "";

  const scp = /^[^@/]+@([^:/]+):(.+)$/.exec(trimmed);
  if (scp) {
    host = scp[1];
    pathPart = scp[2];
  } else {
    try {
      const parsed = new URL(trimmed);
      host = parsed.hostname;
      pathPart = parsed.pathname;
    } catch {
      return null;
    }
  }

  const segments = pathPart.replace(/^\/+/, "").split("/").filter(Boolean);
  if (segments.length === 0) {
    return host || null;
  }
  return host ? `${host}/${segments[0]}` : segments[0];
}
