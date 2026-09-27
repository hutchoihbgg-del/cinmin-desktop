// main.js — boot Cinmin Desktop

import './styles/desktop.css';
import './styles/windows.css';
import './styles/explorer.css';

import { events } from './core/EventBus.js';
import { WindowManager } from './desktop/WindowManager.js';
import { initDesktop } from './desktop/Desktop.js';
import { createFileExplorerContent } from './apps/FileExplorer.js';
import { createNotepadContent } from './apps/Notepad.js';
import { createTerminalContent } from './apps/Terminal.js';
import { createSettingsContent } from './apps/Settings.js';
import { createHtmlViewerContent } from './apps/HtmlViewer.js';

// apply saved theme/accent early
const savedTheme = localStorage.getItem('cinmin:theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
const savedAccent = localStorage.getItem('cinmin:accent');
if (savedAccent) document.documentElement.style.setProperty('--accent', savedAccent);

// init window manager
const wm = new WindowManager(
  document.getElementById('windows'),
  document.getElementById('taskbar-apps')
);

// app launchers
const appFactories = {
  explorer: () => ({ title: 'File Explorer', icon: '📁', content: createFileExplorerContent(), width: 720, height: 460 }),
  terminal: () => ({ title: 'Terminal', icon: '💻', content: createTerminalContent(), width: 620, height: 400 }),
  notepad: () => ({ title: 'Notepad', icon: '📝', content: createNotepadContent(), width: 600, height: 420 }),
  htmlviewer: () => ({ title: 'Browser', icon: '🌐', content: createHtmlViewerContent(), width: 800, height: 520 }),
  settings: () => ({ title: 'Settings', icon: '⚙', content: createSettingsContent(), width: 560, height: 480 }),
};

let cascade = 0;
function launch(appId, payload) {
  const factory = appFactories[appId];
  if (!factory) return;
  // stagger windows
  const offset = (cascade % 4) * 24;
  cascade++;
  let opts = factory();
  // if opening a file in notepad via file:open
  if (appId === 'notepad' && payload && typeof payload === 'string') {
    opts.content = createNotepadContent(payload);
    opts.title = `Notepad — ${payload.split('/').pop()}`;
  }
  if (appId === 'htmlviewer' && payload && typeof payload === 'string') {
    opts.content = createHtmlViewerContent(payload);
    opts.title = `Browser — ${payload.split('/').pop()}`;
  }
  opts.x = 70 + offset;
  opts.y = 50 + offset;
  return wm.create(opts);
}

events.on('app:launch', (appId) => launch(appId));
events.on('file:open', (path) => launch('notepad', path));
events.on('html:open', (path) => launch('htmlviewer', path));

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
