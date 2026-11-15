/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Real NASA space weather + the daily forecast + Echo's daily lines.
   Data: NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)
   https://api.nasa.gov  ->  FLR (solar flares), SEP (solar energetic particles), CME (coronal mass ejections).

   How real events become game days (rules we made up to keep it simple for kids):
     storm 0 = calm  : no M or X flare, no particle event, no fast CME
     storm 1 = small : an M-class flare, or a fast CME arrives (the day after it leaves the Sun)
     storm 2 = BIG   : an X-class flare, a solar energetic particle (SEP) event, or a very fast CME
   HARD MODE (see HARD in tablet-data.js) then adds extra storm days on top, in waves, so storms are much
   more frequent than the real Sun. Those days are marked `extra` and are never shown as NASA events.
   The game plays the busiest 20-day stretch of the last 30 days. If NASA cannot be reached it plays a
   practice schedule that is NOT real data (and says so on screen). */

const wx = {
  source: 'practice',       // 'live' | 'cached' | 'practice'
  days: null,               // one entry per mission day: { date, tier, flare, sep, cme }
  from: '', to: '',
  partial: false,           // true if only some of the 3 data sets loaded
  seed: 1,
  ready: false, locked: false
};
const wxHist = [];          // what Echo said vs what happened: { day, predTier, predP, tier, flare }

/* ---------- small helpers ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const isoDay = d => d.toISOString().slice(0, 10);
const addDays = (iso, n) => isoDay(new Date(Date.parse(iso + 'T00:00:00Z') + n * 864e5));
const nice = iso => {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).toUpperCase();
};
const SUN = ['Calm', 'Active', 'Storm watch'];
const TIER_NAME = ['calm', 'small storm', 'BIG storm'];

/* ---------- practice schedule (not real data) ---------- */
const PRACTICE_TIERS = [0, 0, 0, 1, 2, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0];
function practiceDays() {
  return Array.from({ length: MISSION_DAYS }, (_, i) =>
    ({ date: '', tier: PRACTICE_TIERS[i % PRACTICE_TIERS.length], flare: '', sep: false, cme: 0 }));
}

/* ---------- load real data ---------- */
async function donki(type, a, b) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`https://api.nasa.gov/DONKI/${type}?startDate=${a}&endDate=${b}&api_key=${NASA_KEY}`,
                            { signal: ctl.signal });
    if (!res.ok) throw new Error(type + ' ' + res.status);
    const j = await res.json();
    return Array.isArray(j) ? j : [];
  } finally { clearTimeout(t); }
}

/* turn the three lists into 30 days of {tier, flare, sep, cme} */
function buildCalendar(flr, sep, cme, end) {
  const dates = Array.from({ length: 30 }, (_, i) => addDays(end, i - 29));
  const cal = {};
  dates.forEach(d => { cal[d] = { date: d, flareRank: -1, flare: '', sep: false, cmeSpeed: 0 }; });

  const rank = { X: 3, M: 2, C: 1, B: 0, A: 0 };
  flr.forEach(f => {
    const m = /^([ABCMX])(\d+(\.\d+)?)/.exec(f.classType || '');
    const d = (f.peakTime || f.beginTime || '').slice(0, 10);
    if (!m || !cal[d]) return;
    const score = rank[m[1]] * 100 + parseFloat(m[2]);
    if (score > cal[d].flareRank) { cal[d].flareRank = score; cal[d].flare = m[1] + m[2]; }
  });
  sep.forEach(s => {
    const d = (s.eventTime || '').slice(0, 10);
    if (cal[d]) cal[d].sep = true;
  });
  cme.forEach(c => {
    const d = (c.startTime || '').slice(0, 10);
    const speeds = (c.cmeAnalyses || []).map(a => +a.speed || 0);
    const sp = Math.max(0, ...speeds);
    if (cal[d]) cal[d].cmeSpeed = Math.max(cal[d].cmeSpeed, sp);
  });

  return dates.map((d, i) => {
    const c = cal[d], prev = i > 0 ? cal[dates[i - 1]] : null;
    let tier = 0;
    if (c.flareRank >= 300) tier = 2;
    else if (c.flareRank >= 200) tier = 1;
    if (c.sep) tier = 2;
    if (prev && prev.sep) tier = Math.max(tier, 1);
    if (prev && prev.cmeSpeed >= 1500) tier = 2;
    else if (prev && prev.cmeSpeed >= 800) tier = Math.max(tier, 1);
    return { date: d, tier, flare: c.flare, sep: c.sep, cme: Math.round(c.cmeSpeed) };
  });
}

