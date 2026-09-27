// PluginManager.js — Cinmin 0.8 Plugin Ecosystem (extends 0.7, beginner-readable)
// Keeps 0.7 behavior + adds manifests, enable/disable, sandbox, app/file assoc, deps, recovery

import { storage } from './Storage.js';
import { notifier } from './NotificationManager.js';
import { events as bus } from './EventBus.js';

const STORE_KEY = 'cinmin:plugins';
const STORE_DISABLED = 'cinmin:plugins:disabled';
const STORE_FAILED = 'cinmin:plugins:failed';

// Manifest-driven catalog (beginner-friendly plain objects)
const CATALOG = {
  HTMLDEBUG: {
    id: 'HTMLDEBUG', name: 'HTML Debug', version: '1.0.0', latestVersion: '1.0.0',
    description: 'Checks HTML for common structural mistakes.',
    author: 'Cinmin', commands: ['htmldebug'], apps: [], permissions: [], dependencies: [],
    loader: () => import('../plugins/HtmlDebug.js'),
  },
  COWSAY: {
    id: 'COWSAY', name: 'Cowsay', version: '1.0.0', latestVersion: '1.0.0',
    description: 'Displays messages using an ASCII cow.',
    author: 'Cinmin', commands: ['cowsay'], apps: [], permissions: [], dependencies: [],
    loader: () => import('../plugins/Cowsay.js'),
  },
  HELLOWORLD: {
    id: 'HELLOWORLD', name: 'Hello World', version: '1.0.0', latestVersion: '1.0.0',
    description: 'Simplest reference plugin — hello command.',
    author: 'Cinmin', commands: ['hello'], apps: [], permissions: [], dependencies: [],
    loader: () => import('../plugins/HelloWorld.js'),
  },
  CALCULATOR: {
    id: 'CALCULATOR', name: 'Calculator', version: '1.0.0', latestVersion: '1.0.0',
    description: 'Simple calculator app.',
    author: 'Cinmin', commands: ['calc'], apps: [{ id: 'calculator', name: 'Calculator', icon: '🧮', category: 'Accessories' }], permissions: [], dependencies: [],
    loader: () => import('../plugins/Calculator.js'),
  },
  MARKDOWN: {
    id: 'MARKDOWN', name: 'Markdown Viewer', version: '1.0.0', latestVersion: '1.0.0',
    description: 'View Markdown files.',
    author: 'Cinmin', commands: [], apps: [{ id: 'markdown', name: 'Markdown Viewer', icon: '📝', category: 'Office' }], permissions: [], dependencies: [], fileAssoc: ['.md'],
    loader: () => import('../plugins/Markdown.js'),
  },
  IMAGEINFO: {
    id: 'IMAGEINFO', name: 'Image Info', version: '1.0.0', latestVersion: '1.0.0',
    description: 'Show image file info.',
    author: 'Cinmin', commands: ['imageinfo'], apps: [], permissions: [], dependencies: [],
    loader: () => import('../plugins/ImageInfo.js'),
  },
};

export class PluginManager {
  constructor() {
    this.installed = storage.get(STORE_KEY, []);
    if (!Array.isArray(this.installed)) this.installed = [];
    this.disabled = storage.get(STORE_DISABLED, []);
    if (!Array.isArray(this.disabled)) this.disabled = [];
    this.failed = new Set(storage.get(STORE_FAILED, []) || []);
    this.loaded = new Map(); // id -> module
    this.commandHooks = new Map(); // name -> {fn, help, pluginId}
    this.pluginCommands = new Map(); // id -> [names]
    this.pluginApps = new Map(); // id -> [appIds]
    this.pluginEvents = new Map(); // id -> [{event, fn}]
    this.fileAssoc = new Map(); // ext -> {pluginId, appId}
  }

  // 1. manifests
  getPlugin(id) { return CATALOG[id.toUpperCase()] || null; }
  listPlugins() { return Object.values(CATALOG).map(m => ({ ...m, status: this._status(m.id) })); }
  listCatalog() { return Object.values(CATALOG); }
  listInstalled() { return [...this.installed]; }
  isInstalled(id) { return this.installed.includes(id.toUpperCase()); }
  isEnabled(id) { return this.isInstalled(id) && !this.disabled.includes(id.toUpperCase()) && !this.failed.has(id.toUpperCase()); }
  _status(id) {
    const key = id.toUpperCase();
    if (this.failed.has(key)) return 'failed';
    if (!this.isInstalled(key)) return 'available';
    if (this.disabled.includes(key)) return 'disabled';
    return 'installed';
  }

