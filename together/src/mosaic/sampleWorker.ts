// Draws sample photos off the main thread so zooming stays smooth while thumbnails are made.
import { drawSamplePhoto } from "./samplePhotos";

type Request = { id: number; size: number; seed: number };

addEventListener("message", (event: MessageEvent<Request>) => {
  const { id, size, seed } = event.data;
  try {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");
    drawSamplePhoto(ctx, size, seed);
    const bitmap = canvas.transferToImageBitmap();
    (self as unknown as Worker).postMessage({ id, bitmap }, [bitmap]);
  } catch (error) {
    (self as unknown as Worker).postMessage({ id, error: String(error) });
  }
});
