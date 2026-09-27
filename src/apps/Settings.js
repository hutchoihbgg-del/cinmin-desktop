// Settings.js — 0.8: adds Plugins UI

import { events } from '../core/EventBus.js';
import { pluginManager } from '../core/PluginManager.js';

export function createSettingsContent() {
  const wrap = document.createElement('div');
  wrap.className = 'settings';
  wrap.innerHTML = `
    <h2 class="settings-title">Settings</h2>

    <section class="settings-section">
      <h3>Appearance</h3>
      <label><input type="radio" name="theme" value="dark"> Dark</label>
      <label><input type="radio" name="theme" value="light"> Light</label>
    </section>

    <section class="settings-section">
      <h3>Wallpaper</h3>
      <div class="wallpaper-grid">
        <button class="wp-btn" data-wp="default">Default (Mint Purple)</button>
        <button class="wp-btn" data-wp="blue">Blue</button>
        <button class="wp-btn" data-wp="purple">Purple</button>
        <button class="wp-btn" data-wp="midnight">Midnight</button>
      </div>
    </section>

    <section class="settings-section">
      <h3>Accent Color</h3>
      <input type="color" class="accent-picker" value="#8b5cf6" />
    </section>

    <section class="settings-section">
      <h3>Desktop</h3>
      <label><input type="checkbox" class="show-icons-check" checked> Show desktop icons</label>
      <label>Icon size: <select class="icon-size-select">
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select></label>
      <label><input type="checkbox" class="anim-check" checked> Enable window animations</label>
    </section>

    <section class="settings-section" id="plugins-section">
      <h3>Plugins</h3>
      <div id="plugins-list"></div>
    </section>

    <section class="settings-section">
      <h3>About</h3>
      <p style="font-size:12px; opacity:0.7">Cinmin 0.8 — Plugin Ecosystem. Appearance locked at 0.4.</p>
    </section>
  `;

  const themeRadios = wrap.querySelectorAll('input[name="theme"]');
  const wpBtns = wrap.querySelectorAll('.wp-btn');
  const accentPicker = wrap.querySelector('.accent-picker');
  const showIconsCheck = wrap.querySelector('.show-icons-check');
  const iconSizeSelect = wrap.querySelector('.icon-size-select');
  const animCheck = wrap.querySelector('.anim-check');

  const savedTheme = localStorage.getItem('cinmin:theme') || 'dark';
  const savedWp = localStorage.getItem('cinmin:wallpaper') || 'default';
  const savedAccent = localStorage.getItem('cinmin:accent') || '#8b5cf6';
  const savedShow = localStorage.getItem('cinmin:showIcons');
  const showIcons = savedShow === null ? true : savedShow === 'true';
  const savedSize = localStorage.getItem('cinmin:iconSize') || 'medium';
  const savedAnim = localStorage.getItem('cinmin:animations');
  const animEnabled = savedAnim === null ? true : savedAnim === 'true';

  themeRadios.forEach(r => { if (r.value === savedTheme) r.checked = true; });
  accentPicker.value = savedAccent;
  showIconsCheck.checked = showIcons;
  iconSizeSelect.value = savedSize;
  animCheck.checked = animEnabled;
  wpBtns.forEach(b => b.classList.toggle('active', b.dataset.wp === savedWp));

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cinmin:theme', theme);
  }
  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('cinmin:accent', color);
  }
  applyTheme(savedTheme);
  applyAccent(savedAccent);
  // apply icon size + animations to root
  document.documentElement.setAttribute('data-icon-size', savedSize);
  document.documentElement.setAttribute('data-animations', String(animEnabled));

  themeRadios.forEach(r => r.addEventListener('change', () => {
    if (r.checked) { applyTheme(r.value); events.emit('settings:changed'); }
  }));
  wpBtns.forEach(b => b.addEventListener('click', () => {
    wpBtns.forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    localStorage.setItem('cinmin:wallpaper', b.dataset.wp);
    events.emit('settings:changed');
  }));
  accentPicker.addEventListener('input', () => { applyAccent(accentPicker.value); });
  showIconsCheck.addEventListener('change', () => {
    localStorage.setItem('cinmin:showIcons', String(showIconsCheck.checked));
    events.emit('settings:changed');
  });
  iconSizeSelect.addEventListener('change', () => {
    localStorage.setItem('cinmin:iconSize', iconSizeSelect.value);
    document.documentElement.setAttribute('data-icon-size', iconSizeSelect.value);
    events.emit('settings:changed');
  });
  animCheck.addEventListener('change', () => {
    localStorage.setItem('cinmin:animations', String(animCheck.checked));
    document.documentElement.setAttribute('data-animations', String(animCheck.checked));
    events.emit('settings:changed');
  });

  // plugins UI
  function renderPlugins(){
    const list = wrap.querySelector('#plugins-list');
    if(!list) return;
    list.innerHTML='';
    const plugins = pluginManager.listPlugins();
    plugins.forEach(p=>{
      const row=document.createElement('div');
      row.style.cssText='display:flex; flex-direction:column; gap:6px; padding:10px; background:rgba(255,255,255,0.06); border-radius:10px; margin-bottom:8px';
      const icon = p.id==='HTMLDEBUG' ? '🐛' : p.id==='COWSAY' ? '🐮' : p.id==='HELLOWORLD' ? '👋' : p.id==='CALCULATOR' ? '🧮' : p.id==='MARKDOWN' ? '📝' : '📦';
      const status = p.status;
      const statusLabel = status==='installed' ? '[ Enabled ]' : status==='disabled' ? '[ Disabled ]' : status==='failed' ? '[ Failed ]' : '[ Not installed ]';
      row.innerHTML=`
        <div style="font-weight:600; font-size:13px">${icon} ${p.name} <small style="opacity:0.6">${p.version}</small> <small style="float:right">${statusLabel}</small></div>
        <div style="font-size:12px; opacity:0.7">${p.description}</div>
        <div style="display:flex; gap:6px">
          <button data-a="toggle">${status==='disabled' ? 'Enable' : 'Disable'}</button>
          <button data-a="remove">Remove</button>
          <button data-a="info">Info</button>
        </div>
      `;
      const toggle=row.querySelector('[data-a="toggle"]');
      const remove=row.querySelector('[data-a="remove"]');
      const info=row.querySelector('[data-a="info"]');
      // style buttons
      [toggle,remove,info].forEach(b=> b.style.cssText='padding:4px 8px; border-radius:6px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.08); color:white; cursor:pointer; font-size:11px');
      toggle.addEventListener('click', async ()=>{
        if(status==='disabled') await pluginManager.enable(p.id);
        else if(status==='installed') await pluginManager.disable(p.id);
        else if(status==='available') await pluginManager.install(p.id);
        renderPlugins();
      });
      toggle.textContent = status==='disabled' ? 'Enable' : status==='available' ? 'Install' : status==='failed' ? 'Retry' : 'Disable';
      if(status==='available') toggle.addEventListener('click',()=>{}, {once:true}); // already handled
      remove.addEventListener('click', async ()=>{ if(p.status!=='available'){ await pluginManager.remove(p.id); renderPlugins(); } else alert('Not installed'); });
      info.addEventListener('click', ()=> alert(`${p.name}\nVersion: ${p.version}\n${p.description}\nCommands: ${(p.commands||[]).join(', ')||'none'}\nStatus: ${status}`));
      list.appendChild(row);
    });
  }
  renderPlugins();

  return wrap;
}
