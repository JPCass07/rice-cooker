# Rice Cooker

Build a KDE Plasma 6 rice in your browser, preview it live, save it as a preset, and get the shell commands to apply it on **Debian 13, Kubuntu 26.04, Fedora 43, Arch or openSUSE Tumbleweed**.

**Use it:** <https://jpcass07.github.io/rice-cooker/> or open `index.html` from a download (no build step, no server needed).

## Desktop app (Flatpak)

Rice Cooker also comes as a desktop app that applies rices directly, instead of handing you a script.

- **Unboxing** on first launch: it detects your distro, Plasma version and session, backs up your current desktop, and lets you pick a first rice.
- **Cook it**: applies the rice on screen and shows a live log with progress. Packages are only installed if missing; when they are, your password is asked by a system dialog (kdialog, zenity or ksshaskpass) and goes straight to `sudo`.
- **My rices**: save rices and switch between them with one click. Every switch is backed up, and any backup, including your original desktop, can be restored from the same tab.
- Wallpapers are saved to `~/Pictures/Wallpapers/rice-cooker` for you; rices live in `~/.local/share/rice-cooker/rices`.

Install the bundle from the [latest release](https://github.com/JPCass07/rice-cooker/releases/latest), or build it:

```bash
bash desktop/build-flatpak.sh
flatpak install --user dist/rice-cooker.flatpak
flatpak run io.github.jpcass07.RiceCooker
```

It runs on the GNOME runtime (`org.gnome.Platform//51`, from Flathub), which already has Python, GTK 4 and WebKit, so the bundle is under 400 kB and the build needs no SDK.

**Not sandboxed, on purpose.** Changing your desktop means running `plasma-apply-*`, `kwriteconfig6` and package installs on the host, so the app has `--talk-name=org.freedesktop.Flatpak` and uses `flatpak-spawn --host`. It only runs the script it shows you. This permission is also why it can't go on Flathub.

Run it without Flatpak (Debian needs `gir1.2-webkit-6.0`):

```bash
sudo apt install gir1.2-webkit-6.0 gir1.2-adw-1
python3 desktop/rice-cooker.py
```

## Presets

- **Your favourites:** Serpantinum (KDE), after [ilyamiro's Serpantinum](https://github.com/ilyamiro/serpantinum), and Caelestia (KDE), after [Caelestia Shell](https://github.com/caelestia-dots/shell).
- **Hyprland ricing competition winners** ([hall of fame](https://hypr.land/hall_of_fame)): Astroland (#1, Moon 2026), Celestial (#1, Space 2023), Hybrid Summer (#1, Summer 2023), Golden Era (#3, Space 2023), Day and Night (#3, Summer 2023), Aurora (#2, Winter 2022), Duskhide (#3, Fantasy 2025).
- **Showcase favourites** from the Hyprland Discord: Nothing, NieR Parchment.
- **Classics:** Kinetic Teal, Catppuccin, Nord, Gruvbox, Tokyo Night, Rosé Pine, Paper Light.

Each preset credits the rice it is based on. Only colours and layout ideas are borrowed: the palettes were sampled from the winners' screenshots, and the wallpapers are drawn in the browser.

## What it does

- **Colour schemes.** Pick a classic (Catppuccin, Nord, Gruvbox, Tokyo Night, Rosé Pine, Everforest, Caelestia Dusk and more) or edit every colour. One palette becomes a Plasma `.colors` scheme, the accent colour, a Konsole scheme and profile, and a kitty theme.
- **Wallpaper → colours.** Drop in wallpapers and Rice Cooker reads their colours (k-means in the browser) and suggests matching schemes: Night, Neon, Daylight, Muted, and the closest classic.
- **Rice cycling.** Give each wallpaper its own scheme and install `rice-cycle`, which swaps the wallpaper, Plasma colours, accent, Konsole and kitty together. Run it by hand, from the "Next Rice" app-menu entry or a shortcut, or on a systemd timer.
- **Motion.** Alt+Tab layouts (Cover Switch, Flip Switch, Thumbnail Grid, Big Icons, Compact, Sidebar), window open/close (Glide, Scale, Fade, Fall Apart), minimise (Magic Lamp, Squash), desktop switching (Slide, Fade, Desktop Cube), wobbly windows, blur and speed. Every one previews in the mock desktop.
- **Panels.** Top dock + side rail (Caelestia/Serpantinum: a floating clock and now-playing pill at the top centre whose widgets open drop-down popups), thin bar with centred clock + mini dock (Serpantinum-like), floating island + dock, floating left bar (Caelestia-like), top bar + dock, dock only, centred taskbar, classic, Unity-style, thin top bar. Built with Plasma's own desktop scripting.
- **Look.** Plasma style, Breeze or Kvantum, Papirus (with folders recoloured to the accent), Tela, Bibata cursors, fonts, title-bar buttons.
- **Extras.** KDE-Rounded-Corners, Panel Colorizer, Better Blur DX, a big desktop clock, a Caelestia-style widget column (weather, now playing, CPU, memory, calendar), fastfetch, btop and cava, and the [serpantinum-kde](https://github.com/mj0x0/serpantinum-kde) Quickshell shell (Arch only: Quickshell isn't packaged elsewhere).
- **Cross-distro presets.** Presets are distro-neutral JSON. Switch distro and the commands change (package names, AUR, downloads, builds). Anything that can't work there is marked *"This customisation can't be used on …"* and left out of the script.
- **Presets.** Save in the browser, export and import `.rice.json`, or share a link.
- **Inspiration.** 93 linked rices, competition winners, themes, effects and tools from the research in [`research/REFERENCES.md`](research/REFERENCES.md).

## Design

Shares its design language with my [portfolio](https://jpcass07.github.io/Portfolio/) and Flytrap: near-black ground (warm eggshell in light mode), Instrument Serif headlines with a grey second line, Geist text, JetBrains Mono labels, hairline rules and one accent, which here follows the rice you are building.

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
- All 18 built-in presets × 5 distros pass `bash -n`. The Debian script was run end to end in a Debian 13 container with KDE commands stubbed, checking every file it writes and the `rice-cycle` tool.
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
| `js/appmode.js` | desktop-app mode: unboxing, My rices, cooking log, restore |
| `desktop/` | the GTK 4 + WebKit app, Flatpak build script, launcher, icon, AppStream metadata |
| `research/` | reference rices, projects and config keys |

Third-party projects linked from the app belong to their authors; check each licence. Colour values of the classic schemes come from their public palettes.

## Licence

MIT
