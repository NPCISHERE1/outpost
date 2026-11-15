/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Rooms: the outside, the bedroom and the rover. Arrows on the cockpit lead to them. */

/* ---------- edit these ---------- */
/* Arrows on the cockpit. side = which bottom corner, room = where it leads. */
const ARROWS = [
  { side: 'left',  label: 'Go outside',    room: 'outside' },
  { side: 'right', label: 'Go to bedroom', room: 'bedroom' }
];

/* greenhouse keypad */
const GREENHOUSE_CODE = '1969';
const GREENHOUSE_HINT = 'The year people first walked on the Moon.';

/* Each room: art, name tag, an optional back arrow, and clickable hotspots
   (x, y, w, h in image pixels, like the cockpit).
   go = 'room:<name>' | 'room:cockpit' | 'panel:<id>'.  exit = where Esc goes. */
const ROOMS = {
  outside: {
    img: 'assets/outside.png', title: 'Outside', exit: 'cockpit',
    hotspots: [
      { id: 'door', label: 'Door: go back inside',
        x: 205, y: 250, w: 95, h: 135, go: 'room:cockpit' },
      { id: 'rover', label: 'Rover',
        x: 465, y: 298, w: 212, h: 140, go: 'room:rover' },
      { id: 'greenhouse', label: () => (greenhouseOpen ? 'Greenhouse' : 'Greenhouse (locked)'),
        x: 672, y: 255, w: 352, h: 240, go: 'panel:greenhouse' }
    ]
  },
  bedroom: {
    img: 'assets/bedroom.png', title: 'Bedroom', exit: 'cockpit',
    back: { side: 'left', label: 'Back to the cockpit', to: 'cockpit' },
    hotspots: [
      { id: 'bed', label: 'Bed', x: 40, y: 328, w: 420, h: 225, go: 'panel:bed' }
    ]
  },
  rover: {
    img: 'assets/infront.png', title: 'Rover', exit: 'outside', research: true,
    hotspots: [
      { id: 'roverBack', label: 'Rover: drive back',
        x: 388, y: 290, w: 270, h: 160, go: 'room:outside' }
    ]
  }
};

/* the arrow is drawn pixel by pixel (X = filled), pointing left */
const ARROW_MAP = [
  '....X......',
  '...XX......',
  '..XXX......',
  '.XXXXXXXXX.',
  'XXXXXXXXXXX',
  '.XXXXXXXXX.',
  '..XXX......',
  '...XX......',
  '....X......'
];

/* ---------- drawing ---------- */
function arrowSVG(side) {
  const rows = side === 'left' ? ARROW_MAP : ARROW_MAP.map(r => [...r].reverse().join(''));
  const edge = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  let dark = '', gold = '';
  rows.forEach((r, y) => [...r].forEach((c, x) => {
    if (c !== 'X') return;
    gold += `<rect x="${x + 1}" y="${y + 1}" width="1" height="1"/>`;
    edge.forEach(([dx, dy]) => {
      dark += `<rect x="${x + 1 + dx}" y="${y + 1 + dy}" width="1" height="1"/>`;
    });
  }));
  const w = ARROW_MAP[0].length + 2, h = ARROW_MAP.length + 2;
  return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">` +
         `<g class="ol">${dark}</g><g class="fl">${gold}</g></svg>`;
}

const arrowsHTML = list => list.map(a =>
  `<button class="arrow ${a.side}" type="button" data-to="${esc(a.to)}" ` +
  `data-label="${esc(a.label)}" aria-label="${esc(a.label)}">${arrowSVG(a.side)}</button>`
).join('');

/* clickable objects in a room (same look as the cockpit hotspots) */
function roomHotHTML(list) {
  const pct = (v, t) => (v / t * 100).toFixed(2) + '%';
  return list.map(h => {
    const label = typeof h.label === 'function' ? h.label() : h.label;
    return `<button class="hot${h.y < ART.h * 0.3 ? ' below' : ''}" type="button" ` +
      `data-id="${h.id}" data-label="${esc(label)}" aria-label="${esc(label)}" ` +
      `style="left:${pct(h.x, ART.w)};top:${pct(h.y, ART.h)};` +
      `width:${pct(h.w, ART.w)};height:${pct(h.h, ART.h)}"></button>`;
  }).join('');
}

