# The 1975 — House of Secrets

A point-and-click mystery set in a 2D version of the *At Their Very Best* stage house: a white set against black, with a spiral staircase, shuttered windows, a stack of vintage TVs and the pitched-roof room. Fans investigate five objects, solve three location puzzles, find the code and power up the band's glowing rectangle. The rectangle then opens onto the signup link.

> You've seen the house. Now find out what's inside.

There's no build step: it's plain HTML, CSS and JavaScript, like the rest of this repo.

```
index.html        page, plus the illustrated room (one inline SVG with clickable layers)
img/              The 1975 logo, white and black versions
styles.css        all styling
js/config.js      ← cities, answers, code, signup link (edit here)
js/landmarks.js   built-in landmark illustrations
js/sfx.js         analogue sound effects, synthesised with Web Audio (no audio files)
js/game.js        game logic
```

## How it plays (about 3–5 minutes)

| # | Object | Reference | What you do | Unlocks |
| --- | --- | --- | --- | --- |
| 01 | Television stack | The Consumption interlude | Power on the wood-grain console, change channels, fine-tune until the picture locks | City 01 |
| 02 | Framed photograph | 2013 monochrome, the rectangle | Take it down, rotate it upright, read the back, then step back from the frame | City 02 |
| 03 | Cabinet drawer | Hidden notes and archives | Open the combination lock, then drag three torn fragments together | City 03 |
| 04 | Rabbit hat | *Sincerity Is Scary* | Lift it to find the folded note with **1 9 7 5** | Code for the drawer and the door |
| 05 | The rectangle | The box | Its outline lights a third at a time as cities are found. With all three, the keypad below it wakes up | Reveal and signup |

The clues are linked, as in Crimson Room: the hat gives the code, the code opens the drawer, and the drawer holds the last city. There are also three optional secrets: the clock with only 1, 9, 7 and 5 on its face, the *La poésie est dans la rue* card, and the floor lamp.

Other features:
- A clue tracker under the room shows the code, the three cities and the secrets found.
- **Hint** gives the next step and makes that object pulse.
- After three wrong guesses on a city, its hint from the config appears.
- Progress is saved in `localStorage`. **Restart** clears it.
- On phones the room is shown at twice the screen width. Swipe or use ‹ › to move between three views; the middle one shows the whole rectangle. Inspect windows open as bottom sheets.
- Every object can be opened with the keyboard. Puzzle fragments can be placed by pressing Enter.

## Changing the cities

Everything campaign-specific is in `js/config.js`:

- `cities.tv`, `cities.photo` and `cities.drawer` each have a `name`, the accepted `answers` and a `hint`.
- Case, spaces, accents and punctuation are ignored when guesses are checked.
- Each city uses a built-in drawing (`art: "flinders" | "opera" | "story"`). Set `image: "img/your-photo.jpg"` to use your own picture instead.
- For the photograph, `crop: [x, y, w, h]` (in percent) sets the starting close-up.
- `code` is the four-digit code. `signupUrl` is where the rectangle sends people.
- Change `storageKey` to reset everyone's saved progress for a new campaign.

The cities in the config are **examples only**, not confirmed tour locations.

> ⚠ Don't put unannounced cities or dates in a public build. Anything shipped to the browser can be read with view-source, even if the game keeps it hidden.

## Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/house-of-secrets/  (from the repo root)
```

## Credits and references

- Gameplay reference: *Crimson Room* (Toshimitsu Takagi, 2004).
- World: the *At Their Very Best* house, designed by Tobias Rylander.
- Type: the band's serif logo (`img/`), EB Garamond for text, and an extended italic sans for the 75 ident on channel 2.
- This is an unofficial concept prototype. Apart from the logo, all artwork is original vector illustration. Confirm logo use with the band's team before a public launch.
