/* HOUSE OF SECRETS — campaign config
 *
 * Everything that changes between campaigns lives here. Swap the example
 * cities for approved tour destinations without touching the game logic.
 *
 * ⚠ Anything in this file is public once deployed, even if the game hides it.
 *   Only ship real cities and dates after they're cleared for release.
 */
window.HOUSE_CONFIG = {
  // Where the final doorway sends people.
  signupUrl: "https://example.com/signup",
  signupLabel: "Sign up for updates",

  // The four-digit code: hidden under the rabbit hat, needed for the drawer and the door.
  code: "1975",

  // Bump the version to wipe everyone's saved progress for a new campaign.
  storageKey: "house-of-secrets:v1",

  // The three location puzzles. Keys are the objects that hold them.
  //   name     shown once solved (and on the reveal screen)
  //   answers  accepted guesses; case, spaces, accents and punctuation are ignored
  //   art      a built-in landmark from js/landmarks.js ("flinders", "opera", "story")
  //   image    optional: a path to your own image, used instead of `art`
  //   crop     photograph only: [x, y, w, h] close-up of `image`, in percent (built-in art has its own)
  //   hint     offered after a few wrong guesses
  cities: {
    tv: {
      label: "City 01",
      name: "Melbourne",
      answers: ["melbourne", "melb", "naarm"],
      landmark: "Flinders Street Station",
      art: "flinders",
      hint: "Meet me under the clocks. Yellow stone, a green dome, trams outside.",
    },
    photo: {
      label: "City 02",
      name: "Sydney",
      answers: ["sydney", "syd", "warrane"],
      landmark: "Sydney Opera House",
      art: "opera",
      backNote: ["we've played", "by this water before.", "", "step back from the frame."],
      hint: "Sails on a harbour, and a coathanger bridge in the distance.",
    },
    drawer: {
      label: "City 03",
      name: "Brisbane",
      answers: ["brisbane", "brissie", "brissy", "bris", "meanjin"],
      landmark: "Story Bridge",
      art: "story",
      hint: "A steel cantilever bridge over a river city in Queensland.",
    },
  },
};
