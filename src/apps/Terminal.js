// Terminal.js — fake shell using virtual FS (0.5: rm/cp/mv, ls improvements)

import { fs } from '../core/FileSystem.js';
import { notifier } from '../core/NotificationManager.js';
import { pluginManager } from '../core/PluginManager.js';

export function createTerminalContent() {
  const wrap = document.createElement('div');
  wrap.className = 'terminal';
  wrap.tabIndex = 0;
  wrap.innerHTML = `
    <div class="term-output" role="log" aria-live="polite"></div>
    <div class="term-input-line">
      <span class="term-prompt">cinmin@desktop:~$</span>
      <input class="term-input" type="text" autocomplete="off" spellcheck="false" aria-label="Terminal input" />
    </div>
  `;
  const output = wrap.querySelector('.term-output');
  const input = wrap.querySelector('.term-input');
  const promptEl = wrap.querySelector('.term-prompt');

  let cwd = '/Home';
  const history = [];
  let hIdx = -1;

  function updatePrompt() { promptEl.textContent = `cinmin@desktop:${cwd}$`; }

  function print(text = '', cls = '') {
    const line = document.createElement('div');
    line.className = 'term-line ' + cls;
    line.textContent = text;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }
  function printCmd(cmd) {
    const line = document.createElement('div');
    line.className = 'term-line cmd';
    line.textContent = `${promptEl.textContent} ${cmd}`;
    output.appendChild(line);
  }

  function resolvePath(arg) {
    if (!arg || arg === '.' ) return cwd;
    if (arg === '..') return fs.parentDir(cwd);
    if (arg === '~' || arg === '/Home' || arg === 'Home') return '/Home';
    if (arg.startsWith('/')) return arg;
    const base = cwd.endsWith('/') ? cwd.slice(0,-1) : cwd;
    if (arg.startsWith('~/')) return '/Home/' + arg.slice(2);
    return base + '/' + arg;
  }

  const aliases = { dir: 'ls', cls: 'clear', del: 'rm', copy: 'cp', move: 'mv' };
  const helpDetails = {
    ls: 'ls [-l] [path]\nList files. -l shows type.',
    cd: 'cd <path>\nChange directory.',
    cp: 'cp <source> <destination>\nCopies a file or folder.',
    mv: 'mv <source> <destination>\nMoves/renames.',
    rm: 'rm <path>\nMoves to Trash (use Trash to empty).',
    mkdir: 'mkdir <path>\nCreate folder.',
    touch: 'touch <path>\nCreate empty file.',
    cat: 'cat <file>\nShow file contents.',
    echo: 'echo <text> > <file>\nWrite text to file.',
    clear: 'clear\nClear screen.',
  };
  const commands = {
    help(args) {
      if (args[0]) {
        const lower = args[0].toLowerCase();
        if (helpDetails[lower]) { print(helpDetails[lower]); return; }
        const plugHelp = pluginManager.helpFor(lower);
        if (plugHelp) { print(plugHelp); return; }
      }
      print('Available commands:');
      print('  help, clear, ls [-l], cd, pwd, mkdir, touch, cat, echo, rm, cp, mv, whoami, date');
      print('  Aliases: dir→ls, cls→clear, del→rm, copy→cp, move→mv');
      print('  Plugins: plugin list | plugin install <name> | plugin remove <name>');
      print('  Try: help cp  or  plugin list');
    },
    plugin(args) {
      const sub = (args[0] || 'help').toLowerCase();
      if (sub === 'list') {
        const cat = pluginManager.listCatalog();
        print('Catalog:');
        cat.forEach(p => {
          const inst = pluginManager.isInstalled(p.id) ? ' [installed]' : '';
          print(`  ${p.id} — ${p.description}${inst}`);
        });
        const inst = pluginManager.listInstalled();
        print(inst.length ? `Installed: ${inst.join(', ')}` : 'No plugins installed. Try: plugin install HTMLDEBUG');
        return;
      }
      if (sub === 'install' && args[1]) {
        const id = args[1];
        print(`Installing ${id}...`);
        pluginManager.install(id).then(r => {
          if (!r.ok) print(`plugin: ${r.error}`, 'error');
          else print(`✓ ${id} installed. Try: htmldebug /Home/index.html`, 'success');
        });
        return;
      }
      if ((sub === 'remove' || sub === 'uninstall') && args[1]) {
        pluginManager.remove(args[1]).then(r => {
          if (!r.ok) print(`plugin: ${r.error}`, 'error');
          else print(`Removed ${args[1]}`, 'success');
        });
        return;
      }
      print('Usage: plugin list | plugin install <NAME> | plugin remove <NAME>');
      print('  Available: HTMLDEBUG, COWSAY');
      print('  Example: plugin install HTMLDEBUG');
    },
    clear() { output.innerHTML = ''; },
    ls(args) {
      const long = args.includes('-l') || args.includes('-la');
      const targetArg = args.find(a => !a.startsWith('-'));
      const target = targetArg ? resolvePath(targetArg) : cwd;
      // if target is a file, show file
      const stat = fs.stat(target);
      if (!stat) { print(`ls: cannot access '${targetArg}': No such file or directory`, 'error'); return; }
      if (stat.type === 'file') {
        if (long) print(`-  ${stat.name}  ${stat.size} chars`);
        else print(stat.name);
        return;
      }
      const items = fs.list(target);
      if (!items) { print(`ls: cannot access '${targetArg}'`, 'error'); return; }
      if (items.length === 0) return;
      for (const it of items) {
        if (long) print(`${it.type === 'folder' ? 'd' : '-'}  ${it.name}${it.type === 'folder' ? '/' : ''}`);
        else print(it.name + (it.type === 'folder' ? '/' : ''));
      }
    },
    pwd() { print(cwd); },
    cd(args) {
      const dest = args[0] ? resolvePath(args[0]) : '/Home';
      const folder = fs._getFolder(dest);
      if (!folder) { print(`cd: ${args[0]}: No such file or directory`, 'error'); return; }
      cwd = dest.replace(/\/+$/,'') || '/Home';
      if (!cwd.startsWith('/Home')) cwd = '/Home' + (cwd.startsWith('/') ? cwd : '/' + cwd);
      updatePrompt();
    },
    mkdir(args) {
      if (!args[0]) { print('mkdir: missing operand','error'); return; }
      const p = resolvePath(args[0]);
      const slash = p.lastIndexOf('/');
      const dir = p.slice(0, slash) || cwd;
      const name = p.slice(slash+1);
      const r = fs.createFolder(dir, name);
      if (!r.ok) print(`mkdir: ${r.error}`, 'error');
      else notifier.success(`${name} created`, 'Terminal');
    },
    touch(args) {
      if (!args[0]) { print('touch: missing operand','error'); return; }
      const p = resolvePath(args[0]);
      const slash = p.lastIndexOf('/');
      const dir = p.slice(0, slash) || cwd;
      const name = p.slice(slash+1);
      if (fs.exists(p)) return;
      const r = fs.createFile(dir, name, '');
      if (!r.ok) print(`touch: ${r.error}`, 'error');
    },
    cat(args) {
      if (!args[0]) { print('cat: missing operand','error'); return; }
      const p = resolvePath(args[0]);
      const r = fs.readFile(p);
      if (!r.ok) print(`cat: ${r.error}`, 'error'); else print(r.content);
    },
    rm(args) {
      if (!args[0]) { print('rm: missing operand','error'); return; }
      const p = resolvePath(args[0]);
      const r = fs.delete(p);
      if (!r.ok) print(`rm: ${r.error}`, 'error');
      else print(`removed '${args[0]}'`);
    },
    cp(args) {
      if (!args[0] || !args[1]) { print('cp: missing operand — cp <src> <dest>','error'); return; }
      const src = resolvePath(args[0]);
      const dest = resolvePath(args[1]);
      // dest can be folder or full path
      const destStat = fs.stat(dest);
      const destFolder = destStat && destStat.type === 'folder' ? dest : fs.parentDir(dest);
      // use FS clipboard logic
      const cpRes = fs.copy(src);
      if (!cpRes.ok) { print(`cp: ${cpRes.error}`, 'error'); return; }
      const pasteRes = fs.paste(destFolder);
      if (!pasteRes.ok) { print(`cp: ${pasteRes.error}`, 'error'); fs.clipboard=null; return; }
      // if dest was a file path with different name, rename pasted
      if (destStat && destStat.type !== 'folder') {
        // not needed for now
      } else if (!destStat && dest.includes('/')) {
        // if user gave explicit filename, try rename
        const wanted = dest.split('/').pop();
        if (wanted && wanted !== pasteRes.name) {
          const folder = fs._getFolder(destFolder);
          const pasted = folder.children[pasteRes.name];
          if (pasted) { delete folder.children[pasteRes.name]; pasted.name = wanted; folder.children[wanted]=pasted; fs._save(); }
        }
      }
      print(`copied '${args[0]}' → '${args[1]}'`);
    },
    mv(args) {
      if (!args[0] || !args[1]) { print('mv: missing operand — mv <src> <dest>','error'); return; }
      const src = resolvePath(args[0]);
      const dest = resolvePath(args[1]);
      const destStat = fs.stat(dest);
      // if dest is existing folder, move into it
      if (destStat && destStat.type === 'folder') {
        const cutRes = fs.cut(src);
        if (!cutRes.ok) { print(`mv: ${cutRes.error}`, 'error'); return; }
        const pasteRes = fs.paste(dest);
        if (!pasteRes.ok) { print(`mv: ${pasteRes.error}`, 'error'); return; }
        print(`moved '${args[0]}' → '${args[1]}'`);
        return;
      }
      // otherwise treat as rename within same folder or move+rename
      const slash = dest.lastIndexOf('/');
      const destDir = dest.slice(0, slash) || cwd;
      const newName = dest.slice(slash+1);
      const r = fs.rename(src, newName);
      if (!r.ok) {
        // fallback: cut/paste to different folder
        const cutRes = fs.cut(src);
        if (!cutRes.ok) { print(`mv: ${cutRes.error}`, 'error'); return; }
        const pasteRes = fs.paste(destDir);
        if (!pasteRes.ok) print(`mv: ${pasteRes.error}`, 'error'); else print(`moved '${args[0]}' → '${args[1]}'`);
        return;
      }
      // if rename succeeded but dest was in different folder, we need to handle move
      // For now, if src parent != destDir, do extra move check (simplified)
      print(`renamed '${args[0]}' → '${newName}'`);
    },
    echo(args) {
      const raw = args.join(' ');
      const redir = raw.match(/^(.*)\s*>\s*(\S+)\s*$/);
      if (redir) {
        const text = redir[1].replace(/^["']|["']$/g, '');
        const dest = resolvePath(redir[2]);
        if (fs.exists(dest)) {
          const wr = fs.writeFile(dest, text);
          if (!wr.ok) print(`echo: ${wr.error}`, 'error');
        } else {
          const slash = dest.lastIndexOf('/');
          const dir = dest.slice(0, slash) || cwd;
          const name = dest.slice(slash+1);
          const cr = fs.createFile(dir, name, text);
          if (!cr.ok) print(`echo: ${cr.error}`, 'error');
        }
        return;
      }
      print(raw.replace(/^["']|["']$/g, ''));
    },
    whoami() { print('cinmin'); },
    date() { print(new Date().toString()); },
  };

  function run(cmdStr) {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;
    history.push(trimmed); hIdx = history.length;
    printCmd(trimmed);
    const parts = trimmed.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
    const clean = parts.map(p => p.replace(/^"|"$/g, ''));
    let cmd = clean[0].toLowerCase();
    if (aliases[cmd]) cmd = aliases[cmd];
    const args = clean.slice(1);
    // try plugin commands first
    if (pluginManager.tryRun(cmd, args, print)) {
      output.scrollTop = output.scrollHeight;
      return;
    }
    if (commands[cmd]) {
      try { commands[cmd](args); } catch (e) { print(`error: ${e.message}`, 'error'); notifier.error(e.message, 'Terminal'); }
    } else {
      print(`${cmd}: command not found. Type "help" for list.`, 'error');
    }
    output.scrollTop = output.scrollHeight;
  }

  // Tab autocomplete for FS paths
  function autocomplete(partial) {
    const slash = partial.lastIndexOf('/');
    const dir = slash >= 0 ? resolvePath(partial.slice(0, slash) || cwd) : cwd;
    const prefix = slash >= 0 ? partial.slice(slash+1) : partial;
    const items = fs.list(dir);
    if (!items) return null;
    const match = items.find(i => i.name.startsWith(prefix));
    return match ? (slash >= 0 ? partial.slice(0, slash+1) + match.name : match.name) : null;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const val = input.value;
      const last = val.split(' ').pop();
      const comp = autocomplete(last);
      if (comp) {
        const parts = val.split(' ');
        parts[parts.length-1] = comp;
        input.value = parts.join(' ');
      }
      return;
    }
    if (e.key === 'c' && e.ctrlKey) { e.preventDefault(); input.value=''; print('^C', 'error'); return; }
    if (e.key === 'Enter') {
      const val = input.value;
      input.value = '';
      run(val);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      hIdx = Math.max(0, hIdx - 1);
      input.value = history[hIdx] || '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (hIdx >= history.length -1) { hIdx = history.length; input.value=''; return; }
      hIdx++;
      input.value = history[hIdx] || '';
    } else if (e.key.toLowerCase() === 'l' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault(); output.innerHTML='';
    }
  });

  wrap.addEventListener('click', () => input.focus());
  setTimeout(() => input.focus(), 100);
  print('Cinmin Terminal — type "help" for commands');
  print('');
  updatePrompt();

  return wrap;
}