  // install with deps check
  async install(id) {
    const key = id.toUpperCase();
    const entry = CATALOG[key];
    if (!entry) return { ok: false, error: `Plugin not found: ${id}` };
    if (this.isInstalled(key)) return { ok: false, error: `${key} already installed` };
    // deps check
    for (const dep of (entry.dependencies || [])) {
      if (!this.isInstalled(dep)) return { ok: false, error: `Missing dependency: ${dep}` };
    }
    this.installed.push(key);
    storage.set(STORE_KEY, this.installed);
    const res = await this.load(key);
    if (!res.ok) {
      // rollback install on fail
      this.installed = this.installed.filter(x => x !== key);
      storage.set(STORE_KEY, this.installed);
      return res;
    }
    notifier.success(`${entry.name} installed`, 'Plugins');
    return { ok: true, plugin: entry };
  }

  async remove(id) {
    const key = id.toUpperCase();
    if (!this.isInstalled(key)) return { ok: false, error: `${key} not installed` };
    await this.unload(key);
    this.installed = this.installed.filter(x => x !== key);
    this.disabled = this.disabled.filter(x => x !== key);
    this.failed.delete(key);
    storage.set(STORE_KEY, this.installed);
    storage.set(STORE_DISABLED, this.disabled);
    storage.set(STORE_FAILED, [...this.failed]);
    notifier.success(`${key} removed`, 'Plugins');
    return { ok: true };
  }

  async load(id) {
    const key = id.toUpperCase();
    const entry = CATALOG[key];
    if (!entry) return { ok: false, error: 'Unknown plugin' };
    if (this.disabled.includes(key)) return { ok: false, error: `${key} is disabled` };
    try {
      const mod = await entry.loader();
      // support both old install(ctx) and new activate(context)
      const ctx = this._createContext(key);
      if (mod.activate) await mod.activate(ctx);
      else if (mod.install) await mod.install(this._legacyCtx(key));
      else throw new Error('Plugin missing activate/install');
      this.loaded.set(key, mod);
      this.failed.delete(key);
      storage.set(STORE_FAILED, [...this.failed]);
      return { ok: true };
    } catch (e) {
      this.failed.add(key);
      storage.set(STORE_FAILED, [...this.failed]);
      this._showFailure(key, e, entry);
      return { ok: false, error: e.message || String(e) };
    }
  }

  async unload(id) {
    const key = id.toUpperCase();
    const mod = this.loaded.get(key);
    if (mod) {
      try {
        const ctx = this._createContext(key);
        if (mod.deactivate) await mod.deactivate(ctx);
        else if (mod.uninstall) await mod.uninstall(this._legacyCtx(key));
      } catch {}
      // clean commands
      const cmds = this.pluginCommands.get(key) || [];
      cmds.forEach(c => this.commandHooks.delete(c));
      this.pluginCommands.delete(key);
      // clean apps
      const apps = this.pluginApps.get(key) || [];
      try {
        const { APPS } = await import('./AppRegistry.js');
        apps.forEach(aid => delete APPS[aid]);
      } catch {}
      this.pluginApps.delete(key);
      // clean events
      const evs = this.pluginEvents.get(key) || [];
      evs.forEach(({ event, fn }) => bus.off(event, fn));
      this.pluginEvents.delete(key);
      // clean file assoc
      for (const [ext, v] of [...this.fileAssoc.entries()]) if (v.pluginId === key) this.fileAssoc.delete(ext);
      this.loaded.delete(key);
    }
    return { ok: true };
  }

  async enable(id) {
    const key = id.toUpperCase();
    if (!this.isInstalled(key)) return { ok: false, error: 'Not installed' };
    this.disabled = this.disabled.filter(x => x !== key);
    storage.set(STORE_DISABLED, this.disabled);
    this.failed.delete(key);
    return this.load(key);
  }

  async disable(id) {
    const key = id.toUpperCase();
    if (!this.isInstalled(key)) return { ok: false, error: 'Not installed' };
    await this.unload(key);
    if (!this.disabled.includes(key)) this.disabled.push(key);
    storage.set(STORE_DISABLED, this.disabled);
    return { ok: true };
  }

  async reload(id) {
    await this.unload(id);
    // clear failed so reload can succeed
    this.failed.delete(id.toUpperCase());
    storage.set(STORE_FAILED, [...this.failed]);
    return this.load(id);
  }

  async loadAll() {
    for (const id of [...this.installed]) {
      if (this.disabled.includes(id)) continue;
      await this.load(id);
    }
  }

