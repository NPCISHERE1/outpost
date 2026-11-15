/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Shared state and helpers */
const $ = id => document.getElementById(id);
const player = { charId: null, name: '' };
const screens = ['sTitle', 'sChar', 'sName', 'sReady', 'sScene', 'sCockpit', 'sRoom'];
const FOCUS = { sTitle: 'startBtn', sName: 'nameInput', sReady: 'beginBtn' };

let current = 'sTitle';
let charIdx = 0;

const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const esc = s => String(s).replace(/[&<>"]/g, c => ESC_MAP[c]);
const isConfirm = e => e.key === 'Enter' || e.key === ' ';

const imgTag = src => `<img src="${esc(src)}" alt="">`;
const spriteHTML = (c, fallback) => (c.sprite ? imgTag(c.sprite) : fallback);
const frameHTML = c => spriteHTML(c, '<span>Sprite</span>');
const actorHTML = (c, label) => spriteHTML(c, `<div class="ph">${esc(label)}</div>`);
const charById = id => CHARACTERS.find(c => c.id === id) || CHARACTERS[0];

function show(id) {
  current = id;
  screens.forEach(s => $(s).classList.toggle('hidden', s !== id));
  if (id === 'sChar') focusChar(charIdx);
  else if (FOCUS[id]) $(FOCUS[id]).focus({ preventScroll: true });
}
