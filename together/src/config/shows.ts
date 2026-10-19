import { POSTER } from "./palette";
import { TOGETHER_LOGO } from "./togetherLogo";

export type StencilConfig =
  /** Official artwork as vector paths: sticker silhouettes hold the mosaic, linework sits on top. */
  | { kind: "vector"; art: typeof TOGETHER_LOGO }
  /** Generic placeholder: text set along two arcs in a system font. Replace with the official asset. */
  | { kind: "placeholder-arcs"; text: string }
  /** Transparent SVG/PNG whose alpha channel marks the artwork (e.g. the official wordmarks). */
  | { kind: "image"; url: string };

export type ShowConfig = {
  id: string;
  /** Short label shown on photos and in the header, e.g. "DEMO SHOW · NIGHT 01". */
  label: string;
  city: string;
  night: string;
  available: boolean;
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

export const SHOWS: ShowConfig[] = [
  {
    id: "demo-night-1",
    label: "DEMO SHOW · NIGHT 01",
    city: "Demo City",
    night: "Night 01",
    available: true,
    cols: 150,
    rows: 196,
    seed: 20260101,
    sampleFill: 0.86,
    stencil: { kind: "vector", art: TOGETHER_LOGO },
    wordGradients: [
      [POSTER.red, POSTER.orange],
      [POSTER.green, POSTER.blue],
    ],
    removedPhotoIds: ["7"],
    brokenPhotoIds: ["11", "404"],
  },
  {
    id: "demo-night-2",
    label: "DEMO SHOW · NIGHT 02",
    city: "Demo City",
    night: "Night 02",
    available: false,
    cols: 150,
    rows: 196,
    seed: 20260102,
    sampleFill: 0.4,
    stencil: { kind: "vector", art: TOGETHER_LOGO },
    wordGradients: [
      [POSTER.red, POSTER.orange],
      [POSTER.green, POSTER.blue],
    ],
    removedPhotoIds: [],
    brokenPhotoIds: [],
  },
];

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
