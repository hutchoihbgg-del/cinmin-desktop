// FileSystem.js — in-memory simulated filesystem for Cinmin (0.5: copy/cut/paste + persistence)

const STORE_KEY = 'cinmin:fs';

function deepCloneNode(node) {
  if (node.type === 'file') return { type: 'file', name: node.name, content: node.content };
  const children = {};
  for (const [k, v] of Object.entries(node.children)) children[k] = deepCloneNode(v);
  return { type: 'folder', name: node.name, children };
}

export class FileSystem {
  constructor() {
    this.root = {
      type: 'folder',
      name: 'Home',
      children: {
        'Documents': { type: 'folder', name: 'Documents', children: {} },
        'Downloads': { type: 'folder', name: 'Downloads', children: {} },
        'Pictures': { type: 'folder', name: 'Pictures', children: {} },
        'README.txt': { type: 'file', name: 'README.txt', content: 'Welcome to Cinmin Desktop!\n\nThis is your simulated filesystem.\nCreate files, folders, and explore.\n' },
      }
    };
    // clipboard for copy/cut/paste
    this.clipboard = null; // { mode: 'copy'|'cut', path: string }
    this._load();
  }

  // --- persistence (localStorage) ---
  _save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(this.root)); } catch {}
  }
  _load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.children) this.root = parsed;
      }
    } catch {}
  }

  // normalize path like /Home/Documents or Home/Documents -> ["Home","Documents"]
  _parts(path) {
    if (!path) return [];
    let p = path.trim();
    if (p === '/' || p === '' ) return [];
    p = p.replace(/^\/+|\/+$/g, '');
    if (!p) return [];
    return p.split('/').filter(Boolean);
  }

  // get node at path, returns {node, parent, key}
  _resolve(path) {
    const parts = this._parts(path);
    let cur = this.root;
    let parent = null;
    let key = null;
    if (parts[0] === 'Home') parts.shift();
    if (parts.length === 0) return { node: cur, parent: null, key: null };
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (cur.type !== 'folder' || !cur.children[part]) return { node: null, parent: null, key: null };
      parent = cur;
      key = part;
      cur = cur.children[part];
    }
    return { node: cur, parent, key };
  }

  _getFolder(path) {
    if (!path || path === '/' || path === '/Home' || path === 'Home') return this.root;
    const { node } = this._resolve(path);
    if (node && node.type === 'folder') return node;
    return null;
  }

  list(path) {
    const folder = this._getFolder(path);
    if (!folder) return null;
    return Object.values(folder.children).map((n) => ({
      name: n.name,
      type: n.type,
    }));
  }

  exists(path) {
    const { node } = this._resolve(path);
    return !!node;
  }

  stat(path) {
    const { node } = this._resolve(path);
    if (!node) return null;
    if (node.type === 'file') return { name: node.name, type: 'file', size: node.content.length, content: node.content };
    return { name: node.name, type: 'folder', size: Object.keys(node.children).length, children: Object.keys(node.children) };
  }

  createFolder(parentPath, name) {
    if (!name || name.includes('/')) return { ok: false, error: 'Invalid name' };
    const folder = this._getFolder(parentPath);
    if (!folder) return { ok: false, error: 'Parent not found' };
    if (folder.children[name]) return { ok: false, error: 'Already exists' };
    folder.children[name] = { type: 'folder', name, children: {} };
    this._save();
    return { ok: true };
  }

  createFile(parentPath, name, content = '') {
    if (!name || name.includes('/')) return { ok: false, error: 'Invalid name' };
    const folder = this._getFolder(parentPath);
    if (!folder) return { ok: false, error: 'Parent not found' };
    if (folder.children[name]) return { ok: false, error: 'Already exists' };
    folder.children[name] = { type: 'file', name, content };
    this._save();
    return { ok: true };
  }

  readFile(path) {
    const { node } = this._resolve(path);
    if (!node) return { ok: false, error: 'Not found' };
    if (node.type !== 'file') return { ok: false, error: 'Not a file' };
    return { ok: true, content: node.content };
  }

  writeFile(path, content) {
    const { node } = this._resolve(path);
    if (!node) return { ok: false, error: 'Not found' };
    if (node.type !== 'file') return { ok: false, error: 'Not a file' };
    node.content = content;
    this._save();
    return { ok: true };
  }

  delete(path) {
    const { node, parent, key } = this._resolve(path);
    if (!node || !parent) return { ok: false, error: 'Cannot delete root or not found' };
    delete parent.children[key];
    this._save();
    return { ok: true };
  }

  rename(path, newName) {
    if (!newName || newName.includes('/')) return { ok: false, error: 'Invalid name' };
    const { node, parent, key } = this._resolve(path);
    if (!node || !parent) return { ok: false, error: 'Not found' };
    if (parent.children[newName]) return { ok: false, error: 'Name already exists' };
    delete parent.children[key];
    node.name = newName;
    parent.children[newName] = node;
    this._save();
    return { ok: true };
  }

  // --- 0.5 additions: copy / cut / paste ---
  copy(path) {
    const { node } = this._resolve(path);
    if (!node) return { ok: false, error: 'Not found' };
    this.clipboard = { mode: 'copy', path };
    return { ok: true };
  }

  cut(path) {
    const { node } = this._resolve(path);
    if (!node) return { ok: false, error: 'Not found' };
    this.clipboard = { mode: 'cut', path };
    return { ok: true };
  }

  paste(destFolderPath) {
    if (!this.clipboard) return { ok: false, error: 'Clipboard empty' };
    const dest = this._getFolder(destFolderPath);
    if (!dest) return { ok: false, error: 'Destination not a folder' };
    const { node: srcNode, parent: srcParent, key: srcKey } = this._resolve(this.clipboard.path);
    if (!srcNode) return { ok: false, error: 'Source no longer exists' };
    // prevent pasting folder into itself
    const destPath = destFolderPath.replace(/\/+$/,'') || '/Home';
    if (srcNode.type === 'folder' && (destPath === this.clipboard.path || destPath.startsWith(this.clipboard.path + '/'))) {
      return { ok: false, error: 'Cannot paste folder into itself' };
    }
    // resolve name conflict
    let name = srcNode.name;
    let finalName = name;
    let i = 1;
    while (dest.children[finalName]) {
      const dot = name.lastIndexOf('.');
      if (dot > 0) finalName = name.slice(0, dot) + ` (${i})` + name.slice(dot);
      else finalName = `${name} (${i})`;
      i++;
    }
    if (this.clipboard.mode === 'copy') {
      const clone = deepCloneNode(srcNode);
      clone.name = finalName;
      dest.children[finalName] = clone;
    } else {
      // cut -> move
      delete srcParent.children[srcKey];
      srcNode.name = finalName;
      dest.children[finalName] = srcNode;
      this.clipboard = null;
    }
    this._save();
    return { ok: true, name: finalName };
  }

  // helpers
  join(parent, name) {
    if (!parent || parent === '/' ) return `/Home/${name}`;
    let p = parent.replace(/\/+$/,'');
    if (!p.startsWith('/')) p = '/' + p;
    if (!p.startsWith('/Home')) p = '/Home' + p;
    return `${p}/${name}`;
  }

  parentDir(path) {
    const parts = this._parts(path);
    if (parts.length <= 1) return '/Home';
    parts.pop();
    return '/' + parts.join('/');
  }
}

export const fs = new FileSystem();
