/* Rice Cooker — colour engine
 * Colour maths, wallpaper palette extraction (k-means), scheme suggestions,
 * and generators for KDE .colors, Konsole .colorscheme and kitty theme files.
 * Plain script (no modules) so index.html also works when opened from disk.
 */
(function (RB) {
  'use strict';

  /* ---------- basic colour maths ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hexToRgb = (h) => {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgbToHex = (r, g, b) =>
    '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
  const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  };
  const hslToRgb = (h, s, l) => {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  };
  const hsl = (h, s, l) => rgbToHex(...hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1)));
  const toHsl = (hex) => rgbToHsl(...hexToRgb(hex));
  const lum = (hex) => {
    const c = hexToRgb(hex).map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const mix = (a, b, t) => {
    const A = hexToRgb(a), B = hexToRgb(b);
    return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  };
  const hueDist = (a, b) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };
  /** Nudge lightness of fg until it reaches `min` contrast against bg. */
  const ensureContrast = (fg, bg, min) => {
    let [h, s, l] = toHsl(fg);
    const up = lum(bg) < 0.4;
    for (let i = 0; i < 60 && contrast(hsl(h, s, l), bg) < min; i++) {
      l = clamp(l + (up ? 0.015 : -0.015), 0, 1);
    }
    return hsl(h, s, l);
  };
  const rgbStr = (hex) => hexToRgb(hex).join(',');

  /* ---------- naming ---------- */
  const HUE_NAMES = [
    [12, 'Red'], [35, 'Orange'], [50, 'Amber'], [65, 'Yellow'], [85, 'Lime'], [150, 'Green'],
    [175, 'Teal'], [195, 'Cyan'], [215, 'Sky'], [240, 'Blue'], [260, 'Indigo'], [285, 'Violet'],
    [315, 'Magenta'], [340, 'Pink'], [360, 'Rose'],
  ];
  const colourName = (hex) => {
    const [h, s, l] = toHsl(hex);
    if (s < 0.12) return l < 0.3 ? 'Charcoal' : l > 0.75 ? 'Silver' : 'Slate';
    return (HUE_NAMES.find(([max]) => h < max) || HUE_NAMES[0])[1];
  };

  /* ---------- built-in palettes (public colour values of well-known schemes) ---------- */
  const P = (o) => Object.assign({ dark: true }, o);
  const PALETTES = {
    kinetic: P({ name: 'Kinetic Teal', bg: '#0f1416', bg2: '#151c1f', surface: '#1d2629', fg: '#d7e3e5', fgDim: '#8aa0a4', accent: '#2ec4b6', accent2: '#4dd0e1', red: '#e06c75', green: '#98c379', yellow: '#e5c07b', blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2' }),
    catppuccin: P({ name: 'Catppuccin Mocha', bg: '#1e1e2e', bg2: '#181825', surface: '#313244', fg: '#cdd6f4', fgDim: '#a6adc8', accent: '#cba6f7', accent2: '#89b4fa', red: '#f38ba8', green: '#a6e3a1', yellow: '#f9e2af', blue: '#89b4fa', magenta: '#f5c2e7', cyan: '#94e2d5' }),
    nord: P({ name: 'Nord', bg: '#2e3440', bg2: '#3b4252', surface: '#434c5e', fg: '#eceff4', fgDim: '#d8dee9', accent: '#88c0d0', accent2: '#81a1c1', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b', blue: '#5e81ac', magenta: '#b48ead', cyan: '#8fbcbb' }),
    gruvbox: P({ name: 'Gruvbox Dark', bg: '#282828', bg2: '#32302f', surface: '#504945', fg: '#ebdbb2', fgDim: '#a89984', accent: '#fe8019', accent2: '#83a598', red: '#fb4934', green: '#b8bb26', yellow: '#fabd2f', blue: '#83a598', magenta: '#d3869b', cyan: '#8ec07c' }),
    tokyonight: P({ name: 'Tokyo Night', bg: '#1a1b26', bg2: '#16161e', surface: '#24283b', fg: '#c0caf5', fgDim: '#a9b1d6', accent: '#7aa2f7', accent2: '#bb9af7', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68', blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff' }),
    rosepine: P({ name: 'Rosé Pine', bg: '#191724', bg2: '#1f1d2e', surface: '#26233a', fg: '#e0def4', fgDim: '#908caa', accent: '#c4a7e7', accent2: '#ebbcba', red: '#eb6f92', green: '#31748f', yellow: '#f6c177', blue: '#31748f', magenta: '#c4a7e7', cyan: '#9ccfd8' }),
    everforest: P({ name: 'Everforest', bg: '#2d353b', bg2: '#343f44', surface: '#3d484d', fg: '#d3c6aa', fgDim: '#9da9a0', accent: '#a7c080', accent2: '#83c092', red: '#e67e80', green: '#a7c080', yellow: '#dbbc7f', blue: '#7fbbb3', magenta: '#d699b6', cyan: '#83c092' }),
    caelestia: P({ name: 'Caelestia Dusk', bg: '#141218', bg2: '#1d1b20', surface: '#2b2930', fg: '#e6e0e9', fgDim: '#cac4d0', accent: '#d0bcff', accent2: '#efb8c8', red: '#f2b8b5', green: '#b5ccba', yellow: '#e8c38a', blue: '#a8c7fa', magenta: '#ccc2dc', cyan: '#9ecfd4' }),
    serpantinum: P({ name: 'Serpantinum Butter', bg: '#16150f', bg2: '#1f1e17', surface: '#2c2a22', fg: '#ebe7da', fgDim: '#9d998b', accent: '#e6d675', accent2: '#9fb7c8', red: '#e07a6a', green: '#a9c48f', yellow: '#e6d675', blue: '#8fb2cf', magenta: '#c89fc2', cyan: '#8cc5bd' }),
    astroland: P({ name: 'Astroland', bg: '#0b0d0d', bg2: '#121616', surface: '#1c2324', fg: '#d9d6c4', fgDim: '#8d8f86', accent: '#c39a5d', accent2: '#6f9bad', red: '#c8705d', green: '#97ad83', yellow: '#d8b673', blue: '#6f9bad', magenta: '#b08aa6', cyan: '#7fb2b0' }),
    goldenera: P({ name: 'Golden Era', bg: '#0a0603', bg2: '#140c07', surface: '#24160d', fg: '#f9edd9', fgDim: '#b59a7a', accent: '#e0893e', accent2: '#cc985f', red: '#e2593f', green: '#b5b05c', yellow: '#f0c070', blue: '#8fa7b8', magenta: '#d48a78', cyan: '#9fbfae' }),
    hybridsummer: P({ name: 'Hybrid Summer', bg: '#1e1b17', bg2: '#27231e', surface: '#342f29', fg: '#e8dcb5', fgDim: '#a59a7c', accent: '#d8bf70', accent2: '#9db4a0', red: '#d0805f', green: '#b3b56d', yellow: '#d8bf70', blue: '#8ea8b0', magenta: '#c49a8a', cyan: '#94b8a6' }),
    celestial: P({ name: 'Celestial', bg: '#050f16', bg2: '#08182a', surface: '#0f2740', fg: '#d6ebf7', fgDim: '#7f9bb0', accent: '#6cb5e0', accent2: '#4f7fd0', red: '#ef7d8a', green: '#7fd1a8', yellow: '#e8d07a', blue: '#4f8fe0', magenta: '#b08ae8', cyan: '#6cd0e0' }),
    daynight: P({ name: 'Day and Night: Day', dark: false, bg: '#f0ebda', bg2: '#e6dfca', surface: '#fbf8ef', fg: '#2d353b', fgDim: '#5c6a6c', accent: '#3f6f63', accent2: '#8a6a3c', red: '#b5483f', green: '#55783a', yellow: '#946a14', blue: '#3a6d8c', magenta: '#8a5a86', cyan: '#2f7b78' }),
    daynightNight: P({ name: 'Day and Night: Night', bg: '#232a2e', bg2: '#2d353b', surface: '#374247', fg: '#d3c6aa', fgDim: '#9da9a0', accent: '#83c092', accent2: '#e69875', red: '#e67e80', green: '#a7c080', yellow: '#dbbc7f', blue: '#7fbbb3', magenta: '#d699b6', cyan: '#83c092' }),
    aurora: P({ name: 'Aurora Pastel', bg: '#191922', bg2: '#20202c', surface: '#2b2b3a', fg: '#e8e0f2', fgDim: '#9b97ad', accent: '#e6a9ec', accent2: '#abaef0', red: '#f2a0b4', green: '#b4e0c0', yellow: '#f2dca8', blue: '#abaef0', magenta: '#e6a9ec', cyan: '#a8dcec' }),
    nothing: P({ name: 'Nothing', bg: '#000000', bg2: '#0c0c0c', surface: '#1a1a1a', fg: '#f2f2f2', fgDim: '#8a8a8a', accent: '#d71921', accent2: '#e8e8e8', red: '#ff3b3b', green: '#c8c8c8', yellow: '#e8e8e8', blue: '#bdbdbd', magenta: '#ff6b6b', cyan: '#d9d9d9' }),
    nier: P({ name: 'NieR Parchment', dark: false, bg: '#dad4bb', bg2: '#cdc6aa', surface: '#e6e1cc', fg: '#4e4b42', fgDim: '#7a7563', accent: '#57544a', accent2: '#b35a3c', red: '#a34a3a', green: '#5f6e45', yellow: '#8a7130', blue: '#4f6470', magenta: '#7a5368', cyan: '#4f7066' }),
    duskhide: P({ name: 'Duskhide', bg: '#11151a', bg2: '#15191d', surface: '#233648', fg: '#e3dcc6', fgDim: '#949172', accent: '#d08a4f', accent2: '#c9b26a', red: '#d0684f', green: '#9aa56a', yellow: '#d9b867', blue: '#6f93b0', magenta: '#b5859a', cyan: '#7fa9a3' }),
    paper: P({ name: 'Paper Light', dark: false, bg: '#f4f1ea', bg2: '#ebe6dc', surface: '#ffffff', fg: '#2b2a27', fgDim: '#6b675f', accent: '#c2553a', accent2: '#2f6fb0', red: '#b3261e', green: '#4f7a28', yellow: '#a06a00', blue: '#2f6fb0', magenta: '#8a4fa3', cyan: '#2a8a8a' }),
  };

  /* ---------- wallpaper extraction ---------- */
  function seeded(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }
  /** k-means over downsampled pixels; returns clusters sorted by population. */
  function extractFromImage(img, k = 8) {
    const max = 128;
    const scale = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const w = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const pts = [];
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) pts.push([data[i], data[i + 1], data[i + 2]]);
    if (!pts.length) return [];
    const rnd = seeded(pts.length);
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    // k-means++ init
    const cents = [pts[Math.floor(rnd() * pts.length)].slice()];
    while (cents.length < k) {
      const dist = pts.map((p) => Math.min(...cents.map((q) => d2(p, q))));
      const sum = dist.reduce((a, b) => a + b, 0);
      if (!sum) break;
      let r = rnd() * sum, i = 0;
      while ((r -= dist[i]) > 0 && i < pts.length - 1) i++;
      cents.push(pts[i].slice());
    }
    const assign = new Array(pts.length).fill(0);
    for (let it = 0; it < 14; it++) {
      for (let i = 0; i < pts.length; i++) {
        let best = 0, bd = Infinity;
        for (let j = 0; j < cents.length; j++) {
          const d = d2(pts[i], cents[j]);
          if (d < bd) { bd = d; best = j; }
        }
        assign[i] = best;
      }
      const sums = cents.map(() => [0, 0, 0, 0]);
      pts.forEach((p, i) => { const s = sums[assign[i]]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++; });
      sums.forEach((s, j) => { if (s[3]) cents[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    }
    const counts = cents.map(() => 0);
    assign.forEach((a) => counts[a]++);
    return cents
      .map((c, j) => {
        const hex = rgbToHex(...c);
        const [hh, ss, ll] = toHsl(hex);
        return { hex, pop: counts[j] / pts.length, h: hh, s: ss, l: ll };
      })
      .filter((c) => c.pop > 0.004)
      .sort((a, b) => b.pop - a.pop);
  }

  /* ---------- scheme building ---------- */
  const ANSI_HUES = { red: 355, green: 130, yellow: 45, blue: 215, magenta: 300, cyan: 180 };
  function buildScheme({ name, dark, baseHue, baseSat, accent, accent2, mute = 1 }) {
    const bs = clamp(baseSat, 0.05, 0.45);
    const bg = dark ? hsl(baseHue, bs * 0.55, 0.085) : hsl(baseHue, bs * 0.4, 0.95);
    const bg2 = dark ? hsl(baseHue, bs * 0.55, 0.115) : hsl(baseHue, bs * 0.4, 0.91);
    const surface = dark ? hsl(baseHue, bs * 0.5, 0.155) : hsl(baseHue, bs * 0.25, 0.99);
    const fg = dark ? hsl(baseHue, 0.18, 0.88) : hsl(baseHue, 0.2, 0.14);
    const fgDim = dark ? hsl(baseHue, 0.12, 0.62) : hsl(baseHue, 0.1, 0.4);
    const tune = (hex, sMin, sMax, l) => {
      const [h, s] = toHsl(hex);
      return hsl(h, clamp(s, sMin, sMax) * mute, l);
    };
    const acc = ensureContrast(tune(accent, 0.45, 0.85, dark ? 0.62 : 0.42), bg, 4.5);
    const acc2 = ensureContrast(tune(accent2, 0.35, 0.8, dark ? 0.68 : 0.38), bg, 3.5);
    const accH = toHsl(acc)[0];
    const out = { name, dark, bg, bg2, surface, fg, fgDim, accent: acc, accent2: acc2 };
    for (const [key, target] of Object.entries(ANSI_HUES)) {
      let delta = ((accH - target + 540) % 360) - 180;
      const h = target + delta * 0.12;
      out[key] = ensureContrast(hsl(h, (dark ? 0.62 : 0.58) * mute, dark ? 0.68 : 0.4), bg, 3.5);
    }
    return out;
  }

  /** Turn extracted clusters into 4–5 scheme suggestions. */
  function suggestFromClusters(clusters) {
    if (!clusters.length) return [];
    const dom = clusters[0];
    const score = (c) => c.s * (1 - Math.min(1, Math.abs(c.l - 0.55) * 1.4)) * (0.35 + Math.sqrt(c.pop));
    const byVibe = clusters.slice().sort((a, b) => score(b) - score(a));
    const acc = byVibe[0];
    const acc2 =
      byVibe.find((c) => hueDist(c.h, acc.h) > 40 && c.s > 0.15) ||
      { hex: hsl(acc.h + 35, acc.s, acc.l), h: acc.h + 35, s: acc.s };
    // darkest substantial cluster sets the mood of the background
    const darkish = clusters.filter((c) => c.pop > 0.05).sort((a, b) => a.l - b.l)[0] || dom;
    const nm = colourName(acc.hex);
    const list = [
      buildScheme({ name: `Night ${nm}`, dark: true, baseHue: darkish.h, baseSat: darkish.s, accent: acc.hex, accent2: acc2.hex }),
      buildScheme({ name: `Neon ${nm}`, dark: true, baseHue: acc.h, baseSat: 0.42, accent: hsl(acc.h, Math.max(acc.s, 0.8), 0.6), accent2: acc2.hex }),
      buildScheme({ name: `Daylight ${nm}`, dark: false, baseHue: dom.h, baseSat: dom.s, accent: acc.hex, accent2: acc2.hex }),
      buildScheme({ name: `Muted ${colourName(dom.hex)}`, dark: true, baseHue: dom.h, baseSat: dom.s * 0.6, accent: mix(acc.hex, dom.hex, 0.35), accent2: acc2.hex, mute: 0.55 }),
    ];
    // Material-style tonal scheme (Caelestia / matugen look): tinted surfaces, pastel primary
    {
      const h = acc.h;
      list.push({ name: `Material ${nm}`, dark: true, bg: hsl(h, 0.14, 0.075), bg2: hsl(h, 0.13, 0.11), surface: hsl(h, 0.12, 0.17),
        fg: hsl(h, 0.2, 0.9), fgDim: hsl(h, 0.1, 0.72), accent: hsl(h, 0.75, 0.82), accent2: hsl(h + 40, 0.55, 0.8),
        red: hsl(4, 0.7, 0.8), green: hsl(140, 0.35, 0.76), yellow: hsl(42, 0.65, 0.76), blue: hsl(215, 0.75, 0.82), magenta: hsl(300, 0.3, 0.8), cyan: hsl(185, 0.4, 0.75) });
    }
    // closest classic scheme by accent hue and darkness
    let best = null, bd = Infinity;
    for (const [id, p] of Object.entries(PALETTES)) {
      const d = hueDist(toHsl(p.accent)[0], acc.h) + (p.dark ? 0 : 60) + hueDist(toHsl(p.bg)[0], darkish.h) * 0.3;
      if (d < bd) { bd = d; best = id; }
    }
    if (best) list.push(Object.assign({}, PALETTES[best], { name: `${PALETTES[best].name} (closest classic)` }));
    return list;
  }

  /* ---------- theme file generators ---------- */
  function kdeColors(p, schemeName) {
    const negative = p.red, neutral = p.yellow, positive = p.green;
    const link = p.accent2, visited = p.magenta;
    const sec = (title, bgN, bgA, fgN, fgI, extra = {}) => {
      const o = Object.assign({
        BackgroundAlternate: bgA, BackgroundNormal: bgN, DecorationFocus: p.accent, DecorationHover: p.accent,
        ForegroundActive: p.accent, ForegroundInactive: fgI, ForegroundLink: link, ForegroundNegative: negative,
        ForegroundNeutral: neutral, ForegroundNormal: fgN, ForegroundPositive: positive, ForegroundVisited: visited,
      }, extra);
      return `[${title}]\n` + Object.keys(o).sort().map((k) => `${k}=${rgbStr(o[k])}`).join('\n') + '\n';
    };
    const selFg = contrast('#ffffff', p.accent) >= contrast('#111111', p.accent) ? '#ffffff' : '#111111';
    const header = p.dark ? mix(p.bg, '#000000', 0.15) : mix(p.bg2, '#000000', 0.03);
    return [
      '[ColorEffects:Disabled]\nColor=56,56,56\nColorAmount=0\nColorEffect=0\nContrastAmount=0.65\nContrastEffect=1\nIntensityAmount=0.1\nIntensityEffect=2\n',
      '[ColorEffects:Inactive]\nChangeSelectionColor=true\nColor=112,111,110\nColorAmount=0.025\nColorEffect=2\nContrastAmount=0.1\nContrastEffect=2\nEnable=false\nIntensityAmount=0\nIntensityEffect=0\n',
      sec('Colors:Button', p.surface, mix(p.surface, p.fg, 0.06), p.fg, p.fgDim),
      sec('Colors:Complementary', p.bg2, p.surface, p.fg, p.fgDim),
      sec('Colors:Header', header, p.bg2, p.fg, p.fgDim),
      sec('Colors:Header][Inactive', p.bg, p.bg2, p.fg, p.fgDim),
      sec('Colors:Selection', p.accent, mix(p.accent, p.bg, 0.25), selFg, mix(selFg, p.accent, 0.35), { ForegroundActive: selFg }),
      sec('Colors:Tooltip', p.bg2, p.surface, p.fg, p.fgDim),
      sec('Colors:View', p.bg, p.bg2, p.fg, p.fgDim),
      sec('Colors:Window', p.bg2, p.surface, p.fg, p.fgDim),
      `[General]\nColorScheme=${schemeName}\nName=${schemeName}\nshadeSortColumn=true\n`,
      '[KDE]\ncontrast=4\n',
      `[WM]\nactiveBackground=${rgbStr(header)}\nactiveBlend=${rgbStr(p.fg)}\nactiveForeground=${rgbStr(p.fg)}\ninactiveBackground=${rgbStr(p.bg)}\ninactiveBlend=${rgbStr(p.fgDim)}\ninactiveForeground=${rgbStr(p.fgDim)}\n`,
    ].join('\n');
  }

  const ansi16 = (p) => {
    const black = p.dark ? mix(p.bg, '#000000', 0.2) : mix(p.fg, '#000000', 0.1);
    const white = p.dark ? p.fgDim : mix(p.bg, '#000000', 0.12);
    const base = [black, p.red, p.green, p.yellow, p.blue, p.magenta, p.cyan, white];
    const bright = base.map((c, i) =>
      i === 0 ? mix(black, p.fg, 0.35) : i === 7 ? p.fg : mix(c, p.dark ? '#ffffff' : '#000000', 0.18));
    return base.concat(bright);
  };

  function konsoleScheme(p, schemeName, opacity = 0.92) {
    const c = ansi16(p);
    let s = '';
    s += `[Background]\nColor=${rgbStr(p.bg)}\n\n[BackgroundIntense]\nColor=${rgbStr(p.bg2)}\n\n`;
    for (let i = 0; i < 8; i++) {
      s += `[Color${i}]\nColor=${rgbStr(c[i])}\n\n[Color${i}Intense]\nColor=${rgbStr(c[i + 8])}\n\n`;
    }
    s += `[Foreground]\nColor=${rgbStr(p.fg)}\n\n[ForegroundIntense]\nColor=${rgbStr(p.fg)}\n\n`;
    s += `[General]\nBlur=true\nDescription=${schemeName}\nOpacity=${opacity}\nWallpaper=\n`;
    return s;
  }

  function kittyTheme(p, schemeName, opacity = 0.92) {
    const c = ansi16(p);
    const selFg = contrast('#ffffff', p.accent) >= contrast('#111111', p.accent) ? '#ffffff' : '#111111';
    let s = `# ${schemeName} — generated by Rice Cooker\n`;
    s += `foreground ${p.fg}\nbackground ${p.bg}\nbackground_opacity ${opacity}\n`;
    s += `selection_foreground ${selFg}\nselection_background ${p.accent}\n`;
    s += `cursor ${p.accent}\ncursor_text_color ${p.bg}\nurl_color ${p.accent2}\n`;
    s += `active_border_color ${p.accent}\ninactive_border_color ${p.surface}\n`;
    s += `active_tab_foreground ${p.bg}\nactive_tab_background ${p.accent}\ninactive_tab_foreground ${p.fgDim}\ninactive_tab_background ${p.bg2}\n`;
    c.forEach((col, i) => { s += `color${i} ${col}\n`; });
    return s;
  }

  RB.color = {
    clamp, hexToRgb, rgbToHex, toHsl, hsl, lum, contrast, mix, hueDist, ensureContrast, colourName, rgbStr,
    PALETTES, extractFromImage, suggestFromClusters, buildScheme, kdeColors, konsoleScheme, kittyTheme, ansi16,
  };
})((window.RB = window.RB || {}));
