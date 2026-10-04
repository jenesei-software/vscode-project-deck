# Security Policy

## Reporting a vulnerability

Please report suspected vulnerabilities privately through
[GitHub Security Advisories](https://github.com/jenesei-software/vscode-project-deck/security/advisories/new)
rather than in a public issue.

Include a description, reproduction steps and the affected version. We aim to
acknowledge reports within a few days.

## Scope

Project Manager Hub is read-only with respect to your repositories: it runs local
`git` queries (`status`, `log`, `config`) and never writes to them, never runs
hooks and never sends data over the network. It only opens folders you selected
in VS Code and stores its own list in VS Code global state.
