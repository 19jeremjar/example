// Prototype colours inspired by the tour references. Not sampled from approved artwork.
export const PALETTE = {
  pink: "#ED4E85",
  orange: "#F17B43",
  yellow: "#F8CE4E",
  blue: "#45B9D4",
  green: "#5CAB66",
  ink: "#0E0E0E",
  paper: "#F4F0E6",
  white: "#FFFFFF",
} as const;

/** Background colours sampled from the four tour poster colourways. */
export const POSTER = {
  red: "#EF323C",
  orange: "#F99D27",
  green: "#64AA4A",
  blue: "#0182BF",
  /** The logo's linework colour. */
  ink: "#121C16",
} as const;

export const COLOURWAYS = [
  { name: "Red", value: POSTER.red },
  { name: "Orange", value: POSTER.orange },
  { name: "Green", value: POSTER.green },
  { name: "Blue", value: POSTER.blue },
] as const;

/** Top-to-bottom colour bands used by the placeholder artwork. */
export const BAND_STOPS = [PALETTE.pink, PALETTE.orange, PALETTE.yellow, PALETTE.blue, PALETTE.green];
