import { describe, expect, it } from "vitest";
import { parseRoute, photoPath } from "./routes";

describe("routes", () => {
  it("parses show and photo deep links", () => {
    expect(parseRoute("/")).toEqual({ kind: "home" });
    expect(parseRoute("/show/demo-night-1")).toEqual({ kind: "show", showId: "demo-night-1" });
    expect(parseRoute("/show/demo-night-1/photo/123")).toEqual({ kind: "show", showId: "demo-night-1", photoId: "123" });
    expect(parseRoute("/show/demo-night-1/")).toEqual({ kind: "show", showId: "demo-night-1" });
    expect(parseRoute("/show/demo-night-1/photo")).toEqual({ kind: "notfound" });
    expect(parseRoute("/nope")).toEqual({ kind: "notfound" });
  });
  it("builds photo paths that parse back", () => {
    expect(parseRoute(photoPath("demo-night-1", "42"))).toEqual({ kind: "show", showId: "demo-night-1", photoId: "42" });
  });
});