/* ---------- moving around ---------- */
let roomId = null, greenhouseOpen = false, flashTimer = null;
const roomsSeen = new Set();

function renderRoomHot() {
  $('roomHot').innerHTML = roomHotHTML(ROOMS[roomId].hotspots);
}

function goRoom(name) {
  const r = ROOMS[name];
  if (!r) return;
  roomId = name;
  resStop();
  holoClose();
  if (openId) closePanel();
  closeRoomPanel();
  $('cpToast').classList.add('hidden');
  $('roomToast').classList.add('hidden');

  $('roomArt').src = r.img;
  $('roomArt').alt = r.title;
  $('roomName').textContent = r.title;
  $('roomStage').classList.toggle('crew-lost', !!tab.failed);   // keep the red tint
  $('roomArrows').innerHTML = r.back ? arrowsHTML([r.back]) : '';
  renderRoomHot();
  $('research').classList.toggle('hidden', !r.research);
  if (r.research) resRender();
  show('sRoom');
  $('sRoom').focus({ preventScroll: true });

  if (!roomsSeen.has(name)) {                      // flash the clickable things once
    roomsSeen.add(name);
    $('roomStage').classList.add('show-hot');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => $('roomStage').classList.remove('show-hot'), 3000);
  }
}

function goCockpit() {
  resStop();
  closeRoomPanel();
  show('sCockpit');
  $('sCockpit').focus({ preventScroll: true });
}

const goTo = name => (name === 'cockpit' ? goCockpit() : goRoom(name));

function arrowClick(e) {
  const b = e.target.closest('.arrow');
  if (!b || sleeping) return;
  goTo(b.dataset.to);
}

/* arrow keys do the same as the arrows on screen */
function arrowKey(key) {
  const side = key === 'ArrowLeft' ? 'left' : 'right';
  const a = ARROWS.find(x => x.side === side);
  if (a) goRoom(a.room);
}

$('roomHot').addEventListener('click', e => {
  const b = e.target.closest('.hot');
  if (!b || sleeping) return;
  const [kind, arg] = ROOMS[roomId].hotspots.find(h => h.id === b.dataset.id).go.split(':');
  if (kind === 'room') goTo(arg);
  else openRoomPanel(arg);
});

/* ---------- panels in the rooms ---------- */
let roomPanelId = null;
const kp = { code: '', msg: '', cls: '', tries: 0, hint: false, lock: false };

const ROOM_PANELS = {
  bed: { title: 'Bed', body: () => {
    if (!missionStarted) {
      return '<p class="note">Begin the mission at the mission console first.</p>';
    }
    if (tab.over) {
      return `<p class="badge ${tab.failed ? 'bad' : 'ok'}">
        ${tab.failed ? 'Mission over' : 'Mission complete'}</p>
        <p class="note">Open the tablet to see your score.</p>`;
    }
    const a = tab.alloc;
    return `${row('Day', tab.day + ' of ' + MISSION_DAYS)}
      <p class="note">Your plan for tonight:</p>
      ${row('Life support', a.life)}${row('Radiation shield', a.shield)}
      ${row('Science lab', a.sci)}
      <p class="note">Change it on the tablet first. Sleeping ends the day.</p>
      <button class="go" type="button" data-k="sleep" data-act="sleep">
        Go to sleep &#9654;</button>`;
  } },

  keypad: { title: 'Greenhouse door', body: () => {
    const shown = kp.code.padEnd(GREENHOUSE_CODE.length, '_').split('').join(' ');
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'DEL', '0', 'OK'];
    return `<div class="kp-disp ${kp.cls}" aria-live="polite">${shown}</div>
      <p class="kp-msg ${kp.cls}">
        ${esc(kp.msg || 'Enter the ' + GREENHOUSE_CODE.length + ' digit code')}</p>
      <div class="kp-keys">${keys.map(k =>
        `<button type="button" data-k="k${k}" data-key="${k}"` +
        `${k === 'OK' ? ' class="okkey"' : ''}>${k}</button>`).join('')}</div>
      <button class="kp-hintbtn" type="button" data-k="hint" data-act="hint">
        ${kp.hint ? 'Hide hint' : 'Need a hint?'}</button>
      ${kp.hint ? `<p class="note">HINT: ${esc(GREENHOUSE_HINT)}</p>` : ''}`;
  } },

  greenhouse: { title: 'Greenhouse', body: () => `
    <p class="badge ok">Access granted</p>
    ${row('Status', 'OK')}
    ${row('Crops', 'Lettuce, peas')}
    ${row('Temperature', '22 C')}
    ${row('Humidity', '62%')}
    ${row('Station air', Math.round(ship.oxygen) + '%')}${bar(ship.oxygen)}
    <p class="note">Plants make oxygen and food for the crew.</p>` }
};

