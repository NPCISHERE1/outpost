/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Liftoff: full-screen YouTube video */
let launched = false, launchDone = false, ytPlayer = null;
let startTimer = null, failTimer = null;
const ytQueue = [];

/* YouTube error codes -> readable reason */
const YT_ERRORS = {
  2:   'Bad video ID',
  5:   'Player error',
  100: 'Video not found or private',
  101: 'Owner disabled embedding',
  150: 'Owner disabled embedding',
  153: 'Blocked: open the game from http://localhost, not as a file'
};

/* show why the video failed, then continue to the game */
function failLaunch(reason) {
  if (launchDone) return;
  console.error('Launch video failed:', reason);
  clearTimeout(startTimer);
  $('ytWrap').classList.add('hidden');
  $('launchMsg').textContent = 'Video unavailable\n' + reason;
  $('launchMsg').classList.remove('hidden');
  clearTimeout(failTimer);
  failTimer = setTimeout(finishLaunch, 4500);
}

/* load the YouTube IFrame API once; queue callbacks until it is ready */
function loadYT(cb) {
  if (window.YT && window.YT.Player) return cb();
  ytQueue.push(cb);
  if ($('yt-api')) return;

  window.onYouTubeIframeAPIReady = () => ytQueue.splice(0).forEach(fn => fn());
  const tag = document.createElement('script');
  tag.id = 'yt-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  tag.onerror = () => failLaunch('Could not load YouTube');
  document.head.appendChild(tag);
}

function startLaunch() {
  if (launched) return;
  launched = true;
  launchDone = false;

  const box = $('launch');
  box.classList.add('on');
  box.classList.toggle('fill', LAUNCH_VIDEO_FILL);
  box.setAttribute('aria-hidden', 'false');
  $('launchMsg').classList.add('hidden');
  $('ytWrap').classList.remove('hidden');
  $('unmuteBtn').classList.add('hidden');
  $('credit').textContent = LAUNCH_CREDIT ? 'Video: ' + LAUNCH_CREDIT : '';
  $('launchUI').classList.remove('hidden');

  if (!LAUNCH_VIDEO_ID) return finishLaunch();

  /* safety net: never trap the player on black */
  clearTimeout(startTimer);
  startTimer = setTimeout(() => failLaunch('Video took too long to load'), 10000);

  loadYT(() => {
    if (launchDone) return;
    ytPlayer = new YT.Player('ytFrame', {
      width: '100%',
      height: '100%',
      videoId: LAUNCH_VIDEO_ID,
      playerVars: {
        autoplay: 1,
        mute: LAUNCH_VIDEO_MUTED ? 1 : 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        disablekb: 1,
        fs: 0,
        iv_load_policy: 3,
        start: LAUNCH_VIDEO_START
      },
      events: {
        onReady: e => {
          e.target.playVideo();
          if (LAUNCH_VIDEO_MUTED) $('unmuteBtn').classList.remove('hidden');
        },
        onStateChange: e => {
          if (e.data === YT.PlayerState.PLAYING) clearTimeout(startTimer);
          if (e.data === YT.PlayerState.ENDED) finishLaunch();
        },
        onError: e => failLaunch(YT_ERRORS[e.data] || 'Error ' + e.data)
      }
    });
  });
}

/* video finished or skipped -> cockpit scene (it calls OutpostMenu.onBegin) */
function finishLaunch() {
  if (launchDone) return;
  launchDone = true;
  clearTimeout(startTimer);
  clearTimeout(failTimer);
  try { ytPlayer && ytPlayer.stopVideo && ytPlayer.stopVideo(); } catch (err) {}
  $('launch').classList.remove('on');
  $('launch').setAttribute('aria-hidden', 'true');
  $('unmuteBtn').classList.add('hidden');
  $('launchUI').classList.add('hidden');
  startCockpit();                       // next: the interactive cockpit scene
}

/* skip button */
$('skipBtn').onclick = finishLaunch;

/* browsers only allow unmuting after a tap/click */
$('unmuteBtn').onclick = () => {
  if (!ytPlayer || typeof ytPlayer.unMute !== 'function') return;
  ytPlayer.unMute();
  ytPlayer.setVolume(100);
  $('unmuteBtn').classList.add('hidden');
};
