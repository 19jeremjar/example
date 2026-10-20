import { useEffect, useRef, useState } from "react";
import { UPLOAD } from "../config/shows";
import { clampCrop, decodeForCrop, exportCrop, validateImageFile } from "../lib/upload";
import { Dialog } from "./Dialog";
import { Corner, Script, Spaced, TogetherMark } from "./Poster";

export type LocalImageUrls = { full: string; medium: string; thumb: string };

type Props = {
  localCount: number;
  onClose: () => void;
  onSubmit: (urls: LocalImageUrls) => void;
  onReset: () => void;
};

export function UploadSheet({ localCount, onClose, onSubmit, onReset }: Props) {
  const [image, setImage] = useState<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const check = validateImageFile(file);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setImage(await decodeForCrop(file));
    } catch {
      setError("We couldn't read that photo. Try a different one.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog label="Add your moment" onClose={onClose}>
      <div className="flex items-start justify-between pt-safe px-safe">
        <Corner lines={image ? ["FRAME YOUR", "MOMENT"] : ["TOGETHER", "TOGETHER"]} />
        <button type="button" onClick={onClose} className="-m-2 p-2 text-right text-[11px] leading-[1.15] font-bold tracking-wider">
          CANCEL
          <br />✕
        </button>
      </div>

      {image ? (
        <Cropper
          image={image}
          busy={busy}
          onBack={() => setImage(null)}
          onConfirm={async (crop) => {
            setBusy(true);
            try {
              onSubmit(await exportCrop(image, crop));
            } catch {
              setError("Something went wrong preparing your photo.");
              setImage(null);
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : (
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-3 pt-4 pb-safe px-safe">
          <TogetherMark word="top" className="mx-auto w-[80%]" />
          <div className="box-ink px-4 pt-3 pb-2.5">
            <h2 className="text-[clamp(2.4rem,12vw,3.6rem)] leading-[0.9] font-bold tracking-tight">
              ADD YOUR
              <br />
              MOMENT
            </h2>
            <p className="mt-2 flex justify-between text-sm font-bold tracking-wider">
              <span>LIVE · ALL TOUR</span>
              <Spaced text="2026" className="w-16" />
            </p>
          </div>
          <Script className="mt-1 text-center">with very special guest:</Script>
          <div className="box-white px-4 pt-2 pb-1.5">
            <Spaced text="YOU" className="text-[2.6rem] leading-none font-bold" />
            <Spaced text="AND EVERYONE HERE" className="mt-1 text-[10px] font-bold" />
          </div>
          {error && (
            <p role="alert" className="box-ink px-3 py-2 text-sm font-bold">
              {error}
            </p>
          )}
          <input
            ref={cameraInput}
            type="file"
            accept={UPLOAD.acceptedTypes.join(",")}
            capture="environment"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={libraryInput}
            type="file"
            accept={UPLOAD.acceptedTypes.join(",")}
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button
              type="button"
              data-autofocus
              disabled={busy}
              onClick={() => cameraInput.current?.click()}
              className="box-ink h-14 text-sm font-bold tracking-wider"
            >
              TAKE A PHOTO
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => libraryInput.current?.click()}
              className="box-white h-14 text-sm font-bold tracking-wider"
            >
              {busy ? "READING…" : "FROM LIBRARY"}
            </button>
          </div>
          <p className="text-center text-xs leading-snug font-bold" role="note">
            EVERY PHOTO IS CHECKED BEFORE IT JOINS THE WALL.
          </p>
          <p className="text-center text-[11px] opacity-70">JPG, PNG or WebP, up to {Math.round(UPLOAD.maxBytes / 1048576)} MB.</p>
          {localCount > 0 && (
            <button type="button" onClick={onReset} className="h-11 text-xs font-bold tracking-wider underline underline-offset-4">
              REMOVE MY {localCount} DEMO PHOTO{localCount === 1 ? "" : "S"}
            </button>
          )}
        </div>
      )}
    </Dialog>
  );
}

type CropProps = {
  image: HTMLCanvasElement;
  busy: boolean;
  onBack: () => void;
  onConfirm: (crop: { sx: number; sy: number; side: number }) => void;
};

function Cropper({ image, busy, onBack, onConfirm }: CropProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState(0);
  // Scale and top-left offset of the image inside the square box, in CSS px.
  const [view, setView] = useState({ scale: 0, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);

  useEffect(() => {
    const el = boxRef.current!;
    const ro = new ResizeObserver(() => setBox(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Start centred at cover scale whenever the box size or image changes.
  useEffect(() => {
    if (!box) return;
    const min = box / Math.min(image.width, image.height);
    setView({ scale: min, x: (box - image.width * min) / 2, y: (box - image.height * min) / 2 });
  }, [box, image]);

  const min = box ? box / Math.min(image.width, image.height) : 1;
  const set = (scale: number, x: number, y: number) => {
    const c = clampCrop(image.width, image.height, box, Math.min(min * 4, scale), x, y);
    setView({ scale: c.scale, x: c.x, y: c.y });
  };
  /** Zoom keeping the box centre fixed. */
  const zoomTo = (scale: number) => {
    const s = Math.max(min, Math.min(min * 4, scale));
    const c = box / 2;
    set(s, c - ((c - view.x) / view.scale) * s, c - ((c - view.y) / view.scale) * s);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !box || !view.scale) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = canvas.height = Math.round(box * dpr);
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(image, view.x, view.y, image.width * view.scale, image.height * view.scale);
  }, [image, box, view]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-safe px-safe">
      <div className="flex flex-1 items-center justify-center py-4">
        <div className="w-full max-w-[min(100%,46vh,440px)] bg-white p-[4.5%] pb-0 text-[#121c16] shadow-[0_0_0_1.5px_#121c16]">
          <div
            ref={boxRef}
            className="relative aspect-square w-full touch-none overflow-hidden bg-[#121c16]"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 2) {
                const [a, b] = [...pointers.current.values()];
                pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: view.scale };
              }
            }}
            onPointerMove={(e) => {
              const prev = pointers.current.get(e.pointerId);
              if (!prev) return;
              pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
              if (pointers.current.size === 1) set(view.scale, view.x + e.clientX - prev.x, view.y + e.clientY - prev.y);
              else if (pinch.current) {
                const [a, b] = [...pointers.current.values()];
                zoomTo(pinch.current.scale * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist));
              }
            }}
            onPointerUp={(e) => {
              pointers.current.delete(e.pointerId);
              if (pointers.current.size < 2) pinch.current = null;
            }}
            onPointerCancel={(e) => {
              pointers.current.delete(e.pointerId);
              pinch.current = null;
            }}
            onWheel={(e) => zoomTo(view.scale * Math.exp(-e.deltaY * 0.002))}
          >
            <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label="Crop preview" />
          </div>
          <div className="flex items-center justify-between py-[4%]">
            <Script className="text-[1.7rem]">together, together</Script>
            <span className="text-[11px] font-bold tracking-wider">YOU</span>
          </div>
        </div>
      </div>
      <p className="mb-3 text-center text-[11px] leading-snug">
        By adding your photo, you agree it can be shown publicly on the Together Wall and shared by the tour.
        Only add photos you took.
      </p>
      <div className="grid grid-cols-[1fr_2fr] gap-3">
        <button type="button" onClick={onBack} disabled={busy} className="box-white h-14 text-sm font-bold tracking-wider">
          BACK
        </button>
        <button
          type="button"
          data-autofocus
          disabled={busy || !view.scale}
          onClick={() => onConfirm({ sx: -view.x / view.scale, sy: -view.y / view.scale, side: box / view.scale })}
          className="box-ink h-14 text-sm font-bold tracking-wider"
        >
          {busy ? "ADDING…" : "ADD TO THE WALL"}
        </button>
      </div>
    </div>
  );
}
