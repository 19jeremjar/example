import type { ShowConfig } from "../config/shows";

export type TileRegion = "ground" | "letter";

export type MosaicTile = {
  id: string;
  row: number;
  column: number;
  color: string;
  region: TileRegion;
  photoId?: string;
};

export type MosaicPhoto = {
  id: string;
  thumbnailUrl: string;
  /** Mid-size image for very high zoom; falls back to the thumbnail. */
  mediumUrl?: string;
  fullImageUrl: string;
  showId: string;
  tileId: string;
  source: "sample" | "local";
  removed?: boolean;
};

export type Mosaic = {
  show: ShowConfig;
  cols: number;
  rows: number;
  tiles: MosaicTile[];
  /** Packed RGB per tile, for fast drawing. */
  rgb: Uint8ClampedArray;
  photos: Map<string, MosaicPhoto>;
  /** Number of tiles inside the artwork (the only ones that hold photos). */
  letterCount: number;
  /** Empty letter tile indices in the order new contributions fill them. */
  fillOrder: number[];
};
