// HtmlViewer.js — Browser 0.5: history, bookmarks, blocked page

import { fs } from '../core/FileSystem.js';
import { notifier } from '../core/NotificationManager.js';

const BOOKMARK_KEY = 'cinmin:bookmarks';

function loadBookmarks() { try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY)||'[]'); } catch { return []; } }
function saveBookmarks(b) { localStorage.setItem(BOOKMARK_KEY, JSON.stringify(b)); }

export function createHtmlViewerContent(initialPath = null) {
  const wrap = document.createElement('div');
  wrap.className = 'htmlviewer';
  wrap.innerHTML = `
    <div class="browser-toolbar">
      <button class="b-btn" data-action="back" title="Back">←</button>
      <button class="b-btn" data-action="forward" title="Forward">→</button>
      <button class="b-btn" data-action="refresh" title="Reload">↻</button>
      <div class="browser-address">
        <span class="addr-icon">🌐</span>
        <input class="addr-input" placeholder="/Home/index.html or https://example.com" aria-label="Address bar" />
      </div>
      <button class="b-btn" data-action="bookmark" title="Bookmark">☆</button>
      <button class="b-btn" data-action="bookmarks" title="Bookmarks">☰</button>
      <button class="b-btn" data-action="openFs" title="Browse FS">📁</button>
      <button class="b-btn" data-action="edit" title="Edit in Notepad">📝</button>
    </div>
    <div class="browser-viewport">
      <iframe class="browser-frame" sandbox="allow-scripts allow-forms allow-same-origin" title="preview"></iframe>
      <div class="browser-placeholder">
        <div style="font-size:32px">🌐</div>
        <div><b>Cinmin Browser</b></div>
        <div class="hint">Enter a path like <code>/Home/index.html</code> or an external URL like <code>https://example.com</code></div>
        <div class="hint" style="margin-top:10px; opacity:0.7">External sites may block embedding — you'll see a graceful fallback.</div>
      </div>
      <div class="browser-error hidden"></div>
      <div class="browser-blocked hidden">
        <div class="blocked-icon">🚫</div>
        <div><b>Cannot display this page</b></div>
        <div class="hint">This site blocks embedding in iframes (X-Frame-Options / CSP).</div>
        <div class="hint">Try opening: <a class="blocked-link" target="_blank" rel="noopener">Open in new tab</a></div>
        <button class="b-btn blocked-retry">Retry</button>
      </div>
      <div class="browser-bookmarks hidden"></div>
    </div>
    <div class="browser-status">Ready</div>
  `;

  const input = wrap.querySelector('.addr-input');
  const frame = wrap.querySelector('.browser-frame');
  const placeholder = wrap.querySelector('.browser-placeholder');
  const errorEl = wrap.querySelector('.browser-error');
  const blockedEl = wrap.querySelector('.browser-blocked');
  const blockedLink = wrap.querySelector('.blocked-link');
  const statusEl = wrap.querySelector('.browser-status');
  const bookmarksPanel = wrap.querySelector('.browser-bookmarks');

  let historyStack = [];
  let forwardStack = [];
  let current = null;
  let bookmarks = loadBookmarks();

  function setStatus(msg) { statusEl.textContent = msg; }
  function showError(msg) {
    errorEl.textContent = msg; errorEl.classList.remove('hidden');
    blockedEl.classList.add('hidden');
    frame.style.display='none'; placeholder.style.display='none';
  }
  function showBlocked(url) {
    blockedEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    frame.style.display='none'; placeholder.style.display='none';
    blockedLink.href = url; blockedLink.textContent = url;
    setStatus(`Blocked: ${url}`);
  }
  const clearOverlays = () => { errorEl.classList.add('hidden'); blockedEl.classList.add('hidden'); bookmarksPanel.classList.add('hidden'); };

  function load(pathOrUrl, pushHistory = true) {
    if (!pathOrUrl) return;
    const url = pathOrUrl.trim();
    clearOverlays();

    if (/^https?:\/\//i.test(url)) {
      if (pushHistory && current) { historyStack.push(current); forwardStack=[]; }
      current = url; input.value=url;
      placeholder.style.display='none'; frame.style.display='block';
      frame.removeAttribute('srcdoc');
      frame.src = url;
      setStatus(`Loading ${url}…`);
      // detect blocked after timeout
      let loaded=false;
      frame.onload = () => { loaded=true; setStatus(`Loaded ${url}`); };
      setTimeout(()=>{
        if(!loaded){
          try{
            const doc = frame.contentDocument;
            if(!doc || doc.body.innerHTML.trim()==='') showBlocked(url);
          }catch{ /* cross-origin — assume loaded */ }
        }
      }, 2500);
      return;
    }

    let fsPath=url;
    if(!fsPath.startsWith('/')) fsPath='/Home/'+fsPath;
    const folder=fs._getFolder(fsPath);
    if(folder){
      if(folder.children['index.html']) fsPath=fsPath.replace(/\/$/,'')+'/index.html';
      else { showError(`Folder has no index.html: ${fsPath}`); return; }
    }
    const res=fs.readFile(fsPath);
    if(!res.ok){ showError(`${res.error}: ${fsPath}`); setStatus(`Not found: ${fsPath}`); return; }
    if(pushHistory && current){ historyStack.push(current); forwardStack=[]; }
    current=fsPath; input.value=fsPath;
    placeholder.style.display='none'; frame.style.display='block';
    frame.removeAttribute('src');
    frame.srcdoc=res.content || '<html><body style="font-family:sans-serif;padding:20px;opacity:0.6">Empty HTML file</body></html>';
    setStatus(`Loaded ${fsPath} — ${res.content.length} bytes`);
  }

  // toolbar
  wrap.querySelector('[data-action="back"]').addEventListener('click',()=>{
    if(!historyStack.length) return;
    forwardStack.push(current);
    load(historyStack.pop(), false);
  });
  wrap.querySelector('[data-action="forward"]').addEventListener('click',()=>{
    if(!forwardStack.length) return;
    historyStack.push(current);
    load(forwardStack.pop(), false);
  });
  wrap.querySelector('[data-action="refresh"]').addEventListener('click',()=>{ if(!current) return; load(current,false); });
  wrap.querySelector('[data-action="bookmark"]').addEventListener('click',()=>{
    if(!current) { notifier.error('Nothing to bookmark', 'Browser'); return; }
    if(bookmarks.includes(current)){ notifier.success('Already bookmarked', 'Browser'); return; }
    bookmarks.unshift(current); bookmarks=bookmarks.slice(0,20); saveBookmarks(bookmarks);
    notifier.success(`Bookmarked ${current}`, 'Browser');
    renderBookmarks();
  });
  wrap.querySelector('[data-action="bookmarks"]').addEventListener('click',()=>{
    bookmarksPanel.classList.toggle('hidden');
    renderBookmarks();
  });
  wrap.querySelector('.blocked-retry').addEventListener('click',()=>{ if(current) load(current,false); });
  wrap.querySelector('[data-action="openFs"]').addEventListener('click',()=>{
    const p=prompt('Enter FS path to open:', current && current.startsWith('/') ? current : '/Home/index.html');
    if(p) load(p);
  });
  wrap.querySelector('[data-action="edit"]').addEventListener('click', async ()=>{
    if(!current || !current.startsWith('/')) { alert('Open a local file first'); return; }
    const { events } = await import('../core/EventBus.js');
    events.emit('file:open', current);
  });

  function renderBookmarks(){
    bookmarksPanel.innerHTML='<div class="bm-title">Bookmarks</div>';
    if(bookmarks.length===0){ bookmarksPanel.innerHTML+='<div class="hint" style="padding:8px; opacity:0.6">No bookmarks yet — click ☆ to add.</div>'; return; }
    bookmarks.forEach((bm,i)=>{
      const row=document.createElement('div'); row.className='bm-row';
      row.innerHTML=`<button class="bm-go">${bm}</button><button class="bm-del" title="Remove">×</button>`;
      row.querySelector('.bm-go').addEventListener('click',()=>{ bookmarksPanel.classList.add('hidden'); load(bm); });
      row.querySelector('.bm-del').addEventListener('click',()=>{ bookmarks.splice(i,1); saveBookmarks(bookmarks); renderBookmarks(); });
      bookmarksPanel.appendChild(row);
    });
  }

  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') load(input.value); });

  if(!fs.exists('/Home/index.html')){
    fs.createFile('/Home', 'index.html', `<!doctype html>
<html><head><meta charset="utf-8"><title>Cinmin Welcome</title>
<style>body{font-family:Inter,sans-serif;padding:32px;max-width:700px;margin:auto;background:#f8fafc;color:#1a1f3d}h1{color:#7c3aed}.card{background:white;padding:20px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.08);margin:16px 0}code{background:#eee;padding:2px 6px;border-radius:4px}</style>
</head><body><h1>◈ Welcome to Cinmin</h1><div class="card"><p>This HTML is running <b>inside Cinmin Browser</b> from <code>/Home/index.html</code></p><button onclick="document.body.style.background='#e0e7ff';this.textContent='Clicked! 🎉'">Try me</button></div></body></html>`);
  }

  if(initialPath) load(initialPath, false); else frame.style.display='none';
  wrap._load=load;
  return wrap;
}
