import { describe, expect, it } from "vitest";
import { parseRoute, photoPath } from "./routes";

describe("routes", () => {
  it("opens the one mosaic at the root, with photo deep links", () => {
    expect(parseRoute("/")).toEqual({ kind: "mosaic" });
    expect(parseRoute("/photo/123")).toEqual({ kind: "mosaic", photoId: "123" });
    expect(parseRoute("/photo")).toEqual({ kind: "notfound" });
    expect(parseRoute("/nope")).toEqual({ kind: "notfound" });
  });
  it("keeps older per-show links working", () => {
    expect(parseRoute("/show/demo-night-1")).toEqual({ kind: "mosaic" });
    expect(parseRoute("/show/demo-night-1/photo/42")).toEqual({ kind: "mosaic", photoId: "42" });
  });
  it("builds photo paths that parse back", () => {
    expect(parseRoute(photoPath("42"))).toEqual({ kind: "mosaic", photoId: "42" });
  });
});
