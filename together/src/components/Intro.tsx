import { useEffect, useRef } from "react";
import { TogetherMark } from "./Poster";

/** First-visit welcome: one card over the wall, closed with the cross. */
export function Intro({ onClose }: { onClose: () => void }) {
  const card = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    // Focus the card (not the cross) so keyboard users land inside without a ring on the ✕.
    card.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#121c16]/45 px-safe">
      <div
        ref={card}
        tabIndex={-1}
        style={{ outline: "none" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        className="relative w-full max-w-sm bg-white p-5 pt-12 text-[#121c16] shadow-[0_0_0_1.5px_#121c16] animate-rise"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-1 right-1 flex h-11 w-11 items-center justify-center text-2xl leading-none font-bold"
        >
          ✕
        </button>
        <TogetherMark word="top" className="mx-auto w-[78%]" />
        <h2 id="intro-title" className="box-ink mt-4 px-4 pt-3 pb-2.5 text-[2.1rem] leading-[0.92] font-bold tracking-tight">
          WELCOME TO
          <br />
          THE LIVE WALL
        </h2>
        <p className="mt-4 text-sm leading-snug font-bold">
          EVERY PHOTO FROM THE TOUR, IN ONE PICTURE. ADD YOURS, THEN ZOOM IN AND SEE EVERYONE ELSE'S.
        </p>
      </div>
    </div>
  );
}
