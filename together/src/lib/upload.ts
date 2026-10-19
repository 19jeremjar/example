import { UPLOAD } from "../config/shows";

export type ValidationResult = { ok: true } | { ok: false; message: string };

export function validateImageFile(file: { type: string; size: number; name?: string }, limits = UPLOAD): ValidationResult {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif" || /\.hei[cf]$/i.test(file.name ?? "")) {
    return { ok: false, message: "HEIC photos aren't supported in this demo. Choose a JPG or PNG." };
  }
  if (!(limits.acceptedTypes as readonly string[]).includes(type)) {
    return { ok: false, message: "That file isn't a supported image. Choose a JPG, PNG or WebP." };
  }
  if (file.size > limits.maxBytes) {
    const mb = Math.round(limits.maxBytes / (1024 * 1024));
    return { ok: false, message: `That photo is over ${mb} MB. Choose a smaller one.` };
  }
  if (file.size === 0) return { ok: false, message: "That file is empty." };
  return { ok: true };
}

/** Decodes an image file (respecting EXIF orientation) and scales it down for cropping. */
export async function decodeForCrop(file: File, maxEdge: number = UPLOAD.workingMaxEdge): Promise<HTMLCanvasElement> {
  let source: ImageBitmap | HTMLImageElement;
  let url: string | undefined;
  try {
    source = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    await img.decode();
    source = img;
  }
  try {
    const w = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const h = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d")!.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    if ("close" in source) source.close();
    if (url) URL.revokeObjectURL(url);
  }
}

export type CropRect = { sx: number; sy: number; side: number };

/** Renders a square crop at several sizes and returns temporary object URLs for each. */
export async function exportCrop(source: HTMLCanvasElement, crop: CropRect) {
  const render = (size: number) =>
    new Promise<string>((resolve, reject) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, crop.sx, crop.sy, crop.side, crop.side, 0, 0, size, size);
      c.toBlob((blob) => (blob ? resolve(URL.createObjectURL(blob)) : reject(new Error("Export failed"))), "image/jpeg", 0.86);
    });
  const [full, medium, thumb] = await Promise.all([render(UPLOAD.fullSize), render(UPLOAD.mediumSize), render(UPLOAD.thumbSize)]);
  return { full, medium, thumb };
}

/** Smallest scale at which the image covers a square box, and the clamp for offsets. */
export function clampCrop(imgW: number, imgH: number, box: number, scale: number, x: number, y: number) {
  const min = box / Math.min(imgW, imgH);
  const s = Math.max(min, scale);
  return {
    scale: s,
    x: Math.min(0, Math.max(box - imgW * s, x)),
    y: Math.min(0, Math.max(box - imgH * s, y)),
    min,
  };
}
