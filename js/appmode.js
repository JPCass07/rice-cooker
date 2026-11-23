/* Rice Cooker — desktop app mode.
 * Loaded on every page, but only does anything inside the desktop app, where
 * desktop/rice-cooker.py exposes a WebKit message handler called "rc".
 * Adds: unboxing on first run, "My rices" shelf, one-click cooking with a live
 * log, and restoring backups.
 */
(function (RB) {
  'use strict';
  const handler = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.rc;
  RB.isApp = !!handler;
  if (!RB.isApp) return;
  document.documentElement.classList.add('app-mode');

  /* ---------- bridge ---------- */
  let seq = 0;
  const pending = {}, listeners = {};
  const RCHost = {
    call(method, ...args) {
      return new Promise((resolve, reject) => {
        const id = ++seq;
        pending[id] = { resolve, reject };
        handler.postMessage(JSON.stringify({ id, method, args }));
      });
    },
    on(ev, fn) { (listeners[ev] = listeners[ev] || []).push(fn); },
    _reply(id, result, error) {
      const p = pending[id]; if (!p) return;
      delete pending[id];
      error ? p.reject(new Error(error)) : p.resolve(result);
    },
    _event(name, data) { (listeners[name] || []).forEach((fn) => fn(data)); },
  };
  window.RCHost = RCHost;
  RB.RCHost = RCHost;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let info = null, rices = [], backups = [], cooking = null;

  function distroFromOs(os) {
    const ids = `${os.ID || ''} ${os.ID_LIKE || ''}`.toLowerCase();
    for (const [key, d] of Object.entries(RB.catalog.DISTROS)) if (d.osIds.some((x) => ids.split(/\s+/).includes(x))) return key;
    if (/opensuse/.test(ids)) return 'opensuse';
    if (/arch/.test(ids)) return 'arch';
    if (/ubuntu/.test(ids)) return 'ubuntu';
    if (/debian/.test(ids)) return 'debian';
    if (/fedora|rhel/.test(ids)) return 'fedora';
    return null;
  }

  /* ---------- modal ---------- */
  function modal(html, { wide = false, closable = true } = {}) {
    const back = document.createElement('div');
    back.className = 'rc-modal-back';
    back.innerHTML = `<div class="rc-modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">${closable ? '<button class="rc-x" aria-label="Close">×</button>' : ''}<div class="rc-body">${html}</div></div>`;
    document.body.appendChild(back);
    const close = () => back.remove();
    if (closable) back.querySelector('.rc-x').addEventListener('click', close);
    return { el: back.querySelector('.rc-body'), close };
  }
  function confirmSheet(title, text, yes = 'Cook it') {
    return new Promise((res) => {
      const m = modal(`<h2>${title}</h2><p class="rc-p">${text}</p><div class="rc-actions"><button class="btn ghost" data-a="no">Cancel</button><button class="btn primary" data-a="yes">${esc(yes)}</button></div>`);
      m.el.querySelector('[data-a=no]').onclick = () => { m.close(); res(false); };
      m.el.querySelector('[data-a=yes]').onclick = () => { m.close(); res(true); };
    });
  }

  /* ---------- cooking ---------- */
  async function saveWallpapers(s) {
    const saved = [];
    for (const w of s.wallpapers || []) {
      if (w.url) continue; // the script downloads these
      let data = RB.app.wallOrig[w.name];
      if (!data && w.gen && RB.presets.GENS[w.gen]) data = RB.presets.renderGen(w.gen, 2560, 1440).toDataURL('image/png');
      if (!data) data = RB.app.wallSrc[w.name] || w.thumb;
      if (data) saved.push(await RCHost.call('saveWallpaper', RB.gen.fileName(w), data));
    }
    return saved;
  }

  function logPanel(title) {
    let el = $('#rcLog');
    if (!el) {
      el = document.createElement('section');
      el.id = 'rcLog';
      el.className = 'rc-log';
      document.body.appendChild(el);
    }
    el.innerHTML = `<header><div><span class="lab-mono">Cooking</span><h3>${esc(title)}</h3></div><button class="btn small ghost" data-a="hide">Hide</button></header>
      <div class="rc-progress"><i></i></div><p class="rc-step">Starting…</p><pre class="rc-lines"></pre><footer></footer>`;
    el.hidden = false;
    el.querySelector('[data-a=hide]').onclick = () => { el.hidden = true; };
    return el;
  }

  async function cook(label, opts = {}) {
    if (cooking) return RB.app.toast('Already cooking, wait for it to finish.');
    const s = RB.app.state;
    const script = RB.gen.buildScript(s, s.distro, opts.only ? { only: opts.only } : {});
    const el = logPanel(label);
    cooking = { el, label, lines: 0, onDone: opts.onDone };
    try {
      if (!opts.only) {
        const walls = await saveWallpapers(s);
        if (walls.length) appendLine(`Saved ${walls.length} wallpaper${walls.length > 1 ? 's' : ''} to ${info.paths.walls}`);
      }
      await RCHost.call('run', script, label);
    } catch (e) {
      appendLine(`Could not start: ${e.message}`);
      finish({ code: 1 });
    }
  }
  function appendLine(line) {
    if (!cooking) return;
    const pre = cooking.el.querySelector('.rc-lines');
    const m = /==> (\d+)\/(\d+) (.*)/.exec(line);
    if (m) {
      cooking.el.querySelector('.rc-progress i').style.width = `${(m[1] / m[2]) * 100}%`;
      cooking.el.querySelector('.rc-step').textContent = `Step ${m[1]} of ${m[2]}: ${m[3]}`;
    }
    const div = document.createElement('div');
    div.textContent = line;
    if (/^!!/.test(line)) div.className = 'warn';
    if (/^==>/.test(line)) div.className = 'step';
    pre.appendChild(div);
    if (pre.childElementCount > 600) pre.firstElementChild.remove();
    pre.scrollTop = pre.scrollHeight;
  }
  function finish({ code }) {
    if (!cooking) return;
    const { el, label, onDone } = cooking;
    const warns = el.querySelectorAll('.rc-lines .warn').length;
    el.querySelector('.rc-progress i').style.width = '100%';
    el.querySelector('.rc-step').textContent = code === 0
      ? (warns ? `Done, with ${warns} warning${warns > 1 ? 's' : ''} (see the log).` : 'Done. Log out and back in once to refresh every app.')
      : `Stopped with an error (code ${code}). Nothing after the error ran; your backup is safe.`;
    el.classList.toggle('bad', code !== 0);
    const foot = el.querySelector('footer');
    foot.innerHTML = '<button class="btn small" data-a="restore">Restore the previous desktop</button>';
    foot.querySelector('[data-a=restore]').onclick = () => restore(backups[0]);
    cooking = null;
    RB.app.toast(code === 0 ? `${label} is cooked` : `${label} stopped with an error`);
    loadShelf().then(() => { if (onDone) onDone(code); });
  }
  RCHost.on('log', appendLine);
  RCHost.on('done', finish);

  async function cookCurrent() {
    const s = RB.app.state;
    const d = RB.catalog.DISTROS[s.distro];
    const ok = await confirmSheet(`Cook ${esc(s.name)}?`,
      `This changes your desktop now: colours, wallpaper, icons, panels and effects for ${esc(d.long)}. Your current settings are backed up first, and you can restore them from My rices. If packages are missing, a password dialog asks for your password.`);
    if (ok) cook(s.name);
  }

  async function restore(b) {
    await loadShelf();
    b = b || backups[0];
    if (!b) return RB.app.toast('No backups yet');
    const ok = await confirmSheet('Restore this desktop?', `Puts back the KDE settings saved on <b>${esc(prettyDate(b.name))}</b>. Plasma restarts for a moment.`, 'Restore');
    if (!ok) return;
    const el = logPanel(`Restoring ${prettyDate(b.name)}`);
    cooking = { el, label: 'Restore', lines: 0 };
    RCHost.call('undo', b.path).catch((e) => { appendLine(e.message); finish({ code: 1 }); });
  }

  const prettyDate = (n) => {
    const m = /(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})/.exec(n);
    return m ? new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : n;
  };

  /* ---------- My rices tab ---------- */
  async function loadShelf() {
    try { [rices, backups] = await Promise.all([RCHost.call('listRices'), RCHost.call('listBackups')]); } catch (e) { rices = []; backups = []; }
    if ($('#tabs [data-tab=mine][aria-selected=true]')) RB.app.refresh();
  }
  const sw = (p) => `<span class="sw">${['bg', 'surface', 'fg', 'accent', 'accent2', 'red', 'green', 'yellow', 'blue'].map((k) => `<i style="background:${p[k]}"></i>`).join('')}</span>`;

  function tabMine(body) {
    const s = RB.app.state;
    const g1 = document.createElement('div');
    g1.className = 'group';
    g1.innerHTML = `<h3>My rices <small>${rices.length} saved</small></h3>
      <p class="hint">Rices you save here live in <code>~/.local/share/rice-cooker/rices</code>. Switch cooks one onto your desktop.</p>
      <div class="row-inline" style="margin-bottom:14px"><button class="btn primary small" data-a="save">Save “${esc(s.name)}”</button><button class="btn small" data-a="cook">Cook what's on screen</button></div>
      <div class="shelf"></div>`;
    const shelf = g1.querySelector('.shelf');
    if (!rices.length) shelf.innerHTML = '<p class="hint">Nothing saved yet. Build or pick a rice, then Save it.</p>';
    rices.forEach((r) => {
      const d = r.data;
      const c = document.createElement('div');
      c.className = 'shelf-card';
      c.innerHTML = `<div class="sc-top" style="background:${esc(d.palette?.bg || '#111')};color:${esc(d.palette?.fg || '#eee')}"><b>${esc(d.name)}</b>${d.palette ? sw(d.palette) : ''}</div>
        <div class="sc-acts"><button class="btn small primary" data-a="switch">Switch</button><button class="btn small" data-a="edit">Edit</button><button class="btn small ghost" data-a="del" title="Delete">Delete</button></div>`;
      c.querySelector('[data-a=switch]').onclick = async () => {
        await RB.app.loadState(d, 'custom');
        if (info) RB.app.setDistro(distroFromOs(info.os) || d.distro);
        cookCurrent();
      };
      c.querySelector('[data-a=edit]').onclick = async () => { await RB.app.loadState(d, 'custom'); RB.app.setTab('colours'); };
      c.querySelector('[data-a=del]').onclick = async () => {
        if (await confirmSheet('Delete this rice?', `Removes <b>${esc(d.name)}</b> from My rices. Your desktop doesn't change.`, 'Delete')) {
          await RCHost.call('deleteRice', r.file); await loadShelf(); RB.app.refresh();
        }
      };
      shelf.appendChild(c);
    });
    g1.querySelector('[data-a=save]').onclick = async () => {
      const name = prompt('Save this rice as:', s.name);
      if (!name) return;
      s.name = name.trim();
      const lite = RB.app.clone(s);
      await RCHost.call('saveRice', s.name, lite);
      await loadShelf(); RB.app.refresh(); RB.app.toast(`Saved ${s.name} to My rices`);
    };
    g1.querySelector('[data-a=cook]').onclick = cookCurrent;
    body.appendChild(g1);

    const g2 = document.createElement('div');
    g2.className = 'group';
    g2.innerHTML = `<h3>Backups <small>restore any earlier desktop</small></h3>
      ${backups.length ? '' : '<p class="hint">A backup is made every time you cook a rice.</p>'}
      <div class="backups">${backups.map((b, i) => `<div class="bk"><span><b>${esc(prettyDate(b.name))}</b>${i === backups.length - 1 ? ' <span class="tag gold">Original desktop</span>' : i === 0 ? ' <span class="tag">Latest</span>' : ''}</span><button class="btn small" data-i="${i}">Restore</button></div>`).join('')}</div>`;
    g2.querySelectorAll('[data-i]').forEach((b) => { b.onclick = () => restore(backups[+b.dataset.i]); });
    body.appendChild(g2);

    const g3 = document.createElement('div');
    g3.className = 'group';
    g3.innerHTML = `<h3>This computer</h3><p class="hint">${esc((info && info.os.PRETTY_NAME) || 'Unknown Linux')}, KDE Plasma ${esc(info.plasma || 'not found')}, ${esc(info.session || 'unknown')} session${info.flatpak ? ', running as a Flatpak' : ''}.</p>
      <button class="btn small ghost" data-a="unbox">Show the unboxing again</button>`;
    g3.querySelector('[data-a=unbox]').onclick = () => unbox();
    body.appendChild(g3);
  }

  /* ---------- unboxing ---------- */
  const BOX = `<svg viewBox="0 0 320 240" class="unbox-art pen" aria-hidden="true">
    <g class="rings"><circle cx="160" cy="150" r="60"/><circle cx="160" cy="150" r="95"/><circle cx="160" cy="150" r="130"/></g>
    <g class="cooker"><g class="steam"><path d="M138 92c-8-12 8-18 0-32"/><path d="M160 88c-8-12 8-20 0-36"/><path d="M182 92c-8-12 8-18 0-32"/></g>
      <path class="ink" d="M104 128h112v52a26 26 0 0 1-26 26h-60a26 26 0 0 1-26-26z"/><path class="ink" d="M96 128h128"/>
      <path class="ink" d="M126 128c0-14 15-24 34-24s34 10 34 24"/><rect class="ink" x="132" y="150" width="56" height="24" rx="5"/><circle class="led" cx="178" cy="162" r="3.5"/></g>
    <g class="box"><path class="ink" d="M70 120h180v96H70z"/><path class="ink thin" d="M160 120v96"/><text x="160" y="176" text-anchor="middle" class="box-label">RICE COOKER</text></g>
    <g class="lid lid-l"><path class="ink" d="M70 120l-24-34h114v34z"/></g>
    <g class="lid lid-r"><path class="ink" d="M250 120l24-34H160v34z"/></g>
  </svg>`;

  function unbox() {
    const m = modal('', { wide: true, closable: false });
    const d = distroFromOs(info.os);
    const isKde = /kde/i.test(info.desktop) || !!info.plasma;
    let step = 0;
    const featured = ['serpantinum', 'caelestia', 'astroland', 'celestial', 'hybridsummer', 'daynight'];
    const render = () => {
      const dots = `<div class="ub-dots">${[0, 1, 2, 3].map((i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
      if (step === 0) {
        m.el.innerHTML = `<div class="ub ub0">${BOX}<p class="kicker">A fresh box has arrived</p><h2>Rice Cooker<br><span>is ready to unbox.</span></h2>
          <p class="rc-p">It cooks KDE Plasma rices straight onto your desktop and keeps every earlier desktop safe.</p>
          <div class="rc-actions"><button class="btn primary" data-a="open">Unbox it</button></div>${dots}</div>`;
        m.el.querySelector('[data-a=open]').onclick = () => {
          m.el.querySelector('.unbox-art').classList.add('open');
          setTimeout(() => { step = 1; render(); }, 1400);
        };
      } else if (step === 1) {
        m.el.innerHTML = `<div class="ub"><p class="kicker">Step 1 of 3</p><h2>Here's your computer.<br><span>${d ? 'We know how to cook for it.' : 'We\'ll do our best.'}</span></h2>
          <dl class="ub-facts"><div><dt>System</dt><dd>${esc(info.os.PRETTY_NAME || 'Unknown')}</dd></div><div><dt>Desktop</dt><dd>${isKde ? `KDE Plasma ${esc(info.plasma || '')}` : esc(info.desktop || 'Not KDE')}</dd></div>
          <div><dt>Session</dt><dd>${esc(info.session || 'unknown')}</dd></div><div><dt>Commands for</dt><dd>${d ? esc(RB.catalog.DISTROS[d].long) : 'Pick a distro in the toolbar'}</dd></div></dl>
          ${isKde ? '' : '<p class="incompat">Rice Cooker changes KDE Plasma 6. On another desktop the commands will fail.</p>'}
          <p class="rc-p small">To change your desktop, Rice Cooker runs commands on your computer${info.flatpak ? ', outside the Flatpak sandbox' : ''}. It only runs the script it shows you, backs up first, and asks for your password through a system dialog when packages are needed.</p>
          <div class="rc-actions"><button class="btn primary" data-a="next">Looks right</button></div>${dots}</div>`;
        m.el.querySelector('[data-a=next]').onclick = () => { if (d) RB.app.setDistro(d); step = 2; render(); };
      } else if (step === 2) {
        m.el.innerHTML = `<div class="ub"><p class="kicker">Step 2 of 3</p><h2>Keep your desktop safe.<br><span>Save it before anything changes.</span></h2>
          <p class="rc-p">This copies your colours, panels, effects and terminal settings into <code>~/.local/share/rice-cooker/backups</code>. You can always come back to it from My rices.</p>
          <pre class="rc-lines mini"></pre>
          <div class="rc-actions"><button class="btn ghost" data-a="skip">Skip</button><button class="btn primary" data-a="backup">Back up my desktop</button></div>${dots}</div>`;
        m.el.querySelector('[data-a=skip]').onclick = () => { step = 3; render(); };
        m.el.querySelector('[data-a=backup]').onclick = async (e) => {
          e.target.disabled = true; e.target.textContent = 'Backing up…';
          const pre = m.el.querySelector('.rc-lines');
          const onLog = (l) => { const x = document.createElement('div'); x.textContent = l; pre.appendChild(x); };
          listeners.log = [onLog]; listeners.done = [async ({ code }) => {
            listeners.log = [appendLine]; listeners.done = [finish];
            await loadShelf();
            if (code === 0) { e.target.textContent = 'Saved'; setTimeout(() => { step = 3; render(); }, 700); }
            else { e.target.disabled = false; e.target.textContent = 'Try again'; }
          }];
          try { await RCHost.call('run', RB.gen.buildScript(RB.app.state, RB.app.state.distro, { only: ['backup'] }), 'Original desktop'); }
          catch (err) { onLog(err.message); listeners.log = [appendLine]; listeners.done = [finish]; e.target.disabled = false; }
        };
      } else {
        m.el.innerHTML = `<div class="ub"><p class="kicker">Step 3 of 3</p><h2>Pick your first rice.<br><span>You can switch any time.</span></h2>
          <div class="ub-grid">${featured.map((k) => { const p = RB.presets.BUILTIN[k]; return `<button class="ub-card" data-k="${k}" style="background:${p.palette.bg};color:${p.palette.fg}"><b>${esc(p.name)}</b>${sw(p.palette)}<small style="color:${p.palette.fgDim}">${esc(p.credit ? p.credit.by : p.group)}</small></button>`; }).join('')}</div>
          <div class="rc-actions"><button class="btn ghost" data-a="explore">Just look around</button><button class="btn primary" data-a="cook" disabled>Cook it</button></div>${dots}</div>`;
        let pick = null;
        m.el.querySelectorAll('.ub-card').forEach((b) => b.onclick = async () => {
          m.el.querySelectorAll('.ub-card').forEach((x) => x.setAttribute('aria-pressed', x === b));
          pick = b.dataset.k;
          await RB.app.loadState(RB.app.clone(RB.presets.BUILTIN[pick]), `builtin:${pick}`);
          if (d) RB.app.setDistro(d);
          m.el.querySelector('[data-a=cook]').disabled = false;
        });
        const done = () => { RCHost.call('setUnboxed', true); m.close(); RB.app.setTab('mine'); };
        m.el.querySelector('[data-a=explore]').onclick = done;
        m.el.querySelector('[data-a=cook]').onclick = () => { done(); cook(RB.app.state.name); };
      }
    };
    render();
  }

  /* ---------- start ---------- */
  async function init() {
    info = await RCHost.call('info');
    const d = distroFromOs(info.os);
    if (d && RB.app.state.distro !== d) RB.app.setDistro(d);
    // the toolbar gets a Cook button; sharing links makes no sense offline
    const bar = $('.preset-bar');
    const btn = document.createElement('button');
    btn.className = 'btn primary'; btn.id = 'btnCook'; btn.textContent = 'Cook it';
    btn.title = 'Apply this rice to your desktop now';
    btn.onclick = cookCurrent;
    bar.prepend(btn);
    const share = $('#btnShare'); if (share) share.hidden = true;
    const dl = $('#btnDownload'); if (dl) { dl.classList.remove('primary'); dl.textContent = 'Save .sh to Downloads'; }
    const out = $('.out-actions');
    const cookOut = btn.cloneNode(true); cookOut.id = ''; cookOut.onclick = cookCurrent; out.prepend(cookOut);
    $('.out-help').innerHTML = 'Cook it applies these steps to your desktop right now and shows the log. Each run backs up your KDE settings first; restore any backup from <b>My rices</b>.';
    await loadShelf();
    RB.app.setTab('mine');
    if (!info.unboxed) unbox();
  }

  RB.appmode = { init, tabMine, cook, restore };
})((window.RB = window.RB || {}));
