// Notepad.js — simple text editor tied to fs

import { fs } from '../core/FileSystem.js';
import { events } from '../core/EventBus.js';

export function createNotepadContent(initialPath = null) {
  const wrap = document.createElement('div');
  wrap.className = 'notepad';
  wrap.innerHTML = `
    <div class="notepad-toolbar">
      <button data-action="new">New</button>
      <button data-action="open">Open</button>
      <button data-action="save">Save</button>
      <button data-action="saveAs">Save As</button>
      <span class="notepad-filename"></span>
    </div>
    <textarea class="notepad-editor" placeholder="Start typing..."></textarea>
    <div class="notepad-status">Ready</div>
  `;
  const editor = wrap.querySelector('.notepad-editor');
  const status = wrap.querySelector('.notepad-status');
  const filenameEl = wrap.querySelector('.notepad-filename');

  let currentPath = initialPath; // full path like /Home/README.txt or null for untitled
  let dirty = false;

  function setPath(p) {
    currentPath = p;
    filenameEl.textContent = p ? p : 'Untitled';
  }
  function setStatus(msg) { status.textContent = msg; }

  function loadPath(p) {
    const r = fs.readFile(p);
    if (!r.ok) { setStatus(r.error); return; }
    editor.value = r.content;
    setPath(p);
    dirty = false;
    setStatus(`Opened ${p}`);
  }

  if (initialPath) loadPath(initialPath);
  else setPath(null);

  editor.addEventListener('input', () => { dirty = true; setStatus('Modified — Ctrl+S to save'); });

  wrap.querySelector('[data-action="new"]').addEventListener('click', () => {
    editor.value = ''; setPath(null); dirty = false; setStatus('New file');
  });
  wrap.querySelector('[data-action="open"]').addEventListener('click', () => {
    const p = prompt('Open path (e.g. /Home/README.txt):', currentPath || '/Home/README.txt');
    if (!p) return;
    loadPath(p);
  });
  function doSave() {
    if (!currentPath) return doSaveAs();
    const r = fs.writeFile(currentPath, editor.value);
    if (!r.ok) { setStatus(r.error); alert(r.error); return; }
    dirty = false; setStatus(`Saved to ${currentPath}`);
  }
  function doSaveAs() {
    const p = prompt('Save as path (e.g. /Home/Documents/notes.txt):', currentPath || '/Home/Documents/untitled.txt');
    if (!p) return;
    // split into dir + name
    const slash = p.lastIndexOf('/');
    const dir = p.slice(0, slash) || '/Home';
    const name = p.slice(slash + 1);
    if (!fs.exists(p)) {
      const cr = fs.createFile(dir, name, editor.value);
      if (!cr.ok) { setStatus(cr.error); alert(cr.error); return; }
      setPath(p); dirty = false; setStatus(`Saved as ${p}`);
    } else {
      const wr = fs.writeFile(p, editor.value);
      if (!wr.ok) { alert(wr.error); return; }
      setPath(p); dirty = false; setStatus(`Saved to ${p}`);
    }
  }
  wrap.querySelector('[data-action="save"]').addEventListener('click', doSave);
  wrap.querySelector('[data-action="saveAs"]').addEventListener('click', doSaveAs);

  // Ctrl+S
  wrap.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); }
  });
  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); e.stopPropagation(); }
  });

  // allow opening files via event
  events.on('file:open', (path) => {
    // only handle if this notepad instance is focused? For simplicity, load if untitled
    // We'll not auto-load to avoid stealing; instead provide helper
  });
  // expose for window manager to focus editor
  wrap._loadPath = loadPath;
  wrap._getDirty = () => dirty;

  return wrap;
}
