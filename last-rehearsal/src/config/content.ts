// All the words in the game live here, so copy can be changed without
// touching components.
//
// Facts are limited to what's visible in the scan and the reference photos,
// plus Jewel Owusu's announced album and tour (Ecosystem, dates at
// jewelowusu.com). Don't add biographical details the band hasn't given us.

export interface Fact {
  name: string;
  role: string;
  /** What they say when you tap them. */
  line: string;
  fact: string;
  /** Puzzle this character asks for help with, if any. */
  helpWith?: 'pedals' | 'beat';
  helpLabel?: string;
}

export const FACTS: Record<string, Fact> = {
  mitch: {
    name: 'Mitch',
    role: 'Guitarist',
    line: "Something's wrong with my pedals. Can you fix it?",
    fact: 'Plays a butterscotch Telecaster with a black pickguard, straight into the multi-effects board at his feet. Sits on a stack of milk crates, in black-and-white Adidas.',
    helpWith: 'pedals',
    helpLabel: 'Fix the pedals',
  },
  jewel: {
    name: 'Jewel Owusu',
    role: 'Singer',
    line: "I'm ready when they are. Can you get this lot sorted?",
    fact: "Jewel's album Ecosystem is on its way, and so is the Ecosystem tour. Dates are at jewelowusu.com.",
  },
  drummer: {
    name: 'Zac',
    role: 'Drummer',
    line: "I've played it a hundred times and now it's gone. How does the beat go again?",
    fact: 'Keeps time from behind a sparkle-finish Pearl kit with Zildjian cymbals, right under the cowboy skeleton.',
    helpWith: 'beat',
    helpLabel: 'Help with the beat',
  },
};

export interface Secret {
  title: string;
  body: string;
}

// Optional discoveries. None of them block completion.
export const SECRETS: Record<string, Secret> = {
  'mural-eyes': {
    title: 'The cowboy is watching',
    body: "Stare into the skull's red eyes long enough and they stare back. Every band needs someone keeping an eye on the tempo.",
  },
  'mural-arrow': {
    title: 'Arrow through the hat',
    body: "Look up. There's an arrow straight through the cowboy's hat, feathers and all, and he's still grinning.",
  },
  cactus: {
    title: 'Desert cacti',
    body: "Painted cacti run along the bottom of the mural. Nothing else in this room is that low-maintenance.",
  },
  stool: {
    title: 'The red stool',
    body: "The only proper seat in the room. Mitch and Jewel are both on milk crates, and the stool's just sitting there empty.",
  },
  mic: {
    title: "Jewel's microphone",
    body: 'Handheld, on a bright red cable, no stand needed. Catch the real thing on the Ecosystem tour.',
  },
  guitar: {
    title: "Mitch's guitar",
    body: 'A butterscotch Telecaster with a black pickguard and a well-played maple neck. Classic for a reason.',
  },
  laptop: {
    title: 'The laptop',
    body: "Open on a crate beside Mitch, with a recording session on the screen. Somebody's capturing tonight.",
  },
  backpack: {
    title: 'Backpack on the kick drum',
    body: "Leaning right against the bass drum. It's one way to dampen a kick.",
  },
  'black-bag': {
    title: 'Bag in the corner',
    body: "A black bag tucked into the back corner. Whatever's in it, it isn't the setlist. You checked.",
  },
  'ceiling-light': {
    title: 'The one light',
    body: 'One downlight for the whole room. Every bit of this scan was captured under it.',
  },
  sockets: {
    title: 'Power points',
    body: "Every power point in the room is spoken for. Unplug the wrong one and Mitch's sound goes with it.",
  },
  crates: {
    title: 'Milk crates',
    body: "Jewel's seat, Mitch's seat, the mixer stand and the laptop desk. If it holds something up in here, it's a milk crate.",
  },
  notebook: {
    title: "Jewel's notes",
    body: "A phone and a pale-blue notebook on the floor by Jewel's crate. Could be lyrics. Could be a shopping list. Jewel's not saying.",
  },
  'checked-bag': {
    title: 'Checked bag',
    body: 'A gingham tote slumped against the wall, keeping the yellow plush company.',
  },
  bottle: {
    title: 'Water bottle',
    body: "Pink, and within arm's reach of the singer. Hydration is track zero.",
  },
  plush: {
    title: 'Yellow plush',
    body: "A big yellow plush with goggle eyes, parked by the wall. The band's unofficial mascot.",
  },
  'cymbal-bag': {
    title: 'Cymbal bag',
    body: "A Zildjian cymbal bag. The cymbals are already on the kit, so the bag's just here for moral support.",
  },
};

export const MESSAGES: Record<string, string> = {
  mural:
    "A cowboy skeleton with I WALK THE LINE painted across his hat, watching over every rehearsal. There's more to find in it: try the eyes, the arrow and the cacti.",
  speaker: "Two speakers mounted either side of the mural. Silent until the band's ready.",
  speakerLive: 'Humming, warm and ready to go.',
  mixer: "A small mixer on a stack of milk crates, with a little red light waiting for Mitch's signal.",
  mixerLive: "Mitch's channel is lit. Sounding good.",
};

export const STORY = {
  title: 'The Last Rehearsal',
  intro: "Rehearsal starts in five minutes. Nothing's ready.",
  brief:
    "Mitch's pedals aren't working, the setlist has disappeared and Zac can't remember the beat. Sort all three to start the last rehearsal.",
  finalLine: "Alright. Let's do this.",
  finalSpeaker: 'Jewel',
  complete: 'Rehearsal complete.',
  completeBody: 'Mitch is plugged in, the setlist is taped down and the beat is back. Next stop: the Ecosystem tour.',
};

export const TASKS = [
  { id: 'sound', label: 'Fix the sound', hint: "Mitch's pedals, on the floor by his feet." },
  { id: 'setlist', label: 'Find the setlist', hint: 'Somewhere in the pizza boxes.' },
  { id: 'beat', label: 'Find the beat', hint: "Zac's drum kit, in the middle." },
] as const;

/** The recovered setlist: tonight's running order, not song titles. */
export const SETLIST = {
  heading: 'Tonight',
  items: [
    'Line check: everybody',
    'Run the new Ecosystem songs',
    'The slow one (Jewel picks)',
    "Last song: whatever's still in tune",
  ],
};
