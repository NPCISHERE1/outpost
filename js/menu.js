/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Title, character select, name entry, ready screen */

/* title */
if (LOGO_IMAGE) {
  $('logoImg').src = LOGO_IMAGE;
  $('logoImg').classList.remove('hidden');
  $('logoText').classList.add('hidden');
}
$('startBtn').onclick = () => show('sChar');

/* character select */
$('charList').innerHTML = CHARACTERS.map((c, i) => `
  <button class="char" type="button" role="radio" aria-checked="false" data-i="${i}">
    <div class="frame">${frameHTML(c)}</div>
    <span class="lbl">${esc(c.label)}</span>
  </button>`).join('');

function focusChar(i) {
  const btns = document.querySelectorAll('.char');
  charIdx = (i + btns.length) % btns.length;
  btns.forEach((b, j) => b.setAttribute('aria-checked', j === charIdx));
  btns[charIdx].focus({ preventScroll: true });
}
function pickChar(i) {
  charIdx = i;
  player.charId = CHARACTERS[i].id;
  $('namePreview').innerHTML = frameHTML(CHARACTERS[i]);
  show('sName');
}
$('charList').addEventListener('click', e => {
  const b = e.target.closest('.char');
  if (b) pickChar(+b.dataset.i);
});
$('charBack').onclick = () => show('sTitle');

/* name */
$('nameInput').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
});
function submitName() {
  player.name = $('nameInput').value.trim() || 'PLAYER';
  $('readyPreview').innerHTML = frameHTML(charById(player.charId));
  $('readyName').textContent = 'Commander ' + player.name;
  $('beginNote').textContent = '';
  show('sReady');
}
$('nameOk').onclick = submitName;
$('nameBack').onclick = () => show('sChar');

/* ready */
$('readyBack').onclick = () => show('sName');
$('beginBtn').onclick = () => startScene();
