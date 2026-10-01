// UltrakillDemo.js — dedicated game window (1.6)
// Own iframe, NOT routed through the Browser app. If the host blocks
// framing, shows a fallback with Open in Chrome.

const GAME_URL = 'https://script.google.com/macros/s/AKfycby9sT01X_yf3hzNCfwSqYkPzc0VPXbigijk2yx8057pzj5q-yF9_3sst9H3gTiyShcL/exec';

export function createUltrakillDemoContent() {
  const wrap = document.createElement('div');
  wrap.className = 'ultrakill-demo';
  wrap.style.cssText = 'display:flex; flex-direction:column; flex:1; min-height:0; background:#000';
  wrap.innerHTML = `
    <div class="uk-bar" style="display:flex; align-items:center; gap:8px; padding:6px 10px; background:#1a0b2e; color:#e9d5ff; font-size:12px">
      <span>🔥 ULTRAKILL Demo</span>
      <span style="flex:1"></span>
      <button data-a="reload" title="Reload" style="cursor:pointer">↻</button>
      <button data-a="open" title="Open in Chrome" style="cursor:pointer">⧉ Open in Chrome</button>
    </div>
    <div class="uk-host" style="flex:1; min-height:0; display:flex"></div>
    <div class="uk-fallback hidden" style="padding:24px; text-align:center; color:#e9d5ff">
      <div style="font-size:28px">🚫</div>
      <div><b>Game won't embed here</b></div>
      <div style="font-size:12px; opacity:0.7">The host blocks framing.</div>
      <button data-a="open2" style="margin-top:10px; cursor:pointer">⧉ Open in Chrome</button>
    </div>
  `;
  const host = wrap.querySelector('.uk-host');
  const fallback = wrap.querySelector('.uk-fallback');

  function load() {
    fallback.classList.add('hidden');
    host.style.display = 'flex';
    host.innerHTML = '';
    const f = document.createElement('iframe');
    f.title = 'ULTRAKILL Demo';
    f.setAttribute('allow', 'fullscreen; autoplay; gamepad');
    f.setAttribute('allowfullscreen', '');
    f.style.cssText = 'flex:1; width:100%; height:100%; border:none; background:#000';
    f.src = GAME_URL;
    // If framing is blocked the frame stays blank — detect and fall back
    let settled = false;
    f.addEventListener('load', () => { settled = true; });
    setTimeout(() => {
      try {
        const doc = f.contentDocument;
        if (!settled || !doc || !doc.body || doc.body.innerHTML.trim() === '') {
          // blank: likely blocked (same-origin blank loads throw on access → assume ok)
        }
      } catch {
        // cross-origin access throws = actually loaded fine, do nothing
        return;
      }
      if (!settled) { host.style.display = 'none'; fallback.classList.remove('hidden'); }
    }, 6000);
    host.appendChild(f);
  }

  const openChrome = () => window.open(GAME_URL, '_blank', 'noopener,noreferrer');
  wrap.querySelector('[data-a="reload"]').addEventListener('click', load);
  wrap.querySelector('[data-a="open"]').addEventListener('click', openChrome);
  wrap.querySelector('[data-a="open2"]').addEventListener('click', openChrome);

  load();
  wrap._destroy = () => { host.innerHTML = ''; };
  return wrap;
}
