import { POSTER } from "./palette";
import { TOGETHER_LOGO } from "./togetherLogo";

export type StencilConfig =
  /** Official artwork as vector paths: sticker silhouettes hold the mosaic, linework sits on top. */
  | { kind: "vector"; art: typeof TOGETHER_LOGO; /** Moves the two words this many art units closer. */ pull?: number }
  /** Generic placeholder: text set along two arcs in a system font. Replace with the official asset. */
  | { kind: "placeholder-arcs"; text: string }
  /** Transparent SVG/PNG whose alpha channel marks the artwork (e.g. the official wordmarks). */
  | { kind: "image"; url: string };

export type ShowConfig = {
  id: string;
  /** Two-part label for the header corner and photo captions, e.g. "TOUR · 2026". */
  label: string;
  cols: number;
  rows: number;
  seed: number;
  /** Share of the artwork's tiles that start with a sample photo (0–1). */
  sampleFill: number;
  stencil: StencilConfig;
  /** Colour gradient for each word of the artwork, top to bottom, running left to right. */
  wordGradients: [string, string][];
  /** Sample photos that were "removed by moderation" — used to demo the unavailable state. */
  removedPhotoIds: string[];
  /** Sample photos whose image fails to load — used to demo error handling. */
  brokenPhotoIds: string[];
};

/**
 * One live mosaic for the whole tour: every fan, every night, in one picture. The data model
 * still supports several mosaics (e.g. per city) if that's wanted later.
 */
export const SHOWS: ShowConfig[] = [
  {
    id: "together",
    label: "TOUR · 2026",
    cols: 150,
    rows: 160,
    seed: 20260101,
    sampleFill: 0.86,
    stencil: { kind: "vector", art: TOGETHER_LOGO, pull: 72 },
    wordGradients: [
      [POSTER.red, POSTER.orange],
      [POSTER.green, POSTER.blue],
    ],
    removedPhotoIds: ["7"],
    brokenPhotoIds: ["11", "404"],
  },
];

export const MAIN_SHOW = SHOWS[0];

export function findShow(id: string): ShowConfig | undefined {
  return SHOWS.find((s) => s.id === id);
}

export const UPLOAD = {
  maxBytes: 10 * 1024 * 1024,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
  /** Longest edge used while cropping, to keep memory down on phones. */
  workingMaxEdge: 2048,
  fullSize: 1080,
  mediumSize: 256,
  thumbSize: 96,
} as const;
