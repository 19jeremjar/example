// All the words in the game live here, so copy can be swapped without
// touching components.
//
// APPROVAL: anything with `approved: false` is placeholder text and shows a
// visible "Placeholder" tag in the game. Replace `text`, set `approved: true`,
// and the tag disappears. Never present an unapproved line as a real fact
// about the band.

export interface Copy {
  text: string;
  approved: boolean;
}

export interface Fact {
  name: string;
  role: string;
  /** What they say when you tap them. */
  line: string;
  fact: Copy;
  /** Puzzle this character asks for help with, if any. */
  helpWith?: 'pedals' | 'beat';
  helpLabel?: string;
}

const placeholder = (text: string): Copy => ({ text, approved: false });

export const FACTS: Record<string, Fact> = {
  mitch: {
    name: 'Mitch',
    role: 'Guitarist',
    line: "Something's wrong with my pedals. Can you fix it?",
    fact: placeholder('Approved fact about Mitch goes here.'),
    helpWith: 'pedals',
    helpLabel: 'Fix the pedals',
  },
  jewel: {
    name: 'Jewel Owusu',
    role: 'Singer',
    line: "I'm ready when they are. Can you get this lot sorted?",
    fact: placeholder('Approved fact about Jewel goes here.'),
  },
  drummer: {
    // The drummer's name is not confirmed. Don't invent one.
    name: 'The drummer',
    role: 'Drums',
    line: "I've played it a hundred times and now it's gone. How does the beat go again?",
    fact: placeholder('Name and approved fact for the drummer go here.'),
    helpWith: 'beat',
    helpLabel: 'Help with the beat',
  },
};

export interface Secret {
  title: string;
  body: Copy;
}

// Optional discoveries. None of them block completion.
export const SECRETS: Record<string, Secret> = {
  'mural-eyes': {
    title: 'The cowboy blinked',
    body: placeholder(
      "You stare into the skull's red eyes. For a second, it stares back. Someone has written 'he sees every wrong note' in pencil under the hat brim.",
    ),
  },
  stool: {
    title: 'The red stool',
    body: placeholder(
      "The red stool. Officially it's for whoever's waiting their turn. Unofficially it's where the setlist usually goes missing.",
    ),
  },
  mic: {
    title: "Jewel's microphone",
    body: placeholder('Approved fact about Jewel and this microphone goes here.'),
  },
  guitar: {
    title: "Mitch's guitar",
    body: placeholder('Approved fact about Mitch and this guitar goes here.'),
  },
  bottle: {
    title: 'Water bottle',
    body: placeholder("Hydration is part of the setlist. It's track zero."),
  },
  plush: {
    title: 'Yellow plush',
    body: placeholder("The band's unofficial fifth member. Has never missed a rehearsal."),
  },
  'cymbal-bag': {
    title: 'Cymbal bag',
    body: placeholder('Zipped shut. Whatever is in here is too loud for this room.'),
  },
};

export const MESSAGES: Record<string, Copy> = {
  mural: placeholder(
    'A cowboy skeleton keeps an eye on every rehearsal. Look closely at those eyes…',
  ),
  speaker: placeholder("Silent for now. They'll wake up when the band is ready."),
  speakerLive: placeholder('Humming. Warm. Ready.'),
  mixer: placeholder('The mixer on the crates. A little red light is waiting for a guitar signal.'),
  mixerLive: placeholder("Mitch's channel is lit up. Sounding good."),
};

export const STORY = {
  title: 'The Last Rehearsal',
  intro: "Rehearsal starts in five minutes. Nothing's ready.",
  brief:
    "Mitch's pedals aren't working, the setlist has disappeared and the drummer can't remember the beat. Sort all three to start the last rehearsal.",
  finalLine: "Alright. Let's do this.",
  finalSpeaker: 'Jewel',
  complete: 'Rehearsal complete.',
};

export const TASKS = [
  { id: 'sound', label: 'Fix the sound', hint: "Mitch's pedals, on the floor by his feet." },
  { id: 'setlist', label: 'Find the setlist', hint: 'Somewhere in the pizza boxes.' },
  { id: 'beat', label: 'Find the beat', hint: 'The drum kit in the middle.' },
] as const;

export interface SetlistEntry {
  title: Copy;
}

// The recovered setlist. Song titles must come from the band. Until then
// these are clearly marked placeholders.
export const SETLIST: SetlistEntry[] = [
  { title: placeholder('Song 1 (title to be confirmed)') },
  { title: placeholder('Song 2 (title to be confirmed)') },
  { title: placeholder('Song 3 (title to be confirmed)') },
  { title: placeholder('Song 4 (title to be confirmed)') },
];
