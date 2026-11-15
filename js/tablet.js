/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Outpost tablet: a small playable day planner on top of the cockpit */
const tab = {
  open: false, over: false, day: 1,
  alloc: { ...TAB_START }, battery: 2, sci: 0,
  log: [], msg: '', qa: 0, showA: false, failed: null,
  resN: 0, resSci: 0              // research sessions / science from research today
};
let tabMsgTimer = null;

/* ---------- rules ---------- */
/* today: the real outcome (storm, dust) is hidden; the player only sees the forecast */
const tDay   = () => {
  const n = Math.min(tab.day, MISSION_DAYS), real = wxDay(n), w = tabWeather(n);
  return { storm: real.tier, dust: real.dust, icon: w.icon, text: w.text, fc: w.forecast };
};
const tBoost = () => (tDay().dust ? Math.min(tab.battery, 4) : 0);
const tTotal = () => (tDay().dust ? TAB_DUST_POWER : TAB_POWER) + tBoost();
const tUsed  = () => tab.alloc.life + tab.alloc.shield + tab.alloc.sci;
const tLeft  = () => tTotal() - tUsed();
const tAir   = () => tab.alloc.life * 8 - AIR_PER_DAY;
const tSci   = () => tab.alloc.sci;
const tBlocks = () => Math.min(5, Math.floor(tab.sci / TAB_SCI_TARGET * 5));

/* dose for a night of the given storm size (0 calm, 1 small, 2 big) with today's shield.
   Research outside takes its own dose at the rover (see rooms.js). */
function tDoseFor(tier) {
  const base = TAB_BASE_DOSE[tier || 0];
  const through = TAB_SHIELD_LEFT[Math.min(tab.alloc.shield, 5)];
  return +(base * through).toFixed(2);
}
const tDose = () => tDoseFor(tDay().storm);            // what REALLY happens (used when the day ends)
const tDoseGuess = () => tDoseFor(tDay().fc.tier);     // what the forecast says (used for the preview)

/* keep the cockpit screens in step with the tablet */
function syncShip() {
  ship.day = Math.min(tab.day, MISSION_DAYS);
  ship.battery = tab.battery * 20;
  ship.shield = Math.min(100, tab.alloc.shield * 25);
}

/* shrink the plan if tomorrow has less power (science goes first) */
function tTrim() {
  while (tLeft() < 0) {
    const a = tab.alloc;
    if (a.sci > 0) a.sci--;
    else if (a.shield > 0) a.shield--;
    else a.life--;
  }
}

/* ---------- screen ---------- */
const stars = (n, max) => '\u2605'.repeat(n) + '<s>\u2605</s>'.repeat(max - n);
const seg = (v, cls) => '<div class="seg ' + cls + '">' + Array.from({ length: 20 }, (_, i) =>
  `<i class="${i < Math.round(v / 5) ? 'on' : ''}"></i>`).join('') + '</div>';
/* science: full blocks, the next block fills little by little, and the points */
function sciBar() {
  const per = TAB_SCI_TARGET / 5;                        // points for one block
  const full = tBlocks(), frac = (tab.sci - full * per) / per;
  const boxes = Array.from({ length: 5 }, (_, i) => i < full ? '<i class="on"></i>'
    : i === full && frac > 0 ? `<i class="part" style="--f:${frac.toFixed(2)}"></i>` : '<i></i>');
  return `<div class="sq">${boxes.join('')}</div>` +
    `<p class="yel">${Math.min(tab.sci, TAB_SCI_TARGET)}/${TAB_SCI_TARGET} POINTS</p>`;
}
const sq = (n, cls) => '<div class="sq ' + cls + '">' + Array.from({ length: 5 }, (_, i) =>
  `<i class="${i < n ? 'on' : ''}"></i>`).join('') + '</div>';

function stepper(k) {
  const a = tab.alloc[k];
  return `<div class="step">
    <button type="button" data-k="${k}-" data-act="dec:${k}" aria-label="Less ${k}"
      ${a <= 0 ? 'disabled' : ''}>&minus;</button>
    <span>${a}</span>
    <button type="button" data-k="${k}+" data-act="inc:${k}" aria-label="More ${k}"
      ${tLeft() <= 0 ? 'disabled' : ''}>+</button></div>`;
}

const prow = (k, name, sub) => `<div class="prow">
  <div class="lbl"><b>${name}</b><small>${sub}</small></div>${stepper(k)}</div>`;

