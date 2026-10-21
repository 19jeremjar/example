/* HOUSE OF SECRETS — campaign config
 *
 * Everything that changes between campaigns lives here: the four songs,
 * their clues and the signup link. The game logic doesn't need touching.
 *
 * ⚠ Anything in this file is public once deployed (view-source shows it).
 */
window.HOUSE_CONFIG = {
  // Where the box sends people once it opens.
  signupUrl: "https://example.com/signup",
  signupLabel: "Sign up for updates",

  // Bump the version to wipe everyone's saved progress.
  storageKey: "house-of-secrets:v2",

  // The four clues, in the order they're numbered in the room.
  // Each object hides one song. Name all four to open the box.
  //   title    the song, shown once it's guessed
  //   answers  accepted guesses; case, spaces and punctuation are ignored
  //   clue     shown in the object's window
  //   hint     offered by the Hint button, or after two wrong guesses
  //   art      a built-in picture from js/art.js ("paris", "city", "chocolate")
  //   image    optional: your own picture, used instead of `art`
  songs: {
    tv: {
      title: "Paris",
      answers: ["paris"],
      art: "paris",
      clue: "Turn on the TV and tune in the picture. The song has the same name as the place you see.",
      hint: "One word. A capital city. It's on I Like It When You Sleep… (2016).",
    },
    photo: {
      title: "The City",
      answers: ["the city", "city"],
      art: "city",
      clue: "Turn the photo upright, then flip it over to read the back.",
      note: ["2013.", "track two.", "named after where", "we're standing."],
      hint: "Two words. Track two on the first album, The 1975 (2013).",
    },
    hat: {
      title: "Sincerity Is Scary",
      answers: ["sincerity is scary", "sincerity"],
      clue: "Lift the hat. The note underneath describes a music video.",
      note: ["a hat with rabbit ears.", "a walk through new york.", "2018."],
      hint: "Three words. It's on A Brief Inquiry into Online Relationships (2018).",
    },
    drawer: {
      title: "Chocolate",
      answers: ["chocolate"],
      art: "chocolate",
      clue: "Open the drawer, then put the torn photo back together.",
      hint: "One word. Something sweet. It's on the first album, The 1975 (2013).",
    },
  },
};
