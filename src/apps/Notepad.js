// Notepad.js — 0.5: unsaved indicator + file integration + notifications

import { fs } from '../core/FileSystem.js';
import { notifier } from '../core/NotificationManager.js';

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
      <span class="notepad-dirty hidden" title="Unsaved changes">●</span>
    </div>
    <textarea class="notepad-editor" placeholder="Start typing..." aria-label="Notepad editor"></textarea>
    <div class="notepad-status" role="status">Ready</div>
  `;
  const editor = wrap.querySelector('.notepad-editor');
  const status = wrap.querySelector('.notepad-status');
  const filenameEl = wrap.querySelector('.notepad-filename');
  const dirtyDot = wrap.querySelector('.notepad-dirty');

  let currentPath = initialPath;
  let dirty = false;
  let lastSaved = '';

  function updateWindowTitle() {
    // find parent window titlebar and add • if dirty
    const win = wrap.closest('.window');
    const titleEl = win?.querySelector('.win-title');
    if (titleEl) {
      const base = currentPath ? `Notepad — ${currentPath.split('/').pop()}` : 'Notepad — Untitled';
      titleEl.textContent = dirty ? `• ${base}` : base;
    }
  }

  function setDirty(v) {
    dirty = v;
    dirtyDot.classList.toggle('hidden', !v);
    updateWindowTitle();
  }

  function setPath(p) {
    currentPath = p;
    filenameEl.textContent = p ? p : 'Untitled';
    updateWindowTitle();
  }
  function setStatus(msg) { status.textContent = msg; }

  function loadPath(p) {
    if (dirty && editor.value !== lastSaved) {
      if (!confirm('Unsaved changes will be lost. Continue?')) return;
    }
    const r = fs.readFile(p);
    if (!r.ok) { setStatus(r.error); notifier.error(r.error, 'Notepad'); return; }
    editor.value = r.content;
    lastSaved = r.content;
    setPath(p);
    setDirty(false);
    setStatus(`Opened ${p}`);
    notifier.success(`Opened ${p.split('/').pop()}`, 'Notepad');
  }

  if (initialPath) {
    const r = fs.readFile(initialPath);
    if (r.ok) { editor.value = r.content; lastSaved = r.content; setPath(initialPath); setStatus(`Opened ${initialPath}`); }
    else { setPath(initialPath); setStatus(r.error); }
  } else setPath(null);

  editor.addEventListener('input', () => {
    const isDirty = editor.value !== lastSaved;
    setDirty(isDirty);
    if (isDirty) setStatus('Modified — Ctrl+S to save');
    else setStatus('Saved');
  });

  wrap.querySelector('[data-action="new"]').addEventListener('click', () => {
    if (dirty && !confirm('Discard unsaved changes?')) return;
    editor.value = ''; lastSaved=''; setPath(null); setDirty(false); setStatus('New file');
  });
  wrap.querySelector('[data-action="open"]').addEventListener('click', () => {
    const p = prompt('Open path (e.g. /Home/README.txt):', currentPath || '/Home/README.txt');
    if (!p) return;
    loadPath(p);
  });
  function doSave() {
    if (!currentPath) return doSaveAs();
    const r = fs.writeFile(currentPath, editor.value);
    if (!r.ok) { setStatus(r.error); notifier.error(r.error, 'Notepad'); alert(r.error); return; }
    lastSaved = editor.value;
    setDirty(false); setStatus(`Saved to ${currentPath}`); notifier.success(`Saved ${currentPath.split('/').pop()}`, 'Notepad');
  }
  function doSaveAs() {
    const p = prompt('Save as path (e.g. /Home/Documents/notes.txt):', currentPath || '/Home/Documents/untitled.txt');
    if (!p) return;
    const slash = p.lastIndexOf('/');
    const dir = p.slice(0, slash) || '/Home';
    const name = p.slice(slash + 1);
    if (!fs.exists(p)) {
      const cr = fs.createFile(dir, name, editor.value);
      if (!cr.ok) { setStatus(cr.error); notifier.error(cr.error, 'Notepad'); alert(cr.error); return; }
      lastSaved = editor.value;
      setPath(p); setDirty(false); setStatus(`Saved as ${p}`); notifier.success(`Saved as ${name}`, 'Notepad');
    } else {
      const wr = fs.writeFile(p, editor.value);
      if (!wr.ok) { notifier.error(wr.error, 'Notepad'); alert(wr.error); return; }
      lastSaved = editor.value;
      setPath(p); setDirty(false); setStatus(`Saved to ${p}`); notifier.success(`Saved ${name}`, 'Notepad');
    }
  }
  wrap.querySelector('[data-action="save"]').addEventListener('click', doSave);
  wrap.querySelector('[data-action="saveAs"]').addEventListener('click', doSaveAs);

  wrap.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); }
  });
  editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); e.stopPropagation(); }
  });

  // expose for window manager / integration
  wrap._loadPath = loadPath;
  wrap._getDirty = () => dirty;
  // warn on window close if dirty (handled by WindowManager close interception)
  wrap._isDirty = () => dirty;

  return wrap;
}
