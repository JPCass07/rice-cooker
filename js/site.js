/* Rice Cooker — shared bits for the Inspiration and Download pages. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  $('#themeBtn')?.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('rc.theme', next); } catch (e) {}
  });

  const ideas = window.RB_IDEAS;
  if (!ideas) return;
  const card = (i) => `<article class="idea">
      ${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>` : `<b style="font-weight:500">${esc(i.name)}</b>`}<span class="tag">${esc(i.category)}</span>${i.plasma6 === 'yes' ? '<span class="tag yes">Plasma 6</span>' : ''}
      <p>${esc(i.notes || '')}</p></article>`;

  const wins = ideas.filter((i) => i.category === 'winner');
  $('#winners').innerHTML = wins.map((i) => `<article class="win-card">
      <span class="place">${esc(i.winner)}</span>
      <h3>${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.name)}</a>` : esc(i.name)}</h3>
      <p>${esc(i.notes || '')}</p></article>`).join('');
  $('#shells').innerHTML = ideas.filter((i) => i.category === 'shell').map(card).join('');

  const rest = ideas.filter((i) => !['winner', 'shell'].includes(i.category));
  const cats = ['all', ...new Set(rest.map((i) => i.category))];
  let cat = 'all';
  const draw = () => {
    $('#ideaFilter').innerHTML = cats.map((c) => `<button type="button" data-c="${c}" aria-pressed="${c === cat}">${c}</button>`).join('');
    $('#ideaFilter').querySelectorAll('button').forEach((b) => { b.onclick = () => { cat = b.dataset.c; draw(); }; });
    $('#allIdeas').innerHTML = rest.filter((i) => cat === 'all' || i.category === cat).map(card).join('');
  };
  draw();
})();
