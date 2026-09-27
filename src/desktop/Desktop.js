// Desktop.js — renders wallpaper, icons (draggable + persisted), clock, start menu

import { events } from '../core/EventBus.js';
import { fs } from '../core/FileSystem.js';

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

  // --- icon positions (persisted) ---
  function loadPositions() {
    try { return JSON.parse(localStorage.getItem('cinmin:iconPos') || '{}'); } catch { return {}; }
  }
  function savePositions(pos) {
    localStorage.setItem('cinmin:iconPos', JSON.stringify(pos));
  }
  let iconPos = loadPositions();

  // render icons
  function renderIcons() {
    const show = localStorage.getItem('cinmin:showIcons');
    if (show === 'false') { desktopEl.innerHTML = ''; return; }
    desktopEl.innerHTML = '';
    // ensure desktop is positioned relative for absolute children
    desktopEl.style.position = 'absolute';

    ICONS.forEach((item, idx) => {
      const el = document.createElement('button');
      el.className = 'desktop-icon';
      el.dataset.app = item.id;
      el.innerHTML = `<span class="d-icon">${item.icon}</span><span class="d-label">${item.label}</span>`;
      // position
      const defaultX = 16;
      const defaultY = 24 + idx * 88;
      const pos = iconPos[item.id] || { x: defaultX, y: defaultY };
      el.style.position = 'absolute';
      el.style.left = pos.x + 'px';
      el.style.top = pos.y + 'px';

      // click handling: single selects, double opens
      let clicks = 0, timer = null;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        clicks++;
        if (clicks === 1) {
          timer = setTimeout(() => { clicks = 0; }, 300);
        } else if (clicks === 2) {
          clearTimeout(timer); clicks = 0;
          events.emit('app:launch', item.id);
          // track recent
          trackRecent(item.id);
        }
        document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
        el.classList.add('selected');
      });

      // draggable icons
      let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = false;
      el.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        dragging = true;
        moved = false;
        sx = e.clientX; sy = e.clientY;
        ox = parseInt(el.style.left, 10); oy = parseInt(el.style.top, 10);
        el.style.zIndex = 10;
        e.preventDefault();
      });
      const onMove = (e) => {
        if (!dragging) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
        let nx = ox + dx;
        let ny = oy + dy;
        // clamp inside desktop (leave taskbar gap)
        const maxX = desktopEl.clientWidth - el.offsetWidth - 8;
        const maxY = desktopEl.clientHeight - el.offsetHeight - 8;
        nx = Math.max(0, Math.min(nx, maxX));
        ny = Math.max(0, Math.min(ny, maxY));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
      };
      const onUp = () => {
        if (dragging) {
          dragging = false;
          el.style.zIndex = '';
          if (moved) {
            iconPos[item.id] = { x: parseInt(el.style.left, 10), y: parseInt(el.style.top, 10) };
            savePositions(iconPos);
          }
        }
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      desktopEl.appendChild(el);
    });
  }
  renderIcons();
  events.on('settings:changed', () => {
    iconPos = loadPositions(); // in case showIcons toggled
    renderIcons();
  });

  // click desktop background clears selection and closes menus
  desktopEl.addEventListener('click', (e) => {
    if (e.target === desktopEl) {
      document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
    }
  });

  // --- desktop right-click context menu (Priority 2) ---
  desktopEl.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showDesktopMenu(e.clientX, e.clientY);
  });

  function showDesktopMenu(x, y) {
    closeCtxMenus();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.innerHTML = `
      <button data-action="refresh">↻ Refresh</button>
      <button data-action="newFolder">📁 Create Folder</button>
      <button data-action="newFile">📄 Create Text File</button>
      <div class="ctx-sep"></div>
      <button data-action="personalize">🎨 Personalize</button>
    `;
    document.body.appendChild(menu);
    clampMenu(menu);
    menu.querySelector('[data-action="refresh"]').addEventListener('click', () => { renderIcons(); menu.remove(); });
    menu.querySelector('[data-action="newFolder"]').addEventListener('click', () => {
      const name = prompt('Folder name:', 'New Folder');
      if (name) {
        const r = fs.createFolder('/Home', name);
        if (!r.ok) alert(r.error);
      }
      menu.remove();
    });
    menu.querySelector('[data-action="newFile"]').addEventListener('click', () => {
      const name = prompt('File name:', 'newfile.txt');
      if (name) {
        const r = fs.createFile('/Home', name, '');
        if (!r.ok) alert(r.error);
      }
      menu.remove();
    });
    menu.querySelector('[data-action="personalize"]').addEventListener('click', () => {
      events.emit('app:launch', 'settings');
      menu.remove();
    });
    setTimeout(() => {
      const handler = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('click', handler); document.removeEventListener('contextmenu', handler2); } };
      const handler2 = () => { menu.remove(); document.removeEventListener('click', handler); document.removeEventListener('contextmenu', handler2); };
      document.addEventListener('click', handler);
      document.addEventListener('contextmenu', handler2);
    }, 0);
  }

  function clampMenu(menu) {
    const r = menu.getBoundingClientRect();
    if (r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 8) + 'px';
    if (r.bottom > window.innerHeight - 48) menu.style.top = (window.innerHeight - 48 - r.height - 8) + 'px';
  }
  function closeCtxMenus() {
    document.querySelectorAll('.ctx-menu').forEach(el => el.remove());
  }

  // --- start menu toggle + Priority 5 extras ---
  const searchInput = document.getElementById('start-search');
  const startAppsEl = document.getElementById('start-apps');
  const recentWrap = document.getElementById('start-recent');
  const recentList = document.getElementById('start-recent-list');
  const noResults = document.getElementById('start-no-results');
  const powerBtn = document.getElementById('power-btn');
  const powerMenu = document.getElementById('power-menu');

  function toggleStart() {
    const willOpen = startMenu.classList.contains('hidden');
    startMenu.classList.toggle('hidden');
    if (willOpen) {
      renderRecent();
      if (searchInput) { searchInput.value = ''; filterApps(''); }
      setTimeout(() => searchInput?.focus(), 50);
      powerMenu?.classList.add('hidden');
    }
  }
  startBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleStart(); });

  // search
  function filterApps(q) {
    const query = q.toLowerCase().trim();
    let visible = 0;
    startAppsEl.querySelectorAll('.start-item').forEach(btn => {
      const text = btn.textContent.toLowerCase();
      const show = !query || text.includes(query);
      btn.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    if (noResults) noResults.classList.toggle('hidden', visible !== 0 || query === '');
    if (recentWrap) recentWrap.style.display = query ? 'none' : '';
  }
  searchInput?.addEventListener('input', () => filterApps(searchInput.value));
  searchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const first = [...startAppsEl.querySelectorAll('.start-item')].find(b => b.style.display !== 'none');
      if (first) { startMenu.classList.add('hidden'); events.emit('app:launch', first.dataset.app); }
    }
  });

  // recent
  function renderRecent() {
    if (!recentWrap || !recentList) return;
    let ids = [];
    try { ids = JSON.parse(localStorage.getItem('cinmin:recent') || '[]'); } catch {}
    if (!ids.length) { recentWrap.classList.add('hidden'); return; }
    const labelMap = { explorer: '📁 File Explorer', terminal: '💻 Terminal', notepad: '📝 Notepad', htmlviewer: '🌐 Browser', settings: '⚙ Settings' };
    recentList.innerHTML = '';
    ids.forEach(id => {
      const btn = document.createElement('button');
      btn.className = 'start-item recent-item';
      btn.dataset.app = id;
      btn.textContent = labelMap[id] || id;
      // prepend icon? already in label
      btn.innerHTML = `<span>${(labelMap[id]||'').split(' ')[0]}</span> ${labelMap[id]?.split(' ').slice(1).join(' ') || id}`;
      btn.addEventListener('click', () => { startMenu.classList.add('hidden'); events.emit('app:launch', id); });
      recentList.appendChild(btn);
    });
    recentWrap.classList.remove('hidden');
  }

  // power menu
  powerBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    powerMenu.classList.toggle('hidden');
  });
  powerMenu?.querySelectorAll('[data-power]').forEach(btn => {
    btn.addEventListener('click', () => {
      startMenu.classList.add('hidden');
      powerMenu.classList.add('hidden');
      events.emit('system:shutdown');
    });
  });

  // shutdown handled in initStartMenuExtras
  document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn && !e.target.closest('#start-btn')) {
      startMenu.classList.add('hidden');
      powerMenu?.classList.add('hidden');
    }
    // also close power menu if clicking outside it
    if (powerMenu && !powerMenu.contains(e.target) && e.target !== powerBtn) {
      powerMenu.classList.add('hidden');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { startMenu.classList.add('hidden'); powerMenu?.classList.add('hidden'); closeCtxMenus(); }
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

  // track recent for Start Menu
  function trackRecent(appId) {
    try {
      const raw = JSON.parse(localStorage.getItem('cinmin:recent') || '[]');
      const next = [appId, ...raw.filter(id => id !== appId)].slice(0, 5);
      localStorage.setItem('cinmin:recent', JSON.stringify(next));
    } catch {}
  }
  // expose for WindowManager to also track when windows open via taskbar etc.
  events.on('window:created', ({ title }) => {
    // map title to app id loosely
    const map = { 'File Explorer': 'explorer', 'Terminal': 'terminal', 'Notepad': 'notepad', 'Browser': 'htmlviewer', 'Settings': 'settings' };
    if (map[title]) trackRecent(map[title]);
  });
}
