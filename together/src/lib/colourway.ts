import { useSyncExternalStore } from "react";
import { COLOURWAYS } from "../config/palette";
import { readString, writeString } from "./storage";

// Bumped when the default changes, so everyone starts on the new default colour.
const KEY = "tt-colourway-v3";

export type Colourway = (typeof COLOURWAYS)[number];

let index = Math.max(
  0,
  COLOURWAYS.findIndex((c) => c.name === readString(KEY)),
);
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The page colour shared by every screen, so the app feels like one poster. */
export function useColourway(): { colourway: Colourway; next: () => void } {
  const i = useSyncExternalStore(subscribe, () => index);
  return {
    colourway: COLOURWAYS[i],
    next() {
      index = (index + 1) % COLOURWAYS.length;
      writeString(KEY, COLOURWAYS[index].name);
      listeners.forEach((l) => l());
    },
  };
}