function renderRoomPanel() {
  const el = document.activeElement;
  const keep = el && el.dataset ? el.dataset.k : null;
  const p = ROOM_PANELS[roomPanelId];
  $('roomPanelTitle').textContent = p.title;
  $('roomPanelBody').innerHTML = p.body();
  if (keep) {                                      // keep keyboard focus after a redraw
    const again = $('roomPanelBody').querySelector(`[data-k="${keep}"]`);
    if (again) again.focus({ preventScroll: true });
  }
}

function openRoomPanel(id) {
  if (id === 'greenhouse' && !greenhouseOpen) id = 'keypad';   // locked: show the keypad
  if (id === 'keypad') Object.assign(kp, { code: '', msg: '', cls: '', lock: false });
  roomPanelId = id;
  renderRoomPanel();
  $('roomPanel').classList.remove('hidden');
  $('roomPanelWin').focus({ preventScroll: true });
}

function closeRoomPanel() {
  roomPanelId = null;
  $('roomPanel').classList.add('hidden');
}

/* ---------- greenhouse keypad ---------- */
function keypadPress(key) {
  if (kp.lock || roomPanelId !== 'keypad') return;
  if (key === 'OK') return keypadSubmit();
  if (key === 'DEL') kp.code = kp.code.slice(0, -1);
  else if (kp.code.length < GREENHOUSE_CODE.length) kp.code += key;
  kp.msg = '';
  kp.cls = '';
  renderRoomPanel();
}

function keypadSubmit() {
  if (kp.code.length < GREENHOUSE_CODE.length) {
    kp.msg = 'Type all ' + GREENHOUSE_CODE.length + ' digits';
    kp.cls = 'warn';
    return renderRoomPanel();
  }
  kp.lock = true;
  if (kp.code === GREENHOUSE_CODE) {
    greenhouseOpen = true;
    kp.msg = 'Access granted';
    kp.cls = 'ok';
    renderRoomPanel();
    renderRoomHot();                               // label loses "(locked)"
    setTimeout(() => { if (roomPanelId === 'keypad') openRoomPanel('greenhouse'); }, 900);
  } else {
    if (++kp.tries >= 3) kp.hint = true;           // stuck? show the hint
    kp.msg = 'Access denied';
    kp.cls = 'bad';
    renderRoomPanel();
    setTimeout(() => {
      if (roomPanelId !== 'keypad') return;
      Object.assign(kp, { code: '', msg: '', cls: '', lock: false });
      renderRoomPanel();
    }, 900);
  }
}

$('roomPanelBody').addEventListener('click', e => {
  const k = e.target.closest('[data-key]');
  if (k) return keypadPress(k.dataset.key);
  const a = e.target.closest('[data-act]');
  if (!a) return;
  if (a.dataset.act === 'sleep') { closeRoomPanel(); sleep(); }
  else if (a.dataset.act === 'hint') { kp.hint = !kp.hint; renderRoomPanel(); }
});
$('roomPanelClose').onclick = closeRoomPanel;
$('roomPanel').addEventListener('click', e => {
  if (e.target === $('roomPanel')) closeRoomPanel();
});

