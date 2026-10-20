import { useEffect, useState } from "react";
import { renderStory, shareStory } from "../lib/story";

type Props = {
  photoUrl: string;
  frameColor: string;
  background: string;
  onClose?: () => void;
  onResult: (message: string) => void;
  /** "card": the after-upload banner. "button": just the button (photo detail). */
  variant?: "card" | "button";
};

/**
 * SHARE: prepares the story image as soon as it's shown, so tapping opens the share sheet
 * immediately (Safari only allows sharing straight from a tap).
 */
export function ShareCard({ photoUrl, frameColor, background, onClose, onResult, variant = "card" }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBlob(null);
    renderStory({ photoUrl, frameColor, background })
      .then((b) => !cancelled && setBlob(b))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [photoUrl, frameColor, background]);

  const share = async () => {
    if (!blob) return;
    try {
      const result = await shareStory(blob, location.origin);
      if (result === "downloaded") onResult("STORY IMAGE SAVED. POST IT FROM YOUR PHOTOS.");
    } catch {
      onResult("COULDN'T OPEN SHARING. TRY AGAIN.");
    }
  };

  const button = (
    <button type="button" onClick={share} disabled={!blob} className="box-white h-12 shrink-0 px-5 text-sm font-bold tracking-wider">
      {failed ? "UNAVAILABLE" : blob ? "SHARE" : "…"}
    </button>
  );

  if (variant === "button") {
    return (
      <button type="button" onClick={share} disabled={!blob} className="box-ink h-14 w-full px-4 text-sm font-bold tracking-wider">
        {failed ? "SHARING UNAVAILABLE" : blob ? "SHARE TO YOUR STORY" : "GETTING IT READY…"}
      </button>
    );
  }

  return (
    <div role="status" className="box-ink pointer-events-auto flex w-full max-w-md items-center gap-3 py-2.5 pr-2.5 pl-4 animate-rise">
      <p className="flex-1 text-sm leading-tight font-bold tracking-wider">
        YOU'RE ON THE
        <br />
        TOGETHER WALL
      </p>
      {button}
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-9 items-center justify-center text-xl font-bold">
          ✕
        </button>
      )}
    </div>
  );
}
