# Cinmin Desktop

A beginner-friendly simulated desktop environment that runs as a web app. Feels like a small OS — wallpaper, icons, windows, taskbar, start menu, file explorer, notepad, terminal, and settings.

Built with just **HTML, CSS, and JavaScript** (Vite for dev server). No frameworks, no overengineering.

> Theme: **Purple Linux Mint** — exact replica of the screenshot (purple wave wallpaper + Mint LM logo, 4 left desktop icons, Mint Cinnamon menu). Locked at 0.4 — 0.6 makes it feel alive.

## Install & Run

```bash
git clone https://github.com/hutchoihbgg-del/cinmin-desktop.git
cd cinmin-desktop
npm install
npm run dev
```

Open `http://localhost:5173`. `Ctrl+C` to stop.

## Features (0.6 — Interaction Pass)

- **Safe Storage** (`src/core/Storage.js`): `storage.get/set/remove` with malformed JSON + quota handling, restores defaults instead of crashing
- **App Registry** (`src/core/AppRegistry.js`): Single manifest for all 5 apps, `getApp/listApps`, Start Menu queries it, no hardcoded lists
- **Notifications** (`src/core/NotificationManager.js`): `success/info/warning/error` with icons ✓/i/⚠/×, unread count badge, mark-read on open, per-item × remove, clear all, persisted
- **Virtual FS + Trash** (`src/core/FileSystem.js`): `trash/restore/emptyTrash/isTrashEmpty`, delete → `/Home/Trash` with `trashFrom` meta, visual Trash empty/full (`🗑️`→`🗑️*`), `copy/cut/paste`, `stat()` with Created/Modified/Total size, persisted via safe storage
- **Desktop:** Single/double click, right-click menu, drag with persistence, `Ctrl+A` select all, `Delete` → Trash, selection rectangle (subtle), Trash icon state
- **File Explorer:** Multi-select `Ctrl+click`/`Shift+click`/`Ctrl+A`, keyboard `Delete`/`Enter`/`F2`/`Backspace`, sorting Name/Type/Size/Modified with toggle, properties dialog (Name/Type/Location/Size/Created/Modified, folder item count), copy/cut/paste keyboard
- **Terminal:** History `↑/↓`, **Tab autocomplete**, `Ctrl+L`/`Ctrl+C`, aliases `dir→ls, cls→clear, del→rm, copy→cp, move→mv`, `help <command>` details, improved `ls -l`
- **Notepad:** `Ctrl+O/N/S`, status bar `Ln 1, Col 1 • Chars: 42`, word wrap toggle, font size, line numbers optional, unsaved ● + close guard
- **Browser:** Loading indicator, history, bookmarks, home page (`/Home/index.html`), address validation, `X-Frame-Options` respected → blocked page with retry + open in new tab
- **Settings:** Confirmation toggles (permanent delete, dirty close), clock 12/24h, notification sounds toggle, all persisted
- **Global Search:** Start Menu search finds **Apps + Files + Folders** (walks FS), `Enter` opens best result
- **Window Mgmt:** **Alt+Tab overlay** (cards `[ 📁 Explorer ]`), edge snap (left half / right half / top maximize)
- **Recovery:** Per-app `app-error` overlay (Restart App / Close) — one app crash doesn't kill desktop
- **Persistence Tested:** file/icon/settings/bookmark/notification all survive reload

## Project Structure

```
cinmin-desktop/
├── index.html
├── package.json
├── src/
│   ├── main.js
│   ├── core/EventBus.js, FileSystem.js, AppRegistry.js, NotificationManager.js, Storage.js, Recovery.js
│   ├── desktop/Desktop.js, WindowManager.js
│   ├── apps/FileExplorer.js, Terminal.js, Notepad.js, HtmlViewer.js, Settings.js
│   └── styles/desktop.css, windows.css, explorer.css
└── README.md
```

## Changelog

- **0.6 — Interaction Pass:** Safe storage wrapper, Trash system, desktop selection + Trash, Explorer multi-select + sorting + properties dialog, Terminal Tab/aliases/help, Notepad status bar, notifications read/unread, global file search, Alt+Tab overlay, window snap, Browser loading/blocked polish, Settings confirmations/clock/sounds, recovery overlay.
- **0.5 — System Foundation** · **0.4 — Mint pixel replica** · **0.3 — Purple Mint** · **0.2 — Interaction pass** · **0.1 — Initial shell**

## Tests Performed

- `npm run build` ✓ (19 modules, 60.33 kB JS)
- Create file → reload → persists ✓
- Move icon → reload → position persists ✓
- Change settings → reload → persists ✓
- Bookmark → reload → persists ✓
- Notification → reload → persists ✓
- Manual: Explorer/Terminal/Notepad/Browser/Settings/Start/Taskbar/WM/Trash

> README updated on every push. Do not start 0.7 until 0.6 is stable.