  // sandbox contexts
  _createContext(pluginId) {
    const self = this;
    return {
      // safe command API
      commands: {
        register(arg, desc, exec) {
          // support both {name, description, execute} and (name, fn, help)
          let name, fn, help, complete;
          if (typeof arg === 'object' && arg.name) {
            name = arg.name; fn = arg.execute; help = arg.description; complete = arg.complete;
          } else { name = arg; fn = desc; help = exec; }
          const lower = name.toLowerCase();
          self.commandHooks.set(lower, { fn: (args, print) => fn(args, { print }), help: help || '', pluginId });
          if (!self.pluginCommands.has(pluginId)) self.pluginCommands.set(pluginId, []);
          self.pluginCommands.get(pluginId).push(lower);
        },
        unregister(name) { self.commandHooks.delete(name.toLowerCase()); }
      },
      events: {
        on(event, fn) {
          bus.on(event, fn);
          if (!self.pluginEvents.has(pluginId)) self.pluginEvents.set(pluginId, []);
          self.pluginEvents.get(pluginId).push({ event, fn });
        },
        off(event, fn) { bus.off(event, fn); }
      },
      notifications: {
        info: (body, title) => notifier.info(body, title || pluginId),
        success: (body, title) => notifier.success(body, title || pluginId),
        warning: (body, title) => notifier.warning(body, title || pluginId),
        error: (body, title) => notifier.error(body, title || pluginId),
      },
      apps: {
        register(appDef) {
          // appDef: {id, name, icon, category, create}
          import('./AppRegistry.js').then(({ APPS }) => {
            APPS[appDef.id] = { id: appDef.id, title: appDef.name, icon: appDef.icon, cat: appDef.category || 'other', width: 500, height: 400, create: appDef.create || (() => { const d=document.createElement('div'); d.textContent='Plugin app: '+appDef.name; d.style.padding='20px'; return d; }) };
            if (!self.pluginApps.has(pluginId)) self.pluginApps.set(pluginId, []);
            self.pluginApps.get(pluginId).push(appDef.id);
          });
        },
        unregister(appId) {
          import('./AppRegistry.js').then(({ APPS }) => delete APPS[appId]);
        }
      },
      files: {
        registerAssociation(ext, appId) {
          self.fileAssoc.set(ext.toLowerCase(), { pluginId, appId });
        }
      },
      storage: {
        get(key) { return storage.get(`cinmin:plugin:${pluginId}:${key}`, null); },
        set(key, val) { return storage.set(`cinmin:plugin:${pluginId}:${key}`, val); },
        remove(key) { storage.remove(`cinmin:plugin:${pluginId}:${key}`); }
      },
      // legacy compat
      registerCommand: (name, fn, help) => {
        const lower = name.toLowerCase();
        self.commandHooks.set(lower, { fn, help, pluginId });
        if (!self.pluginCommands.has(pluginId)) self.pluginCommands.set(pluginId, []);
        self.pluginCommands.get(pluginId).push(lower);
      },
      unregisterCommand: (name) => self.commandHooks.delete(name.toLowerCase()),
      notifier, storage,
    };
  }

  _legacyCtx(pluginId) {
    const ctx = this._createContext(pluginId);
    // expose legacy shape directly
    return { registerCommand: ctx.commands.register, unregisterCommand: ctx.commands.unregister, notifier: ctx.notifications, storage: ctx.storage, ...ctx };
  }

  tryRun(cmd, args, print) {
    const hook = this.commandHooks.get(cmd.toLowerCase());
    if (!hook) return false;
    try { hook.fn(args, print); } catch (e) { print(`plugin error: ${e.message}`, 'error'); }
    return true;
  }

  helpFor(cmd) { return this.commandHooks.get(cmd.toLowerCase())?.help || null; }

  getFileAssoc(ext) { return this.fileAssoc.get(ext.toLowerCase()) || null; }

  _showFailure(id, err, entry) {
    // show non-crashing overlay via notifier + DOM
    notifier.error(`${id}: ${err.message}`, 'Plugin failed');
    // also inject overlay if possible
    const overlay = document.createElement('div');
    overlay.className = 'plugin-failure';
    overlay.innerHTML = `
      <div class="plugin-failure-card">
        <div class="pf-title">Plugin failed to load</div>
        <div class="pf-name">${entry ? entry.name : id} (${id})</div>
        <div class="pf-err">${String(err.message || err)}</div>
        <div class="pf-actions">
          <button data-a="retry">Restart Plugin</button>
          <button data-a="disable">Disable Plugin</button>
          <button data-a="close">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-a="retry"]').addEventListener('click', async () => { overlay.remove(); await this.reload(id); });
    overlay.querySelector('[data-a="disable"]').addEventListener('click', async () => { overlay.remove(); await this.disable(id); });
    overlay.querySelector('[data-a="close"]').addEventListener('click', () => overlay.remove());
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 8000);
  }
}

export const pluginManager = new PluginManager();
