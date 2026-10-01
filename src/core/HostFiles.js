// HostFiles.js — real-PC file access for the web build (1.4)
// Browsers can't browse the whole disk unasked. Instead the USER picks files:
//   Import: File System Access API (showOpenFilePicker) with <input type=file> fallback
//   Export: download a virtual file to the real PC via Blob + anchor
// Read/copy model: imported files are COPIED into the virtual FS. Nothing is
// written back to the PC unless the user exports. No permissions, no install.

import { fs } from './FileSystem.js';

const MAX_IMPORT_BYTES = 1024 * 1024; // 1MB guard — virtual FS lives in localStorage

export function importMethod() {
  if (typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function') return 'picker';
  return 'input';
}

async function readPickedFile(file) {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, error: `"${file.name}" is too big (${Math.round(file.size / 1024)}KB, max 1024KB).` };
  const text = await file.text();
  return { ok: true, name: file.name, content: text };
}

// Import real files into a virtual folder, one file per picker.
// Returns { imported: [names], errors: [] }. Pass { single: true } for one file.
export async function importFromPC(destFolder, { single = false } = {}) {
  const imported = [];
  const errors = [];
  if (importMethod() === 'picker') {
    let handles;
    try {
      handles = await window.showOpenFilePicker({ multiple: !single });
    } catch (e) {
      if (e && e.name === 'AbortError') return { imported, errors, cancelled: true };
      return { imported, errors: [String(e.message || e)] };
    }
    for (const h of handles) {
      try {
        const file = await h.getFile();
        const r = await readPickedFile(file);
        if (!r.ok) { errors.push(r.error); continue; }
        const cr = fs.createFile(destFolder, r.name, r.content);
        if (!cr.ok) {
          // name clash → try "name (1).ext"
          const dot = r.name.lastIndexOf('.');
          let alt = r.name, i = 1;
          while (!fs.createFile(destFolder, alt, r.content).ok && i < 50) {
            alt = dot > 0 ? r.name.slice(0, dot) + ` (${i})` + r.name.slice(dot) : `${r.name} (${i})`;
            i++;
          }
          const done = fs.exists(`${destFolder}/${alt}`);
          if (done) imported.push(alt);
          else errors.push(`"${r.name}": ${cr.error}`);
        } else imported.push(r.name);
      } catch (e) { errors.push(String(e.message || e)); }
    }
    return { imported, errors };
  }
  // fallback: hidden file input
  return new Promise((resolve) => {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = !single;
    inp.style.display = 'none';
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      for (const file of inp.files) {
        const r = await readPickedFile(file);
        if (!r.ok) { errors.push(r.error); continue; }
        const cr = fs.createFile(destFolder, r.name, r.content);
        if (!cr.ok) errors.push(`"${r.name}": ${cr.error}`);
        else imported.push(r.name);
      }
      inp.remove();
      resolve({ imported, errors });
    });
    inp.addEventListener('cancel', () => { inp.remove(); resolve({ imported, errors, cancelled: true }); });
    inp.click();
  });
}

// Export a virtual file to the real PC (Chrome download system)
export function exportToPC(virtualPath) {
  const res = fs.readFile(virtualPath);
  if (!res.ok) return res;
  const name = virtualPath.split('/').pop();
  const blob = new Blob([res.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  return { ok: true, name };
}

// Handle OS drag-drop File objects dropped onto Explorer
export async function importDroppedFiles(fileList, destFolder) {
  const imported = [];
  const errors = [];
  for (const file of fileList) {
    const r = await readPickedFile(file);
    if (!r.ok) { errors.push(r.error); continue; }
    const cr = fs.createFile(destFolder, r.name, r.content);
    if (!cr.ok) errors.push(`"${r.name}": ${cr.error}`);
    else imported.push(r.name);
  }
  return { imported, errors };
}
