// ─────────────────────────────────────────────────────────────
//  THE AVALANCHES: ON AIR — library
//
//  Folders appear in the iPod menu in this order; tracks inside a
//  folder play in this order (Previous / Next stay within a folder,
//  Shuffle picks from everything).
//
//  • title     – what the iPod shows. Edit freely.
//  • youtubeId – the part after "watch?v=" in a YouTube link
//  • playlist  – the YouTube playlist the folder was imported from
//                (for reference / refreshing; not used by the player)
//  • facts     – "Did you know?" pop-ups. On a folder they're about the
//                album; on a track they're about that song (shown first).
//                Tracks with neither use the artistFacts at the bottom.
//
//  To re-import a playlist, open  /api/playlist?list=PLAYLIST_ID  on the
//  deployed site and copy the videos across.
// ─────────────────────────────────────────────────────────────
const folders = [
  {
    title: "Since I Left You (Deluxe)",
    facts: [
      "Released in 2000, Since I Left You became a defining record of sample-based electronic music.",
      "Since I Left You is commonly reported to contain more than 3,500 samples.",
      "Since I Left You was originally imagined as a loose love story travelling through different musical worlds.",
      "The 20th Anniversary edition of Since I Left You expands the original 18-track album into 33 tracks, with remixes from MF DOOM, Cornelius, Stereolab, Sinkane and Carl Craig.",
    ],
    playlist: "PL3iF2GMTLe0X3CUqN8_XLwz-U5ifL2fSw",
    tracks: [
      { title: "Tonight May Have To Last Me All My Life (MF DOOM Remix)", youtubeId: "LfRy0l9WHlc" },
      { title: "Stay Another Season", youtubeId: "-Be5fSzRqpI", facts: ["Stay Another Season's use of Madonna's “Holiday” began as a joke, but the band loved it too much to leave out."] },
      { title: "Radio", youtubeId: "6dajlqL8NCc" },
      { title: "Two Hearts In 3/4 Time", youtubeId: "NLglw43AUkE" },
      { title: "Avalanche Rock", youtubeId: "dgbrP281k3Q" },
      { title: "Flight Tonight", youtubeId: "vFKSMlwV0bY" },
      { title: "Close To You", youtubeId: "45OveojGZwE" },
      { title: "Diners Only", youtubeId: "CtsZhMEmBEk" },
      { title: "A Different Feeling", youtubeId: "tjG-PRfk11U" },
      { title: "Electricity", youtubeId: "uPeQ9eP_FgY", facts: ["Electricity was one of the first tracks where the band felt their sound truly clicked, and it was added late in the making of the album."] },
      { title: "Tonight May Have To Last Me All My Life", youtubeId: "shgjHLdP_eo" },
      { title: "Pablo's Cruise", youtubeId: "7rfxZ5IJQxg" },
      { title: "Frontier Psychiatrist", youtubeId: "eS3AZ12xf6s", facts: ["The famous parrot sound in Frontier Psychiatrist is actually a woman doing an imitation of a parrot, not a real bird."] },
      { title: "ETOH", youtubeId: "QDasjmCz1do" },
      { title: "Summer Crane", youtubeId: "twD_3iQ-ypQ" },
      { title: "Little Journey", youtubeId: "WiC8dPc4wgU" },
      { title: "Live At Dominoes", youtubeId: "CRVSuE61nA0" },
      { title: "Extra Kings", youtubeId: "JSiwmjH_p8E" },
      { title: "Since I Left You (Cornelius Remix)", youtubeId: "i9vwNEr0Ipo" },
      { title: "Tonight May Have To Last Me All My Life (Edan Remix)", youtubeId: "cgcNZFEbroE" },
      { title: "Frontier Psychiatrist (Mario Caldato Jr's 85% Remix)", youtubeId: "Hv8J_mpHTDo" },
      { title: "Close To You (Sun Araw Remix)", youtubeId: "HQ8z442xn7M" },
      { title: "Since I Left You (Stereolab Remix)", youtubeId: "cVpeYfRZ6mY" },
      { title: "Flight Tonight (Canyons Travel Agent Dub)", youtubeId: "_IH3TiV4Iqg" },
      { title: "Radio (Sinkane Remix)", youtubeId: "R3IXeOahJU8" },
      { title: "Since I Left You (Prince Paul Remix)", youtubeId: "zfK5w16KleA" },
      { title: "Electricity (Harvey's Nightclub Re-Edit)", youtubeId: "SrgRWnTrUjE" },
      { title: "Summer Crane (Black Dice Remix)", youtubeId: "InlRuk4a1Js" },
      { title: "Extra Kings (Deakin Remix)", youtubeId: "Cp7GRnwxgR0" },
      { title: "Tonight May Have To Last Me All My Life (Dragged By Leon Vynehall)", youtubeId: "FcHxr4XhQkA" },
      { title: "A Different Feeling (Carl Craig's Paperclip People Remix)", youtubeId: "sDEdFd9qn2M" },
      { title: "Thank You Caroline (Original Avalanches Demo Tape)", youtubeId: "XnBlbPaE5hM" },
    ]
  },
  {
    title: "We Will Always Love You",
    facts: [
      "We Will Always Love You is The Avalanches' third studio album, released in December 2020.",
      "The themes of We Will Always Love You include love, mortality, spirituality, memory and connection beyond death.",
      "We Will Always Love You was partly inspired by the romance between Carl Sagan and Ann Druyan, including the Voyager Golden Record.",
      "We Will Always Love You won the 2020 Australian Music Prize.",
    ],
    playlist: "PL3iF2GMTLe0U3rr0MFjK_tK7jB1-DWtMl",
    tracks: [
      { title: "The Divine Chord ft. MGMT, Johnny Marr", youtubeId: "TvZpn322LxE", facts: ["The Divine Chord features MGMT and The Smiths' guitarist Johnny Marr, combining dreamy psych-pop with Avalanches-style emotion."] },
      { title: "Interstellar Love ft. Leon Bridges", youtubeId: "NxC0nhAKwXs", facts: ["On Interstellar Love, Leon Bridges brings a warm, soulful voice to one of the album's most floating, romantic moments."] },
      { title: "Take Care In Your Dreaming ft. Denzel Curry, Tricky, Sampa The Great", youtubeId: "8yTtE-B7NpM", facts: ["Denzel Curry, Tricky and Sampa The Great all appear on Take Care In Your Dreaming, making it one of the album's boldest collaborations."] },
      { title: "Music Makes Me High", youtubeId: "bdvxzc7FLow" },
      { title: "Wherever You Go ft. Jamie xx, Neneh Cherry, CLYPSO", youtubeId: "939w8RwaLSY" },
      { title: "Reflecting Light ft. Sananda Maitreya, Vashti Bunyan", youtubeId: "GAPlnoeEcH0" },
      { title: "Running Red Lights ft. Rivers Cuomo, Pink Siifu", youtubeId: "nsjQ3Gblzys", facts: ["Running Red Lights brings together Weezer's Rivers Cuomo and rapper Pink Siifu."] },
      { title: "We Will Always Love You (feat. Blood Orange)", youtubeId: "GUhVBufwQQY", facts: ["We Will Always Love You, the album's title track, features Blood Orange."] },
    ]
  },
  {
    title: "Subways & Remixes",
    facts: [
      "Released in 2016, the Subways remix EP is built around “Subways” from Wildflower.",
      "The Subways remix EP has three tracks and runs for around 19 minutes.",
      "Each Subways remix takes the original into a different late-night direction.",
      "The Subways remixers are In Flagranti, Arthur Baker and Leo James.",
    ],
    playlist: "PL3iF2GMTLe0UdeVobWkNdWCHwiXgxhyMp",
    tracks: [
      { title: "Subways", youtubeId: "bPIMfOIuEe4", facts: ["The original “Subways” came from Wildflower, one of the album's most euphoric, sunlit tracks."] },
      { title: "Subways (Arthur Baker Remix)", youtubeId: "OmAOG9TMvPw", facts: ["This Subways remix is by Arthur Baker, a key figure in the history of electro, hip-hop and dance music."] },
      { title: "Subways (In Flagranti Extended Edit)", youtubeId: "ZcT0Q2tRnvs", facts: ["The In Flagranti Extended Edit is the longest and most disco-facing version, stretching the original into a more nocturnal club track."] },
    ]
  },
  {
    title: "DJ Sets",
    facts: [
      "DJing is central to The Avalanches' identity and came before their global album success.",
      "The Avalanches' DJ sets jump across hip-hop, disco, soul, punk, house, novelty records and strange forgotten pop.",
      "Avalanches DJ sets are usually less about playing their own songs than showing where their ideas and influences come from.",
      "The band's official archive includes their BBC Radio 1 Essential Mix from 2016.",
    ],
    playlist: "PL853131A0F00E7EFF",
    tracks: [
      { title: "The Avalanches & Jamie XX - B2B DJ Set on NTS Radio - 15.05.20", youtubeId: "qeqBdr41AMQ" },
      { title: "BBC Radio 1 Essential Mix 2016 - The Avalanches", youtubeId: "ycFxOhLZYFw", facts: ["This is The Avalanches' BBC Radio 1 Essential Mix from 2016, part of their official archive."] },
      { title: "The Avalanches Summer Sonic'02 DJset Live", youtubeId: "XFj7uYoAudU" },
      { title: "Ray of Zdarlight (2006)", youtubeId: "vWefh5X_39Y" },
      { title: "The Recording Angel on NTS Radio - Episode 1 - The Avalanches - 20.03.24", youtubeId: "UPOblrK0Z6c" },
      { title: "The Recording Angel on NTS - Episode 3 - The Avalanches x DJ Koze - 15.05.24", youtubeId: "8Dk4AUS-ywM" },
    ]
  },
  {
    title: "Extras",
    tracks: [
      { title: "The Leaves Were Falling", youtubeId: "-Y_akY6-Pgc" },
      { title: "Together (Baalti Remix) ft. Nikki Nair, Jessy Lanza, Prentiss", youtubeId: "YQFmByYZbR4" },
      { title: "Since I Left You", youtubeId: "wpqm-05R2Jk", facts: ["The vocal on Since I Left You was one of the last parts to be added. Robbie Chater said it was the moment they felt they had turned the collage into a proper pop song."] },
      { title: "Frontier Psychiatrist", youtubeId: "qLrnkK2YEcE", facts: ["The famous parrot sound in Frontier Psychiatrist is actually a woman doing an imitation of a parrot, not a real bird."] },
      { title: "Far Away ft. John Glacier, Khadija Al Hanafi", youtubeId: "Ss5TsheqV-U" },
      { title: "Because I'm Me", youtubeId: "eu0KsZ_MVBc" },
    ]
  }
];

