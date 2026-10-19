// Prototype colours inspired by the tour references. Not sampled from approved artwork.
export const PALETTE = {
  pink: "#ED4E85",
  orange: "#F17B43",
  yellow: "#F8CE4E",
  blue: "#45B9D4",
  green: "#5CAB66",
  ink: "#0E0E0E",
  paper: "#F4F0E6",
} as const;

/** Top-to-bottom colour bands used inside the stencil letters. */
export const BAND_STOPS = [PALETTE.pink, PALETTE.orange, PALETTE.yellow, PALETTE.blue, PALETTE.green];
