import { SHOWS } from "../config/shows";
import { useColourway } from "../lib/colourway";
import { showPath } from "../routes";
import { Corner, LiveStack, Script, Spaced, TogetherMark } from "./Poster";

/** Tour overview, laid out like the tour poster: corners, the two wordmarks, and date boxes. */
export function HomePage() {
  const { colourway } = useColourway();
  return (
    <main className="min-h-full pt-safe pb-safe px-safe" style={{ background: colourway.value, color: colourway.text }}>
      <div className="mx-auto flex max-w-md flex-col gap-5">
        <header className="flex justify-between">
          <Corner lines={["TOGETHER", "TOGETHER"]} />
          <Corner lines={["TOUR", "2026"]} align="right" />
        </header>

        <section aria-label="Together, together: all of us" className="relative">
          <TogetherMark word="top" className="relative z-10 mx-auto w-[78%]" />
          <h1 className="-my-[4%] text-center text-[clamp(4rem,22vw,7.5rem)] leading-[0.82] font-bold tracking-tight" style={{ color: "#121c16" }}>
            ALL OF
            <br />
            US
          </h1>
          <TogetherMark word="bottom" className="relative z-10 mx-auto w-[78%]" />
          <div className="absolute inset-x-0 bottom-[30%] flex justify-between">
            <LiveStack />
            <LiveStack align="right" />
          </div>
        </section>

        <p className="text-center text-sm font-bold tracking-wider">
          ONE NIGHT. THOUSANDS OF PHOTOS.
          <br />
          ONE PICTURE, TOGETHER.
        </p>

        <nav aria-label="Shows" className="grid grid-cols-2 gap-3">
          {SHOWS.map((show) => {
            const body = (
              <>
                <span className="block text-[1.35rem] leading-[0.95] font-bold">{show.city.toUpperCase()}</span>
                <span className="block text-[1.35rem] leading-[0.95] font-bold">{show.night.toUpperCase()}</span>
                <Spaced text="2026" className="mt-1 text-lg font-bold" />
                <span className="mt-1 block text-xs font-bold tracking-wider">{show.available ? "SEE THE MOSAIC →" : "COMING SOON"}</span>
              </>
            );
            return show.available ? (
              <a key={show.id} href={showPath(show.id)} className="box-ink block px-3 py-2.5 active:bg-white active:text-[#121c16]">
                {body}
              </a>
            ) : (
              <div key={show.id} className="box-ink px-3 py-2.5 opacity-60">
                {body}
              </div>
            );
          })}
        </nav>

        <div>
          <Script className="text-center">with very special guest:</Script>
          <div className="box-white mt-2 px-4 pt-2 pb-1.5">
            <Spaced text="YOU" className="text-[2.6rem] leading-none font-bold" />
            <Spaced text="AND EVERYONE THERE" className="mt-1 text-[10px] font-bold" />
          </div>
        </div>

        <p className="text-center text-[11px] font-bold tracking-wider opacity-80">PROTOTYPE · SAMPLE PHOTOS ARE GENERATED · NOTHING IS UPLOADED</p>
      </div>
    </main>
  );
}