function screenHTML() {
  const d = tDay(), left = tLeft(), boost = tBoost();
  const air = ship.oxygen;
  const airCls = airLevel(air);
  const face = airCls === 'bad' ? '\uD83D\uDE1F' : airCls === 'orange' ? '\uD83D\uDE10' : '\uD83D\uDE42';
  const remain = clamp(100 - ship.dose / DOSE_LIMIT * 100, 0, 100);
  const rl = remain > 60 ? ['SAFE', 'ok'] : remain > 30 ? ['CAUTION', 'warn'] : ['DANGER', 'bad'];

  /* what today's plan would do */
  const airAfter = clamp(air + tAir(), 0, 100);
  const al = airLevel(airAfter);
  const a = al === 'ok' ? ['AIR IS OK', 'ok', '\uD83D\uDE42']
    : al === 'orange' ? ['AIR IS LOW', 'orange', '\uD83D\uDE10']
    : ['AIR IS DANGER', 'bad', '\uD83D\uDE1F'];
  const dose = tDoseGuess();
  const c = ship.dose + dose >= DOSE_LIMIT || dose >= 4 ? ['CREW IN DANGER', 'bad']
    : dose >= 1.5 ? ['CREW AT RISK', 'warn'] : ['CREW STAYS SAFE', 'ok'];
  const n = tSci() >= 10 ? 3 : tSci() >= 6 ? 2 : tSci() >= 3 ? 1 : 0;

  const logs = tab.log.map(l => `<li>${esc(l)}</li>`).join('') ||
    '<li class="dim">No days yet</li>';

  return `<div class="tab-l">
    <h4>OUTPOST STATUS</h4>
    <div><div class="hd"><span>\uD83D\uDCA8 AIR</span><em>${face}</em></div>
      ${seg(air, airCls)}</div>
    <div><div class="hd"><span>\u2622\uFE0F RADIATION</span>
        <span class="${rl[1]}">&bull; ${rl[0]}</span></div>
      <div class="fillbar ${rl[1]}"><i style="width:${remain}%"></i></div></div>
    <div><div class="hd"><span>\uD83E\uDE90 SCIENCE</span></div>${sciBar()}</div>
    <div><div class="hd"><span>\uD83D\uDD0B BATTERY</span></div>${sq(tab.battery, 'yel')}
      <p class="yel">${tab.battery}/5 SAVED</p></div>
    <p class="mini">TOTAL DOSE<br>${ship.dose.toFixed(1)} / ${DOSE_LIMIT}
      <span class="u">mSv</span></p>
    <ul class="log">${logs}</ul>
  </div>
  <div class="tab-r">
    <h4 class="day">DAY ${Math.min(tab.day, MISSION_DAYS)} OF ${MISSION_DAYS}</h4>
    <p class="wx"><span>${d.icon}</span> ${esc(d.text)}</p>
    <p class="mini dim">FORECAST FROM ECHO. IT CAN BE WRONG!</p>
    <div class="pow"><b class="yel">\u26A1 POWER TO SHARE</b>
      ${left === 0 ? '<span class="ok">\u2714</span>'
        : `<span class="yel">${left} LEFT</span>`}</div>
    ${boost ? `<p class="mini yel">+${boost} FROM BATTERY</p>` : ''}
    ${prow('life', '\uD83E\uDEC1 LIFE SUPPORT', 'MAKES AIR')}
    ${prow('shield', '\uD83D\uDEE1\uFE0F RADIATION SHIELD', 'BLOCKS RADS')}
    ${prow('sci', '\uD83E\uDDEA SCIENCE LAB', 'DOES COOL STUFF')}
    <div class="sum">
      <p><span class="${a[1]}">${a[0]}</span><em>${a[2]}</em></p>
      <p><span class="${c[1]}">${c[0]}</span><em class="dot ${c[1]}">\u25CF</em></p>
      <p><span>SCIENCE</span><em class="st yel">${stars(n, 3)}</em></p>
    </div>
    <p class="mini dim sleephint">\uD83D\uDCA4 SLEEP IN THE BEDROOM TO END THE DAY</p>
  </div>`;
}

function endHTML() {
  if (tab.failed) {
    const why = {
      radiation: ['TOO MUCH RADIATION', 'Radiation adds up every day. The crew went over the safe limit.'],
      storm: ['A HUGE STORM HIT', 'One big dose of radiation was too much for the crew.'],
      air: ['THE AIR RAN OUT', 'Life support did not get enough power.']
    }[tab.failed];
    return `<div class="tab-end fail">
      <h4 class="bad">MISSION FAILED</h4>
      <p class="bad">${why[0]}</p>
      <p>The crew was lost on DAY ${Math.min(tab.day, MISSION_DAYS)}.</p>
      <p class="dim">${why[1]}</p>
      <p class="dim">DOSE ${ship.dose.toFixed(1)} / ${DOSE_LIMIT} mSv</p>
      <div class="endbtns">
        <button class="fin" type="button" data-k="again" data-act="restart">TRY AGAIN</button>
        <button class="fin" type="button" data-k="done" data-act="close">CLOSE</button>
      </div></div>`;
  }
  return `<div class="tab-end">
    <h4 class="yel">MISSION COMPLETED!</h4>
    <p>The crew survived ${MISSION_DAYS} days.</p>
    <p>It is time to go home, Commander.</p>
    <p class="dim">${esc(sourceTag())}</p>
    <div class="endbtns">
      <button class="fin" type="button" data-k="home" data-act="home">GO HOME</button>
    </div></div>`;
}

function dockHTML() {
  const qa = TAB_QA[tab.qa];
  const text = tab.msg || (tab.showA ? qa.a : qa.q);
  return `<button type="button" data-k="qa" data-act="qa">&gt; ${esc(text)}</button>`;
}