/* ---------- keyboard ---------- */
function roomKey(e) {
  if (sleeping) return;
  if (roomPanelId) {
    if (e.key === 'Escape') closeRoomPanel();
    else if (roomPanelId === 'keypad') {
      if (/^[0-9]$/.test(e.key))      { e.preventDefault(); keypadPress(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); keypadPress('DEL'); }
      else if (e.key === 'Enter')     { e.preventDefault(); keypadPress('OK'); }
    }
    return;
  }
  const r = ROOMS[roomId];
  if (r.research && e.key.toLowerCase() === 'r') return e.repeat ? undefined : resStart();
  if (e.key === 'Escape') return goTo(r.exit);
  if (e.key.toLowerCase() === 'h') return $('roomStage').classList.toggle('show-hot');
  if (r.back && e.key === (r.back.side === 'left' ? 'ArrowLeft' : 'ArrowRight')) {
    goTo(r.back.to);
  }
}

/* ---------- sleeping: this is how days pass now ---------- */
let sleeping = false, roomToastTimer = null;

function roomToast(text) {
  const t = $('roomToast');
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(roomToastTimer);
  roomToastTimer = setTimeout(() => t.classList.add('hidden'), 6500);
}

function sleep() {
  if (sleeping || tab.over || isDead) return;
  if (!missionStarted) {
    return roomToast('Begin the mission at the mission console first.');
  }
  const danger = sleepDanger();             // too little air, or the dose is at the limit: this sleep is deadly
  sleeping = true;
  $('roomToast').classList.add('hidden');
  $('sleepFade').classList.remove('hidden');          // screen fades to black

  setTimeout(() => {
    const day = tab.day, real = wxDay(day);
    if (danger) {                                     // the crew never wakes up
      tab.failed = danger;
      tab.over = true;
      sleeping = false;
      return startDeath(danger, { day, real, pre: true, shield: tab.alloc.shield, dose: ship.dose });
    }
    const night = { day, real, shield: tab.alloc.shield, res: tab.resN };
    const before = ship.dose;
    tabFinish();                                      // the day rules live in tablet.js
    $('roomStage').classList.toggle('crew-lost', !!tab.failed);
    $('sleepFade').classList.add('hidden');
    sleeping = false;
    if (tab.failed) {
      return startDeath(tab.failed, { ...night, dose: +(ship.dose - before).toFixed(2) });
    }
    if (tab.over) {                                   // survived every day: the tablet appears
      setTimeout(() => { goCockpit(); openTablet(); }, 500);
      return;
    }
    roomToast(tab.msg + ' A new day begins.');
  }, 1600);
}

/* ---------- research (rover scene): hold the button until the bar fills ---------- */
const res = { holding: false, progress: 0, raf: 0, last: 0 };
const resCost = () => AIR_PER_DAY * RESEARCH.dayShare * RESEARCH.airMult;   // air for one session

function resCan() {
  if (!missionStarted) return { ok: false, why: 'Begin the mission first' };
  if (tab.over) return { ok: false, why: tab.failed ? 'Mission over' : 'Mission complete' };
  if (tab.resN >= RESEARCH.maxPerDay) return { ok: false, why: 'Sleep to research again' };
  if (ship.oxygen < resCost() * (1 - res.progress) + 1) return { ok: false, why: 'Not enough air' };
  return { ok: true, why: '' };
}

function resStart() {
  if (res.holding || sleeping || roomId !== 'rover') return;
  resRender();
  const c = resCan();
  if (!c.ok) return roomToast(c.why + '.');
  $('roomToast').classList.add('hidden');
  res.holding = true;
  res.last = performance.now();
  if (!res.raf) res.raf = requestAnimationFrame(resFrame);
}

function resStop() { res.holding = false; }

function resFrame(now) {
  res.raf = 0;
  const dt = Math.min(100, now - res.last);          // ignore long gaps (tab switches)
  res.last = now;
  if (res.holding) {
    const step = Math.min(1 - res.progress, dt / RESEARCH.holdMs);
    const used = step * resCost();                    // the air drains while you hold
    if (ship.oxygen - used < 1) {
      res.holding = false;
      roomToast('Air is too low. Research stopped.');
    } else {
      res.progress += step;
      ship.oxygen -= used;
      ship.dose += step * resDose();                  // storms out here give radiation, shield or not
      if (ship.dose >= DOSE_LIMIT) return resDeath();
      if (res.progress >= 0.9999) resDone();
    }
  } else if (res.progress > 0) {
    res.progress = Math.max(0, res.progress - dt / 700);   // let go early: the bar falls back
  }
  resRender();
  if (res.holding || res.progress > 0) res.raf = requestAnimationFrame(resFrame);
}

