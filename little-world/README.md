# LITTLE WORLD

_A tiny world that moves to your music._

A cartoon meadow that lives on a monitor or TV. The sun follows the real solar day for a chosen city, and the grass, flowers, characters and the sun's face react to sound from the microphone. It looks complete when the room is silent and gets livelier when music plays.

React + TypeScript + Vite, drawn as one SVG. No backend.

```
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (solar, audio, animation, placement, viewport)
npm run typecheck
npm run build      # → dist/
```

## Deploying on Vercel

This app lives in the `little-world/` folder of a repo that also contains another site, so give it its own Vercel project:

| Setting | Value |
| --- | --- |
| Root Directory | `little-world` |
| Framework preset | Vite (also set in `vercel.json`) |
| Build command | `npm run build` |
| Output directory | `dist` |

The microphone only works on `https://` pages or `localhost`, which Vercel provides.

## Using it

- **Display mode.** The artwork fills the screen. The buttons (edit, fullscreen, settings) fade out after a few seconds without input, and so does the cursor. Press **F** to toggle fullscreen.
- **Microphone.** The first visit shows *LET YOUR LITTLE WORLD LISTEN.* After you click **ENABLE MICROPHONE**, the app measures the room for 3 seconds to set a noise floor. Then quiet means idle, moderate means groove and loud means dance. Settings has the on/off switch, the input device, sensitivity, a live level meter and **Recalibrate**.
- **Edit world.** Use the pencil button. Click a character to add it (up to 5), drag characters along the grass, and select one to resize, nudge or remove it. Keyboard: Tab to a character, then arrows move it, +/− resize it and Delete removes it. Changes save automatically to `localStorage`.
- **Preview mode** (in Settings). A time-of-day slider with Dawn / Sunrise / Noon / Sunset / Dusk / Night jumps, a simulated sound slider, and Test idle / groove / dance buttons. **RETURN TO LIVE** goes back to the real clock and microphone. Preview never changes saved settings.
- **Location.** Choose from 22 cities (Melbourne is the default), or use *Use my location*. That asks the browser, rounds the position to about 1 km and uses the device's time zone.
- **Motion.** *Follow system* respects `prefers-reduced-motion`. *Static artwork* freezes all movement; the sun and sky still change with the time of day.

## Characters

| id | Name | Movement profile | Artwork |
| --- | --- | --- | --- |
| `pip` | Pip | bouncy | original, drawn in code |
| `mochi` | Mochi | rocking | original, drawn in code |
| `spongebob` | SpongeBob | bouncy | supplied |
| `woody` | Woody | sidestep | supplied |
| `snoopy` | Snoopy | relaxed | supplied |
| `pooh` | Winnie the Pooh | rocking | supplied |
| `stitch` | Stitch | chaotic | supplied |
| `buzz` | Buzz Lightyear | robotic | **not supplied yet** |
| `garfield` | Garfield | lazy (barely moves until it's loud) | **not supplied yet** |

A character whose image is missing still appears in the picker, greyed out with "Artwork needed". Nothing is substituted for it. To unlock one:

```
pip install pillow numpy scipy opencv-python-headless
python3 tools/prepare_character.py ~/Downloads/buzz.jpg buzz --checker   # --checker if the JPG has a fake transparency grid
python3 tools/prepare_character.py ~/Downloads/garfield.jpg garfield
```

The tool removes the background (including checkerboard pockets between arms and legs), crops, adds the scene's thick outline and writes `public/characters/<id>.webp`. A transparent `public/characters/<id>.png` also works without the tool.

To add a brand-new character, add one line to `src/data/characters.ts` and choose a profile from `PROFILES` in `src/lib/animation.ts`. No other code needs to change.

**Rights.** The supplied images of recognisable film/TV characters are creative references for this personal prototype. Deploying them publicly redistributes them. For anything public or commercial, use licensed artwork or replace them with original characters.

## How it works

```
location + time ──► solar.ts ──► sun arc, sky phase, palette blend ─┐
microphone ──► useMicrophone (RMS → noise-floor-relative energy) ─┐ │
preview slider ───────────────────────────────────────────────────┤ │
                    AnimationEngine (one rAF loop)                 │ │
                    smoothing → quiet/moderate/loud (hysteresis)   │ │
                    → drive → spring-simulated wind ◄──────────────┘ │
                                    │                                │
            grass / flowers / characters / sun face mutate SVG ◄─────┘
            attributes directly (no React re-render per frame)
```

- **Sun.** `lib/solar.ts` uses SunCalc for sunrise, sunset, solar noon, dawn, dusk, altitude and azimuth. For each local calendar day it queries near local solar noon, so far-from-UTC zones such as Melbourne and Auckland get the right day. The visual sun follows a stylised arc: x is the fraction of the way from sunrise to sunset, and the arc's height scales with today's noon altitude, so winter arcs are lower. Midnight sun and polar night fall back to the solar clock.
- **Sky.** The palette is blended from the sun's real altitude: night ↔ sunrise/sunset ↔ day. The same scene is re-tinted rather than swapped. Characters and flowers get a gentle night colour filter so they stay readable.
- **Moon.** Decorative only. It travels a night arc from sunset to sunrise and does **not** model real lunar position or phase.
- **Sound.** `AnalyserNode` time-domain samples → RMS → decibels above the calibrated floor → 0–1 energy. This is a relative loudness index, **not** a calibrated dB meter. Energy rises fast and falls slowly. The three levels use on/off thresholds plus a minimum hold time so they don't flicker. Audio never leaves the page: nothing is recorded or stored, and the analyser isn't connected to the speakers.
- **Movement.** Each character has a profile (tempo, sway, bounce, step, squash, spin, chaos, robotic stepping, effort curve, reaction lag) and its own phase, so no two characters move in lockstep. Poses are transforms around the feet: translate, rotate, scale.
- **Performance.** One `requestAnimationFrame` loop that pauses when the tab is hidden. The microphone's audio context is suspended while the tab is hidden, and the clock re-syncs when the tab becomes visible again. Grass updates every other frame on slow machines. In headless Chromium with software rendering, 5 dancing characters at 1920×1080 ran at a median frame time of 16.7 ms.
- **Layout.** The scene is 1600×900. On 16:9 screens the full scene is visible. Ultra-wide screens crop the top of the sky. Portrait screens show a centred slice of the meadow at least 900 units wide, with the sky extended upward. Character x positions are stored as 0–1 across the visible ground.

## Browser notes and limitations

- **Microphone needs https** (or localhost). Some browsers start the audio context paused until the first click or keypress; the app resumes it on the next interaction.
- **Auto-resume.** If the mic was on last time and the browser remembers the permission, it restarts on load. Firefox doesn't expose the microphone permission state, so there you click Enable again after a reload.
- **Echo cancellation / noise suppression / auto gain** are requested *off* for honest levels. Some browsers and devices (notably iOS) may ignore this, which makes music feel quieter. Raise the sensitivity to compensate.
- **Fullscreen.** iPhone Safari has no Fullscreen API. The app shows a hint there (use Add to Home Screen). Everywhere else the button and the F key work.
- **Safari.** SVG colour filters (the night tint) are slightly heavier there. Movement still runs, and the motion setting can switch to static.
- **Sleep and wake.** The clock re-syncs when the tab becomes visible, and at least every 20 seconds.
- **"Use my location"** uses the browser's own time zone with the found coordinates. If the computer's time zone differs from where it physically is, pick a city instead.
