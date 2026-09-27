// Terminal.js — fake shell using same fs

import { fs } from '../core/FileSystem.js';

export function createTerminalContent() {
  const wrap = document.createElement('div');
  wrap.className = 'terminal';
  wrap.tabIndex = 0;
  wrap.innerHTML = `
    <div class="term-output"></div>
    <div class="term-input-line">
      <span class="term-prompt">cinmin@desktop:~$</span>
      <input class="term-input" type="text" autocomplete="off" spellcheck="false" />
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
    // relative to cwd
    const base = cwd.endsWith('/') ? cwd.slice(0,-1) : cwd;
    if (arg.startsWith('~/')) return '/Home/' + arg.slice(2);
    return base + '/' + arg;
  }

  const commands = {
    help() {
      print('Available commands:');
      print('  help, clear, ls, cd, pwd, mkdir, touch, cat, echo, whoami, date');
    },
    clear() { output.innerHTML = ''; },
    ls(args) {
      const target = args[0] ? resolvePath(args[0]) : cwd;
      const items = fs.list(target);
      if (!items) { print(`ls: cannot access '${args[0]}': No such file or directory`, 'error'); return; }
      if (items.length === 0) return;
      for (const it of items) print(it.name + (it.type === 'folder' ? '/' : ''));
    },
    pwd() { print(cwd); },
    cd(args) {
      const dest = args[0] ? resolvePath(args[0]) : '/Home';
      const folder = fs._getFolder(dest);
      if (!folder) { print(`cd: ${args[0]}: No such file or directory`, 'error'); return; }
      cwd = dest.replace(/\/+$/,'') || '/Home';
      // normalize to /Home/...
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
    },
    touch(args) {
      if (!args[0]) { print('touch: missing operand','error'); return; }
      const p = resolvePath(args[0]);
      const slash = p.lastIndexOf('/');
      const dir = p.slice(0, slash) || cwd;
      const name = p.slice(slash+1);
      // if exists and is file, do nothing
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
    echo(args) {
      // support echo "hello" > file.txt
      const raw = args.join(' ');
      const redir = raw.match(/^(.*)\s*>\s*(\S+)\s*$/);
      if (redir) {
        const text = redir[1].replace(/^["']|["']$/g, '');
        const dest = resolvePath(redir[2]);
        // if file exists, overwrite; else create
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
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    if (commands[cmd]) {
      try { commands[cmd](args); } catch (e) { print(`error: ${e.message}`, 'error'); }
    } else {
      print(`${cmd}: command not found. Type "help" for list.`, 'error');
    }
    output.scrollTop = output.scrollHeight;
  }

  input.addEventListener('keydown', (e) => {
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

  // focus input when clicking terminal
  wrap.addEventListener('click', () => input.focus());
  setTimeout(() => input.focus(), 100);
  print('Cinmin Terminal — type "help" for commands');
  print('');
  updatePrompt();

  return wrap;
}
