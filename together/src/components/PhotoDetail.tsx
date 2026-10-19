import { useEffect, useRef, useState } from "react";
import { PALETTE } from "../config/palette";
import type { ImageCache } from "../mosaic/imageCache";
import { imageSize, loadImage, type LoadedImage } from "../mosaic/imageLoader";
import type { MosaicPhoto } from "../mosaic/types";
import { Dialog } from "./Dialog";

type Props = {
  photo: MosaicPhoto | null;
  showLabel: string;
  cache: ImageCache;
  onClose: () => void;
  onCopyLink?: () => void;
};

export function PhotoDetail({ photo, showLabel, cache, onClose, onCopyLink }: Props) {
  const unavailable = !photo || photo.removed;
  return (
    <Dialog label={unavailable ? "Photo unavailable" : "Photo"} onClose={onClose}>
      <div className="flex items-center justify-between pt-safe px-safe">
        <p className="text-xs font-bold tracking-widest">TOGETHER, TOGETHER</p>
        <button
          type="button"
          onClick={onClose}
          data-autofocus
          className="-mr-3 flex h-11 min-w-11 items-center justify-center px-3 text-sm font-bold tracking-wider"
        >
          CLOSE <span aria-hidden className="ml-2 text-lg leading-none">×</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-5">
        {unavailable ? (
          <div className="w-full max-w-sm border border-paper/30 p-6 animate-rise">
            <p className="text-xs font-bold tracking-widest text-paper/60">{showLabel}</p>
            <h2 className="mt-3 text-3xl leading-none font-bold">Photo unavailable</h2>
            <p className="mt-3 text-sm text-paper/70">
              This moment has been removed, or the link isn't quite right. The rest of the mosaic is still here.
            </p>
            <button type="button" onClick={onClose} className="mt-6 h-12 w-full bg-paper text-sm font-bold tracking-wider text-ink">
              BACK TO THE MOSAIC
            </button>
          </div>
        ) : (
          <figure className="w-full max-w-[min(88vw,58vh,520px)] bg-paper p-[4.5%] pb-0 text-ink animate-rise">
            <DetailImage photo={photo} cache={cache} />
            <figcaption className="flex items-center justify-between py-[5%] text-[11px] font-bold tracking-widest sm:text-xs">
              <span>{showLabel}</span>
              <span className="text-ink/50">
                {photo.source === "local" ? "YOUR DEMO PHOTO" : `#${photo.id.padStart(4, "0")}`}
              </span>
            </figcaption>
          </figure>
        )}
      </div>

      {!unavailable && (
        <div className="pb-safe px-safe">
          {photo.source === "sample" && onCopyLink ? (
            <button type="button" onClick={onCopyLink} className="mx-auto block h-12 w-full max-w-sm bg-paper text-sm font-bold tracking-wider text-ink">
              COPY PHOTO LINK
            </button>
          ) : (
            <p className="mx-auto max-w-sm text-center text-xs text-paper/60">
              Demo photos stay on this device and disappear when you close the tab, so they don't get a link.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}

function DetailImage({ photo, cache }: { photo: MosaicPhoto; cache: ImageCache }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const draw = (img: LoadedImage) => {
      const { width, height } = imageSize(img);
      const side = Math.min(width, height);
      canvas.width = canvas.height = Math.min(1080, side);
      ctx.drawImage(img, (width - side) / 2, (height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
    };
    // Show the cached thumbnail straight away, then swap in the full image.
    const thumb = cache.peek(photo.mediumUrl ?? "")?.image ?? cache.peek(photo.thumbnailUrl)?.image;
    if (thumb) draw(thumb);
    setState("loading");
    loadImage(photo.fullImageUrl)
      .then((img) => {
        if (cancelled) return;
        draw(img);
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [photo, cache]);

  return (
    <div className="relative aspect-square w-full" style={{ background: PALETTE.ink }}>
      <canvas ref={canvasRef} className="block h-full w-full" role="img" aria-label="Fan photo from the show" />
      {state === "loading" && <p className="absolute bottom-2 left-2 text-[10px] font-bold tracking-widest text-paper/70">LOADING</p>}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink p-6 text-center text-sm text-paper/80">
          This photo couldn't load. Check your connection and try again.
        </div>
      )}
    </div>
  );
}
