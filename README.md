# Cinmin Desktop

A beginner-friendly simulated desktop environment that runs as a web app. Feels like a small OS — wallpaper, icons, windows, taskbar, start menu, file explorer, notepad, terminal, and settings.

Built with just **HTML, CSS, and JavaScript** (Vite for dev server). No frameworks, no overengineering.

> Theme: **Purple Linux Mint** — exact replica of the screenshot (purple wave wallpaper + Mint LM logo, 4 left desktop icons, Mint Cinnamon menu).

## Install & Run

```bash
git clone https://github.com/hutchoihbgg-del/cinmin-desktop.git
cd cinmin-desktop
npm install
npm run dev
```

Open `http://localhost:5173`. `Ctrl+C` to stop.

## Features (0.5 System Foundation)

- **App Registry** (`src/core/AppRegistry.js`): Single manifest for Terminal, File Explorer, Notepad, Browser, Settings — `getApp()` / `listApps()`
- **Notifications** (`src/core/NotificationManager.js`): Toasts + bell 🔔 center (`#notif-center`), persisted to `localStorage: cinmin:notifications`, `notifier.success/error()` from any app
- **Virtual FS** (`src/core/FileSystem.js`): Folders/files, rename/delete, **copy/cut/paste** with clipboard + conflict-safe naming, `stat()`, `deepClone`, **persisted to `localStorage: cinmin:fs`** (survives reload)
- **File Explorer:** Breadcrumbs, back/forward, right-click → Open / Copy / Cut / Paste / Rename / Delete / Properties, `Ctrl+C/X/V`, `F2` rename, `Delete` key
- **Terminal:** `help, clear, ls [-l], cd, pwd, mkdir, touch, cat, echo, rm, cp, mv, whoami, date`; history `↑/↓`, `Ctrl+L` clear; errors via notifier
- **Notepad:** Open virtual files, edit, Save/Save As → FS, **unsaved ● indicator** + window title `•`, close guard, `Ctrl+S`; notifications on save/open
- **Browser:** Address bar for `/Home/*.html` + `https://`, **history back/forward + reload**, **bookmarks ☆** (`localStorage: cinmin:bookmarks` + panel ☰), graceful **blocked iframe** fallback with "Open in new tab"
- **Settings:** Wallpaper, accent, theme, icon size (small/medium/large via `data-icon-size`), animations toggle (`data-animations`)
- **Persistence:** `localStorage` for FS, icon positions/size/animations/theme/accent/wallpaper/recent/bookmarks/notifications
- **Polish:** Loading/error states (Explorer empty, Browser error/blocked, Terminal errors), keyboard shortcuts (`Alt+Tab`, `Ctrl+Shift+T`, `Esc`), a11y (`role=log`, `aria-label`), window animations with toggle

## Project Structure

```
cinmin-desktop/
├── index.html
├── package.json
├── src/
│   ├── main.js              # boots via AppRegistry + notifier + persistence
│   ├── core/EventBus.js, FileSystem.js, AppRegistry.js, NotificationManager.js
│   ├── desktop/Desktop.js, WindowManager.js
│   ├── apps/FileExplorer.js, Terminal.js, Notepad.js, HtmlViewer.js, Settings.js
│   └── styles/desktop.css, windows.css, explorer.css
└── README.md
```

## Changelog

- **0.5 — System Foundation:** App Registry, Notification Manager + center, FS copy/cut/paste + stat + persistence, Terminal rm/cp/mv, Notepad unsaved dot, Browser bookmarks/blocked, Settings icon size/animations, global error hooks, a11y.
- **0.4 — Mint pixel replica:** Wave wallpaper + LM logo, 4 icons, Mint taskbar + Cinnamon menu.
- **0.3 — Purple Mint theme**
- **0.2.1 — Click fix** · **0.2 — Interaction pass** · **0.1 — Initial shell**

## Roadmap

- 0.6: More apps, drag-drop, richer explorer
- 0.7: Electron/Tauri shell, real FS
- 1.0: Plugins, auto-updates

> README updated on every push. Appearance locked at 0.4 — 0.5 focused on internals.
