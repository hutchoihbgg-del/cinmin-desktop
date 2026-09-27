// main.js — boot Cinmin Desktop (0.5: AppRegistry + Notifications + Persistence)

import './styles/desktop.css';
import './styles/windows.css';
import './styles/explorer.css';

import { events } from './core/EventBus.js';
import { getApp } from './core/AppRegistry.js';
import { notifier } from './core/NotificationManager.js';
import { pluginManager } from './core/PluginManager.js';
import { WindowManager } from './desktop/WindowManager.js';
import { initDesktop } from './desktop/Desktop.js';

// first-run migration (1.2): never wipe existing keys, just stamp schema version
try {
  const SCHEMA = '1.3.0';
  const cur = localStorage.getItem('cinmin:appSchemaVersion');
  if (cur !== SCHEMA) {
    // additive only — never wipe cinmin:fs, iconPos, recent, plugins, notifications, bookmarks
    localStorage.setItem('cinmin:appSchemaVersion', SCHEMA);
    // seed a sample .capp for the Chromebook install test (only if Downloads exists and file missing)
    import('./core/FileSystem.js').then(({ fs }) => {
      try {
        if (fs._getFolder('/Home/Downloads') && !fs.exists('/Home/Downloads/MyNotes.capp')) {
          fs.createFile('/Home/Downloads', 'MyNotes.capp', JSON.stringify({
            manifest: { id: 'mynotes', name: 'My Notes', version: '1.0.0', description: 'Sample packaged notes app.', author: 'Cinmin', icon: '🗒', category: 'Accessories', entry: 'app.js', permissions: [] },
            app: { type: 'notes', content: 'Welcome to My Notes — a sample .capp package.\n\nUninstall anytime from Software Manager.' }
          }, null, 2));
        }
      } catch {}
    }).catch(() => {});
  }
} catch {}
// per-app isolated storage helper: cinmin:app:<id>:<key>
window.cinminAppStore = (id) => ({
  get: (k, fb = null) => { try { const r = localStorage.getItem(`cinmin:app:${id}:${k}`); return r === null ? fb : JSON.parse(r); } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(`cinmin:app:${id}:${k}`, JSON.stringify(v)); } catch {} },
});

// apply saved theme/accent/icon-size/animations early (Settings persistence)
const savedTheme = localStorage.getItem('cinmin:theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const savedAccent = localStorage.getItem('cinmin:accent');
if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);
document.documentElement.setAttribute('data-icon-size', localStorage.getItem('cinmin:iconSize') || 'medium');
document.documentElement.setAttribute('data-animations', localStorage.getItem('cinmin:animations') || 'true');

// init window manager
const wm = new WindowManager(
  document.getElementById('windows'),
  document.getElementById('taskbar-apps')
);

let cascade = 0;
function launch(appId, payload) {
  const app = getApp(appId);
  if (!app) { notifier.error(`Unknown app: ${appId}`, 'Launch'); return; }
  const offset = (cascade % 4) * 24;
  cascade++;
  // use factory with payload if present
  let content, title = app.title;
  if (payload && app.createWith) {
    content = app.createWith(payload);
    title = `${app.title} — ${String(payload).split('/').pop()}`;
  } else {
    content = app.create();
  }
  // simple loading state: show spinner briefly if content is heavy
  // (browser does its own loading)
  return wm.create({ title, icon: app.icon, contentEl: content, width: app.width, height: app.height, x: 70 + offset, y: 50 + offset });
}

events.on('app:launch', (appId) => launch(appId));
events.on('file:open', (path) => launch('notepad', path));
events.on('html:open', (path) => launch('htmlviewer', path));
events.on('notification:new', () => {}); // keep notifier alive
// load plugins persisted
pluginManager.loadAll();
// global error hook
window.addEventListener('error', (e) => notifier.error(e.message || 'Unknown error', 'System'));
window.addEventListener('unhandledrejection', (e) => notifier.error(e.reason?.message || String(e.reason), 'System'));

initDesktop();

// PWA — installable, offline shell (Chromebook)
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; window._cinminInstallPrompt = e; });
window.addEventListener('appinstalled', () => { deferredPrompt = null; notifier.success('Cinmin installed', 'PWA'); });
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      // update notification (0.5 already has notifier)
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            notifier.info('Cinmin has an update.', 'Update');
            // show reload toast with action
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = `<b>Cinmin has an update.</b><span>Reload to apply</span><button style="margin-top:6px; padding:4px 8px; border-radius:6px; background:#7c3aed; color:white; border:none; cursor:pointer">Reload</button>`;
            toast.querySelector('button').addEventListener('click', () => window.location.reload());
            document.getElementById('toast-container')?.appendChild(toast);
            setTimeout(()=> toast.remove(), 8000);
          }
        });
      });
    }).catch(()=>{});
  });
  // offline/online events handled in Settings, also notify
  window.addEventListener('online', () => notifier.success('Back online', 'System'));
  window.addEventListener('offline', () => notifier.warning('You are offline', 'System'));
}
// expose install helper for Settings
window._cinminGetInstallPrompt = () => deferredPrompt;
// keyboard shortcuts — only when Cinmin has focus (Chromebook safe)
document.addEventListener('keydown', (e) => {
  const focusedInside = document.getElementById('app')?.contains(document.activeElement) || document.hasFocus();
  if (!focusedInside && e.key !== 'Escape') return;
  if (e.altKey && e.key === 'Tab') { e.preventDefault(); wm.focusNext(); }
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') { e.preventDefault(); launch('terminal'); }
  if (e.key === 'Escape') { /* close start is handled in Desktop.js */ }
});

// shutdown fake
events.on('system:shutdown', () => {
  const overlay = document.createElement('div');
  overlay.className = 'shutdown-overlay';
  overlay.innerHTML = `<div style="font-size:42px">◈</div><div>Cinmin is shutting down...</div><button style="margin-top:12px;padding:8px 16px;border-radius:8px;border:1px solid #555;background:#222;color:#fff;cursor:pointer" id="restart-btn">Restart</button>`;
  document.getElementById('app').appendChild(overlay);
  document.getElementById('restart-btn').addEventListener('click', () => overlay.remove());
});

// expose for debugging
window.cinmin = { wm, events, launch };
