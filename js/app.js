/* Rice Cooker — UI controller. */
(function (RB) {
  'use strict';
  const C = RB.color, K = RB.catalog, PR = RB.presets, G = RB.gen;
  const { DISTROS, DESKTOPS, OPTIONS, FEATURES } = K;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const LS = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } } };

  let S;                       // current rice
  let tab = 'colours';
  let outMode = 'steps';
  let presetKey = 'builtin:serpantinum';
  const wallSrc = {};          // name -> preview data URL
  const wallOrig = {};         // name -> original file as data URL (desktop app saves these)
  const clusters = {};         // name -> extracted colours
  const sugg = {};             // name -> suggested schemes
  const openSugg = new Set();
  let cycling = null;

  /* ---------- helpers ---------- */
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function download(name, text, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  async function copy(text, what = 'Copied') {
    try { await navigator.clipboard.writeText(text); toast(what); }
    catch (e) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast(what); }
  }
  const normalise = (o) => { const b = PR.deep(PR.base(), clone(o)); b.palette = Object.assign({}, PR.base().palette, o.palette || {}); return b; };

  /* ---------- theme the page from the palette ---------- */
  function applyTheme(p = S.palette) {
    // the full palette only themes the preview desktop
    const d = $('#desk').style;
    const map = { bg: p.bg, bg2: p.bg2, surface: p.surface, fg: p.fg, dim: p.fgDim, accent: p.accent, accent2: p.accent2, red: p.red, green: p.green, yellow: p.yellow, blue: p.blue, magenta: p.magenta, cyan: p.cyan };
    for (const [k, v] of Object.entries(map)) d.setProperty(`--p-${k}`, v);
    const onAcc = (c) => (C.contrast('#ffffff', c) >= C.contrast('#0a0a0a', c) ? '#ffffff' : '#0a0a0a');
    d.setProperty('--p-on-accent', onAcc(p.accent));
    // the page chrome borrows only the accent, nudged until it reads on the ground
    const ground = getComputedStyle(document.documentElement).getPropertyValue('--ground').trim() || '#0A0A0A';
    const acc = C.ensureContrast(p.accent, ground, 3);
    document.documentElement.style.setProperty('--accent', acc);
    document.documentElement.style.setProperty('--on-accent', onAcc(acc));
  }
  function wireTheme() {
    $('#themeBtn').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
      const next = cur === 'light' ? 'dark' : 'light';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('rc.theme', next); } catch (e) {}
      applyTheme();
    });
    matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme());
    document.querySelectorAll('[data-tab-link]').forEach((a) => a.addEventListener('click', () => goTab(a.dataset.tabLink)));
  }

  /* ---------- compatibility ---------- */
  function dots(fid) {
    if (!fid) return '';
    return '<span class="cdots">' + Object.keys(DISTROS).map((d) => {
      const c = K.compat(fid, d, { aur: S.useAur });
      const cls = !c.ok ? 'no' : ['aur', 'manual', 'build'].includes(c.how) ? 'alt' : '';
      const how = !c.ok ? `can't be used: ${c.reason}` : { pkg: 'package', aur: 'AUR', manual: 'downloaded', build: 'built from source', builtin: 'built in' }[c.how];
      return `<i class="cdot ${cls}" title="${esc(DISTROS[d].name)}: ${esc(how)}"></i>`;
    }).join('') + '</span>';
  }
  function compatNote(fid) {
    if (!fid) return '';
    const d = DISTROS[S.distro], c = K.compat(fid, S.distro, { aur: S.useAur });
    if (!c.ok) return `<div class="incompat">This customisation can't be used on ${esc(d.name)}: ${esc(c.reason)}. It will be skipped.</div>`;
    if (c.how === 'aur') return `<div class="altnote">On ${esc(d.name)} this comes from the AUR (needs paru or yay)${c.manualFallback ? ', with a direct download as fallback' : ''}.</div>`;
    if (c.how === 'manual') return `<div class="altnote">Not packaged on ${esc(d.name)}: the script downloads it from the project's GitHub.</div>`;
    if (c.how === 'build') return `<div class="altnote">On ${esc(d.name)} this is built from source (takes a few minutes).</div>`;
    return '';
  }

  /* ---------- form widgets ---------- */
  function selectRow(label, listKey, get, setv, hint) {
    const list = OPTIONS[listKey];
    const cur = get();
    const opt = list.find((o) => String(o.id) === String(cur));
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<label><span>${esc(label)}</span>${opt && opt.feature ? dots(opt.feature) : ''}</label>
      <select>${list.map((o) => {
        const bad = o.feature && !K.compat(o.feature, S.distro, { aur: S.useAur }).ok;
        return `<option value="${esc(o.id)}" ${String(o.id) === String(cur) ? 'selected' : ''}>${esc(o.label)}${bad ? ` (not on ${DISTROS[S.distro].name})` : ''}</option>`;
      }).join('')}</select>${opt && opt.feature ? compatNote(opt.feature) : ''}${hint ? `<div class="hint">${hint}</div>` : ''}`;
    row.querySelector('select').addEventListener('change', (e) => {
      const o = list.find((x) => String(x.id) === e.target.value);
      setv(o.id); refresh(); renderTab();
    });
    return row;
  }
  function toggleRow(label, get, setv, fid, hint) {
    const row = document.createElement('div');
    row.innerHTML = `<label class="toggle"><input type="checkbox" ${get() ? 'checked' : ''}><span class="t-text">${esc(label)}</span>${dots(fid)}</label>${get() ? compatNote(fid) : ''}${hint ? `<div class="hint">${hint}</div>` : ''}`;
    row.querySelector('input').addEventListener('change', (e) => { setv(e.target.checked); refresh(); renderTab(); });
    return row;
  }
  function rangeRow(label, min, max, step, get, setv, fmt = (v) => v) {
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = `<label><span>${esc(label)}</span><b>${fmt(get())}</b></label><input type="range" min="${min}" max="${max}" step="${step}" value="${get()}">`;
    row.querySelector('input').addEventListener('input', (e) => { setv(+e.target.value); row.querySelector('b').textContent = fmt(+e.target.value); refresh(); });
    return row;
  }
  function group(title, sub) {
    const g = document.createElement('div');
    g.className = 'group';
    g.innerHTML = `<h3>${esc(title)}${sub ? ` <small>${esc(sub)}</small>` : ''}</h3>`;
    return g;
  }
  const swatch = (p) => `<span class="sw">${['bg', 'surface', 'fg', 'accent', 'accent2', 'red', 'green', 'yellow', 'blue'].map((k) => `<i style="background:${p[k]}"></i>`).join('')}</span>`;
  function palCard(p, pressed, onClick) {
    const b = document.createElement('button');
    b.className = 'pal';
    b.type = 'button';
    b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    b.style.setProperty('--pb', p.bg); b.style.setProperty('--pf', p.fg);
    b.innerHTML = `<span class="nm">${esc(p.name)}</span>${swatch(p)}`;
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- palette changes keep the active wallpaper's pair in sync ---------- */
  function setPalette(p) {
    S.palette = clone(p);
    const w = S.wallpapers[S.activeWallpaper];
    if (w) w.palette = clone(p);
  }

  /* ---------- tabs ---------- */
  const TABS = [
    ...(RB.isApp ? [['mine', 'My rices']] : []),
    ['colours', 'Colours'], ['walls', 'Wallpapers'], ['look', 'Look'], ['anim', 'Motion'],
    ['panels', 'Panels'], ['extras', 'Extras'],
  ];
  // Inspiration sits outside the stages: a keynote you can open from any stage
  /* The tab strip is one row that slides: the active stage is kept centred, a bar
     glides to it, and the edges fade while more stages are hidden off to the side. */
  let lastStage = null;
  function goTab(t) {
    const changed = t !== tab;
    tab = t;
    renderTabs();
    renderTab();
    if (changed) $('#tabBody').scrollTop = 0;
  }
  function renderTabs() {
    const strip = $('#tabs');
    if (strip.dataset.count !== String(TABS.length)) {
      strip.dataset.count = TABS.length;
      strip.innerHTML = TABS.map(([id, label], i) =>
        `<button role="tab" data-tab="${id}" aria-selected="false"><b>${String(i + 1).padStart(2, '0')}</b><span>${label}</span></button>`).join('') +
        '<i class="tab-ink" aria-hidden="true"></i>';
      strip.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => goTab(b.dataset.tab)));
      strip.addEventListener('scroll', () => edgeFades(strip), { passive: true });
      // a plain mouse wheel scrolls the strip sideways
      strip.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && strip.scrollWidth > strip.clientWidth) { strip.scrollLeft += e.deltaY; e.preventDefault(); }
      }, { passive: false });
      // arrow keys move between stages, like a proper tab list
      strip.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const i = TABS.findIndex(([id]) => id === tab) + (e.key === 'ArrowRight' ? 1 : -1);
        if (TABS[i]) { goTab(TABS[i][0]); strip.querySelector(`[data-tab="${TABS[i][0]}"]`).focus(); e.preventDefault(); }
      });
      window.addEventListener('resize', () => { placeInk(strip, false); edgeFades(strip); });
      // where you are: "Stage 4 of 8 · Look" and a bar with one segment per stage
      const wrap = strip.closest('.tabs-wrap');
      let meter = wrap.querySelector('.stage-meter');
      if (!meter) { meter = document.createElement('div'); meter.className = 'stage-meter'; wrap.appendChild(meter); }
      meter.innerHTML = `<div class="sm-text"><span class="sm-now"></span></div>
        <div class="sm-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${TABS.length}">${TABS.map(([id, label]) => `<button type="button" data-tab="${id}" title="${label}" aria-label="Go to ${label}"></button>`).join('')}</div>`;
      meter.querySelectorAll('.sm-bar button').forEach((b) => b.addEventListener('click', () => goTab(b.dataset.tab)));
      const kn = $('#keynoteBtn');
      if (kn) kn.addEventListener('click', () => goTab(tab === 'ideas' ? (lastStage || TABS[0][0]) : 'ideas'));
    }
    if (tab !== 'ideas') lastStage = tab;
    const kn = $('#keynoteBtn');
    if (kn) kn.setAttribute('aria-pressed', tab === 'ideas');
    const idx = TABS.findIndex(([id]) => id === tab);
    const meter = strip.closest('.tabs-wrap').querySelector('.stage-meter');
    if (meter && idx < 0) {
      meter.querySelector('.sm-now').innerHTML = `Keynote <b>Inspiration</b>`;
      meter.querySelectorAll('.sm-bar button').forEach((b) => b.classList.remove('on'));
    }
    if (meter && idx >= 0) {
      meter.querySelector('.sm-now').innerHTML = `Stage ${idx + 1} of ${TABS.length} <b>${TABS[idx][1]}</b>`;
      meter.querySelectorAll('.sm-bar button').forEach((b, i) => { b.classList.toggle('done', i < idx); b.classList.toggle('on', i === idx); });
      const bar = meter.querySelector('.sm-bar');
      bar.setAttribute('aria-valuenow', idx + 1);
      bar.setAttribute('aria-valuetext', `Stage ${idx + 1} of ${TABS.length}: ${TABS[idx][1]}`);
    }
    strip.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.setAttribute('aria-selected', on);
      b.tabIndex = on ? 0 : -1;
    });
    requestAnimationFrame(() => placeInk(strip, true));
  }
  function placeInk(strip, slide) {
    const b = strip.querySelector(`[data-tab="${tab}"]`), ink = strip.querySelector('.tab-ink');
    if (ink) ink.style.opacity = b ? 1 : 0;
    if (!b || !ink) { edgeFades(strip); return; }
    ink.style.transform = `translateX(${b.offsetLeft}px)`;
    ink.style.width = `${b.offsetWidth}px`;
    const target = Math.max(0, b.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    strip.scrollTo({ left: target, behavior: slide && !reduce ? 'smooth' : 'auto' });
    edgeFades(strip);
  }
  function edgeFades(strip) {
    strip.parentElement.classList.toggle('more-l', strip.scrollLeft > 2);
    strip.parentElement.classList.toggle('more-r', strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 2);
  }
  /* "Up next" at the bottom of every stage walks through them in order */
  function upNext(body) {
    const i = TABS.findIndex(([id]) => id === tab);
    if (i < 0 || i >= TABS.length - 1) return;
    const [id, label] = TABS[i + 1];
    const n = document.createElement('div');
    n.className = 'up-next';
    n.innerHTML = `<span class="lab-mono">Up next</span><button class="btn" type="button"><b>${String(i + 2).padStart(2, '0')}</b> ${label} <span aria-hidden="true">→</span></button>`;
    n.querySelector('button').addEventListener('click', () => goTab(id));
    body.appendChild(n);
  }

  function renderTab() {
    const body = $('#tabBody');
    const scroll = body.scrollTop;
    body.innerHTML = '';
    ({ mine: (b) => RB.appmode.tabMine(b), colours: tabColours, walls: tabWalls, look: tabLook, anim: tabAnim, panels: tabPanels, extras: tabExtras, ideas: tabIdeas }[tab])(body);
    upNext(body);
    body.scrollTop = scroll;
  }

  function tabColours(body) {
    let g = group('Colour schemes', 'click to apply');
    const grid = document.createElement('div');
    grid.className = 'pal-grid';
    for (const p of Object.values(C.PALETTES)) grid.appendChild(palCard(p, S.palette.name === p.name, () => { setPalette(p); refresh(); renderTab(); }));
    g.appendChild(grid);
    body.appendChild(g);

    g = group('Edit colours', S.palette.name);
    const ed = document.createElement('div');
    ed.className = 'pal-edit';
    const keys = [['bg', 'base'], ['bg2', 'window'], ['surface', 'button'], ['fg', 'text'], ['fgDim', 'dim'], ['accent', 'accent'], ['accent2', 'accent 2'], ['red', 'red'], ['green', 'green'], ['yellow', 'yellow'], ['blue', 'blue'], ['magenta', 'magenta'], ['cyan', 'cyan']];
    keys.forEach(([k, lab]) => {
      const l = document.createElement('label');
      l.innerHTML = `<input type="color" value="${S.palette[k]}" aria-label="${lab}"><span>${lab}</span>`;
      l.querySelector('input').addEventListener('input', (e) => {
        S.palette[k] = e.target.value;
        if (!/ \(edited\)$/.test(S.palette.name)) S.palette.name += ' (edited)';
        setPalette(S.palette); refresh();
      });
      ed.appendChild(l);
    });
    g.appendChild(ed);
    const ratio = C.contrast(S.palette.fg, S.palette.bg).toFixed(1);
    const h = document.createElement('p');
    h.className = 'hint';
    h.innerHTML = `Text contrast ${ratio}:1 ${ratio >= 7 ? '(great)' : ratio >= 4.5 ? '(fine)' : '<b style="color:var(--bad)">(too low, hard to read)</b>'}. Light or dark is detected from the base colour.`;
    g.appendChild(h);
    body.appendChild(g);

    g = group('Where the colours go');
    g.appendChild(selectRow('Base global theme (applied first)', 'globalTheme', () => S.globalTheme, (v) => { S.globalTheme = v; }));
    g.appendChild(toggleRow('Konsole colour scheme + profile', () => S.colors.konsole, (v) => { S.colors.konsole = v; }));
    g.appendChild(toggleRow('kitty theme', () => S.colors.kitty, (v) => { S.colors.kitty = v; }, 'kitty'));
    g.appendChild(rangeRow('Terminal opacity', 0.6, 1, 0.02, () => S.colors.termOpacity, (v) => { S.colors.termOpacity = v; }, (v) => `${Math.round(v * 100)}%`));
    g.appendChild(toggleRow('Let KDE pick the accent from the wallpaper (live)', () => S.colors.accentFromWallpaper, (v) => { S.colors.accentFromWallpaper = v; }, null,
      'KDE then recolours the accent every time the wallpaper changes. Leave off to keep the accent above.'));
    body.appendChild(g);
  }

  /* ---------- wallpapers ---------- */
  function tabWalls(body) {
    let g = group('Wallpapers', 'colours are picked from each one');
    const drop = document.createElement('label');
    drop.className = 'drop';
    drop.innerHTML = '<strong>Drop wallpapers here or click to choose</strong>Images stay in your browser. Each one gets matching colour schemes.<input type="file" accept="image/*" multiple hidden>';
    drop.querySelector('input').addEventListener('change', (e) => addFiles(e.target.files));
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); addFiles(e.dataTransfer.files); });
    g.appendChild(drop);

    const smp = document.createElement('div');
    smp.className = 'samples';
    smp.innerHTML = '<span class="hint" style="width:100%;margin:0">Or add a sample:</span>';
    for (const [id, gdef] of Object.entries(PR.GENS)) {
      const b = document.createElement('button');
      b.type = 'button'; b.title = gdef.title;
      b.style.backgroundImage = `url(${sampleThumb(id)})`;
      b.addEventListener('click', () => addGen(id));
      smp.appendChild(b);
    }
    g.appendChild(smp);

    const ur = document.createElement('div');
    ur.className = 'url-row';
    ur.innerHTML = '<input type="url" placeholder="…or paste an image URL (the script downloads it)" aria-label="Wallpaper URL"><button class="btn" type="button">Add</button>';
    ur.querySelector('button').addEventListener('click', () => { const v = ur.querySelector('input').value.trim(); if (v) addUrl(v); });
    g.appendChild(ur);

    const list = document.createElement('div');
    list.className = 'walls';
    S.wallpapers.forEach((w, i) => list.appendChild(wallCard(w, i)));
    if (!S.wallpapers.length) list.innerHTML = '<p class="hint">No wallpapers yet. Without one, the wallpaper step is left out.</p>';
    g.appendChild(list);
    body.appendChild(g);

    g = group('Rice cycling', 'wallpaper + colours swap together');
    g.appendChild(toggleRow('Install rice-cycle', () => S.cycle.enabled, (v) => { S.cycle.enabled = v; }, null,
      S.wallpapers.length < 2 ? 'Add at least two wallpapers. Each one keeps its own colour scheme.' :
        `Installs <code>rice-cycle</code>, a "Next Rice" app-menu entry, and ${S.wallpapers.length} colour schemes. Every swap changes wallpaper, Plasma colours, accent, Konsole and kitty together.`));
    if (S.cycle.enabled) {
      g.appendChild(selectRow('Change automatically', 'cycleInterval', () => S.cycle.interval, (v) => { S.cycle.interval = v; }));
      const ord = document.createElement('div');
      ord.className = 'row';
      ord.innerHTML = `<div class="lab">Order</div><div class="seg small">${['next', 'random'].map((o) => `<button type="button" data-o="${o}" aria-pressed="${S.cycle.order === o}">${o === 'next' ? 'In order' : 'Random'}</button>`).join('')}</div>`;
      ord.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { S.cycle.order = b.dataset.o; refresh(); renderTab(); }));
      g.appendChild(ord);
    }
    const pb = document.createElement('button');
    pb.className = 'btn'; pb.type = 'button';
    pb.textContent = cycling ? 'Stop preview' : 'Preview the cycle';
    pb.disabled = S.wallpapers.length < 2;
    pb.addEventListener('click', toggleCycle);
    g.appendChild(pb);
    const h = document.createElement('p');
    h.className = 'hint';
    h.innerHTML = `The script expects the image files in <code>~/Pictures/Wallpapers/rice-cooker/</code>. URL wallpapers are downloaded there; for the others use each card's Save button.`;
    g.appendChild(h);
    body.appendChild(g);
  }

  function wallCard(w, i) {
    const d = document.createElement('div');
    d.className = 'wall' + (i === S.activeWallpaper ? ' active' : '');
    const src = wallSrc[w.name] || w.thumb || '';
    const cl = clusters[w.name] || [];
    const p = typeof w.palette === 'object' ? w.palette : null;
    d.innerHTML = `<div class="th" style="background-image:url('${src}')">${i === S.activeWallpaper ? '<b>ACTIVE</b>' : `<b style="background:var(--p-surface);color:var(--p-fg)">${i + 1}</b>`}</div>
      <div class="meta"><div class="fn" title="${esc(w.name)}">${esc(w.name)}</div>
        ${cl.length ? `<div class="extracted" title="Colours found in the image">${cl.map((c) => `<i style="background:${c.hex};flex:${c.pop}"></i>`).join('')}</div>` : w.url && !src ? '<div class="hint" style="margin:0">Preview blocked by the site; colours not read.</div>' : ''}
        ${p ? `<div class="hint" style="margin:0">${esc(p.name)}</div>${swatch(p)}` : ''}
        <div class="acts">
          ${i !== S.activeWallpaper ? '<button class="btn small" data-a="use">Use</button>' : ''}
          ${sugg[w.name] ? `<button class="btn small" data-a="sugg">${openSugg.has(w.name) ? 'Hide schemes' : 'Matching schemes'}</button>` : ''}
          ${!w.url && src ? '<button class="btn small" data-a="save">Save</button>' : ''}
          ${i > 0 ? '<button class="btn small ghost" data-a="up" title="Move up">↑</button>' : ''}
          <button class="btn small ghost" data-a="rm" title="Remove">✕</button>
        </div></div>`;
    if (openSugg.has(w.name) && sugg[w.name]) {
      const sg = document.createElement('div');
      sg.className = 'sugg';
      sugg[w.name].forEach((sp) => sg.appendChild(palCard(sp, p && p.name === sp.name, () => {
        w.palette = clone(sp);
        if (i === S.activeWallpaper) S.palette = clone(sp);
        refresh(); renderTab();
      })));
      d.appendChild(sg);
    }
    d.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.a;
      if (a === 'use') setActive(i);
      if (a === 'sugg') { openSugg.has(w.name) ? openSugg.delete(w.name) : openSugg.add(w.name); renderTab(); return; }
      if (a === 'save') return saveWall(w);
      if (a === 'up') { S.wallpapers.splice(i - 1, 0, S.wallpapers.splice(i, 1)[0]); if (S.activeWallpaper === i) S.activeWallpaper--; else if (S.activeWallpaper === i - 1) S.activeWallpaper++; }
      if (a === 'rm') { S.wallpapers.splice(i, 1); if (S.activeWallpaper >= S.wallpapers.length) S.activeWallpaper = Math.max(0, S.wallpapers.length - 1); else if (i < S.activeWallpaper) S.activeWallpaper--; }
      refresh(); renderTab();
    }));
    return d;
  }

  function setActive(i) {
    S.activeWallpaper = i;
    const w = S.wallpapers[i];
    if (w && typeof w.palette === 'object') S.palette = clone(w.palette);
  }

  const thumbCache = {};
  function sampleThumb(id) { return thumbCache[id] || (thumbCache[id] = PR.renderGen(id, 160, 90).toDataURL('image/jpeg', 0.8)); }
  function shrink(img, max, q) {
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }
  const loadImg = (src, cors) => new Promise((res, rej) => { const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  function uniqueName(n) {
    let name = G.fileName({ name: n }), k = 2;
    while (S.wallpapers.some((w) => w.name === name)) name = name.replace(/(\.\w+)?$/, `-${k++}$1`);
    return name;
  }
  function analyse(w, img) {
    clusters[w.name] = C.extractFromImage(img);
    sugg[w.name] = C.suggestFromClusters(clusters[w.name]);
    if (w.palette === 'auto' || !w.palette) w.palette = clone(sugg[w.name][0] || S.palette);
  }
  function added(w) {
    const first = !S.wallpapers.length;
    S.wallpapers.push(w);
    openSugg.add(w.name);
    if (first) setActive(0);
    refresh(); renderTab();
  }
  async function addFiles(files) {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      const url = URL.createObjectURL(f);
      try {
        const img = await loadImg(url);
        if (RB.isApp) wallOrig[uniqueName(f.name)] = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });
        const w = { name: uniqueName(f.name), palette: 'auto', thumb: shrink(img, 480, 0.72) };
        wallSrc[w.name] = shrink(img, 1600, 0.85);
        analyse(w, img);
        added(w);
        toast(`Added ${w.name}: ${sugg[w.name].length} matching schemes`);
      } catch (e) { toast(`Couldn't read ${f.name}`); }
      URL.revokeObjectURL(url);
    }
  }
  async function addGen(id) {
    const w = { name: uniqueName(`rb-${id}.png`), gen: id, palette: 'auto' };
    await prepGen(w);
    added(w);
  }
  async function prepGen(w) {
    const c = PR.renderGen(w.gen, 1280, 720);
    wallSrc[w.name] = c.toDataURL('image/jpeg', 0.88);
    const img = await loadImg(wallSrc[w.name]);
    analyse(w, img);
  }
  async function addUrl(u) {
    let name = 'wallpaper.jpg';
    try { name = decodeURIComponent(new URL(u).pathname.split('/').pop()) || name; } catch (e) { return toast('That is not a valid URL'); }
    if (!/\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) name += '.jpg';
    const w = { name: uniqueName(name), url: u, palette: 'auto' };
    try {
      const img = await loadImg(u, true);
      wallSrc[w.name] = shrink(img, 1600, 0.85);
      w.thumb = shrink(img, 480, 0.72);
      analyse(w, img);
    } catch (e) {
      w.palette = clone(S.palette);
      toast('The site blocks previews, so colours could not be read. The script will still download it.');
    }
    added(w);
  }
  function saveWall(w) {
    const a = document.createElement('a');
    a.download = w.name;
    if (w.gen) a.href = PR.renderGen(w.gen, 2560, 1440).toDataURL('image/png');
    else a.href = wallSrc[w.name] || w.thumb;
    document.body.appendChild(a); a.click(); a.remove();
    toast(`Saved ${w.name}: move it to ~/Pictures/Wallpapers/rice-cooker/`);
  }

  async function toggleCycle() {
    if (cycling) { cycling.stop = true; return; }
    if (S.wallpapers.length < 2) return;
    const me = (cycling = { stop: false });
    const start = S.activeWallpaper;
    renderTab();
    const n = S.wallpapers.length;
    for (let k = 1; k <= n * 2 && !me.stop; k++) {
      const i = S.cycle.order === 'random' ? Math.floor(Math.random() * n) : (start + k) % n;
      setActive(i);
      refreshLight();
      await new Promise((r) => setTimeout(r, 2600));
    }
    setActive(start);
    cycling = null;
    refresh(); renderTab();
  }

  /* ---------- look ---------- */
  function tabLook(body) {
    let g = group('Style');
    g.appendChild(selectRow('Plasma style (panels, popups)', 'plasmaStyle', () => S.plasmaStyle, (v) => { S.plasmaStyle = v; }));
    g.appendChild(selectRow('Application style', 'widgetStyle', () => S.widgetStyle, (v) => { S.widgetStyle = v; }));
    if (S.widgetStyle === 'kvantum') g.appendChild(selectRow('Kvantum theme', 'kvantumTheme', () => S.kvantumTheme, (v) => { S.kvantumTheme = v; }, 'Kvantum themes bring their own colours, so apps will not use the palette.'));
    body.appendChild(g);

    g = group('Icons and cursor');
    g.appendChild(selectRow('Icon theme', 'icons', () => S.icons, (v) => { S.icons = v; }));
    if (S.icons.startsWith('Papirus')) g.appendChild(toggleRow('Recolour Papirus folders to match the accent', () => S.papirusFolders, (v) => { S.papirusFolders = v; }, 'papirusFolders'));
    g.appendChild(selectRow('Cursor', 'cursor', () => S.cursor, (v) => { S.cursor = v; }));
    body.appendChild(g);

    g = group('Fonts');
    g.appendChild(selectRow('Interface font', 'uiFont', () => S.fonts.ui, (v) => { S.fonts.ui = v; }));
    g.appendChild(selectRow('Monospace font (terminals, code)', 'monoFont', () => S.fonts.mono, (v) => { S.fonts.mono = v; }));
    g.appendChild(rangeRow('Size', 8, 13, 1, () => S.fonts.size, (v) => { S.fonts.size = v; }, (v) => `${v} pt`));
    body.appendChild(g);

    g = group('Window title bars');
    g.appendChild(selectRow('Buttons', 'buttons', () => S.decor.buttons, (v) => { S.decor.buttons = v; }));
    g.appendChild(toggleRow('Hide title bar on maximised windows', () => S.decor.borderlessMax, (v) => { S.decor.borderlessMax = v; }));
    g.appendChild(toggleRow('No window borders', () => S.decor.noBorders, (v) => { S.decor.noBorders = v; }));
    body.appendChild(g);
  }

  /* ---------- motion ---------- */
  function playBtn(kind, label) {
    const b = document.createElement('button');
    b.className = 'btn small'; b.type = 'button'; b.textContent = `▶ ${label}`;
    b.addEventListener('click', () => RB.preview.play(kind));
    return b;
  }
  function tabAnim(body) {
    let g = group('Alt+Tab switcher');
    g.appendChild(selectRow('Layout', 'switcher', () => S.anim.switcher, (v) => { S.anim.switcher = v; RB.preview.play('switcher'); }));
    g.appendChild(playBtn('switcher', 'Preview Alt+Tab'));
    body.appendChild(g);

    g = group('Windows');
    g.appendChild(selectRow('Open and close', 'openClose', () => S.anim.openClose, (v) => { S.anim.openClose = v; setTimeout(() => RB.preview.play('open'), 50); }));
    g.appendChild(selectRow('Minimise', 'minimize', () => S.anim.minimize, (v) => { S.anim.minimize = v; setTimeout(() => RB.preview.play('minimize'), 50); }));
    const pr = document.createElement('div');
    pr.className = 'row-inline'; pr.style.marginBottom = '12px';
    pr.append(playBtn('open', 'Open/close'), playBtn('minimize', 'Minimise'));
    g.appendChild(pr);
    g.appendChild(toggleRow('Wobbly windows', () => S.anim.wobbly, (v) => { S.anim.wobbly = v; }, null, 'Drag a window by its title bar in the preview to feel it.'));
    g.appendChild(toggleRow('Translucent windows while moving', () => S.anim.translucency, (v) => { S.anim.translucency = v; }));
    g.appendChild(toggleRow('Dim inactive windows', () => S.anim.dimInactive, (v) => { S.anim.dimInactive = v; }));
    body.appendChild(g);

    g = group('Desktops');
    g.appendChild(selectRow('Switching between desktops', 'desktopSwitch', () => S.anim.desktopSwitch, (v) => { S.anim.desktopSwitch = v; setTimeout(() => RB.preview.play('desktop'), 50); }));
    g.appendChild(toggleRow('Desktop Cube (Meta+C)', () => S.anim.cube, (v) => { S.anim.cube = v; if (v) setTimeout(() => RB.preview.play('cube'), 50); }, 'cube'));
    const pr2 = document.createElement('div');
    pr2.className = 'row-inline'; pr2.style.marginBottom = '12px';
    pr2.appendChild(playBtn('desktop', 'Switch desktop'));
    if (S.anim.cube) pr2.appendChild(playBtn('cube', 'Cube'));
    g.appendChild(pr2);
    body.appendChild(g);

    g = group('Blur and speed');
    g.appendChild(toggleRow('Blur behind panels, menus and terminals', () => S.anim.blur, (v) => { S.anim.blur = v; }));
    if (S.anim.blur) {
      g.appendChild(rangeRow('Blur strength', 1, 15, 1, () => S.anim.blurStrength, (v) => { S.anim.blurStrength = v; }));
      g.appendChild(rangeRow('Noise', 0, 14, 1, () => S.anim.blurNoise, (v) => { S.anim.blurNoise = v; }));
    }
    const sp = OPTIONS.speed;
    g.appendChild(rangeRow('Animation speed', 0, sp.length - 1, 1, () => Math.max(0, sp.findIndex((o) => o.id === S.anim.speed)), (v) => { S.anim.speed = sp[v].id; }, (v) => sp[v].label));
    g.appendChild(toggleRow('Shake the mouse to find the cursor', () => S.anim.shakeCursor, (v) => { S.anim.shakeCursor = v; }, 'shakeCursor'));
    body.appendChild(g);
  }

  /* ---------- panels ---------- */
  const MINI = {
    keep: [[6, 82, 88, 12]],
    topdock: [[2, 5, 7, 90], [38, 4, 24, 10]],
    leftbar: [[2, 5, 8, 90]],
    serpantinum: [[0, 0, 100, 7], [36, 85, 28, 10]],
    island: [[34, 5, 32, 10], [30, 83, 40, 12]],
    'topbar-dock': [[0, 0, 100, 11], [33, 82, 34, 12]],
    dock: [[25, 82, 50, 13]],
    win11: [[0, 87, 100, 13]],
    classic: [[3, 84, 94, 12]],
    unity: [[0, 0, 100, 10], [0, 10, 11, 90]],
    minimal: [[0, 0, 100, 8]],
  };
  function tabPanels(body) {
    const g = group('Panel layout', 'built with Plasma scripting');
    const grid = document.createElement('div');
    grid.className = 'layouts';
    OPTIONS.panel.forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'lay';
      b.setAttribute('aria-pressed', S.panel === o.id);
      b.innerHTML = `<div class="mini">${MINI[o.id].map(([l, t, w, h]) => `<i style="left:${l}%;top:${t}%;width:${w}%;height:${h}%;border-radius:${o.id === 'leftbar' || o.id === 'topdock' || o.id === 'island' || (o.id === 'serpantinum' && t > 50) ? '6px' : o.id === 'dock' || (o.id === 'topbar-dock' && t > 50) ? '5px' : '1px'}"></i>`).join('')}</div>
        <span class="t">${esc(o.label)}</span><span class="h">${esc(o.hint || 'no changes')}</span>`;
      b.addEventListener('click', () => { S.panel = o.id; refresh(); renderTab(); });
      grid.appendChild(b);
    });
    g.appendChild(grid);
    const h = document.createElement('p');
    h.className = 'hint';
    h.innerHTML = 'Any layout other than "Leave my panels alone" removes your current panels and builds new ones on the primary screen. The script backs up the old layout first, and <code>undo.sh</code> puts it back.';
    g.appendChild(h);
    body.appendChild(g);
  }

  /* ---------- extras ---------- */
  function tabExtras(body) {
    let g = group('Add-ons', 'third-party projects');
    g.appendChild(toggleRow(FEATURES.roundedCorners.label, () => S.extras.roundedCorners, (v) => { S.extras.roundedCorners = v; }, 'roundedCorners'));
    g.appendChild(toggleRow(FEATURES.panelColorizer.label, () => S.extras.panelColorizer, (v) => { S.extras.panelColorizer = v; }, 'panelColorizer'));
    g.appendChild(toggleRow(FEATURES.betterBlur.label, () => S.extras.betterBlur, (v) => { S.extras.betterBlur = v; }, 'betterBlur'));
    g.appendChild(toggleRow(FEATURES.termExtras.label, () => S.extras.termExtras, (v) => { S.extras.termExtras = v; }, 'termExtras'));
    g.appendChild(toggleRow(FEATURES.widgetColumn.label, () => S.extras.widgetColumn, (v) => { S.extras.widgetColumn = v; }, 'widgetColumn', 'The stack of cards down the right side of Caelestia.'));
    g.appendChild(toggleRow(FEATURES.bigClock.label, () => S.extras.bigClock, (v) => { S.extras.bigClock = v; }, 'bigClock', 'The giant clock seen in Hybrid Summer, Golden Era and the Nothing rices.'));
    body.appendChild(g);

    g = group('Replace the shell', 'advanced');
    g.appendChild(toggleRow(FEATURES.serpKde.label, () => S.extras.serpKde, (v) => { S.extras.serpKde = v; }, 'serpKde',
      'A full Quickshell desktop shell that brings the real Serpantinum bar, dock, launcher and panels to Plasma 6 Wayland. <a href="https://github.com/mj0x0/serpantinum-kde" target="_blank" rel="noopener">mj0x0/serpantinum-kde</a>'));
    body.appendChild(g);

    g = group('Arch options');
    g.appendChild(toggleRow('Use an AUR helper (paru or yay) when one is installed', () => S.useAur, (v) => { S.useAur = v; }, null,
      'Turn off to see what works with official repos only.'));
    body.appendChild(g);

    g = group('Legend');
    g.innerHTML += `<p class="hint"><span class="cdots"><i class="cdot"></i></span> packaged or built in &nbsp; <span class="cdots"><i class="cdot alt"></i></span> AUR, download or build &nbsp; <span class="cdots"><i class="cdot no"></i></span> can't be used. Dots are in the order ${Object.values(DISTROS).map((d) => d.name).join(', ')}.</p>`;
    body.appendChild(g);
  }

  /* ---------- inspiration ---------- */
  let ideaCat = 'all';
  function tabIdeas(body) {
    const ideas = window.RB_IDEAS || [];
    const cats = ['all', ...new Set(ideas.map((i) => i.category))];
    const g = group('Inspiration', `${ideas.length} rices, themes, effects and tools`);
    const seg = document.createElement('div');
    seg.className = 'seg small'; seg.style.marginBottom = '12px';
    seg.innerHTML = cats.map((c) => `<button type="button" data-c="${c}" aria-pressed="${c === ideaCat}">${c}</button>`).join('');
    seg.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { ideaCat = b.dataset.c; renderTab(); }));
    g.appendChild(seg);
    const list = document.createElement('div');
    list.className = 'ideas';
    ideas.filter((i) => ideaCat === 'all' || i.category === ideaCat).forEach((i) => {
      const inst = i.install && i.install[S.distro];
      const d = document.createElement('div');
      d.className = 'idea';
      d.innerHTML = `${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>` : `<b style="font-weight:500">${esc(i.name)}</b>`}<span class="tag">${esc(i.category)}</span>${i.winner ? `<span class="tag gold">${esc(i.winner)}</span>` : ''}${i.plasma6 === 'yes' ? '<span class="tag yes">Plasma 6</span>' : i.plasma6 === 'no' ? '<span class="tag">Plasma 5 only</span>' : ''}
        <p>${esc(i.notes || '')}</p>${inst ? `<p><b>${esc(DISTROS[S.distro].name)}:</b> ${esc(inst)}</p>` : ''}`;
      list.appendChild(d);
    });
    g.appendChild(list);
    const more = document.createElement('p');
    more.className = 'hint';
    more.innerHTML = 'Full write-up with techniques and config keys: <a href="research/REFERENCES.md" target="_blank" rel="noopener">REFERENCES.md</a>. Links point to other people\'s projects; check each licence before reusing art.';
    g.appendChild(more);
    body.appendChild(g);
  }

  /* ---------- compatibility card ---------- */
  function renderCompat() {
    const needs = K.requiredFeatures(S);
    const box = $('#compat');
    if (!needs.length) {
      box.innerHTML = `<div class="compat-card"><h3>Works on all ${Object.keys(DISTROS).length} distros</h3><p class="hint" style="margin:0">Everything in this rice is built into Plasma 6.</p></div>`;
      return;
    }
    const ds = Object.keys(DISTROS);
    const cell = (fid, d) => {
      const c = K.compat(fid, d, { aur: S.useAur });
      if (!c.ok) return `<span class="ci no" title="${esc(c.reason)}">✕ no</span>`;
      const t = { pkg: ['ok', '✓'], builtin: ['ok', '✓'], aur: ['alt', 'AUR'], manual: ['alt', 'download'], build: ['alt', 'build'] }[c.how];
      return `<span class="ci ${t[0]}" title="${esc(c.how === 'pkg' ? c.pkgs.join(' ') : c.how)}">${t[1]}</span>`;
    };
    const bad = needs.map((n) => ({ n, c: K.compat(n.fid, S.distro, { aur: S.useAur }) })).filter((x) => !x.c.ok);
    box.innerHTML = `<div class="compat-card"><h3>Distro compatibility</h3><div class="table-wrap"><table class="ctable">
      <thead><tr><th>Needs</th>${ds.map((d) => `<th class="${d === S.distro ? 'cur' : ''}">${esc(DISTROS[d].name)}</th>`).join('')}</tr></thead>
      <tbody>${needs.map((n) => `<tr><td>${esc(FEATURES[n.fid].label)}</td>${ds.map((d) => `<td class="${d === S.distro ? 'cur' : ''}">${cell(n.fid, d)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      ${bad.length ? `<ul class="cwarn">${bad.map((x) => `<li class="incompat">This customisation can't be used on ${esc(DISTROS[S.distro].name)}: <b>${esc(FEATURES[x.n.fid].label)}</b> (${esc(x.c.reason)}). It is left out of the commands.</li>`).join('')}</ul>` : ''}</div>`;
  }

  /* ---------- output ---------- */
  function hl(code) {
    return esc(code).split('\n').map((l) => (/^\s*#/.test(l) ? `<span class="c">${l}</span>` : l)).join('\n');
  }
  function renderOutput() {
    const d = DISTROS[S.distro];
    $('#outFor').textContent = `for ${d.long}`;
    const file = `${G.slug(S.name)}-${S.distro}.sh`;
    { const rh = $('#runHint'); if (rh) rh.textContent = `bash ${file}`; }
    const body = $('#outBody');
    if (outMode === 'script') {
      body.innerHTML = `<pre class="code full">${hl(G.buildScript(S, S.distro))}</pre>`;
      return;
    }
    const { steps } = G.buildSteps(S, S.distro);
    body.innerHTML = '';
    steps.forEach((st, i) => {
      const lines = st.cmds.split('\n').length;
      const c = document.createElement('div');
      c.className = 'stepc' + (lines > 14 ? ' collapsed' : '');
      c.innerHTML = `<header><span class="n">${i + 1}</span><h3>${esc(st.title)}</h3><button class="btn small" type="button">Copy</button></header>
        ${st.note ? `<p class="note">${esc(st.note)}</p>` : ''}<pre class="code">${hl(st.cmds)}</pre>${lines > 14 ? `<button class="expand" type="button">Show all ${lines} lines</button>` : ''}`;
      c.querySelector('header .btn').addEventListener('click', () => copy(st.cmds, `Copied step ${i + 1}`));
      const ex = c.querySelector('.expand');
      if (ex) ex.addEventListener('click', () => { const col = c.classList.toggle('collapsed'); ex.textContent = col ? `Show all ${lines} lines` : 'Show less'; });
      body.appendChild(c);
    });
  }

  /* ---------- header ---------- */
  function renderHeader() {
    $('#desktopSel').innerHTML = Object.entries(DESKTOPS).map(([id, d]) => `<option value="${id}" ${d.ready ? '' : 'disabled'} ${S.desktop === id ? 'selected' : ''}>${esc(d.name)}${d.ready ? '' : ' (planned)'}</option>`).join('');
    $('#distroSeg').innerHTML = Object.entries(DISTROS).map(([id, d]) => `<button type="button" role="radio" data-d="${id}" aria-pressed="${S.distro === id}" title="${esc(d.long)}, Plasma ${d.plasma}">${esc(d.name)}</button>`).join('');
    $('#distroSeg').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      S.distro = b.dataset.d;
      const bad = K.requiredFeatures(S).filter((n) => !K.compat(n.fid, S.distro, { aur: S.useAur }).ok);
      if (bad.length) toast(`${bad.length} customisation${bad.length > 1 ? 's' : ''} can't be used on ${DISTROS[S.distro].name}: see Distro compatibility`);
      renderHeader(); refresh(); renderTab();
    }));
    renderPresetSel();
  }
  function saved() { return LS.get('rb.presets') || {}; }
  function renderPresetSel() {
    const sv = saved();
    const groups = {};
    Object.entries(PR.BUILTIN).forEach(([k, p]) => { (groups[p.group || 'Built-in'] = groups[p.group || 'Built-in'] || []).push([k, p]); });
    $('#presetSel').innerHTML = Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(([k, p]) => `<option value="builtin:${k}">${esc(p.name)}</option>`).join('')}</optgroup>`).join('') +
      (Object.keys(sv).length ? `<optgroup label="Saved in this browser">${Object.keys(sv).map((k) => `<option value="saved:${esc(k)}">${esc(k)}</option>`).join('')}</optgroup>` : '') +
      (presetKey === 'custom' ? '<option value="custom">(unsaved)</option>' : '');
    $('#presetSel').value = presetKey;
    $('#btnDelete').hidden = !presetKey.startsWith('saved:');
  }
  async function loadState(obj, key) {
    const distro = S ? S.distro : null;
    S = normalise(obj);
    if (distro && key && key.startsWith('builtin:')) S.distro = distro; // keep the distro the user picked
    presetKey = key || 'custom';
    openSugg.clear();
    await prepWalls();
    renderHeader(); refresh(); renderTab();
  }
  async function prepWalls() {
    for (const w of S.wallpapers) {
      if (w.gen && PR.GENS[w.gen]) { if (!wallSrc[w.name] || w.palette === 'auto') await prepGen(w); }
      else if (w.thumb && !wallSrc[w.name]) wallSrc[w.name] = w.thumb;
      if (w.palette === 'auto') w.palette = clone(S.palette);
    }
  }

  function wireHeader() {
    $('#presetSel').addEventListener('change', (e) => {
      const v = e.target.value;
      if (v.startsWith('builtin:')) loadState(clone(PR.BUILTIN[v.slice(8)]), v);
      else if (v.startsWith('saved:')) loadState(saved()[v.slice(6)], v);
    });
    $('#btnSave').addEventListener('click', () => {
      const name = prompt('Save preset as:', S.name);
      if (!name) return;
      S.name = name.trim();
      const sv = saved();
      sv[S.name] = clone(S);
      if (!LS.set('rb.presets', sv)) return toast('Browser storage is full or blocked: use Export instead');
      presetKey = `saved:${S.name}`;
      renderPresetSel(); refresh();
      toast(`Saved "${S.name}" in this browser`);
    });
    $('#btnDelete').addEventListener('click', () => {
      const k = presetKey.slice(6);
      if (!confirm(`Delete saved preset "${k}"?`)) return;
      const sv = saved(); delete sv[k]; LS.set('rb.presets', sv);
      presetKey = 'custom'; renderPresetSel(); toast('Deleted');
    });
    $('#btnExport').addEventListener('click', () => RB.isApp
      ? RB.RCHost.call('saveFile', `${G.slug(S.name)}.rice.json`, JSON.stringify(S, null, 2)).then((p) => toast(`Saved to ${p}`)).catch((e) => toast(String(e)))
      : download(`${G.slug(S.name)}.rice.json`, JSON.stringify(S, null, 2), 'application/json'));
    $('#importFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const o = JSON.parse(await f.text());
        if (!o || typeof o !== 'object' || !o.palette) throw new Error('not a preset');
        await loadState(o, 'custom');
        toast(`Imported "${S.name}"`);
      } catch (err) { toast('That file is not a Rice Cooker preset'); }
      e.target.value = '';
    });
    $('#btnShare').addEventListener('click', () => {
      const lite = clone(S);
      lite.wallpapers.forEach((w) => delete w.thumb);
      const enc = btoa(unescape(encodeURIComponent(JSON.stringify(lite)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const url = `${location.href.split('#')[0]}#p=${enc}`;
      copy(url, 'Share link copied (uploaded wallpapers are not included)');
    });
    $('#outMode').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      outMode = b.dataset.mode;
      $('#outMode').querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      renderOutput();
    }));
    $('#btnDownload').addEventListener('click', () => RB.isApp
      ? RB.RCHost.call('saveFile', `${G.slug(S.name)}-${S.distro}.sh`, G.buildScript(S, S.distro)).then((p) => toast(`Saved to ${p}`)).catch((e) => toast(String(e)))
      : download(`${G.slug(S.name)}-${S.distro}.sh`, G.buildScript(S, S.distro), 'text/x-shellscript'));
    $('#btnCopyAll').addEventListener('click', () => copy(G.buildScript(S, S.distro), 'Script copied'));
    $('#riceName').addEventListener('click', () => {
      const n = prompt('Rice name:', S.name);
      if (n) { S.name = n.trim(); refresh(); }
    });
  }

  function renderPlayBar() {
    const bar = $('#playBar');
    bar.innerHTML = '';
    bar.append(playBtn('switcher', 'Alt+Tab'), playBtn('open', 'Open'), playBtn('minimize', 'Minimise'), playBtn('desktop', 'Desktops'));
    if (S.anim.cube) bar.appendChild(playBtn('cube', 'Cube'));
    if (['topdock', 'serpantinum', 'island'].includes(S.panel)) bar.appendChild(playBtn('dash', 'Top dock'));
    if (S.wallpapers.length > 1) {
      const b = document.createElement('button');
      b.className = 'btn small'; b.type = 'button'; b.textContent = cycling ? '■ Stop cycle' : '▶ Cycle rices';
      b.addEventListener('click', toggleCycle);
      bar.appendChild(b);
    }
  }

  /* ---------- refresh ---------- */
  function refreshLight() {
    applyTheme();
    const d = DISTROS[S.distro];
    RB.preview.update(S, { distroName: d.long.replace(/ \(.*/, ''), plasma: d.plasma });
    const w = S.wallpapers[S.activeWallpaper];
    RB.preview.setWall(w ? wallSrc[w.name] || w.thumb : null);
    renderPlayBar();
  }
  let outT;
  function refresh() {
    refreshLight();
    $('#riceName').textContent = S.name;
    $('#riceSub').textContent = `${S.palette.name}, ${DISTROS[S.distro].name}`;
    const cr = $('#credit');
    if (S.credit) {
      cr.hidden = false;
      cr.innerHTML = `Inspired by <b>${esc(S.credit.title)}</b> by ${esc(S.credit.by)}${S.credit.url ? ` (<a href="${esc(S.credit.url)}" target="_blank" rel="noopener">source</a>)` : ''}. ${esc(S.credit.note || '')}`;
    } else cr.hidden = true;
    renderCompat();
    clearTimeout(outT);
    outT = setTimeout(renderOutput, 120);
    if (presetKey.startsWith('builtin:') && JSON.stringify(normalise(PR.BUILTIN[presetKey.slice(8)]).panel) !== JSON.stringify(S.panel)) { /* keep label */ }
    LS.set('rb.current', { key: presetKey, state: S });
  }

  /* ---------- start ---------- */
  async function init() {
    RB.preview.mount($('#desk'));
    wireHeader();
    wireTheme();
    renderTabs();
    let start = null, key = 'builtin:serpantinum';
    const m = /#p=([\w-]+)/.exec(location.hash);
    if (m) {
      try { start = JSON.parse(decodeURIComponent(escape(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))))); key = 'custom'; }
      catch (e) { toast('That share link is damaged'); }
    }
    if (!start) {
      const cur = LS.get('rb.current');
      if (cur && cur.state && cur.state.palette) { start = cur.state; key = cur.key || 'custom'; }
    }
    if (!start) start = clone(PR.BUILTIN.serpantinum);
    await loadState(start, key);
    if (RB.isApp) await RB.appmode.init();
  }

  // what the desktop app (js/appmode.js) needs from the builder
  RB.app = {
    get state() { return S; },
    loadState, toast, refresh: () => { refresh(); renderTab(); }, renderHeader,
    setTab: (t) => goTab(t),
    wallSrc, wallOrig, clone,
    setDistro: (d) => { S.distro = d; renderHeader(); refresh(); renderTab(); },
  };
  document.addEventListener('DOMContentLoaded', init);
})((window.RB = window.RB || {}));
