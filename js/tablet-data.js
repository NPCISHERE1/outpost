/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* ---------- outpost tablet: edit these ---------- */
const TAB_POWER      = 8;      // power to share on a normal day
const TAB_DUST_POWER = 5;      // power on a dust-storm day (the battery helps)
const TAB_SCI_TARGET = 100;    // science points that fill all 5 blocks
const TAB_START      = { life: 3, shield: 1, sci: 4 };

/* radiation dose for a calm / small storm / big storm day (mSv). Harder than before. */
const TAB_BASE_DOSE = [0.8, 4, 11];
/* share of the dose that gets through with 0, 1, 2 ... 5 shield power */
const TAB_SHIELD_LEFT = [1, 0.6, 0.35, 0.2, 0.12, 0.08];   // stronger now: there is only 8 power to share

/* The storm days start from real NASA data (see js/forecast.js). HARD MODE then adds
   extra storms on top, so radiation waves come much more often, like in real space.
   The same dates always get the same extra storms. */
const HARD = {
  on: true,
  safeDays: 2,          // the first days are left alone so players can learn
  calmToSmall: 0.30,    // chance a calm day turns into a small storm
  smallToBig: 0.30,     // chance a small storm turns into a BIG storm
  waves: true           // after a big storm the next day is at least a small one
};

/* air: a normal day uses this much (life support power gives 8 air each) */
const AIR_PER_DAY = 20;

/* RESEARCH (the rover scene): hold the button until the bar fills.
   A session is a share of a day, and research uses airMult times the normal air:
   20 air a day x 0.25 of a day x 3 = 15 air per session. */
const RESEARCH = {
  holdMs: 4000,         // how long you hold the button
  sci: 8,               // science points for one finished session
  maxPerDay: 2,         // sessions per day (sleeping resets it)
  airMult: 3,           // research uses 3x the normal air
  dayShare: 0.25,       // a session takes a quarter of a day
  stormDose: [0, 0.6, 1.8]   // radiation taken by one research session outside (mSv): calm / small storm / BIG storm.
                             // Out there the shield cannot help. It builds up while you hold the button.
};

/* the question bar at the bottom: click to see the answer, click again for the next */
const TAB_QA = [
  { q: 'Where does science come from?',
    a: 'Power! The science lab uses power to run experiments.' },
  { q: 'Why do I need a radiation shield?',
    a: 'The Sun sends fast particles. A shield blocks some of them.' },
  { q: 'What does the battery do?',
    a: 'It saves spare power for dust storms, when panels make less.' },
  { q: 'Why is research risky?',
    a: 'Research is outside, with less shielding. You also use extra air.' },
  { q: 'Why does research use so much air?',
    a: `Hard work makes you breathe faster. It uses ${RESEARCH.airMult} times the air.` }
];
