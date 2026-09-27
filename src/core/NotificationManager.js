// NotificationManager.js — simple toast + center, persisted to localStorage

import { events } from './EventBus.js';

const STORE_KEY = 'cinmin:notifications';

export class NotificationManager {
  constructor() {
    this.items = this._load();
    this.nextId = (this.items.reduce((m, n) => Math.max(m, n.id), 0) + 1) || 1;
    // create containers lazily
    this.toastEl = null;
    this.centerEl = null;
    this._ensureDOM();
  }

  _load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
  }
  _save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(this.items.slice(0, 50)));
  }

  _ensureDOM() {
    if (!document.getElementById('toast-container')) {
      const t = document.createElement('div');
      t.id = 'toast-container';
      document.body.appendChild(t);
      this.toastEl = t;
    } else this.toastEl = document.getElementById('toast-container');

    if (!document.getElementById('notif-center')) {
      const c = document.createElement('div');
      c.id = 'notif-center';
      c.className = 'notif-center hidden';
      c.innerHTML = `
        <div class="notif-header">
          <span>Notifications</span>
          <button id="notif-clear">Clear</button>
          <button id="notif-close">×</button>
        </div>
        <div id="notif-list"></div>
      `;
      document.body.appendChild(c);
      this.centerEl = c;
      c.querySelector('#notif-close').addEventListener('click', () => this.toggle(false));
      c.querySelector('#notif-clear').addEventListener('click', () => this.clear());
    } else this.centerEl = document.getElementById('notif-center');

    // bell button in taskbar (injected if not present)
    if (!document.getElementById('notif-bell')) {
      const bell = document.createElement('button');
      bell.id = 'notif-bell';
      bell.className = 'tray-bell';
      bell.innerHTML = '🔔<span id="notif-badge" class="hidden">0</span>';
      bell.title = 'Notifications';
      bell.addEventListener('click', () => this.toggle());
      const right = document.getElementById('taskbar-right');
      if (right) right.prepend(bell);
    }
    this._renderCenter();
    this._updateBadge();
  }

  notify({ title, body, type = 'info' }) {
    const item = {
      id: this.nextId++,
      title, body, type,
      time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      ts: Date.now(),
    };
    this.items.unshift(item);
    this._save();
    this._showToast(item);
    this._renderCenter();
    this._updateBadge();
    events.emit('notification:new', item);
  }

  error(body, title = 'Error') { this.notify({ title, body, type: 'error' }); }
  success(body, title = 'Done') { this.notify({ title, body, type: 'success' }); }

  _showToast(item) {
    const el = document.createElement('div');
    el.className = `toast toast-${item.type}`;
    el.innerHTML = `<b>${item.title}</b><span>${item.body}</span><small>${item.time}</small>`;
    this.toastEl.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 3200);
  }

  _renderCenter() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.innerHTML = '';
    if (this.items.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications</div>';
      return;
    }
    for (const n of this.items) {
      const row = document.createElement('div');
      row.className = `notif-row notif-${n.type}`;
      row.innerHTML = `<div class="notif-title">${n.title} <span class="notif-time">${n.time}</span></div><div class="notif-body">${n.body}</div>`;
      list.appendChild(row);
    }
  }

  _updateBadge() {
    const b = document.getElementById('notif-badge');
    if (!b) return;
    const unread = this.items.length;
    if (unread === 0) b.classList.add('hidden');
    else { b.textContent = unread > 9 ? '9+' : String(unread); b.classList.remove('hidden'); }
  }

  toggle(force) {
    const show = typeof force === 'boolean' ? force : this.centerEl.classList.contains('hidden');
    this.centerEl.classList.toggle('hidden', !show);
  }

  clear() {
    this.items = [];
    this._save();
    this._renderCenter();
    this._updateBadge();
  }
}

export const notifier = new NotificationManager();
