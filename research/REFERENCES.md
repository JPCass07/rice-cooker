# Rice Builder: reference research (KDE Plasma 6)

Compiled 2026-11-23. Nothing was downloaded or run, apart from reading metadata on the local Debian 13 machine (Plasma 6.3.6) to confirm effect IDs and package names.

**Labels used below**

- **verified**: read from the project's own repo or source file, from the KWin/Plasma source, or from the local Debian 13 install.
- **search-snippet**: from a search-engine summary or a third-party list. The page itself wasn't opened.
- **unverified**: from memory or one secondary source. Check before using it to generate commands.

Reddit (reddit.com, old.reddit.com and the redlib mirrors) refused automated fetching, so every Reddit entry comes from a curated list or a search snippet and is marked that way.

---

## 0. Findings that change how commands should be generated

1. **Plasma versions differ a lot.** Debian 13 ships Plasma **6.3.6** (verified locally). Kubuntu 25.10 shipped 6.4.5 (release notes). Plasma 6.5 came out 2025-10-21, 6.6 on 2026-02-17 and **6.8 in October 2026** ([GamingOnLinux](https://www.gamingonlinux.com/2026/10/plasma-6-8-is-out-as-kde-celebrates-30-years/page=1/)), so Arch and Tumbleweed are probably on 6.8 and Fedora on 6.6–6.8 (unverified). Third-party C++ KWin effects and decorations pin minimum versions:
   - **Klassy** current branch needs Plasma ≥ 6.6, which rules out Debian 13.
   - **Darkly** main needs ≥ 6.5. For 6.3–6.4 use v0.5.25 or the `Darkly-6.4` branch.
   - **Better Blur DX** supports 6.5–6.7.
   - **taj-ny Better Blur**: the last build for 6.0–6.3.5 is v1.3.6. The repo was archived on 2025-11-20.

   The app needs a per-distro "Plasma version" field, and it should gate or swap items based on it.
2. **The KWin X11/Wayland split (Plasma 6.4+).** `kwin_x11` became a separate project and package (`kwin-x11`). Third-party C++ effects ship separate X11 builds:
   - Better Blur DX: `kwin-effects-better-blur-dx-x11`
   - Rounded Corners: `kwin-effect-roundcorners-x11` / `kwin-effect-rounded-corners-x11-git`

   C++ effects install to `…/qt6/plugins/kwin/effects/plugins` (Wayland) or `…/kwin-x11/effects/plugins`. Generated commands should ask which session the user runs. Wayland is the default.
3. **Effect enable keys are `<PluginId>Enabled` in `kwinrc [Plugins]`.** Plasma 6 built-in IDs have no `kwin4_effect_` prefix (`scale`, `glide`, `fade`, `squash`, `magiclamp`, `slide`, `fadedesktop` …). Third-party effects keep their own IDs:
   - Rounded Corners: `kwin4_effect_shapecorners`
   - Geometry Change: `kwin4_effect_geometry_change`
   - Burn My Windows: `kwin6_effect_<name>`, for example `kwin6_effect_energize_a`
   - Better Blur DX: `better_blur_dx`
4. **Exclusive groups.** Open/close, minimise and desktop-switch effects are mutually exclusive groups. To switch, **write `false` for the default effect explicitly** (for example `squashEnabled=false`, `magiclampEnabled=true`). The local kwinrc already does this. Default-on effects (scale, squash, slide) are only enabled implicitly.
5. **The qdbus binary name varies by distro:**
   - Debian/Kubuntu: `qdbus6`, from package `qdbus-qt6` (verified)
   - Arch and openSUSE: `qdbus6` (unverified)
   - Fedora: `qdbus-qt6` (unverified)

   Prefer `dbus-send --session` or `busctl --user` in generated scripts, or probe `qdbus6 || qdbus-qt6 || qdbus` the way KDE-Rounded-Corners' `tools/load.sh` does (verified).
6. **Extra alt-tab switchers need an extra package.** The stock KWin package only ships `thumbnail_grid` (the default `[TabBox] LayoutName`). `big_icons`, `compact`, `coverswitch`, `flipswitch` and `sidebar`, plus the Desktop Cube effect, come from kdeplasma-addons. That package is named:
   - Debian/Kubuntu: **`kwin-addons`** (not installed by default on this Debian machine; verified)
   - Arch and Fedora: `kdeplasma-addons`
   - openSUSE: `kdeplasma6-addons` (unverified)
7. **`plasma-apply-colorscheme` does nothing if the scheme is already set.** Its help text says it won't apply a scheme that "is already set". Generated palettes need a unique scheme name per variant (for example `RiceBuilder-<hash>`), or the command has to switch to another scheme and back. It also takes `-a/--accent-color <hex|svgname>` (verified on 6.3.6).
8. **Kvantum package names:**
   - Debian 13: `qt-style-kvantum` + `qt-style-kvantum-themes` (`qt6-style-kvantum` is a transitional package; verified locally)
   - Fedora: `kvantum`
   - Arch: `kvantum`
   - openSUSE: `kvantum-manager kvantum-qt6` (Kvantum INSTALL.md)

   Set the theme with `kvantummanager --set <Theme>`, then set `kdeglobals [KDE] widgetStyle=kvantum`.
9. **Global theme `defaults` file format.** `org.kde.breezedark.desktop/contents/defaults` uses `[kdeglobals][KDE] widgetStyle=…`, `[kwinrc][org.kde.kdecoration2] library=…/theme=…`, `[kcminputrc][Mouse] cursorTheme=…` and so on (verified locally). A rice can be shipped as a generated look-and-feel package and applied with `plasma-apply-lookandfeel -a <id>`, with an optional `--resetLayout`.
10. **Only some things are in distro repos.** Debian 13 has Papirus, Bibata, Kvantum, kwin-addons, arc-kde, JetBrains Mono, Inter and kitty. It has no Klassy, Darkly, Tela, Colloid, pywal, matugen, wallust or konsave (all checked with apt-cache). The `darkly` 0.5.42 installed on this machine came from a DeltaCopy .deb, not from Debian. Much of the rest has to come from git `install.sh` scripts, the KDE Store (`kpackagetool6`), the AUR, COPR or OBS.

---

## 1. Reference rices

| # | Rice | Base | What makes it work | KDE? | Screenshot | Source status |
|---|------|------|--------------------|------|-----------|-----|
| 1 | [MrGilfy/umbra](https://github.com/MrGilfy/umbra) | Arch, Plasma 6.7.5 Wayland | Pure monochrome: custom `Umbra.colors` (#000 window, #0c0c0c fields, #242424 buttons, white accent), plain Breeze Plasma style, **Klassy** with no borders and a white outline, Breeze app style (no Kvantum on purpose), YAMIS icons, JetBrains Mono 10. 28 px opaque top bar (launcher, pager, CPU, RAM, spacer, clock, spacer, tray) plus a centred floating fit-width dock of about 44 px. KWin script Quick Tile Gaps. Ghostty. MIT. | yes | [desktop.png](https://github.com/MrGilfy/umbra/raw/main/screenshots/desktop.png) | verified |
| 2 | [anas1412/dotfiles](https://github.com/anas1412/dotfiles) | CachyOS, Plasma 6 Wayland | **Wallpaper-driven** MaterialYouDark (kde-material-you-colors), Dream-Color-Plasma style, Klassy decoration and app style, Vimix-dark icons, Inter 10 + JetBrainsMono NF, **kwin-effects-glass** (blur, rounded corners, refraction), kitty, fish. | yes | [screenshot.png](https://github.com/anas1412/dotfiles/raw/main/screenshot.png) | verified |
| 3 | [Blacksuan19/Dotfiles](https://github.com/Blacksuan19/Dotfiles) | CachyOS, Plasma 6 | "Plasma for tiling-WM users": BreezeDarkTint/LightTint with wallpaper accent, Utterly-Round Plasma style, **Darkly** decoration and app style, Colloid-Dark icons, Layan cursors, Inter + JetBrainsMonoNL NF. **Krohnkite**, Rounded Corners, `kwin4_effect_geometry_change`. Ghostty. Applied with GNU Stow + a **konsave** profile. | yes | [preview.png](https://github.com/Blacksuan19/Dotfiles/raw/master/screens/preview.png) | verified |
| 4 | [Jarex985/kde-dotfiles](https://github.com/Jarex985/kde-dotfiles) | Arch/CachyOS, Plasma 6.6 | "Islands" panels from **Panel Colorizer** presets (Rhyvor Top/Bottom v3), kde-material-you-colors, Klassy (`klassyrc`, `windecopresetsrc`), Papirus, Volantes cursors, JetBrains Mono, Better Blur DX, Kurve visualiser, Modern Clock, Apdatifier, Vinyl Plasma theme. Install script imports a konsave profile. | yes | none in README | verified |
| 5 | [Nadir-Alishly/kde-plasma-rice](https://github.com/Nadir-Alishly/kde-plasma-rice) | Arch, Plasma (X11; version not stated) | Written step-by-step guide. Dynamic colours from kde-material-you-colors, custom "ROUNDED COLOR OPAQUE" Plasma style, Sweet-Dark-transparent Aurorae, Flatery-Black icons. Floating 30 px top panel (launcher left, clock centre, pager and tray right) plus a floating auto-hide 60 px centred icon dock. Hourly slideshow wallpaper. | yes | [rice1.png](https://github.com/Nadir-Alishly/kde-plasma-rice/blob/main/assets/rice1.png), [dock.png](https://github.com/Nadir-Alishly/kde-plasma-rice/blob/main/assets/dock.png) | verified |
| 6 | [Prayag2/kde_onedark](https://github.com/Prayag2/kde_onedark) | Plasma | One Dark global theme with four wallpapers, by the konsave author. | yes | in repo | search-snippet |
| 7 | [catppuccin/kde](https://github.com/catppuccin/kde) | any | Latte, Frappé, Macchiato and Mocha flavours × 14 accents: colour scheme, global theme, Aurorae, splash. Pairs with catppuccin/kvantum, papirus-folders, cursors and konsole. | yes | previews in README | verified (repo) |
| 8 | Reddit "[KDE] Gruvbox Kubuntu" (187 votes, seen on a [mirror listing](https://reddit.sudovanilla.org/r/unixporn)) | Kubuntu | Krohnkite tiling, **Darkly** app style, **Klassy** decoration, Gruvbox Plus icons, Better Blur, Rounded Corners. | yes | n/a | search-snippet; permalink unknown |
| 9 | Reddit Catppuccin Mocha Plasma post ([mirror listing](https://reddit.sudovanilla.org/r/unixporn/hot)) | Plasma | Catppuccin Mocha with `kwin-effects-better-blur-dx` + `kwin-effect-rounded-corners`. | yes | n/a | search-snippet |
| 10 | [r/unixporn "[KDE] My first rice"](https://www.reddit.com/r/unixporn/comments/1fvwbue/kde_my_first_rice/) | Plasma 6 | Layan Kvantum, Arc Plasma style, centred dock. | yes | in post | search-snippet |
| 11 | [r/unixporn "[KDE] I love it"](https://www.reddit.com/r/unixporn/comments/1fyyywo/kde_i_love_it/) | Plasma | Sequoia-style (macOS) global theme, Lightly transparency, BeautyDream icons, Fastfetch. | yes | in post | search-snippet |
| 12 | [r/unixporn "[KDE] I just learned how to customize kde"](https://www.reddit.com/r/unixporn/comments/1k1x2bq/kde_i_just_learned_how_to_customize_kde/) | Plasma | Edna global theme, SF fonts, kitty + Starship. | yes | in post | search-snippet |
| 13 | [r/unixporn "[KDE] My Plasma thinks it's Gnome"](https://www.reddit.com/r/unixporn/comments/1l96act/kde_my_plasma_thinks_its_gnome/) ([dotfiles](https://github.com/yayuuu/my-configs/)) | Plasma | GNOME-style single top bar with a centred clock and Overview as the launcher. A good "GNOME layout" preset. | yes | in post | search-snippet |
| 14 | [r/unixporn "[KDE] Arch Linux" (Gruvbox)](https://www.reddit.com/r/unixporn/comments/tfh7l5/kde_arch_linux/) | Plasma 5 | Gruvbox Plasma theme. Ideas only. | reproducible | in post | search-snippet |
| 15 | [r/unixporn "[Hyprland] first time using actual Arch"](https://www.reddit.com/r/unixporn/comments/1fknhp2/hyprland_first_time_using_actual_arch_instead_of/) | Hyprland | WM-style status bar and gaps. Can be reproduced on Plasma with Panel Colorizer floating widget islands + Krohnkite (or KWin tiling with padding). | reproducible | in post | search-snippet |
| 16 | [aeroshell-desktop/aerothemeplasma](https://github.com/aeroshell-desktop/aerothemeplasma) | Plasma 6 | Windows 7 Aero replica: custom decoration, Plasma style, superbar, start menu and effects. Needs an older release on Debian 13 (6.3). | yes | README | search-snippet |
| 17 | [vinceliuice/WhiteSur-kde](https://github.com/vinceliuice/WhiteSur-kde) | Plasma | macOS Big Sur: global theme, Aurorae, Kvantum, top bar + bottom dock layout. Pairs with WhiteSur icons and cursors. | yes | README | search-snippet |
| 18 | [HimDek/Utterly-Nord-Plasma](https://github.com/HimDek/Utterly-Nord-Plasma) | Plasma 6 ([Plasma 6 store build](https://store.kde.org/p/2151940)) | Glassy translucent Nord: global theme + Kvantum + colour scheme. | yes | store page | search-snippet |
| 19 | [EliverLara/Sweet-kde](https://github.com/EliverLara/Sweet-kde) | Plasma | Neon purple and pink on near-black: Plasma style, Aurorae, Kvantum, colours. Pairs with candy-icons. | yes | README | search-snippet |
| 20 | [EliverLara/Nordic](https://github.com/EliverLara/Nordic/tree/master/kde) | Plasma | Nord: Plasma style, Kvantum, Aurorae, colours. Users report no Plasma 6 global layout. | yes | README | search-snippet |
| 21 | [ComplexPlatform/KDE-dotfiles](https://github.com/ComplexPlatform/KDE-dotfiles) | Plasma 5 | Six themed looks using Latte + Polybar. Layout ideas only (Latte is unmaintained). | ideas | README | search-snippet |
| 22 | [AlexNabokikh/nix-config](https://github.com/AlexNabokikh/nix-config) | NixOS | Fully declarative KDE via plasma-manager. Useful as a reference for what to model. | yes | README | search-snippet |
| 23 | [Plasma-Round write-up (aolabs.dev)](https://aolabs.dev/projects/kde-plasma-6-dotfiles/) | Plasma 6 | Stow + konsave walkthrough. | yes | page | search-snippet |
| 24 | [KDE Discuss "Share your desktop!"](https://discuss.kde.org/t/share-your-desktop/490) | Plasma 6 | Years of Plasma screenshots, many stock or lightly customised. | yes | thread | search-snippet |
| 25 | [EndeavourOS "Share Your Desktop 2026"](https://forum.endeavouros.com/t/share-your-desktop-2026/77330) | Plasma 6 | Klassy + Panel Colorizer setups. | yes | thread | search-snippet |

**Curated lists for more examples:**

- [Arihant101/debian-kde-rice-bible](https://github.com/Arihant101/debian-kde-rice-bible): large Debian-focused index; most links in this report came from it.
- [shvedes/awesome-kde](https://github.com/shvedes/awesome-kde)
- [0PandaDEV/awesome-unixporn](https://github.com/0PandaDEV/awesome-unixporn): only one KDE entry.
- [zemmsoares/awesome-rices](https://github.com/zemmsoares/awesome-rices)
- [fosslife/awesome-ricing](https://github.com/fosslife/awesome-ricing)

**YouTube:** search returned no reliable 2025–2026 Plasma 6 rice videos. One It's FOSS-linked video was found ([watch?v=AbSYbvaOlCA](https://www.youtube.com/watch?v=AbSYbvaOlCA), KDE customisation, unverified), along with a **sponsored** LinuxScoop Plasma 6 page ([tumblr tag](https://www.tumblr.com/linuxscoop/tagged/DesktopSetup)). Treat both with caution. Not enough to rely on.

**Common patterns across rices**, which are good preset axes for the app:

- floating centred dock + thin top bar
- GNOME-style single top bar
- WM-style "islands" built with Panel Colorizer
- Klassy or Darkly instead of Aurorae (native C++, faster)
- a blur effect + Rounded Corners pair
- kde-material-you-colors for wallpaper colours
- JetBrains Mono / Inter fonts
- konsave for snapshotting

---

## 2. GitHub projects useful to the app

Install keys: **deb** = Debian 13, **ubu** = Kubuntu 25.10+, **fed** = Fedora, **arch** = Arch, **suse** = openSUSE Tumbleweed.

### 2a. Colour schemes and global themes

| Project | What | Plasma 6 | Install | Licence |
|---|---|---|---|---|
| [catppuccin/kde](https://github.com/catppuccin/kde) | 4 flavours × accents. `install.sh` takes numeric args for non-interactive use, e.g. `./install.sh 2 4 1` (release notes) | yes (ported to KDE 6 in v0.2.6) | git `install.sh`. arch: AUR `catppuccin-plasma-colorscheme-<flavour>`; AUR comment says the frappe and mocha packages conflict | MIT (unverified) |
| [Jayy-Dev/Plasma-Tokyo-Night](https://github.com/Jayy-Dev/Plasma-Tokyo-Night) ([store](https://store.kde.org/p/2053460)) | Tokyo Night `.colors` | unknown | copy into `~/.local/share/color-schemes` / KDE Store | GPL-3.0 (store) |
| [EliverLara/Nordic](https://github.com/EliverLara/Nordic) / [Nordic-kde](https://github.com/EliverLara/Nordic-kde) | Nord suite | partial (no global layout reported) | git / KDE Store | GPL-3.0 (unverified) |
| [HimDek/Utterly-Nord-Plasma](https://github.com/HimDek/Utterly-Nord-Plasma) | glassy Nord | yes (Plasma 6 store items) | KDE Store / git | GPL (unverified) |
| [Serge2702/KDE-Everforest](https://github.com/Serge2702/KDE-Everforest) | single `Everforest.colors` | unknown (2022) | copy file | unknown |
| [store.kde.org Gruvbox colors](https://store.kde.org/p/1327717) / AUR [kde-gruvbox-git](https://aur.archlinux.org/packages/kde-gruvbox-git) | Gruvbox suite | unknown | KDE Store / AUR | unknown |
| [dracula/gtk (kde folder)](https://github.com/dracula/gtk) | Dracula KDE colours, Aurorae, Kvantum | unknown | git | GPL-3.0 (unverified) |
| Rosé Pine KDE | none found: `github.com/rose-pine/kde` returned 404 | unknown | generate from palette | n/a |
| [vinceliuice/Colloid-kde](https://github.com/vinceliuice/Colloid-kde) | flat, with Nord, Dracula and Gruvbox tweaks | yes (unverified) | `install.sh` | GPL-3.0 |
| [vinceliuice/WhiteSur-kde](https://github.com/vinceliuice/WhiteSur-kde), [Layan-kde](https://github.com/vinceliuice/Layan-kde), [Orchis-kde](https://github.com/vinceliuice/Orchis-kde), [Graphite-kde-theme](https://github.com/vinceliuice/Graphite-kde-theme), [Fluent-kde](https://github.com/vinceliuice/Fluent-kde) | full suites (global, Aurorae, Kvantum, Plasma) | yes (unverified) | `install.sh` | GPL-3.0 |
| [EliverLara/Sweet-kde](https://github.com/EliverLara/Sweet-kde) | neon suite | unknown | git / store | GPL-3.0 (unverified) |
| [pwyde/monochrome-kde](https://github.com/pwyde/monochrome-kde) | black and white | yes (needs Kvantum ≥ 1.1.0) | git | unknown |
| [Roboron3042/Cyberpunk-Neon](https://github.com/Roboron3042/Cyberpunk-Neon) | cyan and pink, with Konsole | unknown | git | unknown |
| arc-kde | Arc | yes | deb/ubu: `arc-kde` (verified on Debian 13) | GPL-3.0 |

> Recommendation: the app should **generate `.colors` files itself** from a palette (format in §3) rather than depend on these repos. Use the repos as palette sources and for Kvantum and Aurorae extras.

### 2b. App style / Kvantum / decorations

| Project | What | Plasma 6 | Install | Licence |
|---|---|---|---|---|
| [tsujan/Kvantum](https://github.com/tsujan/Kvantum) | SVG Qt style engine. `kvantummanager --set THEME`, `--assign THEME app…` | yes (Qt6 default) | deb/ubu: `qt-style-kvantum qt-style-kvantum-themes`; ubu PPA `ppa:papirus/papirus` has `qt6-style-kvantum`; fed: `kvantum`; arch: `kvantum`; suse: `kvantum-manager kvantum-qt6` | GPL-3.0 |
| [catppuccin/kvantum](https://github.com/catppuccin/kvantum) | Catppuccin Kvantum themes | yes | copy into `~/.config/Kvantum/` | MIT (unverified) |
| [GabePoel/KvLibadwaita](https://github.com/GabePoel/KvLibadwaita) | GNOME-look Kvantum | yes (unverified) | git | GPL (unverified) |
| [TheGlitchh/Gruvbox-Kvantum](https://github.com/TheGlitchh/Gruvbox-Kvantum) ([store](https://store.kde.org/p/1976481)) | Gruvbox Kvantum | unknown | git / store | unknown |
| [paulmcauley/klassy](https://github.com/paulmcauley/klassy) | decoration + app style: button shapes, outlines, presets | yes, **current needs ≥ 6.6** | OBS repos for deb/ubu/fed/suse/arch; fed COPR `errornointernet/klassy`; arch AUR `klassy`; source `git checkout plasma6.6 && ./install.sh` | GPL (unverified) |
| [Bali10050/Darkly](https://github.com/Bali10050/Darkly) | translucent Lightly fork (style + decoration). widgetStyle `Darkly` | yes; main ≥ 6.5, v0.5.25 for 6.3/6.4 | fed: COPR `deltacopy/darkly` (pkg `darkly`) or Terra; arch: AUR `darkly` / `darkly-bin`; deb/ubu/suse: build from source (`install.sh`) | GPL (unverified) |
| [kupiqu/SierraBreezeEnhanced](https://github.com/kupiqu/SierraBreezeEnhanced) | macOS traffic-light buttons | unknown | build | GPL |
| [Luwx/Lightly](https://github.com/Luwx/Lightly) | archived; use Darkly | no | n/a | GPL |

### 2c. Icons

| Project | Plasma 6 | Install | Licence |
|---|---|---|---|
| [Papirus](https://github.com/PapirusDevelopmentTeam/papirus-icon-theme) + [papirus-folders](https://github.com/PapirusDevelopmentTeam/papirus-folders) ([Catppuccin variant](https://github.com/catppuccin/papirus-folders)) | yes | `papirus-icon-theme` in deb (20250501, verified), ubu, fed, arch and suse (non-Debian names unverified); papirus-folders via script/AUR | GPL-3.0 |
| [Tela](https://github.com/vinceliuice/Tela-icon-theme) / [Tela-circle](https://github.com/vinceliuice/Tela-circle-icon-theme) | yes | `install.sh -a` (colour variants); arch AUR `tela-icon-theme`; not in Debian 13 | GPL-3.0 |
| [Colloid-icon-theme](https://github.com/vinceliuice/Colloid-icon-theme) | yes | `install.sh -s <scheme> -t <colour>`; AUR | GPL-3.0 |
| [WhiteSur-icon-theme](https://github.com/vinceliuice/WhiteSur-icon-theme) | yes | `install.sh`; AUR | GPL-3.0 |
| [Fluent](https://github.com/vinceliuice/Fluent-icon-theme), [Qogir](https://github.com/vinceliuice/Qogir-icon-theme), [kora](https://github.com/bikass/kora), [candy-icons](https://github.com/EliverLara/candy-icons), [Reversal](https://github.com/yeyushengfan258/Reversal-icon-theme), YAMIS (AUR `yamis-icon-theme-git`) | yes | scripts / AUR | GPL-3.0 mostly |

Apply with `/usr/lib/*/libexec/plasma-changeicons <Theme>`. The path varies by distro (Debian: `/usr/lib/x86_64-linux-gnu/libexec/plasma-changeicons`; unverified). Alternatively write `kwriteconfig6 --file kdeglobals --group Icons --key Theme <Theme>`, which also needs a KIconLoader notify or a re-login.

### 2d. Cursors

| Project | Install | Licence |
|---|---|---|
| [ful1e5/Bibata_Cursor](https://github.com/ful1e5/Bibata_Cursor) | deb: `bibata-cursor-theme` 2.0.6 (verified; ships Original/Modern Ice only); fed: community COPRs, `bibata-cursor-themes` (unverified); arch: AUR `bibata-cursor-theme(-bin)`; suse: unknown | GPL-3.0 |
| [catppuccin/cursors](https://github.com/catppuccin/cursors), [phinger-cursors](https://github.com/phisch/phinger-cursors), [Nordzy](https://github.com/guillaumeboehm/Nordzy-cursors), [volantes](https://github.com/varlesh/volantes-cursors), [apple_cursor](https://github.com/ful1e5/apple_cursor) | release tarballs into `~/.local/share/icons`; AUR | various (GPL/MIT) |

Apply with `plasma-apply-cursortheme <name> [--size N]` (verified on 6.3.6).

### 2e. KWin effects (third-party)

| Project | Effect ID → kwinrc key | Plasma 6 | Install | Licence |
|---|---|---|---|---|
| [matinlotfali/KDE-Rounded-Corners](https://github.com/matinlotfali/KDE-Rounded-Corners) | `kwin4_effect_shapecorners` → `kwin4_effect_shapecornersEnabled`. Config group **`[Round-Corners]` in kwinrc**: `Size`=20, `InactiveCornerRadius`, `UseSquircleShape`, `Squircleness`, `OutlineThickness`=1, `InactiveOutlineThickness`, `OutlineColor`, `ShadowSize`=60, `ShadowColor`, `ActiveShadowAlpha` … (verified from `src/kcm/options.kcfg`) | yes, tested 6.2–6.8; v0.11.0 (Oct 2026) | ubu PPA: `kwin-effect-roundcorners`; deb 13: .deb on [SourceForge](https://sourceforge.net/p/kde-rounded-corners/code) (`kwin4_effect_shapecorners_debian13.deb`); fed: `dnf copr enable matinlotfali/KDE-Rounded-Corners` + `kwin-effect-roundcorners`; arch: AUR `kwin-effect-rounded-corners(-git)`; suse: build (`kwin6-devel`, `kf6-kcmutils-devel`). X11 builds use a `-x11` suffix | GPL-3.0 |
| [xarblu/kwin-effects-better-blur-dx](https://github.com/xarblu/kwin-effects-better-blur-dx) | plugin target `better_blur_dx` → likely `better_blur_dxEnabled` (inferred). Config group `[Effect-better-blur-dx]`: `BlurStrength`=15, `NoiseStrength`=5, `Brightness`, `Saturation`=150, `Contrast`, `CornerRadius`, `WindowClasses`, `BlurMatching`, `BlurNonMatching`, `BlurDecorations`, `BlurMenus`, `BlurDocks`, `Refraction*` (verified from `blur.kcfg`) | 6.5, 6.6, 6.7 | arch: AUR `kwin-effects-better-blur-dx` / `-x11`; fed: COPR `infinality/kwin-effects-better-blur-dx`; Gentoo overlay; deb/ubu/suse: build. **Disable stock `blurEnabled`**; incompatible with Wobbly Windows; rebuild after every KWin update | GPL (metadata) |
| [taj-ny/kwin-effects-forceblur](https://github.com/taj-ny/kwin-effects-forceblur) (Better Blur) | ID not stated | **archived 2025-11-20**; 6.4 only; v1.3.6 for 6.0–6.3.5, so this is the Debian 13 option | arch: AUR `kwin-effects-forceblur`; fed: COPR `hazel-bunny/ricing`; others build | GPL-3.0 |
| [4v3ngR/kwin-effects-glass](https://github.com/4v3ngR/kwin-effects-glass) | unknown | 6.6+ (per rice bible) | build | unknown |
| [Schneegans/Burn-My-Windows](https://github.com/Schneegans/Burn-My-Windows) | `kwin6_effect_<nick with _>` → e.g. `kwin6_effect_energize_aEnabled`. Nicks: aura-glow, doom, energize-a, energize-b, fire, focus, glide, glitch, hexagon, incinerate, pixel-wheel, pixel-wipe, pixelate, portal, rgbwarp, team-rocket, tv, tv-glitch, wisps. Category "Window Open/Close Animation", exclusive `toplevel-open-close-animation` (verified from `kwin/build.sh` + `metadata.json.in`) | yes | GitHub release `burn_my_windows_kwin6.tar.gz`, extracted to `~/.local/share/kwin/effects/`, or KDE Store per effect | GPL-3.0 |
| [peterfajdiga/kwin4_effect_geometry_change](https://github.com/peterfajdiga/kwin4_effect_geometry_change) | `kwin4_effect_geometry_change` → `kwin4_effect_geometry_changeEnabled` (verified metadata) | yes in practice (used in Plasma 6 rices); README silent | release tarball into `~/.local/share/kwin/effects/` or `make install`; KDE Store | GPL-3.0 |
| [zzag/kwin-effects-cube](https://github.com/zzag/kwin-effects-cube) | superseded: the Cube is back in kdeplasma-addons (`kwin/effects/cube`) since 6.1 | n/a | use the distro package (see §0.6) | GPL |
| [thegeekywanderer/kwin-effects-blur-respect-rounded-decorations](https://github.com/thegeekywanderer/kwin-effects-blur-respect-rounded-decorations) | unknown | unknown | build | unknown |
| [lightlyshaders-plasma6-git (AUR)](https://aur.archlinux.org/packages/lightlyshaders-plasma6-git) | rounded corners alternative | yes (AUR) | AUR | GPL |

### 2f. Alt-tab switchers and KWin scripts

- Built-in layouts: `thumbnail_grid` (kwin; default) and `big_icons`, `compact`, `coverswitch`, `flipswitch`, `sidebar` (kdeplasma-addons; verified from repo). Plasma 5's `informative`, `text`, `thumbnails` and `org.kde.breeze.desktop` switchers are **gone**: the Debian 6.3 Breeze L&F has no `windowswitcher` directory (verified).
- Third-party switchers install with `kpackagetool6 --type KWin/WindowSwitcher -i <dir>` into `~/.local/share/kwin/tabbox/` (path from KWin packaging convention; unverified on 6.8). The KDE Store category "KWin Switching Layouts" has more.
- Tiling scripts: [Krohnkite (anametologin fork)](https://github.com/anametologin/krohnkite), [Polonium](https://github.com/zeroxoneafour/polonium) (6.4+), [Karousel](https://github.com/peterfajdiga/karousel), [KZones](https://github.com/gerritdevriese/kzones). Note from this machine: Krohnkite keeps acting until KWin restarts after removal.

### 2g. Panel / dock widgets

| Project | Plasma 6 | Install | Notes |
|---|---|---|---|
| [luisbocanegra/plasma-panel-colorizer](https://github.com/luisbocanegra/plasma-panel-colorizer) | yes (Plasma 5 dropped) | KDE Store ([2130967](https://store.kde.org/p/2130967)); arch AUR `plasma6-applets-panel-colorizer`; fed COPR `peridot-augustus/plasma-panel-colorizer` (adds blur); suse OBS `home:Herbster0815/plasma6-applet-panel-colorizer`; git `install.sh` | Islands, per-widget colours, presets, rules for maximised/fullscreen. Has a C++ plugin that must be rebuilt after Plasma updates. 6.3.4 regression ([bug 502480](https://bugs.kde.org/show_bug.cgi?id=502480)); 6.4 floating applets issue. GPL-3.0 |
| [antroids/application-title-bar](https://github.com/antroids/application-title-bar) | yes | KDE Store | global-menu-style title + buttons |
| [luisbocanegra/kurve](https://github.com/luisbocanegra/kurve) | yes | KDE Store | cava visualiser |
| [orblazer/plasma-applet-resources-monitor](https://github.com/orblazer/plasma-applet-resources-monitor) | yes | KDE Store | graphs |
| [luisbocanegra/plasma-panel-spacer-extended](https://github.com/luisbocanegra/plasma-panel-spacer-extended) | yes | KDE Store | |
| [Zren/plasma-applet-commandoutput](https://github.com/Zren/plasma-applet-commandoutput), [Zren/plasma-applet-tiledmenu](https://github.com/Zren/plasma-applet-tiledmenu) | yes (unverified) | KDE Store | |
| [dhruv8sh/kara](https://github.com/dhruv8sh/kara), [moodyhunter/applet-window-buttons6](https://github.com/moodyhunter/applet-window-buttons6), [dhruv8sh/plasma6-window-title-applet](https://github.com/dhruv8sh/plasma6-window-title-applet) | yes | KDE Store / build | |
| [luisbocanegra/plasma-smart-video-wallpaper-reborn](https://github.com/luisbocanegra/plasma-smart-video-wallpaper-reborn), [luisbocanegra/plasma-wallpaper-effects](https://github.com/luisbocanegra/plasma-wallpaper-effects), [y4my4my4m/kde-shader-wallpaper](https://github.com/y4my4my4m/kde-shader-wallpaper) | yes | KDE Store | wallpaper plugins |

Widgets install with `kpackagetool6 --type Plasma/Applet --install <dir|.plasmoid>`, or `-u` to upgrade. The KDE Store can't be scripted reliably without the user downloading the files, so the app should generate a "download from store" instruction or a git-clone + kpackagetool6 step.

### 2h. Wallpaper palette generators

| Project | What | Plasma 6 | Install | Licence |
|---|---|---|---|---|
| [luisbocanegra/kde-material-you-colors](https://github.com/luisbocanegra/kde-material-you-colors) | Material You from wallpaper. Writes 2 Plasma schemes (MaterialYouDark/Light), Konsole scheme with opacity, pywal, icon-theme switching, titlebar tinting (Klassy/SierraBreeze). CLI: `-c` config, `-a` autostart, `-cl` desktop entries; config `~/.config/kde-material-you-colors/config.conf` | yes (Plasma 5 frozen at 1.7.1) | arch: AUR `kde-material-you-colors`; fed/suse: OBS; others: `pipx install kde-material-you-colors && pipx inject kde-material-you-colors pywal16`; widget [KDE Store 2136963](https://store.kde.org/p/2136963). Build deps: gcc, python dbus dev, libglib2.0-dev | GPL-3.0 |
| [InioX/matugen](https://github.com/InioX/matugen) | Rust Material You + base16 generator with a template engine (`~/.config/matugen/config.toml`, `{{colors.primary.default.hex}}`) | n/a (generic) | arch: AUR (`matugen-bin`, unverified); cargo `cargo install matugen`; not in Debian 13 | GPL-2.0 (unverified) |
| [eylles/pywal16](https://github.com/eylles/pywal16) | maintained pywal fork, 16-colour palettes + templates | n/a | `pipx install pywal16`; arch AUR `python-pywal16` (unverified); not in Debian 13 | MIT |
| wallust ([codeberg explosion-mental/wallust](https://codeberg.org/explosion-mental/wallust), unverified URL) | Rust pywal successor with templates | n/a | cargo / AUR `wallust` (unverified) | MIT (unverified) |

> For a static web app: palette extraction can run **in the browser** (k-means / median-cut on a canvas, or Google's `material-color-utilities` JS port), and the result is emitted as a `.colors` file plus Konsole/kitty themes. No runtime dependency is needed on the user's machine. kde-material-you-colors is the "live, follows wallpaper" option to offer as an add-on.

### 2i. Rice managers / dotfile tools to learn from

| Project | Notes |
|---|---|
| [Prayag2/konsave](https://github.com/Prayag2/konsave) | `konsave -s name`, `-a name`, `-e/-i` `.knsv`. Its file list [conf_kde.yaml](https://github.com/Prayag2/konsave/blob/master/konsave/conf_kde.yaml) is a good reference for **which files make up a rice**. Release notes claim Plasma 6 support; an [issue](https://www.github.com/Prayag2/konsave/issues/106) says the default list misses some Plasma 6 files. pip only (not in Debian). GPL-3.0 |
| [nix-community/plasma-manager](https://github.com/nix-community/plasma-manager) | declarative Plasma config (Nix). Its modules map options to kwinrc, kdeglobals and appletsrc keys and include panel scripting. The best reverse-engineering reference for key names |
| [maldoinc/plasma-theme-switcher](https://github.com/maldoinc/plasma-theme-switcher) | small CLI for colour scheme / widget style switching |
| [edmogeor/gloam](https://github.com/edmogeor/gloam) | light/dark switching tool (search result; unverified) |
| Koi (search result) | scheduled light/dark switcher. Plasma 6.5+ has built-in day/night **global theme** switching ([KDE blog](https://blogs.kde.org/2025/08/02/this-week-in-plasma-day/night-theme-switching/)) |
| [Cooper-Wallace/riced-kubuntu-os](https://github.com/Cooper-Wallace/riced-kubuntu-os) | Kubuntu packages + Plasma backup/restore scripts |

---

## 3. Techniques: applying a rice from the command line (Plasma 6)

### Tools (all present on Debian 13 / Plasma 6.3.6; verified)

| Tool | Package (Debian) | Use |
|---|---|---|
| `plasma-apply-colorscheme [-a ACCENT] <Name>` / `--list-schemes` | plasma-workspace | Applies a `.colors` file from `~/.local/share/color-schemes/` or `/usr/share/color-schemes/`. A full path is accepted, but only the basename is used. **No-op if already set.** Triggers KWin's blend animation |
| `plasma-apply-cursortheme <name> [--size N]` | plasma-workspace | |
| `plasma-apply-desktoptheme <name>` | plasma-workspace | Plasma style (panel SVGs) |
| `plasma-apply-wallpaperimage [-f fillmode] <file>` | plasma-workspace | Sets every desktop's image. Doesn't respect "switch dynamic wallpapers" ([bug 511377](https://bugs.kde.org/show_bug.cgi?id=511377)) |
| `plasma-apply-lookandfeel -a <pkg> [--resetLayout]` / `-l` | plasma-workspace | Global theme (also `lookandfeeltool`) |
| `kwriteconfig6 --file F --group G [--group sub] --key K V` / `kreadconfig6` | libkf6config-bin | Nested groups need repeated `--group`. `--delete` removes a key |
| `kpackagetool6 -t <Type> -i/-u/-r` | kpackagetool6 | Types: `Plasma/Applet`, `Plasma/Theme`, `Plasma/LookAndFeel`, `Plasma/Wallpaper`, `KWin/Effect`, `KWin/Script`, `KWin/WindowSwitcher`, `KWin/Decoration` (Aurorae) (from KPackage conventions; unverified per type) |
| `qdbus6` | qdbus-qt6 | see §0.5 |
| `plasma-interactiveconsole` | plasma-workspace | debugging desktop scripts |

### Config keys the generator will write

- **Colours:** `kdeglobals [General] ColorScheme`, `AccentColor`. Let `plasma-apply-colorscheme` handle the actual palette copy into kdeglobals.
- **Widget style:** `kdeglobals [KDE] widgetStyle` = `Breeze` | `kvantum` | `Darkly` | `Fusion` (Klassy's name is unverified).
- **Icons:** `kdeglobals [Icons] Theme`.
- **Fonts:** `kdeglobals [General] font`, `fixed`, `smallestReadableFont`, `toolBarFont`, `menuFont`, plus `[WM] activeFont`. QFont strings like `JetBrains Mono,10,-1,5,400,0,0,0,0,0,0,0,0,0,0,1` (unverified format for Qt 6.8).
- **Decoration:** `kwinrc [org.kde.kdecoration2] library=org.kde.breeze theme=Breeze` (verified in the breezedark defaults). Aurorae themes use `library=org.kde.kwin.aurorae theme=__aurorae__svg__<Name>` (unverified). Also `BorderSize`, `ButtonsOnLeft`, `ButtonsOnRight`.
- **Animation speed:** `kdeglobals [KDE] AnimationDurationFactor` (float; 0 = instant, 1 = default, larger = slower). A stray copy in `kwinrc [KDE]` can override the slider ([bug 431259](https://bugs.kde.org/show_bug.cgi?id=431259)). Generators should delete it there.
- **Effects:** `kwinrc [Plugins] <id>Enabled=true|false`. Per-effect settings go in `kwinrc [Effect-<id>]` (see §4).
- **Alt-tab:** `kwinrc [TabBox] LayoutName=<layout>`. Defaults in [tabboxconfig.h](https://raw.githubusercontent.com/KDE/kwin/master/src/tabbox/tabboxconfig.h): `thumbnail_grid`, `HighlightWindows=true`, `ShowTabBox=true`. `[TabBoxAlternative]` holds the Alt+Shift+` switcher.
- **Virtual desktops:** `kwinrc [Desktops] Number=`, `Rows=`, `Id_N`, `Name_N`.
- **Tiling gaps:** `kwinrc [Tiling] padding=` (seen locally).
- **Kvantum:** `~/.config/Kvantum/kvantum.kvconfig [General] theme=<Name>`, or `kvantummanager --set`.
- **Konsole:** profile in `~/.local/share/konsole/*.profile` (`[Appearance] ColorScheme=`). Schemes are `*.colorscheme`. Default profile: `konsolerc [Desktop Entry] DefaultProfile=`.
- **GTK apps:** `kde-gtk-config` syncs automatically when the colour scheme changes (`breeze-gtk-theme` + `kde-config-gtk-style`).

### Reloading

- **KWin:** `dbus-send --session --type=method_call --dest=org.kde.KWin /KWin org.kde.KWin.reconfigure`, or `qdbus6 org.kde.KWin /KWin reconfigure`. Reconfigure can freeze the desktop on some setups ([bug 439766](https://bugs.kde.org/show_bug.cgi?id=439766)).
- **Effects without reconfigure:** `org.kde.kwin.Effects.loadEffect <id>`, `unloadEffect`, `toggleEffect`, `isEffectLoaded` on `/Effects` ([discuss thread](https://discuss.kde.org/t/proper-way-to-reload-a-kwin-effect/46880)). Updated C++ effect binaries need a re-login.
- **KWin scripts:** `/Scripting` `loadScript` + `start`, or `kwriteconfig6 [Plugins] <script>Enabled` + reconfigure. Unload/start is more reliable than reconfigure.
- **Global shortcuts:** these go through kglobalaccel, which in Plasma 6 runs **inside KWin**. Use D-Bus `org.kde.kglobalaccel /kglobalaccel setForeignShortcutKeys` with **four ints per key sequence**; fewer makes KWin abort (seen on this machine). Editing `kglobalshortcutsrc` directly needs a re-login ([discuss](https://discuss.kde.org/t/plasma-6-method-to-refresh-kglobalaccel-shortcuts/17995/7)).

### Plasma desktop scripting (panels, docks, wallpapers)

Run with `qdbus6 org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript "$(cat layout.js)"` ([docs](https://develop.kde.org/docs/plasma/scripting/), [API](https://develop.kde.org/docs/plasma/scripting/api/)). The API is verified from the docs:

- **Globals:** `panels()`, `desktops()`, `desktopsForActivity(id)`, `new Panel`, `panelById()`, `applicationExists(name)`, `knownWallpaperPlugins()`, `sleep(ms)`.
- **Panel:** `location` (`top`, `bottom`, `left`, `right`, `floating`), `height`, `hiding` (`none`, `autohide`, `dodgewindows`, `windowsgobelow`), `alignment` (`left`, `center`, `right`), `offset`, `lengthMode` (`fill`, `fit`, `custom`; 6.0+), `length`, `minimumLength`/`maximumLength` (scripting v7).
- **The "floating" toggle** (the Plasma 6 floating-panel look) is stored as `floating=1` in the panel's config (unverified; check plasma-manager).
- **Containments:** `addWidget(pluginId[, x, y, w, h])`, `widgets([type])`, `currentConfigGroup = ["General"]`, `writeConfig(k, v)`, `reloadConfig()`.
- **Desktop:** `wallpaperPlugin = "org.kde.image" | "org.kde.slideshow" | …`, then `currentConfigGroup = ["Wallpaper", plugin, "General"]` + `writeConfig("Image", "file:///…")`.
- **Slideshow:** `SlidePaths`, `SlideInterval` (seconds). These are stored under `[Containments][N][Wallpaper][org.kde.slideshow][General]` in `plasma-org.kde.plasma.desktop-appletsrc`. Interval 0 = manual only (June 2026 commit).
- **Caveats:**
  - `reloadConfig()` doesn't repaint the wallpaper on 6.x Wayland ([bug 506862](https://bugs.kde.org/show_bug.cgi?id=506862)).
  - A running plasmashell overwrites a scripted `AppletOrder`, so edit appletsrc with plasmashell stopped (`systemctl --user stop plasma-plasmashell`) (seen on this machine).
  - Global themes can wipe layouts ([r/kde warning](https://www.reddit.com/r/kde/comments/1bixmbx/do_not_install_global_themes_some_wipe_out_all/)).
  - Always back up `plasma-org.kde.plasma.desktop-appletsrc`, `plasmashellrc`, `kwinrc` and `kdeglobals` first.

### Wallpaper + colour scheme cycling

There's no built-in coupled cycling. Options:

1. A systemd user timer (`~/.config/systemd/user/rice-cycle.{service,timer}`) running a generated script. The script picks the next wallpaper and calls `plasma-apply-wallpaperimage` + `plasma-apply-colorscheme <precomputed scheme for that wallpaper>`. Alternate between two scheme names to dodge the "already set" no-op.
2. The slideshow plugin + kde-material-you-colors running as a daemon, which watches the wallpaper and regenerates the scheme.
3. Plasma 6.5+ day/night global theme switching, for a 2-state cycle (unavailable on Debian 13).

### `.colors` file format (verified from `/usr/share/color-schemes/BreezeDark.colors`)

Sections:

- `[ColorEffects:Disabled]`, `[ColorEffects:Inactive]`: `Color`, `ColorAmount`, `ColorEffect`, `ContrastAmount`, `ContrastEffect`, `IntensityAmount`, `IntensityEffect`, plus `Enable` and `ChangeSelectionColor` for Inactive.
- `[Colors:Button]`, `[Colors:Complementary]`, `[Colors:Header]`, `[Colors:Header][Inactive]`, `[Colors:Selection]`, `[Colors:Tooltip]`, `[Colors:View]`, `[Colors:Window]`. Each has `BackgroundNormal`, `BackgroundAlternate`, `ForegroundNormal`, `ForegroundInactive`, `ForegroundActive`, `ForegroundLink`, `ForegroundVisited`, `ForegroundNegative`, `ForegroundNeutral`, `ForegroundPositive`, `DecorationFocus`, `DecorationHover`. Values are `R,G,B` decimals.
- `[General]`: `ColorScheme`, `Name`, `shadeSortColumn`.
- `[KDE]`: `contrast`.
- `[WM]`: `activeBackground`, `activeBlend`, `activeForeground`, `inactiveBackground`, `inactiveBlend`, `inactiveForeground`.

### Distro / version differences

| Item | Debian 13 | Kubuntu 25.10 | Fedora | Arch | Tumbleweed |
|---|---|---|---|---|---|
| Plasma | 6.3.6 | 6.4.5 (backports PPA newer) | 6.6–6.8? (unverified) | latest (6.8) | latest (openQA-tested) |
| qdbus | `qdbus6` (pkg `qdbus-qt6`) | `qdbus6` | `qdbus-qt6` (unverified) | `qdbus6` (unverified) | `qdbus6` (unverified) |
| extra switchers / cube | `kwin-addons` | `kwin-addons` | `kdeplasma-addons` | `kdeplasma-addons` | `kdeplasma6-addons` (unverified) |
| Kvantum | `qt-style-kvantum` (+ `-themes`) | same / PPA `qt6-style-kvantum` | `kvantum` | `kvantum` | `kvantum-manager kvantum-qt6` |
| kwin-x11 split | not yet (6.3) | yes | yes | yes (Wayland only unless `kwin-x11` added) | yes |
| Day/night global theme | no | no | 6.5+ | yes | yes |
| Klassy (current) | **no** (needs 6.6) | no | yes | yes | yes |
| Darkly | v0.5.25 / Darkly-6.4 branch | v0.5.25 | main | main | main |
| Better Blur | forceblur v1.3.6 | forceblur 6.4 build | BBDX | BBDX | BBDX |
| Burn My Windows, Geometry Change (JS effects) | yes | yes | yes | yes | yes |

JS/QML effects (Burn My Windows, Geometry Change) are version-portable. C++ effects (Rounded Corners, Better Blur, Klassy, Darkly, Panel Colorizer's plugin) break on every KWin/Plasma minor update and need rebuilding.

---

## 4. Animation options and kwinrc keys

The ID is the plugin ID, and `kwinrc [Plugins] <ID>Enabled`. A ✔ default means EnabledByDefault. IDs and groups were verified from KWin master `src/plugins` and the Debian 6.3.6 metadata in `/usr/share/kwin/{effects,builtin-effects}`, unless marked otherwise.

### Window open/close (exclusive group `toplevel-open-close-animation`; pick one)

| Effect | ID | Default | Config group / keys |
|---|---|---|---|
| Scale | `scale` | ✔ | (JS) |
| Glide | `glide` | | `[Effect-glide]` `Duration`, `InRotationEdge`, `InRotationAngle`=3, `InDistance`=30, `InOpacity`=0.4, `OutRotationEdge`, `OutRotationAngle`, `OutDistance`, `OutOpacity` |
| Fade | `fade` | | (JS) |
| Burn My Windows (19 effects) | `kwin6_effect_<nick>` | | third-party |
| Fall Apart (close only; not in the exclusive group) | `fallapart` | | |
| Sheet (dialogs) | `sheet` | | |

### Minimise (exclusive group `minimize`)

| Effect | ID | Default | Config |
|---|---|---|---|
| Squash | `squash` | ✔ | |
| Magic Lamp | `magiclamp` | | `[Effect-magiclamp] AnimationDuration` (0 = default) |

### Virtual desktop switching (exclusive group `desktop-animations`)

| Effect | ID | Default | Config |
|---|---|---|---|
| Slide | `slide` | ✔ | `[Effect-slide] HorizontalGap`=45, `VerticalGap`=20, `SlideBackground`=true |
| Fade Desktop | `fadedesktop` | | |
| Desktop Cube | `cube` (kdeplasma-addons) | | Toggle/overview effect with its own shortcut, not a switch animation (unverified) |

### Show desktop (exclusive group `show-desktop`)

`windowaperture` (✔ default) and `eyeonscreen`.

### Alt-tab and overview

- TabBox layouts in `[TabBox] LayoutName`: `thumbnail_grid` (default), `big_icons`, `compact`, `coverswitch`, `flipswitch`, `sidebar`. The last five need kdeplasma-addons / kwin-addons.
- Overview / grid / desktop-grid: `overview` (✔).
- Present windows: `windowview` (✔).
- `highlightwindow` dims the other windows during alt-tab (enabled by default; `[TabBox] HighlightWindows`).

### Other animation and appearance effects

| Effect | ID | Default | Config |
|---|---|---|---|
| Wobbly Windows | `wobblywindows` | | `[Effect-wobblywindows]` `WobblynessLevel`, `Settings`(Auto), `MoveWobble`, `ResizeWobble`, `AdvancedMode`, `Stiffness`=15, `Drag`=80, `MoveFactor`, `XTesselation`, `YTesselation` (note the spelling), velocity/acceleration keys |
| Maximise | `maximize` | ✔ | |
| Sliding popups | `slidingpopups` | ✔ | |
| Fading popups | `fadingpopups` | ✔ | |
| Blur | `blur` | ✔ | `[Effect-blur] BlurStrength`=15, `NoiseStrength`=5, `Saturation`=150 (Saturation is on master; may be absent on 6.3) |
| Background contrast | `contrast` | ✔ | |
| Translucency | `translucency` | | |
| Dim inactive | `diminactive` | | |
| Dim screen for admin | `dimscreen` | ✔ | |
| Login / logout | `login`, `logout` | ✔ | |
| Shake cursor | `shakecursor` | 6.1+ | |
| Geometry change (third-party) | `kwin4_effect_geometry_change` | | |
| Rounded corners (third-party) | `kwin4_effect_shapecorners` | | `[Round-Corners]` |
| Better Blur DX (third-party) | `better_blur_dx` (inferred) | | `[Effect-better-blur-dx]` |
| Slide back | `slideback` | | |
| Startup feedback | `startupfeedback` | | |

**Global speed:** `kdeglobals [KDE] AnimationDurationFactor`.

**Example: switch open/close to Glide and minimise to Magic Lamp:**

```sh
kwriteconfig6 --file kwinrc --group Plugins --key scaleEnabled false
kwriteconfig6 --file kwinrc --group Plugins --key glideEnabled true
kwriteconfig6 --file kwinrc --group Plugins --key squashEnabled false
kwriteconfig6 --file kwinrc --group Plugins --key magiclampEnabled true
dbus-send --session --type=method_call --dest=org.kde.KWin /KWin org.kde.KWin.reconfigure
```

---

## 5. Not verified / gaps

- None of the Reddit posts were readable: no screenshots, OP comments or exact component lists beyond search snippets.
- No good Plasma 6 YouTube rice references were found.
- Package names marked (unverified): Fedora/Arch/openSUSE qdbus binaries, openSUSE `kdeplasma6-addons`, Fedora Bibata, matugen/pywal16/wallust AUR names, Papirus on non-Debian distros (believed to be `papirus-icon-theme` everywhere).
- Better Blur DX's `[Plugins]` key: target `better_blur_dx` is confirmed, `better_blur_dxEnabled` is inferred.
- Klassy and Darkly decoration `library=` values and Klassy's widgetStyle name weren't found. Read them from the user's kwinrc after installing, or from the source `metadata.json`.
- Panel `floating` scripting property, the Aurorae `theme=__aurorae__svg__<Name>` pattern, the QFont string format and `plasma-changeicons` path: all from memory.
- The Plasma 6.5+ day/night switching config keys weren't found.
- Licences marked (unverified) weren't read from LICENSE files.
- Rosé Pine KDE: no repo found.
