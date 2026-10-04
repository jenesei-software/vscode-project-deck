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
  sortTag: string;
  groupDepth: string;
  collapseAll: string;
  expandAll: string;
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
  collapsedGroups: Record<string, boolean>;
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
    padding: 0;
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
    padding: 8px 8px 6px;
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
    padding: 0;
  }
  .group {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 8px 0 4px;
    padding: 3px 8px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--vscode-descriptionForeground);
    cursor: pointer;
    user-select: none;
  }
  .group:hover {
    background: var(--vscode-list-hoverBackground, rgba(128,128,128,0.12));
    color: var(--vscode-foreground);
  }
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
    padding: 6px 8px;
    margin: 0 0 2px;
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
  .card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    margin-top: 4px;
  }
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }
  .tag {
    font-size: 10px;
    line-height: 16px;
    padding: 0 6px;
    border-radius: 999px;
    color: var(--vscode-descriptionForeground);
    border: 1px solid var(--vscode-widget-border, var(--vscode-descriptionForeground));
    white-space: nowrap;
  }
  .card-actions {
    flex: 0 0 auto;
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.1s ease-in-out;
  }
  .card:hover .card-actions,
  .card:focus-within .card-actions {
    opacity: 1;
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
  .toolbar .icon-btn {
    width: 26px;
    height: 26px;
    flex: 0 0 auto;
  }
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
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-top: 2px;
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }
  .commit-subject {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .commit-time {
    flex: 0 0 auto;
    white-space: nowrap;
  }
  .empty {
    padding: 16px 8px;
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
    <option value="tag">${escapeHtml(strings.sortTag)}</option>
  </select>
  <select id="depth" aria-label="${escapeHtml(strings.groupDepth)}" title="${escapeHtml(strings.groupDepth)}">
    <option value="0">0</option>
    <option value="1">1</option>
    <option value="2">2</option>
    <option value="3">3</option>
    <option value="4">4</option>
    <option value="5">5</option>
  </select>
  <button id="collapseAll" class="icon-btn toolbar-btn" type="button"></button>
</div>
<div id="list"></div>
<script nonce="${nonce}">
(function () {
  var vscode = acquireVsCodeApi();
  var root = document.getElementById('list');
  var search = document.getElementById('search');
  var sort = document.getElementById('sort');
  var depth = document.getElementById('depth');
  var collapseAll = document.getElementById('collapseAll');
  var state = { groups: [], sort: 'frecency', pathGroupDepth: 1, showGitStatus: true, collapseGroups: true, collapsedGroups: {}, loading: false, strings: {} };
  var collapsed = {};

  var SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor">';
  var ICONS = {
    open: SVG + '<path d="M14.5 2h-13l-.5.5v11l.5.5h13l.5-.5v-11l-.5-.5zM14 13H2V6h12v7zm0-8H2V3h12v2z"/></svg>',
    openNew: SVG + '<path fill-rule="evenodd" clip-rule="evenodd" d="M6 1.5l.5-.5h8l.5.5v7l-.5.5H12V8h2V4H7v1H6V1.5zM7 2v1h7V2H7zM1.5 7l-.5.5v7l.5.5h8l.5-.5v-7L9.5 7h-8zM2 9V8h7v1H2zm0 1h7v4H2v-4z"/></svg>',
    reveal: SVG + '<path d="M1.5 14h11l.48-.37 2.63-7-.48-.63H14V3.5l-.5-.5H7.71l-.86-.85L6.5 2h-5l-.5.5v11l.5.5zM2 3h4.29l.86.85.35.15H13v2H8.5l-.35.15-.86.85H3.5l-.47.34-1 3.08L2 3zm10.13 10H2.19l1.67-5H7.5l.35-.15.86-.85h5.79l-2.37 6z"/></svg>',
    copy: SVG + '<path fill-rule="evenodd" clip-rule="evenodd" d="M4 4l1-1h5.414L14 6.586V14l-1 1H5l-1-1V4zm9 3l-3-3H5v10h8V7z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M3 1L2 2v10l1 1V2h6.414l-1-1H3z"/></svg>',
    pin: SVG + '<path d="M14 5v7h-.278c-.406 0-.778-.086-1.117-.258A2.528 2.528 0 0 1 11.73 11H8.87a3.463 3.463 0 0 1-.546.828 3.685 3.685 0 0 1-.735.633c-.27.177-.565.31-.882.398a3.875 3.875 0 0 1-.985.141h-.5V9H2l-1-.5L2 8h3.222V4h.5c.339 0 .664.047.977.14.312.094.607.227.883.4A3.404 3.404 0 0 1 8.87 6h2.859a2.56 2.56 0 0 1 .875-.734c.338-.172.71-.26 1.117-.266H14zm-.778 1.086a1.222 1.222 0 0 0-.32.156 1.491 1.491 0 0 0-.43.461L12.285 7H8.183l-.117-.336a2.457 2.457 0 0 0-.711-1.047C7.027 5.331 6.427 5.09 6 5v7c.427-.088 1.027-.33 1.355-.617.328-.287.565-.636.71-1.047L8.184 10h4.102l.18.297c.057.094.122.177.195.25.073.073.153.143.242.21.088.069.195.12.32.157V6.086z"/></svg>',
    pinned: SVG + '<path d="M4 2h7v.278c0 .406-.086.778-.258 1.117-.172.339-.42.63-.742.875v2.86c.307.145.583.328.828.546.245.219.456.464.633.735.177.27.31.565.398.882.089.318.136.646.141.985v.5H8V14l-.5 1-.5-1v-3.222H3v-.5c0-.339.047-.664.14-.977.094-.312.227-.607.4-.883A3.404 3.404 0 0 1 5 7.13V4.27a2.561 2.561 0 0 1-.734-.875A2.505 2.505 0 0 1 4 2.278V2zm1.086.778c.042.125.094.232.156.32a1.494 1.494 0 0 0 .461.43L6 3.715v4.102l-.336.117c-.411.146-.76.383-1.047.711C4.331 8.973 4.09 9.573 4 10h7c-.088-.427-.33-1.027-.617-1.355a2.456 2.456 0 0 0-1.047-.71L9 7.816V3.715l.297-.18c.094-.057.177-.122.25-.195a2.28 2.28 0 0 0 .21-.242.968.968 0 0 0 .157-.32H5.086z"/></svg>',
    tags: SVG + '<path fill-rule="evenodd" clip-rule="evenodd" d="M13.2 2H8.017l-.353.146L1 8.81v.707L6.183 14.7h.707l2.215-2.215A4.48 4.48 0 0 0 15.65 9c.027-.166.044-.332.051-.5a4.505 4.505 0 0 0-2-3.74V2.5l-.5-.5zm-.5 2.259A4.504 4.504 0 0 0 11.2 4a.5.5 0 1 0 0 1 3.5 3.5 0 0 1 1.5.338v2.138L8.775 11.4a.506.506 0 0 0-.217.217l-2.022 2.022-4.475-4.476L8.224 3H12.7v1.259zm1 1.792a3.5 3.5 0 0 1 1 2.449 3.438 3.438 0 0 1-.051.5 3.487 3.487 0 0 1-4.793 2.735l3.698-3.698.146-.354V6.051z"/></svg>',
    chevron: SVG + '<path fill-rule="evenodd" clip-rule="evenodd" d="M7.976 10.072l4.357-4.357.62.618L8.284 11h-.618L3 6.333l.619-.618 4.357 4.357z"/></svg>',
    collapseAll: SVG + '<path d="M9 9H4v1h5V9z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M5 3l1-1h7l1 1v7l-1 1h-2v2l-1 1H3l-1-1V6l1-1h2V3zm1 2h4l1 1v4h2V3H6v2zm4 1H3v7h7V6z"/></svg>',
    expandAll: SVG + '<path d="M9 9H4v1h5V9z"/><path d="M7 12V7H6v5h1z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M5 3l1-1h7l1 1v7l-1 1h-2v2l-1 1H3l-1-1V6l1-1h2V3zm1 2h4l1 1v4h2V3H6v2zm4 1H3v7h7V6z"/></svg>'
  };

  window.addEventListener('message', function (event) {
    var message = event.data;
    if (!message || message.type !== 'state') { return; }
    state = message;
    sort.value = message.sort;
    syncDepth(message.pathGroupDepth);
    syncCollapse(message.collapsedGroups);
    render();
  });

  search.addEventListener('input', function () { render(); });
  sort.addEventListener('change', function () {
    vscode.postMessage({ type: 'setSort', sort: sort.value });
  });
  depth.addEventListener('change', function () {
    vscode.postMessage({ type: 'setGroupDepth', depth: Number(depth.value) });
  });
  collapseAll.addEventListener('click', function () {
    var groups = state.groups || [];
    var expand = !anyExpanded();
    for (var i = 0; i < groups.length; i++) {
      collapsed[groups[i].key] = !expand;
    }
    persistCollapsed();
    render();
  });

  function anyExpanded() {
    var groups = state.groups || [];
    for (var i = 0; i < groups.length; i++) {
      if (!collapsed[groups[i].key]) { return true; }
    }
    return false;
  }

  function updateCollapseButton() {
    var expand = !anyExpanded();
    collapseAll.innerHTML = expand ? ICONS.expandAll : ICONS.collapseAll;
    var label = expand ? state.strings.expandAll : state.strings.collapseAll;
    collapseAll.title = label || '';
    collapseAll.setAttribute('aria-label', label || '');
  }

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

  function syncCollapse(persisted) {
    var def = !!state.collapseGroups;
    var groups = state.groups || [];
    for (var i = 0; i < groups.length; i++) {
      var key = groups[i].key;
      if (persisted && Object.prototype.hasOwnProperty.call(persisted, key)) {
        collapsed[key] = !!persisted[key];
      } else if (collapsed[key] === undefined) {
        collapsed[key] = def;
      }
    }
  }

  function persistCollapsed() {
    vscode.postMessage({ type: 'setCollapsed', collapsed: collapsed });
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
    head.appendChild(title);

    var actions = el('div', 'card-actions');
    actions.appendChild(iconButton(ICONS.open, state.strings.open, function () { post('open', project.id); }));
    actions.appendChild(iconButton(ICONS.openNew, state.strings.openNewWindow, function () { post('openNewWindow', project.id); }));
    actions.appendChild(iconButton(ICONS.reveal, state.strings.reveal, function () { post('reveal', project.id); }));
    actions.appendChild(iconButton(ICONS.copy, state.strings.copyPath, function () { post('copyPath', project.id); }));
    actions.appendChild(iconButton(project.pinned ? ICONS.pinned : ICONS.pin, project.pinned ? state.strings.unpin : state.strings.pin, function () { post('togglePin', project.id); }, project.pinned));
    actions.appendChild(iconButton(ICONS.tags, state.strings.tags, function () { post('editTags', project.id); }));
    head.appendChild(actions);
    card.appendChild(head);

    if (state.showGitStatus && project.git) {
      card.appendChild(gitLine(project.git));
      if (project.git.lastCommit) {
        var commit = el('div', 'commit');
        commit.appendChild(el('span', 'commit-subject', project.git.lastCommit.subject));
        commit.appendChild(el('span', 'commit-time', '\\u00B7 ' + relative(project.git.lastCommit.date)));
        card.appendChild(commit);
      }
    }

    if (project.tags && project.tags.length) {
      var foot = el('div', 'card-foot');
      var tags = el('div', 'card-tags');
      for (var i = 0; i < project.tags.length; i++) {
        tags.appendChild(el('span', 'tag', project.tags[i]));
      }
      foot.appendChild(tags);
      card.appendChild(foot);
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
      persistCollapsed();
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
    updateCollapseButton();
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
