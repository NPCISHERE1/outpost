# SI (AI) use disclosure: Outpost Shift

Made for the NASA Space Apps Challenge 2026. This file lists where Super Intelligence (SI / AI) tools were used.

| Part | SI tool | How it was used | Where it is marked |
|---|---|---|---|
| **Images** (all art, sprites and icons) | Google Gemini | Every image was generated with Gemini. | A visible watermark ("SI-GENERATED: GEMINI") is on every picture: top-left on scenes, at the bottom on the character sprites. All PNG files also carry the note in their metadata (`si-watermark`, `Description`). The three tiny icons (favicons, apple-touch-icon) are too small for a visible mark, so they only have the metadata note. |
| **Audio** | Anthropic Claude | The audio was SI-generated. The sounds are synthesized in code with the browser's Web Audio API (`js/audio.js`), so there are no audio files. | Header comment in `js/audio.js`, tooltip on the sound button, the credit line on the title screen, `<meta>` tags in `index.html`, and this file. |
| **Code** | Anthropic Claude | The game code (HTML, CSS, JavaScript) was written with SI assistance from Claude, then tested and edited by the team. | A disclosure comment at the top of every `.js`, `.css` and `index.html` file, `<meta>` tags in `index.html`, the credit line on the title screen, and this file. |
| **Data** | none | The space-weather data is real NASA DONKI data, fetched live. HARD MODE adds extra storm days with normal game code (no SI-generated data). The game says so on screen. | In-game "source" lines and the tablet tag. |

## Images
- `assets/apple-touch-icon.png`
- `assets/bedroom.png`
- `assets/boat.png`
- `assets/controlroom2.png`
- `assets/enteratm.png`
- `assets/entersky.png`
- `assets/favicon-16.png`
- `assets/favicon-32.png`
- `assets/female.png`
- `assets/infront.png`
- `assets/male.png`
- `assets/ocean.png`
- `assets/outside.png`
- `assets/oxygendead.png`
- `assets/radiationdead.png`
- `assets/spaceship.png`
- `assets/vega.png`

To stamp a new image: `python3 tools/watermark.py assets/new-image.png`. The script skips images that are already stamped.
It uses the Press Start 2P font (SIL Open Font License, see `tools/PressStart2P-OFL.txt`).

## Notes
- Outpost Shift is not affiliated with or endorsed by NASA. It only uses NASA's public DONKI space-weather data.
