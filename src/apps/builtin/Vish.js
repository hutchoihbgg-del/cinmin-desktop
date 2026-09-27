// Vish.js — builtin web-compatible frontend (1.2)
// The .flatpakref in native-apps/ is metadata for Linux/Flatpak only.
// This UI runs inside Cinmin, no Flatpak execution in the browser.

import { storage } from '../../core/Storage.js';

function appStore(id) {
  return {
    get: (k, fb = null) => storage.get(`cinmin:app:${id}:${k}`, fb),
    set: (k, v) => storage.set(`cinmin:app:${id}:${k}`, v),
  };
}

export function createVishContent() {
  const store = appStore('vish');
  const wrap = document.createElement('div');
  wrap.className = 'vish-app';
  wrap.style.padding = '16px';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';
  const note = store.get('note', '');
  wrap.innerHTML = `
    <h2 style="margin:0">Vish</h2>
    <p style="font-size:12px; opacity:0.7">Native Linux application (Flatpak reference in <code>native-apps/</code>).<br>
    Web version — this interface runs inside Cinmin. The Flatpak does <b>not</b> run in the browser.</p>
    <label style="font-size:12px">Local note (stored in <code>cinmin:app:vish:</code>)
      <textarea class="vish-note" style="width:100%; min-height:80px; margin-top:4px" placeholder="Type something...">${String(note).replace(/</g, '&lt;')}</textarea>
    </label>
    <div class="vish-status" style="font-size:11px; opacity:0.6">Ready</div>
  `;
  const ta = wrap.querySelector('.vish-note');
  const st = wrap.querySelector('.vish-status');
  ta.addEventListener('input', () => { store.set('note', ta.value); st.textContent = 'Saved locally'; });
  // Lifecycle hooks used by WindowManager if present
  wrap._destroy = () => {};
  return wrap;
}
