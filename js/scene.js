/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Briefing scene: typed dialogue + player-chosen questions */
let queue = [], mode = 'line', fullText = '';
let typer = null, typing = false, cdTimer = null;
let sceneDone = false, pendingEnd = false, choiceIdx = 0;
const asked = new Set();

function startScene() {
  const bg = $('sceneBg');
  if (SCENE_BG) {
    bg.style.backgroundImage = `url("${encodeURI(SCENE_BG).replace(/"/g, '')}")`;
    bg.classList.add('has-img');
  }
  $('actPlayer').innerHTML = actorHTML(charById(player.charId), player.name);
  $('actSci').innerHTML = actorHTML(SCIENTIST, SCIENTIST.name);
  $('countdown').classList.add('hidden');
  sceneDone = pendingEnd = false;
  asked.clear();
  clearInterval(cdTimer);
  queue = INTRO.slice();
  show('sScene');
  $('sScene').focus({ preventScroll: true });
  next();
}

function setSpeaker(isPlayer) {
  const spk = isPlayer ? charById(player.charId) : SCIENTIST;
  $('dname').textContent = isPlayer ? player.name : SCIENTIST.name;
  $('portrait').innerHTML = spk.sprite ? imgTag(spk.sprite) : '?';
  $('dialog').className = 'dialog ' + (isPlayer ? 'left' : 'right');
  $('actPlayer').className = 'actor ' + (isPlayer ? 'on' : 'dim');
  $('actSci').className = 'actor ' + (isPlayer ? 'dim' : 'on');
}

function next() {
  if (queue.length) showLine(queue.shift());
  else if (pendingEnd) endScene();
  else showChoices();
}

function showLine(line) {
  mode = 'line';
  setSpeaker(line.who === 'player');
  $('choices').classList.add('hidden');
  $('dline').classList.remove('hidden');
  $('dline').textContent = '';
  $('more').style.visibility = 'hidden';
  fullText = line.text.replaceAll('{NAME}', player.name);

  let n = 0;
  typing = true;
  clearInterval(typer);
  typer = setInterval(() => {
    $('dline').textContent = fullText.slice(0, ++n);
    if (n >= fullText.length) finishTyping();
  }, TYPE_MS);
}

function finishTyping() {
  clearInterval(typer);
  typing = false;
  $('dline').textContent = fullText;
  $('more').style.visibility = 'visible';
}

function advance() {
  if (sceneDone || mode === 'choose') return;
  if (typing) finishTyping();
  else next();
}

/* choices */
function showChoices() {
  mode = 'choose';
  setSpeaker(true);
  $('more').style.visibility = 'hidden';
  $('dline').classList.add('hidden');

  const opts = [...TOPICS.map(t => t.ask), READY.ask];
  $('choices').innerHTML = opts.map((t, i) => {
    const cls = (asked.has(i) ? 'done' : '') + (i === opts.length - 1 ? ' go' : '');
    return `<button type="button" role="option" data-i="${i}" class="${cls}">` +
           `${asked.has(i) ? '(done) ' : ''}${esc(t)}</button>`;
  }).join('');
  $('choices').classList.remove('hidden');

  const firstNew = TOPICS.findIndex((_, i) => !asked.has(i));
  setCur(firstNew >= 0 ? firstNew : opts.length - 1);
}

function setCur(i) {
  const btns = $('choices').querySelectorAll('button');
  choiceIdx = (i + btns.length) % btns.length;
  btns.forEach((b, j) => b.classList.toggle('cur', j === choiceIdx));
}

function pick(i) {
  if (mode !== 'choose') return;
  if (i < TOPICS.length) {
    asked.add(i);
    queue = [{ who: 'player', text: TOPICS[i].ask }, ...TOPICS[i].answer];
  } else {
    pendingEnd = true;
    queue = [{ who: 'player', text: READY.ask }, ...READY.answer];
  }
  next();
}

/* mouse wiring */
$('stage').addEventListener('click', advance);
$('choices').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  e.stopPropagation();
  pick(+b.dataset.i);
});
$('choices').addEventListener('mouseover', e => {
  const b = e.target.closest('button');
  if (b) setCur(+b.dataset.i);
});

/* countdown on black, then the video */
function endScene() {
  if (sceneDone) return;
  sceneDone = true;
  clearInterval(typer);
  const cd = $('countdown');
  let k = 3;
  cd.textContent = k;
  cd.classList.remove('hidden');
  cdTimer = setInterval(() => {
    if (--k > 0) cd.textContent = k;
    else { clearInterval(cdTimer); startLaunch(); }
  }, 800);
}
