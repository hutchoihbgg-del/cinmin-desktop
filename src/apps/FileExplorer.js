// FileExplorer.js — file browser using shared fs (polished for 0.2)

import { fs } from '../core/FileSystem.js';

export function createFileExplorerContent() {
  const wrap = document.createElement('div');
  wrap.className = 'explorer';
  wrap.innerHTML = `
    <div class="explorer-toolbar">
      <button class="exp-btn" data-action="back" title="Back">←</button>
      <button class="exp-btn" data-action="forward" title="Forward">→</button>
      <button class="exp-btn" data-action="up" title="Up">↑</button>
      <div class="breadcrumbs"></div>
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
  const breadcrumbsEl = wrap.querySelector('.breadcrumbs');
  const backBtn = wrap.querySelector('[data-action="back"]');
  const fwdBtn = wrap.querySelector('[data-action="forward"]');

  let currentPath = '/Home';
  const backStack = [];
  const forwardStack = [];

  function updateNavButtons() {
    backBtn.disabled = backStack.length === 0;
    fwdBtn.disabled = forwardStack.length === 0;
    backBtn.style.opacity = backBtn.disabled ? '0.4' : '1';
    fwdBtn.style.opacity = fwdBtn.disabled ? '0.4' : '1';
  }

  function renderBreadcrumbs() {
    const parts = currentPath.replace(/^\/+/, '').split('/').filter(Boolean);
    // ensure Home is first
    if (parts[0] !== 'Home') parts.unshift('Home');
    breadcrumbsEl.innerHTML = '';
    let acc = '';
    parts.forEach((part, idx) => {
      acc += '/' + part;
      const btn = document.createElement('button');
      btn.className = 'crumb';
      btn.textContent = part;
      const pathForBtn = acc;
      btn.addEventListener('click', () => navigate(pathForBtn));
      breadcrumbsEl.appendChild(btn);
      if (idx < parts.length - 1) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = '›';
        breadcrumbsEl.appendChild(sep);
      }
    });
  }

  function navigate(path, pushHistory = true) {
    if (!path.startsWith('/')) path = '/Home/' + path;
    // normalize double slashes
    path = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/Home';
    if (path === '') path = '/Home';
    // check existence: if file, open it; if folder, enter
    const exists = fs.exists(path);
    const folder = fs._getFolder(path);
    if (!exists && !folder) {
      status.textContent = `Not found: ${path}`;
      return;
    }
    const { node } = fs._resolve(path);
    if (node && node.type === 'file') {
      if (node.name.endsWith('.html') || node.name.endsWith('.htm')) {
        import('../core/EventBus.js').then(({ events }) => events.emit('html:open', path));
      } else {
        import('../core/EventBus.js').then(({ events }) => events.emit('file:open', path));
      }
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
    renderBreadcrumbs();
    updateNavButtons();
    const items = fs.list(currentPath);
    grid.innerHTML = '';
    // empty area right-click to create new
    grid.oncontextmenu = (e) => {
      if (e.target === grid) {
        e.preventDefault();
        showGridMenu(e.clientX, e.clientY);
      }
    };
    if (!items || items.length === 0) {
      grid.innerHTML = `<div class="empty">Empty folder — right-click to create</div>`;
      const empty = grid.querySelector('.empty');
      empty.addEventListener('contextmenu', (e) => { e.preventDefault(); showGridMenu(e.clientX, e.clientY); });
      status.textContent = `${currentPath} — 0 items`;
      return;
    }
    for (const item of items) {
      const el = document.createElement('button');
      el.className = 'file-item';
      const isHtml = item.name.endsWith('.html') || item.name.endsWith('.htm');
      const isText = item.name.endsWith('.txt') || item.name.endsWith('.md') || item.name.endsWith('.js') || item.name.endsWith('.json');
      const icon = item.type === 'folder' ? '📁' : isHtml ? '🌐' : '📄';
      el.innerHTML = `<span class="file-icon">${icon}</span><span class="file-name">${item.name}</span>`;
      el.addEventListener('click', () => {
        grid.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');
      });
      el.addEventListener('dblclick', () => {
        const next = currentPath.replace(/\/$/, '') + '/' + item.name;
        navigate(next);
      });
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        grid.querySelectorAll('.file-item').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');
        showFileMenu(e.clientX, e.clientY, item);
      });
      grid.appendChild(el);
    }
    status.textContent = `${currentPath} — ${items.length} item${items.length!==1?'s':''}`;
  }

  function showFileMenu(x, y, item) {
    closeMenus();
    const fullPath = currentPath.replace(/\/$/, '') + '/' + item.name;
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    const isFolder = item.type === 'folder';
    menu.innerHTML = `
      <button data-action="open">${isFolder ? '📂 Open' : '📄 Open'}</button>
      <div class="ctx-sep"></div>
      <button data-action="rename">✎ Rename</button>
      <button data-action="delete" class="danger">🗑 Delete</button>
      <div class="ctx-sep"></div>
      <button data-action="properties">ℹ Properties</button>
    `;
    document.body.appendChild(menu);
    clampMenu(menu);
    menu.querySelector('[data-action="open"]').addEventListener('click', () => { menu.remove(); navigate(fullPath); });
    menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
      menu.remove();
      const nn = prompt('New name:', item.name);
      if (nn && nn !== item.name) {
        const r = fs.rename(fullPath, nn);
        if (!r.ok) alert(r.error); else render();
      }
    });
    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
      menu.remove();
      if (confirm(`Delete "${item.name}"?`)) {
        const r = fs.delete(fullPath);
        if (!r.ok) alert(r.error); else render();
      }
    });
    menu.querySelector('[data-action="properties"]').addEventListener('click', () => {
      menu.remove();
      const node = fs._resolve(fullPath).node;
      const size = node.type === 'file' ? (node.content?.length || 0) + ' chars' : Object.keys(node.children).length + ' items';
      alert(`${item.name}\nType: ${item.type}\nPath: ${fullPath}\nSize: ${size}`);
    });
    setTimeout(() => {
      const h = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', h); } };
      document.addEventListener('click', h);
    }, 0);
  }

  function showGridMenu(x, y) {
    closeMenus();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.innerHTML = `
      <button data-action="newFolder">📁 New Folder</button>
      <button data-action="newFile">📄 New Text File</button>
      <div class="ctx-sep"></div>
      <button data-action="refresh">↻ Refresh</button>
    `;
    document.body.appendChild(menu);
    clampMenu(menu);
    menu.querySelector('[data-action="newFolder"]').addEventListener('click', () => {
      menu.remove();
      const name = prompt('Folder name:', 'New Folder');
      if (!name) return;
      const r = fs.createFolder(currentPath, name);
      if (!r.ok) alert(r.error); else render();
    });
    menu.querySelector('[data-action="newFile"]').addEventListener('click', () => {
      menu.remove();
      const name = prompt('File name:', 'untitled.txt');
      if (!name) return;
      const r = fs.createFile(currentPath, name, '');
      if (!r.ok) alert(r.error); else render();
    });
    menu.querySelector('[data-action="refresh"]').addEventListener('click', () => { menu.remove(); render(); });
    setTimeout(() => {
      const h = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', h); } };
      document.addEventListener('click', h);
    }, 0);
  }

  function clampMenu(menu) {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 8) + 'px';
    if (r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 8) + 'px';
  }
  function closeMenus() { document.querySelectorAll('.ctx-menu').forEach(el => el.remove()); }

  // toolbar
  backBtn.addEventListener('click', () => {
    if (!backStack.length) return;
    const prev = backStack.pop();
    forwardStack.push(currentPath);
    navigate(prev, false);
  });
  fwdBtn.addEventListener('click', () => {
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
  wrap.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); pathInput.focus(); pathInput.select(); }
  });

  render();

  wrap._refresh = render;
  wrap._navigate = navigate;

  return wrap;
}
