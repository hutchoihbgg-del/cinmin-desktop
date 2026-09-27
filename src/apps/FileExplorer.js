// FileExplorer.js — file browser using shared fs

import { fs } from '../core/FileSystem.js';

export function createFileExplorerContent() {
  const wrap = document.createElement('div');
  wrap.className = 'explorer';
  wrap.innerHTML = `
    <div class="explorer-toolbar">
      <button class="exp-btn" data-action="back">←</button>
      <button class="exp-btn" data-action="forward">→</button>
      <button class="exp-btn" data-action="up">↑</button>
      <div class="pathbar"><input class="path-input" value="/Home" /></div>
      <button class="exp-btn" data-action="newFolder">+ Folder</button>
      <button class="exp-btn" data-action="newFile">+ File</button>
    </div>
    <div class="explorer-body">
      <div class="explorer-sidebar">
        <div class="side-title">Favorites</div>
        <button class="side-item" data-path="/Home">🏠 Home</button>
        <button class="side-item" data-path="/Home/Documents">📄 Documents</button>
        <button class="side-item" data-path="/Home/Downloads">📥 Downloads</button>
        <button class="side-item" data-path="/Home/Pictures">🖼 Pictures</button>
      </div>
      <div class="explorer-main">
        <div class="explorer-grid"></div>
        <div class="explorer-status"></div>
      </div>
    </div>
  `;

  const grid = wrap.querySelector('.explorer-grid');
  const status = wrap.querySelector('.explorer-status');
  const pathInput = wrap.querySelector('.path-input');

  let currentPath = '/Home';
  const backStack = [];
  const forwardStack = [];

  function navigate(path, pushHistory = true) {
    // normalize
    if (!path.startsWith('/')) path = '/Home/' + path;
    if (!fs.exists(path) && fs._getFolder(path) === null) {
      status.textContent = `Not found: ${path}`;
      return;
    }
    // if it's a file, try to open with notepad (emit)
    const { node } = fs._resolve(path);
    if (node && node.type === 'file') {
      // emit open file
      import('../core/EventBus.js').then(({ events }) => events.emit('file:open', path));
      return;
    }
    if (pushHistory && currentPath !== path) {
      backStack.push(currentPath);
      forwardStack.length = 0;
    }
    currentPath = path;
    pathInput.value = currentPath;
    render();
  }

  function render() {
    const items = fs.list(currentPath);
    grid.innerHTML = '';
    if (!items || items.length === 0) {
      grid.innerHTML = `<div class="empty">Empty folder</div>`;
      status.textContent = `${currentPath} — 0 items`;
      return;
    }
    for (const item of items) {
      const el = document.createElement('button');
      el.className = 'file-item';
      el.innerHTML = `<span class="file-icon">${item.type === 'folder' ? '📁' : '📄'}</span><span class="file-name">${item.name}</span>`;
      // click to select, dblclick to open
      el.addEventListener('dblclick', () => {
        const next = currentPath.replace(/\/$/, '') + '/' + item.name;
        navigate(next);
      });
      // context actions
      el.addEventListener('click', () => {
        grid.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');
      });

      // inline rename/delete via right-click menu (simple prompt)
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const choice = prompt(`Actions for "${item.name}":\nType: rename, delete, or cancel`);
        if (choice === 'delete') {
          const p = currentPath.replace(/\/$/, '') + '/' + item.name;
          const r = fs.delete(p);
          if (!r.ok) alert(r.error); else render();
        } else if (choice === 'rename') {
          const nn = prompt('New name:', item.name);
          if (nn && nn !== item.name) {
            const p = currentPath.replace(/\/$/, '') + '/' + item.name;
            const r = fs.rename(p, nn);
            if (!r.ok) alert(r.error); else render();
          }
        }
      });

      grid.appendChild(el);
    }
    status.textContent = `${currentPath} — ${items.length} item${items.length!==1?'s':''}`;
  }

  // toolbar
  wrap.querySelector('[data-action="back"]').addEventListener('click', () => {
    if (!backStack.length) return;
    const prev = backStack.pop();
    forwardStack.push(currentPath);
    navigate(prev, false);
  });
  wrap.querySelector('[data-action="forward"]').addEventListener('click', () => {
    if (!forwardStack.length) return;
    const nxt = forwardStack.pop();
    backStack.push(currentPath);
    navigate(nxt, false);
  });
  wrap.querySelector('[data-action="up"]').addEventListener('click', () => {
    const parent = fs.parentDir(currentPath);
    navigate(parent);
  });
  wrap.querySelector('[data-action="newFolder"]').addEventListener('click', () => {
    const name = prompt('Folder name:');
    if (!name) return;
    const r = fs.createFolder(currentPath, name);
    if (!r.ok) alert(r.error); else render();
  });
  wrap.querySelector('[data-action="newFile"]').addEventListener('click', () => {
    const name = prompt('File name (e.g. notes.txt):');
    if (!name) return;
    const r = fs.createFile(currentPath, name, '');
    if (!r.ok) alert(r.error); else render();
  });

  // sidebar
  wrap.querySelectorAll('.side-item').forEach(b => b.addEventListener('click', () => navigate(b.dataset.path)));

  // path bar
  pathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') navigate(pathInput.value);
    if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); pathInput.focus(); pathInput.select(); }
  });
  // allow Ctrl+L focus from window
  wrap.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); pathInput.focus(); pathInput.select(); }
  });

  // initial
  render();

  // expose navigate for terminal integration (listen for refresh)
  wrap._refresh = render;
  wrap._navigate = navigate;

  return wrap;
}
