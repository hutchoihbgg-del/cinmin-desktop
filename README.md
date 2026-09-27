# Cinmin Desktop

> **Try it now:** `https://hutchoihbgg-del.github.io/cinmin-desktop/` · Netlify · Vercel — *YukiOS-like, no install*

A browser-native desktop hypervisor — purple Linux Mint style — running entirely in vanilla JS. Like **YukiOS**, it's a single tab OS: window manager, App Registry, virtual filesystem, Trash, plugins, all persistent client-side.

Built with just **HTML, CSS, and JavaScript** (Vite). No frameworks, no overengineering. Compiles to static `dist/` for Netlify/Vercel/GitHub Pages.

> Theme: **Purple Linux Mint** — exact replica of the screenshot (purple wave wallpaper + Mint LM logo, 4 left desktop icons, Mint Cinnamon menu). Locked at 0.4.

## Live Website (like YukiOS)

Cinmin is a **static site** — deploy like YukiOS:

| Host | How |
|------|-----|
| **GitHub Pages** | Push to `main` → `.github/workflows/deploy.yml` auto-builds → `https://hutchoihbgg-del.github.io/cinmin-desktop/` (enable Pages: Settings → Pages → Source: GitHub Actions) |
| **Netlify** | Drag `dist/` or connect repo — `_redirects` handles SPA routing |
| **Vercel** | `vercel --prod` or import repo |
| **Cloudflare Pages** | Connect repo, build `npm run build`, output `dist` |

Build locally:

```bash
git clone https://github.com/hutchoihbgg-del/cinmin-desktop.git
cd cinmin-desktop
npm install
npm run dev     # local
npm run build   # → dist/ (deploy this)
npm run preview # preview prod build
```

## Browser Engine (Cinmin 1.0)

**Selected dependency: `electron@^30` — Chromium**
- Why: Real Chromium BrowserView, same engine as Chrome, proper `X-Frame-Options`/`CSP` handling
- Runtime: **Web fallback** (iframe, Vercel/browser) vs **Native** (Electron Node + Chromium binaries ~100MB)
- Web/Vercel: `isNativeAvailable() === false` → `WebEngine` (iframe, respects CSP, graceful blocked page, `Use Web Fallback` button). Native unavailable message shown, never crashes.
- Native: `isNativeAvailable() === true` (Electron `__CINMIN_NATIVE__`/`userAgent`) → `NativeEngine` via `BrowserView` (separate entry, not in Vite web bundle via `rollupOptions.external: ['electron']` + dynamic `import('electron')`)
- Security: No CSP stripping, no `X-Frame-Options` bypass, no cookie theft, no FS exposure — `BrowserDownloads` only via explicit `fs.createFile('/Home/Downloads')`, no `postMessage` to arbitrary pages
- Abstraction: `src/core/BrowserEngine.js` exposes `createBrowserView/navigate/back/forward/reload/stop/canGoBack/canGoForward/getCurrentUrl/destroy`, `BrowserDownloads`, `cinmin://error|home|history|bookmarks`
- Build targets: `npm run build` (web, Vercel) always works; `npm run build:native` (native, requires Electron binaries)

## Built-in Applications

Preloaded on first boot — no install, no download, work offline. Source: `src/apps/builtin/` (bundled at build time, no runtime GitHub fetch).

| App | Version | Category |
|-----|---------|----------|
| Calculator 🧮 | 1.0.0 | Accessories |
| Browser 🌐 | 1.0.0 | Internet |
| Terminal 💻 | 1.0.0 | Accessories |
| Files 📁 | 1.0.0 | Places |
| Notepad 📝 | 1.0.0 | Accessories |
| Settings ⚙ | 1.0.0 | Administration |
| Software Manager 🛍 | 1.0.0 | Administration |
| Vish ◈ | 1.0.0 | Accessories |

- Builtins show **Included** in Software Manager (no Install button).
- Plugin apps show `source: "plugin"`; builtins `source: "builtin"`. Plugin registering a builtin ID is rejected: `App ID already reserved by built-in application.`
- Per-app storage: `cinmin:app:<id>:<key>` via the Storage wrapper.
- Schema migration: `cinmin:appSchemaVersion` (1.2.0) — existing `cinmin:fs`, `cinmin:iconPos`, `cinmin:recent`, `cinmin:plugins` are never wiped.
- Future: `apps/<name>/manifest.json + app.js` bundles and `.capp` packages will plug into the same registry.

## Native Applications

`native-apps/` holds references for native Linux/Flatpak environments only.

- `io.github.lluciocc.Vish.flatpakref` is a Flatpak **reference**, not an executable — it **cannot** run inside the Chromebook web build.
- Requires compatible Linux + Flatpak + the referenced remote.
- Web Vish (`src/apps/builtin/Vish.js`) is the offline-safe frontend inside Cinmin.

## Features (1.2 — Preloaded Apps + 0.8 Plugin Ecosystem)

