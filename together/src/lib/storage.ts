// Per-viewer conveniences only. Storage can be unavailable (private mode, blocked), so never throw.
export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function writeFlag(key: string) {
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}
