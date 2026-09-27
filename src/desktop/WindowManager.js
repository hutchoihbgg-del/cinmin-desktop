// WindowManager.js — creates, drags, focuses, minimizes/maximizes/closes windows

import { events } from '../core/EventBus.js';

export class WindowManager {
  constructor(container, taskbarAppsEl) {
    this.container = container; // #windows
    this.taskbarAppsEl = taskbarAppsEl;
    this.windows = new Map(); // id -> {el, title, minimized, maximized, ...}
    this.zCounter = 10;
    this.idCounter = 0;
    this.activeId = null;
    this._prevBounds = new Map(); // for restore after maximize
  }

  create({ title, icon, contentEl, width = 640, height = 420, x = 80, y = 60 }) {
    const id = `win-${++this.idCounter}`;
    const win = document.createElement('div');
    win.className = 'window opening';
    win.dataset.id = id;
    // clamp initial position so it never spawns off-screen (responsive)
    const maxX = Math.max(0, window.innerWidth - width - 16);
    const maxY = Math.max(0, window.innerHeight - 48 - height - 16);
    x = Math.max(8, Math.min(x, maxX));
    y = Math.max(8, Math.min(y, maxY));
    win.style.width = width + 'px';
    win.style.height = height + 'px';
    win.style.left = x + 'px';
    win.style.top = y + 'px';
    win.style.zIndex = ++this.zCounter;

    win.innerHTML = `
      <div class="titlebar">
        <div class="titlebar-left"><span class="win-icon">${icon || '◈'}</span><span class="win-title">${title}</span></div>
        <div class="titlebar-controls">
          <button class="win-btn minimize" title="Minimize">−</button>
          <button class="win-btn maximize" title="Maximize">□</button>
          <button class="win-btn close" title="Close">×</button>
        </div>
      </div>
      <div class="window-content"></div>
    `;
    const contentWrap = win.querySelector('.window-content');
    contentWrap.appendChild(contentEl);

    this.container.appendChild(win);
    // remove opening class after animation
    requestAnimationFrame(() => {
      setTimeout(() => win.classList.remove('opening'), 200);
    });

    const entry = { id, el: win, title, icon, minimized: false, maximized: false };
    this.windows.set(id, entry);
    this._makeTaskbarButton(entry);
    this.focus(id);
    this._attachEvents(entry);
    events.emit('window:created', { id, title });
    return id;
  }

