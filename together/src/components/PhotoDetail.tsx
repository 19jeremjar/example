import { useEffect, useRef, useState } from "react";
import { PALETTE } from "../config/palette";
import type { ImageCache } from "../mosaic/imageCache";
import { imageSize, loadImage, type LoadedImage } from "../mosaic/imageLoader";
import type { MosaicPhoto } from "../mosaic/types";
import { Dialog } from "./Dialog";
import { Corner, Script, Spaced } from "./Poster";

type Props = {
  photo: MosaicPhoto | null;
  showLabel: string;
  /** The tile's colour in the artwork; the frame matches it. */
  frameColor?: string;
  cache: ImageCache;
  onClose: () => void;
  onCopyLink?: () => void;
};

export function PhotoDetail({ photo, showLabel, frameColor, cache, onClose, onCopyLink }: Props) {
  const unavailable = !photo || photo.removed;
  return (
    <Dialog label={unavailable ? "Moment unavailable" : "Moment"} onClose={onClose}>
      <div className="flex items-start justify-between pt-safe px-safe">
        <Corner lines={["TOGETHER", "TOGETHER"]} />
        <button type="button" onClick={onClose} className="-m-2 p-2 text-right text-[11px] leading-[1.15] font-bold tracking-wider">
          CLOSE
          <br />✕
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 p-5">
        {unavailable ? (
          <div className="w-full animate-rise">
            <div className="box-ink px-4 pt-3 pb-2.5">
              <h2 className="text-[clamp(2.2rem,11vw,3.2rem)] leading-[0.9] font-bold tracking-tight">
                MOMENT
                <br />
                UNAVAILABLE
              </h2>
              <p className="mt-2 text-sm font-bold tracking-wider">{showLabel}</p>
            </div>
            <Script className="mt-4 text-center">it's been taken down, but the night goes on</Script>
            <button type="button" onClick={onClose} className="box-white mt-4 h-14 w-full px-4 text-sm font-bold">
              <Spaced text="BACK TO EVERYONE" />
            </button>
          </div>
        ) : (
          <>
            <figure
              className="w-full max-w-[min(100%,54vh,460px)] p-[4.5%] pb-0 text-[#121c16] animate-rise"
              style={{ background: frameColor ?? "#ffffff" }}
            >
              <DetailImage photo={photo} cache={cache} />
              <figcaption className="flex items-center justify-between py-[4%]">
                <span className="font-script text-[1.8rem] leading-none">together, together</span>
                <span className="text-[11px] font-bold tracking-wider">
                  {photo.source === "local" ? "YOU" : `#${photo.id.padStart(4, "0")}`}
                </span>
              </figcaption>
            </figure>
            <p className="text-center text-[11px] font-bold tracking-wider">{showLabel}</p>
          </>
        )}
      </div>

      {!unavailable && (
        <div className="mx-auto w-full max-w-md pb-safe px-safe">
          {photo.source === "sample" && onCopyLink ? (
            <>
              <Script className="mb-2 text-center">you had to be there. send it to who was.</Script>
              <button type="button" onClick={onCopyLink} className="box-ink h-14 w-full px-4 text-sm font-bold">
                <Spaced text="COPY PHOTO LINK" />
              </button>
            </>
          ) : (
            <Script className="text-center">yours, only on this phone. for now.</Script>
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
      {state === "loading" && <p className="absolute bottom-2 left-2 text-[10px] font-bold tracking-widest text-ink/70">LOADING</p>}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-white p-6 text-center text-sm text-ink/80">
          This photo couldn't load. Check your connection and try again.
        </div>
      )}
    </div>
  );
}
