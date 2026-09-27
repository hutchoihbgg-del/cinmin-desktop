// HtmlViewer.js — Browser 1.0 via BrowserEngine abstraction

import { fs } from '../core/FileSystem.js';
import { notifier } from '../core/NotificationManager.js';
import { createBrowserView, getEngineType, isNativeAvailable } from '../core/BrowserEngine.js';
import { storage } from '../core/Storage.js';

const BOOKMARK_KEY = 'cinmin:bookmarks';
function loadBookmarks() { const v = storage.get(BOOKMARK_KEY, []); return Array.isArray(v) ? v : []; }
function saveBookmarks(b) { storage.set(BOOKMARK_KEY, b); }

export function createHtmlViewerContent(initialPath = null) {
  const wrap = document.createElement('div');
  wrap.className = 'htmlviewer';
  wrap.innerHTML = `
    <div class="browser-toolbar">
      <button class="b-btn" data-action="back" title="Back">←</button>
      <button class="b-btn" data-action="forward" title="Forward">→</button>
      <button class="b-btn" data-action="reload" title="Reload">↻</button>
      <button class="b-btn" data-action="stop" title="Stop">×</button>
      <div class="browser-address">
        <span class="addr-icon">🌐</span>
        <input class="addr-input" placeholder="example.com or /Home/index.html" aria-label="Address bar" />
        <span class="engine-badge" title="Engine">${getEngineType()}</span>
      </div>
      <button class="b-btn" data-action="bookmark" title="Bookmark">☆</button>
      <button class="b-btn" data-action="bookmarks" title="Bookmarks">☰</button>
      <button class="b-btn" data-action="home" title="Home">⌂</button>
    </div>
    <div class="browser-viewport">
      <div class="browser-engine-host"></div>
      <div class="browser-placeholder">
        <div style="font-size:32px">🌐</div>
        <div><b>Cinmin Browser</b> <small style="opacity:0.6">(${getEngineType()})</small></div>
        <div class="hint">Try: <code>example.com</code> → <code>https://example.com</code>, or <code>hello world</code> → search</div>
        ${isNativeAvailable() ? '' : '<div class="hint" style="opacity:0.7">Web Fallback: iframe (respects X-Frame-Options/CSP)</div>'}
        <div class="engine-note ${isNativeAvailable() ? 'hidden' : ''}" style="margin-top:10px; padding:10px; background:#1e1b2e; border-radius:8px; font-size:11px; color:#c4b5fd">
          Native engine unavailable in this build.<br>
          <button class="b-btn" data-action="useFallback">Use Web Fallback</button>
        </div>
      </div>
      <div class="browser-error hidden"></div>
      <div class="browser-blocked hidden">
        <div class="blocked-icon">🚫</div>
        <div><b>Cannot display this page</b></div>
        <div class="hint">Site blocks embedding (X-Frame-Options/CSP).</div>
        <div class="hint"><a class="blocked-link" target="_blank" rel="noopener">Open in new tab</a></div>
        <button class="b-btn blocked-retry">Retry</button>
      </div>
      <div class="browser-bookmarks hidden"></div>
    </div>
    <div class="browser-status">Ready — ${getEngineType()}</div>
  `;

  const input = wrap.querySelector('.addr-input');
  const host = wrap.querySelector('.browser-engine-host');
  const placeholder = wrap.querySelector('.browser-placeholder');
  const errorEl = wrap.querySelector('.browser-error');
  const blockedEl = wrap.querySelector('.browser-blocked');
  const blockedLink = wrap.querySelector('.blocked-link');
  const statusEl = wrap.querySelector('.browser-status');
  const bookmarksPanel = wrap.querySelector('.browser-bookmarks');

  let bookmarks = loadBookmarks();
  // per-instance history is handled by engine + also local FS history
  let current = null;

  // create engine view
  const engine = createBrowserView(host, (msg, state) => {
    statusEl.textContent = msg;
    wrap.querySelectorAll('.b-btn[data-action="reload"]')[0]?.classList.toggle('loading', state==='loading');
  });

  // if native, show fallback button behavior
  const fallbackBtn = wrap.querySelector('[data-action="useFallback"]');
  if (fallbackBtn) fallbackBtn.addEventListener('click', () => {
    placeholder.classList.add('hidden');
    host.style.display='block';
    errorEl.classList.add('hidden');
    blockedEl.classList.add('hidden');
  });

  function setStatus(m){ statusEl.textContent = m; }
  function showError(msg){
    errorEl.textContent = msg; errorEl.classList.remove('hidden');
    blockedEl.classList.add('hidden');
    host.style.display='none'; placeholder.style.display='none';
  }
  function showBlocked(url){
    blockedEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    host.style.display='none'; placeholder.style.display='none';
    blockedLink.href=url; blockedLink.textContent=url;
    setStatus(`Blocked: ${url}`);
  }
  const clearOverlays = () => { errorEl.classList.add('hidden'); blockedEl.classList.add('hidden'); bookmarksPanel.classList.add('hidden'); };

  // FS handling stays in HtmlViewer, external http goes via engine
  function isFsPath(s){ return s.startsWith('/Home') || s.startsWith('/'); }
  function isInternal(s){ return s.startsWith('cinmin://'); }

  function load(pathOrUrl, pushHistory = true){
    if(!pathOrUrl) return;
    const raw = pathOrUrl.trim();
    clearOverlays();
    // FS file
    if(isFsPath(raw) || (raw.endsWith('.html') && !raw.includes(' ') && !raw.includes('.com'))){
      let fsPath = raw;
      if(!fsPath.startsWith('/')) fsPath='/Home/'+fsPath;
      const folder=fs._getFolder(fsPath);
      if(folder){
        if(folder.children['index.html']) fsPath=fsPath.replace(/\/$/,'')+'/index.html';
        else { showError(`Folder has no index.html: ${fsPath}`); return; }
      }
      const res=fs.readFile(fsPath);
      if(!res.ok){ showError(`${res.error}: ${fsPath}`); setStatus(`Not found: ${fsPath}`); return; }
      placeholder.style.display='none'; host.style.display='block';
      // for FS we directly use engine iframe if web, or show via engine host
      const frame = host.querySelector('iframe');
      if(frame){
        frame.style.display='block';
        frame.removeAttribute('src');
        frame.srcdoc = res.content || '<html><body style="padding:20px;opacity:0.6">Empty</body></html>';
      } else {
        // fallback host without iframe yet (native placeholder) — create simple viewer
        host.innerHTML = `<iframe class="browser-frame" sandbox="allow-scripts allow-forms allow-same-origin" srcdoc="${res.content.replace(/"/g,'&quot;')}"></iframe>`;
      }
      current=fsPath; input.value=fsPath; setStatus(`Loaded ${fsPath} — ${res.content.length} bytes`);
      return;
    }
    // internal cinmin://
    if(isInternal(raw)){
      placeholder.style.display='none'; host.style.display='block';
      engine.navigate(raw);
      current=raw; input.value=raw;
      return;
    }
    // external -> via engine (handles normalize + history + CSP respect)
    placeholder.style.display='none'; host.style.display='block';
    engine.navigate(raw);
    current = raw; // engine will normalize
    input.value = raw;
    // after navigate, check blocked after delay (web fallback)
    setTimeout(()=>{
      const frame = host.querySelector('iframe');
      if(frame && frame.src && frame.src.startsWith('http')){
        try{
          const doc = frame.contentDocument;
          if(!doc || !doc.body || doc.body.innerHTML.trim()==='') {
            // could be blocked, but don't false positive for cross-origin (throws)
          }
        } catch {
          // cross-origin with successful load throws — assume ok
        }
      }
    }, 2600);
  }

  // toolbar wiring — back/forward/reload/stop via engine
  wrap.querySelector('[data-action="back"]').addEventListener('click', ()=> engine.back());
  wrap.querySelector('[data-action="forward"]').addEventListener('click', ()=> engine.forward());
  wrap.querySelector('[data-action="reload"]').addEventListener('click', ()=> engine.reload());
  wrap.querySelector('[data-action="stop"]').addEventListener('click', ()=> engine.stop());
  wrap.querySelector('[data-action="home"]').addEventListener('click', ()=> load('cinmin://home'));
  wrap.querySelector('[data-action="bookmark"]').addEventListener('click',()=>{
    const url = engine.getCurrentUrl() || current;
    if(!url){ notifier.error('Nothing to bookmark','Browser'); return; }
    if(bookmarks.includes(url)){ notifier.success('Already bookmarked','Browser'); return; }
    bookmarks.unshift(url); bookmarks=bookmarks.slice(0,20); saveBookmarks(bookmarks); notifier.success(`Bookmarked ${url}`,'Browser'); renderBookmarks();
  });
  wrap.querySelector('[data-action="bookmarks"]').addEventListener('click',()=>{
    bookmarksPanel.classList.toggle('hidden'); renderBookmarks();
  });
  wrap.querySelector('.blocked-retry')?.addEventListener('click',()=>{ if(current) load(current,false); });

  function renderBookmarks(){
    bookmarksPanel.innerHTML='<div class="bm-title">Bookmarks <small style="opacity:0.5">— cinmin://bookmarks</small></div>';
    if(bookmarks.length===0){ bookmarksPanel.innerHTML+='<div class="hint" style="padding:8px; opacity:0.6">No bookmarks — ☆ to add.</div>'; return; }
    bookmarks.forEach((bm,i)=>{
      const row=document.createElement('div'); row.className='bm-row';
      row.innerHTML=`<button class="bm-go">${bm}</button><button class="bm-del" title="Remove">×</button>`;
      row.querySelector('.bm-go').addEventListener('click',()=>{ bookmarksPanel.classList.add('hidden'); load(bm); });
      row.querySelector('.bm-del').addEventListener('click',()=>{ bookmarks.splice(i,1); saveBookmarks(bookmarks); renderBookmarks(); });
      bookmarksPanel.appendChild(row);
    });
  }

  input.addEventListener('keydown', e=>{ if(e.key==='Enter'){ const v=input.value.trim(); if(!v) return; // normalize search vs domain handled by engine
      // if FS path exists, treat as FS
      if(v.startsWith('/Home') && fs.exists(v)) load(v);
      else load(v);
    } });

  // seed welcome
  if(!fs.exists('/Home/index.html')){
    fs.createFile('/Home','index.html', `<!doctype html><html><head><meta charset="utf-8"><title>Cinmin</title><style>body{font-family:Inter;padding:32px;max-width:700px;margin:auto;background:#f8fafc;color:#1a1f3d}h1{color:#7c3aed}</style></head><body><h1>◈ Welcome to Cinmin 1.0</h1><p>Browser now uses BrowserEngine abstraction.</p></body></html>`);
  }
  if(initialPath) load(initialPath,false);
  else {
    const hostFrame = host.querySelector('iframe');
    if(hostFrame) hostFrame.style.display='none';
  }
  wrap._load = load;
  wrap._engine = engine;
  return wrap;
}
