import { useEffect, useRef } from "react";

/** How long the welcome stays up if it isn't closed. */
const AUTO_CLOSE_MS = 10_000;

/** Welcome card along the bottom of the wall. Closes with the cross, or by itself after 10s. */
export function Intro({ onClose }: { onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), AUTO_CLOSE_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-safe px-safe">
      <div
        role="status"
        aria-labelledby="intro-title"
        className="pointer-events-auto relative w-full max-w-md bg-white p-4 pr-12 text-[#121c16] shadow-[0_0_0_1.5px_#121c16] animate-rise"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center text-xl leading-none font-bold"
        >
          ✕
        </button>
        <h2 id="intro-title" className="font-bold">
          <span className="block text-[11px] tracking-[0.12em]">WELCOME TO THE</span>
          <span className="block text-[1.6rem] leading-[0.95] tracking-tight">TOGETHER WALL</span>
        </h2>
        <p className="mt-2 text-xs leading-snug font-bold">
          EVERY PHOTO FROM THE TOUR, IN ONE PICTURE. ADD YOURS, THEN ZOOM IN AND SEE EVERYONE ELSE'S.
        </p>
      </div>
    </div>
  );
}
