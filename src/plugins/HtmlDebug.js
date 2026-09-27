// HtmlDebug.js — plugin: HTMLDEBUG
// Provides: htmldebug <path> command + Notepad lint button when installed

import { fs } from '../core/FileSystem.js';

export const name = 'HTMLDEBUG';
export const description = 'HTML Debugger for Notepad';

function lintHtml(content) {
  const errors = [];
  // very small beginner-friendly checks (no heavy parser)
  const stack = [];
  const tagRe = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
  const selfClosing = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr']);
  let m;
  while ((m = tagRe.exec(content))) {
    const full = m[0];
    const tag = m[1].toLowerCase();
    if (selfClosing.has(tag)) continue;
    if (full.startsWith('</')) {
      const last = stack.pop();
      if (!last) errors.push(`Extra closing </${tag}>`);
      else if (last !== tag) errors.push(`Mismatched <${last}> closed by </${tag}>`);
    } else if (!full.endsWith('/>')) {
      stack.push(tag);
    }
  }
  if (stack.length) errors.push(`Unclosed tags: ${stack.map(t=>`<${t}>`).join(', ')}`);
  // check missing doctype/html
  if (!content.includes('<!doctype') && !content.includes('<!DOCTYPE')) errors.push('Missing <!doctype html>');
  if (!content.toLowerCase().includes('<html')) errors.push('Missing <html> tag');
  return errors;
}

export async function install(ctx) {
  ctx.registerCommand('htmldebug', (args, print) => {
    const path = args[0];
    if (!path) { print('Usage: htmldebug <path>  e.g. htmldebug /Home/index.html'); return; }
    // resolve via fs (support relative too — for now require absolute)
    let p = path;
    if (!p.startsWith('/')) p = '/Home/' + p;
    const res = fs.readFile(p);
    if (!res.ok) { print(`htmldebug: ${res.error}: ${p}`, 'error'); return; }
    const errs = lintHtml(res.content);
    if (errs.length === 0) print(`✓ ${p}: no issues`, 'success');
    else {
      print(`Found ${errs.length} issue(s) in ${p}:`, 'error');
      errs.forEach(e => print(`  • ${e}`, 'error'));
    }
  }, 'htmldebug <path>\nLint an HTML file for unclosed/mismatched tags.');

  // also add a helper that Notepad can call: window.htmlDebugLint
  window.htmlDebugLint = lintHtml;
  ctx.notifier.info('HTMLDEBUG active — try: htmldebug /Home/index.html', 'Plugins');
}

export async function uninstall(ctx) {
  ctx.unregisterCommand('htmldebug');
  delete window.htmlDebugLint;
}
