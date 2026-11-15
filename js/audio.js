/* SI DISCLOSURE: the code in this file was written with SI assistance (Anthropic Claude). The audio is
   SI-generated (Google Gemini). The sounds are synthesized in code with the Web Audio API, so there are
   no audio files. See AI-DISCLOSURE.md */
/* Sound effects. Every sound is made with the browser's Web Audio (little retro beeps),
   so there are no audio files to add. Press M or use the SOUND button to mute.

   How it hooks in: this file watches clicks and wraps a few game functions, so the game code
   itself stays the same. To change a sound, edit its recipe in SOUNDS below. */

const SFX_VOLUME = 0.8;      // 0 to 1

const SFX = (() => {
  let ctx = null, master = null, noiseBuf = null, muted = false;
  try { muted = localStorage.getItem('outpost-muted') === '1'; } catch (e) { /* no storage: fine */ }

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : SFX_VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* one beep: frequency f (slides to `to`), length d seconds, wave type, volume v, delay at */
  function tone({ f = 440, to = null, d = 0.1, type = 'square', v = 0.25, at = 0, vib = 0 }) {
    const c = ensure();
    if (!c) return;
    const t0 = c.currentTime + at;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + d);
    if (vib) {
      const l = c.createOscillator(), lg = c.createGain();
      l.frequency.value = 9;
      lg.gain.value = vib;
      l.connect(lg);
      lg.connect(o.frequency);
      l.start(t0);
      l.stop(t0 + d + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + d + 0.02);
  }

  /* a burst of noise (whoosh, rumble, static) through a filter */
  function noise({ d = 0.2, v = 0.2, at = 0, f = 1000, to = null, type = 'lowpass', q = 1 }) {
    const c = ensure();
    if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const a = noiseBuf.getChannelData(0);
      for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + at;
    const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t0);
    if (to) fl.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(v, t0 + Math.min(0.03, d / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    s.connect(fl);
    fl.connect(g);
    g.connect(master);
    s.start(t0, Math.random());
    s.stop(t0 + d + 0.02);
  }

  /* play notes one after another: list of [freq, length] */
  function notes(list, opt = {}) {
    let at = opt.at || 0;
    list.forEach(([f, d]) => {
      if (f) tone({ f, d: d * 1.15, type: opt.type || 'square', v: opt.v || 0.22, at });
      at += d;
    });
  }

  return {
    tone, noise, notes, ensure,
    out() { const c = ensure(); return c ? { c, master } : null; },
    get muted() { return muted; },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('outpost-muted', muted ? '1' : '0'); } catch (e) { /* ok */ }
      if (master) master.gain.value = muted ? 0 : SFX_VOLUME;
    },
    /* tests can swap in an offline context to check the sounds make noise */
    _use(c) { ctx = c; master = c.createGain(); master.gain.value = SFX_VOLUME; master.connect(c.destination); noiseBuf = null; }
  };
})();

/* ---------- the sounds ---------- */
const N = { C4: 262, D4: 294, E4: 330, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047 };

