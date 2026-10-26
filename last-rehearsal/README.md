# The Last Rehearsal

> Rehearsal starts in five minutes. Nothing's ready.

A mobile-first 3D point-and-click game set inside the band's real rehearsal room, using the Polycam scan as the environment. Fans fix Mitch's pedals, find the setlist in the pizza boxes and help Zac, the drummer, remember the beat. Then the band starts the last rehearsal.

React 18 + TypeScript, React Three Fiber / three.js, drei, Tailwind. No backend; progress is saved in `localStorage`.

```sh
npm install
npm run dev          # http://localhost:5173
npm test             # vitest
npm run lint && npm run typecheck && npm run build
```

Useful URL flags: `?debug` draws every hotspot box with its id. `?lq` forces the lite model and `?source` the original export. `?nosharpen` turns off texture sharpening.

## Deploying (Vercel)

Live at https://the-last-rehearsal.vercel.app (Vercel project `the-last-rehearsal`, root directory `last-rehearsal`). The end-screen buttons point to https://jewelowusu.com/ by default. Set `VITE_LISTEN_URL` or `VITE_LIVE_URL` to change them.

## Where things live

| What | File |
| --- | --- |
| Hotspot positions, sizes, camera close-ups, camera limits | `src/config/hotspots.ts` |
| All copy: dialogue, facts, secrets, setlist, story | `src/config/content.ts` |
| Puzzle answers, pedal clue, beat, CTA links, optional reveal audio | `src/config/game.ts` |
| Game state, saving and loading | `src/game/state.ts` |
| Puzzle rules (pure, tested) | `src/game/puzzles.ts` |
| Sounds (all synthesised, nothing recorded) | `src/audio/sfx.ts` |
| Scan loading, camera, hotspots, glows, red stool | `src/three/` |
| Interface | `src/ui/` |

### Adjusting a hotspot

Open `/?debug`. Each box is outlined and labelled. Change its `position` (centre) or `size` in `src/config/hotspots.ts` and reload. Coordinates are the GLB's own metres: x runs from Mitch's wall (−1.8) to Jewel's wall (+1.8), y from the floor (−0.37) up, and z from the mural (−2.7) to the door (+2.9). `focus` is where the camera flies for that object. A test checks that every focus point stays inside the room.

### Changing the copy

Everything the game says is in `src/config/content.ts`. The facts stick to what's visible in the scan and the reference photos, plus Jewel's announced album and tour, *Ecosystem* (from jewelowusu.com). A test fails if any placeholder wording slips back in.

## Scan inspection report

`public/models/rehearsal-room.glb` is the original Polycam export, unmodified.

| Check | Result |
| --- | --- |
| File size | 4.89 MB |
| Structure | 1 scene → 1 group → **2 meshes**, 2 materials, no names, no transforms |
| Polygons | 80,020 + 23,487 = **103,507 triangles** (45,749 + 13,705 vertices) |
| Attributes | Position + UV only: **no normals**, so it's drawn unlit (`MeshBasicMaterial`). The lighting is baked into the photo textures. |
| Textures | Two JPEGs: 4096×4096 (2.4 MB) and 4096×1152 (0.67 MB) |
| Orientation and scale | Y-up, real metres. Room interior about 3.6 m wide × 2.7 m high × 5.6 m long. Floor at y ≈ −0.37. |
| People | **Included as static geometry.** Mitch (left, with the butterscotch Telecaster), Jewel (right, handheld mic) and Zac on drums (centre) are all baked in and kept as scanned. |
| Selectable objects | None. Equipment, people and room are fused into the two meshes, so every interaction is an invisible box (`HOTSPOTS`). |
| Missing geometry | Holes in the ceiling. A large black, unscanned patch beside the drummer, which is where the red stool stands in the photos. Rough edges on the speaker tops and on the far side of people. |
| Camera start | Just inside the door, `[0, 1.3, 2.3]`, looking at the mural. That matches the reference photos. |

### Model files

`npm run optimize-model` builds two copies from the untouched original:

| File | Textures | Size | Who gets it |
| --- | --- | --- | --- |
| `rehearsal-room.web.glb` | 4096 px WebP, meshopt geometry | 2.3 MB | Everyone (default) |
| `rehearsal-room.mobile.glb` | 2048 px WebP, meshopt geometry | 1.0 MB | Browsers reporting 2 GB of memory or less |
| `rehearsal-room.glb` | Original 4096 px JPEG | 4.9 MB | Only with `?source` |

The renderer caps device pixel ratio at 1.75 and uses no dynamic lights or shadows on the scan. three.js loads in a separate chunk behind the title card.

### Cleaning up the scan

- **Holes.** The black blobs around people were holes: the scanner couldn't see the wall behind each person, so the empty background showed through. A plain box of walls, floor and ceiling in the room's colours now sits just outside the scan (`buildShell` in `src/three/Room.tsx`). A hole shows the wall behind it, and anywhere the scan has real surface still wins.
- **Softness.** A light screen-space sharpen on the scan textures brings back edges on faces, clothes and gear.

## What was approximated

- **Red stool.** The scan missed it, so `src/three/RedStool.tsx` draws a small stool from the reference photos (square seat, splayed legs, about 66 cm) in the unscanned patch. It's the only added model.
- **Lights.** The scan is unlit, so the amp light and the speaker glow in the reveal are additive sprites, and "the room darkens" dims the scan's colour.
- **Hotspot boxes** were measured by raycasting the scan from the default view and checked against the photos. They're good, not survey-accurate. Use `?debug` to fine-tune.
- **Pedalboard.** The real board is one multi-effects unit with a screen. The puzzle gives it three coloured footswitches (Tuner, Drive, Echo) so the order can be solved.

## Worth double-checking

- **The descriptions of each person's gear and seat** come from the photos: Mitch's butterscotch Telecaster and Adidas, the Pearl kit with Zildjian cymbals, the milk crates.
- **The setlist** is a running order ("Run the new Ecosystem songs"), not song titles. Swap in real titles in `SETLIST` if you'd like.
- **Audio.** The game ships with synthesised sounds only. An approved clip for the final moment can be dropped into `public/` and named in `REVEAL_AUDIO_URL` (`src/config/game.ts`).

## Accessibility

- An **Object list** button lists every interactive object, so the whole game can be played without touching the 3D view.
- All puzzles are native buttons. The rhythm pads also take keys 1, 2 and 3.
- Visible focus rings, and Escape backs out of anything.
- Status changes are announced through live regions. The beat is shown with lights as well as sound.
- Motion follows the OS reduced-motion setting by default and can be overridden in Settings. Reduced motion cuts camera moves and stops pulsing.
- There's a sound toggle, and nothing plays before the player taps "Enter the room".

## Tests

`npm test` covers the reducer (no double completion, reset), localStorage round-trips and corrupt data, each puzzle's success and failure states, final-reveal gating, the reveal sequence and reset, the load-error state, the hotspot config (every hotspot has copy, every secret has a hotspot, and every camera focus is inside the room), the absence of placeholder text, and the GLB files themselves.

## Known limitations

- The people are as clean as the scan allows. The scan captured their fronts only, and their faces are soft. Rebuilding them from the reference photos (as cutouts) would need the original image files. Where a person blocked the wall, you now see a plain wall-coloured fill rather than black.
- No first-person walking. This is a constrained orbit by design.
- The tap-versus-drag threshold is 8 px. Very small screens may want it tuned (`TAP_SLOP` in `src/three/Hotspots.tsx`).
