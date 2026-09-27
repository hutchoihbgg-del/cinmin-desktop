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

// keyboard shortcuts
document.addEventListener('keydown', (e) => {
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
