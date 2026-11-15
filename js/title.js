/* SI DISCLOSURE: written with SI assistance (Anthropic Claude) and edited by the team. See AI-DISCLOSURE.md */
/* Title screen backdrop: a pixel night sky with twinkling stars, a slowly turning Earth,
   a rain of comets, and the lunar surface.
   Drawn small and scaled up, so it stays chunky and retro. It only moves while the title is showing. */

(() => {
  const cv = document.getElementById('titleSky');
  const screen = document.getElementById('sTitle');
  if (!cv || !screen) return;
  const ctx = cv.getContext('2d');
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 320, H = 180, stars = [], ground = null, groundY = [], comets = [];
  const COMETS = 26;
  const TAILS = [['#7fd8ff', '#e6f9ff'], ['#ffd27a', '#fff6d6'], ['#ff9ad5', '#ffe0f2'], ['#b9a2ff', '#efe8ff']];
  function newComet(ms, first) {
    const dir = 0.45 + rand() * 0.25;                      // slope of the fall
    const mag = Math.hypot(1, dir);
    const t = TAILS[Math.floor(rand() * TAILS.length)];
    const dist = H * (0.75 + rand() * 0.5);
    return {
      x: W * (0.25 + rand() * 1.0), y: -6 - rand() * H * 0.2,
      dx: -dist / mag, dy: dist * dir / mag,
      ux: -1 / mag, uy: dir / mag,
      len: 10 + Math.floor(rand() * 22), big: rand() < 0.25, col: t[0], hi: t[1],
      dur: 1600 + rand() * 1800, t0: ms + (first ? rand() * 2500 : rand() * 900)
    };
  }
  const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();

  const SKY = ['#05040f', '#080620', '#0b0830', '#10093e', '#170d4a', '#201055', '#2d1560'];   // top to horizon

  function setup() {
    const r = screen.getBoundingClientRect();
    W = 320;
    H = Math.max(120, Math.round(W * (r.height || innerHeight) / (r.width || innerWidth)));
    cv.width = W;
    cv.height = H;

    stars = Array.from({ length: Math.round(W * H / 190) }, () => ({
      x: Math.floor(rand() * W), y: Math.floor(rand() * H * 0.78),
      c: ['#ffffff', '#ffffff', '#fff3b0', '#9fe8ff'][Math.floor(rand() * 4)],
      big: rand() < 0.1, p: rand() * 6.28, sp: 0.6 + rand() * 1.6
    }));

    /* the moon ground is drawn once into its own small canvas */
    ground = document.createElement('canvas');
    ground.width = W;
    ground.height = H;
    const g = ground.getContext('2d');
    const top = Math.round(H * 0.8);
    groundY = [];
    for (let x = 0; x < W; x++) groundY[x] = top + Math.round(Math.sin(x * 0.045) * 2 + Math.sin(x * 0.11 + 1) * 1.5);
    for (let x = 0; x < W; x++) {
      for (let y = groundY[x]; y < H; y++) {
        const d = (y - groundY[x]) / (H - groundY[x]);
        g.fillStyle = y === groundY[x] ? '#d5d5e4' : d < 0.25 ? '#9d9db2' : d < 0.6 ? '#7b7b92' : '#5a5a72';
        g.fillRect(x, y, 1, 1);
      }
    }
    /* craters: dark bowl with a light rim */
    for (let i = 0; i < Math.round(W / 14); i++) {
      const cx = Math.floor(rand() * W), cy = top + 4 + Math.floor(rand() * (H - top - 6));
      const rx = 3 + Math.floor(rand() * 7), ry = Math.max(1, Math.round(rx / 3));
      g.fillStyle = '#4a4a62';
      g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.3); g.fill();
      g.fillStyle = '#b7b7cb';
      g.fillRect(cx - rx, cy - ry, rx * 2, 1);
    }
    /* a few rocks */
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(rand() * (W - 6)), y = groundY[x] + 1;
      g.fillStyle = '#6a6a80'; g.fillRect(x, y - 2, 4, 2);
      g.fillStyle = '#b0b0c4'; g.fillRect(x, y - 2, 2, 1);
    }
  }

  /* a little Earth: ocean, land and clouds that drift across as it turns */
  function drawEarth(t) {
    const cx = Math.round(W * 0.8), cy = Math.round(H * 0.24), R = Math.max(10, Math.round(H * 0.11));
    for (let y = -R; y <= R; y++) {
      for (let x = -R; x <= R; x++) {
        if (x * x + y * y > R * R) continue;
        const u = x + t * 2.2;                                    // the spin
        const n = Math.sin(u * 0.55) + Math.sin(y * 0.7 + u * 0.2) + Math.sin((u + y) * 0.35);
        const cloud = Math.sin(u * 0.9 + y * 0.5) + Math.sin(y * 1.3 - u * 0.3);
        let c = n > 0.7 ? '#3aa85a' : '#2f6fd8';
        if (cloud > 1.45) c = '#eef6ff';
        const lit = (-x - y) / (R * 1.4);                         // light from the top left
        if (lit < -0.25) c = c === '#3aa85a' ? '#23753d' : c === '#2f6fd8' ? '#1f4a99' : '#b7c3d8';
        ctx.fillStyle = c;
        ctx.fillRect(cx + x, cy + y, 1, 1);
      }
    }
    ctx.fillStyle = 'rgba(120,170,255,.18)';                      // thin glow ring
    for (let a = 0; a < 64; a++) ctx.fillRect(Math.round(cx + Math.cos(a / 10.2) * (R + 1)), Math.round(cy + Math.sin(a / 10.2) * (R + 1)), 1, 1);
  }

  function frame(ms) {
    const t = ms / 1000;
    /* sky in steps */
    const band = Math.ceil(H * 0.8 / SKY.length);
    SKY.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * band, W, band + 1); });
    ctx.fillStyle = SKY[SKY.length - 1];
    ctx.fillRect(0, SKY.length * band, W, H);

    /* stars twinkle in 3 steps */
    stars.forEach(s => {
      const a = still ? 1 : Math.round((Math.sin(t * s.sp + s.p) * 0.5 + 0.5) * 2) / 2;
      ctx.globalAlpha = 0.35 + a * 0.65;
      ctx.fillStyle = s.c;
      ctx.fillRect(s.x, s.y, 1, 1);
      if (s.big) { ctx.fillRect(s.x - 1, s.y, 3, 1); ctx.fillRect(s.x, s.y - 1, 1, 3); }
    });
    ctx.globalAlpha = 1;

    drawEarth(still ? 0 : t);

    /* comet rain: bright heads with long fading tails streaking down to the left */
    if (!still) {
      while (comets.length < COMETS) comets.push(newComet(ms, true));
      comets.forEach((c, i) => {
        const k = (ms - c.t0) / c.dur;
        if (k < 0) return;
        if (k > 1) { comets[i] = newComet(ms, false); return; }
        if (c.big && !c.heard) { c.heard = true; dispatchEvent(new CustomEvent('title-comet')); }   // audio.js listens
        const hx = c.x + k * c.dx, hy = c.y + k * c.dy;
        const len = c.len;
        for (let j = 0; j < len; j++) {
          const f = j / len;
          ctx.globalAlpha = (1 - f) * 0.9;
          ctx.fillStyle = f < 0.2 ? c.hi : c.col;
          const px = Math.round(hx - c.ux * j), py = Math.round(hy - c.uy * j);
          ctx.fillRect(px, py, 1, 1);
          if (c.big && f < 0.5) ctx.fillRect(px + 1, py, 1, 1);
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(hx), Math.round(hy), c.big ? 2 : 1, c.big ? 2 : 1);
      });
    }
    ctx.drawImage(ground, 0, 0);
  }

  let raf = 0;
  const visible = () => !screen.classList.contains('hidden');
  function loop(ms) {
    raf = 0;
    if (!visible()) return;                       // stop drawing when you leave the title
    frame(ms);
    if (!still) raf = requestAnimationFrame(loop);
  }
  function wake() { if (!raf && visible()) raf = requestAnimationFrame(loop); }

  setup();
  new MutationObserver(wake).observe(screen, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', () => { setup(); wake(); if (still && visible()) frame(0); });
  wake();
  if (still) frame(0);
})();
