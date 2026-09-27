// AppPackageManager.js — .capp local packages (1.3)
// A .capp file is JSON in the virtual FS: { manifest: {...}, app: { type, ... } }
// Supported app types (safe, no code execution):
//   { type: "text", content }     — renders text
//   { type: "html", content }     — renders in sandboxed iframe (srcdoc)
//   { type: "notes", }            — simple notes viewer (uses isolated storage)
// Manifest: { id, name, version, description, author, icon, category, entry, permissions[] }
// latestVersion/updateAvailable prepared; remote updates disabled.

import { storage } from './Storage.js';
import { events as bus } from './EventBus.js';
import { registerPackageApp, unregisterApp, getApp } from './AppRegistry.js';
import { fs } from './FileSystem.js';

const STORE_META = 'cinmin:packages';

function validId(id) {
  return typeof id === 'string' && /^[a-z0-9][a-z0-9-_]{1,31}$/i.test(id);
}

export function validatePackage(pkg) {
  if (!pkg || typeof pkg !== 'object') return { ok: false, error: 'Package is not valid JSON.' };
  const m = pkg.manifest;
  if (!m) return { ok: false, error: 'Missing manifest.json section.' };
  for (const f of ['id', 'name', 'version', 'entry']) {
    if (!m[f]) return { ok: false, error: `Manifest missing required field: ${f}.` };
  }
  if (!validId(m.id)) return { ok: false, error: `Invalid app ID "${m.id}". Use letters, numbers, - or _.` };
  if (m.id.includes('..') || m.id.includes('/')) return { ok: false, error: 'Path traversal in ID is not allowed.' };
  if (!pkg.app || typeof pkg.app !== 'object') return { ok: false, error: `Missing app section for entry "${m.entry}".` };
  const allowed = ['text', 'html', 'notes'];
  if (!allowed.includes(pkg.app.type)) return { ok: false, error: `Unsupported app type "${pkg.app.type}". Allowed: ${allowed.join(', ')}.` };
  if (getApp(m.id)?.builtin) return { ok: false, error: `Cannot install package. ID "${m.id}" is reserved by a built-in application.` };
  if (getApp(m.id)?.source === 'plugin') return { ok: false, error: `Cannot install package. ID "${m.id}" is already used by a plugin application.` };
  if (getApp(m.id)?.source === 'package') return { ok: false, error: `Package "${m.id}" is already installed.` };
  return { ok: true };
}

export function getPackageInfo(pkg) {
  const m = pkg.manifest;
  return {
    id: m.id, name: m.name, version: m.version,
    latestVersion: m.version, updateAvailable: false,
    description: m.description || '', author: m.author || 'Unknown',
    icon: m.icon || '📦', category: m.category || 'Accessories',
    permissions: m.permissions || [], status: 'available',
  };
}

function loadMeta() {
  const v = storage.get(STORE_META, {});
  return v && typeof v === 'object' ? v : {};
}
function saveMeta(m) { storage.set(STORE_META, m); }

export function listInstalled() { return Object.keys(loadMeta()); }
export function isInstalled(id) { return !!loadMeta()[String(id).toLowerCase()]; }

function renderAppContent(manifest, app) {
  // Returns a create() function — no eval, only safe renderers
  if (app.type === 'html') {
    return () => {
      const el = document.createElement('div');
      el.style.cssText = 'display:flex;flex-direction:column;flex:1;min-height:0';
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', 'allow-scripts allow-forms');
      f.style.cssText = 'flex:1;width:100%;height:100%;border:none;background:white';
      f.srcdoc = String(app.content || '<p>Empty</p>');
      el.appendChild(f);
      return el;
    };
  }
  if (app.type === 'notes') {
    return () => {
      const el = document.createElement('div');
      el.style.cssText = 'padding:14px;white-space:pre-wrap;font-size:13px;overflow:auto';
      el.textContent = String(app.content || `${manifest.name} — package notes app.`);
      return el;
    };
  }
  return () => {
    const el = document.createElement('div');
    el.style.cssText = 'padding:14px;white-space:pre-wrap;font-size:13px;overflow:auto';
    el.textContent = String(app.content || '');
    return el;
  };
}

export function install(pkg) {
  const v = validatePackage(pkg);
  if (!v.ok) return v;
  const m = pkg.manifest;
  try {
    registerPackageApp(m.id.toLowerCase(), {
      id: m.id.toLowerCase(),
      name: m.name, title: m.name,
      version: m.version, description: m.description || `Installed package.`,
      author: m.author || 'Unknown',
      icon: typeof m.icon === 'string' && m.icon.length < 8 ? m.icon : '📦',
      category: m.category || 'Accessories', cat: (m.category || 'accessories').toLowerCase(),
      latestVersion: m.version, updateAvailable: false,
      width: 520, height: 440,
      create: renderAppContent(m, pkg.app),
    });
  } catch (e) {
    return { ok: false, error: e.message };
  }
  const meta = loadMeta();
  meta[m.id.toLowerCase()] = { ...getPackageInfo(pkg), status: 'installed', installedAt: Date.now() };
  saveMeta(meta);
  bus.emit('package:installed', { id: m.id.toLowerCase() });
  bus.emit('plugin:installed', { id: `package:${m.id.toLowerCase()}` }); // refresh listeners
  return { ok: true, id: m.id.toLowerCase() };
}

// Install from a virtual-FS .capp path (e.g. /Home/Downloads/MyApp.capp)
export function installFromPath(path) {
  const res = fs.readFile(path);
  if (!res.ok) return { ok: false, error: `Cannot read ${path}: ${res.error}` };
  let pkg;
  try { pkg = JSON.parse(res.content); }
  catch { return { ok: false, error: 'Invalid .capp file: not valid JSON.' }; }
  return install(pkg);
}

export function uninstall(id, { deleteData = false } = {}) {
  const key = String(id).toLowerCase();
  const meta = loadMeta();
  if (!meta[key]) return { ok: false, error: `Package "${id}" is not installed.` };
  try { unregisterApp(key); } catch (e) { return { ok: false, error: e.message }; }
  delete meta[key];
  saveMeta(meta);
  if (deleteData) {
    // remove per-app storage keys
    try {
      const gone = [];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(`cinmin:app:${key}:`)) gone.push(k);
      }
      gone.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    } catch {}
  }
  bus.emit('package:uninstalled', { id: key });
  bus.emit('plugin:removed', { id: `package:${key}` });
  return { ok: true };
}

export function setEnabled(id, enabled) {
  const key = String(id).toLowerCase();
  const meta = loadMeta();
  if (!meta[key]) return { ok: false, error: 'Not installed.' };
  meta[key].status = enabled ? 'installed' : 'disabled';
  saveMeta(meta);
  bus.emit(enabled ? 'package:enabled' : 'package:disabled', { id: key });
  return { ok: true };
}

export function listPackages() {
  const meta = loadMeta();
  return Object.entries(meta).map(([id, m]) => ({ id, ...m }));
}
