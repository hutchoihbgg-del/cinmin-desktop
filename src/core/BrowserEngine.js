// BrowserEngine.js — abstraction for Cinmin Browser 1.0
// Web build: iframe fallback (no native binaries)
// Native build (Electron): real Chromium via BrowserView (requires electron runtime)
// Security: never bypass CSP/X-Frame-Options, no FS exposure to webpages

import { storage } from './Storage.js';
import { fs } from './FileSystem.js';

const HISTORY_KEY = 'cinmin:browser:history';

// Detect native engine availability (Electron or Tauri)
export function isNativeAvailable() {
  // Electron: window.require or process.versions.electron
  try {
    if (typeof window !== 'undefined' && window.__CINMIN_NATIVE__) return true;
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) return true;
    // Tauri check
    if (typeof window !== 'undefined' && window.__TAURI__) return true;
  } catch {}
  return false;
}

export function getEngineType() {
  return isNativeAvailable() ? 'Native' : 'Web Mode';
}

// Web Engine — iframe based (safe, respects X-Frame-Options)
class WebEngine {
  constructor(container, statusCb) {
    this.container = container;
    this.statusCb = statusCb || (() => {});
    this.history = storage.get(HISTORY_KEY, []);
    if (!Array.isArray(this.history)) this.history = [];
    this.currentUrl = null;
    this.historyStack = [];
    this.forwardStack = [];
    this.iframe = null;
    this._createIframe();
  }

  _createIframe() {
    const frame = document.createElement('iframe');
    frame.className = 'browser-frame';
    frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin');
    frame.setAttribute('title', 'browser');
    this.iframe = frame;
    this.container.appendChild(frame);
  }

  // Normalize URL: search -> search engine, bare domain -> https
  static normalize(input) {
    const t = input.trim();
    if (!t) return null;
    if (t.startsWith('cinmin://')) return t;
    if (/^https?:\/\//i.test(t)) return t;
    if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(t) && !t.includes(' ')) return 'https://' + t;
    // search term -> search engine
    const q = encodeURIComponent(t);
    return `https://duckduckgo.com/?q=${q}`;
  }

  navigate(raw) {
    const url = WebEngine.normalize(raw);
    if (!url) return;
    // handle internal pages
    if (url.startsWith('cinmin://')) {
      this._loadInternal(url);
      return;
    }
    // FS path already handled by caller (HtmlViewer checks /Home)
    if (url.startsWith('/') || url.startsWith('file://')) {
      // let caller handle FS — fallback
      this.currentUrl = url;
      return;
    }
    if (this.currentUrl) this.historyStack.push(this.currentUrl);
    this.forwardStack = [];
    this.currentUrl = url;
    this._pushHistory(url);
    this.statusCb('Loading...', 'loading');
    this.iframe.removeAttribute('srcdoc');
    this.iframe.src = url;
    // X-Frame-Options respected by browser — iframe will remain blank if blocked, caller shows blocked UI
    let loaded = false;
    const onload = () => { loaded = true; this.statusCb('Done', 'done'); this.iframe.removeEventListener('load', onload); };
    this.iframe.addEventListener('load', onload);
    setTimeout(() => {
      if (!loaded) {
        // leave to caller to detect blocked (HtmlViewer already does)
        this.statusCb('Done', 'done');
      }
    }, 3000);
  }

  _loadInternal(url) {
    const page = url.replace('cinmin://', '');
    const map = {
      'home': '<html><body style="font-family:Inter;padding:24px"><h2>◈ Cinmin Home</h2><p>Welcome to Cinmin Browser</p><p>Try: example.com or /Home/index.html</p></body></html>',
      'error': '<html><body style="font-family:Inter;padding:24px;color:#991b1b"><h2>Unable to load page</h2><button onclick="history.back()">Retry</button></body></html>',
      'history': this._renderHistoryPage(),
      'bookmarks': this._renderBookmarksPage(),
    };
    const html = map[page] || `<html><body style="padding:24px">Unknown internal page: ${page}</body></html>`;
    this.iframe.removeAttribute('src');
    this.iframe.srcdoc = html;
    this.currentUrl = url;
    this.statusCb('Done', 'done');
  }