const SOUNDS = {
  click:   () => SFX.tone({ f: 660, d: 0.05 }),
  select:  () => SFX.notes([[N.C5, 0.06], [N.G5, 0.09]]),
  back:    () => SFX.notes([[N.G4, 0.05], [N.C4 * 1.2, 0.08]]),
  move:    () => SFX.tone({ f: 380, d: 0.03, type: 'triangle', v: 0.2 }),
  next:    () => SFX.tone({ f: 880, d: 0.04, type: 'triangle', v: 0.16 }),
  hover:   () => SFX.tone({ f: 1250, d: 0.02, type: 'sine', v: 0.05 }),
  open:    () => SFX.notes([[N.G4, 0.05], [N.D5, 0.08]], { type: 'triangle' }),
  close:   () => SFX.notes([[N.D5, 0.05], [N.G4, 0.08]], { type: 'triangle' }),
  plus:    () => SFX.tone({ f: 600, to: 900, d: 0.07 }),
  minus:   () => SFX.tone({ f: 600, to: 400, d: 0.07 }),
  toast:   () => SFX.notes([[N.E5, 0.05], [N.A5, 0.1]], { type: 'triangle', v: 0.18 }),
  door:    () => { SFX.noise({ d: 0.28, v: 0.22, f: 1800, to: 300 }); SFX.tone({ f: 120, to: 70, d: 0.18, type: 'triangle', v: 0.25 }); },
  radio:   () => { SFX.noise({ d: 0.18, v: 0.12, f: 2500, type: 'bandpass', q: 2 }); SFX.notes([[N.A5, 0.05], [N.E5, 0.05]], { type: 'sine', v: 0.1, at: 0.12 }); },
  tick:    p => SFX.tone({ f: p || 440, d: 0.12, v: 0.25 }),
  launch:  () => { SFX.tone({ f: 200, to: 1200, d: 0.7, type: 'sawtooth', v: 0.12 }); SFX.noise({ d: 0.9, v: 0.25, f: 300, to: 3000 }); },
  keyOk:   () => SFX.notes([[N.C5, 0.07], [N.E5, 0.07], [N.G5, 0.07], [N.C6, 0.16]]),
  keyBad:  () => { SFX.tone({ f: 140, d: 0.28, type: 'sawtooth', v: 0.22 }); SFX.tone({ f: 130, d: 0.28, type: 'sawtooth', v: 0.18, at: 0.02 }); },
  keyPress: i => SFX.tone({ f: 700 + (i % 4) * 110 + Math.floor(i / 4) * 60, d: 0.06, v: 0.2 }),
  resDone: () => SFX.notes([[N.E5, 0.07], [N.G5, 0.07], [N.C6, 0.07], [N.E5 * 2, 0.2]], { v: 0.2 }),
  resBlock: () => SFX.notes([[300, 0.07], [220, 0.12]], { type: 'sawtooth', v: 0.18 }),
  sleep:   () => SFX.notes([[N.G5, 0.3], [N.E5, 0.3], [N.C5, 0.3], [N.G4, 0.5]], { type: 'triangle', v: 0.2 }),
  newDay:  () => SFX.notes([[N.C5, 0.1], [N.E5, 0.1], [N.G5, 0.1], [N.C6, 0.25]], { type: 'triangle', v: 0.22 }),
  storm:   () => { SFX.noise({ d: 0.9, v: 0.3, f: 220, to: 90 }); SFX.tone({ f: 70, to: 45, d: 0.9, type: 'triangle', v: 0.3 }); },
  win:     () => SFX.notes([[N.C5, 0.12], [N.E5, 0.12], [N.G5, 0.12], [N.C6, 0.2], [0, 0.05], [N.G5, 0.1], [N.C6, 0.4]], { v: 0.24 }),
  start:   () => SFX.notes([[N.G4, 0.1], [N.C5, 0.1], [N.E5, 0.1], [N.G5, 0.1], [N.C6, 0.3]], { v: 0.22 }),
  danger:  () => { for (let i = 0; i < 3; i++) SFX.tone({ f: i % 2 ? 700 : 950, d: 0.13, v: 0.22, at: i * 0.16 }); },
  death:   () => {
    SFX.tone({ f: 440, to: 40, d: 1.8, type: 'sawtooth', v: 0.25 });
    SFX.noise({ d: 1.6, v: 0.2, f: 1500, to: 80 });
    for (let i = 0; i < 4; i++) SFX.tone({ f: i % 2 ? 600 : 900, d: 0.18, v: 0.14, at: 0.2 + i * 0.3 });
  },
  fade:    () => SFX.tone({ f: 220, to: 60, d: 1.2, type: 'triangle', v: 0.2 }),
  reentry: () => {
    SFX.noise({ d: 4.2, v: 0.22, f: 300, to: 1800 });
    SFX.tone({ f: 55, to: 90, d: 4, type: 'triangle', v: 0.25 });
    for (let i = 0; i < 12; i++) SFX.noise({ d: 0.05, v: 0.1, f: 3500, type: 'highpass', at: 0.3 + i * 0.32 + Math.random() * 0.15 });
  },
  chute:   () => { SFX.noise({ d: 0.6, v: 0.25, f: 500, to: 2600, type: 'bandpass', q: 0.8 }); SFX.tone({ f: 110, to: 50, d: 0.5, type: 'triangle', v: 0.3, at: 0.35 }); SFX.noise({ d: 3, v: 0.08, f: 700, to: 500, at: 0.8 }); },
  splash:  () => { SFX.noise({ d: 1.4, v: 0.3, f: 3200, to: 200 }); SFX.tone({ f: 160, to: 45, d: 0.6, type: 'sine', v: 0.35 }); SFX.noise({ d: 2.5, v: 0.07, f: 600, to: 400, at: 1.2 }); },
  waves:   () => { SFX.noise({ d: 2.2, v: 0.4, f: 350, to: 900 }); SFX.noise({ d: 2.2, v: 0.4, f: 350, to: 900, at: 2.2 }); },
  alert:   () => SFX.notes([[N.A4, 0.16], [0, 0.04], [N.A4, 0.16], [0, 0.04], [N.E4, 0.35]], { type: 'square', v: 0.2 })
};
function play(name, arg) {
  if (SFX.muted) return;
  try { SOUNDS[name](arg); } catch (e) { /* sound must never break the game */ }
}

