/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Cockpit scene: clickable hotspots over the artwork */
const ship = { ...SHIP_START };
const doseHist = Array(16).fill(ship.rad);
const logDone = new Set(LOG.filter(l => l.done).map(l => l.id));
const toastIdx = {};
const holo = { q: [], opts: [], mode: null, text: '', typer: null,
               typing: false, asked: new Set(), idx: 0, panel: null };
let openId = null, lastHot = null, cpTimer = null, toastTimer = null, cpBuilt = false;
let missionStarted = false;       // the tablet stays locked until this is true

/* ---------- helpers ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const good = v => (v < 30 ? 'bad' : v < 60 ? 'warn' : 'ok');
/* air colour everywhere: green above 50%, orange from 50% down, red below 30% */
const airLevel = v => (v < 30 ? 'bad' : v <= 50 ? 'orange' : 'ok');
const bar = (v, cls) =>
  `<div class="bar ${cls || good(v)}"><i style="width:${clamp(v, 0, 100)}%"></i></div>`;
const MSV = '<span class="u">mSv</span>';   // keep the unit lowercase
const row = (k, v) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`;
const radLevel = v => (v < 0.8 ? { n: 'Low', c: 'ok' }
  : v < 1.5 ? { n: 'Elevated', c: 'warn' } : { n: 'High', c: 'bad' });

/* ---------- data panels ---------- */
const PANELS = {
  status: { title: 'Ship status', live: true, body: () => {
    const ok = ship.fuel >= 30 && ship.hull >= 50;
    return `<p class="badge ${ok ? 'ok' : 'bad'}">${ok ? 'Optimal' : 'Check ship'}</p>
      ${row('Fuel', ship.fuel + '%')}${bar(ship.fuel)}
      ${row('Power', Math.round(ship.power) + '%')}${bar(ship.power)}
      ${row('Battery', Math.round(ship.battery) + '%')}${bar(ship.battery)}
      ${row('Hull', ship.hull + '%')}${bar(ship.hull)}
      <p class="note">Fuel is only used when we move. Parked means fuel is safe.</p>`;
  } },

  radiation: { title: 'Radiation monitor', live: true, body: () => {
    const lv = radLevel(ship.rad), pct = ship.dose / DOSE_LIMIT * 100;
    const spark = doseHist.map(v =>
      `<i style="height:${clamp((v - 0.2) / 0.5 * 100, 8, 100)}%"></i>`).join('');
    return `<div class="big ${lv.c}">${ship.rad.toFixed(2)}` +
      `<small> ${MSV}/day</small></div>
      <p class="badge ${lv.c}">${lv.n}</p>
      <div class="spark" aria-hidden="true">${spark}</div>
      ${row('Total dose', ship.dose.toFixed(1) + ' / ' + DOSE_LIMIT + ' ' + MSV)}
      ${bar(pct, pct > 70 ? 'bad' : pct > 40 ? 'warn' : 'ok')}
      ${row('Shields', ship.shield + '%')}${bar(ship.shield)}
      <p class="note">Dose adds up and never goes away. Raise shields before a storm.</p>`;
  } },

  forecast: { title: 'Space weather', live: true, body: () => {
    const d = clamp(ship.day, 1, MISSION_DAYS);
    const rows = [0, 1, 2, 3, 4].filter(k => d + k <= MISSION_DAYS).map(k => {
      const f = forecastFor(d, d + k);
      const lo = (f.dose * 0.6).toFixed(1), hi = (f.dose * 1.6).toFixed(1);
      const cls = f.p >= 60 ? 'bad' : f.p >= 30 ? 'warn' : 'ok';
      return `<div class="fc">
        <div class="kv"><b>${k ? 'Day ' + f.day : 'Today'} &middot; ${f.sun}</b><span>${f.p}% storm</span></div>
        ${bar(f.p, cls)}
        <small>Without shield: ${lo}-${hi} ${MSV}/day &middot; Sure: ${f.conf}</small></div>`;
    }).join('');
    return rows + `<p class="note">New forecast every day. Further days are less sure, and any day can be wrong!</p>` +
      `<p class="note tag">${esc(sourceLine())}</p>`;
  } },

  map: { title: 'Mission map', body: () => `
    ${row('Position', 'Landing zone')}
    ${row('Distance to Earth', '384,400 km')}
    ${row('Signal delay', '1.3 s')}
    ${row('Mission day', ship.day + ' / ' + MISSION_DAYS)}
    ${bar(ship.day / MISSION_DAYS * 100, 'ok')}
    <p class="note">Every day counts. Plan your power before it runs out.</p>` },

  link: { title: 'Earth link', live: true, body: () => `
    ${row('Signal', ship.signal + '%')}${bar(ship.signal)}
    <ul class="msgs">${missionMessages().map(m => `<li>${esc(m)}</li>`).join('')}</ul>` },

  air: { title: 'Life support', body: () => `
    ${row('Oxygen', Math.round(ship.oxygen) + '%')}${bar(ship.oxygen, airLevel(ship.oxygen))}
    ${row('CO2', ship.co2.toFixed(2) + '%')}
    ${row('Temperature', ship.temp + ' C')}
    <p class="note">Making air uses power. More air means less for other things.</p>` },

  log: { title: 'Mission log', body: () => {
    const items = LOG.map(l => {
      const d = logDone.has(l.id);
      return `<button class="chk" type="button" data-id="${l.id}" aria-pressed="${d}">` +
             `<i>${d ? '&#9632;' : '&#9633;'}</i> ${esc(l.text)}</button>`;
    }).join('');
    return `${row('Done', logDone.size + ' / ' + LOG.length)}${items}`;
  } },

  console: { title: 'Mission console', body: () => `
    <ul class="msgs">${CONSOLE_CHECKS.map(c => `<li>${esc(c)}</li>`).join('')}</ul>
    ${missionStarted
      ? `<p class="badge ok">Mission started</p>
         <button class="go" type="button" data-act="tablet">Open tablet &#9654;</button>`
      : '<button class="go" type="button" data-act="begin">Begin mission &#9654;</button>'}` }
};

function renderPanel() { $('cpBody').innerHTML = PANELS[openId].body(); }

function openPanel(id) {
  holoClose();
  openId = id;
  $('cpTitle').textContent = PANELS[id].title;
  renderPanel();
  $('cpPanel').classList.remove('hidden');
  $('cpClose').focus({ preventScroll: true });
}

function closePanel() {
  openId = null;
  $('cpPanel').classList.add('hidden');
  if (lastHot) lastHot.focus({ preventScroll: true });
}

/* ---------- toast (flavor hotspots) ---------- */
function toast(key) {
  const list = TOASTS[key];
  const i = toastIdx[key] = ((toastIdx[key] ?? -1) + 1) % list.length;
  const t = $('cpToast');
  t.textContent = list[i];
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

/* ---------- hologram ---------- */
function holoOpen(greet) {
  closePanel();
  holo.panel = null;
  holo.q = greet ? HOLO_GREETING() : HOLO_AGAIN();
  $('holo').classList.remove('hidden');
  $('holo').focus({ preventScroll: true });
  holoNext();
}

function holoClose() {
  clearInterval(holo.typer);
  holo.mode = null;
  holo.typing = false;
  $('holo').classList.add('hidden');
}

function holoNext() {
  if (holo.q.length) holoLine(holo.q.shift());
  else holoMenu();
}

function holoLine(text) {
  holo.mode = 'line';
  holo.text = text;
  holo.typing = true;
  const p = $('holoLine');
  p.classList.remove('hidden');
  p.textContent = '';
  $('holoChoices').classList.add('hidden');
  let n = 0;
  clearInterval(holo.typer);
  holo.typer = setInterval(() => {
    p.textContent = text.slice(0, ++n);
    if (n >= text.length) holoDone();
  }, TYPE_MS);
}

function holoDone() {
  clearInterval(holo.typer);
  holo.typing = false;
  $('holoLine').textContent = holo.text;
}

function holoAdvance() {
  if (holo.mode !== 'line') return;
  if (holo.typing) holoDone();
  else holoNext();
}

function holoMenu() {
  holo.mode = 'choose';
  const o = [];
  if (holo.panel) {
    const id = holo.panel;
    o.push({ t: '\u25B6 Open ' + PANELS[id].title,
             run: () => { holoClose(); openPanel(id); } });
  }
  HOLO_TOPICS.forEach((tp, i) => o.push({
    t: tp.ask, done: holo.asked.has(i),
    run: () => { holo.asked.add(i); holo.panel = tp.panel || null; holo.q = tp.say(); holoNext(); }
  }));
  o.push({ t: 'Close', go: true, run: holoClose });
  holo.opts = o;

  $('holoLine').classList.add('hidden');
  $('holoChoices').innerHTML = o.map((x, i) =>
    `<button type="button" role="option" data-i="${i}" ` +
    `class="${x.done ? 'done' : ''}${x.go ? ' go' : ''}">${esc(x.t)}</button>`).join('');
  $('holoChoices').classList.remove('hidden');
  holoCur(0);
}

function holoCur(i) {
  const b = $('holoChoices').querySelectorAll('button');
  holo.idx = (i + b.length) % b.length;
  b.forEach((x, j) => x.classList.toggle('cur', j === holo.idx));
}

function holoPick(i) {
  if (holo.mode === 'choose' && holo.opts[i]) holo.opts[i].run();
}

/* ---------- start / live values / hand-off ---------- */
function tick() {
  const b = ship.radBase;      // wobble around today's dose rate
  ship.rad = +clamp(ship.rad + (Math.random() - 0.5) * 0.08 * b / 0.46,
                    b * 0.8, b * 1.2).toFixed(2);
  ship.power = clamp(ship.power + (Math.random() - 0.5) * 2, 78, 86);
  ship.signal = Math.round(clamp(ship.signal + (Math.random() - 0.5) * 4, 82, 94));
  doseHist.push(ship.rad);
  doseHist.shift();
  if (openId && PANELS[openId].live) renderPanel();
}

function toggleHot() { $('cpStage').classList.toggle('show-hot'); }

/* the tablet's hotspot says whether it is locked */
function updateTabletHotspot() {
  const b = $('cpHot').querySelector('[data-id=tablet]');
  if (!b) return;
  const label = missionStarted ? 'Outpost tablet' : 'Tablet (locked)';
  b.dataset.label = label;
  b.setAttribute('aria-label', label);
}

/* Begin mission (mission console): unlocks the tablet and opens it */
function beginMission() {
  if (missionStarted) return;
  missionStarted = true;
  lockWeather();
  updateTabletHotspot();
  const hook = window.OutpostMenu && window.OutpostMenu.onBegin;
  if (typeof hook === 'function') hook({ ...player, ship: { ...ship } });
  closePanel();
  openTablet();
}

function buildCockpit() {
  cpBuilt = true;
  $('cpArt').src = COCKPIT_IMG;
  const pct = (v, t) => (v / t * 100).toFixed(2) + '%';

  $('cpHot').innerHTML = HOTSPOTS.map(h =>
    `<button class="hot${h.round ? ' round' : ''}${h.y < ART.h * 0.3 ? ' below' : ''}" ` +
    `type="button" data-id="${h.id}" data-label="${esc(h.label)}" ` +
    `aria-label="${esc(h.label)}" style="left:${pct(h.x, ART.w)};top:${pct(h.y, ART.h)};` +
    `width:${pct(h.w, ART.w)};height:${pct(h.h, ART.h)}"></button>`).join('');

  /* hologram portrait = a crop of the artwork, so no new art is needed */
  const c = HOLO_CROP, p = $('holoPortrait').style;
  p.backgroundImage = `url("${COCKPIT_IMG}")`;
  p.backgroundSize = (ART.w / c.s * 100) + '% auto';
  p.backgroundPosition = `${c.x / (ART.w - c.s) * 100}% ${c.y / (ART.h - c.s) * 100}%`;
  $('holoName').textContent = HOLO.name;
  updateTabletHotspot();

  /* mouse */
  $('cpHot').addEventListener('click', e => {
    const b = e.target.closest('.hot');
    if (!b) return;
    lastHot = b;
    const [kind, arg] = HOTSPOTS.find(h => h.id === b.dataset.id).go.split(':');
    if (kind === 'panel') openPanel(arg);
    else if (kind === 'toast') toast(arg);
    else if (kind === 'tablet') missionStarted ? openTablet() : toast('locked');
    else holoOpen(false);
  });
  $('cpHotBtn').onclick = toggleHot;
  $('cpClose').onclick = closePanel;
  $('cpPanel').addEventListener('click', e => {
    if (e.target === $('cpPanel')) closePanel();
  });
  $('cpBody').addEventListener('click', e => {
    const chk = e.target.closest('.chk');
    if (chk) {
      logDone.has(chk.dataset.id) ? logDone.delete(chk.dataset.id) : logDone.add(chk.dataset.id);
      renderPanel();
    } else if (e.target.closest('[data-act=begin]')) beginMission();
    else if (e.target.closest('[data-act=tablet]')) { closePanel(); openTablet(); }
  });
  $('holo').addEventListener('click', holoAdvance);
  $('holoChoices').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    e.stopPropagation();
    holoPick(+b.dataset.i);
  });
  $('holoChoices').addEventListener('mouseover', e => {
    const b = e.target.closest('button');
    if (b) holoCur(+b.dataset.i);
  });
}

