// HtmlViewer.js — Browser Reader Mode (1.5): no iframe, no proxy
// External pages: fetch + extract text, render as local DOM (scripts stripped).
// Only CORS-permitting sites render; rest → blocked page with Open in Chrome.
// Local /Home files + cinmin:// pages render sanitized, offline.
// "Embed view" keeps the old iframe as an opt-in fallback (respects X-Frame-Options).

import { fs } from '../core/FileSystem.js';
import { notifier } from '../core/NotificationManager.js';
import { sanitizeHtml, fetchReader } from '../core/BrowserEngine.js';
import { toScript } from '../core/FancyText.js';
// Note: iframe embed kept only as opt-in fallback (🖼 button), never the default.
// Headings render in 𝓥𝓸𝓲𝓬𝓮𝓞𝓿𝓮𝓻 script style; body text stays readable.
import { storage } from '../core/Storage.js';

const BOOKMARK_KEY = 'cinmin:bookmarks';
function loadBookmarks() { const v = storage.get(BOOKMARK_KEY, []); return Array.isArray(v) ? v : []; }
function saveBookmarks(b) { storage.set(BOOKMARK_KEY, b); }

function normalizeUrl(input) {
  const t = input.trim();
  if (!t) return null;
  if (t.startsWith('cinmin://') || t.startsWith('/')) return t;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(t) && !t.includes(' ')) return 'https://' + t;
  return `https://duckduckgo.com/?q=${encodeURIComponent(t)}`;
}

