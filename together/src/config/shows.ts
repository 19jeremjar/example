export type StencilConfig =
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
    cols: 168,
    rows: 120,
    seed: 20260101,
    sampleFill: 0.86,
    stencil: { kind: "placeholder-arcs", text: "TOGETHER" },
    removedPhotoIds: ["7"],
    brokenPhotoIds: ["11", "404"],
  },
  {
    id: "demo-night-2",
    label: "DEMO SHOW · NIGHT 02",
    city: "Demo City",
    night: "Night 02",
    available: false,
    cols: 168,
    rows: 120,
    seed: 20260102,
    sampleFill: 0.4,
    stencil: { kind: "placeholder-arcs", text: "TOGETHER" },
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
