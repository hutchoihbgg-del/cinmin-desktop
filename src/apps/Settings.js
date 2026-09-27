// Settings.js — wallpaper, theme, accent, icons

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
        <button class="wp-btn" data-wp="default">Default</button>
        <button class="wp-btn" data-wp="blue">Blue</button>
        <button class="wp-btn" data-wp="purple">Purple</button>
        <button class="wp-btn" data-wp="midnight">Midnight</button>
      </div>
    </section>

    <section class="settings-section">
      <h3>Accent Color</h3>
      <input type="color" class="accent-picker" value="#7c6cff" />
    </section>

    <section class="settings-section">
      <h3>Desktop</h3>
      <label><input type="checkbox" class="show-icons-check" checked> Show desktop icons</label>
    </section>
  `;

  const themeRadios = wrap.querySelectorAll('input[name="theme"]');
  const wpBtns = wrap.querySelectorAll('.wp-btn');
  const accentPicker = wrap.querySelector('.accent-picker');
  const showIconsCheck = wrap.querySelector('.show-icons-check');

  // load from localStorage
  const savedTheme = localStorage.getItem('cinmin:theme') || 'dark';
  const savedWp = localStorage.getItem('cinmin:wallpaper') || 'default';
  const savedAccent = localStorage.getItem('cinmin:accent') || '#7c6cff';
  const savedShow = localStorage.getItem('cinmin:showIcons');
  const showIcons = savedShow === null ? true : savedShow === 'true';

  themeRadios.forEach(r => { if (r.value === savedTheme) r.checked = true; });
  accentPicker.value = savedAccent;
  showIconsCheck.checked = showIcons;
  wpBtns.forEach(b => b.classList.toggle('active', b.dataset.wp === savedWp));

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cinmin:theme', theme);
  }
  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent', color);
    localStorage.setItem('cinmin:accent', color);
  }
  // initial
  applyTheme(savedTheme);
  applyAccent(savedAccent);

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

  return wrap;
}