/* typing blips: each speaker has a voice */
const VOICES = {
  player: { f: 560, type: 'square',   v: 0.06 },
  vega:   { f: 400, type: 'square',   v: 0.06 },
  echo:   { f: 900, type: 'triangle', v: 0.09 }
};
let lastBlip = 0;
function blip(voice) {
  const now = performance.now();
  if (SFX.muted || now - lastBlip < 40) return;
  lastBlip = now;
  const v = VOICES[voice] || VOICES.player;
  SFX.tone({ f: v.f * (0.9 + Math.random() * 0.3), d: 0.035, type: v.type, v: v.v });
}

/* research hold: a rising hum while the bar fills */
let holdStop = null;
function startHold() {
  if (SFX.muted || holdStop) return;
  const c = SFX.ensure();
  if (!c) return;
  const o = c.createOscillator(), g = c.createGain(), l = c.createOscillator(), lg = c.createGain();
  const t0 = c.currentTime, len = (typeof RESEARCH !== 'undefined' ? RESEARCH.holdMs : 4000) / 1000;
  o.type = 'triangle';
  o.frequency.setValueAtTime(160, t0);
  o.frequency.exponentialRampToValueAtTime(700, t0 + len);
  l.frequency.value = 11;
  lg.gain.value = 18;
  l.connect(lg);
  lg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.09, t0 + 0.08);
  o.connect(g);
  g.connect(SFX_MASTER());
  o.start(t0);
  l.start(t0);
  holdStop = () => {
    const t = c.currentTime;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.06);
    o.stop(t + 0.08);
    l.stop(t + 0.08);
    holdStop = null;
  };
}
function stopHold() { if (holdStop) holdStop(); }
/* the hum goes through the same master volume / mute as everything else */
function SFX_MASTER() {
  const c = SFX.ensure();
  if (!SFX._hold) {
    SFX._hold = c.createGain();
    SFX._hold.gain.value = SFX.muted ? 0 : SFX_VOLUME;
    SFX._hold.connect(c.destination);
  }
  return SFX._hold;
}

/* ---------- wrapping the game's functions (the game code stays untouched) ---------- */
function hook(name, before, after) {
  const orig = window[name];
  if (typeof orig !== 'function') return;
  window[name] = function (...args) {
    let ctxv;
    try { ctxv = before ? before(...args) : undefined; } catch (e) { /* ignore */ }
    const out = orig.apply(this, args);
    try { if (after) after(ctxv, out, ...args); } catch (e) { /* ignore */ }
    return out;
  };
}

/* menu */
hook('focusChar', () => charIdx, (old) => { if (old !== charIdx) play('move'); });
hook('pickChar', null, () => play('select'));
hook('submitName', null, () => play('select'));
hook('startScene', null, () => play('radio'));

/* briefing + hologram dialogue */
hook('setCur', () => choiceIdx, (old) => { if (old !== choiceIdx) play('move'); });
hook('holoCur', () => holo.idx, (old) => { if (old !== holo.idx) play('move'); });
hook('pick', () => mode, (m) => { if (m === 'choose') play('select'); });
hook('holoPick', () => holo.mode, (m) => { if (m === 'choose') play('select'); });
hook('advance', null, () => play('next'));
hook('holoAdvance', null, () => play('next'));
hook('deathAdvance', null, () => play('next'));
hook('startLaunch', null, () => play('launch'));

/* cockpit */
hook('openPanel', null, () => play('open'));
hook('closePanel', () => openId, (was) => { if (was) play('close'); });
hook('openTablet', () => tab.open, (was) => { if (!was && tab.open) play('open'); });
hook('closeTablet', () => tab.open, (was) => { if (was) play('close'); });
hook('holoOpen', null, () => play('toast'));
hook('holoClose', () => !$('holo').classList.contains('hidden'), (was) => { if (was) play('close'); });
hook('toast', null, () => play('toast'));
hook('beginMission', () => missionStarted, (was) => { if (!was) play('start'); });

