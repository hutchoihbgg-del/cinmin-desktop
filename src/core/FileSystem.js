// FileSystem.js — in-memory simulated filesystem for Cinmin
// All apps share this single instance. No real OS filesystem access.

export class FileSystem {
  constructor() {
    // root node
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
    // if path starts with Home, skip root matching
    // Our root IS Home, so /Home == root, /Home/Documents == root/Documents
    let cur = this.root;
    let parent = null;
    let key = null;
    // if first part is Home, drop it (root is Home)
    if (parts[0] === 'Home') parts.shift();
    // empty after shift => root
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

  // get folder node for directory path, null if not folder
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
      // for display
    }));
  }

  exists(path) {
    const { node } = this._resolve(path);
    return !!node;
  }

  // path is parent dir; name is new entry name
  createFolder(parentPath, name) {
    if (!name || name.includes('/')) return { ok: false, error: 'Invalid name' };
    const folder = this._getFolder(parentPath);
    if (!folder) return { ok: false, error: 'Parent not found' };
    if (folder.children[name]) return { ok: false, error: 'Already exists' };
    folder.children[name] = { type: 'folder', name, children: {} };
    return { ok: true };
  }

  createFile(parentPath, name, content = '') {
    if (!name || name.includes('/')) return { ok: false, error: 'Invalid name' };
    const folder = this._getFolder(parentPath);
    if (!folder) return { ok: false, error: 'Parent not found' };
    if (folder.children[name]) return { ok: false, error: 'Already exists' };
    folder.children[name] = { type: 'file', name, content };
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
    return { ok: true };
  }

  delete(path) {
    const { node, parent, key } = this._resolve(path);
    if (!node || !parent) return { ok: false, error: 'Cannot delete root or not found' };
    delete parent.children[key];
    return { ok: true };
  }

  rename(path, newName) {
    if (!newName || newName.includes('/')) return { ok: false, error: 'Invalid name' };
    const { node, parent, key } = this._resolve(path);
    if (!node || !parent) return { ok: false, error: 'Not found' };
    if (parent.children[newName]) return { ok: false, error: 'Name already exists' };
    // move
    delete parent.children[key];
    node.name = newName;
    parent.children[newName] = node;
    return { ok: true };
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
    // remove last
    parts.pop();
    // if first is Home already
    return '/' + parts.join('/');
  }
}

export const fs = new FileSystem();
