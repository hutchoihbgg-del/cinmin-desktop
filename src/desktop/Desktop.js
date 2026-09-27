// Desktop.js — renders wallpaper, icons, clock, start menu

import { events } from '../core/EventBus.js';

const ICONS = [
  { id: 'explorer', label: 'File Explorer', icon: '📁' },
  { id: 'terminal', label: 'Terminal', icon: '💻' },
  { id: 'notepad', label: 'Notepad', icon: '📝' },
  { id: 'htmlviewer', label: 'Browser', icon: '🌐' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
];

export function initDesktop() {
  const desktopEl = document.getElementById('desktop');
  const startBtn = document.getElementById('start-btn');
  const startMenu = document.getElementById('start-menu');
  const clockEl = document.getElementById('clock');

  // render icons
  function renderIcons() {
    const show = localStorage.getItem('cinmin:showIcons');
    if (show === 'false') { desktopEl.innerHTML = ''; return; }
    desktopEl.innerHTML = '';
    for (const item of ICONS) {
      const el = document.createElement('button');
      el.className = 'desktop-icon';
      el.dataset.app = item.id;
      el.innerHTML = `<span class="d-icon">${item.icon}</span><span class="d-label">${item.label}</span>`;
      let clicks = 0, timer = null;
      el.addEventListener('click', () => {
        clicks++;
        if (clicks === 1) {
          timer = setTimeout(() => { clicks = 0; }, 300);
        } else if (clicks === 2) {
          clearTimeout(timer); clicks = 0;
          events.emit('app:launch', item.id);
        }
        // single select visual
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');
      });
      desktopEl.appendChild(el);
    }
  }
  renderIcons();
  events.on('settings:changed', renderIcons);
  // click desktop background clears selection
  desktopEl.addEventListener('click', (e) => {
    if (e.target === desktopEl) {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    }
  });

  // start menu toggle
  function toggleStart() { startMenu.classList.toggle('hidden'); }
  startBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleStart(); });
  // start menu app clicks
  startMenu.querySelectorAll('.start-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const app = btn.dataset.app;
      startMenu.classList.add('hidden');
      events.emit('app:launch', app);
    });
  });
  document.getElementById('shutdown-btn').addEventListener('click', () => {
    startMenu.classList.add('hidden');
    // fake shutdown: clear windows and show message
    events.emit('system:shutdown');
  });
  // close when clicking outside
  document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) startMenu.classList.add('hidden');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') startMenu.classList.add('hidden');
    if (e.key === 'Meta' || e.key === 'OS') { e.preventDefault(); toggleStart(); }
  });

  // clock
  function tick() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  tick(); setInterval(tick, 1000);

  // wallpaper from settings
  function applyWallpaper() {
    const wp = localStorage.getItem('cinmin:wallpaper') || 'default';
    const wall = document.getElementById('wallpaper');
    const map = {
      default: 'radial-gradient(1200px 600px at 70% -10%, #7c6cff33, transparent), linear-gradient(135deg,#0f1221,#1a1f3d 45%, #0b3b3a)',
      blue: 'linear-gradient(135deg,#0b1e3a,#1a5fb4)',
      purple: 'linear-gradient(135deg,#1a0b2e,#7c3aed)',
      midnight: 'linear-gradient(135deg,#0a0a14,#1e293b)',
    };
    wall.style.background = map[wp] || map.default;
  }
  applyWallpaper();
  events.on('settings:changed', applyWallpaper);
}