/* make emoji a bit bigger, like the pictures in the design */
const EMOJI = /\p{Extended_Pictographic}(\uFE0F|\u200D\p{Extended_Pictographic})*/gu;
const bigIcons = html => html.replace(EMOJI, '<span class="ic">$&</span>');

function renderTab() {
  const el = document.activeElement;
  const keep = el && el.dataset ? el.dataset.k : null;
  $('tabScreen').innerHTML = bigIcons(tab.over ? endHTML() : screenHTML());
  $('tabDock').innerHTML = dockHTML();
  syncShip();
  if (keep) {
    const again = $('tab').querySelector(`[data-k="${keep}"]`);
    if (again && !again.disabled) again.focus({ preventScroll: true });
  }
}

/* the day report stays in the bottom bar until the player taps it */
function tabNote(text) {
  tab.msg = text;
}

/* ---------- actions ---------- */
function tabFinish() {
  if (tab.over) return;
  const dose = tDose(), airD = tAir(), sci = tSci();
  const boost = tBoost(), spare = Math.max(0, tLeft());
  const real = wxDay(tab.day), guess = tDay().fc;

  wxHist.push({ day: tab.day, predTier: guess.tier, predP: guess.p, tier: real.tier,
               flare: real.extra ? '' : real.flare });
  ship.oxygen = clamp(ship.oxygen + airD, 0, 100);
  ship.dose = +(ship.dose + dose).toFixed(2);
  ship.radBase = Math.max(0.3, dose);
  ship.rad = Math.max(0.3, dose);
  tab.sci += sci;
  tab.battery = clamp(tab.battery - boost + Math.floor(spare / 2), 0, 5);
  tab.log = [`DAY ${tab.day}: AIR ${airD >= 0 ? '+' : ''}${airD}, DOSE ${dose.toFixed(1)}, ` +
             `SCI +${sci}${tab.resSci ? ' +' + tab.resSci + ' RES' : ''}`, ...tab.log].slice(0, 3);

  /* what the Sun really did today */
  const what = real.extra ? TIER_NAME[real.tier].toUpperCase() + ' (EXTRA)'
    : real.flare ? `${real.flare} FLARE` : TIER_NAME[real.tier].toUpperCase();
  tabNote(`DAY ${tab.day} DONE. SUN: ${what}${real.date && !real.extra ? ' (' + nice(real.date) + ')' : ''}. ` +
          `DOSE +${dose.toFixed(1)}.`);

  /* the crew does not survive too much radiation, or no air */
  tab.failed = ship.dose >= DOSE_LIMIT ? 'radiation'
    : dose >= DOSE_ACUTE ? 'storm'
    : ship.oxygen <= 0 ? 'air' : null;

  tab.resN = 0;
  tab.resSci = 0;
  if (tab.failed) {
    tab.over = true;
    $('cpStage').classList.add('crew-lost');
    holoClose();
  } else {
    tab.day++;
    if (tab.day > MISSION_DAYS) tab.over = true;
    else tTrim();
  }
  renderTab();
}

function tabRestart() {
  Object.assign(ship, SHIP_START);
  Object.assign(tab, { over: false, day: 1, alloc: { ...TAB_START },
                       battery: 2, sci: 0, log: [], msg: '', qa: 0, showA: false, failed: null,
                       resN: 0, resSci: 0 });
  wxHist.length = 0;
  wx.seed = (Date.now() % 100000) + 1;               // new forecast guesses, same real Sun days
  $('cpStage').classList.remove('crew-lost');
  renderTab();
}

function openTablet() {
  if (!missionStarted) return;           // locked until Begin mission
  holoClose();
  if (openId) closePanel();
  tab.open = true;
  renderTab();
  $('tabWrap').classList.remove('hidden');
  $('cpStage').classList.add('tab-up');
  $('tab').focus({ preventScroll: true });
}

function closeTablet() {
  tab.open = false;
  $('tabWrap').classList.add('hidden');
  $('cpStage').classList.remove('tab-up');
  if (lastHot) lastHot.focus({ preventScroll: true });
}

/* ---------- events ---------- */
function tabClick(e) {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const [act, k] = b.dataset.act.split(':');
  if (act === 'inc' && tLeft() > 0) tab.alloc[k]++;
  else if (act === 'dec' && tab.alloc[k] > 0) tab.alloc[k]--;
  else if (act === 'restart') return tabRestart();
  else if (act === 'close') return closeTablet();
  else if (act === 'home') return startEnding();
  else if (act === 'qa') {
    if (tab.msg) tab.msg = '';
    else if (!tab.showA) tab.showA = true;
    else { tab.showA = false; tab.qa = (tab.qa + 1) % TAB_QA.length; }
  }
  renderTab();
}

$('tabScreen').addEventListener('click', tabClick);
$('tabDock').addEventListener('click', tabClick);
$('tabClose').onclick = closeTablet;
$('tabWrap').addEventListener('click', e => {
  if (e.target === $('tabWrap')) closeTablet();
});
