// PluginManager.js — tiny plugin system for Cinmin Terminal (beginner-friendly)
// Usage in Terminal: plugin install HTMLDEBUG | plugin list | plugin remove HTMLDEBUG
// Plugins are simple JS modules that export { name, description, install(ctx) }

import { storage } from './Storage.js';
import { notifier } from './NotificationManager.js';

const STORE_KEY = 'cinmin:plugins';
const CATALOG = {
  HTMLDEBUG: {
    id: 'HTMLDEBUG',
    name: 'HTML Debugger',
    description: 'Lints HTML files in Notepad + Browser — shows unclosed tags and errors.',
    // lazy import to keep bundle small
    loader: () => import('../plugins/HtmlDebug.js'),
  },
  COWSAY: {
    id: 'COWSAY',
    name: 'Cowsay',
    description: 'Classic cowsay command for fun.',
    loader: () => import('../plugins/Cowsay.js'),
  },
};

export class PluginManager {
  constructor() {
    this.installed = storage.get(STORE_KEY, []); // array of ids
    if (!Array.isArray(this.installed)) this.installed = [];
    this.loaded = new Map(); // id -> module
    this.commandHooks = new Map(); // command name -> fn
  }

  listCatalog() { return Object.values(CATALOG); }
  listInstalled() { return [...this.installed]; }
  isInstalled(id) { return this.installed.includes(id.toUpperCase()); }

  async install(id) {
    const key = id.toUpperCase();
    const entry = CATALOG[key];
    if (!entry) return { ok: false, error: `Unknown plugin: ${id}. Try: plugin list` };
    if (this.isInstalled(key)) return { ok: false, error: `${key} already installed` };
    try {
      const mod = await entry.loader();
      // let plugin register itself; pass simple ctx
      if (mod.install) await mod.install(this._ctx());
      this.loaded.set(key, mod);
      this.installed.push(key);
      storage.set(STORE_KEY, this.installed);
      notifier.success(`${entry.name} installed`, 'Plugins');
      return { ok: true, plugin: entry };
    } catch (e) {
      return { ok: false, error: e.message || String(e) };
    }
  }

  async remove(id) {
    const key = id.toUpperCase();
    if (!this.isInstalled(key)) return { ok: false, error: `${key} not installed` };
    const mod = this.loaded.get(key);
    try { if (mod && mod.uninstall) await mod.uninstall(this._ctx()); } catch {}
    this.loaded.delete(key);
    this.installed = this.installed.filter(x => x !== key);
    storage.set(STORE_KEY, this.installed);
    notifier.success(`${key} removed`, 'Plugins');
    return { ok: true };
  }

  async loadAll() {
    for (const id of [...this.installed]) {
      const entry = CATALOG[id];
      if (!entry) continue;
      try {
        const mod = await entry.loader();
        if (mod.install) await mod.install(this._ctx());
        this.loaded.set(id, mod);
      } catch (e) { console.warn(`Failed to load plugin ${id}:`, e); }
    }
  }

  _ctx() {
    // context passed to plugins — keep minimal and beginner-readable
    return {
      registerCommand: (name, fn, help) => {
        this.commandHooks.set(name.toLowerCase(), { fn, help });
      },
      unregisterCommand: (name) => this.commandHooks.delete(name.toLowerCase()),
      notifier,
      storage,
    };
  }

  // called by Terminal to try plugin commands
  tryRun(cmd, args, print) {
    const hook = this.commandHooks.get(cmd.toLowerCase());
    if (!hook) return false;
    try { hook.fn(args, print); } catch (e) { print(`plugin error: ${e.message}`, 'error'); }
    return true;
  }

  helpFor(cmd) {
    const h = this.commandHooks.get(cmd.toLowerCase());
    return h?.help || null;
  }
}

export const pluginManager = new PluginManager();
