import { useEffect, useRef } from "react";
import { TogetherMark } from "./Poster";

type Props = {
  onAdd: () => void;
  onExplore: () => void;
};

/** First-visit welcome: one card over the wall, two choices. */
export function Intro({ onAdd, onExplore }: Props) {
  const first = useRef<HTMLButtonElement>(null);
  const onExploreRef = useRef(onExplore);
  onExploreRef.current = onExplore;

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onExploreRef.current();
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#121c16]/45 px-safe">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        className="w-full max-w-sm bg-white p-5 text-[#121c16] shadow-[0_0_0_1.5px_#121c16] animate-rise"
      >
        <TogetherMark word="top" className="mx-auto w-[78%]" />
        <h2 id="intro-title" className="box-ink mt-4 px-4 pt-3 pb-2.5 text-[2.1rem] leading-[0.92] font-bold tracking-tight">
          WELCOME TO
          <br />
          THE LIVE WALL
        </h2>
        <p className="mt-4 text-sm leading-snug font-bold">
          EVERY PHOTO FROM THE TOUR, IN ONE PICTURE. ADD YOURS, THEN ZOOM IN AND SEE EVERYONE ELSE'S.
        </p>
        <div className="mt-5 grid gap-2.5">
          <button ref={first} type="button" onClick={onAdd} className="box-ink h-14 text-base font-bold tracking-wider">
            ADD YOUR PHOTO
          </button>
          <button type="button" onClick={onExplore} className="box-white h-12 text-sm font-bold tracking-wider">
            JUST LOOK AROUND
          </button>
        </div>
      </div>
    </div>
  );
}
