import type * as vscode from "vscode";
import type { ProjectGroup } from "../../model/grouping";
import type { SortMode } from "../../model/types";

export interface DashboardStrings {
  searchPlaceholder: string;
  empty: string;
  noResults: string;
  loading: string;
  sort: string;
  sortFrecency: string;
  sortAttention: string;
  sortName: string;
  sortPath: string;
  sortRecent: string;
  groupDepth: string;
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
  type: "state";
  groups: ProjectGroup[];
  sort: SortMode;
  pathGroupDepth: number;
  showGitStatus: boolean;
  collapseGroups: boolean;
  loading: boolean;
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
  html, body { height: 100%; }
  body {
    margin: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: transparent;
  }
  .toolbar {
    flex: 0 0 auto;
    display: flex;
    gap: 6px;
    padding: 6px 4px 4px;
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
  #list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 0 4px 4px;
  }
  .group {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 8px 2px 4px;
    padding: 2px 0;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    user-select: none;
  }
  .group:hover { color: var(--vscode-foreground); }
  .group:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
  .group .chevron {
    display: inline-flex;
    width: 14px;
    height: 14px;
    transition: transform 0.1s ease;
  }
  .group .chevron svg { width: 14px; height: 14px; }
  .group.collapsed .chevron { transform: rotate(-90deg); }
  .group-count {
    font-variant-numeric: tabular-nums;
    opacity: 0.8;
  }
  .card {
    border-radius: 4px;
    padding: 6px;
    margin-bottom: 2px;
  }
  .card:hover {
    background: var(--vscode-list-hoverBackground, rgba(128,128,128,0.12));
  }
  .card-head {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }
  .title {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    flex: 1 1 auto;
    min-width: 0;
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
  .card-actions {
    flex: 0 0 auto;
    display: flex;
    gap: 2px;
  }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--vscode-icon-foreground, var(--vscode-foreground));
    cursor: pointer;
  }
  .icon-btn:hover { background: var(--vscode-toolbar-hoverBackground, rgba(128,128,128,0.2)); }
  .icon-btn:focus-visible { outline: 1px solid var(--vscode-focusBorder); }
  .icon-btn svg { width: 16px; height: 16px; display: block; }
  .icon-btn.active { color: var(--vscode-charts-yellow, #d7ba7d); }
  .icon-btn.active svg { fill: currentColor; }
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
  <select id="depth" aria-label="${escapeHtml(strings.groupDepth)}" title="${escapeHtml(strings.groupDepth)}">
    <option value="0">0</option>
    <option value="1">1</option>
    <option value="2">2</option>
    <option value="3">3</option>
    <option value="4">4</option>
    <option value="5">5</option>
  </select>
</div>
<div id="list"></div>
<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  var root = document.getElementById('list');
  var search = document.getElementById('search');
  var sort = document.getElementById('sort');
  var depth = document.getElementById('depth');
  var state = { groups: [], sort: 'frecency', pathGroupDepth: 1, showGitStatus: true, collapseGroups: true, loading: false, strings: {} };
  var collapsed = {};
  var collapseDefault = null;

  var SVG = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">';
  var ICONS = {
    open: SVG + '<rect x="2" y="3" width="12" height="10" rx="1.5"/><path d="M2 6h12"/></svg>',
    openNew: SVG + '<rect x="2" y="2" width="9" height="9" rx="1.5"/><rect x="6" y="6" width="8" height="8" rx="1.5"/></svg>',
    reveal: SVG + '<path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h2.6l1.2 1.5h5.2A1.5 1.5 0 0 1 14 6v5.5A1.5 1.5 0 0 1 12.5 13h-9A1.5 1.5 0 0 1 2 11.5z"/></svg>',
    copy: SVG + '<rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>',
    pin: SVG + '<path d="M5.5 2h5l-1 3 2.5 2.5H4L6.5 5z"/><path d="M8 7.5V14"/></svg>',
    tags: SVG + '<path d="M3 2h5.5L14 7.5 8.5 13 3 7.5z"/><circle cx="6" cy="5" r="1"/></svg>',
    chevron: SVG + '<path d="M4 6l4 4 4-4"/></svg>'
  };

  window.addEventListener('message', function (event) {
    var message = event.data;
    if (!message || message.type !== 'state') { return; }
    state = message;
    sort.value = message.sort;
    syncDepth(message.pathGroupDepth);
    syncCollapse();
    render();
  });

  search.addEventListener('input', function () { render(); });
  sort.addEventListener('change', function () {
    vscode.postMessage({ type: 'setSort', sort: sort.value });
  });
  depth.addEventListener('change', function () {
    vscode.postMessage({ type: 'setGroupDepth', depth: Number(depth.value) });
  });

  function syncDepth(value) {
    var target = String(Number(value) || 0);
    var found = false;
    for (var i = 0; i < depth.options.length; i++) {
      if (depth.options[i].value === target) { found = true; break; }
    }
    if (!found) {
      var option = document.createElement('option');
      option.value = target;
      option.textContent = target;
      depth.appendChild(option);
    }
    depth.value = target;
  }

  function syncCollapse() {
    var def = !!state.collapseGroups;
    if (collapseDefault !== def) {
      collapseDefault = def;
      collapsed = {};
    }
    var groups = state.groups || [];
    for (var i = 0; i < groups.length; i++) {
      if (collapsed[groups[i].key] === undefined) {
        collapsed[groups[i].key] = def;
      }
    }
  }

  function post(type, id) { vscode.postMessage({ type: type, id: id }); }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined && text !== null) { node.textContent = text; }
    return node;
  }

  function iconButton(svg, label, handler, active) {
    var node = el('button', 'icon-btn' + (active ? ' active' : ''));
    node.type = 'button';
    node.title = label;
    node.setAttribute('aria-label', label);
    node.innerHTML = svg;
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
      line.appendChild(el('span', 'dirty', '\\u25CF'));
      line.appendChild(el('span', 'dirty', String(dirty)));
    } else {
      line.appendChild(el('span', 'clean', state.strings.clean));
    }
    return line;
  }

  function renderCard(project) {
    var card = el('div', 'card');
    card.setAttribute('title', project.rootPath);

    var head = el('div', 'card-head');
    var title = el('div', 'title');
    title.appendChild(el('span', 'name', project.name));
    if (project.pinned) { title.appendChild(el('span', 'badge pin', '\\u2605')); }
    title.appendChild(el('span', project.favorite ? 'badge' : 'badge muted', project.favorite ? state.strings.saved : state.strings.detected));
    head.appendChild(title);

    var actions = el('div', 'card-actions');
    actions.appendChild(iconButton(ICONS.open, state.strings.open, function () { post('open', project.id); }));
    actions.appendChild(iconButton(ICONS.openNew, state.strings.openNewWindow, function () { post('openNewWindow', project.id); }));
    actions.appendChild(iconButton(ICONS.reveal, state.strings.reveal, function () { post('reveal', project.id); }));
    actions.appendChild(iconButton(ICONS.copy, state.strings.copyPath, function () { post('copyPath', project.id); }));
    actions.appendChild(iconButton(ICONS.pin, project.pinned ? state.strings.unpin : state.strings.pin, function () { post('togglePin', project.id); }, project.pinned));
    actions.appendChild(iconButton(ICONS.tags, state.strings.tags, function () { post('editTags', project.id); }));
    head.appendChild(actions);
    card.appendChild(head);

    if (state.showGitStatus && project.git) {
      card.appendChild(gitLine(project.git));
      if (project.git.lastCommit) {
        card.appendChild(el('div', 'commit', project.git.lastCommit.subject + ' \\u00B7 ' + relative(project.git.lastCommit.date)));
      }
    }

    return card;
  }

  function renderGroupHeader(group, count, isCollapsed) {
    var header = el('div', 'group' + (isCollapsed ? ' collapsed' : ''));
    header.setAttribute('role', 'button');
    header.tabIndex = 0;
    header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    var chevron = el('span', 'chevron');
    chevron.innerHTML = ICONS.chevron;
    header.appendChild(chevron);
    header.appendChild(el('span', 'group-label', group.label));
    header.appendChild(el('span', 'group-count', String(count)));
    var toggle = function () {
      collapsed[group.key] = !collapsed[group.key];
      render();
    };
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
    return header;
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
        var isCollapsed = !!collapsed[groups[i].key];
        root.appendChild(renderGroupHeader(groups[i], projects.length, isCollapsed));
        if (isCollapsed) { continue; }
      }
      for (var j = 0; j < projects.length; j++) {
        root.appendChild(renderCard(projects[j]));
      }
    }
    if (visible === 0) {
      var message = groups.length === 0
        ? (state.loading ? state.strings.loading : state.strings.empty)
        : state.strings.noResults;
      root.appendChild(el('div', 'empty', message));
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