/* the busiest 20 days in the 30 (latest wins a tie) */
function pickWindow(days) {
  let best = 0, bestScore = -1;
  for (let i = 0; i + MISSION_DAYS <= days.length; i++) {
    const score = days.slice(i, i + MISSION_DAYS).reduce((s, d) => s + d.tier * d.tier + (d.sep ? 1 : 0), 0);
    if (score >= bestScore) { bestScore = score; best = i; }
  }
  return days.slice(best, best + MISSION_DAYS);
}

/* HARD MODE: the real (or practice) days are the base, then the game adds extra storms.
   Seeded by the first date, so the same dates always give the same extra storms. */
function hardenDays(days) {
  const out = days.map(d => ({ ...d, extra: false }));
  if (!HARD.on) return out;
  let h = 2166136261;
  for (const ch of (days[0].date || 'practice')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rng = mulberry32(h >>> 0);
  out.forEach((d, i) => {
    if (i >= HARD.safeDays) {
      if (d.tier === 0 && rng() < HARD.calmToSmall) { d.tier = 1; d.extra = true; }
      else if (d.tier === 1 && rng() < HARD.smallToBig) { d.tier = 2; d.extra = true; }
    }
    const next = out[i + 1];                       // storms come in waves
    if (HARD.waves && d.tier === 2 && next && next.tier === 0) { next.tier = 1; next.extra = true; }
  });
  return out;
}

function useDays(days, source) {
  wx.days = hardenDays(days);
  wx.source = source;
  wx.from = days[0].date;
  wx.to = days[days.length - 1].date;
}

async function loadWeather() {
  useDays(practiceDays(), 'practice');
  wx.from = wx.to = '';
  if (USE_LIVE_NASA) {
    const end = isoDay(new Date()), start = addDays(end, -29);
    try {
      const cached = JSON.parse(localStorage.getItem('outpost-wx-v1') || 'null');
      if (cached && cached.end === end && cached.days.length === MISSION_DAYS) {
        useDays(cached.days, 'cached');
        wx.ready = true;
        return;
      }
    } catch (e) { /* no storage: fine */ }
    try {
      const [f, s, c] = await Promise.allSettled([
        donki('FLR', start, end), donki('SEP', start, end), donki('CME', start, end)]);
      if (f.status === 'fulfilled') {
        const cal = buildCalendar(f.value, s.status === 'fulfilled' ? s.value : [],
                                  c.status === 'fulfilled' ? c.value : [], end);
        const days = pickWindow(cal);
        wx.partial = s.status !== 'fulfilled' || c.status !== 'fulfilled';
        useDays(days, 'live');
        try { localStorage.setItem('outpost-wx-v1', JSON.stringify({ end, days })); } catch (e) { /* ok */ }
      }
    } catch (e) { /* stay on practice data */ }
  }
  wx.ready = true;
}

/* the game freezes the schedule when the mission begins */
function lockWeather() { wx.locked = true; wx.seed = (Date.now() % 100000) + 1; }

const wxDay = n => {
  const d = wx.days[clamp(n, 1, MISSION_DAYS) - 1];
  return { ...d, dust: DUST_DAYS.includes(n) };
};

const extraCount = () => (wx.days || []).filter(d => d.extra).length;
const sourceLine = () => wx.source === 'practice'
  ? 'PRACTICE DATA: NASA could not be reached, so these days are made up.'
  : `REAL NASA DATA (DONKI): Sun activity from ${nice(wx.from)} to ${nice(wx.to)}.` +
    (extraCount() ? ` HARD MODE: the game adds ${extraCount()} extra storm days.` : '');
const sourceTag = () => wx.source === 'practice' ? 'PRACTICE DATA'
  : extraCount() ? 'REAL NASA DATA + EXTRA STORMS' : 'REAL NASA DATA';

/* ---------- the forecast: made fresh each day, less sure the further ahead ----------
   forecastFor(now, target): what Echo predicts on mission day `now` for day `target`.
   Same inputs always give the same forecast, so it does not change while you look at it. */
const FC_WRONG = [0.18, 0.28, 0.38, 0.46, 0.5];          // chance the forecast is off, 0..4 days ahead
const FC_PROB  = [[8, 26], [40, 65], [70, 95]];          // storm % shown for calm / small / BIG
function forecastFor(now, target) {
  const k = clamp(target - now, 0, 4);
  const truth = wxDay(target);
  const rng = mulberry32(wx.seed * 7919 + target * 131 + now * 17);
  let t = truth.tier;
  if (rng() < FC_WRONG[k]) {
    const up = t === 0 ? true : t === 2 ? false : rng() < 0.5;
    t += up ? 1 : -1;
  }
  const [lo, hi] = FC_PROB[t];
  const p = Math.round(lo + rng() * (hi - lo));
  const dust = truth.dust;
  const icon = dust ? '🌫️' : ['☀️', '🌥️', '⚠️'][t];
  return {
    day: target, tier: t, p, k, dust, icon, sun: SUN[t], dose: TAB_BASE_DOSE[t],
    conf: k <= 1 ? 'High' : k <= 3 ? 'Medium' : 'Low'
  };
}

const todayLine = f => {
  const base = ['The Sun looks calm today.', 'The Sun is busy. A small storm is likely.',
                'BIG STORM WARNING! Raise the shield!'][f.tier];
  return f.dust ? base + ' Dust on the panels: less power.' : base;
};

/* what the tablet shows for today */
function tabWeather(n) {
  const f = forecastFor(n, n);
  return { icon: f.icon, text: `${todayLine(f)} (${f.p}% storm)`, forecast: f };
}

/* ---------- Echo: lines built from today's numbers ---------- */
const curDay = () => clamp(ship.day, 1, MISSION_DAYS);
const doseLeft = () => Math.max(0, DOSE_LIMIT - ship.dose);

function lastCheck() {
  const h = wxHist[wxHist.length - 1];
  if (!h) return null;
  const said = SUN[h.predTier].toLowerCase(), got = TIER_NAME[h.tier];
  const real = h.flare ? ` NASA data: ${h.flare} flare.` : '';
  const same = h.predTier === h.tier;
  return `Yesterday I said "${said}" (${h.predP}%). The Sun made a ${got}.${real} ` +
         (same ? 'I got it right!' : 'I got it wrong. Sorry!');
}

function echoHeadline() {
  const d = curDay(), f = forecastFor(d, d);
  return `Day ${d} of ${MISSION_DAYS}. Today: ${f.sun.toLowerCase()}, ${f.p}% storm.`;
}

const HOLO_GREETING = () => [
  'Systems online, Commander ' + player.name + '!',
  'I am ' + HOLO.name + '. I check the real Sun every day and send a fresh forecast.',
  HARD.on ? 'This is HARD MODE: out here the storms come more often than on the real Sun.' : '',
  'The tablet unlocks when you begin the mission at the mission console.'
].filter(Boolean);

/* shown when you tap Echo again (changes each day) */
const HOLO_AGAIN = () => {
  const lines = ['Commander ' + player.name + '. ' + echoHeadline()];
  const lc = lastCheck();
  if (lc) lines.push(lc);
  return lines;
};

const HOLO_TOPICS = [
  { ask: 'Space weather forecast', panel: 'forecast', say: () => {
    const d = curDay();
    const fs = [0, 1, 2, 3, 4].filter(k => d + k <= MISSION_DAYS).map(k => forecastFor(d, d + k));
    const out = [echoHeadline()];
    const worst = fs.filter(f => f.k > 0).sort((a, b) => b.p - a.p)[0];
    if (!fs[0].dust && fs[0].tier === 2) out.push('Today is risky! Put power into the shield now.');
    if (worst && worst.p >= 50) out.push(`Watch Day ${worst.day}: ${worst.p}% chance of a solar storm.`);
    else if (worst) out.push('The next few days look quiet.');
    else out.push('This is the last day. Almost there!');
    const dust = [1, 2, 3, 4].map(k => d + k).find(n => n <= MISSION_DAYS && DUST_DAYS.includes(n));
    if (dust) out.push(`Dust is coming on Day ${dust}. Save battery power.`);
    const lc = lastCheck();
    out.push(lc || 'Forecasts get less sure each day. A storm can be stronger or weaker!');
    out.push(sourceLine());
    return out;
  } },

  { ask: 'Radiation report', panel: 'radiation', say: () => {
    const used = ship.dose / DOSE_LIMIT * 100, d = curDay();
    const done = Math.max(1, d - 1);
    const out = [
      `Right now it is ${ship.rad.toFixed(2)} millisieverts a day. That is ` +
        `${radLevel(ship.rad).n.toLowerCase()}.`,
      `Dose so far: ${ship.dose.toFixed(1)} of ${DOSE_LIMIT}. That is ${Math.round(used)} percent of your limit.`
    ];
    const rate = (ship.dose - SHIP_START.dose) / done;
    const proj = ship.dose + rate * (MISSION_DAYS - d + 1);
    if (d > 1 && proj >= DOSE_LIMIT) {
      out.push('At this rate you will go over the limit before the mission ends. Add more shield!');
    } else if (used >= 60) out.push('Careful! You have used most of your safe dose.');
    else out.push('You are on track. Keep the shield up on stormy days.');
    out.push(`Go over ${DOSE_LIMIT}, or take ${DOSE_ACUTE} in one day, and the crew will not survive.`);
    return out;
  } },

  { ask: 'How is the ship?', panel: 'status', say: () => {
    const out = [`Fuel ${ship.fuel}%, battery ${Math.round(ship.battery)}%, hull ${ship.hull}%.`];
    out.push(`Air is ${Math.round(ship.oxygen)}%.`);
    out.push('The battery helps in dust. But it only holds so much!');
    return out;
  } },

  { ask: 'Any tips?', say: () => {
    const d = curDay(), f = forecastFor(d, d), n = d + 1 <= MISSION_DAYS ? forecastFor(d, d + 1) : null;
    const out = [];
    if (f.tier === 2) out.push('Today looks bad. Shield up, and no research outside!');
    else if (n && n.tier === 2) out.push('Tomorrow looks bad. Save a bit of power, then raise the shield.');
    else if (f.tier === 0) out.push('A calm day is a good day for science. Maybe go research at the rover?');
    else out.push('A small storm may come. A little shield power helps a lot.');
    const dust = [0, 1, 2].map(k => d + k).find(x => x <= MISSION_DAYS && DUST_DAYS.includes(x));
    if (dust && ship.battery < 60) out.push('Dust is near and your battery is low. Save power now.');
    if (ship.dose / DOSE_LIMIT > 0.5) out.push('You used over half of your safe dose. Be careful!');
    if (ship.oxygen > 60 && !(f.tier === 2)) {
      out.push(`Research at the rover gives big science, but it uses ${RESEARCH.airMult} times the air.`);
    }
    out.push('Remember: the forecast can be wrong. Do not use all your safety on a guess.');
    return out;
  } }
];

/* Mission Control messages: new every day */
function missionMessages() {
  const d = curDay(), f = forecastFor(d, d);
  const msgs = [
    `Mission Control: Day ${d}. Forecast: ${f.sun.toLowerCase()}, ${f.p}% storm.`,
    wx.source === 'practice'
      ? 'Mission Control: Practice mode. Live NASA data is not available.'
      : 'Mission Control: Our Sun data comes from NASA DONKI.' +
        (extraCount() ? ' Hard mode adds extra storms.' : '')
  ];
  const tips = [
    'Remember, radiation adds up every day.',
    'Air first, then shield, then science.',
    'A calm day is a good day for research at the rover.',
    'Save battery power for dusty days.',
    'The forecast can be wrong. Stay careful.'
  ];
  msgs.push('Mission Control: ' + tips[(d - 1) % tips.length]);
  const h = wxHist[wxHist.length - 1];
  if (h) msgs.push(`Mission Control: Yesterday the Sun made a ${TIER_NAME[h.tier]}.`);
  return msgs;
}
