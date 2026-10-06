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
//                (for reference / refreshing — not used by the player)
//
//  To re-import a playlist, open  /api/playlist?list=PLAYLIST_ID  on the
//  deployed site and copy the videos across.
// ─────────────────────────────────────────────────────────────
const folders = [
  {
    title: "Since I Left You (Deluxe)",
    playlist: "PL3iF2GMTLe0X3CUqN8_XLwz-U5ifL2fSw",
    tracks: [
      { title: "Tonight May Have To Last Me All My Life (MF DOOM Remix)", youtubeId: "LfRy0l9WHlc" },
      { title: "Stay Another Season", youtubeId: "-Be5fSzRqpI" },
      { title: "Radio", youtubeId: "6dajlqL8NCc" },
      { title: "Two Hearts In 3/4 Time", youtubeId: "NLglw43AUkE" },
      { title: "Avalanche Rock", youtubeId: "dgbrP281k3Q" },
      { title: "Flight Tonight", youtubeId: "vFKSMlwV0bY" },
      { title: "Close To You", youtubeId: "45OveojGZwE" },
      { title: "Diners Only", youtubeId: "CtsZhMEmBEk" },
      { title: "A Different Feeling", youtubeId: "tjG-PRfk11U" },
      { title: "Electricity", youtubeId: "uPeQ9eP_FgY" },
      { title: "Tonight May Have To Last Me All My Life", youtubeId: "shgjHLdP_eo" },
      { title: "Pablo's Cruise", youtubeId: "7rfxZ5IJQxg" },
      { title: "Frontier Psychiatrist", youtubeId: "eS3AZ12xf6s" },
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
    playlist: "PL3iF2GMTLe0U3rr0MFjK_tK7jB1-DWtMl",
    tracks: [
      { title: "The Divine Chord ft. MGMT, Johnny Marr", youtubeId: "TvZpn322LxE" },
      { title: "Interstellar Love ft. Leon Bridges", youtubeId: "NxC0nhAKwXs" },
      { title: "Take Care In Your Dreaming ft. Denzel Curry, Tricky, Sampa The Great", youtubeId: "8yTtE-B7NpM" },
      { title: "Music Makes Me High", youtubeId: "bdvxzc7FLow" },
      { title: "Wherever You Go ft. Jamie xx, Neneh Cherry, CLYPSO", youtubeId: "939w8RwaLSY" },
      { title: "Reflecting Light ft. Sananda Maitreya, Vashti Bunyan", youtubeId: "GAPlnoeEcH0" },
      { title: "Running Red Lights ft. Rivers Cuomo, Pink Siifu", youtubeId: "nsjQ3Gblzys" },
      { title: "We Will Always Love You (feat. Blood Orange)", youtubeId: "GUhVBufwQQY" },
    ]
  },
  {
    title: "Subways & Remixes",
    playlist: "PL3iF2GMTLe0UdeVobWkNdWCHwiXgxhyMp",
    tracks: [
      { title: "Subways", youtubeId: "bPIMfOIuEe4" },
      { title: "Subways (Arthur Baker Remix)", youtubeId: "OmAOG9TMvPw" },
      { title: "Subways (In Flagranti Extended Edit)", youtubeId: "ZcT0Q2tRnvs" },
    ]
  },
  {
    title: "DJ Sets",
    playlist: "PL853131A0F00E7EFF",
    tracks: [
      { title: "The Avalanches & Jamie XX - B2B DJ Set on NTS Radio - 15.05.20", youtubeId: "qeqBdr41AMQ" },
      { title: "BBC Radio 1 Essential Mix 2016 - The Avalanches", youtubeId: "ycFxOhLZYFw" },
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
      { title: "Since I Left You", youtubeId: "wpqm-05R2Jk" },
      { title: "Frontier Psychiatrist", youtubeId: "qLrnkK2YEcE" },
      { title: "Far Away ft. John Glacier, Khadija Al Hanafi", youtubeId: "Ss5TsheqV-U" },
      { title: "Because I'm Me", youtubeId: "eu0KsZ_MVBc" },
    ]
  }
];
