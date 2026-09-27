// Cowsay.js — fun demo plugin

export const name = 'COWSAY';
export const description = 'Cowsay demo';

export async function install(ctx) {
  ctx.registerCommand('cowsay', (args, print) => {
    const text = args.join(' ') || 'moo';
    const line = '-'.repeat(text.length + 2);
    print(` ${line}`);
    print(`< ${text} >`);
    print(` ${line}`);
    print(`        \\   ^__^`);
    print(`         \\  (oo)\\_______`);
    print(`            (__)\\       )\\/\\`);
    print(`                ||----w |`);
    print(`                ||     ||`);
  }, 'cowsay <text>\nMake a cow say something.');
}

export async function uninstall(ctx) {
  ctx.unregisterCommand('cowsay');
}
