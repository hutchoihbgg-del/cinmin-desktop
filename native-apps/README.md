# native-apps/

References for **native Linux / Flatpak environments only**.

- `io.github.lluciocc.Vish.flatpakref` (if present) is a Flatpak *reference*, not an executable.
- It **cannot** run inside the Chromebook web build (`cinmin-web-desktop.vercel.app`).
- Requires: compatible Linux distro + Flatpak + the referenced remote.
- The web version of Vish lives at `src/apps/builtin/Vish.js` and runs fully offline inside Cinmin.
