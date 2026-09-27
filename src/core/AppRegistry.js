// AppRegistry.js — single source of truth for Cinmin apps (beginner-friendly)
// Axiom: keep registry as plain data, no magic.

import { createFileExplorerContent } from '../apps/FileExplorer.js';
import { createNotepadContent } from '../apps/Notepad.js';
import { createTerminalContent } from '../apps/Terminal.js';
import { createSettingsContent } from '../apps/Settings.js';
import { createHtmlViewerContent } from '../apps/HtmlViewer.js';

export const APPS = {
  explorer: {
    id: 'explorer',
    title: 'File Explorer',
    icon: '📁',
    cat: 'places',
    width: 720, height: 460,
    create: () => createFileExplorerContent(),
    createWith: (payload) => createFileExplorerContent(payload),
  },
  terminal: {
    id: 'terminal',
    title: 'Terminal',
    icon: '💻',
    cat: 'admin',
    width: 620, height: 400,
    create: () => createTerminalContent(),
  },
  notepad: {
    id: 'notepad',
    title: 'Notepad',
    icon: '📝',
    cat: 'office',
    width: 600, height: 420,
    create: () => createNotepadContent(),
    createWith: (path) => createNotepadContent(path),
  },
  htmlviewer: {
    id: 'htmlviewer',
    title: 'Browser',
    icon: '🌐',
    cat: 'internet',
    width: 800, height: 520,
    create: () => createHtmlViewerContent(),
    createWith: (path) => createHtmlViewerContent(path),
  },
  settings: {
    id: 'settings',
    title: 'Settings',
    icon: '⚙',
    cat: 'admin',
    width: 560, height: 480,
    create: () => createSettingsContent(),
  },
};

export function getApp(id) { return APPS[id] || null; }
export function listApps() { return Object.values(APPS); }
