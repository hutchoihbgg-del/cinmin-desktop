// AppRegistry.js — single source of truth for Cinmin apps (1.2 builtin + plugin)
// Builtins come from src/apps/builtin/manifest.js (repo is source, bundled at build).
// Plugins register separately; builtin IDs are reserved.

import { BUILTIN_APPS, CINMIN_VERSION } from '../apps/builtin/manifest.js';

export const APPS = { ...BUILTIN_APPS };
export { CINMIN_VERSION };

// lifecycle: apps expose create()/mount()/destroy() optionally; WindowManager owns the window.
export function getApp(id) { return APPS[id] || null; }
export function listApps() { return Object.values(APPS); }
export function getBuiltinApps() { return Object.values(APPS).filter(a => a.source === 'builtin'); }
export function isBuiltin(id) { return !!APPS[id]?.builtin; }

export function registerBuiltinApp(def) {
  if (APPS[def.id]) throw new Error(`App ID already registered: ${def.id}`);
  APPS[def.id] = { ...def, builtin: true, source: 'builtin' };
  return APPS[def.id];
}

// Called by PluginManager for plugin apps — rejects builtin collisions.
export function registerPluginApp(pluginId, appDef) {
  if (APPS[appDef.id]?.builtin) {
    throw new Error(`App ID already reserved by built-in application: ${appDef.id}`);
  }
  APPS[appDef.id] = {
    id: appDef.id, name: appDef.name, title: appDef.name,
    version: '1.0.0', description: `Provided by ${pluginId}.`,
    icon: appDef.icon, category: appDef.category, cat: (appDef.category || 'other').toLowerCase(),
    builtin: false, source: 'plugin', pluginId,
    width: 500, height: 400,
    create: appDef.create,
  };
  return APPS[appDef.id];
}

export function unregisterApp(id) {
  if (APPS[id]?.builtin) throw new Error(`Cannot unregister built-in app: ${id}`);
  delete APPS[id];
}
