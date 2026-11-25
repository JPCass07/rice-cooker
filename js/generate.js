/* Rice Cooker — turns a preset into shell steps for one distro.
 * Every step is self-contained (defines what it needs) so it can be pasted
 * on its own; the full script just wraps the steps with a header.
 */
(function (RB) {
  'use strict';
  const { DISTROS, FEATURES, OPTIONS, compat, requiredFeatures } = RB.catalog;
  const C = RB.color;

  const WALLDIR = '$HOME/Pictures/Wallpapers/rice-cooker';
  const Q = 'Q=$(command -v qdbus6 || command -v qdbus-qt6 || command -v qdbus)';

  const slug = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '') || 'rice';
  const hash = (o) => {
    const s = JSON.stringify(o);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(16).slice(0, 4);
  };
  const schemeName = (p) => `RC-${slug(p.name).slice(0, 28)}-${hash(p)}`;
  const sq = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`; // shell single-quote
  const kw = (file, group, key, val) =>
    `kwriteconfig6 --file ${file} ${[].concat(group).map((g) => `--group ${sq(g)}`).join(' ')} --key ${key} ${sq(val)}`;
  const fontStr = (fam, size) => `${fam},${size},-1,5,400,0,0,0,0,0,0,0,0,0,0,1`;
  const heredoc = (path, body, tag = 'RB_EOF') => `cat > "${path}" <<'${tag}'\n${body.replace(/\n+$/, '')}\n${tag}`;
  const fileName = (w) => w.name.replace(/[^\w.\-]+/g, '_');

  const nearest = (hex, table) => {
    const [r, g, b] = C.hexToRgb(hex);
    let best = null, bd = Infinity;
    for (const [name, h] of Object.entries(table)) {
      const [x, y, z] = C.hexToRgb(h);
      const d = (r - x) ** 2 * 0.3 + (g - y) ** 2 * 0.59 + (b - z) ** 2 * 0.11;
      if (d < bd) { bd = d; best = name; }
    }
    return best;
  };
  const PAPIRUS_FOLDERS = { blue: '#5294e2', bluegrey: '#607d8b', breeze: '#3daee9', brown: '#ae8e6c', carmine: '#a30002', cyan: '#00bcd4', darkcyan: '#45abb7', deeporange: '#eb6637', green: '#87b158', grey: '#8e8e8e', indigo: '#5c6bc0', magenta: '#ca71df', nordic: '#81a1c1', orange: '#ee923a', palebrown: '#d1bfae', paleorange: '#eeca8f', pink: '#f06292', red: '#e25252', teal: '#16a085', violet: '#7e57c2', yellow: '#f9bd30' };
  const TELA = { standard: '#5294e2', blue: '#2b7bd6', brown: '#8d6e63', green: '#66bb6a', grey: '#9e9e9e', orange: '#ff9800', pink: '#f06292', purple: '#ab47bc', red: '#ef5350', yellow: '#ffca28', dracula: '#bd93f9', nord: '#81a1c1' };
  const telaName = (c) => (c === 'standard' ? 'Tela-dark' : `Tela-${c}-dark`);

  /* ---------- panel layouts (Plasma desktop scripting) ---------- */
  function panelJS(layout, s) {
    const term = s.colors.kitty ? 'applications:kitty.desktop' : 'applications:org.kde.konsole.desktop';
    const launchers = `preferred://filemanager,preferred://browser,${term},applications:systemsettings.desktop`;
    const W = {
      menu: '"org.kde.plasma.kickoff"', tasks: `["org.kde.plasma.icontasks", {General: {launchers: "${launchers}"}}]`,
      spacer: '"org.kde.plasma.panelspacer"', clock: '"org.kde.plasma.digitalclock"', tray: '"org.kde.plasma.systemtray"',
      pager: '"org.kde.plasma.pager"', sep: '"org.kde.plasma.marginsseparator"', desk: '"org.kde.plasma.showdesktop"',
      gmenu: '"org.kde.plasma.appmenu"', media: '"org.kde.plasma.mediacontroller"',
      rcdock: '["io.github.jpcass07.ricecooker", {General: {kind: "dock"}}]',
    };
    const P = (o) => `makePanel(${JSON.stringify(Object.assign({}, o, { widgets: undefined }))}, [${o.widgets.map((w) => W[w]).join(', ')}]);`;
    const layouts = {
      'topbar-dock': [
        P({ location: 'top', height: 30, lengthMode: 'fill', floating: false, widgets: ['menu', 'gmenu', 'spacer', 'clock', 'spacer', 'tray'] }),
        P({ location: 'bottom', height: 54, lengthMode: 'fit', alignment: 'center', floating: true, hiding: 'dodgewindows', widgets: ['tasks'] }),
      ],
      serpantinum: [
        P({ location: 'top', height: 26, lengthMode: 'fill', floating: false, widgets: ['pager', 'spacer', 'rcdock', 'spacer', 'tray'] }),
        P({ location: 'bottom', height: 44, lengthMode: 'fit', alignment: 'center', floating: true, hiding: 'dodgewindows', widgets: ['tasks'] }),
      ],
      island: [
        P({ location: 'top', height: 30, lengthMode: 'fit', alignment: 'center', floating: true, widgets: ['menu', 'pager', 'clock', 'tray'] }),
        P({ location: 'bottom', height: 50, lengthMode: 'fit', alignment: 'center', floating: true, hiding: 'dodgewindows', widgets: ['tasks'] }),
      ],
      topdock: [
        P({ location: 'left', height: 44, lengthMode: 'fill', floating: true, widgets: ['menu', 'pager', 'tasks', 'spacer', 'tray'] }),
        P({ location: 'top', height: 34, lengthMode: 'fit', alignment: 'center', floating: true, widgets: ['rcdock'] }),
      ],
      leftbar: [P({ location: 'left', height: 46, lengthMode: 'fill', floating: true, widgets: ['menu', 'pager', 'tasks', 'spacer', 'tray', 'clock'] })],
      dock: [P({ location: 'bottom', height: 54, lengthMode: 'fit', alignment: 'center', floating: true, widgets: ['menu', 'tasks', 'sep', 'tray', 'clock'] })],
      win11: [P({ location: 'bottom', height: 46, lengthMode: 'fill', floating: false, widgets: ['spacer', 'menu', 'tasks', 'spacer', 'tray', 'clock', 'desk'] })],
      classic: [P({ location: 'bottom', height: 44, lengthMode: 'fill', floating: true, widgets: ['menu', 'pager', 'tasks', 'sep', 'tray', 'clock', 'desk'] })],
      unity: [
        P({ location: 'top', height: 28, lengthMode: 'fill', floating: false, widgets: ['gmenu', 'spacer', 'clock', 'spacer', 'tray'] }),
        P({ location: 'left', height: 58, lengthMode: 'fill', floating: false, widgets: ['menu', 'tasks'] }),
      ],
      minimal: [P({ location: 'top', height: 26, lengthMode: 'fill', floating: false, widgets: ['pager', 'spacer', 'clock', 'spacer', 'tray'] })],
    };
    return `// Rice Cooker panel layout: ${layout}
var old = panels();
for (var i = 0; i < old.length; i++) { old[i].remove(); }
function makePanel(o, widgets) {
  var p = new Panel;
  p.location = o.location;
  p.height = Math.round(o.height * gridUnit / 18);
  if (o.lengthMode) p.lengthMode = o.lengthMode;
  if (o.alignment) p.alignment = o.alignment;
  if (o.hiding) p.hiding = o.hiding;
  p.floating = !!o.floating;
  for (var i = 0; i < widgets.length; i++) {
    var spec = widgets[i];
    var name = (typeof spec === "string") ? spec : spec[0];
    var w = p.addWidget(name);
    if (typeof spec !== "string") {
      for (var g in spec[1]) {
        w.currentConfigGroup = [g];
        for (var k in spec[1][g]) w.writeConfig(k, spec[1][g][k]);
      }
      if (w.reloadConfig) w.reloadConfig();
    }
  }
  return p;
}
${layouts[layout].join('\n')}`;
  }

  /* ---------- helpers for file contents ---------- */
  function kittyFile(p, name, s) {
    let t = C.kittyTheme(p, name, s.colors.termOpacity);
    if (s.fonts.mono !== 'keep') t += `font_family ${s.fonts.mono}\n`;
    return t;
  }

  /** Build all steps. Returns { steps, skipped, warnings }. */
  function buildSteps(s, did, opts = {}) {
    const d = DISTROS[did];
    const aur = s.useAur !== false;
    const needs = requiredFeatures(s);
    const skipped = []; // {fid, label, reason}
    const ok = new Set();
    for (const n of needs) {
      const c = compat(n.fid, did, { aur });
      if (c.ok) ok.add(n.fid);
      else skipped.push({ fid: n.fid, label: FEATURES[n.fid].label, reason: c.reason, why: n.why });
    }
    const has = (fid) => ok.has(fid);
    const steps = [];
    const step = (id, title, cmds, note) => { if (cmds && cmds.length) steps.push({ id, title, cmds: cmds.join('\n'), note }); };
    const p = s.palette;
    const name = schemeName(p);

    /* backup */
    step('backup', 'Back up your current KDE settings', [
      'BACKUP="$HOME/.local/share/rice-cooker/backups/$(date +%Y%m%d-%H%M%S)"',
      'mkdir -p "$BACKUP"',
      'for f in kdeglobals kwinrc plasmarc plasmashellrc plasma-org.kde.plasma.desktop-appletsrc kcminputrc konsolerc Kvantum/kvantum.kvconfig kitty/kitty.conf; do',
      '  if [ -e "$HOME/.config/$f" ]; then mkdir -p "$BACKUP/$(dirname "$f")"; cp -a "$HOME/.config/$f" "$BACKUP/$f"; fi',
      'done',
      heredoc('$BACKUP/undo.sh', `#!/usr/bin/env bash
# Restores the KDE config files Rice Cooker saved in this folder.
# No terminal (restored from the app): ask for the sudo password with a dialog.
if [ ! -t 0 ] && [ -n "\${SUDO_ASKPASS:-}" ]; then sudo() { command sudo -A "$@"; }; fi
cd "$(dirname "$0")" || exit 1
systemctl --user stop plasma-plasmashell.service
find . -type f ! -name undo.sh -printf '%P\\n' | while read -r f; do
  mkdir -p "$HOME/.config/$(dirname "$f")"
  cp -a "$f" "$HOME/.config/$f"
done
systemctl --user start plasma-plasmashell.service
${Q}
[ -n "$Q" ] && "$Q" org.kde.KWin /KWin reconfigure
echo "Restored. Log out and back in to reset colours in apps that were already open."`, 'UNDO_EOF'),
      'chmod +x "$BACKUP/undo.sh"',
      'echo "Backup saved. Undo with: bash $BACKUP/undo.sh"',
    ]);

    /* packages */
    const pk = [], aurPk = [];
    for (const fid of ok) {
      const c = compat(fid, did, { aur });
      if (c.how === 'pkg') pk.push(...c.pkgs);
      if (c.how === 'aur') aurPk.push(c.aur);
    }
    const needCurl = [...ok].some((fid) => ['manual', 'build'].includes(compat(fid, did, { aur }).how)) ||
      [...ok].some((fid) => compat(fid, did, { aur }).manualFallback) || (s.wallpapers || []).some((w) => w.url);
    if (needCurl) pk.push('curl', 'git');
    if ((s.icons === 'tela')) pk.push('git');
    const uniq = [...new Set(pk)];
    const pc = [];
    if (uniq.length) {
      // only ask for a password when something is actually missing
      pc.push(
        'missing=()',
        `for p in ${uniq.join(' ')}; do ${d.has} "$p" >/dev/null 2>&1 || missing+=("$p"); done`,
        `if [ \${#missing[@]} -gt 0 ]; then ${d.installMissing} "\${missing[@]}"; else echo "All packages are already installed."; fi`,
      );
    }
    if (aurPk.length) {
      const list = aurPk.join(' ');
      pc.push(
        'if command -v paru >/dev/null; then',
        `  paru -S --needed --noconfirm \${RC_SUDOFLAGS:+--sudoflags "$RC_SUDOFLAGS"} ${list}`,
        'elif command -v yay >/dev/null; then',
        `  yay -S --needed --noconfirm \${RC_SUDOFLAGS:+--sudoflags "$RC_SUDOFLAGS"} ${list}`,
        'else',
        `  echo "No AUR helper (paru or yay) found, skipping: ${list}"`,
        'fi',
      );
    }
    step('packages', `Install packages (${d.family})`, pc);

    /* global theme */
    if (s.globalTheme !== 'none') {
      step('global', 'Base global theme', [
        `plasma-apply-lookandfeel -a ${s.globalTheme}`,
      ], 'Applied first because a global theme also resets colours, icons and cursor. Your panels are not touched.');
    }

    /* colours */
    {
      const c = [
        'mkdir -p "$HOME/.local/share/color-schemes"',
        heredoc(`$HOME/.local/share/color-schemes/${name}.colors`, C.kdeColors(p, name)),
        `plasma-apply-colorscheme ${name}`,
      ];
      if (s.colors.accentFromWallpaper) c.push(kw('kdeglobals', 'General', 'accentColorFromWallpaper', 'true'));
      else c.push(kw('kdeglobals', 'General', 'accentColorFromWallpaper', 'false'), `plasma-apply-colorscheme --accent-color ${sq(p.accent)}`);
      if (s.colors.konsole) {
        c.push(
          'mkdir -p "$HOME/.local/share/konsole"',
          heredoc(`$HOME/.local/share/konsole/${name}.colorscheme`, C.konsoleScheme(p, name, s.colors.termOpacity)),
          heredoc('$HOME/.local/share/konsole/RiceCooker.profile', `[Appearance]
ColorScheme=${name}${s.fonts.mono !== 'keep' ? `\nFont=${fontStr(s.fonts.mono, 11)}` : ''}

[General]
Name=RiceCooker
Parent=FALLBACK/`),
          kw('konsolerc', 'Desktop Entry', 'DefaultProfile', 'RiceCooker.profile'),
        );
      }
      if (s.colors.kitty && has('kitty')) {
        c.push(
          'mkdir -p "$HOME/.config/kitty"',
          heredoc('$HOME/.config/kitty/rice-cooker-theme.conf', kittyFile(p, name, s)),
          'touch "$HOME/.config/kitty/kitty.conf"',
          `grep -qxF 'include rice-cooker-theme.conf' "$HOME/.config/kitty/kitty.conf" || echo 'include rice-cooker-theme.conf' >> "$HOME/.config/kitty/kitty.conf"`,
          'pkill -USR1 -x kitty || true',
        );
      }
      step('colors', `Colour scheme "${p.name}"`, c);
    }

    /* wallpaper */
    const walls = s.wallpapers || [];
    const active = walls[s.activeWallpaper || 0];
    if (walls.length) {
      const c = [`WALLDIR="${WALLDIR}"`, 'mkdir -p "$WALLDIR"'];
      walls.forEach((w) => {
        const f = fileName(w);
        if (w.url) c.push(`[ -f "$WALLDIR/${f}" ] || curl -fL -o "$WALLDIR/${f}" ${sq(w.url)}`);
        else c.push(`[ -f "$WALLDIR/${f}" ] || echo "Copy ${f} into $WALLDIR first (use the Save button in Rice Cooker)"`);
      });
      if (active) c.push(`[ -f "$WALLDIR/${fileName(active)}" ] && plasma-apply-wallpaperimage "$WALLDIR/${fileName(active)}"`);
      step('wallpaper', 'Wallpaper', c, 'Sets the same image on every screen. This replaces any wallpaper plugin (Wallpaper Engine, live wallpapers) you have on the desktop.');
    }

    /* icons */
    if (s.icons !== 'keep') {
      const c = [];
      let theme = s.icons;
      if (s.icons === 'tela') {
        if (has('tela')) {
          const col = nearest(p.accent, TELA);
          theme = telaName(col);
          c.push(
            `if [ ! -d "$HOME/.local/share/icons/${theme}" ] && [ ! -d "/usr/share/icons/${theme}" ]; then`,
            '  tmp=$(mktemp -d)',
            '  git clone --depth 1 https://github.com/vinceliuice/Tela-icon-theme "$tmp/tela"',
            `  bash "$tmp/tela/install.sh" -d "$HOME/.local/share/icons" ${col}`,
            '  rm -rf "$tmp"',
            'fi',
          );
        } else theme = null;
      }
      if (s.icons.startsWith('Papirus') && !has('papirus')) theme = null;
      if (theme) {
        c.push(
          'CHANGEICONS=$(ls /usr/lib/*/libexec/plasma-changeicons /usr/libexec/plasma-changeicons /usr/lib/plasma-changeicons 2>/dev/null | head -n1 || true)',
          `if [ -n "$CHANGEICONS" ]; then "$CHANGEICONS" ${theme}; else ${kw('kdeglobals', 'Icons', 'Theme', theme)}; fi`,
        );
        if (s.icons.startsWith('Papirus') && s.papirusFolders && has('papirusFolders')) {
          const col = nearest(p.accent, PAPIRUS_FOLDERS);
          c.push(
            'mkdir -p "$HOME/.local/bin"',
            'curl -fsSL -o "$HOME/.local/bin/papirus-folders" https://raw.githubusercontent.com/PapirusDevelopmentTeam/papirus-folders/master/papirus-folders',
            'chmod +x "$HOME/.local/bin/papirus-folders"',
            `sudo "$HOME/.local/bin/papirus-folders" -C ${col} --theme ${s.icons}`,
          );
        }
      }
      step('icons', 'Icons', c);
    }

    /* cursor */
    if (s.cursor !== 'keep') {
      const c = [];
      const isBibata = s.cursor.startsWith('Bibata');
      if (!isBibata || has('bibata')) {
        if (isBibata) {
          const how = compat('bibata', did, { aur });
          if (how.how === 'manual' || how.manualFallback) {
            c.push(
              `if [ ! -d "/usr/share/icons/${s.cursor}" ] && [ ! -d "$HOME/.local/share/icons/${s.cursor}" ]; then`,
              '  tmp=$(mktemp -d)',
              `  curl -fL -o "$tmp/cursor.tar.xz" https://github.com/ful1e5/Bibata_Cursor/releases/latest/download/${s.cursor}.tar.xz`,
              '  mkdir -p "$HOME/.local/share/icons" && tar -xJf "$tmp/cursor.tar.xz" -C "$HOME/.local/share/icons"',
              '  rm -rf "$tmp"',
              'fi',
            );
          }
        }
        c.push(`plasma-apply-cursortheme ${s.cursor}`);
      }
      step('cursor', 'Cursor', c, 'Apps that are already open pick up the new cursor after you log out and in.');
    }

    /* fonts */
    {
      const c = [];
      if ((s.fonts.ui === 'JetBrainsMono Nerd Font' || s.fonts.mono === 'JetBrainsMono Nerd Font') && has('fontNerd') &&
        compat('fontNerd', did).how === 'manual') {
        c.push(
          'if ! fc-list | grep -qi "JetBrainsMono Nerd Font"; then',
          '  tmp=$(mktemp -d)',
          '  curl -fL -o "$tmp/nerd.tar.xz" https://github.com/ryanoasis/nerd-fonts/releases/latest/download/JetBrainsMono.tar.xz',
          '  mkdir -p "$HOME/.local/share/fonts/JetBrainsMonoNerd" && tar -xJf "$tmp/nerd.tar.xz" -C "$HOME/.local/share/fonts/JetBrainsMonoNerd"',
          '  rm -rf "$tmp" && fc-cache -f',
          'fi',
        );
      }
      const fontOk = (id, list) => { const o = OPTIONS[list].find((x) => x.id === id); return id !== 'keep' && (!o || !o.feature || has(o.feature)); };
      if (fontOk(s.fonts.ui, 'uiFont')) {
        const sz = s.fonts.size;
        c.push(
          kw('kdeglobals', 'General', 'font', fontStr(s.fonts.ui, sz)),
          kw('kdeglobals', 'General', 'menuFont', fontStr(s.fonts.ui, sz)),
          kw('kdeglobals', 'General', 'toolBarFont', fontStr(s.fonts.ui, sz)),
          kw('kdeglobals', 'General', 'smallestReadableFont', fontStr(s.fonts.ui, Math.max(7, sz - 2))),
          kw('kdeglobals', 'WM', 'activeFont', fontStr(s.fonts.ui, sz)),
        );
      }
      if (fontOk(s.fonts.mono, 'monoFont')) c.push(kw('kdeglobals', 'General', 'fixed', fontStr(s.fonts.mono, s.fonts.size)));
      step('fonts', 'Fonts', c, 'Fonts change in new windows; log out and in to update everything.');
    }

    /* style + decorations */
    {
      const c = [];
      const useKv = s.widgetStyle === 'kvantum' && has('kvantum');
      c.push(kw('kdeglobals', 'KDE', 'widgetStyle', useKv ? 'kvantum' : 'Breeze'));
      if (useKv) c.push('mkdir -p "$HOME/.config/Kvantum"', `kvantummanager --set ${s.kvantumTheme} || ${kw('"$HOME/.config/Kvantum/kvantum.kvconfig"', 'General', 'theme', s.kvantumTheme)}`);
      c.push(`plasma-apply-desktoptheme ${s.plasmaStyle}`);
      const b = OPTIONS.buttons.find((x) => x.id === s.decor.buttons);
      if (b && b.id !== 'keep') {
        c.push(kw('kwinrc', 'org.kde.kdecoration2', 'ButtonsOnLeft', b.left), kw('kwinrc', 'org.kde.kdecoration2', 'ButtonsOnRight', b.right));
      }
      c.push(kw('kwinrc', 'Windows', 'BorderlessMaximizedWindows', String(!!s.decor.borderlessMax)));
      if (s.decor.noBorders) c.push(kw('kwinrc', 'org.kde.kdecoration2', 'BorderSize', 'None'), kw('kwinrc', 'org.kde.kdecoration2', 'BorderSizeAuto', 'false'));
      c.push(Q, '"$Q" org.kde.KWin /KWin reconfigure');
      step('style', 'Widget style, Plasma style and window buttons', c);
    }

    /* animations */
    {
      const a = s.anim;
      const c = [kw('kdeglobals', 'KDE', 'AnimationDurationFactor', String(a.speed)),
        '# a copy of this key in kwinrc overrides the one in kdeglobals, so remove it',
        'kwriteconfig6 --file kwinrc --group Compositing --key AnimationDurationFactor --delete'];
      const plug = (k, v) => c.push(kw('kwinrc', 'Plugins', `${k}Enabled`, String(v)));
      if (a.switcher !== 'keep') {
        const o = OPTIONS.switcher.find((x) => x.id === a.switcher);
        if (!o.feature || has(o.feature)) c.push(kw('kwinrc', ['TabBox'], 'LayoutName', a.switcher));
      }
      const oc = {
        glide: { glide: true, scale: false, fade: true, fallapart: false },
        scale: { glide: false, scale: true, fade: true, fallapart: false },
        fade: { glide: false, scale: false, fade: true, fallapart: false },
        fallapart: { glide: false, scale: true, fade: true, fallapart: true },
        none: { glide: false, scale: false, fade: false, fallapart: false },
      }[a.openClose];
      if (oc) Object.entries(oc).forEach(([k, v]) => plug(k, v));
      const mn = { magiclamp: { magiclamp: true, squash: false }, squash: { magiclamp: false, squash: true }, none: { magiclamp: false, squash: false } }[a.minimize];
      if (mn) Object.entries(mn).forEach(([k, v]) => plug(k, v));
      const ds = { slide: { slide: true, fadedesktop: false }, fadedesktop: { slide: false, fadedesktop: true }, none: { slide: false, fadedesktop: false } }[a.desktopSwitch];
      if (ds) Object.entries(ds).forEach(([k, v]) => plug(k, v));
      plug('wobblywindows', !!a.wobbly);
      plug('blur', !!a.blur);
      if (a.blur) {
        c.push(kw('kwinrc', 'Effect-blur', 'BlurStrength', String(a.blurStrength)));
        c.push(kw('kwinrc', 'Effect-blur', 'NoiseStrength', String(a.blurNoise || 0)));
      }
      plug('translucency', !!a.translucency);
      plug('diminactive', !!a.dimInactive);
      plug('slidingpopups', a.slidingPopups !== false);
      if (has('cube')) plug('cube', true);
      else if (!a.cube) plug('cube', false);
      if (has('shakeCursor')) plug('shakecursor', true);
      c.push(Q, '"$Q" org.kde.KWin /KWin reconfigure');
      const note = has('cube') ? 'Desktop Cube: press Meta+C.' : undefined;
      step('animations', 'Animations and KWin effects', c, note);
    }

    /* Rice Cooker's own Plasma widget: the cards and the top-dock pill */
    {
      const P = RB.plasmoid;
      const uses = ['topdock', 'serpantinum'].includes(s.panel) || has('bigClock') || has('widgetColumn') ||
        (s.extras.widgets || []).some((id) => (RB.catalog.WIDGETS.find((w) => w.id === id) || {}).kind);
      if (uses) {
        step('rcwidget', 'Rice Cooker widget (cards and top dock)', [
          'PK="$HOME/.local/share/rice-cooker/plasmoid"',
          'mkdir -p "$PK/contents/ui" "$PK/contents/config"',
          `cat > "$PK/metadata.json" <<'META_EOF'\n${P.metadata}\nMETA_EOF`,
          `cat > "$PK/contents/config/main.xml" <<'XML_EOF'\n${P.configXml.trim()}\nXML_EOF`,
          `cat > "$PK/contents/ui/main.qml" <<'QML_EOF'\n${P.mainQml.trim()}\nQML_EOF`,
          'kpackagetool6 -t Plasma/Applet --upgrade "$PK" >/dev/null 2>&1 || kpackagetool6 -t Plasma/Applet --install "$PK"',
        ], 'Installs into your home folder (no password). Clock, greeting, now playing (any music player), live CPU/RAM/GPU rings, calendar and the top-dock pill, all coloured by the rice. Remove it with: kpackagetool6 -t Plasma/Applet --remove ' + P.ID);
      }
    }

    /* panels */
    if (s.panel !== 'keep') {
      step('panels', 'Panel layout', [
        `RB_PANEL_JS=$(cat <<'JS_EOF'\n${panelJS(s.panel, s)}\nJS_EOF\n)`,
        Q,
        '"$Q" org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript "$RB_PANEL_JS"',
      ], 'Removes your current panels and builds the new layout on the primary screen. The backup step saved the old layout.');
    }

    /* extras */
    if (has('roundedCorners')) {
      const how = compat('roundedCorners', did, { aur });
      const c = [];
      if (how.how === 'build') {
        c.push(
          d.install(how.deps.split(' ')),
          'tmp=$(mktemp -d)',
          'git clone --depth 1 https://github.com/matinlotfali/KDE-Rounded-Corners "$tmp/rc"',
          'cmake -S "$tmp/rc" -B "$tmp/rc/build" -DCMAKE_INSTALL_PREFIX=/usr',
          'cmake --build "$tmp/rc/build" -j"$(nproc)"',
          'sudo cmake --install "$tmp/rc/build"',
          'rm -rf "$tmp"',
        );
      }
      c.push(kw('kwinrc', 'Plugins', 'kwin4_effect_shapecornersEnabled', 'true'), Q, '"$Q" org.kde.KWin /KWin reconfigure');
      step('rounded', 'Rounded corners', c, FEATURES.roundedCorners.note + (how.how === 'aur' ? ' (installed from the AUR in the packages step)' : ''));
    }
    if (has('panelColorizer') && compat('panelColorizer', did, { aur }).how !== 'aur') {
      step('colorizer', 'Panel Colorizer widget', [
        'url=$(curl -fsSL https://api.github.com/repos/luisbocanegra/plasma-panel-colorizer/releases/latest | grep -o \'"browser_download_url": *"[^"]*\\.plasmoid"\' | head -n1 | cut -d\'"\' -f4)',
        'if [ -n "$url" ]; then',
        '  tmp=$(mktemp -d) && curl -fL -o "$tmp/colorizer.plasmoid" "$url"',
        '  kpackagetool6 -t Plasma/Applet -i "$tmp/colorizer.plasmoid" || kpackagetool6 -t Plasma/Applet -u "$tmp/colorizer.plasmoid"',
        '  rm -rf "$tmp"',
        'else',
        '  echo "Could not find the Panel Colorizer download; get it from System Settings > Get New Widgets"',
        'fi',
      ], 'Add it to a panel with right-click > Add Widgets > Panel Colorizer.');
    }
    if (has('betterBlur')) {
      step('betterblur', 'Better Blur DX', ['echo "Better Blur DX was installed from the AUR: enable it in System Settings > Desktop Effects (turn off the stock Blur)."']);
    }

    /* login screen (SDDM) */
    if (has('cookerLogin') && s.login && s.login.mode === 'cooker') {
      const L = s.login, T = RB.sddmTheme;
      const wall = active && L.wallpaper !== false ? fileName(active) : null;
      const userConf = ['[General]', `style=${L.style || 'blur'}`, `accent=${p.accent}`, `bg=${p.bg}`, `surface=${p.surface}`, `fg=${p.fg}`, `dim=${p.fgDim}`,
        `font=${s.fonts.ui !== 'keep' ? s.fonts.ui : 'Noto Sans'}`, `clock24=${L.clock24 !== false}`,
        `background=${wall ? `/usr/share/wallpapers/rice-cooker/login-${wall}` : ''}`];
      const conf = ['[Theme]', 'Current=rice-cooker'];
      if (s.cursor !== 'keep') conf.push(`CursorTheme=${s.cursor}`);
      const c = [
        'TD=/usr/share/sddm/themes/rice-cooker',
        'DM=$(basename "$(readlink -f /etc/systemd/system/display-manager.service 2>/dev/null)" .service)',
        'if [ "$DM" != "sddm" ]; then',
        '  echo "Login screen: this computer uses ${DM:-an unknown display manager}, not SDDM, so it was left alone."',
        'else',
        '  sudo install -d "$TD"',
        `  sudo tee "$TD/metadata.desktop" >/dev/null <<'META_EOF'
${T.metadata.trim()}
META_EOF`,
        `  sudo tee "$TD/theme.conf" >/dev/null <<'CONF_EOF'
${T.themeConf.trim()}
CONF_EOF`,
        `  sudo tee "$TD/Main.qml" >/dev/null <<'QML_EOF'
${T.mainQml.trim()}
QML_EOF`,
      ];
      if (wall) c.push(
        `  WALL="${WALLDIR}/${wall}"`,
        '  if [ -f "$WALL" ]; then sudo install -d /usr/share/wallpapers/rice-cooker && sudo install -m644 "$WALL" "/usr/share/wallpapers/rice-cooker/login-$(basename "$WALL")"; fi',
      );
      c.push(
        `  printf '%s\n' ${userConf.map(sq).join(' ')} | sudo tee "$TD/theme.conf.user" >/dev/null`,
        '  sudo install -d /etc/sddm.conf.d',
        `  printf '%s\n' ${conf.map(sq).join(' ')} | sudo tee /etc/sddm.conf.d/zz-rice-cooker.conf >/dev/null`,
        '  if [ -n "${BACKUP:-}" ] && [ -f "$BACKUP/undo.sh" ]; then',
        `    printf '%s\n' '# login screen' 'if sudo rm -f /etc/sddm.conf.d/zz-rice-cooker.conf; then echo "Login screen restored."; else echo "Login screen NOT restored: run  sudo rm -f /etc/sddm.conf.d/zz-rice-cooker.conf"; fi' >> "$BACKUP/undo.sh"`,
        '  fi',
        '  echo "Login screen set. Try it now with: sddm-greeter-qt6 --test-mode --theme $TD"',
        'fi',
      );
      step('login', `Login screen: Rice Cooker ${L.style || 'blur'} style`, c, FEATURES.cookerLogin.note);
    }

    if (has('sddm') && s.login && (s.login.mode === 'rice' || s.login.mode === 'breeze')) {
      const L = s.login, rice = L.mode === 'rice';
      const wall = active && rice && L.wallpaper ? fileName(active) : null;
      const theme = ['[General]', `showClock=${L.clock !== false}`];
      if (rice) {
        theme.push(`color=${p.accent}`);
        theme.push(wall ? 'type=image' : 'type=color');
        if (wall) theme.push(`background=/usr/share/wallpapers/rice-cooker/login-${wall}`);
      }
      const conf = ['[Theme]', 'Current=breeze'];
      if (rice && s.cursor !== 'keep') conf.push(`CursorTheme=${s.cursor}`);
      if (rice && s.fonts.ui !== 'keep') conf.push(`Font=${fontStr(s.fonts.ui, s.fonts.size)}`);
      const c = [
        'THEME_DIR=/usr/share/sddm/themes/breeze',
        'DM=$(basename "$(readlink -f /etc/systemd/system/display-manager.service 2>/dev/null)" .service)',
        'if [ "$DM" != "sddm" ]; then',
        '  echo "Login screen: this computer uses ${DM:-an unknown display manager}, not SDDM, so it was left alone."',
        'elif [ ! -d "$THEME_DIR" ]; then',
        '  echo "Login screen: the Breeze SDDM theme is not installed ($THEME_DIR), so it was left alone."',
        'else',
        '  # keep the first original so undo can put it back',
        '  [ -f "$THEME_DIR/theme.conf.user" ] && [ ! -f "$THEME_DIR/theme.conf.user.rice-cooker-orig" ] && sudo cp -a "$THEME_DIR/theme.conf.user" "$THEME_DIR/theme.conf.user.rice-cooker-orig"',
      ];
      if (L.mode === 'breeze') {
        c.push('  sudo rm -f "$THEME_DIR/theme.conf.user" /etc/sddm.conf.d/zz-rice-cooker.conf');
      } else {
        if (wall) c.push(
          `  WALL="${WALLDIR}/${wall}"`,
          '  LOGIN_WALL="/usr/share/wallpapers/rice-cooker/login-$(basename "$WALL")"',
          '  if [ -f "$WALL" ]; then',
          '    sudo install -d /usr/share/wallpapers/rice-cooker',
          ...(L.blur ? [
            '    IM=$(command -v magick || command -v convert)',
            '    if [ -n "$IM" ]; then tmpw=$(mktemp --suffix=.png); "$IM" "$WALL" -resize "2560x2560>" -blur 0x28 "$tmpw" && sudo install -m644 "$tmpw" "$LOGIN_WALL"; rm -f "$tmpw"',
            '    else echo "ImageMagick not found: using the sharp wallpaper on the login screen"; sudo install -m644 "$WALL" "$LOGIN_WALL"; fi',
          ] : ['    sudo install -m644 "$WALL" "$LOGIN_WALL"']),
          '  fi',
        );
        c.push(
          `  printf '%s\n' ${theme.map(sq).join(' ')} | sudo tee "$THEME_DIR/theme.conf.user" >/dev/null`,
          '  sudo install -d /etc/sddm.conf.d',
          `  printf '%s\n' ${conf.map(sq).join(' ')} | sudo tee /etc/sddm.conf.d/zz-rice-cooker.conf >/dev/null`,
        );
        if (L.sync !== false) c.push(
          '  # what System Settings > Login Screen > "Apply Plasma Settings" does: colours, fonts and icons for the greeter',
          '  SDDM_HOME=$(getent passwd sddm | cut -d: -f6)',
          '  if [ -n "$SDDM_HOME" ] && [ -f "$HOME/.config/kdeglobals" ]; then',
          '    sudo install -d -o sddm -g sddm "$SDDM_HOME/.config"',
          '    sudo install -o sddm -g sddm -m644 "$HOME/.config/kdeglobals" "$SDDM_HOME/.config/kdeglobals"',
          '  fi',
        );
      }
      c.push(
        '  if [ -n "${BACKUP:-}" ] && [ -f "$BACKUP/undo.sh" ]; then',
        `    cat >> "$BACKUP/undo.sh" <<'LOGIN_EOF'`,
        '# login screen',
        'ok=1; sudo rm -f /etc/sddm.conf.d/zz-rice-cooker.conf || ok=0',
        'if [ -f /usr/share/sddm/themes/breeze/theme.conf.user.rice-cooker-orig ]; then sudo cp -a /usr/share/sddm/themes/breeze/theme.conf.user.rice-cooker-orig /usr/share/sddm/themes/breeze/theme.conf.user || ok=0; else sudo rm -f /usr/share/sddm/themes/breeze/theme.conf.user || ok=0; fi',
        '[ "$ok" = 1 ] && echo "Login screen restored." || echo "Login screen NOT restored: run this undo.sh again from a terminal so sudo can ask for your password."',
        'LOGIN_EOF',
        '  fi',
        '  echo "Login screen set. You will see it the next time you log out or restart."',
        'fi',
      );
      step('login', L.mode === 'breeze' ? 'Login screen: plain Breeze' : 'Login screen to match', c, FEATURES.sddm.note);
    }

    /* desktop widgets: big clock, Caelestia column and the widget library, in one step.
       Every widget Rice Cooker adds is tagged, and the next cook removes the tagged
       ones first, so cooking again replaces them instead of stacking duplicates. */
    {
      const RCW = 'io.github.jpcass07.ricecooker';
      const items = []; // [plasmoid, x, y, w, h, place, cardKind]  x/y: pixels for 'col'/'clock', else % of the screen
      if (has('bigClock')) items.push([RCW, 'center', 140, 520, 220, 'clock', 'clock']);
      const colIds = [];
      if (has('widgetColumn')) {
        [['greeting', 130], ['nowplaying', 140], ['rings', 130], ['calendar', 250]].forEach(([k, h]) => { colIds.push(k); items.push([RCW, 'right', h, 320, h, 'col', k]); });
      }
      const pos = s.extras.widgetPos || {};
      (s.extras.widgets || []).map((id) => RB.catalog.WIDGETS.find((w) => w.id === id)).filter(Boolean)
        .filter((w) => w.id !== 'weather' || has('addonWidgets'))
        .filter((w) => !(w.kind && colIds.includes(w.kind)))       // already in the column
        .filter((w) => !(w.id === 'digitalclock' && has('bigClock')))
        .forEach((w, i) => { const pp = pos[w.id] || [3 + (i % 4) * 12, 8 + Math.floor(i / 4) * 16]; items.push([w.plasmoid, pp[0], pp[1], w.size[0], w.size[1], 'lib', w.kind || '']); });
      const unit = s.extras.tempUnit === 'F' ? 6002 : 6001; // KUnitConversion: Celsius 6001, Fahrenheit 6002
      const js = `var g = screenGeometry(0);
var items = [
${items.map((x) => '  ' + JSON.stringify(x)).join(',\n')}
];
var ds = desktops();
for (var i = 0; i < ds.length; i++) {
  if (ds[i].screen !== 0) continue;
  // take away what an earlier cook added
  var old = ds[i].widgets();
  for (var j = 0; j < old.length; j++) {
    old[j].currentConfigGroup = ["RiceCooker"];
    if (old[j].readConfig("added", "") === "yes") old[j].remove();
  }
  var colY = 70;
  for (var k = 0; k < items.length; k++) {
    var it = items[k];
    if (knownWidgetTypes.indexOf(it[0]) < 0) { print("skipping " + it[0] + ": not installed"); continue; }
    var x, y;
    if (it[5] === "col") { x = g.width - 360; y = colY; colY += it[4] + 14; }
    else if (it[5] === "clock") { x = Math.round(g.width / 2) - it[3] / 2; y = it[2]; }
    else { x = Math.round(g.width * it[1] / 100); y = Math.round(g.height * it[2] / 100); }
    var w = ds[i].addWidget(it[0], x, y, it[3], it[4]);
    w.currentConfigGroup = ["RiceCooker"];
    w.writeConfig("added", "yes");
    if (it[6]) { w.currentConfigGroup = ["General"]; w.writeConfig("kind", it[6]); w.writeConfig("clock24", true); if (w.reloadConfig) w.reloadConfig(); }
    if (it[0] === "org.kde.plasma.digitalclock") {
      w.currentConfigGroup = ["Appearance"];
      w.writeConfig("showDate", true);
      w.writeConfig("dateDisplayFormat", "BelowTime");
      w.writeConfig("autoFontAndSize", true);
    }
    if (it[0] === "org.kde.plasma.weather") {
      w.currentConfigGroup = ["Units"];
      w.writeConfig("temperatureUnit", ${unit});
    }
  }
}`;
      const removeOnly = !items.length; // switching to a rice without widgets still clears the old ones
      if (items.length || removeOnly) {
        step('deskwidgets', items.length ? `Desktop widgets (${items.length})` : 'Remove Rice Cooker desktop widgets', [
          `RB_WIDGETS_JS=$(cat <<'JS_EOF'\n${js}\nJS_EOF\n)`,
          Q,
          '"$Q" org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript "$RB_WIDGETS_JS"',
        ], 'Replaces any widgets an earlier cook added (they are tagged), so cooking again never stacks duplicates. Move or resize them any time: right-click the desktop > Enter Edit Mode. Set your town in the weather widget once (right-click > Configure).');
      }
    }

    if (has('serpKde')) {
      step('serpkde', 'Serpantinum-KDE shell', [
        'mkdir -p "$HOME/.local/src"',
        '[ -d "$HOME/.local/src/serpantinum-kde" ] || git clone --depth 1 https://github.com/mj0x0/serpantinum-kde "$HOME/.local/src/serpantinum-kde"',
        'cd "$HOME/.local/src/serpantinum-kde" && ./install.sh',
      ], FEATURES.serpKde.note + ' Its installer asks before it changes anything.');
    }

    /* rice cycle */
    if (s.cycle.enabled && walls.length >= 2) {
      const dir = '$HOME/.local/share/rice-cooker/cycle';
      const c = ['DIR="$HOME/.local/share/rice-cooker/cycle"', `WALLDIR="${WALLDIR}"`, 'mkdir -p "$DIR" "$HOME/.local/share/color-schemes" "$HOME/.local/share/konsole" "$HOME/.local/bin"'];
      const rows = [];
      walls.forEach((w, i) => {
        const wp = w.palette || p;
        const n = `${schemeName(wp)}`;
        c.push(heredoc(`$HOME/.local/share/color-schemes/${n}.colors`, C.kdeColors(wp, n)));
        if (s.colors.konsole) c.push(heredoc(`$HOME/.local/share/konsole/${n}.colorscheme`, C.konsoleScheme(wp, n, s.colors.termOpacity)));
        if (s.colors.kitty && has('kitty')) c.push(`mkdir -p "$DIR/${i + 1}"`, heredoc(`$DIR/${i + 1}/kitty.conf`, kittyFile(wp, n, s)));
        rows.push(`printf '%s\\t%s\\t%s\\n' "$WALLDIR/${fileName(w)}" ${n} ${sq(wp.accent)} ${i === 0 ? '>' : '>>'} "$DIR/list.tsv"`);
      });
      c.push(...rows);
      c.push(heredoc('$HOME/.local/bin/rice-cycle', `#!/usr/bin/env bash
# rice-cycle: swap wallpaper and colour scheme together (made by Rice Cooker)
# usage: rice-cycle [next|prev|random|N]
DIR="$HOME/.local/share/rice-cooker/cycle"
mapfile -t L < "$DIR/list.tsv"
n=\${#L[@]}
[ "$n" -gt 0 ] || { echo "No rices in $DIR/list.tsv"; exit 1; }
i=$(cat "$DIR/current" 2>/dev/null || echo -1)
case "\${1:-next}" in
  next) i=$(( (i + 1) % n )) ;;
  prev) i=$(( (i - 1 + n) % n )) ;;
  random) j=$i; while [ "$n" -gt 1 ] && [ "$j" = "$i" ]; do j=$(( RANDOM % n )); done; i=$j ;;
  [0-9]*) i=$(( $1 - 1 )) ;;
esac
IFS=$'\\t' read -r wall scheme accent <<< "\${L[$i]}"
[ -f "$wall" ] && plasma-apply-wallpaperimage "$wall" >/dev/null
plasma-apply-colorscheme "$scheme" >/dev/null
plasma-apply-colorscheme --accent-color "$accent" >/dev/null 2>&1
if [ -f "$HOME/.local/share/konsole/RiceCooker.profile" ]; then
  kwriteconfig6 --file "$HOME/.local/share/konsole/RiceCooker.profile" --group Appearance --key ColorScheme "$scheme"
fi
if [ -f "$DIR/$((i + 1))/kitty.conf" ] && [ -d "$HOME/.config/kitty" ]; then
  cp "$DIR/$((i + 1))/kitty.conf" "$HOME/.config/kitty/rice-cooker-theme.conf"
  pkill -USR1 -x kitty
fi
echo "$i" > "$DIR/current"
command -v notify-send >/dev/null && notify-send -a "Rice Cooker" -i preferences-desktop-wallpaper "Rice $((i + 1)) of $n" "$scheme"
exit 0`, 'CYCLE_EOF'));
      c.push('chmod +x "$HOME/.local/bin/rice-cycle"');
      c.push('mkdir -p "$HOME/.local/share/applications"', `cat > "$HOME/.local/share/applications/rice-cycle.desktop" <<DESK_EOF
[Desktop Entry]
Type=Application
Name=Next Rice
Comment=Swap wallpaper and colour scheme together
Icon=preferences-desktop-wallpaper
Exec=$HOME/.local/bin/rice-cycle next
Actions=prev;random;

[Desktop Action prev]
Name=Previous Rice
Exec=$HOME/.local/bin/rice-cycle prev

[Desktop Action random]
Name=Random Rice
Exec=$HOME/.local/bin/rice-cycle random
DESK_EOF`);
      const iv = { '15min': '15min', '30min': '30min', '1h': '1h', '3h': '3h', '1d': '1d' }[s.cycle.interval];
      if (iv) {
        c.push('mkdir -p "$HOME/.config/systemd/user"',
          heredoc('$HOME/.config/systemd/user/rice-cycle.service', `[Unit]
Description=Rice Cooker: next wallpaper and colour scheme
PartOf=graphical-session.target
After=graphical-session.target

[Service]
Type=oneshot
ExecStart=%h/.local/bin/rice-cycle ${s.cycle.order === 'random' ? 'random' : 'next'}`),
          heredoc('$HOME/.config/systemd/user/rice-cycle.timer', `[Unit]
Description=Rice Cooker: change rice every ${iv}

[Timer]
OnActiveSec=${iv}
OnUnitActiveSec=${iv}

[Install]
WantedBy=timers.target`),
          'systemctl --user daemon-reload',
          'systemctl --user enable --now rice-cycle.timer');
      }
      c.push('"$HOME/.local/bin/rice-cycle" 1');
      step('cycle', `Rice cycling (${walls.length} wallpapers + colour schemes)`, c,
        'Run rice-cycle (next, prev, random or a number), or launch "Next Rice" from the app menu. To put it on a key: System Settings > Keyboard > Shortcuts > Add New > Application > Next Rice.' +
        (iv ? ` A timer changes it every ${iv}; stop it with: systemctl --user disable --now rice-cycle.timer` : ''));
    }

    /* finish */
    step('finish', 'Reload and finish', [
      Q, '"$Q" org.kde.KWin /KWin reconfigure',
      'echo "Rice applied. Log out and back in once so every app picks up fonts, cursor and colours."',
    ]);

    return { steps, skipped, name };
  }

  function buildScript(s, did, opts = {}) {
    const d = DISTROS[did];
    let { steps, skipped } = buildSteps(s, did);
    if (opts.only) steps = steps.filter((st) => opts.only.includes(st.id));
    const ids = d.osIds.map((x) => `*" ${x} "*`).join('|');
    let out = `#!/usr/bin/env bash
# =====================================================================
#  Rice Cooker: "${s.name}" for ${d.long} (KDE Plasma ${d.plasma}+)
#  Generated ${new Date().toISOString().slice(0, 10)}. Run as your normal user:  bash ${slug(s.name)}.sh
#  Add -y to skip the question. Everything it changes is backed up first.
# =====================================================================
set -uo pipefail
# No terminal (run from the Rice Cooker app): ask for the sudo password with a dialog.
if [ ! -t 0 ] && [ -n "\${SUDO_ASKPASS:-}" ]; then sudo() { command sudo -A "$@"; }; RC_SUDOFLAGS=-A; fi
warn() { printf '\\033[1;33m!!\\033[0m %s\\n' "$*" >&2; }
trap 'warn "line $LINENO failed: $BASH_COMMAND (continuing)"' ERR
step() { printf '\\n\\033[1;36m==> %s\\033[0m\\n' "$*"; }

if [ "$(id -u)" -eq 0 ]; then echo "Run this as your normal user, not root. It asks for sudo when it needs it."; exit 1; fi
command -v kwriteconfig6 >/dev/null || { echo "kwriteconfig6 not found: this script needs KDE Plasma 6."; exit 1; }
. /etc/os-release
case " \${ID:-} \${ID_LIKE:-} " in
  ${ids}) ;;
  *) warn "This script was made for ${d.long}, but this system is \${PRETTY_NAME:-unknown}. Package names may differ." ;;
esac
echo "Plasma: $(plasmashell --version 2>/dev/null | awk '{print $2}')"
`;
    if (skipped.length) {
      out += `\n# Skipped because they can't be used on ${d.name}:\n` + skipped.map((x) => `#   - ${x.label}: ${x.reason}`).join('\n') + '\n';
    }
    out += `
if [ "\${1:-}" != "-y" ]; then
  read -rp "Apply rice '${s.name.replace(/'/g, '')}' now? A backup is made first. [y/N] " ans
  case "$ans" in [yY]*) ;; *) echo "Nothing changed."; exit 0 ;; esac
fi
`;
    steps.forEach((st, i) => {
      out += `\n# --- ${i + 1}. ${st.title} ${'-'.repeat(Math.max(3, 60 - st.title.length))}\n`;
      if (st.note) out += `# ${st.note}\n`;
      out += `step ${sq(`${i + 1}/${steps.length} ${st.title}`)}\n${st.cmds}\n`;
    });
    return out;
  }

  RB.gen = { buildSteps, buildScript, schemeName, slug, fileName, panelJS, WALLDIR };
})((window.RB = window.RB || {}));
