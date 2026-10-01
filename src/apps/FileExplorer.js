// FileExplorer.js — 0.5: copy/cut/paste, properties, keyboard shortcuts

import { fs } from '../core/FileSystem.js';
import { notifier } from '../core/NotificationManager.js';
import { importFromPC, exportToPC, importDroppedFiles } from '../core/HostFiles.js';

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
      <button class="exp-btn" data-action="import" title="Import real files from this PC, one by one">⇪ Import</button>
      <button class="exp-btn" data-action="export" title="Download the selected file to this PC">⇩ Export</button>
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

  async function navigate(path, pushHistory = true) {
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
      // check plugin file associations first
      const ext = '.' + node.name.split('.').pop().toLowerCase();
      try {
        const { pluginManager } = await import('../core/PluginManager.js');
        const assoc = pluginManager.getFileAssoc(ext);
        if (assoc) {
          const { events } = await import('../core/EventBus.js');
          // for markdown, launch its app; fallback to notepad/html
          if (assoc.appId === 'markdown') {
            const { getApp } = await import('../core/AppRegistry.js');
            const app = getApp(assoc.appId);
            if (app) { events.emit('app:launch', assoc.appId); return; }
          }
        }
      } catch {}
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
        selectedName = item.name;
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

  let selectedName = null; // for keyboard shortcuts

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
      <button data-action="copy">⎘ Copy</button>
      <button data-action="cut">✂ Cut</button>
      <button data-action="export">⇩ Download to PC</button>
      <button data-action="rename">✎ Rename</button>
      <button data-action="delete" class="danger">🗑 Delete</button>
      <div class="ctx-sep"></div>
      <button data-action="properties">ℹ Properties</button>
    `;
    document.body.appendChild(menu);
    clampMenu(menu);
    menu.querySelector('[data-action="open"]').addEventListener('click', () => { menu.remove(); navigate(fullPath); });
    menu.querySelector('[data-action="copy"]').addEventListener('click', () => { fs.copy(fullPath); notifier.success(`Copied ${item.name}`, 'Files'); menu.remove(); render(); });
    menu.querySelector('[data-action="cut"]').addEventListener('click', () => { fs.cut(fullPath); notifier.success(`Cut ${item.name}`, 'Files'); menu.remove(); render(); });
    const exportBtn = menu.querySelector('[data-action="export"]');
    if (item.type !== 'folder') exportBtn.addEventListener('click', () => {
      menu.remove();
      const r = exportToPC(fullPath);
      if (!r.ok) { alert(r.error); notifier.error(r.error, 'Files'); }
      else notifier.success(`Downloaded ${r.name} to your PC`, 'Files');
    });
    else exportBtn.setAttribute('disabled', '');
    menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
      menu.remove();
      const nn = prompt('New name:', item.name);
      if (nn && nn !== item.name) {
        const r = fs.rename(fullPath, nn);
        if (!r.ok) { alert(r.error); notifier.error(r.error, 'Files'); } else { render(); notifier.success(`Renamed to ${nn}`, 'Files'); }
      }
    });
    menu.querySelector('[data-action="delete"]').addEventListener('click', () => {
      menu.remove();
      if (confirm(`Delete "${item.name}"?`)) {
        const r = fs.delete(fullPath);
        if (!r.ok) { alert(r.error); notifier.error(r.error, 'Files'); } else { render(); notifier.success(`Deleted ${item.name}`, 'Files'); }
      }
    });
    menu.querySelector('[data-action="properties"]').addEventListener('click', () => {
      menu.remove();
      const stat = fs.stat(fullPath);
      const details = stat.type === 'file'
        ? `Name: ${stat.name}\nType: File\nPath: ${fullPath}\nSize: ${stat.size} chars`
        : `Name: ${stat.name}\nType: Folder\nPath: ${fullPath}\nItems: ${stat.size}`;
      alert(details);
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
    const hasClip = !!fs.clipboard;
    menu.innerHTML = `
      <button data-action="newFolder">📁 New Folder</button>
      <button data-action="newFile">📄 New Text File</button>
      <button data-action="import">⇪ Import from PC</button>
      <div class="ctx-sep"></div>
      <button data-action="paste" ${hasClip ? '' : 'disabled'}>⎘ Paste ${hasClip ? `(${fs.clipboard.path.split('/').pop()})` : ''}</button>
      <div class="ctx-sep"></div>
      <button data-action="refresh">↻ Refresh</button>
      <button data-action="props">ℹ Properties</button>
    `;
    document.body.appendChild(menu);
    clampMenu(menu);
    menu.querySelector('[data-action="newFolder"]').addEventListener('click', () => {
      menu.remove();
      const name = prompt('Folder name:', 'New Folder');
      if (!name) return;
      const r = fs.createFolder(currentPath, name);
      if (!r.ok) { alert(r.error); notifier.error(r.error, 'Files'); } else { render(); notifier.success(`Created folder ${name}`, 'Files'); }
    });
    menu.querySelector('[data-action="newFile"]').addEventListener('click', () => {
      menu.remove();
      const name = prompt('File name:', 'untitled.txt');
      if (!name) return;
      const r = fs.createFile(currentPath, name, '');
      if (!r.ok) { alert(r.error); notifier.error(r.error, 'Files'); } else { render(); notifier.success(`Created ${name}`, 'Files'); }
    });
    const pasteBtn = menu.querySelector('[data-action="paste"]');
    if (hasClip) pasteBtn.addEventListener('click', () => {
      const r = fs.paste(currentPath);
      menu.remove();
      if (!r.ok) { alert(r.error); notifier.error(r.error, 'Files'); } else { render(); notifier.success(`Pasted ${r.name}`, 'Files'); }
    });
    menu.querySelector('[data-action="import"]').addEventListener('click', async () => {
      menu.remove();
      const r = await importFromPC(currentPath, { single: true });
      if (r.cancelled) { render(); return; }
      render();
      if (r.imported.length) notifier.success(`Imported ${r.imported[0]}`, 'Files');
      r.errors.forEach(err => notifier.error(err, 'Files'));
    });
    menu.querySelector('[data-action="refresh"]').addEventListener('click', () => { menu.remove(); render(); });
    menu.querySelector('[data-action="props"]').addEventListener('click', () => {
      menu.remove();
      const stat = fs.stat(currentPath);
      alert(`Path: ${currentPath}\nType: Folder\nItems: ${stat ? stat.size : 0}`);
    });
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
  // Import one file at a time: pick → import → ask for the next
  wrap.querySelector('[data-action="import"]').addEventListener('click', async () => {
    let count = 0;
    for (;;) {
      status.textContent = count === 0 ? 'Pick a file from your PC…' : `Imported ${count} — pick the next file…`;
      const r = await importFromPC(currentPath, { single: true });
      if (r.cancelled) break;
      render();
      r.errors.forEach(e => notifier.error(e, 'Files'));
      if (r.imported.length) {
        count += r.imported.length;
        notifier.success(`Imported ${r.imported[0]} (${count} so far)`, 'Files');
      } else if (r.errors.length) alert(r.errors.join('\n'));
      // one by one: stop unless the user wants another
      if (!confirm(`Imported ${r.imported[0] || 'nothing'}.\n\nImport another file?`)) break;
    }
    render();
    status.textContent = count ? `${currentPath} — imported ${count} file${count !== 1 ? 's' : ''} from PC` : currentPath;
  });
  // Export the selected file, one at a time
  wrap.querySelector('[data-action="export"]').addEventListener('click', () => {
    if (!selectedName) { alert('Select a file first, then Export.'); return; }
    const fullPath = currentPath.replace(/\/$/, '') + '/' + selectedName;
    const stat = fs.stat(fullPath);
    if (!stat || stat.type !== 'file') { alert('Select a file (not a folder) to export.'); return; }
    const r = exportToPC(fullPath);
    if (!r.ok) { alert(r.error); notifier.error(r.error, 'Files'); }
    else notifier.success(`Downloaded ${r.name} to your PC`, 'Files');
  });
  // OS drag-drop: drop real files from your PC straight into the folder
  grid.addEventListener('dragover', (e) => { e.preventDefault(); grid.classList.add('drag-over'); });
  grid.addEventListener('dragleave', () => grid.classList.remove('drag-over'));
  grid.addEventListener('drop', async (e) => {
    e.preventDefault();
    grid.classList.remove('drag-over');
    if (!e.dataTransfer?.files?.length) return;
    const r = await importDroppedFiles(e.dataTransfer.files, currentPath);
    render();
    if (r.imported.length) notifier.success(`Imported: ${r.imported.join(', ')}`, 'Files');
    r.errors.forEach(err => notifier.error(err, 'Files'));
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
    if (e.ctrlKey && e.key.toLowerCase() === 'c' && selectedName) { e.preventDefault(); const p=currentPath.replace(/\/$/,'')+'/'+selectedName; fs.copy(p); notifier.success(`Copied ${selectedName}`, 'Files'); }
    if (e.ctrlKey && e.key.toLowerCase() === 'x' && selectedName) { e.preventDefault(); const p=currentPath.replace(/\/$/,'')+'/'+selectedName; fs.cut(p); notifier.success(`Cut ${selectedName}`, 'Files'); render(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'v') { e.preventDefault(); const r=fs.paste(currentPath); if(!r.ok){ notifier.error(r.error,'Files'); } else { render(); notifier.success(`Pasted ${r.name}`,'Files'); } }
    if (e.key === 'Delete' && selectedName) { e.preventDefault(); const p=currentPath.replace(/\/$/,'')+'/'+selectedName; if(confirm(`Delete "${selectedName}"?`)){ const r=fs.delete(p); if(r.ok){ render(); selectedName=null; } } }
    if (e.key === 'F2' && selectedName) { e.preventDefault(); const p=currentPath.replace(/\/$/,'')+'/'+selectedName; const nn=prompt('New name:', selectedName); if(nn && nn!==selectedName){ const r=fs.rename(p,nn); if(r.ok) render(); } }
  });

  render();

  wrap._refresh = render;
  wrap._navigate = navigate;

  return wrap;
}
