// Hotspot positions for the Polycam scan in public/models/rehearsal-room.glb.
//
// The scan is two merged meshes (room + people/equipment baked together), so
// nothing in it can be selected directly. Every interaction is an invisible
// box placed over the object it stands for.
//
// Coordinates are in the GLB's own space (metres, Y up, no transform applied):
//   x  -1.8 (left wall, Mitch's side)   →  +1.8 (right wall, Jewel's side)
//   y  -0.37 (floor)                    →  +2.3 (ceiling)
//   z  -2.7 (mural wall)                →  +2.9 (door wall)
//
// They were measured by raycasting the scan from the default camera. To adjust
// one, open the game with ?debug in the URL: every box is drawn in wireframe
// with its id, so you can nudge `position` / `size` here and reload.

export type Vec3 = [number, number, number];

export type HotspotKind = 'character' | 'puzzle' | 'secret' | 'prop';

export type HotspotAction =
  | { type: 'fact'; factId: string }
  | { type: 'puzzle'; puzzle: PuzzleId }
  | { type: 'secret'; secretId: string }
  | { type: 'message'; messageId: string };

export type PuzzleId = 'pedals' | 'setlist' | 'beat';

export interface CameraView {
  position: Vec3;
  target: Vec3;
}

export interface Hotspot {
  id: string;
  label: string;
  kind: HotspotKind;
  /** Centre of the hit box. */
  position: Vec3;
  /** Width, height, depth of the hit box. */
  size: Vec3;
  /** Where the camera flies to when this hotspot is inspected. */
  focus: CameraView;
  action: HotspotAction;
  /** True when the object isn't clearly visible in the scan and the box is a best guess. */
  approximate?: boolean;
}

/** Wide starting view from just inside the door, looking at the mural. */
export const HOME_VIEW: CameraView = {
  position: [0, 1.3, 2.3],
  target: [0, 0.35, -1.1],
};

/**
 * The camera is never allowed outside this box. It sits well inside the
 * scanned walls (±1.8 x, -2.7…2.9 z) and below the ceiling, which has holes.
 */
export const CAMERA_BOUNDS = {
  min: [-1.35, -0.1, -1.2] as Vec3,
  max: [1.35, 1.75, 2.55] as Vec3,
};

