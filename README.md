# Cinmin Desktop

A beginner-friendly simulated desktop environment that runs as a web app. Feels like a small OS — wallpaper, icons, windows, taskbar, start menu, file explorer, notepad, terminal, and settings.

Built with just **HTML, CSS, and JavaScript** (Vite for dev server). No frameworks, no overengineering.

> Theme: **Purple Linux Mint** — exact replica of the screenshot (purple wave wallpaper + Mint LM logo, 4 left desktop icons, Mint Cinnamon menu). Locked at 0.4.

## Install & Run

```bash
git clone https://github.com/hutchoihbgg-del/cinmin-desktop.git
cd cinmin-desktop
npm install
npm run dev
```

Open `http://localhost:5173`. `Ctrl+C` to stop.

## Features (0.8 — Plugin Ecosystem)

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
