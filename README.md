# Cinmin Desktop

A beginner-friendly simulated desktop environment that runs as a web app. Feels like a small OS — wallpaper, icons, windows, taskbar, start menu, file explorer, notepad, terminal, and settings.

Built with just **HTML, CSS, and JavaScript** (Vite for dev server). No frameworks, no overengineering.

> Theme: **Purple Linux Mint** — exact replica of the screenshot (purple wave wallpaper + Mint LM logo, 4 left desktop icons, Mint Cinnamon menu with categories).

## Preview

Wallpaper: purple wave gradient with large Mint LM logo center (like Linux Mint 21).
Desktop icons left: Computer 🖥️, Home 🏠, Trash 🗑️, Firefox Web Browser 🦊 (draggable, persisted).
Taskbar bottom: dark `#1e1b2e`, Mint `lm` button + Files/Firefox/Terminal quick icons, wifi/sound/battery + clock.
Start Menu: 520×430 dark panel, search top, left categories (All Applications purple-highlighted, Accessories/Graphics/Internet/Office/Sound & Video/Administration/Preferences/Places/Recent Files), right app list (Firefox, LibreOffice Writer/Calc, Terminal, Files, Settings, etc.) filtered by category + search.

## Install & Run

```bash
git clone https://github.com/hutchoihbgg-del/cinmin-desktop.git
cd cinmin-desktop
npm install
npm run dev
```

Open `http://localhost:5173`. `Ctrl+C` to stop.

## Features

- **Desktop:** 4 Mint-accurate icons double-click to launch, draggable with `localStorage: cinmin:iconPos`, right-click → Refresh / Create Folder / File / Personalize
- **Windows:** Animated open/close/minimize, drag-clamped, focus ring, maximize via button or double-click titlebar
- **File Explorer:** Breadcrumbs + address bar + back/forward, grid with context menus, `.html` → Browser
- **Notepad / Terminal / Browser / Settings:** All share virtual FS (`/Home`); Browser renders `/Home/*.html` + `https://`
- **Start Menu Mint:** Category filter + live search + Recent Files + Places, click outside/`Esc` closes
- **Shortcuts:** `Alt+Tab`, `Ctrl+Shift+T`, `Win` key

## Project Structure

```
cinmin-desktop/
├── index.html
├── package.json
├── src/
│   ├── main.js
│   ├── core/EventBus.js, FileSystem.js
│   ├── desktop/Desktop.js, WindowManager.js
│   ├── apps/FileExplorer.js, Terminal.js, Notepad.js, HtmlViewer.js, Settings.js
│   └── styles/desktop.css, windows.css, explorer.css
└── README.md
```

## Changelog

- **0.4 — Mint pixel replica:** Matched screenshot exactly — wave wallpaper + LM SVG logo, 4 desktop icons, dark Mint taskbar with `lm` + tray, Start Menu rebuilt to Cinnamon layout (search + 10 categories left, app list right, purple active state, search+category filtering).
- **0.3 — Purple Mint theme:** Initial Mint sidebar + app grid, purple accent `#8b5cf6`.
- **0.2.1 — Click fix:** Restored Start launchers broken in 0.2.
- **0.2 — Interaction pass:** Animations, drag clamping, context menus, breadcrumbs, Taskbar close, Start search/recent.
- **0.1 — Initial shell**

## Planned

- 0.5: Notifications, system tray, more shortcuts
- 0.6: Electron/Tauri, real FS
- 1.0: Plugin system, auto-updates

> README updated on every push.