export const ORBIT_LIMITS = {
  // Tight on purpose: wider angles or closer zoom show the side of the
  // drummer the scan never captured (a large black hole in the mesh).
  minDistance: 1.9,
  maxDistance: 3.7,
  /** Radians either side of straight down the room. */
  maxAzimuth: 0.42,
  /** Polar angle from straight up: 1.0 ≈ looking 33° down, 1.62 ≈ slightly up. */
  minPolar: 1.0,
  maxPolar: 1.62,
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'mitch',
    label: 'Mitch',
    kind: 'character',
    position: [-1.42, 0.3, 0.02],
    size: [0.55, 0.95, 0.55],
    focus: { position: [-0.35, 0.85, 1.15], target: [-1.42, 0.3, 0.02] },
    action: { type: 'fact', factId: 'mitch' },
  },
  {
    id: 'guitar',
    label: "Mitch's guitar",
    kind: 'secret',
    position: [-1.47, 0.2, 0.38],
    size: [0.32, 0.32, 0.3],
    focus: { position: [-0.6, 0.65, 1.15], target: [-1.47, 0.2, 0.38] },
    action: { type: 'secret', secretId: 'guitar' },
  },
  {
    id: 'pedals',
    label: 'Guitar pedals',
    kind: 'puzzle',
    position: [-0.74, -0.3, 0.36],
    size: [0.45, 0.2, 0.75],
    focus: { position: [-0.45, 0.55, 1.05], target: [-0.74, -0.32, 0.32] },
    action: { type: 'puzzle', puzzle: 'pedals' },
  },
  {
    id: 'pizza',
    label: 'Pizza boxes',
    kind: 'puzzle',
    position: [0.56, -0.32, 0.32],
    size: [0.85, 0.14, 0.8],
    focus: { position: [0.5, 0.8, 1.3], target: [0.56, -0.35, 0.3] },
    action: { type: 'puzzle', puzzle: 'setlist' },
  },
  {
    id: 'drums',
    label: 'Drum kit',
    kind: 'puzzle',
    position: [0, 0.15, -0.98],
    size: [0.9, 0.8, 0.8],
    focus: { position: [0.15, 0.75, 0.55], target: [0.05, 0.25, -1.1] },
    action: { type: 'puzzle', puzzle: 'beat' },
  },
  {
    id: 'drummer',
    label: 'Zac',
    kind: 'character',
    position: [0.14, 0.78, -1.8],
    size: [0.5, 0.65, 0.4],
    focus: { position: [0.2, 0.95, 0.2], target: [0.14, 0.7, -1.8] },
    action: { type: 'fact', factId: 'drummer' },
  },
  {
    id: 'jewel',
    label: 'Jewel Owusu',
    kind: 'character',
    // Starts just right of the handheld mic so the mic stays tappable.
    position: [1.53, 0.3, -0.2],
    size: [0.42, 0.95, 0.6],
    focus: { position: [0.35, 0.85, 1.0], target: [1.42, 0.35, -0.2] },
    action: { type: 'fact', factId: 'jewel' },
  },
  {
    // Jewel's handheld mic (the one with the red cable in the photos).
    id: 'mic',
    label: "Jewel's microphone",
    kind: 'secret',
    position: [1.24, 0.5, -0.2],
    size: [0.2, 0.2, 0.2],
    focus: { position: [0.45, 0.8, 0.85], target: [1.3, 0.45, -0.22] },
    action: { type: 'secret', secretId: 'mic' },
  },
  {
    id: 'mural-eyes',
    label: "The cowboy's eyes",
    kind: 'secret',
    position: [-0.22, 1.1, -2.57],
    size: [0.52, 0.18, 0.1],
    focus: { position: [-0.2, 1.15, -0.55], target: [-0.22, 1.15, -2.65] },
    action: { type: 'secret', secretId: 'mural-eyes' },
  },
  {
    id: 'mural',
    label: 'Cowboy skeleton mural',
    kind: 'prop',
    position: [-0.22, 1.35, -2.63],
    size: [1.7, 1.2, 0.06],
    focus: { position: [-0.15, 1.2, -0.4], target: [-0.22, 1.2, -2.65] },
    action: { type: 'message', messageId: 'mural' },
  },
  {
    // The scan missed the red stool (it's the black hole right of the drummer),
    // so a small stool model is drawn there from the photos. See RedStool.tsx.
    id: 'stool',
    label: 'Red stool',
    kind: 'secret',
    position: [0.72, -0.03, -2.05],
    size: [0.4, 0.68, 0.4],
    focus: { position: [0.55, 0.55, -0.35], target: [0.72, 0.0, -2.05] },
    action: { type: 'secret', secretId: 'stool' },
  },
  {
    id: 'speaker-left',
    label: 'Left speaker',
    kind: 'prop',
    position: [-1.17, 1.83, -2.1],
    size: [0.32, 0.48, 0.3],
    focus: { position: [-0.5, 1.4, -0.3], target: [-1.17, 1.8, -2.1] },
    action: { type: 'message', messageId: 'speaker' },
  },
  {
    id: 'speaker-right',
    label: 'Right speaker',
    kind: 'prop',
    position: [1.24, 1.79, -2.1],
    size: [0.32, 0.48, 0.3],
    focus: { position: [0.55, 1.4, -0.3], target: [1.24, 1.78, -2.1] },
    action: { type: 'message', messageId: 'speaker' },
  },
  {
    id: 'bottle',
    label: 'Water bottle',
    kind: 'secret',
    position: [1.35, -0.27, 0.33],
    size: [0.22, 0.26, 0.22],
    focus: { position: [0.75, 0.4, 1.1], target: [1.35, -0.27, 0.33] },
    action: { type: 'secret', secretId: 'bottle' },
  },
  {
    id: 'plush',
    label: 'Yellow plush',
    kind: 'secret',
    position: [1.62, -0.2, 0.54],
    size: [0.34, 0.32, 0.34],
    focus: { position: [0.9, 0.45, 1.3], target: [1.62, -0.2, 0.54] },
    action: { type: 'secret', secretId: 'plush' },
  },
  {
    id: 'cymbal-bag',
    label: 'Cymbal bag',
    kind: 'secret',
    position: [1.58, 0.0, -1.46],
    size: [0.42, 0.5, 0.36],
    focus: { position: [0.7, 0.6, -0.2], target: [1.58, 0.0, -1.46] },
    action: { type: 'secret', secretId: 'cymbal-bag' },
  },
  {
    id: 'mixer',
    label: 'Mixer on the crates',
    kind: 'prop',
    position: [-1.55, 0.35, -0.89],
    size: [0.4, 0.4, 0.4],
    focus: { position: [-0.7, 0.85, 0.3], target: [-1.55, 0.3, -0.89] },
    action: { type: 'message', messageId: 'mixer' },
  },
  // --- extra secrets, measured from the default view ---
  {
    id: 'mural-arrow',
    label: 'Arrow through the hat',
    kind: 'secret',
    position: [-0.2, 2.0, -2.56],
    size: [0.95, 0.32, 0.08],
    focus: { position: [-0.15, 1.3, -0.45], target: [-0.2, 1.85, -2.65] },
    action: { type: 'secret', secretId: 'mural-arrow' },
  },
  {
    id: 'cactus',
    label: 'Painted cacti',
    kind: 'secret',
    position: [-0.88, 0.86, -2.56],
    size: [0.26, 0.3, 0.08],
    focus: { position: [-0.55, 0.95, -0.6], target: [-0.88, 0.86, -2.65] },
    action: { type: 'secret', secretId: 'cactus' },
  },
  {
    id: 'laptop',
    label: 'Laptop',
    kind: 'secret',
    position: [-1.22, 0.05, -0.5],
    size: [0.26, 0.26, 0.26],
    focus: { position: [-0.45, 0.7, 0.55], target: [-1.22, 0.05, -0.5] },
    action: { type: 'secret', secretId: 'laptop' },
  },
  {
    id: 'backpack',
    label: 'Backpack',
    kind: 'secret',
    position: [-0.15, -0.15, -0.38],
    size: [0.36, 0.45, 0.25],
    focus: { position: [0.1, 0.55, 0.75], target: [-0.15, -0.1, -0.45] },
    action: { type: 'secret', secretId: 'backpack' },
  },
  {
    id: 'black-bag',
    label: 'Bag in the corner',
    kind: 'secret',
    position: [-1.17, -0.2, -2.28],
    size: [0.42, 0.32, 0.36],
    focus: { position: [-0.55, 0.6, -0.75], target: [-1.17, -0.2, -2.28] },
    action: { type: 'secret', secretId: 'black-bag' },
  },
  {
    id: 'ceiling-light',
    label: 'Ceiling light',
    kind: 'secret',
    position: [0, 2.25, -1.24],
    size: [0.32, 0.1, 0.32],
    focus: { position: [0, 1.35, 0.6], target: [0, 2.2, -1.24] },
    action: { type: 'secret', secretId: 'ceiling-light' },
  },
  {
    id: 'sockets',
    label: 'Power points',
    kind: 'secret',
    position: [1.74, 0.69, -0.92],
    size: [0.1, 0.16, 0.32],
    focus: { position: [0.8, 0.85, 0.4], target: [1.74, 0.69, -0.92] },
    action: { type: 'secret', secretId: 'sockets' },
  },
  {
    id: 'crates',
    label: 'Milk crates',
    kind: 'secret',
    position: [1.52, -0.25, -0.25],
    size: [0.36, 0.24, 0.36],
    focus: { position: [0.6, 0.45, 0.85], target: [1.52, -0.25, -0.25] },
    action: { type: 'secret', secretId: 'crates' },
  },
  {
    id: 'notebook',
    label: "Jewel's notebook",
    kind: 'secret',
    position: [1.39, -0.34, 0.02],
    size: [0.26, 0.08, 0.24],
    focus: { position: [0.75, 0.4, 0.9], target: [1.39, -0.35, 0.02] },
    action: { type: 'secret', secretId: 'notebook' },
  },
  {
    id: 'checked-bag',
    label: 'Checked bag',
    kind: 'secret',
    position: [1.6, -0.24, 0.2],
    size: [0.28, 0.22, 0.26],
    focus: { position: [0.85, 0.45, 1.05], target: [1.6, -0.24, 0.2] },
    action: { type: 'secret', secretId: 'checked-bag' },
  },
];

/** Floor point under the centre of the red stool. */
export const RED_STOOL_BASE: Vec3 = [0.72, -0.37, -2.05];

/** Where the "amp is on" light appears once the sound is fixed. */
export const AMP_INDICATOR: Vec3 = [-1.52, 0.44, -0.8];

/** The skull's eyes, which glow while their secret is open. */
export const MURAL_EYES: Vec3[] = [
  [-0.37, 1.1, -2.6],
  [-0.07, 1.1, -2.6],
];

export const SPEAKER_POSITIONS: Vec3[] = [
  [-1.17, 1.74, -1.95],
  [1.24, 1.7, -1.95],
];

export function getHotspot(id: string): Hotspot | undefined {
  return HOTSPOTS.find((h) => h.id === id);
}

/** Pick the hotspot that opens a puzzle (used by the "Help" buttons on fact cards). */
export function hotspotForPuzzle(puzzle: PuzzleId): Hotspot {
  const h = HOTSPOTS.find((x) => x.action.type === 'puzzle' && x.action.puzzle === puzzle);
  if (!h) throw new Error(`No hotspot for puzzle ${puzzle}`);
  return h;
}
