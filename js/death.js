/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Death: when the crew is lost, a picture fills the screen, Echo says what went wrong,
   the screen fades to a TRY AGAIN box, and the game starts over at character select.
   While this is showing nothing else can be touched: the player can only look. */

/* ---------- edit these ---------- */
const DEATH_IMG = { air: 'assets/oxygendead.png', radiation: 'assets/radiationdead.png' };
const SLEEP_AIR_MIN   = 30;    // go to sleep with less air than this (%) and the crew dies

let isDead = false;
const dth = { lines: [], full: '', typer: null, typing: false, cause: '', timer: null, ready: false, summary: '' };

/* ---------- is it deadly to sleep right now? Only too little air. Radiation has no warning:
   the crew dies the moment the total dose reaches the limit (checked in tabFinish). ---------- */
function sleepDanger() {
  if (ship.oxygen < SLEEP_AIR_MIN) return 'air';
  return null;
}

/* ---------- what Echo says ---------- */
function deathLines(cause, info) {
  const name = player.name || 'Commander';
  const day = info.day, out = [`Commander ${name}... I am so sorry.`];
  const real = info.real;
  const sunWhat = real
    ? (real.flare && !real.extra ? `a ${TIER_NAME[real.tier]}: a real ${real.flare} flare` : `a ${TIER_NAME[real.tier]}`)
    : 'a storm';

  if (cause === 'air') {
    if (info.pre) {
      out.push(`You went to sleep with only ${Math.round(ship.oxygen)} percent air. That is under ${SLEEP_AIR_MIN} percent.`);
      out.push('While you slept, the crew used up the last of the air. Nobody woke up.');
    } else {
      out.push('Life support did not make enough air. During the night the air ran out.');
      out.push(`Air fell to 0 percent on Day ${day}.`);
    }
    out.push('Lesson: check the air before you sleep. Put more power into life support.');
  } else if (cause === 'storm') {
    out.push(`On Day ${day} the Sun made ${sunWhat}.`);
    out.push(`The shield was only at ${info.shield}${info.res ? ', and the crew was out on research' : ''}.`);
    out.push(`The crew took ${info.dose.toFixed(1)} millisieverts in ONE night. The safe limit for a day is ${DOSE_ACUTE}.`);
    out.push('Lesson: when a big storm is coming, raise the shield and stay inside.');
  } else {
    if (info.outside) {
      out.push(`You were outside on research. On Day ${day} the Sun made ${sunWhat}.`);
      out.push(`Nothing shields you out there. Your total dose reached ${ship.dose.toFixed(1)} of ${DOSE_LIMIT} millisieverts.`);
    } else {
      out.push(`On Day ${day} the Sun made ${sunWhat}.`);
      out.push(`The shield was at ${info.shield}. Your total dose reached ${ship.dose.toFixed(1)} of ${DOSE_LIMIT} millisieverts.`);
    }
    out.push('Too much radiation was too much for the crew.');
    out.push(info.outside ? 'Lesson: do not work outside in a storm. Research on calm days.'
                          : 'Lesson: radiation adds up and never goes away. Keep your dose low with the shield.');
  }
  return out;
}

const deathSummary = (cause, info) => ({
  air: 'THE AIR RAN OUT',
  storm: 'A HUGE STORM HIT',
  radiation: 'TOO MUCH RADIATION'
}[cause]);

/* ---------- start the death scene ---------- */
function startDeath(cause, info) {
  if (isDead) return;
  isDead = true;
  info = { day: tab.day, real: null, shield: tab.alloc.shield, res: 0, dose: 0, pre: false, ...info };

  /* freeze the world */
  clearInterval(cpTimer);
  resStop();
  holoClose();
  tab.open = false;
  $('tabWrap').classList.add('hidden');
  $('cpStage').classList.remove('tab-up');
  closeRoomPanel();
  if (openId) closePanel();
  $('sleepFade').classList.add('hidden');
  document.activeElement && document.activeElement.blur && document.activeElement.blur();

  dth.cause = cause;
  dth.summary = deathSummary(cause, info);
  dth.lines = deathLines(cause, info);
  dth.ready = false;

  $('deathArt').src = DEATH_IMG[cause === 'air' ? 'air' : 'radiation'];
  $('deathArt').alt = cause === 'air' ? 'The crew ran out of air' : 'The crew was lost to radiation';
  $('deathPortrait').style.cssText = $('holoPortrait').style.cssText;
  $('deathName').textContent = HOLO.name;
  $('deathFade').classList.add('hidden');
  $('deathBox').classList.add('hidden');
  $('deathEcho').classList.add('hidden');
  $('death').classList.remove('hidden');
  $('death').focus({ preventScroll: true });

  /* let the picture sink in, then Echo speaks */
  clearTimeout(dth.timer);
  dth.timer = setTimeout(() => {
    $('deathEcho').classList.remove('hidden');
    deathNext();
  }, 1800);
}

