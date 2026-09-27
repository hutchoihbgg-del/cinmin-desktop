// SoftwareManager.js — builtin section + plugin section (1.2)

import { listApps } from '../../core/AppRegistry.js';
import { pluginManager } from '../../core/PluginManager.js';

export function createSoftwareManagerContent() {
  const wrap = document.createElement('div');
  wrap.className = 'software-manager';
  wrap.style.padding = '14px';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '10px';
  wrap.innerHTML = `
    <h2 style="margin:0">Software Manager</h2>
    <h3 style="font-size:12px; opacity:0.6; margin:4px 0 0">Built-in — included with Cinmin</h3>
    <div class="sm-builtin"></div>
    <h3 style="font-size:12px; opacity:0.6; margin:8px 0 0">Plugins — optional</h3>
    <div class="sm-plugins"></div>
  `;
  const bEl = wrap.querySelector('.sm-builtin');
  const pEl = wrap.querySelector('.sm-plugins');

  function render() {
    bEl.innerHTML = '';
    listApps().filter(a => a.source === 'builtin').forEach(a => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px; background:rgba(255,255,255,0.06); border-radius:8px; margin-bottom:6px';
      row.innerHTML = `<span style="font-size:18px">${a.icon}</span><span style="flex:1"><b>${a.title}</b> <small style="opacity:0.5">v${a.version}</small><br><small style="opacity:0.6">${a.description || ''}</small></span><span style="font-size:11px; opacity:0.6">Included</span>`;
      bEl.appendChild(row);
    });
    pEl.innerHTML = '';
    pluginManager.listPlugins().forEach(p => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px; background:rgba(255,255,255,0.06); border-radius:8px; margin-bottom:6px';
      const btn = p.status === 'available' ? `<button data-a="install">Install</button>` : `<span style="font-size:11px; opacity:0.6">${p.status}</span>`;
      row.innerHTML = `<span style="flex:1"><b>${p.name}</b> <small style="opacity:0.5">v${p.version}</small></span>${btn}`;
      const b = row.querySelector('[data-a="install"]');
      b && b.addEventListener('click', async () => { await pluginManager.install(p.id); render(); });
      pEl.appendChild(row);
    });
  }
  render();
  wrap._refresh = render;
  return wrap;
}