  _renderHistoryPage() {
    const items = this.history.slice(0, 20).map(h => `<div><a href="${h.url}">${h.title || h.url}</a> <small>${new Date(h.ts).toLocaleString()}</small></div>`).join('');
    return `<html><body style="font-family:Inter;padding:16px"><h3>History</h3>${items || '<p>No history</p>'}</body></html>`;
  }
  _renderBookmarksPage() {
    return `<html><body style="padding:16px"><h3>Bookmarks — use ☆ in toolbar</h3></body></html>`;
  }

  _pushHistory(url) {
    this.history.unshift({ url, title: url, ts: Date.now() });
    this.history = this.history.slice(0, 100);
    storage.set(HISTORY_KEY, this.history);
  }

  back() {
    if (!this.canGoBack()) return;
    this.forwardStack.push(this.currentUrl);
    const prev = this.historyStack.pop();
    this.currentUrl = prev;
    this.iframe.src = prev;
    this.statusCb('Done', 'done');
  }
  forward() {
    if (!this.canGoForward()) return;
    this.historyStack.push(this.currentUrl);
    const nxt = this.forwardStack.pop();
    this.currentUrl = nxt;
    this.iframe.src = nxt;
    this.statusCb('Done', 'done');
  }
  reload() { if (this.currentUrl) this.iframe.src = this.currentUrl; }
  stop() { try { this.iframe.contentWindow.stop(); } catch {} this.statusCb('Stopped', 'done'); }
  canGoBack() { return this.historyStack.length > 0; }
  canGoForward() { return this.forwardStack.length > 0; }
  getCurrentUrl() { return this.currentUrl; }
  destroy() { this.iframe.remove(); }
}

// Native Engine stub — only used when Electron is available (not on Chromebook/web)
// On web this class is never instantiated — Web Mode is primary
class NativeEngine {
  constructor(container, statusCb) {
    this.container = container;
    this.statusCb = statusCb;
    this.currentUrl = null;
    const el = document.createElement('div');
    el.className = 'native-engine-placeholder';
    el.innerHTML = `
      <div style="padding:24px; text-align:center; color:#c4b5fd">
        <div style="font-size:18px; font-weight:600">Cinmin Browser — Native</div>
        <div style="margin-top:8px; font-size:12px">Chromium engine (Electron)</div>
      </div>
    `;
    this.placeholder = el;
    container.appendChild(el);
    this._tryLoadNative();
  }
  async _tryLoadNative() {
    if (!isNativeAvailable()) return;
    try {
      // This import is intentionally dynamic and excluded from web bundle via Vite external
      const mod = await import(/* @vite-ignore */ 'electron');
      console.log('Native electron available', mod);
    } catch {}
  }
  navigate(url) { this.currentUrl = url; this.statusCb('Native engine not in web build — using fallback', 'done'); }
  back() {} forward() {} reload() {} stop() {}
  canGoBack() { return false; }
  canGoForward() { return false; }
  getCurrentUrl() { return this.currentUrl; }
  destroy() { this.placeholder.remove(); }
  onFallbackClick(cb) { this.placeholder.querySelector('[data-a="fallback"]')?.addEventListener('click', cb); }
}

export function createBrowserView(container, statusCb) {
  if (isNativeAvailable()) return new NativeEngine(container, statusCb);
  return new WebEngine(container, statusCb);
}

// Downloads abstraction — controlled, no direct FS access for webpages
export const BrowserDownloads = {
  saveToDownloads(filename, content) {
    // only via explicit browser API, not webpage
    return fs.createFile('/Home/Downloads', filename, content);
  }
};
