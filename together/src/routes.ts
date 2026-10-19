export type Route =
  | { kind: "home" }
  | { kind: "show"; showId: string; photoId?: string }
  | { kind: "notfound" };

export function parseRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts.length === 0) return { kind: "home" };
  if (parts[0] === "show" && parts[1]) {
    if (parts.length === 2) return { kind: "show", showId: parts[1] };
    if (parts.length === 4 && parts[2] === "photo" && parts[3]) return { kind: "show", showId: parts[1], photoId: parts[3] };
  }
  return { kind: "notfound" };
}

export const showPath = (showId: string) => `/show/${encodeURIComponent(showId)}`;
export const photoPath = (showId: string, photoId: string) => `${showPath(showId)}/photo/${encodeURIComponent(photoId)}`;

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}
