// Markdown.js — .md file association + viewer app

export function activate(ctx) {
  ctx.apps.register({
    id: 'markdown', name: 'Markdown Viewer', icon: '📝', category: 'Office',
    create: (path) => {
      const el = document.createElement('div');
      el.style.padding='16px'; el.style.overflow='auto'; el.style.whiteSpace='pre-wrap'; el.style.fontFamily='Inter, sans-serif'; el.style.fontSize='13px';
      // path may be passed via createWith — not used here, viewer will need manual load
      el.innerHTML='<div style="opacity:0.6">Open a .md file from File Explorer to view it.</div>';
      return el;
    }
  });
  ctx.files.registerAssociation('.md', 'markdown');
}

export function deactivate(ctx) {
  ctx.apps.unregister('markdown');
}
export async function install(c){ return activate(c); }
export async function uninstall(c){ return deactivate(c); }
