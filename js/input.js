/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Keyboard controls (retro feel), one handler per screen */
const keyHandlers = {
  sTitle(e) {
    if (isConfirm(e)) { e.preventDefault(); show('sChar'); }
  },
  sChar(e) {
    if (e.key === 'ArrowLeft')       { e.preventDefault(); focusChar(charIdx - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusChar(charIdx + 1); }
    else if (isConfirm(e))           { e.preventDefault(); pickChar(charIdx); }
    else if (e.key === 'Escape')     show('sTitle');
  },
  sName(e) {
    if (e.key === 'Enter')       { e.preventDefault(); submitName(); }
    else if (e.key === 'Escape') show('sChar');
  },
  sReady(e) {
    if (e.key === 'Escape') show('sName');
  },
  sCockpit: e => cockpitKey(e),
  sRoom: e => roomKey(e),
  sScene(e) {
    if (mode !== 'choose') {
      if (isConfirm(e)) { e.preventDefault(); advance(); }
      return;
    }
    if (e.key === 'ArrowDown')    { e.preventDefault(); setCur(choiceIdx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCur(choiceIdx - 1); }
    else if (isConfirm(e))        { e.preventDefault(); pick(choiceIdx); }
    else if (/^[1-9]$/.test(e.key) && +e.key <= TOPICS.length + 1) pick(+e.key - 1);
  }
};

document.addEventListener('keydown', e => {
  /* the crew is lost: nothing can be touched, the player can only look */
  if (isDead) { deathKey(e); return; }
  if (isEnding) { endingKey(e); return; }
  /* while the launch video plays, Esc skips it */
  if ($('launch').classList.contains('on') && !launchDone) {
    if (e.key === 'Escape') { e.preventDefault(); finishLaunch(); }
    return;
  }
  const handler = keyHandlers[current];
  if (handler) handler(e);
});