function startCockpit() {
  if (!cpBuilt) buildCockpit();
  clearInterval(cpTimer);
  cpTimer = setInterval(tick, 2000);
  show('sCockpit');
  $('cpStage').classList.add('show-hot');            // flash the hotspots once
  setTimeout(() => $('cpStage').classList.remove('show-hot'), 3000);
  holoOpen(true);
}

/* ---------- keyboard ---------- */
function cockpitKey(e) {
  if (tab.open) {
    if (e.key === 'Escape') closeTablet();
    return;
  }
  if (openId) {
    if (e.key === 'Escape') closePanel();
    return;
  }
  if (!$('holo').classList.contains('hidden')) {
    if (e.key === 'Escape') return holoClose();
    if (holo.mode === 'line') {
      if (isConfirm(e)) { e.preventDefault(); holoAdvance(); }
    } else if (e.key === 'ArrowDown') { e.preventDefault(); holoCur(holo.idx + 1); }
    else if (e.key === 'ArrowUp')     { e.preventDefault(); holoCur(holo.idx - 1); }
    else if (isConfirm(e))            { e.preventDefault(); holoPick(holo.idx); }
    else if (/^[1-9]$/.test(e.key))   holoPick(+e.key - 1);
    return;
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return arrowKey(e.key);
  if (e.key.toLowerCase() === 'h') toggleHot();
}
