# Together, Together: interactive photomosaic (MVP prototype)

A mobile-first mosaic of fan photos. Zoomed out, it's the official **TOGETHER, TOGETHER**
wordmarks: the black linework from the tour artwork, with the sticker filled by a colour mosaic
(red → orange on the top word, green → blue on the bottom). The background is white by default;
the swatch button switches it between white and the poster colours (green, red, orange, blue). Zoom in and each tile becomes a
Polaroid of a moment from the show, framed in the colour of its spot in the artwork.

The wordmarks are vector paths extracted from the supplied tour PSD (the "Together Logos"
smart object) into `src/config/togetherLogo.ts`. The sample photos are drawn procedurally in the
browser, and uploads stay on the device.

## Look and feel

Every screen borrows the tour poster's language: two-line corner labels, solid ink boxes with
white type (the city/date boxes), white boxes with spread-out letters (the guest boxes), the
sticker wordmarks themselves, and a hand-lettered aside. That aside is set in Reenie Beanie
(Google Fonts) as a stand-in for the poster's hand lettering. The copy leans on the idea of the
night being shared: "with very special guest: Y O U", "Put it together", "Moments shared
together". A square ink "+" button (add your photo) sits centred in the space between the two words
(measured from the artwork), where the headliner sits on the poster. Once you zoom in, an
ADD YOUR PHOTO button docks to the corner (from about 2.4× zoom, roughly where photos start to
show).

Every visit opens with a small welcome card along the bottom ("Welcome to the Together Wall").
It closes with its cross, or by itself after 10 seconds, and is skipped when someone arrives on a
shared photo link.

### Share to story

After a photo is added, a "You're on the Together Wall · SHARE" card appears (and the fan's photo
view has SHARE TO YOUR STORY). It makes a 1080×1920 poster-style image and opens the phone's
share sheet, which includes Instagram Stories. Browsers that can't share files (mostly desktop)
save the image instead. The image is prepared as soon as the card appears, because Safari only
allows sharing straight from a tap.

## Run it

```sh
cd together
npm install
npm run dev          # http://localhost:5173/
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript only |

Add `?debug` to a show URL for an overlay with zoom, tile size, render time and image-request counts.

## Routes

There's one live mosaic for the whole tour (every fan, every night, one picture).

| Route | Purpose |
| --- | --- |
| `/` | The mosaic |
| `/photo/123` | Deep link: flies to photo #123 and opens it |
| `/photo/7` | Demo of a removed photo (graceful "unavailable" state) |

Older `/show/<id>` and `/show/<id>/photo/<id>` links still open the mosaic. Photos #11 and #404
deliberately fail to load, to show how image errors are handled.

## How it works

```
src/
  config/shows.ts        show list, grid size, seeds, stencil choice, upload limits
  config/palette.ts      prototype colours
  mosaic/stencil.ts      artwork → per-tile mask (letter / outline / ground)
  mosaic/generate.ts     deterministic tiles, colours, sample photo placement, fill order
  mosaic/camera.ts       camera maths: fit, clamp, zoom-around-point, culling, hit testing
  mosaic/lod.ts          zoom thresholds (projected tile size + PRD multiples)
  mosaic/renderer.ts     Canvas 2D renderer
  mosaic/gestures.ts     pointer/touch/wheel: pan, pinch, double-tap, fling
  mosaic/imageCache.ts   LRU image cache with request queue and eviction
  mosaic/imageLoader.ts  loads blob/CDN URLs; draws sample photos in a Web Worker
  components/            React UI: MosaicView, ShowPage, PhotoDetail, UploadSheet
```

- **One canvas, no image elements.** A fine 150 × 160 grid. Only the ~4,800 tiles that show
  through the sticker (not hidden under the linework) hold photos.
- **Crisp at every zoom.** The sticker shape and the linework are filled as vector paths every
  frame, and the tiles are clipped to the sticker. Nothing follows the tile grid, so nothing
  looks pixelated.
- **Artwork view (1.0×–1.8×).** The mosaic is one baked bitmap, clipped to the sticker. Each tile
  is a 6 px mini Polaroid (a hint of white gap, a coloured frame, a darker "photo" centre), so you
  can make out the mosaic from a distance without loading any photos. That's a few draw calls per frame and **zero photo requests**. Check the `img req`
  counter with `?debug`.
- **Transition (1.8×–2.5×).** Photos fade in once tiles are at least 22 px on screen *and* past
  1.8× of the fitted view. They're fully revealed at 44 px and 2.5×. Only tiles in the viewport,
  plus a one-tile buffer, are drawn or requested.
- **Polaroid view.** Frames with a thicker bottom edge appear with the photos, coloured to match
  the tile's place in the artwork, with thin white gaps between them. A light overlay in the tile
  colour keeps the artwork readable, and fades further at high zoom.
  Above ~150 px tiles get a caption, and large tiles switch from 96 px thumbnails to 256 px images.
- **Detail view.** Opens a 1080 px image, the only place a full-size asset is loaded. The mosaic
  stays mounted underneath, so closing it leaves the camera exactly where it was.
- **Memory.** The cache holds at most 500 images (LRU). Requests for tiles that leave the
  viewport before loading are dropped.

### Simulated upload

ADD YOUR PHOTO → take a photo or choose from the library → square crop (drag, pinch or slider) →
the photo is resized in the browser to 1080/256/96 px and kept as temporary `blob:` URLs. It
takes the next free tile in the letters, and the camera flies there and highlights it.
Nothing is sent anywhere. Demo photos vanish on reload and can be removed with
"Remove my demo photos". They don't get share links.

Validation: JPG, PNG or WebP, up to 10 MB (`UPLOAD` in `config/shows.ts`). HEIC is rejected
with a clear message.

## Artwork

`src/config/togetherLogo.ts` holds the official wordmarks as vector paths: the two white sticker
silhouettes and the dark linework. To update them from a new PSD, extract the vector smart object
(it's an Illustrator/PDF file), convert it to SVG, and regenerate the file: white-filled paths go
in `sticker` and dark ones in `lines`.

Each show sets its own artwork and word gradients in `src/config/shows.ts`:

```ts
stencil: { kind: "vector", art: TOGETHER_LOGO, pull: 72 }, // pull: move the words closer
wordGradients: [[POSTER.red, POSTER.orange], [POSTER.green, POSTER.blue]],
```

`{ kind: "image", url }` (a transparent SVG/PNG) and the generic `placeholder-arcs` still work
for other artwork.

## Deploying (Vercel)

Create a Vercel project from this repo with **Root Directory** set to `together`. The framework
preset is Vite. `vercel.json` rewrites every path to `index.html` so deep links work.

## Not in this prototype

No backend, database, accounts, moderation, live updates or real uploads. No fan photos should
be collected publicly until storage, consent, moderation, reporting/removal and retention are in
place (see the PRD).

Performance was checked in headless Chromium. Zoom and pan held a median of 60 fps, and the
renderer took ~2 ms per frame. Profile on real phones before launch.
