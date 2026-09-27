# Cinmin Desktop

A beginner-friendly simulated desktop environment that runs as a web app. Feels like a small OS — wallpaper, icons, windows, taskbar, start menu, file explorer, notepad, terminal, and settings.

Built with just HTML, CSS, and JavaScript (Vite for dev server). No frameworks, no overengineering.

## Install & Run

```bash
npm install
npm run dev
```

Then open the URL shown (usually http://localhost:5173).

## Current Features (Phase 1)

- Wallpaper + desktop icons (double-click to open)
- Taskbar with start button, running apps, clock
- Start menu
- Window system: drag, focus, minimize, maximize, close, z-index
- Simulated filesystem (`Home/Documents`, `Downloads`, `Pictures`, `README.txt`)
- File Explorer: navigate, back/forward/up, address bar, create folder/file, rename/delete (right-click)
- Notepad: new/open/save/save-as, saves to simulated filesystem, Ctrl+S
- Terminal: `help, clear, ls, cd, pwd, mkdir, touch, cat, echo, whoami, date` (shares same filesystem)
- Settings: wallpaper, dark/light theme, accent color, show/hide icons — persisted via localStorage
- Shortcuts: `Alt+Tab` switch windows, `Ctrl+Shift+T` open terminal, `Esc` close menus

## Project Structure

```
cinmin-desktop/
├── index.html
├── package.json
├── src/
│   ├── main.js
│   ├── core/EventBus.js
│   ├── core/FileSystem.js
│   ├── desktop/Desktop.js
│   ├── desktop/WindowManager.js
│   ├── desktop/Taskbar.js
│   ├── apps/FileExplorer.js
│   ├── apps/Terminal.js
│   ├── apps/Notepad.js
│   ├── apps/Settings.js
│   └── styles/desktop.css, windows.css, explorer.css
└── README.md
```

## Planned

- Cinmin 0.2: context menus, drag-drop, right-click desktop, animations
- Cinmin 0.3: notifications, system tray, more shortcuts, themes
- Cinmin 0.4: Electron/Tauri shell, real FS integration
- Cinmin 1.0: plugin system, settings architecture, crash handling
