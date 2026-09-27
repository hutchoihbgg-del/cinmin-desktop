// HelloWorld.js — simplest reference plugin for 0.8

export const manifest = { id: 'HELLOWORLD', version: '1.0.0' };

export function activate(ctx) {
  ctx.commands.register({
    name: 'hello',
    description: 'hello\nSay hello from the plugin system.',
    execute(args, c) {
      const out = c && c.print ? c.print : args[1]; // support both signatures
      // Terminal calls via tryRun passes (args, print)
      // We'll handle both
    }
  });
  // Use legacy register for compatibility with current tryRun signature
  ctx.registerCommand('hello', (args, print) => {
    print('Hello from the Cinmin plugin system!');
  }, 'hello\nSay hello.');
}

export function deactivate(ctx) {
  ctx.commands.unregister('hello');
  ctx.unregisterCommand('hello');
}
