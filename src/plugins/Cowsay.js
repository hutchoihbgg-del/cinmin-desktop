// Cowsay.js — 1.0.0 — improved for 0.8 with flags

export function activate(ctx) {
  const fn = (args, print) => {
    let mode = 'default';
    let textParts = [...args];
    if (textParts[0] === '-b') { mode = 'borg'; textParts.shift(); }
    else if (textParts[0] === '-d') { mode = 'dead'; textParts.shift(); }
    else if (textParts[0] === '-g') { mode = 'greedy'; textParts.shift(); }
    let text = textParts.join(' ').replace(/^["']|["']$/g, '') || 'moo';
    const line = '-'.repeat(text.length + 2);
    const eyes = mode === 'dead' ? 'xx' : mode === 'borg' ? '##' : mode === 'greedy' ? '$$' : 'oo';
    const tongue = mode === 'dead' ? 'U' : ' ';
    print(` ${line}`);
    print(`< ${text} >`);
    print(` ${line}`);
    print(`        \\   ^__^`);
    print(`         \\  (${eyes})\\_______`);
    print(`            (__)\\       )\\/\\`);
    print(`             ${tongue} ||----w |`);
    print(`                ||     ||`);
  };
  ctx.commands.register({ name: 'cowsay', description: 'cowsay [ -b | -d | -g ] <message>\nDisplays an ASCII cow.\n  -b borg  -d dead  -g greedy', execute: (args, c) => fn(args, c.print || print) });
  // legacy
  ctx.registerCommand('cowsay', fn, 'cowsay [ -b | -d | -g ] <message>\nDisplays an ASCII cow.');
}

export function deactivate(ctx) {
  ctx.commands.unregister('cowsay');
  ctx.unregisterCommand('cowsay');
}

export async function install(ctx) { return activate(ctx); }
export async function uninstall(ctx) { return deactivate(ctx); }
