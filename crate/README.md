# Secret Sounds Discovery Crate

> Pull a record. Find something new.

A mobile-first, single-page discovery experience. Tap **Shuffle the Crate**, a sleeve flicks out of the crate onto the turntable, and the fan gets one track from the lineup with a Spotify link and an artist-specific ticket link.

It's a static site with no build step, served at `/crate/`.

```
crate/index.html     page markup
crate/styles.css     all styling (flat crate, sleeves, turntable)
crate/app.js         shuffle logic, animation, analytics, lineup drawer
crate/records.json   ← artists and records: edit content here
```

## Editing the crate (`records.json`)

**Artists**

| Field | Description |
| --- | --- |
| `id` | Key used by records |
| `name` | Display name |
| `weight` | The artist's share of the crate (45 / 15 / 15 / 15 / 10 by default) |
| `cities` | Cities the artist plays: `brisbane`, `melbourne`, `sydney` |
| `note` | One line shown in the lineup drawer |
| `tickets` | `{ "default": url }`, optionally with per-city overrides, e.g. `"sydney": url` |

**Records**

| Field | Description |
| --- | --- |
| `artist` | Artist `id` |
| `track` | Approved track title |
| `line` | Editorial line, max 12 words |
| `spotifyUrl` | Direct track URL (`https://open.spotify.com/track/…`). **If empty, the button opens a Spotify search for the song.** |
| `image` | Path or URL to approved sleeve art. If empty, an illustrated placeholder sleeve is drawn from `sleeve` |
| `sleeve` | Placeholder sleeve: `bg`, `fg` colours and `pattern` (`rings`, `stripes`, `split`, `sun`, `grid`, `dots`, `bars`, `circle`) |
| `weight` | Optional, default 1. Weights a record within its artist's share |
| `cities` | Optional, overrides the artist's cities |

## Behaviour

- **Weighting**: the artist is chosen by `weight`, then a record from that artist (by record `weight`).
- **No repeats**: records already pulled this session (`sessionStorage`) are skipped until the whole crate has been heard, then it resets without repeating the current record.
- **City**: `?city=sydney|melbourne|brisbane` limits the crate, the lineup and the ticket links to that city. Use the Sydney param on links from the Sydney event page so Beck (Sydney only) appears there and nowhere else. With no `city` param, the whole lineup is in the crate.
- **Reduced motion**: with `prefers-reduced-motion`, the record lands instantly with no flick, fly or spin.

## Analytics

Every event is pushed to `window.dataLayer` with `artist`, `track`, `record_id`, `city`, `device_type`, `campaign_source` (`utm_source`, or the referrer host, or `direct`), `campaign_medium` and `campaign_name`:

`discovery_crate_opened`, `shuffle_clicked`, `record_revealed`, `spotify_clicked`, `ticket_clicked`, `shuffle_again_clicked`, `lineup_viewed`

Paste the GTM container snippet into `index.html` (there's a marked spot in `<head>`), then set up GA4 and the paid-media pixels inside GTM using custom-event triggers.

## Before launch

- [ ] Replace the Spotify search fallbacks with direct track URLs (`spotifyUrl`).
- [ ] Add approved sleeve art (`image`) and get the tracks and editorial lines approved by artists/management.
- [ ] Confirm ticket URLs. The Strokes, Courtney Barnett, Promiseland and Beck all point to the Secret Sounds Strokes tour page. **Death Cab for Cutie** aren't on the Strokes bill (they have their own Nov 2026 tour), so their link is the general Secret Sounds events page. Confirm whether they should stay in the crate.
- [ ] Promiseland has two records (*Take Down the House*, *3D Flower*). The PRD's *Bad Days* couldn't be verified, so add more once approved.
- [ ] Add the GTM snippet.

## Running locally

`records.json` is fetched, so serve over http:

```sh
python3 -m http.server 8000
# open http://localhost:8000/crate/
```