/* rooms */
hook('goRoom', null, () => play('door'));
hook('goCockpit', null, () => play('door'));
hook('openRoomPanel', null, () => play('open'));
hook('closeRoomPanel', () => roomPanelId, (was) => { if (was) play('close'); });
hook('roomToast', null, () => play('toast'));
hook('keypadPress', () => (roomPanelId === 'keypad' && !kp.lock), (ok, _, key) => {
  if (!ok) return;
  if (key === 'OK') return;                                  // the result sound plays below
  play('keyPress', key === 'DEL' ? 11 : +key);
});
hook('keypadSubmit', () => kp.code.length >= GREENHOUSE_CODE.length ? kp.code : null, (code) => {
  if (code === null) return play('resBlock');
  play(code === GREENHOUSE_CODE ? 'keyOk' : 'keyBad');
});

/* research (rover) */
hook('resStart', null, () => {
  if (res.holding) startHold(); else play('resBlock');
});
hook('resStop', null, () => stopHold());
hook('resDone', null, () => { stopHold(); play('resDone'); });

/* sleeping, days, death */
hook('sleep', () => sleeping, (was) => { if (!was && sleeping) play('sleep'); });
hook('tabFinish', () => tab.over, (wasOver) => {
  if (wasOver || tab.failed) return;                         // death plays its own sound
  const stormy = wxDay(tab.day - 1).tier === 2;
  if (stormy) play('storm');
  setTimeout(() => play(tab.over ? 'win' : 'newDay'), stormy ? 500 : 0);
});
hook('startDeath', () => isDead, (was) => { if (!was) play('death'); });
hook('deathFadeOut', null, () => { play('fade'); setTimeout(() => play('alert'), 1500); });
hook('resetGame', null, () => play('select'));

/* ---------- clicks ---------- */
document.addEventListener('click', e => {
  const t = e.target;
  if (!t.closest || t.closest('#sfxBtn')) return;
  const b = t.closest('button');
  if (!b) {
    if (t.closest('#stage, #holo, #deathEcho')) play('next');     // clicking a speech bubble
    return;
  }
  if (b.disabled) return;
  if (b.closest('.choices, #holoChoices, .kp-keys, #resBtn')) return;   // these play their own sounds
  if (b.closest('.step')) return play(b.dataset.act && b.dataset.act.startsWith('dec') ? 'minus' : 'plus');
  if (b.classList.contains('hot') || b.classList.contains('arrow')) return;   // the door / panel sound plays instead
  if (b.matches('[data-act=sleep], [data-act=begin], [data-act=tablet]')) return;   // they play their own
  if (b.closest('.char')) return;                                // pickChar plays the sound
  if (b.matches('#charBack, #nameBack, #readyBack, #cpClose, #roomPanelClose, #tabClose, .tab-x')) return play('back');
  if (b.matches('#startBtn, #nameOk, #beginBtn, #deathAgain')) return play('select');
  play('click');
}, true);

/* hover blips on things you can click in the pictures */
document.addEventListener('mouseover', e => {
  const h = e.target.closest && e.target.closest('.hot, .arrow');
  if (h && !h.contains(e.relatedTarget)) play('hover');
});

/* typing blips: watch the speech-bubble text grow */
function watchTyping(id, voiceOf) {
  const el = document.getElementById(id);
  if (!el) return;
  let prev = 0;
  new MutationObserver(() => {
    const txt = el.textContent, n = txt.length;
    if (n > prev && n - prev <= 2 && txt[n - 1] !== ' ') blip(voiceOf());
    prev = n;
  }).observe(el, { childList: true, characterData: true, subtree: true });
}
watchTyping('dline', () => /VEGA/i.test($('dname').textContent) ? 'vega' : 'player');
watchTyping('holoLine', () => 'echo');
watchTyping('endLine', () => /VEGA/i.test($('endName').textContent) ? 'vega' : 'player');
watchTyping('deathLine', () => 'echo');

/* 3, 2, 1 */
(() => {
  const cd = document.getElementById('countdown');
  if (!cd) return;
  new MutationObserver(() => {
    const k = cd.textContent.trim();
    if (k === '3') play('tick', 440);
    else if (k === '2') play('tick', 523);
    else if (k === '1') play('tick', 659);
  }).observe(cd, { childList: true, characterData: true, subtree: true });
})();

