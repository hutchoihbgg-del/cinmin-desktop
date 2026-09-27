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
    win.className = 'window';
    win.dataset.id = id;
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
    // focus on click
    win.addEventListener('mousedown', () => this.focus(entry.id));

    // buttons
    win.querySelector('.minimize').addEventListener('click', (e) => { e.stopPropagation(); this.minimize(entry.id); });
    win.querySelector('.maximize').addEventListener('click', (e) => { e.stopPropagation(); this.toggleMaximize(entry.id); });
    win.querySelector('.close').addEventListener('click', (e) => { e.stopPropagation(); this.close(entry.id); });

    // dragging
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    titlebar.addEventListener('mousedown', (e) => {
      if (e.target.closest('.win-btn')) return;
      if (entry.maximized) return; // can't drag maximized
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      ox = parseInt(win.style.left, 10); oy = parseInt(win.style.top, 10);
      titlebar.style.cursor = 'grabbing';
      win.classList.add('dragging');
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      let nx = ox + (e.clientX - sx);
      let ny = oy + (e.clientY - sy);
      // keep inside viewport with taskbar (48px)
      nx = Math.max(-widthClamp(win), Math.min(nx, window.innerWidth - 80));
      ny = Math.max(0, Math.min(ny, window.innerHeight - 48 - 40));
      win.style.left = nx + 'px';
      win.style.top = ny + 'px';
    });
    window.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        titlebar.style.cursor = '';
        win.classList.remove('dragging');
      }
    });
    // double click titlebar to maximize
    titlebar.addEventListener('dblclick', () => this.toggleMaximize(entry.id));

    function widthClamp(el) {
      const w = parseInt(el.style.width,10);
      return w - 120;
    }
  }

  focus(id) {
    const entry = this.windows.get(id);
    if (!entry) return;
    if (entry.minimized) entry.minimized = false;
    entry.el.classList.remove('minimized');
    entry.el.style.zIndex = ++this.zCounter;
    this.activeId = id;
    for (const [wid, e] of this.windows) {
      e.el.classList.toggle('focused', wid === id);
    }
    this._updateTaskbar();
    events.emit('window:focused', { id });
  }

  minimize(id) {
    const e = this.windows.get(id);
    if (!e) return;
    e.minimized = true;
    e.el.classList.add('minimized');
    // pick next focus
    const visible = [...this.windows.values()].filter(x => !x.minimized);
    if (visible.length) this.focus(visible[visible.length-1].id);
    else { this.activeId = null; this._updateTaskbar(); }
    events.emit('window:minimized', { id });
  }

  restore(id) {
    const e = this.windows.get(id);
    if (!e) return;
    e.minimized = false;
    e.el.classList.remove('minimized');
    this.focus(id);
  }

  toggleMaximize(id) {
    const e = this.windows.get(id);
    if (!e) return;
    const win = e.el;
    if (!e.maximized) {
      this._prevBounds.set(id, { left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height });
      win.style.left = '0px';
      win.style.top = '0px';
      win.style.width = '100%';
      win.style.height = 'calc(100% - 48px)';
      win.classList.add('maximized');
      e.maximized = true;
    } else {
      const b = this._prevBounds.get(id);
      if (b) { win.style.left = b.left; win.style.top = b.top; win.style.width = b.width; win.style.height = b.height; }
      win.classList.remove('maximized');
      e.maximized = false;
    }
    this.focus(id);
  }

  close(id) {
    const e = this.windows.get(id);
    if (!e) return;
    e.el.remove();
    e.taskBtn?.remove();
    this.windows.delete(id);
    this._prevBounds.delete(id);
    if (this.activeId === id) {
      const remaining = [...this.windows.values()].filter(x => !x.minimized);
      if (remaining.length) this.focus(remaining[remaining.length-1].id);
      else { this.activeId = null; this._updateTaskbar(); }
    } else this._updateTaskbar();
    events.emit('window:closed', { id });
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
