# Project Deck

[![Marketplace](https://img.shields.io/badge/Marketplace-Project%20Deck-007ACC?logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=jenesei-software.project-deck)
[![Version](https://img.shields.io/badge/version-0.0.1-2ea44f)](CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-2ea44f)](package.json)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Project Deck is a git-aware project hub. Instead of a flat list of repository
names, it shows the state of every project at a glance — branch, ahead/behind,
working-tree changes and the last commit — ranks them by how recently and often
you actually use them, and groups them by folder, tag or remote.

Everything is local: no network, no tokens, read-only Git queries.

## Features

- **Auto-discovery** — scan folders or glob patterns for Git repositories and
  `.code-workspace` files, ignore noisy folders, control the depth.
- **Git status on every card** — branch, detached HEAD, ahead/behind, staged /
  modified / untracked / conflicted counts and the last commit.
- **Frecency ranking** — the projects you use most and most recently rise to the
  top, with pinned projects always first.
- **Sorting** — Frecency, Needs attention, Name, Path or Recent.
- **Grouping** — by path segment below a base folder (default), by tag, by
  remote organization, or none.
- **Keyboard-first switching** — a fuzzy QuickPick that opens with MRU order and
  shows branch/status inline.
- **Dashboard + tree** — a rich webview dashboard and a native project tree.
- **Project Manager import** — bring your existing favorites across in one step.
- **Settings Sync** — your project list, tags and frecency travel between
  machines automatically; no files to manage.

## Screenshots

_Coming soon._

## How it works

- Base folders and all preferences are regular VS Code settings, so they sync
  through Settings Sync.
- Projects you save, their tags and pins, plus frecency data, live in VS Code
  global state and are registered with `setKeysForSync`, so they sync too.
- For each project the extension runs `git status --porcelain=v2 --branch`,
  `git log -1` and reads `remote.origin.url`. It never writes to a repository,
  never runs hooks, and inspects at most a bounded number of repositories in
  parallel.

## Requirements

- VS Code `1.85.0` or newer.
- `git` available on `PATH` (optional; without it projects are still listed, just
  without status).

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `projectDeck.baseFolders` | `[]` | Folders or glob patterns to scan. |
| `projectDeck.ignoredFolders` | common build dirs | Folders skipped while scanning. |
| `projectDeck.maxDepthRecursion` | `3` | Scan depth per base folder. |
| `projectDeck.groupBy` | `path` | `path`, `tag`, `org` or `none`. |
| `projectDeck.pathGroupDepth` | `1` | Path segment used as the group name. |
| `projectDeck.tags` | `Personal`, `Work` | Tags offered when tagging projects. |
| `projectDeck.multiTagGroups` | `true` | List a project in every tag group. |
| `projectDeck.sortList` | `frecency` | `frecency`, `attention`, `name`, `path`, `recent`. |
| `projectDeck.showGitStatus` | `true` | Show Git state on projects. |
| `projectDeck.concurrency` | `6` | Repositories inspected in parallel. |
| `projectDeck.openInNewWindow` | `true` | Open projects in a new window. |
| `projectDeck.statusBar` | `true` | Current project and branch in the status bar. |

## Commands

| Command | Description |
| --- | --- |
| `Project Deck: Open Project` | Open a project in the current window. |
| `Project Deck: Open Project in New Window` | Open a project in a new window. |
| `Project Deck: Switch Project` | Fuzzy switch with status inline. |
| `Project Deck: Save Current Project` | Save the current folder as a project. |
| `Project Deck: Refresh Projects` | Re-scan and refresh Git status. |
| `Project Deck: Import from Project Manager` | Import favorites from Project Manager. |
| `Project Deck: Export Projects to JSON` | Export saved projects. |

## Security

- Read-only: the extension never writes to your repositories and runs no hooks.
- No network access; only local `git` queries and folder scanning.
- Only environment-independent project paths and metadata are stored.

## Support the project

Project Deck is free and open source. If it is useful to you:

- ⭐ **Star the repository on [GitHub](https://github.com/jenesei-software/vscode-project-deck)** — it helps other people find it.
- ☕ **[DonationAlerts](https://www.donationalerts.com/r/cyrilstrone)** — a one-time donation keeps the project alive.

## License

[MIT](LICENSE)