- **App Registry** (`src/core/AppRegistry.js`): Single manifest, `getApp/listApps`, Start Menu queries it
- **Notifications:** `success/info/warning/error` (✓/i/⚠/×), unread badge, per-item remove, persisted
- **Virtual FS + Trash:** `trash/restore/emptyTrash`, `stat()` with dates, persisted via `Storage` wrapper
- **Desktop/Explorer/Browser/Terminal/Notepad/Settings:** All 0.5/0.6 features preserved
- **Plugins** (`src/core/PluginManager.js`): Manifests (`id/name/version/description/author/commands/apps/permissions/dependencies`), `getPlugin/listPlugins/isInstalled/install/remove/load/unload/enable/disable/reload`, isolated storage `cinmin:plugin:<id>:`, sandboxed context (`commands/events/notifications/apps/files/storage`), file associations (`.md`→Markdown), app registration via `WindowManager`, deps check, failure overlay (Restart/Disable/Close)
- **Terminal plugin UX:** `plugin list` (✓ installed ○ available × failed [disabled]), `plugin info <id>`, `plugin enable/disable/reload`, `help` groups Built-in vs Plugin commands, `help cowsay`
- **Plugin apps:** `CALCULATOR` (🧮 Calculator in Accessories, plus `calc` command), `MARKDOWN` (`.md` → Markdown Viewer)
- **Settings → Plugins:** List with [ Enable/Disable/Remove/Info ], no redesign
- **Plugins included:** `HTMLDEBUG 1.0.0` (htmldebug + Notepad lint — now checks duplicate IDs, missing alt, invalid nesting, duplicate html/head/body, empty title, missing lang, unclosed comments with line numbers), `COWSAY 1.0.0` (`-b/-d/-g` flags), `HELLOWORLD 1.0.0` (`hello`), `CALCULATOR`, `MARKDOWN`, `IMAGEINFO` (`imageinfo`)
- **Safety:** No arbitrary FS/host exec, permissions field prepared, storage namespaced

## Plugin Development

```js
// src/plugins/HelloWorld.js
export function activate(context) {
  context.commands.register({
    name: "hello",
    description: "Say hello",
    execute(args, ctx) {
      ctx.print("Hello from my plugin!");
    }
  });
}
export function deactivate(context) {
  context.commands.unregister("hello");
}
```

Install: `plugin install HELLOWORLD` → `hello` → `Hello from the Cinmin plugin system!`
Enable/disable persists, hot reload: `plugin reload HELLOWORLD`.

## Project Structure

```
cinmin-desktop/
├── index.html
├── package.json
├── src/
│   ├── main.js
│   ├── core/EventBus.js, FileSystem.js, AppRegistry.js, NotificationManager.js, Storage.js, Recovery.js, PluginManager.js
│   ├── desktop/Desktop.js, WindowManager.js
│   ├── apps/FileExplorer.js, Terminal.js, Notepad.js, HtmlViewer.js, Settings.js
│   ├── plugins/HelloWorld.js, HtmlDebug.js, Cowsay.js, Calculator.js, Markdown.js, ImageInfo.js
│   └── styles/desktop.css, windows.css, explorer.css
└── README.md
```

## Changelog

- **1.1 — Chromebook Polish:** PWA install flow (Settings → System → Install Cinmin, beforeinstallprompt), offline ● Online/Offline indicator, SW versioning `cinmin-shell-v1` with cleanup, update notification (Reload), Chromebook 1366×768/1920×1080 responsive + touch/pointer drag, window resize handles (320×200 min), Chrome-safe keyboard (only when focused), Open in Chrome `noopener`, Downloads to `/Home/Downloads`, Storage health (Clear Cache/Notifications/History/Reset), crash recovery per app, memory cleanup, standalone display detection, manifest 192/512 icons.
- **0.8 — Plugin Ecosystem:** Manifests, status (installed/available/failed/disabled), `plugin info/enable/disable/reload`, sandboxed context, app/file assoc, isolated storage, Settings Plugins UI, Calculator/Markdown/HelloWorld/ImageInfo plugins, HTMLDEBUG improvements (duplicate IDs, alt, nesting, duplicate tags, title, lang, comments + line numbers), Cowsay flags, deps, failure overlay, hot reload.
- **0.6.1 — Plugins:** Initial HTMLDEBUG + COWSAY
- **0.6 — Interaction Pass** · **0.5 — System Foundation** · **0.4 — Mint replica** · 0.3/0.2/0.1

## Tests

- `npm run build` ✓ (22 modules, 75.29 kB JS)
- `plugin list` / `plugin info HTMLDEBUG` / `install/disable/enable/reload/remove` ✓
- `hello` / `htmldebug /Home/index.html` / `cowsay -b hi` / `calc 2+2` ✓
- Plugin app appears in Start Menu (Calculator) ✓, `.md` double-click → Markdown Viewer ✓
- Reload → plugin state persists ✓, failed plugin shows overlay without crashing ✓
- Explorer/Terminal/Notepad/Browser/Settings/Start/Taskbar/WM/Trash all still work ✓

> README updated on every push. Appearance locked at 0.4.
