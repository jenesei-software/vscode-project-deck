import type * as vscode from "vscode";
import type { ProjectGroup } from "../../model/grouping";
import type { SortMode } from "../../model/types";

export interface DashboardStrings {
  searchPlaceholder: string;
  empty: string;
  noResults: string;
  sort: string;
  sortFrecency: string;
  sortAttention: string;
  sortName: string;
  sortPath: string;
  sortRecent: string;
  saved: string;
  detected: string;
  clean: string;
  open: string;
  openNewWindow: string;
  reveal: string;
  copyPath: string;
  pin: string;
  unpin: string;
  tags: string;
}

export interface DashboardState {
  groups: ProjectGroup[];
  sort: SortMode;
  showGitStatus: boolean;
  strings: DashboardStrings;
}

function createNonce(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let index = 0; index < 32; index++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export function getDashboardHtml(
  _webview: vscode.Webview,
  strings: DashboardStrings,
): string {
  const nonce = createNonce();
  const csp = [
    "default-src 'none'",
    "style-src 'unsafe-inline'",
    `script-src 'nonce-${nonce}'`,
  ].join("; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 8px;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
  }
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 2;
    display: flex;
    gap: 6px;
    padding: 4px 0 8px;
    background: var(--vscode-sideBar-background, transparent);
  }
  .toolbar input, .toolbar select {
    font-family: inherit;
    font-size: inherit;
    color: var(--vscode-input-foreground);
    background: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border, transparent);
    border-radius: 4px;
    padding: 4px 6px;
    outline: none;
  }
  .toolbar input { flex: 1 1 auto; min-width: 0; }
  .toolbar input:focus, .toolbar select:focus {
    border-color: var(--vscode-focusBorder);
  }
  .group {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin: 10px 2px 6px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--vscode-descriptionForeground);
  }
  .group-count {
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }
  .card {
    border: 1px solid var(--vscode-panel-border, var(--vscode-widget-border, transparent));
    border-radius: 6px;
    padding: 8px 10px;
    margin-bottom: 6px;
    background: var(--vscode-editorWidget-background, transparent);
  }
  .card:hover {
    border-color: var(--vscode-focusBorder);
  }
  .title {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .name { font-weight: 600; }
  .badge {
    font-size: 10px;
    padding: 0 5px;
    border-radius: 999px;
    color: var(--vscode-badge-foreground);
    background: var(--vscode-badge-background);
  }
  .badge.muted {
    color: var(--vscode-descriptionForeground);
    background: transparent;
    border: 1px solid var(--vscode-descriptionForeground);
  }
  .badge.pin { background: transparent; color: var(--vscode-charts-yellow, #d7ba7d); }
  .git {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    flex-wrap: wrap;
  }
  .git .branch { color: var(--vscode-foreground); }
  .git .ahead { color: var(--vscode-charts-green, #89d185); }
  .git .behind { color: var(--vscode-charts-orange, #d18616); }
  .git .dirty { color: var(--vscode-charts-orange, #d18616); }
  .git .conflict { color: var(--vscode-charts-red, #f14c4c); }
  .git .clean { color: var(--vscode-charts-green, #89d185); }
  .commit {
    margin-top: 2px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
    opacity: 0;
    transition: opacity 0.1s ease-in-out;
  }
  .card:hover .actions, .card:focus-within .actions { opacity: 1; }
  .action {
    font-family: inherit;
    font-size: 11px;
    color: var(--vscode-button-secondaryForeground, var(--vscode-foreground));
    background: var(--vscode-button-secondaryBackground, transparent);
    border: 1px solid var(--vscode-panel-border, transparent);
    border-radius: 4px;
    padding: 2px 7px;
    cursor: pointer;
  }
  .action:hover { background: var(--vscode-toolbar-hoverBackground, rgba(128,128,128,0.2)); }
  .action:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
  .empty {
    padding: 16px 6px;
    color: var(--vscode-descriptionForeground);
    text-align: center;
  }
</style>
</head>
<body>
<div class="toolbar">
  <input id="search" type="search" placeholder="${escapeHtml(strings.searchPlaceholder)}" aria-label="${escapeHtml(strings.searchPlaceholder)}" />
  <select id="sort" aria-label="${escapeHtml(strings.sort)}">
    <option value="frecency">${escapeHtml(strings.sortFrecency)}</option>
    <option value="attention">${escapeHtml(strings.sortAttention)}</option>
    <option value="name">${escapeHtml(strings.sortName)}</option>
    <option value="path">${escapeHtml(strings.sortPath)}</option>
    <option value="recent">${escapeHtml(strings.sortRecent)}</option>
  </select>
</div>
<div id="list"></div>
<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  var root = document.getElementById('list');
  var search = document.getElementById('search');
  var sort = document.getElementById('sort');
  var state = { groups: [], sort: 'frecency', showGitStatus: true, strings: {} };

  window.addEventListener('message', function (event) {
    var message = event.data;
    if (!message || message.type !== 'state') { return; }
    state = message;
    sort.value = message.sort;
    render();
  });

  search.addEventListener('input', function () { render(); });
  sort.addEventListener('change', function () {
    vscode.postMessage({ type: 'setSort', sort: sort.value });
  });

  function post(type, id) { vscode.postMessage({ type: type, id: id }); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function button(label, handler) {
    var node = el('button', 'action', label);
    node.addEventListener('click', handler);
    return node;
  }

  function relative(iso) {
    if (!iso) { return ''; }
    var then = new Date(iso).getTime();
    if (isNaN(then)) { return ''; }
    var minutes = Math.round((Date.now() - then) / 60000);
    if (minutes < 1) { return 'now'; }
    if (minutes < 60) { return minutes + 'm'; }
    var hours = Math.round(minutes / 60);
    if (hours < 24) { return hours + 'h'; }
    var days = Math.round(hours / 24);
    if (days < 30) { return days + 'd'; }
    var months = Math.round(days / 30);
    if (months < 12) { return months + 'mo'; }
    return Math.round(months / 12) + 'y';
  }

  function matches(project) {
    var query = search.value.trim().toLowerCase();
    if (!query) { return true; }
    var parts = [project.name, project.rootPath];
    if (project.tags) { parts = parts.concat(project.tags); }
    if (project.git && project.git.branch) { parts.push(project.git.branch); }
    return parts.join(' ').toLowerCase().indexOf(query) !== -1;
  }

  function gitLine(git) {
    var line = el('div', 'git');
    line.appendChild(el('span', 'branch', git.detached ? '(detached)' : (git.branch || '?')));
    if (git.ahead) { line.appendChild(el('span', 'ahead', '\\u2191' + git.ahead)); }
    if (git.behind) { line.appendChild(el('span', 'behind', '\\u2193' + git.behind)); }
    if (git.conflicted) { line.appendChild(el('span', 'conflict', '\\u2717' + git.conflicted)); }
    var dirty = git.staged + git.modified + git.untracked + git.conflicted;
    if (dirty) {
      line.appendChild(el('span', 'dirty', '\\u25CF' + dirty));
    } else {
      line.appendChild(el('span', 'clean', state.strings.clean));
    }
    return line;
  }

  function renderCard(project) {
    var card = el('div', 'card');
    card.setAttribute('title', project.rootPath);

    var title = el('div', 'title');
    title.appendChild(el('span', 'name', project.name));
    if (project.pinned) { title.appendChild(el('span', 'badge pin', '\\u2605')); }
    title.appendChild(el('span', project.favorite ? 'badge' : 'badge muted', project.favorite ? state.strings.saved : state.strings.detected));
    card.appendChild(title);

    if (state.showGitStatus && project.git) {
      card.appendChild(gitLine(project.git));
      if (project.git.lastCommit) {
        card.appendChild(el('div', 'commit', project.git.lastCommit.subject + ' \\u00B7 ' + relative(project.git.lastCommit.date)));
      }
    }

    var actions = el('div', 'actions');
    actions.appendChild(button(state.strings.open, function () { post('open', project.id); }));
    actions.appendChild(button(state.strings.openNewWindow, function () { post('openNewWindow', project.id); }));
    actions.appendChild(button(state.strings.reveal, function () { post('reveal', project.id); }));
    actions.appendChild(button(state.strings.copyPath, function () { post('copyPath', project.id); }));
    actions.appendChild(button(project.pinned ? state.strings.unpin : state.strings.pin, function () { post('togglePin', project.id); }));
    actions.appendChild(button(state.strings.tags, function () { post('editTags', project.id); }));
    card.appendChild(actions);

    return card;
  }

  function render() {
    root.textContent = '';
    var groups = state.groups || [];
    var visible = 0;
    for (var i = 0; i < groups.length; i++) {
      var projects = (groups[i].projects || []).filter(matches);
      if (projects.length === 0) { continue; }
      visible += projects.length;
      if (groups[i].label) {
        var header = el('div', 'group');
        header.appendChild(el('span', 'group-label', groups[i].label));
        header.appendChild(el('span', 'group-count', String(projects.length)));
        root.appendChild(header);
      }
      for (var j = 0; j < projects.length; j++) {
        root.appendChild(renderCard(projects[j]));
      }
    }
    if (visible === 0) {
      root.appendChild(el('div', 'empty', groups.length === 0 ? state.strings.empty : state.strings.noResults));
    }
  }

  vscode.postMessage({ type: 'ready' });
})();
</script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
