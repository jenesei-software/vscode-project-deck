import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
  parseLastCommit,
  parseRemoteUrl,
  parseStatusPorcelainV2,
} from "../model/git";
import type { GitStatus } from "../model/types";
import { mapWithConcurrency } from "../util/concurrency";

const MAX_BUFFER = 4 * 1024 * 1024;
const DEFAULT_TTL = 60_000;
const GIT_TIMEOUT = 10_000;

interface CacheEntry {
  at: number;
  status: GitStatus | null;
}

export class GitService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private concurrency = 6,
    private readonly ttlMs = DEFAULT_TTL,
  ) {}

  setConcurrency(value: number): void {
    this.concurrency = Math.max(1, value);
  }

  invalidate(rootPath?: string): void {
    if (rootPath) {
      this.cache.delete(rootPath);
    } else {
      this.cache.clear();
    }
  }

  retain(rootPaths: readonly string[]): void {
    const keep = new Set(rootPaths);
    for (const key of [...this.cache.keys()]) {
      if (!keep.has(key)) {
        this.cache.delete(key);
      }
    }
  }

  async getStatuses(
    rootPaths: readonly string[],
    onResult?: (rootPath: string, status: GitStatus | null) => void,
  ): Promise<Map<string, GitStatus | null>> {
    const entries = await mapWithConcurrency(
      rootPaths,
      this.concurrency,
      async (rootPath) => {
        const status = await this.getStatus(rootPath);
        onResult?.(rootPath, status);
        return [rootPath, status] as const;
      },
    );
    return new Map(entries);
  }

  async getStatus(rootPath: string): Promise<GitStatus | null> {
    const cached = this.cache.get(rootPath);
    const now = Date.now();
    if (cached && now - cached.at < this.ttlMs) {
      return cached.status;
    }
    const status = await this.read(rootPath);
    this.cache.set(rootPath, { at: Date.now(), status });
    return status;
  }

  private async read(rootPath: string): Promise<GitStatus | null> {
    const [statusOutput, logOutput, remoteUrl] = await Promise.all([
      this.run(rootPath, [
        "--no-optional-locks",
        "status",
        "--porcelain=v2",
        "--branch",
      ]),
      this.run(rootPath, ["log", "-1", "--format=%H%x1f%an%x1f%aI%x1f%s"]),
      readRemoteUrl(rootPath),
    ]);
    if (statusOutput === null) {
      return null;
    }

    const parsed = parseStatusPorcelainV2(statusOutput);
    return {
      branch: parsed.branch,
      detached: parsed.detached,
      ahead: parsed.ahead,
      behind: parsed.behind,
      staged: parsed.staged,
      modified: parsed.modified,
      untracked: parsed.untracked,
      conflicted: parsed.conflicted,
      upstream: parsed.upstream,
      lastCommit: logOutput ? parseLastCommit(logOutput) : null,
      remoteUrl,
      hostOrg: remoteUrl ? parseRemoteUrl(remoteUrl) : null,
    };
  }

  private run(
    rootPath: string,
    args: readonly string[],
  ): Promise<string | null> {
    return new Promise((resolve) => {
      execFile(
        "git",
        ["-C", rootPath, ...args],
        {
          windowsHide: true,
          timeout: GIT_TIMEOUT,
          maxBuffer: MAX_BUFFER,
          env: {
            ...process.env,
            GIT_OPTIONAL_LOCKS: "0",
            GIT_TERMINAL_PROMPT: "0",
          },
        },
        (error, stdout) => {
          resolve(error ? null : stdout);
        },
      );
    });
  }
}

async function readRemoteUrl(rootPath: string): Promise<string | null> {
  let gitDir = path.join(rootPath, ".git");
  try {
    const stat = await fs.stat(gitDir);
    if (stat.isFile()) {
      const pointer = await fs.readFile(gitDir, "utf8");
      const match = pointer.match(/^gitdir:\s*(.+?)\s*$/m);
      if (!match) {
        return null;
      }
      gitDir = path.resolve(rootPath, match[1]);
    }
    const config = await fs.readFile(path.join(gitDir, "config"), "utf8");
    return parseOriginUrl(config);
  } catch {
    return null;
  }
}

function parseOriginUrl(config: string): string | null {
  let inOrigin = false;
  for (const line of config.split(/\r?\n/)) {
    const section = line.match(/^\s*\[(.+?)\]\s*$/);
    if (section) {
      inOrigin = /^remote\s+"origin"$/.test(section[1]);
      continue;
    }
    if (!inOrigin) {
      continue;
    }
    const entry = line.match(/^\s*url\s*=\s*(.+?)\s*$/);
    if (entry) {
      return entry[1];
    }
  }
  return null;
}
