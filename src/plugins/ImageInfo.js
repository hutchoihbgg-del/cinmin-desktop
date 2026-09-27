// ImageInfo.js — imageinfo <path>

import { fs } from '../core/FileSystem.js';

export function activate(ctx) {
  const fn = (args, print) => {
    const p = args[0];
    if (!p) { print('Usage: imageinfo <path>'); return; }
    let full = p; if (!full.startsWith('/')) full='/Home/'+full;
    const stat = fs.stat(full);
    if (!stat) { print(`imageinfo: not found: ${p}`, 'error'); return; }
    print(`${stat.name} — ${stat.type} — ${stat.size} chars — ${stat.location}`);
  };
  ctx.commands.register({ name: 'imageinfo', description: 'imageinfo <path>\nShow file info.', execute: (args, c)=> fn(args, c.print||c) });
  ctx.registerCommand('imageinfo', fn, 'imageinfo <path>\nShow file info.');
}
export function deactivate(ctx){ ctx.commands.unregister('imageinfo'); ctx.unregisterCommand('imageinfo'); }
export async function install(c){ return activate(c); }
export async function uninstall(c){ return deactivate(c); }
