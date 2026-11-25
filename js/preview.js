/* Rice Cooker — live mock desktop and animation previews. */
(function (RB) {
  'use strict';
  const C = RB.color;
  let desk, space, wl, files, term, panels, ov, badge, S = null, wallIdx = 0, busy = false;

  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const dur = (base) => (S && S.anim.speed === 0 ? 1 : base * (S ? S.anim.speed || 1 : 1));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const anim = (node, frames, opts) => node.animate(frames, Object.assign({ fill: 'none' }, opts)).finished.catch(() => {});

  const APPS = [
    { t: 'Home — Dolphin', c: 'var(--p-accent2)' }, { t: 'kitty — ~', c: 'var(--p-bg)' },
    { t: 'Firefox', c: 'var(--p-yellow)' }, { t: 'Music', c: 'var(--p-magenta)' },
  ];

  function mount(node) {
    desk = node;
    desk.innerHTML = '';
    wl = [el('div', 'wl'), el('div', 'wl')];
    wl[1].style.opacity = 0;
    space = el('div', 'space');
    files = el('div', 'win files');
    term = el('div', 'win term inactive');
    space.append(files, term);
    panels = el('div', 'panels');
    ov = el('div', 'ov');
    badge = el('div', 'hint-badge');
    desk.append(wl[0], wl[1], space, panels, ov, badge);
    [files, term].forEach(makeDraggable);
    files.addEventListener('pointerdown', () => focus(files));
    term.addEventListener('pointerdown', () => focus(term));
  }

  function focus(w) {
    [files, term].forEach((x) => { x.classList.toggle('inactive', x !== w); x.style.zIndex = x === w ? 4 : 3; });
  }

  function buttons(kind) {
    if (kind === 'mac') return '<span class="bt mac"><i></i><i></i><i></i></span>';
    if (kind === 'windows') return '<span class="bt windows"><i>─</i><i>□</i><i>✕</i></span>';
    if (kind === 'minimal') return '<span class="bt kde"><i>✕</i></span>';
    return '<span class="bt kde"><i>⌄</i><i>⌃</i><i>✕</i></span>';
  }
  function titlebar(title, kind) {
    const b = buttons(kind);
    const left = kind === 'mac' ? b : '<span class="bt" style="width:3.5cqi"></span>';
    const right = kind === 'mac' ? '<span class="bt" style="width:3.5cqi"></span>' : b;
    return `<div class="tb">${left}<span class="tt">${title}</span>${right}</div>`;
  }

  function renderWindows(s, distroName, plasma) {
    const k = s.decor.buttons;
    const folders = ['var(--p-accent)', 'var(--p-accent)', 'var(--p-accent2)', 'var(--p-accent)'];
    files.innerHTML = titlebar('Home — Dolphin', k) + `<div class="bd">
      <div class="side"><div class="on"><b></b>Home</div><div><b></b>Desktop</div><div><b></b>Documents</div><div><b></b>Pictures</div><div><b></b>Games</div><div><b style="background:var(--p-red)"></b>Trash</div></div>
      <div class="main">${['Documents', 'Downloads', 'Music', 'Pictures', 'Videos', 'Wallpapers', 'Games'].map((n, i) =>
        `<div class="${i === 5 ? 'sel' : ''}"><i style="--fc:${folders[i % 4]}"></i>${n}</div>`).join('')}<div class="doc"><i></i>rice.sh</div></div></div>`;
    const ansi = C.ansi16(s.palette).map((c) => `<i style="background:${c}"></i>`).join('');
    const icons = s.icons === 'keep' ? 'unchanged' : s.icons === 'tela' ? 'Tela (accent)' : s.icons;
    const font = s.fonts.ui === 'keep' ? 'unchanged' : s.fonts.ui;
    term.innerHTML = titlebar(s.colors.kitty ? 'kitty' : 'Konsole', k) + `<div class="bd">
      <div class="logo">  ▄▄▄▄▄
 ▟█▀  ▀█▙
▐█  ▄▀ █▌
 ▜█▄ ▀▀
   ▀▀▄▄</div>
      <div class="info">
        <div><span class="u">you</span>@<span class="u">rice</span></div>
        <div><b>OS</b> ${distroName}</div><div><b>DE</b> Plasma ${plasma}</div>
        <div><b>Colours</b> ${s.palette.name}</div><div><b>Icons</b> ${icons}</div><div><b>Font</b> ${font}</div>
        <div class="ansi">${ansi}</div>
      </div>
      <div class="prompt"><span class="g">~</span> <span class="b">❯</span> rice-cycle next <span class="cur"></span></div></div>`;
  }

  const TASKC = ['var(--p-accent2)', 'var(--p-yellow)', 'var(--p-accent)', 'var(--p-magenta)', 'var(--p-blue)'];
  function tasks() { return '<div class="tasks">' + TASKC.map((c, i) => `<i style="--c:${c}" class="${i < 2 ? 'on' : ''}"></i>`).join('') + '</div>'; }
  const W = {
    menu: '<div class="menu"></div>', tasks: null, sp: '<div class="sp"></div>', clock: '<div class="clock">14:32</div>',
    tray: '<div class="tray"><i></i><i></i><i></i></div>', pager: '<div class="pager"><i></i><i></i><i></i></div>',
    gmenu: '<div class="gmenu"><span>Dolphin</span><span>File</span><span>Edit</span><span>View</span></div>', desk: '<div class="desk-btn"></div>',
    sep: '<div style="width:1px;height:2.4cqi;background:var(--p-dim);opacity:.4"></div>',
    media: '<div class="np"><i class="art"></i><span class="tt">Everlong <em>Foo Fighters</em></span><span class="viz"><b></b><b></b><b></b><b></b><b></b></span></div>',
    clock2: '<div class="clock2">05:30<em>Wed 19 Nov</em></div>',
  };
  const bar = (cls, items) => `<div class="pnl ${cls}">${items.map((i) => (i === 'tasks' ? tasks() : W[i])).join('')}</div>`;
  function renderPanels(layout) {
    const L = {
      keep: [bar('bottom floating', ['menu', 'pager', 'tasks', 'sp', 'tray', 'clock', 'desk'])],
      'topbar-dock': [bar('top', ['menu', 'gmenu', 'sp', 'clock', 'sp', 'tray']), bar('bottom floating fit dock', ['tasks'])],
      serpantinum: [bar('top thin serp', ['pager', 'sp', 'clock', 'media', 'sp', 'tray']), bar('bottom floating fit dock mini', ['tasks'])],
      island: [bar('top floating fit island', ['menu', 'pager', 'clock', 'tray']), bar('bottom floating fit dock', ['tasks'])],
      topdock: [bar('left floatl', ['menu', 'pager', 'tasks', 'sp', 'tray']), bar('top floating fit island tdock', ['clock2', 'media'])],
      leftbar: [bar('left floatl', ['menu', 'pager', 'tasks', 'sp', 'tray', 'clock'])],
      dock: [bar('bottom floating fit dock', ['menu', 'tasks', 'sep', 'tray', 'clock'])],
      win11: [bar('bottom', ['sp', 'menu', 'tasks', 'sp', 'tray', 'clock', 'desk'])],
      classic: [bar('bottom floating', ['menu', 'pager', 'tasks', 'sp', 'tray', 'clock', 'desk'])],
      unity: [bar('top', ['gmenu', 'sp', 'clock', 'sp', 'tray']), bar('left under-top', ['menu', 'tasks'])],
      minimal: [bar('top thin', ['pager', 'sp', 'clock', 'sp', 'tray'])],
    };
    panels.innerHTML = (L[layout] || L.keep).join('');
    // keep windows clear of a left launcher
    files.style.left = ['unity', 'leftbar', 'topdock'].includes(layout) ? '13%' : '';
    const dock = panels.querySelector('.tdock, .serp, .island');
    if (dock) { dock.style.cursor = 'pointer'; dock.title = 'Open the dashboard'; dock.addEventListener('click', () => play('dash')); }
  }

  const fam = (f, mono) => {
    if (f === 'keep') return mono ? "'Hack', 'JetBrains Mono'" : "'Noto Sans'";
    if (f === 'JetBrainsMono Nerd Font') return "'JetBrains Mono'";
    return `'${f}'`;
  };

  function update(s, ctx) {
    S = s;
    const a = s.anim;
    desk.style.setProperty('--ui-font', fam(s.fonts.ui, false));
    desk.style.setProperty('--mono-font', fam(s.fonts.mono, true));
    desk.style.setProperty('--rad', s.extras.roundedCorners ? '1.2cqi' : '.45cqi');
    desk.style.setProperty('--blur', a.blur ? `${Math.round(a.blurStrength * 1.6)}px` : '0px');
    desk.style.setProperty('--win-alpha', a.translucency ? '.84' : '1');
    desk.style.setProperty('--term-alpha', a.blur ? String(s.colors.termOpacity) : '1');
    desk.classList.toggle('outline', !!s.extras.roundedCorners);
    desk.classList.toggle('dim', !!a.dimInactive);
    desk.classList.toggle('icons-flat', !s.icons.startsWith('Papirus') && s.icons !== 'tela');
    renderWindows(s, ctx.distroName, ctx.plasma);
    renderPanels(s.panel);
    let bc = desk.querySelector('.bigclock');
    if (s.extras.bigClock) {
      if (!bc) { bc = el('div', 'bigclock'); space.prepend(bc); }
      bc.innerHTML = '14:32<small>Sunday 23 November</small>';
    } else if (bc) bc.remove();
    renderLibrary(s);
    ['Blur Widgets', 'Rounded Widgets Floating', 'Translucent', 'Dock', 'Outline Accent'].forEach((n) => desk.classList.toggle('ps-' + n.split(' ')[0].toLowerCase(), s.panelStyle === n && s.panel !== 'keep'));
    desk.classList.toggle('has-viz', !!s.extras.visualizer);
    let wc = desk.querySelector('.wcol');
    if (s.extras.widgetColumn) {
      if (!wc) { wc = el('div', 'wcol'); space.appendChild(wc); }
      wc.innerHTML = ['greeting', 'nowplaying', 'rings', 'calendar'].map((k) => `<div class="wc rcw">${RC[k]()}</div>`).join('');
      term.style.left = '38%';
    } else { if (wc) wc.remove(); term.style.left = ''; }
  }

  let currentWall = null;
  function setWall(src, instant) {
    if (!desk) return;
    currentWall = src || null;
    const css = src ? `url("${src}")` : 'linear-gradient(135deg, var(--p-bg2), var(--p-accent2))';
    if (instant || wl[wallIdx].style.backgroundImage === css) { wl[wallIdx].style.backgroundImage = css; return; }
    const next = 1 - wallIdx;
    wl[next].style.backgroundImage = css;
    wl[next].style.opacity = 1;
    wl[wallIdx].style.opacity = 0;
    wallIdx = next;
  }

  function showBadge(t) { badge.textContent = t; badge.classList.add('show'); }
  function hideBadge() { badge.classList.remove('show'); }

  /* ---------- open / close ---------- */
  const OPEN = {
    glide: [{ opacity: 0, transform: 'perspective(900px) rotateX(-28deg) translateY(4%) scale(.94)' }, { opacity: 1, transform: 'none' }],
    scale: [{ opacity: 0, transform: 'scale(.82)' }, { opacity: 1, transform: 'none' }],
    fade: [{ opacity: 0 }, { opacity: 1 }],
  };
  async function fallApart(w) {
    const r = w.getBoundingClientRect(), d = desk.getBoundingClientRect();
    const n = 5, shards = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const c = w.cloneNode(true);
      c.classList.add('shard');
      Object.assign(c.style, { left: `${r.left - d.left}px`, top: `${r.top - d.top}px`, width: `${r.width}px`, height: `${r.height}px`, margin: 0,
        clipPath: `inset(${(y / n) * 100}% ${100 - ((x + 1) / n) * 100}% ${100 - ((y + 1) / n) * 100}% ${(x / n) * 100}%)` });
      desk.appendChild(c); shards.push([c, x, y]);
    }
    w.style.visibility = 'hidden';
    await Promise.all(shards.map(([c, x, y]) => anim(c, [
      { transform: 'none', opacity: 1 },
      { transform: `translate(${(x - 2) * 26 + (Math.random() - .5) * 30}px, ${80 + y * 30 + Math.random() * 60}px) rotate(${(Math.random() - .5) * 90}deg)`, opacity: 0 },
    ], { duration: dur(700), easing: 'cubic-bezier(.4,0,.9,.6)' })));
    shards.forEach(([c]) => c.remove());
  }
  async function playOpen() {
    const kind = S.anim.openClose === 'keep' ? 'scale' : S.anim.openClose;
    showBadge(`Close + open: ${kind}`);
    focus(files);
    if (kind === 'none') { files.style.visibility = 'hidden'; await wait(400); files.style.visibility = ''; return hideBadge(); }
    if (kind === 'fallapart') await fallApart(files);
    else { await anim(files, OPEN[kind].slice().reverse(), { duration: dur(220), easing: 'ease-in' }); files.style.visibility = 'hidden'; }
    await wait(350);
    files.style.visibility = '';
    await anim(files, OPEN[kind === 'fallapart' ? 'scale' : kind], { duration: dur(260), easing: 'cubic-bezier(.2,.8,.2,1)' });
    hideBadge();
  }

  /* ---------- minimise ---------- */
  async function playMinimize() {
    const kind = S.anim.minimize === 'keep' ? 'squash' : S.anim.minimize;
    showBadge(`Minimise: ${kind === 'magiclamp' ? 'magic lamp' : kind}`);
    focus(files);
    const target = panels.querySelector('.tasks i') || panels;
    const r = files.getBoundingClientRect(), t = target.getBoundingClientRect();
    const dx = t.left + t.width / 2 - (r.left + r.width / 2), dy = t.top + t.height / 2 - (r.top + r.height / 2);
    let frames;
    if (kind === 'magiclamp') {
      frames = [
        { transform: 'none', clipPath: 'polygon(0 0,100% 0,100% 100%,0 100%)', opacity: 1, offset: 0 },
        { transform: `translate(${dx * 0.2}px, ${dy * 0.45}px) scale(.82,.78)`, clipPath: 'polygon(0 0,100% 0,78% 100%,22% 100%)', offset: .4 },
        { transform: `translate(${dx * 0.7}px, ${dy * 0.85}px) scale(.3,.4)`, clipPath: 'polygon(10% 0,90% 0,56% 100%,44% 100%)', offset: .75 },
        { transform: `translate(${dx}px, ${dy}px) scale(.05,.06)`, clipPath: 'polygon(45% 0,55% 0,51% 100%,49% 100%)', opacity: .5, offset: 1 },
      ];
    } else if (kind === 'squash') {
      frames = [{ transform: 'none', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: .2 }];
    }
    if (frames) {
      files.style.transformOrigin = '50% 100%';
      await anim(files, frames, { duration: dur(kind === 'magiclamp' ? 420 : 260), easing: 'cubic-bezier(.5,0,.75,.6)' });
      files.style.visibility = 'hidden';
      await wait(500);
      files.style.visibility = '';
      await anim(files, frames.slice().reverse().map((f) => { const g = Object.assign({}, f); if (f.offset != null) g.offset = 1 - f.offset; return g; }),
        { duration: dur(kind === 'magiclamp' ? 380 : 240), easing: 'cubic-bezier(.25,.4,.5,1)' });
      files.style.transformOrigin = '';
    } else { files.style.visibility = 'hidden'; await wait(500); files.style.visibility = ''; }
    hideBadge();
  }

  /* ---------- desktop switch / cube ---------- */
  async function playDesktop() {
    const kind = S.anim.desktopSwitch === 'keep' ? 'slide' : S.anim.desktopSwitch;
    showBadge(`Switch desktop: ${kind === 'fadedesktop' ? 'fade' : kind}`);
    const out = { slide: [{ transform: 'none' }, { transform: 'translateX(-105%)' }], fadedesktop: [{ opacity: 1 }, { opacity: 0 }], none: [{ opacity: 1 }, { opacity: 0 }] }[kind];
    const inn = { slide: [{ transform: 'translateX(105%)' }, { transform: 'none' }], fadedesktop: [{ opacity: 0 }, { opacity: 1 }], none: [{ opacity: 0 }, { opacity: 1 }] }[kind];
    const d = kind === 'none' ? 1 : dur(380);
    await anim(space, out, { duration: d, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    await wait(450);
    await anim(space, inn, { duration: d, easing: 'cubic-bezier(.4,0,.2,1)' });
    space.getAnimations().forEach((x) => x.cancel());
    hideBadge();
  }
  async function playCube() {
    showBadge('Desktop Cube (Meta+C)');
    const o = { duration: dur(650), easing: 'cubic-bezier(.45,0,.2,1)' };
    space.style.transformOrigin = '50% 50% -40cqi';
    await anim(space, [{ transform: 'scale(1) rotateY(0)' }, { transform: 'scale(.62) rotateY(0)', offset: .25 }, { transform: 'scale(.62) rotateY(-90deg)' }], Object.assign({ fill: 'forwards' }, o));
    await wait(300);
    await anim(space, [{ transform: 'scale(.62) rotateY(90deg)' }, { transform: 'scale(.62) rotateY(0)', offset: .75 }, { transform: 'scale(1) rotateY(0)' }], o);
    space.getAnimations().forEach((x) => x.cancel());
    space.style.transformOrigin = '';
    hideBadge();
  }

  /* ---------- alt+tab ---------- */
  const card = (a) => `<div class="card" style="--cc:${a.c}"><div class="ttb"></div><div class="cbd"></div></div>`;
  async function playSwitcher() {
    const kind = S.anim.switcher === 'keep' ? 'thumbnail_grid' : S.anim.switcher;
    const names = { thumbnail_grid: 'Thumbnail Grid', coverswitch: 'Cover Switch', flipswitch: 'Flip Switch', big_icons: 'Big Icons', compact: 'Compact', sidebar: 'Sidebar' };
    showBadge(`Alt+Tab: ${names[kind]}`);
    ov.innerHTML = '';
    let root, items, select;
    if (kind === 'coverswitch' || kind === 'flipswitch') {
      root = el('div', kind === 'coverswitch' ? 'sw-cover' : 'sw-flip');
      root.style.setProperty('--sd', `${dur(350)}ms`);
      items = APPS.map((a) => { const it = el('div', 'it', card(a)); root.appendChild(it); return it; });
      const cap = el('div', 'sw-cap');
      ov.append(root, cap);
      select = (i) => {
        cap.textContent = APPS[i].t;
        items.forEach((it, j) => {
          let d = j - i;
          if (kind === 'coverswitch') {
            if (d > 2) d -= APPS.length; if (d < -2) d += APPS.length;
            it.style.transform = d === 0 ? 'translateZ(60px)' : `translateX(${d * 34 + Math.sign(d) * 14}%) rotateY(${-Math.sign(d) * 55}deg) translateZ(-40px)`;
            it.style.zIndex = 10 - Math.abs(d);
            it.style.opacity = Math.abs(d) > 1 ? 0.5 : 1;
          } else {
            const k = (j - i + APPS.length) % APPS.length;
            it.style.transform = `translate3d(${-k * 13}%, ${-k * 9}%, ${-k * 120}px) rotateY(-28deg)`;
            it.style.zIndex = 10 - k;
            it.style.opacity = 1 - k * 0.18;
          }
        });
      };
    } else if (kind === 'sidebar') {
      root = el('div', 'sw-side');
      items = APPS.map((a) => { const it = el('div', 'it', card(a) + `<div class="lbl">${a.t}</div>`); root.appendChild(it); return it; });
      ov.append(root);
      select = (i) => items.forEach((it, j) => it.classList.toggle('sel', i === j));
    } else {
      const box = el('div', 'sw-box');
      const cls = { thumbnail_grid: 'sw-grid', big_icons: 'sw-icons', compact: 'sw-list' }[kind];
      root = el('div', cls);
      items = APPS.map((a) => {
        const inner = kind === 'thumbnail_grid' ? card(a) + `<div class="lbl">${a.t}</div>` : kind === 'big_icons' ? `<i style="--cc:${a.c}"></i>` : `<i style="--cc:${a.c}"></i>${a.t}`;
        const it = el('div', 'it', inner); root.appendChild(it); return it;
      });
      box.appendChild(root);
      if (kind === 'big_icons') { const l = el('div', 'lbl'); box.appendChild(l); const old = (i) => { l.textContent = APPS[i].t; }; select = (i) => { old(i); items.forEach((it, j) => it.classList.toggle('sel', i === j)); }; }
      else select = (i) => items.forEach((it, j) => it.classList.toggle('sel', i === j));
      ov.append(box);
    }
    ov.classList.add('show');
    select(0);
    await anim(ov, [{ opacity: 0 }, { opacity: 1 }], { duration: dur(150) });
    for (let i = 1; i <= 4; i++) { await wait(Math.max(380, dur(520))); select(i % APPS.length); }
    await wait(500);
    await anim(ov, [{ opacity: 1 }, { opacity: 0 }], { duration: dur(150) });
    ov.classList.remove('show');
    hideBadge();
  }

  /* ---------- top dock dashboard (Caelestia-style drop-down) ---------- */
  async function playDash() {
    showBadge('Top dock: click it for the dashboard');
    const d = el('div', 'dash');
    d.innerHTML = `<div class="dtabs"><span class="on">Dashboard</span><span>Media</span><span>Performance</span><span>Weather</span></div>
      <div class="dgrid">
        <div class="dcard media"><i class="art big"></i><div><b>Everlong</b><span>Foo Fighters</span><span class="bar"><i style="width:58%"></i></span><span class="ctl">⏮ ⏸ ⏭</span></div></div>
        <div class="dcard"><b>Performance</b><div class="rings"><span><i style="--v:63"></i>CPU</span><span><i style="--v:41"></i>RAM</span><span><i style="--v:74"></i>Disk</span></div></div>
        <div class="dcard"><b>9°C</b><span>Cloudy, Reading</span><span class="eq">${'<i></i>'.repeat(12)}</span></div>
      </div>`;
    desk.appendChild(d);
    await anim(d, [{ opacity: 0, transform: 'translate(-50%, -12%) scaleY(.2)' }, { opacity: 1, transform: 'translate(-50%, 0) scaleY(1)' }], { duration: dur(320), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    await wait(2600);
    await anim(d, [{ opacity: 1, transform: 'translate(-50%, 0) scaleY(1)' }, { opacity: 0, transform: 'translate(-50%, -12%) scaleY(.2)' }], { duration: dur(220), easing: 'ease-in', fill: 'forwards' });
    d.remove();
    hideBadge();
  }

  /* ---------- widget library: chosen desktop widgets, draggable like Plasma's Edit Mode ---------- */
  // These mimic the stock Plasma widgets (what the script really adds), not custom cards
  const T = () => (S && S.extras.tempUnit === 'F' ? '41 °F' : '5 °C');
  const cal = () => `<div class="pw-cal"><div class="pw-head"><b>November</b><span>‹ Today ›</span></div><div class="pw-tabs"><u>Days</u><span>Months</span><span>Years</span></div><div class="pw-grid">${Array.from({ length: 35 }, (_, i) => { const d = i - 5; return `<i class="${d === 23 ? 'on' : d < 1 || d > 30 ? 'dim' : ''}">${d < 1 ? 26 + i : d > 30 ? d - 30 : d}</i>`; }).join('')}</div></div>`;
  const ring = (label, v, rows) => `<div class="pw-mon"><b>${label}</b><i class="wl-ring" style="--v:${v}"></i><small>${v}%</small><div class="pw-rows">${rows}</div></div>`;
  // Rice Cooker cards: same layout as the widget the script installs (js/plasmoid.js)
  const rcRing = (v, l) => `<span class="rc-ring"><i class="wl-ring" style="--v:${v}"><b>${v}%</b></i>${l}</span>`;
  const RC = {
    clock: () => '<div class="rc-clock">23:56<small>TUESDAY 24 NOVEMBER</small></div>',
    greeting: () => `<div class="rc-card rc-greet"><b>Good evening</b><span>Tuesday 24 November</span>${S && S.extras.weather ? `<span class="rc-wx">${S.extras.tempUnit === 'F' ? '41°F' : '5°C'} ☁ Cloudy, ${S.extras.weather.place}</span>` : ''}<em>23:56</em></div>`,
    weather: () => `<div class="rc-card rc-weather"><span>${S && S.extras.weather ? S.extras.weather.place : 'Set a town in Extras'}</span><div><b>${S && S.extras.tempUnit === 'F' ? '41°' : '5°'}</b><em>☁</em></div><span class="rc-days">${['Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<i>${d}<br>⛅<br>8° 3°</i>`).join('')}</span></div>`,
    nowplaying: () => '<div class="rc-card rc-music"><i class="art"></i><div><b>Everlong</b><span>Foo Fighters</span><span class="bar"><i style="width:42%"></i></span><span class="rc-ctl">⏮ ⏸ ⏭<span class="viz"><b></b><b></b><b></b><b></b><b></b></span></span></div></div>',
    rings: () => `<div class="rc-card rc-rings">${rcRing(29, 'CPU')}${rcRing(37, 'RAM')}${rcRing(14, 'GPU')}</div>`,
    cpu: () => `<div class="rc-card rc-rings">${rcRing(29, 'CPU')}</div>`,
    memory: () => `<div class="rc-card rc-rings">${rcRing(37, 'RAM')}</div>`,
    gpu: () => `<div class="rc-card rc-rings">${rcRing(14, 'GPU')}</div>`,
    calendar: () => `<div class="rc-card rc-cal"><b>November 2026</b><span class="days">${Array.from({ length: 35 }, (_, i) => { const d = i - 5; return `<i class="${d === 24 ? 'on' : ''}">${d >= 1 && d <= 30 ? d : ''}</i>`; }).join('')}</span></div>`,
  };
  const WLOOK = {
    digitalclock: RC.clock, greeting: RC.greeting, rings: RC.rings, gpu: RC.gpu, weather: RC.weather,
    analogclock: () => '<i class="wl-analog"></i>',
    mediacontroller: RC.nowplaying, cpu: RC.cpu, memory: RC.memory,
    net: () => '<div class="pw-mon"><b>Network</b><span class="eq">' + '<i></i>'.repeat(8) + '</span></div>',
    disk: () => ring('Disk Usage', 74, '<span>/</span><span>441 GB</span>'),
    calendar: RC.calendar,
    notes: () => '<div class="pw-note">cook rice</div>',
    puzzle: () => '<b>15</b><span>Puzzle</span>',
  };
  function renderLibrary(s) {
    space.querySelectorAll('.wlib').forEach((x) => x.remove());
    (s.extras.widgets || []).forEach((id, i) => {
      const rcKind = (RB.catalog.WIDGETS.find((x) => x.id === id) || {}).kind;
      const w = el('div', rcKind ? 'wlib rcw' : 'wlib pw', WLOOK[id] ? WLOOK[id]() : id);
      const pos = (s.extras.widgetPos || {})[id] || [3 + (i % 4) * 12, 8 + Math.floor(i / 4) * 16];
      w.style.left = pos[0] + '%'; w.style.top = pos[1] + '%';
      w.title = 'Drag me (in Plasma: right-click the desktop > Enter Edit Mode)';
      w.addEventListener('pointerdown', (e) => {
        const r = desk.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ox = pos[0], oy = pos[1];
        w.setPointerCapture(e.pointerId);
        const mv = (ev) => { pos[0] = Math.max(0, Math.min(92, ox + ((ev.clientX - sx) / r.width) * 100)); pos[1] = Math.max(0, Math.min(90, oy + ((ev.clientY - sy) / r.height) * 100)); w.style.left = pos[0] + '%'; w.style.top = pos[1] + '%'; };
        const up = () => { w.removeEventListener('pointermove', mv); s.extras.widgetPos = Object.assign({}, s.extras.widgetPos, { [id]: pos.map(Math.round) }); };
        w.addEventListener('pointermove', mv); w.addEventListener('pointerup', up, { once: true });
      });
      space.appendChild(w);
    });
  }

  /* ---------- SDDM login screen (Breeze) ---------- */
  async function playLogin() {
    const L = S.login || {};
    const cooker = L.mode === 'cooker', style = cooker ? (L.style || 'blur') : (L.mode === 'rice' ? 'breeze' : 'plain');
    showBadge(cooker ? `Login: Rice Cooker ${style}` : style === 'breeze' ? 'Login: Breeze, matched' : 'Login: plain Breeze');
    const useWall = (cooker || style === 'breeze') && L.wallpaper !== false && currentWall;
    const lg = el('div', `login st-${style} ${style === 'breeze' && L.blur ? 'blur' : ''}`);
    const card = `<div class="lg-card"><i class="lg-avatar"></i><b>you</b><span class="lg-row"><span class="lg-field">Password<i></i></span><span class="lg-go">→</span></span><small>Session: Plasma (Wayland) ▸</small><span class="lg-power">Sleep · Restart · Shut down</span></div>`;
    lg.innerHTML = `<div class="lg-bg" style="${useWall ? `background-image:url('${currentWall}')` : ''}"></div>` +
      (style === 'clean' ? '<div class="lg-corner">05:30<small>Sunday 23 November</small></div>' + card
        : style === 'dock' ? card + '<div class="lg-pill"><b>05:30</b><span>Sunday 23 November</span><i></i><i class="lg-av"></i><b>you</b></div>'
        : (L.clock !== false || cooker ? '<div class="lg-clock">05:30<small>Sunday 23 November</small></div>' : '') + card);
    desk.appendChild(lg);
    await anim(lg, [{ opacity: 0 }, { opacity: 1 }], { duration: dur(300), fill: 'forwards' });
    if (style === 'clean' || style === 'dock') { await wait(1100); lg.classList.add('open'); }
    await wait(2600);
    await anim(lg, [{ opacity: 1 }, { opacity: 0 }], { duration: dur(300), fill: 'forwards' });
    lg.remove();
    hideBadge();
  }

  async function play(kind) {
    if (busy || !S) return;
    busy = true;
    try {
      const run = ({ login: playLogin, dash: playDash, open: playOpen, minimize: playMinimize, desktop: playDesktop, switcher: playSwitcher, cube: playCube }[kind] || (async () => {}))();
      // never let a stalled animation (e.g. a background tab) lock the buttons
      await Promise.race([run, wait(9000)]);
    } finally {
      busy = false;
      files.style.visibility = ''; files.style.transformOrigin = '';
      ov.classList.remove('show'); hideBadge();
      desk.querySelectorAll('.shard, .dash, .login').forEach((x) => x.remove());
    }
  }

  /* ---------- drag, with wobbly windows ---------- */
  function makeDraggable(w) {
    let sx, sy, ox, oy, lastX, vx = 0, vy = 0, lastY, raf, drag = false, skx = 0, sky = 0;
    const spring = () => {
      skx *= 0.82; sky *= 0.82;
      apply();
      if (!drag && (Math.abs(skx) > 0.05 || Math.abs(sky) > 0.05)) raf = requestAnimationFrame(spring);
    };
    const apply = () => {
      const wob = S && S.anim.wobbly;
      w.style.transform = `translate(${ox}px, ${oy}px)` + (wob ? ` skew(${skx}deg, ${sky}deg) scale(${1 + Math.min(Math.abs(skx), 12) / 400})` : '');
    };
    w.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.tb')) return;
      drag = true; cancelAnimationFrame(raf);
      const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(w.style.transform || '');
      ox = m ? +m[1] : 0; oy = m ? +m[2] : 0;
      sx = e.clientX - ox; sy = e.clientY - oy; lastX = e.clientX; lastY = e.clientY;
      w.setPointerCapture(e.pointerId);
    });
    w.addEventListener('pointermove', (e) => {
      if (!drag) return;
      vx = e.clientX - lastX; vy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
      ox = e.clientX - sx; oy = e.clientY - sy;
      skx = Math.max(-14, Math.min(14, skx * 0.6 - vx * 0.9));
      sky = Math.max(-8, Math.min(8, sky * 0.6 - vy * 0.35));
      apply();
    });
    const end = () => { if (!drag) return; drag = false; raf = requestAnimationFrame(spring); };
    w.addEventListener('pointerup', end);
    w.addEventListener('pointercancel', end);
  }

  RB.preview = { mount, update, setWall, play };
})((window.RB = window.RB || {}));