  _makeTaskbarButton(entry) {
    const btn = document.createElement('button');
    btn.className = 'taskbar-app';
    btn.dataset.winId = entry.id;
    btn.innerHTML = `<span>${entry.icon}</span> ${entry.title}`;
    btn.addEventListener('click', () => {
      if (entry.minimized) this.restore(entry.id);
      else if (this.activeId === entry.id) this.minimize(entry.id);
      else this.focus(entry.id);
    });
    // right-click taskbar app to close (Priority 4)
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showTaskbarMenu(e.clientX, e.clientY, entry, this);
    });
    this.taskbarAppsEl.appendChild(btn);
    entry.taskBtn = btn;
    this._updateTaskbar();
  }

  _updateTaskbar() {
    for (const e of this.windows.values()) {
      if (!e.taskBtn) continue;
      e.taskBtn.classList.toggle('active', e.id === this.activeId && !e.minimized);
      e.taskBtn.classList.toggle('minimized', e.minimized);
    }
  }

  _attachEvents(entry) {
    const win = entry.el;
    const titlebar = win.querySelector('.titlebar');
    // focus on click anywhere on window
    win.addEventListener('mousedown', () => this.focus(entry.id));

    // buttons
    win.querySelector('.minimize').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(entry.id); });
    win.querySelector('.maximize').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(entry.id); });
    win.querySelector('.close').addEventListener('click', (e) => { e.stopPropagation(); this.close(entry.id); });

    // dragging — clamped so window can't be dragged completely off-screen
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win-btn')) return;
      if (entry.maximized) return; // can't drag maximized
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = parseInt(win.style.left, 10); oy = parseInt(win.style.top, 10);
      titlebar.style.cursor = 'grabbing';
      win.classList.add('dragging');
      this.focus(entry.id);
      e.preventDefault();
    });
    const onMove = (e) => {
      if (!dragging) return;
      let nx = ox + (e.clientX - sx);
      let ny = oy + (e.clientY - sy);
      // keep at least 60px visible horizontally and titlebar visible vertically
      const w = win.offsetWidth;
      const h = win.offsetHeight;
      const minX = -w + 60;
      const maxX = window.innerWidth - 60;
      const minY = 0;
      const maxY = window.innerHeight - 48 - 28; // leave titlebar visible above taskbar
      nx = Math.max(minX, Math.min(nx, maxX));
      ny = Math.max(minY, Math.min(ny, maxY));
      win.style.left = nx + 'px';
      win.style.top = ny + 'px';
    };
    const onUp = () => {
      if (dragging) {
        dragging = false;
        titlebar.style.cursor = '';
        win.classList.remove('dragging');
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    // double click title bar to maximize (also single dblclick on titlebar itself)
    titlebar.addEventListener('dblclick', (e) => {
      if (e.target.closest('.win-btn')) return;
      this.toggleMaximize(entry.id);
    });
  }

  focus(id) {
    const entry = this.windows.get(id);
    if (!entry) return;
    if (entry.minimized) {
      entry.minimized = false;
      entry.el.classList.remove('minimized');
      entry.el.classList.add('restoring');
      setTimeout(() => entry.el.classList.remove('restoring'), 200);
    }
    entry.el.style.zIndex = ++this.zCounter;
    this.activeId = id;
    for (const [wid, e] of this.windows) {
      const isActive = wid === id;
      e.el.classList.toggle('focused', isActive);
      // dim unfocused windows slightly via css
      e.el.style.opacity = isActive || e.minimized ? '' : '0.96';
    }
    this._updateTaskbar();
    events.emit('window:focused', { id });
  }

  minimize(id) {
    const e = this.windows.get(id);
    if (!e) return;
    e.minimized = true;
    e.el.classList.add('minimizing');
    // animate then hide
    setTimeout(() => {
      e.el.classList.remove('minimizing');
      e.el.classList.add('minimized');
    }, 150);
    // pick next focus
    const visible = [...this.windows.values()].filter(x => !x.minimized && x.id !== id);
    if (visible.length) this.focus(visible[visible.length-1].id);
    else { this.activeId = null; for (const entry of this.windows.values()) entry.el.classList.remove('focused'); this._updateTaskbar(); }
    events.emit('window:minimized', { id });
  }

  restore(id) {
    const e = this.windows.get(id);
    if (!e) return;
    e.minimized = false;
    e.el.classList.remove('minimized');
    e.el.classList.add('restoring');
    setTimeout(() => e.el.classList.remove('restoring'), 200);
    this.focus(id);
  }

  toggleMaximize(id) {
    const e = this.windows.get(id);
    if (!e) return;
    const win = e.el;
    const btn = win.querySelector('.maximize');
    if (!e.maximized) {
      this._prevBounds.set(id, { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height });
      win.style.left = '0px';
      win.style.top = '0px';
      win.style.width = '100%';
      win.style.height = 'calc(100% - 48px)';
      win.classList.add('maximized');
      e.maximized = true;
      if (btn) btn.textContent = '❐';
      if (btn) btn.title = 'Restore';
    } else {
      const b = this._prevBounds.get(id);
      if (b) { win.style.left = b.left; win.style.top = b.top; win.style.width = b.width; win.style.height = b.height; }
      win.classList.remove('maximized');
      e.maximized = false;
      if (btn) btn.textContent = '□';
      if (btn) btn.title = 'Maximize';
    }
    this.focus(id);
  }

  close(id) {
    const e = this.windows.get(id);
    if (!e) return;
    // 0.5: check unsaved indicator (Notepad)
    const content = e.el.querySelector('.window-content > *');
    if (content && content._isDirty && content._isDirty()) {
      if (!confirm('Unsaved changes — close anyway?')) return;
    }
    e.el.classList.add('closing');
    e.taskBtn?.classList.add('closing');
    setTimeout(() => {
      e.el.remove();
      e.taskBtn?.remove();
      this.windows.delete(id);
      this._prevBounds.delete(id);
      if (this.activeId === id) {
        const remaining = [...this.windows.values()].filter(x => !x.minimized);
        if (remaining.length) this.focus(remaining[remaining.length-1].id);
        else { this.activeId = null; for (const entry of this.windows.values()) entry.el.classList.remove('focused'); this._updateTaskbar(); }
      } else this._updateTaskbar();
      events.emit('window:closed', { id });
    }, 150);
  }

  // keyboard helper: cycle focus Alt+Tab
  focusNext() {
    const ids = [...this.windows.keys()].filter(id => !this.windows.get(id).minimized);
    if (ids.length < 2) return;
    const idx = ids.indexOf(this.activeId);
    const next = ids[(idx + 1) % ids.length];
    this.focus(next);
  }
}

// small taskbar right-click menu helper (kept here for simplicity)
function showTaskbarMenu(x, y, entry, wm) {
  // remove existing
  document.querySelectorAll('.ctx-menu').forEach(el => el.remove());
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.left = x + 'px';
  menu.style.top = (y - 60) + 'px';
  menu.innerHTML = `
    <button data-action="focus">Focus</button>
    <button data-action="minimize">Minimize</button>
    <button data-action="close">Close Window</button>
  `;
  document.body.appendChild(menu);
  // clamp inside viewport
  const rect = menu.getBoundingClientRect();
  if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 8) + 'px';
  if (rect.top < 0) menu.style.top = '8px';
  menu.querySelector('[data-action="focus"]').addEventListener('click', () => { wm.focus(entry.id); menu.remove(); });
  menu.querySelector('[data-action="minimize"]').addEventListener('click', () => { wm.minimize(entry.id); menu.remove(); });
  menu.querySelector('[data-action="close"]').addEventListener('click', () => { wm.close(entry.id); menu.remove(); });
  setTimeout(() => {
    const handler = (e) => { if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener('click', handler); } };
    document.addEventListener('click', handler);
  }, 0);
}
