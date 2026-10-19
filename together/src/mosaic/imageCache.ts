import type { LoadedImage } from "./imageLoader";

type Entry = {
  status: "loading" | "ready" | "error";
  image?: LoadedImage;
  lastUsed: number;
};

export type CacheStats = { requested: number; loaded: number; failed: number; evicted: number; size: number };

/**
 * LRU cache for tile images. Requests are queued and started a few at a time so a fast zoom
 * doesn't flood the main thread; anything not drawn recently is dropped when over capacity.
 */
export class ImageCache {
  private entries = new Map<string, Entry>();
  private queue: string[] = [];
  private active = 0;
  private frame = 0;
  readonly stats: CacheStats = { requested: 0, loaded: 0, failed: 0, evicted: 0, size: 0 };
  onLoad: () => void = () => {};

  constructor(
    private loader: (url: string) => Promise<LoadedImage>,
    private capacity = 500,
    private concurrency = 4,
  ) {}

  /** Returns the image if ready, otherwise queues it (once) and returns undefined. */
  get(url: string): Entry {
    let entry = this.entries.get(url);
    if (!entry) {
      entry = { status: "loading", lastUsed: this.frame };
      this.entries.set(url, entry);
      this.stats.requested++;
      this.queue.push(url);
      this.pump();
    }
    entry.lastUsed = this.frame;
    return entry;
  }

  peek(url: string): Entry | undefined {
    return this.entries.get(url);
  }

  /** Call once per rendered frame, after drawing. Drops queued work that scrolled away and evicts LRU. */
  endFrame() {
    this.queue = this.queue.filter((url) => {
      const e = this.entries.get(url);
      if (e && e.lastUsed < this.frame) {
        this.entries.delete(url);
        return false;
      }
      return true;
    });
    if (this.entries.size > this.capacity) {
      const victims = [...this.entries]
        .filter(([, e]) => e.status !== "loading" && e.lastUsed < this.frame)
        .sort((a, b) => a[1].lastUsed - b[1].lastUsed)
        .slice(0, this.entries.size - this.capacity);
      for (const [url, e] of victims) {
        if (e.image && "close" in e.image) e.image.close();
        this.entries.delete(url);
        this.stats.evicted++;
      }
    }
    this.stats.size = this.entries.size;
    this.frame++;
  }

  get pending() {
    return this.queue.length + this.active;
  }

  forget(urls: Iterable<string>) {
    for (const url of urls) this.entries.delete(url);
  }

  clear() {
    this.entries.clear();
    this.queue = [];
  }

  private pump() {
    while (this.active < this.concurrency && this.queue.length) {
      const url = this.queue.shift()!;
      const entry = this.entries.get(url);
      if (!entry) continue;
      this.active++;
      this.loader(url)
        .then((image) => {
          entry.image = image;
          entry.status = "ready";
          this.stats.loaded++;
        })
        .catch(() => {
          entry.status = "error";
          this.stats.failed++;
        })
        .finally(() => {
          this.active--;
          this.onLoad();
          this.pump();
        });
    }
  }
}
