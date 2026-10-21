# The 1975 — House of Secrets

A point-and-click mystery set in a 2D version of the *At Their Very Best* stage house: a white set against black, with a spiral staircase, shuttered windows, a stack of vintage TVs and the pitched-roof room.

> You've seen the house. Now find out what's inside.

**How it plays (about five minutes):** four clues are hidden around the house, each marked with a number. Each clue points to a song by The 1975. Name all four songs and the box in the middle opens onto the signup link.

There's no build step: it's plain HTML, CSS and JavaScript.

```
index.html     page, plus the illustrated room (one inline SVG with clickable objects)
img/           The 1975 logo, white and black versions
js/config.js   ← the four songs, clues, hints and signup link (edit here)
js/art.js      the clue pictures
js/sfx.js      analogue sound effects, synthesised with Web Audio (no audio files)
js/game.js     game logic
```

## The four clues

| # | Object | What you do | Song |
| --- | --- | --- | --- |
| 1 | Television | Press Power, go to channel 3 and tune until the picture is clear | Paris |
| 2 | Photograph | Rotate it upright, turn it over to read the back, and the whole picture appears | The City |
| 3 | Rabbit hat | Lift it to find a note describing a music video | Sincerity Is Scary |
| 4 | Cabinet drawer | Open it and drag three torn pieces back into a photo | Chocolate |
| | The box | Lights up a quarter at a time. After the fourth song, tap it to open it | — |

Other features:
- Each clue window has the same layout: what to do, the object, then "Which song is it?"
- Guesses ignore case, spaces and punctuation. **Need a hint?** shows the clue's hint, and so do two wrong guesses.
- The numbered markers turn into ticks as songs are found. The tracker under the room lists the songs found so far.
- **Hint** in the top bar points to the next unsolved clue.
- Progress is saved in `localStorage`. **Restart** clears it.
- On phones the room is shown at twice the screen width. Swipe or use ‹ › to move between three views; the middle one shows the whole box. Clue windows open as bottom sheets.
- Every object can be opened with the keyboard. Photo pieces can be placed by pressing Enter.

## Changing the songs

Everything is in `js/config.js`. For each of `tv`, `photo`, `hat` and `drawer`:

- `title`: the song.
- `answers`: accepted guesses.
- `clue`: the instruction at the top of the window.
- `hint`: shown by **Need a hint?**
- `note`: the handwritten lines on the photo's back or under the hat.
- `art`: a built-in picture (`"paris"`, `"city"` or `"chocolate"`). Set `image: "img/your-picture.jpg"` to use your own instead.

Change `storageKey` to reset everyone's saved progress.

> ⚠ Anything in `config.js` is public once deployed, including the answers.

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
