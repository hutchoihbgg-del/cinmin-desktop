// manifest.js — builtin app manifests (1.2). Repo is the source of truth, bundled at build time.
// Versions let future updates target individual apps. No runtime GitHub fetch (offline-safe).

import { createFileExplorerContent } from '../FileExplorer.js';
import { createNotepadContent } from '../Notepad.js';
import { createTerminalContent } from '../Terminal.js';
import { createSettingsContent } from '../Settings.js';
import { createHtmlViewerContent } from '../HtmlViewer.js';
import { createVishContent } from './Vish.js';
import { createSoftwareManagerContent } from './SoftwareManager.js';
import { createUltrakillDemoContent } from './UltrakillDemo.js';
import { createMusicContent } from './Music.js';

export const CINMIN_VERSION = '1.2.0';

export const BUILTIN_APPS = {
  calculator: {
    id: 'calculator', name: 'Calculator', title: 'Calculator',
    version: '1.0.0', description: 'A simple calculator.', icon: '🧮',
    category: 'Accessories', cat: 'accessories', builtin: true, source: 'builtin',
    width: 320, height: 420,
    create: () => {
      const el = document.createElement('div');
      el.style.padding = '12px'; el.style.display = 'flex'; el.style.flexDirection = 'column'; el.style.gap = '8px';
      el.innerHTML = `<input class="calc-in" placeholder="2+2*3" style="padding:8px;border-radius:8px"><div class="calc-out" style="padding:8px;background:rgba(255,255,255,0.06);border-radius:8px;min-height:24px">0</div>
        <div class="calc-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px"></div>`;
      const inp = el.querySelector('.calc-in'), out = el.querySelector('.calc-out'), grid = el.querySelector('.calc-grid');
      const run = (v) => { try { if (!/^[0-9+\-*/().% ]+$/.test(v)) throw new Error('Only numbers'); out.textContent = String(Function(`"use strict";return (${v})`)()); } catch (e) { out.textContent = 'Error'; } };
      ['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].forEach(k => {
        const b = document.createElement('button'); b.textContent = k;
        b.style.cssText = 'padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.08);color:inherit;cursor:pointer';
        b.addEventListener('click', () => { if (k === '=') run(inp.value); else inp.value += k; });
        grid.appendChild(b);
      });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') run(inp.value); });
      return el;
    },
  },
  explorer: {
    id: 'explorer', name: 'Files', title: 'File Explorer',
    version: '1.0.0', description: 'Browse the virtual filesystem.', icon: '📁',
    category: 'Places', cat: 'places', builtin: true, source: 'builtin',
    width: 720, height: 460,
    create: () => createFileExplorerContent(),
    createWith: (p) => createFileExplorerContent(p),
  },
  terminal: {
    id: 'terminal', name: 'Terminal', title: 'Terminal',
    version: '1.0.0', description: 'Command line for Cinmin.', icon: '💻',
    category: 'Accessories', cat: 'admin', builtin: true, source: 'builtin',
    width: 620, height: 400,
    create: () => createTerminalContent(),
  },
  notepad: {
    id: 'notepad', name: 'Notepad', title: 'Notepad',
    version: '1.0.0', description: 'Simple text editor.', icon: '📝',
    category: 'Accessories', cat: 'office', builtin: true, source: 'builtin',
    width: 600, height: 420,
    create: () => createNotepadContent(),
    createWith: (p) => createNotepadContent(p),
  },
  browser: {
    id: 'browser', aliasOf: 'htmlviewer', name: 'Browser', title: 'Browser',
    version: '1.0.0', description: 'Web browser (Web Mode on Chromebook).', icon: '🌐',
    category: 'Internet', cat: 'internet', builtin: true, source: 'builtin',
    width: 800, height: 520,
    create: () => createHtmlViewerContent(),
    createWith: (p) => createHtmlViewerContent(p),
  },
  htmlviewer: {
    id: 'htmlviewer', name: 'Browser', title: 'Browser',
    version: '1.0.0', description: 'Web browser (Web Mode on Chromebook).', icon: '🌐',
    category: 'Internet', cat: 'internet', builtin: true, source: 'builtin',
    width: 800, height: 520,
    create: () => createHtmlViewerContent(),
    createWith: (p) => createHtmlViewerContent(p),
  },
  settings: {
    id: 'settings', name: 'Settings', title: 'Settings',
    version: '1.0.0', description: 'System settings.', icon: '⚙',
    category: 'Administration', cat: 'admin', builtin: true, source: 'builtin',
    width: 560, height: 480,
    create: () => createSettingsContent(),
  },
  software: {
    id: 'software', name: 'Software Manager', title: 'Software Manager',
    version: '1.0.0', description: 'Built-in apps and optional plugins.', icon: '🛍',
    category: 'Administration', cat: 'admin', builtin: true, source: 'builtin',
    width: 520, height: 480,
    create: () => createSoftwareManagerContent(),
  },
  ultrakill: {
    id: 'ultrakill', name: 'ULTRAKILL Demo', title: 'ULTRAKILL Demo',
    version: '1.0.0', description: 'Playable ULTRAKILL demo (own game window).', icon: '🔥',
    category: 'Games', cat: 'media', builtin: true, source: 'builtin',
    width: 900, height: 600,
    create: () => createUltrakillDemoContent(),
  },
  music: {
    id: 'music', name: 'Music', title: 'Music',
    version: '1.0.0', description: 'Soundtracks — JJS + ULTRAKILL OST.', icon: '🎵',
    category: 'Sound & Video', cat: 'media', builtin: true, source: 'builtin',
    width: 420, height: 520,
    create: () => createMusicContent(),
  },
  vish: {
    id: 'vish', name: 'Vish', title: 'Vish',
    version: '1.0.0', description: 'Native Linux app — web frontend inside Cinmin.', icon: '◈',
    category: 'Accessories', cat: 'accessories', builtin: true, source: 'builtin',
    width: 440, height: 420,
    create: () => createVishContent(),
  },
};
