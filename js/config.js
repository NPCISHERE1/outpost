/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* ---------- config: edit these ---------- */
const LOGO_IMAGE = null;               // e.g. 'assets/logo.png' (null = text title)

const CHARACTERS = [
  { id: 'male',   label: 'Male',   sprite: 'assets/male.png' },
  { id: 'female', label: 'Female', sprite: 'assets/female.png' }
];

/* Briefing scene art (null = placeholder). Use {NAME} for the player's name. */
const SCENE_BG  = 'assets/controlroom2.png';
const SCIENTIST = { name: 'Dr. Vega', sprite: 'assets/vega.png' };
const TYPE_MS   = 28;                  // typing speed (ms per letter)

/* Scientist lines said before the questions */
const INTRO = [
  { who: 'sci', text: 'Ah, Commander {NAME}! Right on time. Welcome to Mission Control.' },
  { who: 'sci', text: 'The rocket is fueled and your crew of four is waiting. ' +
                      'Any questions before launch?' }
];

/* ask = the player's line, answer = scientist lines */
const TOPICS = [
  { ask: 'What will we do up there?', answer: [
    { who: 'sci', text: 'You will run an outpost for 20 days. ' +
                        'Every day you get a little power to share.' },
    { who: 'sci', text: 'Split it between air, radiation shields and science. ' +
                        'Whatever you pick, something else gets less.' }
  ]},
  { ask: 'What is the biggest danger?', answer: [
    { who: 'sci', text: 'The Sun! Solar storms shoot out fast particles. ' +
                        'That is called radiation. We use real NASA data.' },
    { who: 'sci', text: 'It adds up every day and never goes away. ' +
                        'Too much and the crew will not survive!' },
    { who: 'sci', text: 'Echo gives a new forecast every day, but it can be ' +
                        'wrong. Raise your shields in time!' }
  ]},
  { ask: 'Why do we need a battery?', answer: [
    { who: 'sci', text: 'At night, or in a dust storm, ' +
                        'the solar panels make much less power.' },
    { who: 'sci', text: 'Saving power in the battery helps you get through. ' +
                        'But it only holds so much!' }
  ]},
  { ask: 'Is research safe?', answer: [
    { who: 'sci', text: 'Research at the rover gives you more science.' },
    { who: 'sci', text: 'But you work outside, with less protection from ' +
                        'radiation, and you use extra air. Pick calm days!' }
  ]}
];

const READY = {
  ask: 'No more questions. Let us launch!',
  answer: [
    { who: 'sci', text: 'Good luck, Commander. Starting the launch sequence now!' }
  ]
};

/* ---- LIFTOFF VIDEO ---- */
const LAUNCH_VIDEO_ID    = 'zctTKdQcmVA';  // https://youtu.be/zctTKdQcmVA
const LAUNCH_VIDEO_START = 0;              // seconds into the video
const LAUNCH_VIDEO_MUTED = true;           // muted = autoplay always allowed
const LAUNCH_VIDEO_FILL  = false;          // true = crop to fill, false = letterbox
const LAUNCH_CREDIT      = 'Digital Astronaut';  // video owner shown bottom-left ('' = hide)
