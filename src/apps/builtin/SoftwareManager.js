// SoftwareManager.js — 1.3 live updates + packages + details
// Sections: Installed Apps / Built-in Apps / Plugins / Packages
// Listens for plugin:*/package:* events — refreshes without reload.

import { listApps, getApp } from '../../core/AppRegistry.js';
import { pluginManager } from '../../core/PluginManager.js';
import { events } from '../../core/EventBus.js';
import { listPackages, installFromPath, uninstall as uninstallPkg, setEnabled as setPkgEnabled } from '../../core/AppPackageManager.js';
import { fs } from '../../core/FileSystem.js';

function row(title, sub, badge, buttons) {
  const el = document.createElement('div');
  el.style.cssText = 'display:flex; align-items:center; gap:8px; padding:8px; background:rgba(255,255,255,0.06); border-radius:8px; margin-bottom:6px';
  el.innerHTML = `<span style="flex:1"><b>${title}</b><br><small style="opacity:0.6">${sub}</small></span><span style="font-size:11px; opacity:0.6">${badge}</span><span class="sm-btns" style="display:flex; gap:4px"></span>`;
  const box = el.querySelector('.sm-btns');
  (buttons || []).forEach(([label, fn]) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:4px 8px; border-radius:6px; font-size:11px; cursor:pointer';
    b.addEventListener('click', fn);
    box.appendChild(b);
  });
  return el;
}

function details(a) {
  alert(
    `Name: ${a.title || a.name}\nIcon: ${a.icon || ''}\nVersion: ${a.version || '?'}\n` +
    `Source: ${a.source || 'builtin'}\nDescription: ${a.description || ''}\n` +
    `Author: ${a.author || 'Cinmin'}\nCategory: ${a.category || a.cat || ''}\n` +
    `Permissions: ${(a.permissions || []).join(', ') || 'none'}\nStatus: ${a.status || 'ready'}`
  );
}

