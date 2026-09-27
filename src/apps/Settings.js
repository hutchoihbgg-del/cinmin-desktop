// Settings.js — 0.5: wallpaper, theme, accent, icon size, animations

import { events } from '../core/EventBus.js';

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

    <section class="settings-section">
      <h3>About</h3>
      <p style="font-size:12px; opacity:0.7">Cinmin 0.5 — System Foundation. FS is persisted to localStorage.</p>
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

  return wrap;
}
