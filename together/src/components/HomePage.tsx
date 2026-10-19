import { SHOWS } from "../config/shows";
import { showPath } from "../routes";

const BAND = "linear-gradient(180deg,#ED4E85 0%,#F17B43 25%,#F8CE4E 50%,#45B9D4 75%,#5CAB66 100%)";

export function HomePage() {
  return (
    <main className="flex min-h-full flex-col justify-between pt-safe pb-safe px-safe">
      <header className="flex justify-between text-xs leading-tight font-bold tracking-wider">
        <p>
          TOGETHER
          <br />
          TOGETHER
        </p>
        <p className="text-right">
          TOUR
          <br />
          DEMO
        </p>
      </header>

      <section className="py-10">
        <div className="mb-6 h-3 w-24" style={{ background: BAND }} aria-hidden />
        <h1 className="text-[clamp(3rem,14vw,7rem)] leading-[0.88] font-bold tracking-tight">
          A mosaic
          <br />
          made of
          <br />
          the night.
        </h1>
        <p className="mt-6 max-w-sm text-base text-ink/70">
          Every show gets its own artwork, built from the photos fans take in the room.
        </p>
      </section>

      <nav aria-label="Shows">
        <ul className="divide-y divide-ink/20 border-y border-ink/20">
          {SHOWS.map((show) => (
            <li key={show.id}>
              {show.available ? (
                <a href={showPath(show.id)} className="flex min-h-14 items-center justify-between py-3 text-lg font-bold hover:text-yellow">
                  <span>
                    {show.city} <span className="text-ink/50">·</span> {show.night}
                  </span>
                  <span aria-hidden>→</span>
                </a>
              ) : (
                <div className="flex min-h-14 items-center justify-between py-3 text-lg font-bold text-ink/40">
                  <span>
                    {show.city} · {show.night}
                  </span>
                  <span className="text-xs tracking-wider">COMING SOON</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink/50">Prototype. Sample photos are generated; nothing is uploaded.</p>
      </nav>
    </main>
  );
}