/* ---------- mute button + M key ---------- */
(() => {
  const btn = document.createElement('button');
  btn.id = 'sfxBtn';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Sound on or off (M)');
  btn.title = 'Sound on or off (M). Sounds are SI-generated (Google Gemini).';
  btn.style.cssText = 'position:fixed;top:6px;right:6px;z-index:70;font:inherit;font-size:9px;line-height:1;' +
    'padding:7px 9px;color:#fff;background:rgba(0,0,0,.65);border:2px solid #6d4bb5;cursor:pointer;opacity:.8;';
  const label = () => { btn.textContent = SFX.muted ? '♪ OFF' : '♪ ON'; btn.setAttribute('aria-pressed', !SFX.muted); };
  const toggle = () => {
    SFX.setMuted(!SFX.muted);
    if (SFX._hold) SFX._hold.gain.value = SFX.muted ? 0 : SFX_VOLUME;
    label();
    if (!SFX.muted) play('select');
  };
  btn.addEventListener('click', () => { toggle(); btn.blur(); });
  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;        // typing a name
    toggle();
  });
  label();
  document.body.appendChild(btn);
})();


/* ---------- title screen: a quiet space hum, soft twinkles and comet whooshes ---------- */
(() => {
  const screen = document.getElementById('sTitle');
  if (!screen) return;
  const shown = () => !screen.classList.contains('hidden');
  let hum = null, twinkleTimer = 0, lastWhoosh = 0;
  const PENTA = [N.E5, N.G5, N.A5, N.C6, N.D5 * 2, N.E5 * 2];

  function startHum() {
    if (hum) return;
    const o = SFX.out();
    if (!o) return;
    const { c, master } = o;
    const g = c.createGain();
    g.gain.value = 0.0001;
    g.connect(master);
    const oscs = [[55, 'triangle', 1], [55.5, 'triangle', 1], [82.4, 'sine', 0.6], [110.3, 'sine', 0.25]].map(([f, type, amp]) => {
      const os = c.createOscillator(), og = c.createGain();
      os.type = type; os.frequency.value = f; og.gain.value = amp;
      os.connect(og); og.connect(g); os.start();
      return os;
    });
    const lfo = c.createOscillator(), lg = c.createGain();      // the hum slowly swells and fades
    lfo.frequency.value = 0.12; lg.gain.value = 0.02;
    lfo.connect(lg); lg.connect(g.gain); lfo.start();
    g.gain.linearRampToValueAtTime(0.06, c.currentTime + 2.5);
    hum = { g, c, stop() {
      g.gain.cancelScheduledValues(c.currentTime);
      g.gain.setValueAtTime(g.gain.value, c.currentTime);
      g.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.5);
      setTimeout(() => { oscs.forEach(x => { try { x.stop(); } catch (e) { /* ok */ } }); try { lfo.stop(); } catch (e) { /* ok */ } g.disconnect(); }, 650);
      hum = null;
    } };
  }

  function twinkle() {
    twinkleTimer = setTimeout(twinkle, 1800 + Math.random() * 3200);
    if (!shown() || SFX.muted) return;
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    SFX.tone({ f, d: 0.7, type: 'sine', v: 0.05 });
    SFX.tone({ f: f * 2, d: 0.4, type: 'sine', v: 0.02, at: 0.05 });
  }

  function sync() {
    if (shown() && !SFX.muted) { startHum(); if (!twinkleTimer) twinkleTimer = setTimeout(twinkle, 1200); }
    else {
      if (hum) hum.stop();
      clearTimeout(twinkleTimer); twinkleTimer = 0;
    }
  }

  addEventListener('title-comet', () => {
    const now = performance.now();
    if (!shown() || SFX.muted || now - lastWhoosh < 900) return;
    lastWhoosh = now;
    const f = 1800 + Math.random() * 1800;
    SFX.noise({ d: 0.9, v: 0.05, f, to: f / 4, type: 'bandpass', q: 1.5 });
  });

  new MutationObserver(sync).observe(screen, { attributes: true, attributeFilter: ['class'] });
  const unlock = () => { sync(); if (hum) { try { hum.c.resume(); } catch (e) { /* ok */ } } };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, unlock, { passive: true }));
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('#sfxBtn')) setTimeout(sync, 0); }, true);
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'm') setTimeout(sync, 0); });
  sync();
})();
