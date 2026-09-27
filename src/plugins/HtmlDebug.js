// HtmlDebug.js — plugin: HTMLDEBUG 1.0.0 — improved for 0.8
// Provides htmldebug + Notepad lint

import { fs } from '../core/FileSystem.js';

export const manifest = { id: 'HTMLDEBUG', version: '1.0.0' };

function lintHtml(content) {
  const issues = []; // {type: 'ok'|'warn'|'error', msg, line}
  const lines = content.split('\n');
  function lineOf(idx) {
    let pos = 0;
    for (let i = 0; i < lines.length; i++) {
      pos += lines[i].length + 1;
      if (pos > idx) return i + 1;
    }
    return 1;
  }
  const checks = [];

  // basic required checks
  const hasDoctype = /<!doctype/i.test(content);
  checks.push({ ok: hasDoctype, msg: 'Document type', detail: hasDoctype ? '✓ Document type' : '× Missing <!doctype html>', type: hasDoctype ? 'ok' : 'error', line: 1 });
  const hasHtml = /<html/i.test(content);
  checks.push({ ok: hasHtml, msg: 'html element', detail: hasHtml ? '✓ html element' : '× Missing <html>', type: hasHtml ? 'ok' : 'error', line: 1 });
  const hasHead = /<head/i.test(content);
  checks.push({ ok: hasHead, msg: 'head element', detail: hasHead ? '✓ head element' : '⚠ Missing <head>', type: hasHead ? 'ok' : 'warn', line: 1 });

  const hasLang = /<html[^>]*\blang=/i.test(content);
  if (!hasLang) checks.push({ ok: false, msg: 'Missing lang attribute', detail: '⚠ Missing lang attribute on <html>', type: 'warn', line: lineOf(content.toLowerCase().indexOf('<html')) });

  const titleMatch = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch) checks.push({ ok: false, detail: '× Missing <title>', type: 'error', line: 1 });
  else if (!titleMatch[1].trim()) checks.push({ ok: false, detail: '× Empty <title>', type: 'error', line: lineOf(titleMatch.index) });

  // duplicate html/head/body
  for (const tag of ['html','head','body']) {
    const count = (content.match(new RegExp(`<${tag}[\\s>]`, 'gi')) || []).length;
    if (count > 1) checks.push({ ok: false, detail: `× Duplicate <${tag}> (${count}x)`, type: 'error', line: 1 });
  }

  // duplicate IDs
  const idRe = /\bid\s*=\s*["']([^"']+)["']/gi;
  const seen = new Map();
  let m;
  while ((m = idRe.exec(content))) {
    const id = m[1];
    const line = lineOf(m.index);
    if (seen.has(id)) checks.push({ ok: false, detail: `× Duplicate id="${id}" (line ${seen.get(id)} & ${line})`, type: 'error', line });
    else seen.set(id, line);
  }

  // missing alt on images
  const imgRe = /<img[^>]*>/gi;
  while ((m = imgRe.exec(content))) {
    const tag = m[0];
    if (!/\balt\s*=/i.test(tag)) checks.push({ ok: false, detail: `⚠ <img> missing alt attribute`, type: 'warn', line: lineOf(m.index) });
  }

  // invalid nesting: block inside inline, etc (simplified: p contains div)
  if (/<p[^>]*>[\s\S]*?<div/i.test(content)) checks.push({ ok: false, detail: '⚠ Invalid nesting: <div> inside <p>', type: 'warn', line: 1 });

  // unclosed comments
  const openComments = (content.match(/<!--/g) || []).length;
  const closeComments = (content.match(/-->/g) || []).length;
  if (openComments !== closeComments) checks.push({ ok: false, detail: `× Unclosed comment (${openComments} <!-- vs ${closeComments} -->)`, type: 'error', line: 1 });

  // unclosed tags (stack)
  const stack = [];
  const tagRe = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
  const selfClosing = new Set(['br','hr','img','input','meta','link','area','base','col','embed','source','track','wbr']);
  while ((m = tagRe.exec(content))) {
    const full = m[0];
    if (full.startsWith('<!--')) continue;
    const tag = m[1].toLowerCase();
    if (selfClosing.has(tag)) continue;
    if (full.startsWith('</')) {
      const last = stack.pop();
      if (!last) checks.push({ ok: false, detail: `× Extra closing </${tag}>`, type: 'error', line: lineOf(m.index) });
      else if (last.tag !== tag) checks.push({ ok: false, detail: `× Mismatched <${last.tag}> (line ${last.line}) closed by </${tag}> (line ${lineOf(m.index)})`, type: 'error', line: lineOf(m.index) });
    } else if (!full.endsWith('/>')) {
      stack.push({ tag, line: lineOf(m.index) });
    }
  }
  if (stack.length) {
    stack.forEach(s => checks.push({ ok: false, detail: `× Unclosed <${s.tag}>`, type: 'error', line: s.line }));
  }

  // format for terminal: return array of strings with prefix
  const out = checks.map(c => c.detail);
  // also attach structured for Notepad
  out._checks = checks;
  return out;
}

function printChecks(print, path, content) {
  const res = lintHtml(content);
  const checks = res._checks || [];
  print(`HTML Debug — ${path}`);
  print('──────────');
  if (checks.length === 0) print('✓ No issues');
  else checks.forEach(c => print(c.detail));
  return checks;
}

export async function install(ctx) { return activate(ctx); }
export async function uninstall(ctx) { return deactivate(ctx); }

export function activate(ctx) {
  // register via new API + legacy
  const fn = (args, print) => {
    const path = args[0];
    if (!path) { print('Usage: htmldebug <path>  e.g. htmldebug /Home/index.html'); return; }
    let p = path; if (!p.startsWith('/')) p = '/Home/' + p;
    const res = fs.readFile(p);
    if (!res.ok) { print(`htmldebug: ${res.error}: ${p}`, 'error'); return; }
    printChecks(print, p, res.content);
  };
  ctx.commands.register({ name: 'htmldebug', description: 'htmldebug <path>\nChecks HTML for common mistakes.', execute: (args, c) => fn(args, c.print || c) });
  ctx.registerCommand('htmldebug', fn, 'htmldebug <path>\nChecks HTML for common mistakes.');
  window.htmlDebugLint = (content) => lintHtml(content);
  window.htmlDebugChecks = (content) => lintHtml(content)._checks || [];
  ctx.notifications.info('HTMLDEBUG 1.0.0 active — try: htmldebug /Home/index.html', 'Plugins');
}

export function deactivate(ctx) {
  ctx.commands.unregister('htmldebug');
  ctx.unregisterCommand('htmldebug');
  delete window.htmlDebugLint;
  delete window.htmlDebugChecks;
}