/* radiation for one whole research session today (the real storm, not the forecast) */
const resDose = () => RESEARCH.stormDose[wxDay(tab.day).tier] || 0;

/* the dose reached the limit while working outside */
function resDeath() {
  res.holding = false;
  res.progress = 0;
  ship.dose = +ship.dose.toFixed(2);
  tab.failed = 'radiation';
  tab.over = true;
  startDeath('radiation', { day: tab.day, real: wxDay(tab.day), shield: tab.alloc.shield,
                            outside: true, dose: ship.dose });
}

function resDone() {
  res.holding = false;
  res.progress = 0;
  ship.oxygen = +ship.oxygen.toFixed(1);
  ship.dose = +ship.dose.toFixed(2);
  tab.sci += RESEARCH.sci;
  tab.resSci += RESEARCH.sci;
  tab.resN++;
  renderTab();                                         // the tablet's science blocks
  const rd = resDose();
  roomToast(`Research complete! +${RESEARCH.sci} science. Air is ${Math.round(ship.oxygen)}%.` +
            (rd ? ` Radiation +${rd}.` : ''));
}

function resRender() {
  const c = resCan(), cost = resCost(), f = tDay().fc;
  const left = Math.max(0, RESEARCH.maxPerDay - tab.resN);
  const air = Math.round(ship.oxygen);
  const tonight = Math.round(clamp(ship.oxygen - cost * (1 - res.progress) + tAir(), 0, 100));
  const lvl = v => (v < 20 ? 'bad' : v < 40 ? 'warn' : 'ok');
  const sunCls = f.tier === 2 ? 'bad' : f.tier === 1 ? 'warn' : 'ok';

  $('resInfo').innerHTML =
    `AIR <span class="${lvl(air)}">${air}%</span> &middot; ` +
    `TONIGHT <span class="${lvl(tonight)}">${tonight}%</span><br>` +
    `SUN <span class="${sunCls}">${esc(f.sun)} ${f.p}%</span>` +
    `<br>DOSE <span class="${ship.dose / DOSE_LIMIT > 0.7 ? 'bad' : 'ok'}">${ship.dose.toFixed(1)}/${DOSE_LIMIT}</span>` +
    '<br><span class="warn">STORMS OUTSIDE GIVE RADIATION</span>';
  $('resFill').style.setProperty('--p', res.progress);
  $('resLbl').textContent = res.holding ? `RESEARCHING ${Math.round(res.progress * 100)}%`
    : c.ok ? (res.progress > 0 ? 'KEEP HOLDING' : 'HOLD TO RESEARCH') : c.why;
  $('resSub').textContent = c.ok || res.progress > 0
    ? `AIR -${cost} (${RESEARCH.airMult}X USE) \u00B7 ${left} LEFT TODAY` : '';
  $('resBtn').classList.toggle('off', !c.ok && !res.holding);
  $('resBtn').classList.toggle('hold', res.holding);
}

/* mouse / touch: press and hold the button. Keyboard: hold R. */
$('resBtn').addEventListener('pointerdown', e => {
  e.preventDefault();
  $('resBtn').setPointerCapture(e.pointerId);
  resStart();
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t =>
  $('resBtn').addEventListener(t, resStop));
$('resBtn').addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'r') resStop(); });
window.addEventListener('blur', resStop);

/* ---------- start ---------- */
$('roomHotBtn').onclick = () => $('roomStage').classList.toggle('show-hot');
$('cpArrows').innerHTML = arrowsHTML(ARROWS.map(a => ({ ...a, to: a.room })));
$('cpArrows').addEventListener('click', arrowClick);
$('roomArrows').addEventListener('click', arrowClick);
Object.values(ROOMS).forEach(r => { new Image().src = r.img; });   // load the art early
