// EventBus.js — simple pub/sub so parts of Cinmin can talk without tight coupling
export class EventBus {
  constructor() {
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    for (const cb of this.listeners[event]) {
      try { cb(data); } catch (e) { console.error(`EventBus error in ${event}:`, e); }
    }
  }
}

// single shared instance
export const events = new EventBus();
