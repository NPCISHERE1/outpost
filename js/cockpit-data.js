/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* ---------- cockpit scene (shown after the video): edit these ---------- */
const COCKPIT_IMG  = 'assets/spaceship.png';
const ART          = { w: 1024, h: 577 };  // hotspot x/y/w/h are in image pixels
const HOLO         = { name: 'Echo' };     // the little hologram bottom-left
const HOLO_CROP    = { x: 112, y: 378, s: 128 };  // hologram portrait crop of the art
const MISSION_DAYS = 20;
const DOSE_LIMIT   = 25;                   // game limit for the whole mission (mSv). Reach it = crew lost
const DOSE_ACUTE   = 10;                   // game limit for ONE day (mSv). One huge dose = crew lost
const DUST_DAYS    = [5, 6, 9, 10, 13, 14, 16, 17, 19];   // dust covers the panels (less power). More now.

/* real NASA space weather (DONKI). Free key: https://api.nasa.gov */
const NASA_KEY      = 'p9NBrjMkzRNwttwMF6Pffwz7pFMQ766rHFGrJG7q';
const USE_LIVE_NASA = true;                // false = always use the practice schedule

/* live values start here (the art says fuel 95%) */
const SHIP_START = {
  day: 1, fuel: 95, power: 82, battery: 40, hull: 100, oxygen: 80,
  co2: 0.04, temp: 21, shield: 25, rad: 0.46, radBase: 0.46, dose: 4.2, signal: 88
};

/* Clickable areas. go = 'panel:<id>' | 'toast:<id>' | 'holo'.
   Later entries sit on top of earlier ones. */
const HOTSPOTS = [
  { id: 'crewL', label: 'Your seat',
    x: 255, y: 312, w: 170, h: 264, go: 'toast:crewL' },
  { id: 'crewR', label: 'Co-pilot',
    x: 612, y: 288, w: 170, h: 288, go: 'toast:crewR' },
  { id: 'console', label: 'Mission console',
    x: 388, y: 362, w: 230, h: 105, go: 'panel:console' },
  { id: 'earth', label: 'Earth',
    x: 464, y: 88, w: 104, h: 104, go: 'toast:earth', round: true },
  { id: 'landL', label: 'Lander',
    x: 318, y: 248, w: 118, h: 60, go: 'toast:lander' },
  { id: 'landR', label: 'Lander',
    x: 612, y: 205, w: 120, h: 92, go: 'toast:lander' },
  { id: 'rad', label: 'Radiation monitor',
    x: 30, y: 20, w: 215, h: 165, go: 'panel:radiation' },
  { id: 'map', label: 'Mission map',
    x: 815, y: 8, w: 185, h: 150, go: 'panel:map' },
  { id: 'link', label: 'Earth link',
    x: 30, y: 238, w: 125, h: 120, go: 'panel:link' },
  { id: 'air', label: 'Life support',
    x: 858, y: 250, w: 78, h: 92, go: 'panel:air' },
  { id: 'log', label: 'Mission log',
    x: 940, y: 232, w: 78, h: 105, go: 'panel:log' },
  { id: 'status', label: 'Ship status & fuel',
    x: 880, y: 375, w: 128, h: 128, go: 'panel:status' },
  { id: 'tablet', label: 'Outpost tablet',
    x: 38, y: 384, w: 90, h: 144, go: 'tablet' },
  { id: 'holo', label: 'Ask ' + HOLO.name,
    x: 132, y: 374, w: 70, h: 158, go: 'holo' }
];

const LOG = [
  { id: 'launch', text: 'Launch',                done: true },
  { id: 'land',   text: 'Landing',               done: true },
  { id: 'panels', text: 'Deploy solar panels',   done: false },
  { id: 'shield', text: 'Check radiation shield', done: false },
  { id: 'air',    text: 'Test air system',       done: false },
  { id: 'shift',  text: 'Start the ' + MISSION_DAYS + ' day shift', done: false }
];

const CONSOLE_CHECKS = [
  'Engines: ready', 'Navigation: ready', 'Comms: linked',
  'Life support: running', 'Shields: standing by'
];

/* little speech bubbles for the flavor hotspots (cycles through the list) */
const TOASTS = {
  locked: ['The tablet is locked. Begin the mission at the mission console.'],
  earth:  ['Home. About 384,400 km away.', 'Everyone you know is down there.'],
  lander: ['Landing site. The old lander is parked and quiet.',
           'Lander legs are still dusty from touchdown.'],
  crewL:  ['You: "Deep breath. We have a job to do."',
           'You: "Check the numbers twice."'],
  crewR:  ['Co-pilot: "Nice flying, Commander!"',
           'Co-pilot: "Keep an eye on that radiation monitor."']
};

/* The hologram's lines are built fresh every day in js/forecast.js (HOLO_GREETING, HOLO_TOPICS). */
