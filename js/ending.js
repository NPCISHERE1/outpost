/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* The ending: you survived all the days.
   GO HOME on the tablet -> fade -> entering the atmosphere -> parachutes -> splashdown ->
   on the recovery ship Dr. Vega talks to you and hands you the mission report on a clipboard (grade S to D).
   Play again goes back to character select. */

/* ---------- edit these ---------- */
const END_SCENES = [                      // each picture: fade in, stay, fade to black
  { img: 'assets/enteratm.png', hold: 4500, sound: 'reentry' },
  { img: 'assets/entersky.png', hold: 4500, sound: 'chute' },
  { img: 'assets/ocean.png',    hold: 4500, sound: 'splash' }
];
const END_BOAT = 'assets/boat.png';       // the last picture: the talk happens here
const END_FADE_MS = 1000;                 // how long each fade takes

const END_LINES = [
  { who: 'sci',    text: 'Welcome back, Commander {NAME}! The recovery ship has you.' },
  { who: 'player', text: 'We made it home! The ocean looks so big after {DAYS} days on the Moon.' },
  { who: 'sci',    text: 'You kept the crew alive for {DAYS} days. That takes real planning.' },
  { who: 'player', text: 'So, how did we do, Dr. Vega?' },
  { who: 'sci',    text: 'Let me see... I have your mission report right here.' }
];

/* Dr. Vega's note on the report, by grade */
const GRADE_NOTES = {
  S: 'Perfect mission! You are one of the best astronauts we have ever had.',
  A: 'Great work! The crew was safe and you did lots of science.',
  B: 'Good job! The crew is safe. Next time, try for more science or less radiation.',
  C: 'You made it home, but it was close. Watch the radiation and plan your power.',
  D: 'You survived, but only just. Plan your power and your shield better next time.'
};
/* score out of 100: science 55, radiation 35, air 10.  S 78+  A 62+  B 46+  C 30+  D below */
const GRADE_CUTS = [['S', 78], ['A', 62], ['B', 46], ['C', 30], ['D', 0]];   // lenient: easier to reach each letter

/* ---------- state ---------- */
let isEnding = false;
const en = { token: 0, timers: [], queue: [], full: '', typer: null, typing: false, mode: 'off', ready: false, grade: null };

/* ---------- the grade ---------- */
function missionGrade() {
  const sci = Math.min(1, tab.sci / TAB_SCI_TARGET);
  const used = Math.min(1, Math.max(0, (ship.dose - SHIP_START.dose) / (DOSE_LIMIT - SHIP_START.dose)));
  const air = Math.min(1, Math.max(0, ship.oxygen / 100));
  const score = Math.round(sci * 55 + (1 - used * used) * 35 + air * 10);   // radiation counts gently: using half the limit costs only a quarter
  const letter = GRADE_CUTS.find(([, min]) => score >= min)[0];
  return { score, letter, sci, used, air };
}

/* ---------- little helpers ---------- */
const enWait = (ms) => new Promise(res => {
  const t = setTimeout(res, ms);
  en.timers.push(t);
});
const enFade = async (toBlack, ms = END_FADE_MS) => {
  const f = $('endFade');
  f.style.transitionDuration = ms + 'ms';
  f.classList.toggle('black', toBlack);
  await enWait(ms + 60);
};
const enSound = n => { if (typeof play === 'function') play(n); };

/* ---------- GO HOME ---------- */
async function startEnding() {
  if (isEnding || isDead || !tab.over || tab.failed) return;
  isEnding = true;
  const my = ++en.token;
  const alive = () => en.token === my && isEnding;

  /* freeze the base: nothing under the ending can be touched */
  clearInterval(cpTimer);
  resStop();
  holoClose();
  closeRoomPanel();
  if (openId) closePanel();
  closeTablet();
  document.activeElement && document.activeElement.blur && document.activeElement.blur();

  en.mode = 'fade';
  $('endArt').removeAttribute('src');
  $('endActors').classList.add('hidden');
  $('endDialog').classList.add('hidden');
  $('endReport').classList.add('hidden');
  $('endFade').style.transitionDuration = '0ms';
  $('endFade').classList.remove('black');
  $('ending').classList.remove('hidden');
  $('ending').focus({ preventScroll: true });
  enSound('fade');
  await enFade(true);                       // the cockpit fades to black
  if (!alive()) return;
  await enWait(500);

  for (const s of END_SCENES) {
    if (!alive()) return;
    $('endArt').src = s.img;
    enSound(s.sound);
    await enFade(false);
    if (!alive()) return;
    await enWait(s.hold);
    if (!alive()) return;
    await enFade(true);
    await enWait(350);
  }
  if (!alive()) return;

  /* the recovery ship */
  $('endArt').src = END_BOAT;
  $('endActP').innerHTML = actorHTML(charById(player.charId), player.name);
  $('endActS').innerHTML = actorHTML(SCIENTIST, SCIENTIST.name);
  $('endActors').classList.remove('hidden');
  $('endDialog').classList.remove('hidden');
  $('endLine').textContent = '';
  enSound('waves');
  await enFade(false);
  if (!alive()) return;
  await enWait(700);
  if (!alive()) return;

  en.queue = END_LINES.slice();
  en.mode = 'talk';
  endNext();
}

