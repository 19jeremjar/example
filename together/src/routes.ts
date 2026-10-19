export type Route = { kind: "mosaic"; photoId?: string } | { kind: "notfound" };

/**
 * There's one live mosaic, at the root. Older per-show links (/show/<id>[/photo/<id>]) still
 * open it, so links shared from earlier demos keep working.
 */
export function parseRoute(pathname: string): Route {
  const parts = pathname.split("/").filter(Boolean).map(decodeURIComponent);
  if (parts[0] === "show" && parts[1]) parts.splice(0, 2);
  if (parts.length === 0) return { kind: "mosaic" };
  if (parts.length === 2 && parts[0] === "photo" && parts[1]) return { kind: "mosaic", photoId: parts[1] };
  return { kind: "notfound" };
}

export const mosaicPath = "/";
export const photoPath = (photoId: string) => `/photo/${encodeURIComponent(photoId)}`;

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) history.replaceState(null, "", path);
  else history.pushState(null, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}
