// Storage.js — safe localStorage wrapper (0.6 persistence safety)
// Handles malformed JSON, quota errors, missing localStorage (private mode)

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      try { return JSON.parse(raw); } catch { return raw; }
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      const toStore = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, toStore);
      return true;
    } catch (e) {
      console.warn(`Storage set failed for ${key}:`, e);
      return false;
    }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch {}
  },
  getRaw(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setRaw(key, str) {
    try { localStorage.setItem(key, str); return true; } catch { return false; }
  }
};