export function createSoftwareManagerContent() {
  const wrap = document.createElement('div');
  wrap.className = 'software-manager';
  wrap.style.padding = '14px';
  wrap.style.display = 'flex';
  wrap.style.flexDirection = 'column';
  wrap.style.gap = '6px';
  wrap.style.overflow = 'auto';
  wrap.innerHTML = `
    <h2 style="margin:0">Software Manager</h2>
    <h3 class="sm-h">Installed Apps</h3><div class="sm-installed"></div>
    <h3 class="sm-h">Built-in Apps</h3><div class="sm-builtin"></div>
    <h3 class="sm-h">Plugins</h3><div class="sm-plugins"></div>
    <h3 class="sm-h">Packages (.capp)</h3>
    <div style="display:flex; gap:6px; margin-bottom:6px">
      <button data-a="installLocal">Install Local App…</button>
    </div>
    <div class="sm-packages"></div>
  `;
  wrap.querySelectorAll('.sm-h').forEach(h => { h.style.cssText = 'font-size:12px; opacity:0.6; margin:8px 0 4px'; });

  function render() {
    const installed = listApps().filter(a => a.source !== 'builtin');
    const builtin = listApps().filter(a => a.source === 'builtin');
    const iEl = wrap.querySelector('.sm-installed');
    const bEl = wrap.querySelector('.sm-builtin');
    const pEl = wrap.querySelector('.sm-plugins');
    const kEl = wrap.querySelector('.sm-packages');
    iEl.innerHTML = ''; bEl.innerHTML = ''; pEl.innerHTML = ''; kEl.innerHTML = '';

    if (!installed.length) iEl.appendChild(row('(none)', 'Install a plugin or .capp package', '', []));
    installed.forEach(a => {
      const badge = a.source === 'plugin' ? 'Plugin · Installed' : 'Package · Installed';
      iEl.appendChild(row(`${a.icon} ${a.title}`, `v${a.version || '?'} · ${a.category || ''}`, badge, [
        ['Details', () => details(a)],
        ['Open', () => events.emit('app:launch', a.id)],
      ]));
    });
    builtin.forEach(a => {
      bEl.appendChild(row(`${a.icon} ${a.title}`, `v${a.version} · ${a.category || ''} · ${a.description || ''}`, 'Included', [
        ['Details', () => details({ ...a, status: 'ready' })],
      ]));
    });
    pluginManager.listPlugins().forEach(p => {
      const acts = [];
      if (p.status === 'available') acts.push(['Install', async () => { await pluginManager.install(p.id); }]);
      else acts.push(['Details', () => details({ title: p.name, icon: '🧩', version: p.version, source: 'plugin', description: p.description, author: p.author, category: p.apps?.[0]?.category || '', permissions: p.permissions, status: p.status })]);
      if (p.status === 'installed') acts.push(['Disable', async () => { await pluginManager.disable(p.id); }]);
      if (p.status === 'disabled') acts.push(['Enable', async () => { await pluginManager.enable(p.id); }]);
      if (p.status !== 'available') acts.push(['Remove', async () => { await pluginManager.remove(p.id); }]);
      pEl.appendChild(row(`${p.name}`, `v${p.version} · ${(p.commands || []).join(', ') || 'no commands'}`, p.status, acts));
    });
    const pkgs = listPackages();
    if (!pkgs.length) kEl.appendChild(row('(none)', 'Install a .capp from /Home/Downloads', '', []));
    pkgs.forEach(p => {
      kEl.appendChild(row(`${p.icon || '📦'} ${p.name}`, `v${p.version} · ${p.category || ''}`, p.status === 'disabled' ? 'Disabled' : 'Package · Installed', [
        ['Details', () => details({ title: p.name, icon: p.icon, version: p.version, source: 'package', description: p.description, author: p.author, category: p.category, permissions: p.permissions, status: p.status })],
        [p.status === 'disabled' ? 'Enable' : 'Disable', () => { setPkgEnabled(p.id, p.status === 'disabled'); }],
        ['Remove', () => confirmRemove(p)],
      ]));
    });
  }

  function confirmRemove(p) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.5); display:grid; place-items:center; z-index:400';
    overlay.innerHTML = `
      <div style="background:#1e1b2e; border-radius:12px; padding:16px; min-width:260px; color:white">
        <div style="font-weight:700">Remove ${p.name}?</div>
        <label style="display:flex; gap:6px; font-size:12px; margin:10px 0"><input type="checkbox" class="del-data"> Delete application data</label>
        <div style="display:flex; gap:8px"><button data-a="cancel">Cancel</button><button data-a="remove">Remove</button></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-a="cancel"]').addEventListener('click', () => overlay.remove());
    overlay.querySelector('[data-a="remove"]').addEventListener('click', () => {
      const del = overlay.querySelector('.del-data').checked;
      uninstallPkg(p.id, { deleteData: del });
      overlay.remove();
    });
  }

  wrap.querySelector('[data-a="installLocal"]').addEventListener('click', () => {
    // pick a .capp from virtual FS (Downloads first)
    const candidates = [];
    for (const dir of ['/Home/Downloads', '/Home/Documents', '/Home']) {
      const items = fs.list(dir);
      if (!items) continue;
      items.filter(i => i.type === 'file' && i.name.endsWith('.capp')).forEach(i => candidates.push(`${dir}/${i.name}`));
    }
    if (!candidates.length) { alert('No .capp files found. Put one in /Home/Downloads first.'); return; }
    const pick = prompt(`Install which package?\n${candidates.join('\n')}`, candidates[0]);
    if (!pick) return;
    const r = installFromPath(pick.trim());
    if (!r.ok) alert(`Installation failed\n\n${r.error}`);
  });

  // live refresh on any lifecycle event — no reload required
  const refresh = () => render();
  ['plugin:installed', 'plugin:removed', 'plugin:enabled', 'plugin:disabled', 'plugin:failed', 'plugin:loaded', 'plugin:unloaded', 'package:installed', 'package:uninstalled', 'package:enabled', 'package:disabled'].forEach(ev => events.on(ev, refresh));
  render();
  wrap._refresh = render;
  wrap._destroy = () => {
    ['plugin:installed', 'plugin:removed', 'plugin:enabled', 'plugin:disabled', 'plugin:failed', 'plugin:loaded', 'plugin:unloaded', 'package:installed', 'package:uninstalled', 'package:enabled', 'package:disabled'].forEach(ev => events.off(ev, refresh));
  };
  return wrap;
}
