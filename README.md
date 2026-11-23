# Rice Cooker

Build a KDE Plasma 6 rice in your browser, preview it live, save it as a preset, and get the shell commands to apply it on **Debian 13, Kubuntu 26.04, Fedora 43, Arch or openSUSE Tumbleweed**.

**Use it:** <https://jpcass07.github.io/rice-cooker/> or open `index.html` from a download (no build step, no server needed).

## What it does

- **Colour schemes.** Pick a classic (Catppuccin, Nord, Gruvbox, Tokyo Night, Rosé Pine, Everforest, Caelestia Dusk and more) or edit every colour. One palette becomes a Plasma `.colors` scheme, the accent colour, a Konsole scheme and profile, and a kitty theme.
- **Wallpaper → colours.** Drop in wallpapers and Rice Cooker reads their colours (k-means in the browser) and suggests matching schemes: Night, Neon, Daylight, Muted, and the closest classic.
- **Rice cycling.** Give each wallpaper its own scheme and install `rice-cycle`, which swaps the wallpaper, Plasma colours, accent, Konsole and kitty together. Run it by hand, from the "Next Rice" app-menu entry or a shortcut, or on a systemd timer.
- **Motion.** Alt+Tab layouts (Cover Switch, Flip Switch, Thumbnail Grid, Big Icons, Compact, Sidebar), window open/close (Glide, Scale, Fade, Fall Apart), minimise (Magic Lamp, Squash), desktop switching (Slide, Fade, Desktop Cube), wobbly windows, blur and speed. Every one previews in the mock desktop.
- **Panels.** Floating left bar (Caelestia-like), top bar + dock, dock only, centred taskbar, classic, Unity-style, thin top bar. Built with Plasma's own desktop scripting.
- **Look.** Plasma style, Breeze or Kvantum, Papirus (with folders recoloured to the accent), Tela, Bibata cursors, fonts, title-bar buttons.
- **Extras.** KDE-Rounded-Corners, Panel Colorizer, Better Blur DX, fastfetch, btop and cava.
- **Cross-distro presets.** Presets are distro-neutral JSON. Switch distro and the commands change (package names, AUR, downloads, builds). Anything that can't work there is marked *"This customisation can't be used on …"* and left out of the script.
- **Presets.** Save in the browser, export and import `.rice.json`, or share a link.
- **Inspiration.** 70 linked rices, themes, effects and tools from the research in [`research/REFERENCES.md`](research/REFERENCES.md).

## The generated script

- Runs as your normal user and asks for `sudo` only to install packages.
- Backs up `kdeglobals`, `kwinrc`, your panel layout, Konsole and kitty config to `~/.local/share/rice-cooker/backups/<date>/` first and writes an `undo.sh` there.
- Each step is self-contained, so you can paste steps one at a time instead.
- Warns if it is run on a different distro than it was made for.

```bash
bash my-rice-debian.sh        # asks before changing anything
bash my-rice-debian.sh -y     # no question
```

## Tested

- Package names checked on 2026-11-23 against each distro's repos (Docker images `debian:trixie`, `ubuntu:26.04`, `fedora:43`, `archlinux`, `opensuse/tumbleweed`) and the AUR.
- Plasma versions then: Debian 13 6.3, Kubuntu 26.04 6.6, Fedora 43 6.7, Arch and Tumbleweed 6.8.
- All built-in presets × 5 distros pass `bash -n`. The Debian script was run end to end in a Debian 13 container with KDE commands stubbed, checking every file it writes and the `rice-cycle` tool.
- Not yet run on a live desktop for every distro. Reports welcome.

## Adding a distro or desktop

- **Distro:** add it to `DISTROS` in `js/catalog.js` and give each entry in `FEATURES` a package name, `{ aur }`, `{ manual: true }`, `{ build: 'deps' }` or `null` with a `why`.
- **Desktop (GNOME, Hyprland…):** add it to `DESKTOPS`, then a generator next to `buildSteps` in `js/generate.js`. The palette engine, presets, wallpaper extraction and compatibility table are desktop-neutral.

## Files

| Path | What |
| --- | --- |
| `index.html`, `css/` | the page |
| `js/palette.js` | colour maths, wallpaper extraction, scheme suggestions, `.colors`/Konsole/kitty writers |
| `js/catalog.js` | distros, features, package names, option lists |
| `js/generate.js` | preset → shell steps and script |
| `js/presets.js` | built-in presets and procedural sample wallpapers |
| `js/preview.js` | mock desktop and animation previews |
| `js/app.js` | UI |
| `research/` | reference rices, projects and config keys |

Third-party projects linked from the app belong to their authors; check each licence. Colour values of the classic schemes come from their public palettes.

## Licence

MIT
