import { UPLOAD } from "../config/shows";
import { hashString } from "./random";
import { drawSamplePhoto } from "./samplePhotos";

export type LoadedImage = HTMLCanvasElement | HTMLImageElement | ImageBitmap;

const SAMPLE_SIZES = { thumb: UPLOAD.thumbSize, medium: UPLOAD.mediumSize, full: UPLOAD.fullSize } as const;

/**
 * Loads an image URL. `sample://show/photo/size` URLs are drawn procedurally; everything else
 * (blob: URLs from local uploads now, CDN URLs later) goes through a normal image decode.
 */
export async function loadImage(url: string): Promise<LoadedImage> {
  if (url.startsWith("sample-broken://")) throw new Error(`Failed to load ${url}`);
  if (url.startsWith("sample://")) {
    const [, , size] = url.slice("sample://".length).split("/");
    const px = SAMPLE_SIZES[size as keyof typeof SAMPLE_SIZES] ?? UPLOAD.thumbSize;
    // Seeded by show and photo, so every size of the same photo shows the same scene.
    const seed = hashString(url.slice(0, url.lastIndexOf("/")));
    return drawInWorker(px, seed) ?? drawOnMainThread(px, seed);
  }
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await img.decode();
  return img;
}

async function drawOnMainThread(px: number, seed: number): Promise<LoadedImage> {
  // Drawing is synchronous, so give the renderer a chance to paint between photos.
  await new Promise((resolve) => setTimeout(resolve, 0));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  drawSamplePhoto(ctx, px, seed);
  return canvas;
}

let worker: Worker | null | undefined;
let nextId = 1;
const pending = new Map<number, { resolve: (b: ImageBitmap) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") return null;
  try {
    worker = new Worker(new URL("./sampleWorker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<{ id: number; bitmap?: ImageBitmap; error?: string }>) => {
      const job = pending.get(e.data.id);
      pending.delete(e.data.id);
      if (e.data.bitmap) job?.resolve(e.data.bitmap);
      else job?.reject(new Error(e.data.error ?? "worker failed"));
    };
    worker.onerror = () => {
      // Fall back to the main thread for this and every later photo.
      for (const job of pending.values()) job.reject(new Error("worker crashed"));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  } catch {
    worker = null;
  }
  return worker;
}

function drawInWorker(px: number, seed: number): Promise<LoadedImage> | null {
  const w = getWorker();
  if (!w) return null;
  const id = nextId++;
  return new Promise<LoadedImage>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, size: px, seed });
  }).catch(() => drawOnMainThread(px, seed));
}

export function imageSize(img: LoadedImage): { width: number; height: number } {
  if (img instanceof HTMLImageElement) return { width: img.naturalWidth, height: img.naturalHeight };
  return { width: img.width, height: img.height };
}