function deathNext() {
  if (dth.lines.length) deathLine(dth.lines.shift());
  else deathFadeOut();
}

function deathLine(text) {
  dth.full = text;
  dth.typing = true;
  $('deathMore').style.visibility = 'hidden';
  const p = $('deathLine');
  p.textContent = '';
  let n = 0;
  clearInterval(dth.typer);
  dth.typer = setInterval(() => {
    p.textContent = text.slice(0, ++n);
    if (n >= text.length) deathTyped();
  }, TYPE_MS);
}

function deathTyped() {
  clearInterval(dth.typer);
  dth.typing = false;
  $('deathLine').textContent = dth.full;
  $('deathMore').style.visibility = 'visible';
}

function deathAdvance() {
  if (!isDead || dth.ready || $('deathEcho').classList.contains('hidden')) return;
  if (!$('deathFade').classList.contains('hidden')) return;
  if (dth.typing) deathTyped(); else deathNext();
}

/* fade to black, then the TRY AGAIN alert */
function deathFadeOut() {
  $('deathEcho').classList.add('hidden');
  $('deathFade').classList.remove('hidden');
  $('deathWhy').textContent = dth.summary;
  $('deathStats').textContent = `DAY ${Math.min(tab.day, MISSION_DAYS)} · AIR ${Math.round(ship.oxygen)}% · ` +
                                `DOSE ${ship.dose.toFixed(1)} / ${DOSE_LIMIT} MSV`;
  clearTimeout(dth.timer);
  dth.timer = setTimeout(() => {
    $('deathBox').classList.remove('hidden');
    dth.ready = true;
    $('deathAgain').focus({ preventScroll: true });
  }, 1500);
}

/* ---------- start over at character select ---------- */
function resetGame() {
  if (typeof endReset === 'function') endReset();
  clearTimeout(dth.timer);
  clearInterval(dth.typer);
  clearInterval(cpTimer);
  clearTimeout(flashTimer);
  resStop();
  res.progress = 0;

  /* numbers */
  tabRestart();                                   // ship, tablet plan, forecast history, new forecast guesses
  doseHist.fill(SHIP_START.rad);
  logDone.clear();
  LOG.filter(l => l.done).forEach(l => logDone.add(l.id));
  Object.keys(toastIdx).forEach(k => delete toastIdx[k]);
  holo.asked.clear();
  holo.panel = null;
  wx.locked = false;

  /* places and things */
  missionStarted = false;
  openId = null;
  roomId = null;
  roomPanelId = null;
  greenhouseOpen = false;
  sleeping = false;
  roomsSeen.clear();
  Object.assign(kp, { code: '', msg: '', cls: '', tries: 0, hint: false, lock: false });
  tab.open = false;
  ['cpStage', 'roomStage'].forEach(id => $(id).classList.remove('crew-lost', 'tab-up', 'show-hot'));
  ['tabWrap', 'cpPanel', 'roomPanel', 'cpToast', 'roomToast', 'holo', 'sleepFade'].forEach(id => $(id).classList.add('hidden'));
  if (cpBuilt) updateTabletHotspot();

  /* the launch video can play again */
  try { ytPlayer && ytPlayer.destroy && ytPlayer.destroy(); } catch (err) { /* ignore */ }
  ytPlayer = null;
  $('ytWrap').innerHTML = '<div id="ytFrame"></div>';
  launched = false;
  launchDone = false;
  $('launch').classList.remove('on');

  /* back to the start of character selection */
  player.charId = null;
  player.name = '';
  $('nameInput').value = '';
  charIdx = 0;
  isDead = false;
  $('death').classList.add('hidden');
  show('sChar');
}

$('deathEcho').addEventListener('click', deathAdvance);
$('deathAgain').addEventListener('click', () => { if (dth.ready) resetGame(); });

/* the only keys that work while dead */
function deathKey(e) {
  if (isConfirm(e)) {
    e.preventDefault();
    if (dth.ready) resetGame(); else deathAdvance();
  }
}
