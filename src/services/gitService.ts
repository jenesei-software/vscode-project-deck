import { execFile } from "node:child_process";
import {
  parseLastCommit,
  parseRemoteUrl,
  parseStatusPorcelainV2,
} from "../model/git";
import type { GitStatus } from "../model/types";
import { mapWithConcurrency } from "../util/concurrency";

const MAX_BUFFER = 4 * 1024 * 1024;
const DEFAULT_TTL = 30_000;

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

  async getStatuses(
    rootPaths: readonly string[],
  ): Promise<Map<string, GitStatus | null>> {
    const entries = await mapWithConcurrency(
      rootPaths,
      this.concurrency,
      async (rootPath) => [rootPath, await this.getStatus(rootPath)] as const,
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
    const statusOutput = await this.run(rootPath, [
      "--no-optional-locks",
      "status",
      "--porcelain=v2",
      "--branch",
    ]);
    if (statusOutput === null) {
      return null;
    }

    const parsed = parseStatusPorcelainV2(statusOutput);
    const [logOutput, remoteOutput] = await Promise.all([
      this.run(rootPath, ["log", "-1", "--format=%H%x1f%an%x1f%aI%x1f%s"]),
      this.run(rootPath, ["config", "--get", "remote.origin.url"]),
    ]);

    const remoteUrl = remoteOutput?.trim() || null;
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
