// Calculator.js — plugin app + calc command

export function activate(ctx) {
  ctx.commands.register({ name: 'calc', description: 'calc <expr>\nEvaluate math expression.', execute: (args, c) => {
    const expr = args.join(' ');
    if (!expr) { (c.print||c)('Usage: calc <expression>  e.g. calc 2+2*3'); return; }
    try {
      // safe eval: only numbers and operators
      if (!/^[0-9+\-*/().% ]+$/.test(expr)) throw new Error('Only numbers and + - * / % ( ) allowed');
      const res = Function(`"use strict"; return (${expr})`)();
      (c.print||c)(String(res));
    } catch (e) { (c.print||c)(`calc: ${e.message}`, 'error'); }
  }});

  ctx.registerCommand('calc', (args, print) => {
    const expr = args.join(' ');
    if (!expr) { print('Usage: calc <expression>'); return; }
    try {
      if (!/^[0-9+\-*/().% ]+$/.test(expr)) throw new Error('Only numbers and + - * / % ( ) allowed');
      print(String(Function(`"use strict"; return (${expr})`)()));
    } catch (e) { print(`calc: ${e.message}`, 'error'); }
  }, 'calc <expr>\nEvaluate math.');

  ctx.apps.register({
    id: 'calculator', name: 'Calculator', icon: '🧮', category: 'Accessories',
    create: () => {
      const el = document.createElement('div');
      el.style.padding='12px'; el.style.display='flex'; el.style.flexDirection='column'; el.style.gap='8px';
      el.innerHTML=`<input class="calc-in" placeholder="2+2*3" style="padding:8px; border-radius:8px; border:1px solid #555; background:#1e1b2e; color:white"><button class="calc-go" style="padding:8px; border-radius:8px; background:#7c3aed; color:white; border:none; cursor:pointer">Calculate</button><div class="calc-out" style="padding:8px; background:rgba(255,255,255,0.06); border-radius:8px; min-height:24px"></div>`;
      const inp=el.querySelector('.calc-in'), out=el.querySelector('.calc-out'), btn=el.querySelector('.calc-go');
      const run=()=>{ try{ if(!inp.value) return; if(!/^[0-9+\-*/().% ]+$/.test(inp.value)) throw new Error('Only numbers'); out.textContent=String(Function(`"use strict"; return (${inp.value})`)()); }catch(e){ out.textContent='Error: '+e.message; } };
      btn.addEventListener('click', run);
      inp.addEventListener('keydown', e=>{ if(e.key==='Enter') run(); });
      return el;
    }
  });
}

export function deactivate(ctx) {
  ctx.commands.unregister('calc');
  ctx.unregisterCommand('calc');
  ctx.apps.unregister('calculator');
}
export async function install(c){ return activate(c); }
export async function uninstall(c){ return deactivate(c); }
