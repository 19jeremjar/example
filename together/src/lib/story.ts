import { POSTER } from "../config/palette";
import { TOGETHER_LOGO } from "../config/togetherLogo";

const W = 1080;
const H = 1920;

type StoryOptions = {
  /** Full-size image of the fan's photo (object URL or CDN URL). */
  photoUrl: string;
  /** The tile's colour in the artwork; the Polaroid frame matches it. */
  frameColor: string;
  background: string;
};

/** Draws one TOGETHER wordmark (top or bottom arc), scaled to `width` and centred at `cy`. */
function drawWord(ctx: CanvasRenderingContext2D, word: "top" | "bottom", cx: number, cy: number, width: number) {
  const half = TOGETHER_LOGO.height / 2;
  const keep = (m: number[]) => (word === "top") === m[5] < half;
  // Crop boxes match the on-screen <TogetherMark>.
  const box = word === "top" ? { y: 0, h: half * 0.68 } : { y: half * 1.38, h: TOGETHER_LOGO.height - half * 1.38 };
  const scale = width / TOGETHER_LOGO.width;
  ctx.save();
  ctx.translate(cx - width / 2, cy - (box.h * scale) / 2);
  ctx.scale(scale, scale);
  ctx.translate(0, -box.y);
  const paint = (paths: typeof TOGETHER_LOGO.sticker, fill: string) => {
    ctx.fillStyle = fill;
    for (const p of paths) {
      if (!keep(p.m)) continue;
      const path = new Path2D();
      path.addPath(new Path2D(p.d), new DOMMatrix(p.m));
      ctx.fill(path);
    }
  };
  paint(TOGETHER_LOGO.sticker, "#ffffff");
  paint(TOGETHER_LOGO.lines, POSTER.ink);
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't load the photo"));
    img.src = src;
  });
}

/** A 1080×1920 story image in the poster style: wordmarks, the fan's Polaroid, a handwritten line. */
export async function renderStory({ photoUrl, frameColor, background }: StoryOptions): Promise<Blob> {
  const [photo] = await Promise.all([
    loadImage(photoUrl),
    document.fonts?.load('80px "Reenie Beanie"').catch(() => undefined),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const onWhite = background.toUpperCase() === "#FFFFFF";
  const text = onWhite ? POSTER.ink : "#ffffff";

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  // Corner labels, as on the poster.
  ctx.fillStyle = text;
  ctx.font = '700 34px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("TOGETHER", 64, 64);
  ctx.fillText("TOGETHER", 64, 102);
  ctx.textAlign = "right";
  ctx.fillText("TOUR", W - 64, 64);
  ctx.fillText("2026", W - 64, 102);

  drawWord(ctx, "top", W / 2, 310, 860);

  // The Polaroid, framed in the tile's colour.
  const pw = 700;
  const side = 44;
  const bottom = 140;
  const px = (W - pw) / 2;
  const py = 520;
  const inner = pw - side * 2;
  ctx.fillStyle = frameColor;
  ctx.fillRect(px, py, pw, side + inner + bottom);
  const crop = Math.min(photo.naturalWidth, photo.naturalHeight);
  ctx.drawImage(
    photo,
    (photo.naturalWidth - crop) / 2,
    (photo.naturalHeight - crop) / 2,
    crop,
    crop,
    px + side,
    py + side,
    inner,
    inner,
  );
  ctx.fillStyle = POSTER.ink;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = '78px "Reenie Beanie", "Marker Felt", cursive';
  ctx.fillText("together, together", px + side, py + side + inner + bottom / 2);
  ctx.textAlign = "right";
  ctx.font = '700 34px "Helvetica Neue", Helvetica, Arial, sans-serif';
  ctx.fillText("YOU", px + pw - side, py + side + inner + bottom / 2);

  drawWord(ctx, "bottom", W / 2, 1585, 860);

  // "I'm on the wall" box, like the poster's ink boxes.
  const label = "I'M ON THE TOGETHER WALL";
  ctx.font = '700 46px "Helvetica Neue", Helvetica, Arial, sans-serif';
  const lw = ctx.measureText(label).width + 64;
  ctx.fillStyle = POSTER.ink;
  ctx.fillRect((W - lw) / 2, 1770, lw, 84);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.fillText(label, W / 2, 1814);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image"))), "image/png"),
  );
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

/**
 * Opens the phone's share sheet with the story image (Instagram Stories, Messages, etc.).
 * Where sharing files isn't supported (most desktops), saves the image instead.
 */
export async function shareStory(blob: Blob, url: string): Promise<ShareResult> {
  const file = new File([blob], "together-wall.png", { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Together, Together", text: `I'm on the Together Wall. ${url}` });
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
      throw e;
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "together-wall.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return "downloaded";
}
