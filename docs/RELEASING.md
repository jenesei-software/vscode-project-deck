# Releasing Project Deck

Maintainer notes. The version lives in `package.json` and follows
[Semantic Versioning](https://semver.org/); every release is tagged `vX.Y.Z` and
listed in [CHANGELOG.md](../CHANGELOG.md).

## Changelog

[CHANGELOG.md](../CHANGELOG.md) follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Changes are collected
under `## [Unreleased]` (one of Added / Changed / Fixed / Removed / Deprecated /
Security). Before releasing, move the `Unreleased` entries under a new
`## [X.Y.Z] - YYYY-MM-DD` heading.

## Automated release

Releases go through the
[release workflow](../.github/workflows/release.yml): Actions → **Release** →
*Run workflow*, pick `patch` / `minor` / `major`. It verifies the build, bumps
the version, commits, tags, builds the `.vsix`, publishes to the
[Visual Studio Marketplace](https://marketplace.visualstudio.com/) and creates a
GitHub release.

## One-time setup

1. **Publisher** — the id must match `publisher` in `package.json`
   (`jenesei-software`).
2. **PAT** — in Azure DevOps create a Personal Access Token with the
   **Marketplace → Manage** scope.
3. **Secret** — add it to the repository as the `VSCE_PAT` secret.

## Local publish

Set `VSCE_PAT` in the environment and run:

```powershell
npm run vsix:publish
```
