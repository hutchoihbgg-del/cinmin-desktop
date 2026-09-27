// Vish.js — local notes app (1.3). Web-safe, offline, no network.
// Data model: { id, title, content, created, modified, tags[] } in cinmin:app:vish:

import { storage } from '../../core/Storage.js';

const NS = 'vish:notes';

function loadNotes() {
  const v = storage.get(`cinmin:app:vish:${NS}`, []);
  return Array.isArray(v) ? v : [];
}
function saveNotes(n) { storage.set(`cinmin:app:vish:${NS}`, n); }
function uid() { return 'note-' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36); }
function relTime(ts) {
  const d = Date.now() - ts;
  if (d < 864e5) { const dt = new Date(ts); return dt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  if (d < 7 * 864e5) return new Date(ts).toLocaleDateString([], { weekday: 'long' });
  return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function createVishContent() {
  let notes = loadNotes();
  if (!notes.length) {
    notes = [
      { id: uid(), title: 'Welcome', content: 'Vish notes live in cinmin:app:vish: — offline, autosaved.', created: Date.now(), modified: Date.now(), tags: ['welcome'] },
    ];
    saveNotes(notes);
  }
  let selected = notes[0]?.id || null;
  let query = '';

  const wrap = document.createElement('div');
  wrap.className = 'vish-app';
  wrap.style.cssText = 'display:flex; flex-direction:column; flex:1; min-height:0; padding:10px; gap:8px';
  wrap.innerHTML = `
    <h2 style="margin:0">Vish</h2>
    <input class="vish-search" placeholder="Search notes..." style="padding:7px 10px; border-radius:8px" />
    <div class="vish-body" style="display:flex; gap:8px; flex:1; min-height:0">
      <div class="vish-list" style="width:150px; overflow:auto; display:flex; flex-direction:column; gap:4px"></div>
      <div class="vish-editor" style="flex:1; display:flex; flex-direction:column; gap:6px; min-width:0">
        <input class="vish-title" placeholder="Title" style="padding:7px 10px; border-radius:8px" />
        <input class="vish-tags" placeholder="tags, comma separated" style="padding:6px 10px; border-radius:8px; font-size:11px" />
        <textarea class="vish-content" placeholder="Write..." style="flex:1; min-height:120px; padding:8px; border-radius:8px"></textarea>
        <div class="vish-status" style="font-size:11px; opacity:0.6">Saved</div>
      </div>
    </div>
    <button class="vish-new" style="padding:7px; border-radius:8px; cursor:pointer">+ New Note</button>
  `;
  const search = wrap.querySelector('.vish-search');
  const list = wrap.querySelector('.vish-list');
  const title = wrap.querySelector('.vish-title');
  const tags = wrap.querySelector('.vish-tags');
  const content = wrap.querySelector('.vish-content');
  const status = wrap.querySelector('.vish-status');

  let timer = null;
  function persist() { saveNotes(notes); }
  function markSaving() { status.textContent = 'Saving...'; }
  function markSaved() { status.textContent = 'Saved'; }
  function scheduleSave() {
    markSaving();
    clearTimeout(timer);
    timer = setTimeout(() => { persist(); markSaved(); }, 400);
  }

  function matches(n) {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || (n.tags || []).join(' ').toLowerCase().includes(q);
  }

  function renderList() {
    list.innerHTML = '';
    const shown = notes.filter(matches).sort((a, b) => b.modified - a.modified);
    if (!shown.length) { list.innerHTML = '<div style="font-size:11px; opacity:0.5">No notes</div>'; return; }
    shown.forEach(n => {
      const b = document.createElement('button');
      b.style.cssText = `text-align:left; padding:7px 8px; border-radius:8px; cursor:pointer; border:${n.id === selected ? '1px solid #8b5cf6' : '1px solid transparent'}; background:${n.id === selected ? 'rgba(139,92,246,0.15)' : 'transparent'}; color:inherit`;
      b.innerHTML = `<div style="font-weight:600; font-size:12px">${escapeHtml(n.title || 'Untitled')}</div><div style="font-size:10px; opacity:0.55">${relTime(n.modified)}</div>`;
      b.addEventListener('click', () => { selected = n.id; renderList(); renderEditor(); });
      b.addEventListener('dblclick', () => {
        if (confirm(`Delete "${n.title}"?`)) { notes = notes.filter(x => x.id !== n.id); selected = notes[0]?.id || null; persist(); renderList(); renderEditor(); }
      });
      list.appendChild(b);
    });
  }

  function renderEditor() {
    const n = notes.find(x => x.id === selected);
    if (!n) { title.value = ''; tags.value = ''; content.value = ''; return; }
    title.value = n.title; tags.value = (n.tags || []).join(', '); content.value = n.content;
  }

  function current() { return notes.find(x => x.id === selected); }
  title.addEventListener('input', () => { const n = current(); if (!n) return; n.title = title.value; n.modified = Date.now(); scheduleSave(); renderList(); });
  tags.addEventListener('input', () => { const n = current(); if (!n) return; n.tags = tags.value.split(',').map(t => t.trim()).filter(Boolean); n.modified = Date.now(); scheduleSave(); });
  content.addEventListener('input', () => { const n = current(); if (!n) return; n.content = content.value; n.modified = Date.now(); scheduleSave(); });
  search.addEventListener('input', () => { query = search.value; renderList(); });
  wrap.querySelector('.vish-new').addEventListener('click', () => {
    const n = { id: uid(), title: 'Untitled', content: '', created: Date.now(), modified: Date.now(), tags: [] };
    notes.unshift(n); selected = n.id; persist(); renderList(); renderEditor(); title.focus(); title.select();
  });

  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  renderList(); renderEditor();
  wrap._destroy = () => clearTimeout(timer);
  return wrap;
}
