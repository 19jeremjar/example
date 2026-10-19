import { describe, expect, it } from "vitest";
import { ImageCache } from "./imageCache";

const fakeImage = { width: 1, height: 1 } as unknown as HTMLCanvasElement;
const flush = () => new Promise((r) => setTimeout(r, 0));

describe("ImageCache", () => {
  it("requests each URL once and reports readiness", async () => {
    const calls: string[] = [];
    const cache = new ImageCache(async (url) => (calls.push(url), fakeImage));
    expect(cache.get("a").status).toBe("loading");
    cache.get("a");
    await flush();
    expect(cache.get("a").status).toBe("ready");
    expect(calls).toEqual(["a"]);
    expect(cache.stats.requested).toBe(1);
  });

  it("marks failures without throwing", async () => {
    const cache = new ImageCache(async () => {
      throw new Error("nope");
    });
    cache.get("x");
    await flush();
    expect(cache.get("x").status).toBe("error");
    expect(cache.stats.failed).toBe(1);
  });

  it("evicts least recently used images over capacity", async () => {
    const cache = new ImageCache(async () => fakeImage, 2);
    for (const u of ["a", "b", "c"]) {
      cache.get(u);
      await flush();
      cache.endFrame();
    }
    cache.get("c");
    cache.endFrame();
    expect(cache.peek("a")).toBeUndefined();
    expect(cache.peek("c")?.status).toBe("ready");
    expect(cache.stats.evicted).toBe(1);
  });

  it("drops queued requests that scrolled out of view", () => {
    const cache = new ImageCache(() => new Promise(() => {}), 100, 1);
    cache.get("visible-then-gone");
    cache.get("queued");
    cache.endFrame();
    cache.endFrame();
    expect(cache.peek("queued")).toBeUndefined();
  });
});