/* ---------- the talk ---------- */
function endSpeaker(isPlayer) {
  const spk = isPlayer ? charById(player.charId) : SCIENTIST;
  $('endName').textContent = isPlayer ? player.name : SCIENTIST.name;
  $('endPortrait').innerHTML = spk.sprite ? imgTag(spk.sprite) : '?';
  $('endDialog').className = 'dialog ' + (isPlayer ? 'left' : 'right');
  $('endActP').className = 'actor ' + (isPlayer ? 'on' : 'dim');
  $('endActS').className = 'actor ' + (isPlayer ? 'dim' : 'on');
}

function endNext() {
  if (!en.queue.length) return showReport();
  const line = en.queue.shift();
  endSpeaker(line.who === 'player');
  en.full = line.text.replaceAll('{NAME}', player.name).replaceAll('{DAYS}', MISSION_DAYS);
  $('endLine').textContent = '';
  $('endMore').style.visibility = 'hidden';
  en.typing = true;
  let n = 0;
  clearInterval(en.typer);
  en.typer = setInterval(() => {
    $('endLine').textContent = en.full.slice(0, ++n);
    if (n >= en.full.length) endTyped();
  }, TYPE_MS);
}
function endTyped() {
  clearInterval(en.typer);
  en.typing = false;
  $('endLine').textContent = en.full;
  $('endMore').style.visibility = 'visible';
}
function endAdvance() {
  if (!isEnding || en.mode !== 'talk') return;
  if (en.typing) endTyped(); else endNext();
}

/* ---------- the clipboard ---------- */
function showReport() {
  en.mode = 'report';
  en.ready = false;
  const g = missionGrade();
  en.grade = g;
  const note = GRADE_NOTES[g.letter];
  const usedPct = g.used * 100;
  const radWord = usedPct < 35 ? ['LOW', 'ok'] : usedPct < 70 ? ['OK', 'warn'] : ['HIGH', 'bad'];
  const airWord = ship.oxygen >= 70 ? ['GOOD', 'ok'] : ship.oxygen >= 40 ? ['OK', 'warn'] : ['LOW', 'bad'];
  const bigStorms = wx.days.filter(d => d.tier === 2).length;
  const starsN = tBlocks();

  const rows = [
    ['DAYS SURVIVED', `${MISSION_DAYS} / ${MISSION_DAYS}`, 'ok'],
    ['SCIENCE', `${tab.sci} PTS ${'★'.repeat(starsN)}${'☆'.repeat(5 - starsN)}`, starsN >= 4 ? 'ok' : starsN >= 2 ? 'warn' : 'bad'],
    ['RADIATION', `${ship.dose.toFixed(1)} / ${DOSE_LIMIT} MSV ${radWord[0]}`, radWord[1]],
    ['AIR LEFT', `${Math.round(ship.oxygen)}% ${airWord[0]}`, airWord[1]],
    ['BIG STORMS SURVIVED', String(bigStorms), 'ok']
  ];
  $('reportName').textContent = `COMMANDER ${player.name.toUpperCase()}`;
  $('reportRows').innerHTML = rows.map(r =>
    `<li class="reveal"><span>${esc(r[0])}</span><b class="${r[2]}">${esc(r[1])}</b></li>`).join('');
  $('reportGrade').className = 'rg g' + g.letter;
  $('reportLetter').textContent = g.letter;
  $('reportScore').textContent = `SCORE ${g.score} / 100`;
  $('reportKey').innerHTML = GRADE_CUTS.map(([l]) =>
    `<i class="${l === g.letter ? 'me' : ''}">${l}</i>`).reverse().join('');
  $('reportNote').textContent = note;
  $('reportSrc').textContent = (wx.source === 'practice' ? 'PRACTICE DATA' : 'REAL NASA DATA: DONKI') +
    (wx.from ? ` · ${nice(wx.from)} TO ${nice(wx.to)}` : '');

  $('endDialog').classList.add('hidden');
  const rep = $('endReport');
  rep.classList.remove('hidden', 'stamped');
  [...rep.querySelectorAll('.reveal')].forEach(el => el.classList.remove('in'));
  enSound('open');

  /* reveal the lines one at a time, then stamp the grade */
  const items = [...rep.querySelectorAll('.reveal')];
  const my = en.token;
  items.forEach((el, i) => {
    en.timers.push(setTimeout(() => { if (en.token === my) { el.classList.add('in'); enSound('click'); } }, 500 + i * 450));
  });
  en.timers.push(setTimeout(() => {
    if (en.token !== my) return;
    rep.classList.add('stamped');                // the grade stamp slams down
    enSound(g.letter === 'S' || g.letter === 'A' ? 'win' : g.letter === 'D' ? 'resBlock' : 'newDay');
  }, 500 + items.length * 450 + 300));
  en.timers.push(setTimeout(() => {
    if (en.token !== my) return;
    en.ready = true;
    $('playAgain').focus({ preventScroll: true });
  }, 500 + items.length * 450 + 1200));
}

/* ---------- play again / reset ---------- */
function endReset() {
  en.token++;
  en.timers.forEach(clearTimeout);
  en.timers = [];
  clearInterval(en.typer);
  en.mode = 'off';
  en.ready = false;
  isEnding = false;
  $('ending').classList.add('hidden');
  $('endReport').classList.add('hidden');
  $('endFade').classList.remove('black');
}

$('endDialog').addEventListener('click', endAdvance);
$('playAgain').addEventListener('click', () => { if (en.ready) resetGame(); });

function endingKey(e) {
  if (!isConfirm(e)) return;
  e.preventDefault();
  if (en.mode === 'talk') endAdvance();
  else if (en.mode === 'report' && en.ready) resetGame();
}
