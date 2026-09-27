// HtmlViewer.js — Cinmin Browser emulator for HTML files (Option A)
// Loads files from simulated FS via address bar (/Home/...) into sandboxed iframe

import { fs } from '../core/FileSystem.js';

export function createHtmlViewerContent(initialPath = null) {
  const wrap = document.createElement('div');
  wrap.className = 'htmlviewer';
  wrap.innerHTML = `
    <div class="browser-toolbar">
      <button class="b-btn" data-action="back" title="Back">←</button>
      <button class="b-btn" data-action="forward" title="Forward">→</button>
      <button class="b-btn" data-action="refresh" title="Refresh">↻</button>
      <div class="browser-address">
        <span class="addr-icon">🌐</span>
        <input class="addr-input" placeholder="/Home/index.html or https://example.com" />
      </div>
      <button class="b-btn" data-action="openFs" title="Browse FS">📁</button>
      <button class="b-btn" data-action="edit" title="Edit in Notepad">📝</button>
    </div>
    <div class="browser-viewport">
      <iframe class="browser-frame" sandbox="allow-scripts allow-forms allow-same-origin" title="preview"></iframe>
      <div class="browser-placeholder">
        <div style="font-size:32px">🌐</div>
        <div><b>Cinmin Browser</b></div>
        <div class="hint">Enter a path like <code>/Home/index.html</code> or <code>/Home/Documents/page.html</code><br>or an external URL like <code>https://example.com</code></div>
        <div class="hint" style="margin-top:10px; opacity:0.7">Tip: Create .html files in File Explorer or Notepad, then open them here.<br>External sites may block embedding.</div>
      </div>
      <div class="browser-error hidden"></div>
    </div>
    <div class="browser-status">Ready</div>
  `;

  const input = wrap.querySelector('.addr-input');
  const frame = wrap.querySelector('.browser-frame');
  const placeholder = wrap.querySelector('.browser-placeholder');
  const errorEl = wrap.querySelector('.browser-error');
  const statusEl = wrap.querySelector('.browser-status');

  let historyStack = [];
  let forwardStack = [];
  let current = null;

  function setStatus(msg) { statusEl.textContent = msg; }

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    frame.style.display = 'none';
    placeholder.style.display = 'none';
  }
  function clearError() {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
  }

  function load(pathOrUrl, pushHistory = true) {
    if (!pathOrUrl) return;
    const url = pathOrUrl.trim();
    clearError();

    // External URL
    if (/^https?:\/\//i.test(url)) {
      if (pushHistory && current) { historyStack.push(current); forwardStack = []; }
      current = url;
      input.value = url;
      placeholder.style.display = 'none';
      frame.style.display = 'block';
      frame.removeAttribute('srcdoc');
      frame.src = url;
      setStatus(`Loaded ${url}`);
      return;
    }

    // FS path — normalize
    let fsPath = url;
    if (!fsPath.startsWith('/')) fsPath = '/Home/' + fsPath;
    // if folder, try index.html
    const folder = fs._getFolder(fsPath);
    if (folder) {
      if (folder.children['index.html']) fsPath = fsPath.replace(/\/$/, '') + '/index.html';
      else { showError(`Folder has no index.html: ${fsPath}`); return; }
    }
    const res = fs.readFile(fsPath);
    if (!res.ok) { showError(`${res.error}: ${fsPath}`); setStatus(`Not found: ${fsPath}`); return; }

    if (pushHistory && current) { historyStack.push(current); forwardStack = []; }
    current = fsPath;
    input.value = fsPath;
    placeholder.style.display = 'none';
    frame.style.display = 'block';
    // inject content via srcdoc — allows scripts/styles to run sandboxed
    frame.removeAttribute('src');
    frame.srcdoc = res.content || '<html><body style="font-family:sans-serif;padding:20px;opacity:0.6">Empty HTML file</body></html>';
    setStatus(`Loaded ${fsPath} — ${res.content.length} bytes`);
  }

  // toolbar actions
  wrap.querySelector('[data-action="back"]').addEventListener('click', () => {
    if (!historyStack.length) return;
    forwardStack.push(current);
    const prev = historyStack.pop();
    load(prev, false);
  });
  wrap.querySelector('[data-action="forward"]').addEventListener('click', () => {
    if (!forwardStack.length) return;
    historyStack.push(current);
    const nxt = forwardStack.pop();
    load(nxt, false);
  });
  wrap.querySelector('[data-action="refresh"]').addEventListener('click', () => {
    if (!current) return;
    load(current, false);
  });
  wrap.querySelector('[data-action="openFs"]').addEventListener('click', () => {
    const p = prompt('Enter FS path to open:', current && current.startsWith('/') ? current : '/Home/index.html');
    if (p) load(p);
  });
  wrap.querySelector('[data-action="edit"]').addEventListener('click', async () => {
    if (!current || !current.startsWith('/')) { alert('Open a local file first'); return; }
    const { events } = await import('../core/EventBus.js');
    events.emit('file:open', current);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') load(input.value);
  });

  // iframe error handling (external sites blocking embed won't throw, just stays empty)
  frame.addEventListener('load', () => {
    // if src was external and blocked, contentWindow may be cross-origin — ignore
  });

  // seed a welcome file if not exists
  if (!fs.exists('/Home/index.html')) {
    fs.createFile('/Home', 'index.html', `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Cinmin Welcome</title>
<style>body{font-family:Inter,sans-serif;padding:32px;max-width:700px;margin:auto;background:#f8fafc;color:#1a1f3d}h1{color:#7c6cff}.card{background:white;padding:20px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin:16px 0}code{background:#eee;padding:2px 6px;border-radius:4px}</style>
</head>
<body>
  <h1>◈ Welcome to Cinmin</h1>
  <div class="card">
    <p>This HTML is running <b>inside Cinmin Browser</b> from <code>/Home/index.html</code></p>
    <p>Edit it in Notepad or File Explorer, then refresh here.</p>
    <button onclick="document.body.style.background='#e0e7ff';this.textContent='Clicked! 🎉'">Try me</button>
  </div>
  <p>Address bar supports: <code>/Home/.../*.html</code> and <code>https://...</code></p>
</body>
</html>`);
  }

  if (initialPath) load(initialPath, false);
  else {
    // show placeholder until user navigates
    frame.style.display = 'none';
  }

  // expose for external open
  wrap._load = load;

  return wrap;
}