// General facts about The Avalanches. Shown for tracks that have no song or
// album facts of their own.
const artistFacts = [
  "The Avalanches formed in Melbourne in 1997.",
  "The Avalanches began as a larger group, but Robbie Chater and Tony Di Blasi became the central creative force behind the band's later records.",
  "The Avalanches are best known for building songs from tiny fragments of existing music, dialogue, sound effects and vinyl records, a style often called plunderphonics.",
  "The Avalanches' debut, Since I Left You, is widely reported to contain more than 3,500 samples.",
  "The band's original sound grew out of DJ culture: collecting records, making mixtapes and playing unpredictable, high-energy sets.",
  "Before international fame, The Avalanches ran an infamous monthly Melbourne club night called Brains.",
  "There was a 16-year gap between The Avalanches' first album, Since I Left You (2000), and its follow-up, Wildflower (2016).",
  "The Avalanches' third album, We Will Always Love You, won the 2020 Australian Music Prize.",
  "The Avalanches are known for unlikely guest lists, working with artists including MF DOOM, Danny Brown, Neneh Cherry, Blood Orange, Jamie xx, Johnny Marr, Karen O, Sampa The Great and Denzel Curry.",
  "DJ sets are a huge part of The Avalanches' identity: joyful, chaotic journeys through hip-hop, disco, soul, punk, house and strange forgotten records.",
];