const INTERNAL = {
  'cinmin://home': () => ({ title: 'Home', html: '<h2>◈ Cinmin Home</h2><p>Welcome to Cinmin Browser — Reader Mode, no iframes.</p><p>Try: <b>example.com</b> or <b>/Home/index.html</b></p>' }),
  'cinmin://error': () => ({ title: 'Error', html: '<h2>Unable to load page</h2><p>Press reload to retry.</p>' }),
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function createHtmlViewerContent(initialPath = null) {
  const wrap = document.createElement('div');
  wrap.className = 'htmlviewer';
  wrap.innerHTML = `
    <div class="browser-toolbar">
      <button class="b-btn" data-action="back" title="Back">←</button>
      <button class="b-btn" data-action="forward" title="Forward">→</button>
      <button class="b-btn" data-action="reload" title="Reload">↻</button>
      <div class="browser-address">
        <span class="addr-icon">📖</span>
        <input class="addr-input" placeholder="example.com or /Home/index.html" aria-label="Address bar" />
        <span class="engine-badge" title="Engine">Reader</span>
      </div>
      <button class="b-btn" data-action="embed" title="Embed view (iframe fallback)">🖼</button>
      <button class="b-btn" data-action="bookmark" title="Bookmark">☆</button>
      <button class="b-btn" data-action="bookmarks" title="Bookmarks">☰</button>
      <button class="b-btn" data-action="home" title="Home">⌂</button>
    </div>
    <div class="browser-viewport">
      <div class="reader-view"></div>
      <div class="browser-placeholder">
        <div style="font-size:32px">📖</div>
        <div><b>𝓒𝓲𝓷𝓶𝓲𝓷 𝓑𝓻𝓸𝔀𝓼𝓮𝓻</b> <small style="opacity:0.6">Reader Mode</small></div>
        <div class="hint">Try: <code>example.com</code>, <code>hello world</code> (search), or <code>/Home/index.html</code></div>
        <div class="hint" style="opacity:0.7">Pages render as text — no iframes, no proxy. Sites blocking CORS show a fallback.</div>
      </div>
      <div class="browser-error hidden"></div>
      <div class="browser-blocked hidden">
        <div class="blocked-icon">🚫</div>
        <div><b>Can't read this page</b></div>
        <div class="hint blocked-reason">This site blocks cross-origin reading.</div>
        <div class="hint"><a class="blocked-link" target="_blank" rel="noopener">Open in Chrome</a></div>
        <button class="b-btn blocked-retry">Retry</button>
      </div>
      <div class="browser-bookmarks hidden"></div>
    </div>
    <div class="browser-status">Ready — Reader Mode</div>
  `;

  const input = wrap.querySelector('.addr-input');
  const reader = wrap.querySelector('.reader-view');
  const placeholder = wrap.querySelector('.browser-placeholder');
  const errorEl = wrap.querySelector('.browser-error');
  const blockedEl = wrap.querySelector('.browser-blocked');
  const blockedLink = wrap.querySelector('.blocked-link');
  const blockedReason = wrap.querySelector('.blocked-reason');
  const statusEl = wrap.querySelector('.browser-status');
  const bookmarksPanel = wrap.querySelector('.browser-bookmarks');

  let bookmarks = loadBookmarks();
  let historyStack = [];
  let forwardStack = [];
  let current = null;
  let embedMode = false;

  function setStatus(m) { statusEl.textContent = m; }
  function showView(which) {
    reader.style.display = which === 'reader' ? 'block' : 'none';
    placeholder.style.display = which === 'placeholder' ? 'flex' : 'none';
    if (which !== 'error') errorEl.classList.add('hidden');
    if (which !== 'blocked') blockedEl.classList.add('hidden');
  }
  function showError(msg) {
    errorEl.textContent = msg; errorEl.classList.remove('hidden');
    blockedEl.classList.add('hidden');
    reader.style.display = 'none'; placeholder.style.display = 'none';
  }
  function showBlocked(url, reason) {
    blockedEl.classList.remove('hidden');
    errorEl.classList.add('hidden');
    reader.style.display = 'none'; placeholder.style.display = 'none';
    blockedLink.href = url; blockedLink.textContent = url;
    if (reason) blockedReason.textContent = reason;
    setStatus(`Blocked: ${url}`);
  }
  const clearOverlays = () => { errorEl.classList.add('hidden'); blockedEl.classList.add('hidden'); bookmarksPanel.classList.add('hidden'); };

  function scriptHeadings(root) {
    root.querySelectorAll('h1, h2, h3').forEach(h => {
      if (!h.dataset.fancy) { h.textContent = toScript(h.textContent); h.dataset.fancy = '1'; }
    });
  }

  function renderReaderDoc(title, html) {
    reader.innerHTML = `<article class="reader-doc"><h1 class="reader-title"></h1><div class="reader-body"></div></article>`;
    reader.querySelector('.reader-title').textContent = toScript(title);
    // sanitized HTML only (scripts/handlers stripped by sanitizeHtml)
    reader.querySelector('.reader-body').innerHTML = html;
    scriptHeadings(reader);
    // links open through Cinmin (fetch) instead of navigating away
    reader.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (href.startsWith('#')) return;
        load(href.startsWith('/') && !href.startsWith('/Home') ? href : href);
      });
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener');
    });
  }

  function renderExtracted(title, paragraphs, links, url) {
    reader.innerHTML = `<article class="reader-doc"><h1 class="reader-title"></h1><div class="reader-meta"></div><div class="reader-body"></div><div class="reader-links"></div></article>`;
    reader.querySelector('.reader-title').textContent = toScript(title);
    reader.querySelector('.reader-meta').textContent = url;
    const body = reader.querySelector('.reader-body');
    paragraphs.forEach(p => {
      const isHead = p.tag.startsWith('h');
      const el = document.createElement(isHead ? p.tag : p.tag === 'li' ? 'li' : 'p');
      el.textContent = isHead ? toScript(p.text) : p.text;
      body.appendChild(el);
    });
    if (links.length) {
      const box = reader.querySelector('.reader-links');
      const h = document.createElement('h3'); h.textContent = 'Links'; box.appendChild(h);
      links.forEach(l => {
        const a = document.createElement('a');
        a.href = l.href; a.textContent = l.text; a.target = '_blank'; a.rel = 'noopener';
        a.style.display = 'block';
        a.addEventListener('click', (e) => { e.preventDefault(); load(l.href); });
        box.appendChild(a);
      });
    }
  }

  async function load(pathOrUrl, pushHistory = true) {
    if (!pathOrUrl) return;
    const raw = pathOrUrl.trim();
    clearOverlays();

    // FS file → sanitized local render (offline, no network)
    if (raw.startsWith('/Home') || raw.startsWith('/')) {
      let fsPath = raw;
      const folder = fs._getFolder(fsPath);
      if (folder) {
        if (folder.children['index.html']) fsPath = fsPath.replace(/\/$/, '') + '/index.html';
        else { showError(`Folder has no index.html: ${fsPath}`); return; }
      }
      const res = fs.readFile(fsPath);
      if (!res.ok) { showError(`${res.error}: ${fsPath}`); setStatus(`Not found: ${fsPath}`); return; }
      if (pushHistory && current) { historyStack.push(current); forwardStack = []; }
      current = fsPath; input.value = fsPath;
      showView('reader');
      const clean = sanitizeHtml(res.content);
      renderReaderDoc(clean.title || fsPath.split('/').pop(), clean.body || '<p><i>Empty file</i></p>');
      setStatus(`Loaded ${fsPath} — ${res.content.length} bytes`);
      return;
    }

    // internal pages
    if (raw.startsWith('cinmin://')) {
      const page = INTERNAL[raw];
      if (!page) { showError(`Unknown page: ${raw}`); return; }
      if (pushHistory && current) { historyStack.push(current); forwardStack = []; }
      current = raw; input.value = raw;
      showView('reader');
      const { title, html } = page();
      renderReaderDoc(title, html);
      setStatus(`Loaded ${raw}`);
      return;
    }

    // relative .html name → FS
    if (raw.endsWith('.html') && !raw.includes(' ') && !raw.includes('.com')) {
      return load('/Home/' + raw, pushHistory);
    }

    // external → Reader fetch (no iframe, no proxy)
    const url = normalizeUrl(raw);
    if (pushHistory && current) { historyStack.push(current); forwardStack = []; }
    current = url; input.value = url;
    showView('reader');
    reader.innerHTML = `<div class="reader-loading">Loading…</div>`;
    setStatus(`Loading ${url}…`);
    const res = await fetchReader(url);
    if (!res.ok) { showBlocked(url, res.error); return; }
    renderExtracted(res.title, res.paragraphs, res.links, url);
    setStatus(`Done — ${res.title.slice(0, 60)}`);
  }

  function goBack() {
    if (!historyStack.length) return;
    forwardStack.push(current);
    load(historyStack.pop(), false);
  }
  function goForward() {
    if (!forwardStack.length) return;
    historyStack.push(current);
    load(forwardStack.pop(), false);
  }

  wrap.querySelector('[data-action="back"]').addEventListener('click', goBack);
  wrap.querySelector('[data-action="forward"]').addEventListener('click', goForward);
  wrap.querySelector('[data-action="reload"]').addEventListener('click', () => { if (current) load(current, false); });
  wrap.querySelector('[data-action="home"]').addEventListener('click', () => load('cinmin://home'));
  wrap.querySelector('[data-action="embed"]').addEventListener('click', () => {
    // opt-in iframe fallback for the current URL
    const url = current;
    if (!url || !/^https?:\/\//i.test(url)) { notifier.info('Open a website first, then use Embed view.', 'Browser'); return; }
    embedMode = true;
    reader.innerHTML = `<iframe class="browser-frame" sandbox="allow-scripts allow-forms allow-same-origin" title="embed" src="${escapeHtml(url)}" style="width:100%;height:100%;border:none;background:white;min-height:300px"></iframe>`;
    notifier.info('Embed view — respects X-Frame-Options, may be blank.', 'Browser');
  });
  wrap.querySelector('[data-action="bookmark"]').addEventListener('click', () => {
    if (!current) { notifier.error('Nothing to bookmark', 'Browser'); return; }
    if (bookmarks.includes(current)) { notifier.success('Already bookmarked', 'Browser'); return; }
    bookmarks.unshift(current); bookmarks = bookmarks.slice(0, 20); saveBookmarks(bookmarks);
    notifier.success(`Bookmarked ${current}`, 'Browser'); renderBookmarks();
  });
  wrap.querySelector('[data-action="bookmarks"]').addEventListener('click', () => {
    bookmarksPanel.classList.toggle('hidden'); renderBookmarks();
  });
  wrap.querySelector('.blocked-retry')?.addEventListener('click', () => { if (current) load(current, false); });

  function renderBookmarks() {
    bookmarksPanel.innerHTML = '<div class="bm-title">Bookmarks</div>';
    if (!bookmarks.length) { bookmarksPanel.innerHTML += '<div class="hint" style="padding:8px; opacity:0.6">No bookmarks — ☆ to add.</div>'; return; }
    bookmarks.forEach((bm, i) => {
      const r = document.createElement('div'); r.className = 'bm-row';
      r.innerHTML = `<button class="bm-go"></button><button class="bm-del" title="Remove">×</button>`;
      r.querySelector('.bm-go').textContent = bm;
      r.querySelector('.bm-go').addEventListener('click', () => { bookmarksPanel.classList.add('hidden'); load(bm); });
      r.querySelector('.bm-del').addEventListener('click', () => { bookmarks.splice(i, 1); saveBookmarks(bookmarks); renderBookmarks(); });
      bookmarksPanel.appendChild(r);
    });
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (!v) return;
      if (v.startsWith('/Home') && fs.exists(v)) load(v);
      else load(v);
    }
  });

  if (!fs.exists('/Home/index.html')) {
    fs.createFile('/Home', 'index.html', `<!doctype html><html><head><meta charset="utf-8"><title>Cinmin</title><style>body{font-family:Inter;padding:32px;max-width:700px;margin:auto;background:#f8fafc;color:#1a1f3d}h1{color:#7c3aed}</style></head><body><h1>Welcome to Cinmin</h1><p>Browser Reader Mode — no iframes.</p></body></html>`);
  }
  if (initialPath) load(initialPath, false);
  else { reader.style.display = 'none'; }
  wrap._load = load;
  return wrap;
}
