# Cinmin Desktop

A beginner-friendly simulated desktop environment that runs as a web app. Feels like a small OS — wallpaper, icons, windows, taskbar, start menu, file explorer, notepad, terminal, and settings.

Built with just **HTML, CSS, and JavaScript** (Vite for dev server). No frameworks, no overengineering.

> Theme: **Purple Linux Mint** — Mint Cinnamon-inspired Start Menu with purple sidebar, search, and power menu (since 0.3).

## Install & Run

```bash
git clone https://github.com/hutchoihbgg-del/cinmin-desktop.git
cd cinmin-desktop
npm install
npm run dev
```

Open the URL shown (usually `http://localhost:5173`). Press `Ctrl+C` to stop.

## Features

### Desktop
- Purple dark wallpaper with radial glow
- 5 apps: File Explorer 📁, Terminal 💻, Notepad 📝, Browser 🌐, Settings ⚙
- Double-click to launch, single-click to select
- Draggable icons — positions saved in `localStorage: cinmin:iconPos`
- Right-click desktop: Refresh / Create Folder / Create Text File / Personalize

### Window System
- Smooth open/close/minimize/restore animations
- Drag with viewport clamping (never lose window off-screen)
- Focus ring + dim unfocused, proper z-index, double-click titlebar to maximize

### File Explorer
- Breadcrumbs + address bar + back/forward/up
- Double-click folders/files, right-click menu: Open / Rename / Delete / Properties / New Folder / New Text File
- Shares the same virtual filesystem as Terminal/Notepad/Browser

### Other Apps
- **Notepad:** New/Open/Save/Save As → virtual FS, `Ctrl+S`
- **Terminal:** `help, clear, ls, cd, pwd, mkdir, touch, cat, echo, whoami, date`
- **Browser:** Address bar for `/Home/*.html` (renders via `srcdoc`) and `https://` (via `src`), sandboxed iframe
- **Settings:** Wallpaper, dark/light, accent color, show/hide icons — persisted via localStorage

### Taskbar & Start Menu
- Taskbar shows every open app — click to focus/restore, right-click → Close Window
- Mint-style Start Menu: search filtering, Recent (last 5), left Places sidebar, Power submenu (Shut Down/Restart)
- Click outside or `Esc` closes menu; `Alt+Tab` cycles windows, `Ctrl+Shift+T` opens Terminal

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
│   ├── apps/HtmlViewer.js
│   ├── apps/Settings.js
│   └── styles/desktop.css, windows.css, explorer.css
└── README.md
```

## Changelog

- **0.3 — Purple Mint theme:** Redesigned Start Menu to Linux Mint Cinnamon style (purple sidebar + app grid), new Mint avatar/places, purple accent `#8b5cf6`, updated wallpaper gradient, responsive Mint layout.
- **0.2.1 — Click fix:** Restored Start Menu launchers broken in 0.2, fixed desktop double-click.
- **0.2 — Desktop interaction pass:** Window animations + drag clamping, desktop context menu + draggable icons, Explorer breadcrumbs + context menus, Taskbar right-click Close, Start search/recent/power.
- **0.1 — Initial shell:** HTML/CSS/JS shell, windows, virtual FS, Explorer/Notepad/Terminal/Settings/Browser.

## Planned

- 0.4: Electron/Tauri shell, real local FS integration, native dialogs
- 1.0: Plugin/app system, proper settings architecture, crash handling, auto-updates

> README is updated on every push — see Changelog above.
