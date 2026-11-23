/* Rice Cooker — built-in presets and procedural sample wallpapers. */
(function (RB) {
  'use strict';
  const { PALETTES } = RB.color;

  /* ---------- sample wallpapers drawn on a canvas (no image files needed) ---------- */
  function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
  const GENS = {
    tealdusk: { title: 'Teal Dusk', draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#031417'); g.addColorStop(0.55, '#0b3a3e'); g.addColorStop(1, '#1b7a72');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const sun = ctx.createRadialGradient(w * 0.68, h * 0.52, 0, w * 0.68, h * 0.52, h * 0.32);
      sun.addColorStop(0, 'rgba(160,255,230,0.95)'); sun.addColorStop(0.18, 'rgba(80,220,200,0.55)'); sun.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
      const r = rng(7);
      ['#0d2f33', '#082226', '#041619'].forEach((col, k) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h);
        let y = h * (0.62 + k * 0.1);
        for (let x = 0; x <= w; x += w / 14) { y += (r() - 0.5) * h * 0.09; ctx.lineTo(x, Math.min(h * 0.95, Math.max(h * 0.45, y))); }
        ctx.lineTo(w, h); ctx.fill();
      });
    } },
    aurora: { title: 'Aurora', draw(ctx, w, h) {
      ctx.fillStyle = '#050816'; ctx.fillRect(0, 0, w, h);
      const r = rng(42);
      for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,255,255,${r() * 0.8})`; ctx.fillRect(r() * w, r() * h * 0.7, 1.4, 1.4); }
      ctx.filter = `blur(${Math.round(h / 40)}px)`;
      [['rgba(80,255,170,0.55)', 0.35], ['rgba(150,90,255,0.45)', 0.48], ['rgba(40,200,255,0.35)', 0.28]].forEach(([col, yy], k) => {
        ctx.strokeStyle = col; ctx.lineWidth = h * 0.09; ctx.beginPath();
        ctx.moveTo(-50, h * yy);
        ctx.bezierCurveTo(w * 0.3, h * (yy - 0.25 + k * 0.08), w * 0.6, h * (yy + 0.22), w + 50, h * (yy - 0.1));
        ctx.stroke();
      });
      ctx.filter = 'none';
      ctx.fillStyle = '#02040b'; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += w / 40) ctx.lineTo(x, h * 0.86 - Math.abs(Math.sin(x * 0.013)) * h * 0.06 - r() * h * 0.02);
      ctx.lineTo(w, h); ctx.fill();
    } },
    ember: { title: 'Ember Dunes', draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#16070c'); g.addColorStop(0.45, '#5b1a22'); g.addColorStop(0.75, '#d9622b'); g.addColorStop(1, '#f2a541');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ['#7a2a1f', '#4d1a17', '#2b0f10'].forEach((col, k) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * (0.7 + k * 0.09) + Math.sin(x / w * Math.PI * (2 + k) + k) * h * 0.05);
        ctx.lineTo(w, h); ctx.fill();
      });
    } },
    nebula: { title: 'Nebula', draw(ctx, w, h) {
      ctx.fillStyle = '#0b0614'; ctx.fillRect(0, 0, w, h);
      const r = rng(99);
      for (let i = 0; i < 9; i++) {
        const x = r() * w, y = r() * h, rad = h * (0.2 + r() * 0.35);
        const cols = ['rgba(203,166,247,0.35)', 'rgba(245,194,231,0.28)', 'rgba(137,180,250,0.3)'];
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, cols[i % 3]); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(255,255,255,${r() * 0.9})`; ctx.fillRect(r() * w, r() * h, 1.3, 1.3); }
    } },
    paper: { title: 'Paper Hills', draw(ctx, w, h) {
      ctx.fillStyle = '#f4efe4'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e9b8a0'; ctx.beginPath(); ctx.arc(w * 0.72, h * 0.34, h * 0.13, 0, Math.PI * 2); ctx.fill();
      ['#d8cfbf', '#c8b9a2', '#a89880', '#c2553a'].forEach((col, k) => {
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h * (0.55 + k * 0.1) + Math.sin(x / w * Math.PI * (1.4 + k * 0.5) + k * 2) * h * 0.06);
        ctx.lineTo(w, h); ctx.fill();
      });
    } },
    forest: { title: 'Pine Fog', draw(ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#9fb3a4'); g.addColorStop(1, '#2d353b');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const r = rng(5);
      ['rgba(80,100,85,0.6)', 'rgba(52,70,60,0.8)', '#232b26'].forEach((col, k) => {
        ctx.fillStyle = col;
        for (let i = 0; i < 26; i++) {
          const x = r() * w, base = h * (0.62 + k * 0.13), th = h * (0.18 + r() * 0.16);
          ctx.beginPath(); ctx.moveTo(x, base - th); ctx.lineTo(x - th * 0.22, base); ctx.lineTo(x + th * 0.22, base); ctx.fill();
        }
        ctx.fillRect(0, h * (0.62 + k * 0.13), w, h);
      });
    } },
  };

  function renderGen(id, w = 1920, h = 1080) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    GENS[id].draw(c.getContext('2d'), w, h);
    return c;
  }

  /* ---------- default state ---------- */
  const base = () => ({
    v: 1, name: 'My rice', desktop: 'kde', distro: 'debian', useAur: true,
    palette: Object.assign({}, PALETTES.kinetic),
    globalTheme: 'org.kde.breezedark.desktop', plasmaStyle: 'default', widgetStyle: 'Breeze', kvantumTheme: 'KvArcDark',
    icons: 'Papirus-Dark', papirusFolders: true, cursor: 'Bibata-Modern-Ice',
    fonts: { ui: 'Noto Sans', mono: 'JetBrains Mono', size: 10 },
    colors: { konsole: true, kitty: false, accentFromWallpaper: false, termOpacity: 0.92 },
    decor: { buttons: 'keep', borderlessMax: false, noBorders: false },
    anim: { switcher: 'thumbnail_grid', openClose: 'scale', minimize: 'magiclamp', desktopSwitch: 'slide', speed: 1, wobbly: false, blur: true, blurStrength: 8, blurNoise: 0, translucency: false, dimInactive: false, slidingPopups: true, cube: false, shakeCursor: false },
    panel: 'keep',
    extras: { roundedCorners: false, betterBlur: false, panelColorizer: false, termExtras: false },
    wallpapers: [], activeWallpaper: 0,
    cycle: { enabled: false, interval: 'off', order: 'next' },
  });

  const deep = (a, b) => {
    for (const k of Object.keys(b)) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deep(a[k], b[k]);
      else a[k] = b[k];
    }
    return a;
  };
  const make = (o) => deep(base(), o);
  const wall = (gen, palette) => ({ name: `rb-${gen}.png`, gen, palette: palette ? Object.assign({}, PALETTES[palette]) : 'auto' });

  const BUILTIN = {
    caelestia: make({
      name: 'Caelestia (KDE)', palette: PALETTES.caelestia, icons: 'Papirus-Dark', cursor: 'Bibata-Modern-Classic',
      fonts: { ui: 'Inter', mono: 'JetBrainsMono Nerd Font', size: 10 }, colors: { kitty: true, termOpacity: 0.86 },
      decor: { buttons: 'minimal', borderlessMax: true, noBorders: true },
      anim: { switcher: 'thumbnail_grid', openClose: 'glide', minimize: 'magiclamp', desktopSwitch: 'slide', speed: 1.5, blur: true, blurStrength: 12, blurNoise: 2 },
      panel: 'leftbar', extras: { roundedCorners: true, termExtras: true },
      wallpapers: [wall('nebula', 'caelestia'), wall('aurora'), wall('tealdusk')],
      cycle: { enabled: true, interval: '1h', order: 'next' },
    }),
    kinetic: make({
      name: 'Kinetic Teal', palette: PALETTES.kinetic, icons: 'Papirus-Dark', cursor: 'Bibata-Modern-Ice',
      fonts: { ui: 'JetBrainsMono Nerd Font', mono: 'JetBrainsMono Nerd Font', size: 10 },
      colors: { kitty: true }, decor: { buttons: 'keep' },
      anim: { switcher: 'coverswitch', openClose: 'glide', minimize: 'magiclamp', wobbly: true, blur: true, translucency: true },
      panel: 'topbar-dock', extras: { termExtras: true },
      wallpapers: [wall('tealdusk', 'kinetic'), wall('aurora'), wall('nebula')],
      cycle: { enabled: true, interval: '1h', order: 'next' },
    }),
    catppuccin: make({
      name: 'Catppuccin Dock', palette: PALETTES.catppuccin, icons: 'Papirus-Dark', cursor: 'Bibata-Modern-Classic',
      fonts: { ui: 'Inter', mono: 'JetBrainsMono Nerd Font', size: 10 }, colors: { kitty: true },
      decor: { buttons: 'mac', borderlessMax: true },
      anim: { switcher: 'coverswitch', openClose: 'glide', minimize: 'magiclamp', speed: 1.5, blur: true, blurStrength: 10 },
      panel: 'topbar-dock', extras: { roundedCorners: true },
      wallpapers: [wall('nebula', 'catppuccin')],
    }),
    nord: make({
      name: 'Nord Minimal', palette: PALETTES.nord, icons: 'Papirus-Dark', cursor: 'breeze_cursors',
      fonts: { ui: 'JetBrains Mono', mono: 'JetBrains Mono', size: 10 },
      decor: { buttons: 'minimal', borderlessMax: true, noBorders: true },
      anim: { switcher: 'compact', openClose: 'fade', minimize: 'squash', desktopSwitch: 'fadedesktop', speed: 0.5, blur: false },
      panel: 'minimal', wallpapers: [wall('forest', 'nord')],
    }),
    gruvbox: make({
      name: 'Gruvbox Retro', palette: PALETTES.gruvbox, icons: 'Papirus-Dark', cursor: 'Bibata-Modern-Amber',
      fonts: { ui: 'Noto Sans', mono: 'Fira Code', size: 10 }, decor: { buttons: 'windows' },
      anim: { switcher: 'big_icons', openClose: 'scale', minimize: 'squash', blur: false },
      panel: 'win11', extras: { termExtras: true }, wallpapers: [wall('ember', 'gruvbox')],
    }),
    tokyo: make({
      name: 'Tokyo Night Unity', palette: PALETTES.tokyonight, icons: 'tela', cursor: 'Bibata-Modern-Ice',
      fonts: { ui: 'Inter', mono: 'JetBrainsMono Nerd Font', size: 10 }, colors: { kitty: true }, decor: { buttons: 'mac' },
      anim: { switcher: 'flipswitch', openClose: 'fallapart', minimize: 'magiclamp', cube: true, wobbly: true, blur: true },
      panel: 'unity', wallpapers: [wall('aurora', 'tokyonight'), wall('nebula')], cycle: { enabled: true, interval: 'off' },
    }),
    rosepine: make({
      name: 'Rosé Pine Float', palette: PALETTES.rosepine, icons: 'Papirus-Dark', cursor: 'Bibata-Modern-Classic',
      fonts: { ui: 'Inter', mono: 'JetBrains Mono', size: 10 }, decor: { buttons: 'mac', borderlessMax: true },
      anim: { switcher: 'sidebar', openClose: 'glide', minimize: 'magiclamp', speed: 1.5, blur: true, blurStrength: 12, blurNoise: 3, dimInactive: true },
      panel: 'dock', extras: { roundedCorners: true, panelColorizer: true }, wallpapers: [wall('nebula', 'rosepine')],
    }),
    paper: make({
      name: 'Paper Light', palette: PALETTES.paper, globalTheme: 'org.kde.breeze.desktop', icons: 'Papirus-Light', cursor: 'Bibata-Modern-Classic',
      fonts: { ui: 'Inter', mono: 'JetBrains Mono', size: 10 }, decor: { buttons: 'windows' },
      anim: { switcher: 'thumbnail_grid', openClose: 'scale', minimize: 'squash', blur: false },
      panel: 'classic', wallpapers: [wall('paper', 'paper')],
    }),
  };

  RB.presets = { GENS, renderGen, base, deep, BUILTIN };
})((window.RB = window.RB || {}));
