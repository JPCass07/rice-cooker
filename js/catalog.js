/* Rice Cooker — distros, desktops and the feature catalog.
 *
 * Package names were checked against each distro's repositories on 2026-11-23
 * (Docker images debian:trixie, ubuntu:26.04, fedora:43, archlinux, opensuse/tumbleweed
 * and the AUR RPC). To add a distro: add it to DISTROS and give every feature in
 * FEATURES a value for it. To add a desktop: add it to DESKTOPS and a generator
 * in generate.js (see README "Adding a desktop").
 */
(function (RB) {
  'use strict';

  const DISTROS = {
    debian: {
      name: 'Debian 13', long: 'Debian 13 "trixie"', plasma: '6.3', family: 'apt',
      install: (p) => `sudo apt update && sudo apt install -y ${p.join(' ')}`,
      has: 'dpkg -s', installMissing: 'sudo apt update && sudo apt install -y',
      osIds: ['debian'],
    },
    ubuntu: {
      name: 'Kubuntu 26.04', long: 'Kubuntu 26.04 LTS', plasma: '6.6', family: 'apt',
      install: (p) => `sudo apt update && sudo apt install -y ${p.join(' ')}`,
      has: 'dpkg -s', installMissing: 'sudo apt update && sudo apt install -y',
      osIds: ['ubuntu', 'kubuntu', 'neon'],
    },
    fedora: {
      name: 'Fedora 43', long: 'Fedora KDE Plasma 43', plasma: '6.7', family: 'dnf',
      install: (p) => `sudo dnf install -y ${p.join(' ')}`,
      has: 'rpm -q', installMissing: 'sudo dnf install -y',
      osIds: ['fedora'],
    },
    arch: {
      name: 'Arch', long: 'Arch Linux (also EndeavourOS, CachyOS)', plasma: '6.8', family: 'pacman',
      install: (p) => `sudo pacman -S --needed --noconfirm ${p.join(' ')}`,
      has: 'pacman -Q', installMissing: 'sudo pacman -S --needed --noconfirm',
      osIds: ['arch', 'endeavouros', 'cachyos', 'manjaro'],
    },
    opensuse: {
      name: 'openSUSE TW', long: 'openSUSE Tumbleweed', plasma: '6.8', family: 'zypper',
      install: (p) => `sudo zypper --non-interactive install ${p.join(' ')}`,
      has: 'rpm -q', installMissing: 'sudo zypper --non-interactive install',
      osIds: ['opensuse-tumbleweed', 'opensuse'],
    },
  };

  const DESKTOPS = {
    kde: { name: 'KDE Plasma 6', ready: true },
    gnome: { name: 'GNOME', ready: false },
    hyprland: { name: 'Hyprland', ready: false },
  };

  /* How a feature is obtained on a distro:
   *   'pkg-name' or ['a','b']  → official repo packages
   *   { aur: 'name' }          → AUR (needs paru or yay)
   *   { manual: true }         → generic download/install that works on any distro
   *   { build: 'deps…' }       → build from source with these build deps
   *   null                     → can't be used on this distro (reason in `why`)
   * `builtin: true` means nothing to install.  `minPlasma` gates by Plasma version.
   */
  const FEATURES = {
    switchers: {
      label: 'Extra Alt+Tab layouts (Cover Switch, Flip Switch, Big Icons, Compact, Sidebar)',
      pkgs: { debian: 'kwin-addons', ubuntu: 'kwin-addons', fedora: 'kdeplasma-addons', arch: 'kdeplasma-addons', opensuse: 'kdeplasma6-addons' },
    },
    cube: {
      label: 'Desktop Cube effect',
      pkgs: { debian: 'kwin-addons', ubuntu: 'kwin-addons', fedora: 'kdeplasma-addons', arch: 'kdeplasma-addons', opensuse: 'kdeplasma6-addons' },
    },
    papirus: {
      label: 'Papirus icons',
      pkgs: { debian: 'papirus-icon-theme', ubuntu: 'papirus-icon-theme', fedora: 'papirus-icon-theme', arch: 'papirus-icon-theme', opensuse: 'papirus-icon-theme' },
    },
    papirusFolders: {
      label: 'Papirus folder colour matched to accent (papirus-folders)',
      pkgs: { debian: { manual: true }, ubuntu: { manual: true }, fedora: { manual: true }, arch: { manual: true }, opensuse: { manual: true } },
    },
    tela: {
      label: 'Tela icons (from GitHub)',
      pkgs: { debian: { manual: true }, ubuntu: { manual: true }, fedora: { manual: true }, arch: { aur: 'tela-icon-theme-git', manual: true }, opensuse: { manual: true } },
    },
    bibata: {
      label: 'Bibata cursors',
      pkgs: { debian: 'bibata-cursor-theme', ubuntu: 'bibata-cursor-theme', fedora: { manual: true }, arch: { aur: 'bibata-cursor-theme-bin', manual: true }, opensuse: { manual: true } },
    },
    kvantum: {
      label: 'Kvantum widget style',
      pkgs: { debian: ['qt6-style-kvantum', 'qt-style-kvantum-themes'], ubuntu: ['qt6-style-kvantum', 'qt-style-kvantum-themes'], fedora: 'kvantum', arch: 'kvantum', opensuse: ['kvantum-qt6', 'kvantum-manager'] },
    },
    fontJetbrains: {
      label: 'JetBrains Mono font',
      pkgs: { debian: 'fonts-jetbrains-mono', ubuntu: 'fonts-jetbrains-mono', fedora: 'jetbrains-mono-fonts-all', arch: 'ttf-jetbrains-mono', opensuse: 'jetbrains-mono-fonts' },
    },
    fontNerd: {
      label: 'JetBrainsMono Nerd Font (icons in terminals and bars)',
      pkgs: { debian: { manual: true }, ubuntu: { manual: true }, fedora: { manual: true }, arch: 'ttf-jetbrains-mono-nerd', opensuse: { manual: true } },
    },
    fontInter: {
      label: 'Inter font',
      pkgs: { debian: 'fonts-inter', ubuntu: 'fonts-inter', fedora: 'rsms-inter-fonts', arch: 'inter-font', opensuse: 'inter-fonts' },
    },
    fontFira: {
      label: 'Fira Code font',
      pkgs: { debian: 'fonts-firacode', ubuntu: 'fonts-firacode', fedora: 'fira-code-fonts', arch: 'ttf-fira-code', opensuse: 'fira-code-fonts' },
    },
    kitty: {
      label: 'kitty terminal',
      pkgs: { debian: 'kitty', ubuntu: 'kitty', fedora: 'kitty', arch: 'kitty', opensuse: 'kitty' },
    },
    termExtras: {
      label: 'Terminal extras (fastfetch, btop, cava)',
      pkgs: { debian: ['fastfetch', 'btop', 'cava'], ubuntu: ['fastfetch', 'btop', 'cava'], fedora: ['fastfetch', 'btop', 'cava'], arch: ['fastfetch', 'btop', 'cava'], opensuse: ['fastfetch', 'btop', 'cava'] },
    },
    roundedCorners: {
      label: 'Rounded corners + outline on every window (KDE-Rounded-Corners)',
      pkgs: {
        debian: { build: 'git cmake g++ extra-cmake-modules kwin-dev qt6-base-private-dev qt6-base-dev-tools libkf6kcmutils-dev' },
        ubuntu: { build: 'git cmake g++ extra-cmake-modules kwin-dev qt6-base-private-dev qt6-base-dev-tools libkf6kcmutils-dev' },
        fedora: { build: 'git cmake gcc-c++ extra-cmake-modules kwin-devel kf6-kconfigwidgets-devel libepoxy-devel kf6-kcmutils-devel kf6-ki18n-devel qt6-qtbase-private-devel wayland-devel libdrm-devel' },
        arch: { aur: 'kwin-effect-rounded-corners-git' },
        opensuse: { build: 'git cmake gcc-c++ kf6-extra-cmake-modules kwin6-devel kf6-kconfigwidgets-devel libepoxy-devel kf6-kcmutils-devel kf6-ki18n-devel qt6-base-private-devel wayland-devel libdrm-devel' },
      },
      note: 'Compiled against your exact KWin version: rerun this step after every Plasma update. On Plasma 6.4+ X11 sessions it needs the separate X11 build.',
    },
    betterBlur: {
      label: 'Better Blur DX (blur behind any window, rounded blur)',
      pkgs: { debian: null, ubuntu: null, fedora: null, arch: { aur: 'kwin-effects-better-blur-dx' }, opensuse: null },
      why: 'only packaged in the AUR; other distros must build it by hand from its GitHub page',
    },
    panelColorizer: {
      label: 'Panel Colorizer widget (per-widget panel colours, islands)',
      pkgs: { debian: { manual: true }, ubuntu: { manual: true }, fedora: { manual: true }, arch: { aur: 'plasma6-applets-panel-colorizer', manual: true }, opensuse: { manual: true } },
    },
    shakeCursor: { label: 'Shake cursor to find it', builtin: true, minPlasma: '6.2' },
    bigClock: { label: 'Big clock on the desktop', builtin: true },
    cookerLogin: {
      label: 'Rice Cooker login theme (SDDM, Qt 6)',
      pkgs: { debian: ['qml6-module-qtquick-effects', 'qml6-module-qtquick-controls'], ubuntu: ['qml6-module-qtquick-effects', 'qml6-module-qtquick-controls'], fedora: 'qt6-qtdeclarative', arch: 'qt6-declarative', opensuse: 'qt6-declarative-imports' },
      note: 'Installs a login theme to /usr/share/sddm/themes/rice-cooker, so it asks for your password and applies to every account. Try it without logging out: sddm-greeter-qt6 --test-mode --theme /usr/share/sddm/themes/rice-cooker',
    },
    imagemagick: {
      label: 'ImageMagick (blurs the login background)',
      pkgs: { debian: 'imagemagick', ubuntu: 'imagemagick', fedora: 'ImageMagick', arch: 'imagemagick', opensuse: 'ImageMagick' },
    },
    addonWidgets: {
      label: 'Weather widget (Plasma add-ons)',
      pkgs: { debian: 'plasma-widgets-addons', ubuntu: 'plasma-widgets-addons', fedora: 'kdeplasma-addons', arch: 'kdeplasma-addons', opensuse: 'kdeplasma6-addons' },
    },
    sddm: {
      label: 'Login screen (SDDM, Breeze theme)',
      pkgs: { debian: 'sddm-theme-breeze', ubuntu: 'sddm-theme-breeze', fedora: 'sddm-breeze', arch: 'plasma-desktop', opensuse: 'plasma6-workspace' },
      note: 'Changes system files, so it asks for your password, and applies to every account on this computer.',
    },
    widgetColumn: {
      label: 'Widget column on the desktop (weather, now playing, CPU, memory, calendar)',
      pkgs: { debian: 'plasma-widgets-addons', ubuntu: 'plasma-widgets-addons', fedora: 'kdeplasma-addons', arch: 'kdeplasma-addons', opensuse: 'kdeplasma6-addons' },
    },
    serpKde: {
      label: 'Serpantinum-KDE shell (Quickshell bar, dock, launcher, panels)',
      pkgs: { debian: null, ubuntu: null, fedora: null, arch: ['quickshell', 'git'], opensuse: null },
      why: "Quickshell 0.3.1+ isn't in the official repos (checked 2026-11-23); build it from quickshell.org first, then run the shell's install.sh",
      note: 'Runs on top of Plasma 6 Wayland and replaces the Plasma panels while it runs. Made by mj0x0, based on ilyamiro\'s Serpantinum (AGPL-3.0).',
    },
  };

  /** Compatibility of one feature on one distro. */
  function compat(fid, did, opts = {}) {
    const f = FEATURES[fid], d = DISTROS[did];
    if (!f) return { ok: true, how: 'builtin' };
    if (f.minPlasma && cmpVer(d.plasma, f.minPlasma) < 0) {
      return { ok: false, reason: `needs Plasma ${f.minPlasma}+, ${d.name} has ${d.plasma}` };
    }
    if (f.builtin) return { ok: true, how: 'builtin' };
    const v = f.pkgs[did];
    if (v === null || v === undefined) return { ok: false, reason: f.why || 'not available' };
    if (typeof v === 'string' || Array.isArray(v)) return { ok: true, how: 'pkg', pkgs: [].concat(v) };
    if (v.aur && opts.aur !== false) return { ok: true, how: 'aur', aur: v.aur, manualFallback: !!v.manual };
    if (v.manual) return { ok: true, how: 'manual' };
    if (v.aur) return { ok: false, reason: 'AUR only and AUR use is turned off' };
    if (v.build) return { ok: true, how: 'build', deps: v.build, note: f.note };
    return { ok: false, reason: 'not available' };
  }

  function cmpVer(a, b) {
    const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number);
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] || 0) - (y[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  /* ---------- option lists shown in the UI ---------- */
  const OPTIONS = {
    globalTheme: [
      { id: 'none', label: 'Leave as is' },
      { id: 'org.kde.breezedark.desktop', label: 'Breeze Dark' },
      { id: 'org.kde.breeze.desktop', label: 'Breeze Light' },
      { id: 'org.kde.breezetwilight.desktop', label: 'Breeze Twilight' },
    ],
    plasmaStyle: [
      { id: 'default', label: 'Breeze (follows colour scheme)' },
      { id: 'breeze-dark', label: 'Breeze Dark' },
      { id: 'breeze-light', label: 'Breeze Light' },
    ],
    widgetStyle: [
      { id: 'Breeze', label: 'Breeze (uses the generated colours)' },
      { id: 'kvantum', label: 'Kvantum (own theme colours)', feature: 'kvantum' },
    ],
    kvantumTheme: [
      { id: 'KvArcDark', label: 'KvArcDark' }, { id: 'KvArc', label: 'KvArc' },
      { id: 'KvFlat', label: 'KvFlat' }, { id: 'KvSimplicityDark', label: 'KvSimplicityDark' },
      { id: 'KvAdaptaDark', label: 'KvAdaptaDark' }, { id: 'KvGnomeDark', label: 'KvGnomeDark' },
    ],
    icons: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'breeze-dark', label: 'Breeze Dark' }, { id: 'breeze', label: 'Breeze' },
      { id: 'Papirus-Dark', label: 'Papirus Dark', feature: 'papirus' },
      { id: 'Papirus', label: 'Papirus', feature: 'papirus' },
      { id: 'Papirus-Light', label: 'Papirus Light', feature: 'papirus' },
      { id: 'tela', label: 'Tela (accent-matched, dark)', feature: 'tela' },
    ],
    cursor: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'breeze_cursors', label: 'Breeze' }, { id: 'Breeze_Light', label: 'Breeze Light' },
      { id: 'Bibata-Modern-Ice', label: 'Bibata Modern Ice', feature: 'bibata' },
      { id: 'Bibata-Modern-Classic', label: 'Bibata Modern Classic', feature: 'bibata' },
      { id: 'Bibata-Modern-Amber', label: 'Bibata Modern Amber', feature: 'bibata' },
    ],
    uiFont: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'Noto Sans', label: 'Noto Sans (KDE default)' },
      { id: 'Inter', label: 'Inter', feature: 'fontInter' },
      { id: 'JetBrains Mono', label: 'JetBrains Mono', feature: 'fontJetbrains' },
      { id: 'JetBrainsMono Nerd Font', label: 'JetBrainsMono Nerd Font', feature: 'fontNerd' },
    ],
    monoFont: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'Hack', label: 'Hack (KDE default)' },
      { id: 'JetBrains Mono', label: 'JetBrains Mono', feature: 'fontJetbrains' },
      { id: 'JetBrainsMono Nerd Font', label: 'JetBrainsMono Nerd Font', feature: 'fontNerd' },
      { id: 'Fira Code', label: 'Fira Code', feature: 'fontFira' },
    ],
    buttons: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'mac', label: 'macOS (close, min, max on the left)', left: 'XIA', right: '' },
      { id: 'windows', label: 'Windows (min, max, close on the right)', left: 'M', right: 'IAX' },
      { id: 'minimal', label: 'Minimal (close only)', left: '', right: 'X' },
    ],
    switcher: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'thumbnail_grid', label: 'Thumbnail Grid' },
      { id: 'coverswitch', label: 'Cover Switch (3D carousel)', feature: 'switchers' },
      { id: 'flipswitch', label: 'Flip Switch (3D stack)', feature: 'switchers' },
      { id: 'big_icons', label: 'Big Icons', feature: 'switchers' },
      { id: 'compact', label: 'Compact list', feature: 'switchers' },
      { id: 'sidebar', label: 'Sidebar', feature: 'switchers' },
    ],
    openClose: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'glide', label: 'Glide (tilt in)' },
      { id: 'scale', label: 'Scale (zoom in)' },
      { id: 'fade', label: 'Fade only' },
      { id: 'fallapart', label: 'Fall Apart on close + Scale' },
      { id: 'none', label: 'None' },
    ],
    minimize: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'magiclamp', label: 'Magic Lamp (genie)' },
      { id: 'squash', label: 'Squash' },
      { id: 'none', label: 'None' },
    ],
    desktopSwitch: [
      { id: 'keep', label: 'Leave as is' },
      { id: 'slide', label: 'Slide' },
      { id: 'fadedesktop', label: 'Fade' },
      { id: 'none', label: 'None' },
    ],
    speed: [
      { id: 0, label: 'Instant' }, { id: 0.5, label: 'Fast' }, { id: 1, label: 'Normal' },
      { id: 1.5, label: 'Relaxed' }, { id: 2.5, label: 'Slow and smooth' },
    ],
    panel: [
      { id: 'keep', label: 'Leave my panels alone' },
      { id: 'topdock', label: 'Top dock + side rail', hint: 'Caelestia / Serpantinum' },
      { id: 'leftbar', label: 'Floating left bar', hint: 'Caelestia rail only' },
      { id: 'serpantinum', label: 'Thin bar, centred clock + mini dock', hint: 'Serpantinum-like' },
      { id: 'island', label: 'Floating island + dock', hint: 'dynamic-island look' },
      { id: 'topbar-dock', label: 'Top bar + floating dock', hint: 'macOS-like' },
      { id: 'dock', label: 'Floating dock only', hint: 'clean' },
      { id: 'win11', label: 'Centred taskbar', hint: 'Windows 11-like' },
      { id: 'classic', label: 'Classic bottom panel', hint: 'KDE default' },
      { id: 'unity', label: 'Side launcher + top bar', hint: 'Unity-like' },
      { id: 'minimal', label: 'Thin top bar only', hint: 'tiling-WM look' },
    ],
    loginStyle: [
      { id: 'blur', label: 'Blur: blurred wallpaper, clock and login card' },
      { id: 'clean', label: 'Clean: just the wallpaper; the card appears when you type' },
      { id: 'dock', label: 'Dock: Caelestia-style pill that pops up the login card' },
    ],
    loginMode: [
      { id: 'keep', label: 'Leave my login screen alone' },
      { id: 'cooker', label: 'Rice Cooker login (blur, clean or dock style)', feature: 'cookerLogin' },
      { id: 'rice', label: 'Breeze, matched to this rice', feature: 'sddm' },
      { id: 'breeze', label: 'Reset to plain Breeze', feature: 'sddm' },
    ],
    cycleInterval: [
      { id: 'off', label: 'Only when I run it' },
      { id: '15min', label: 'Every 15 minutes' }, { id: '30min', label: 'Every 30 minutes' },
      { id: '1h', label: 'Every hour' }, { id: '3h', label: 'Every 3 hours' }, { id: '1d', label: 'Every day' },
    ],
  };

  /** Features a state needs, with the reason they are needed. */
  function requiredFeatures(s) {
    const need = [];
    const add = (fid, why) => { if (!need.find((n) => n.fid === fid)) need.push({ fid, why }); };
    const find = (list, id) => OPTIONS[list].find((o) => o.id === id);
    [['icons', s.icons], ['cursor', s.cursor], ['uiFont', s.fonts.ui], ['monoFont', s.fonts.mono],
      ['switcher', s.anim.switcher], ['widgetStyle', s.widgetStyle]].forEach(([list, id]) => {
      const o = find(list, id);
      if (o && o.feature) add(o.feature, o.label);
    });
    if (s.icons && s.icons.startsWith('Papirus') && s.papirusFolders) add('papirusFolders', 'Folder colour');
    if (s.anim.cube) add('cube', 'Desktop Cube');
    if (s.anim.shakeCursor) add('shakeCursor', 'Shake cursor');
    if (s.colors.kitty) add('kitty', 'kitty theme');
    if (s.extras.roundedCorners) add('roundedCorners', 'Rounded corners');
    if (s.extras.betterBlur) add('betterBlur', 'Better Blur');
    if (s.extras.panelColorizer) add('panelColorizer', 'Panel Colorizer');
    if (s.extras.termExtras) add('termExtras', 'Terminal extras');
    if (s.extras.bigClock) add('bigClock', 'Desktop clock');
    if ((s.extras.widgets || []).includes('weather')) add('addonWidgets', 'Weather widget');
    if (s.login && (s.login.mode === 'rice' || s.login.mode === 'breeze')) add('sddm', 'Login screen');
    if (s.login && s.login.mode === 'cooker') add('cookerLogin', 'Login screen');
    if (s.login && s.login.mode === 'rice' && s.login.blur && s.login.wallpaper !== false) add('imagemagick', 'Blurred login background');
    if (s.extras.widgetColumn) add('widgetColumn', 'Widget column');
    if (s.extras.serpKde) add('serpKde', 'Serpantinum-KDE');
    return need;
  }

  /* Desktop widget library. Plasma widget IDs checked on Plasma 6.3 (Debian 13). */
  const WIDGETS = [
    // Rice Cooker cards (styled like the preview, coloured by the rice)
    { id: 'digitalclock', name: 'Clock', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'clock', size: [420, 180] },
    { id: 'greeting', name: 'Greeting', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'greeting', size: [300, 150] },
    { id: 'mediacontroller', name: 'Now playing', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'nowplaying', size: [340, 140] },
    { id: 'rings', name: 'CPU, RAM, GPU', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'rings', size: [320, 140] },
    { id: 'cpu', name: 'CPU ring', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'cpu', size: [160, 160] },
    { id: 'memory', name: 'RAM ring', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'memory', size: [160, 160] },
    { id: 'gpu', name: 'GPU ring', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'gpu', size: [160, 160] },
    { id: 'calendar', name: 'Calendar', plasmoid: 'io.github.jpcass07.ricecooker', kind: 'calendar', size: [300, 260] },
    // stock Plasma widgets
    { id: 'analogclock', name: 'Analog clock', plasmoid: 'org.kde.plasma.analogclock', size: [200, 200] },
    { id: 'weather', name: 'Weather', plasmoid: 'org.kde.plasma.weather', size: [300, 160] },
    { id: 'net', name: 'Network speed', plasmoid: 'org.kde.plasma.systemmonitor.net', size: [260, 160] },
    { id: 'disk', name: 'Disk usage', plasmoid: 'org.kde.plasma.systemmonitor.diskusage', size: [220, 160] },
    { id: 'notes', name: 'Sticky note', plasmoid: 'org.kde.plasma.notes', size: [240, 220] },
    { id: 'puzzle', name: '15 puzzle', plasmoid: 'org.kde.plasma.fifteenpuzzle', size: [240, 240] },
  ];

  RB.catalog = { WIDGETS, DISTROS, DESKTOPS, FEATURES, OPTIONS, compat, cmpVer, requiredFeatures };
})((window.RB = window.RB || {}));
