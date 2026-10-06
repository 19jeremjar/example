# The Avalanches: On Air

A pocket-sized retro mixtape player. The whole site is one big early-2000s iPod that plays YouTube mixtapes on its screen.

No build step: it's plain HTML, CSS and JavaScript.

```
index.html       page + iPod markup
styles.css       all styling
js/mixtapes.js   ← the mixtape list (edit titles here)
js/app.js        player logic
favicon.svg
```

## Editing the mixtapes

Open `js/mixtapes.js` and change the `title` values. You can also add, remove or reorder entries. `youtubeId` is the part after `watch?v=` in a YouTube URL. The menu shows mixtapes in the order they're listed.

The song name on the screen is taken from YouTube automatically, with tags like "(Official Audio)" removed. To set it yourself, add `track: "Song name"` to an entry.

## Running locally

Serve the folder with any static server, for example:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` straight from disk (`file://`) works, but YouTube embeds behave best over `http(s)`.

## Controls

| Control | Action |
| --- | --- |
| MENU (top of wheel) / `M` | Open or close the mixtape list |
| ⏮ / ⏭ or `←` / `→` | Previous / next mixtape |
| ▶❚❚ (bottom of wheel) / `Space` | Play / pause |
| Centre button / `Enter` | In the menu: choose the highlighted mixtape. Otherwise: play/pause |
| Spin the wheel / `↑` `↓` | Move through the menu; in now playing, scrub ±15s |
| SHUFFLE / `S` | Jump to a random mixtape (never the current one) and play it |

## Behaviour

- Choosing a mixtape from the menu, or skipping, only loads it; press Play to start. If something is already playing, the music carries on. To change this, set `KEEP_PLAYING_ON_CHANGE` in `js/app.js`.
- Shuffle picks a new mixtape at random each time, using `crypto.getRandomValues`. It never re-picks the current one, and it starts playing straight away. If the browser blocks sound, it plays muted and the screen says "tap ▶ for sound".
- YouTube's own title bar, logo and pause screen are kept out of view. The iframe is cropped, and the iPod shows its own screen while a mixtape is paused.
- The visualiser is simulated, because YouTube doesn't let the page read its audio. Each mixtape gets its own tempo.
- The YouTube player only loads once a mixtape is chosen or Play is pressed. It uses the `youtube-nocookie.com` embed host.
- If a video can't be embedded, the screen shows a "Watch on YouTube" link instead.
- The last selected mixtape is saved in `localStorage` and restored on the next visit.
- When a mixtape finishes, the next one starts automatically.

## Deploying

It's a static site, so you can deploy the repo root to Vercel, Netlify or GitHub Pages as-is.
