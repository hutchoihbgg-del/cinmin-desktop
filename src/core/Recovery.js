// Recovery.js — per-app crash overlay (0.6)

export function withRecovery(contentEl, appTitle, wm, id) {
  // wrap contentEl creation in try/catch at WindowManager level already,
  // this helper is for runtime errors inside apps
  const handler = (e) => {
    if (e.error) showError(e.error, appTitle, contentEl);
  };
  // not used directly here — WindowManager will call showError on catch
  return handler;
}

export function showAppError(appTitle, err, container) {
  const overlay = document.createElement('div');
  overlay.className = 'app-error';
  overlay.innerHTML = `
    <div class="app-error-card">
      <div class="app-error-title">Cinmin</div>
      <div>${appTitle} encountered an error.</div>
      <div class="app-error-msg">${String(err.message || err)}</div>
      <div class="app-error-actions">
        <button class="app-error-btn restart">Restart App</button>
        <button class="app-error-btn close">Close</button>
      </div>
    </div>
  `;
  container.appendChild(overlay);
  overlay.querySelector('.restart').addEventListener('click', () => {
    // emit retry — caller should re-create content
    overlay.remove();
    // simple reload of window: we emit event
    import('./EventBus.js').then(({ events }) => events.emit('app:launch', appTitle.toLowerCase()));
  });
  overlay.querySelector('.close').addEventListener('click', () => {
    const win = container.closest('.window');
    if (win) win.querySelector('.close')?.click();
    else overlay.remove();
  });
}
