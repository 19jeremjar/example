import { useEffect, useState } from "react";
import { findShow } from "./config/shows";
import { HomePage } from "./components/HomePage";
import { ShowPage } from "./components/ShowPage";
import { parseRoute } from "./routes";
import { Spaced, TogetherMark } from "./components/Poster";

export function App() {
  const [path, setPath] = useState(() => location.pathname);
  useEffect(() => {
    const onPop = () => setPath(location.pathname);
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  const route = parseRoute(path);
  if (route.kind === "home") return <HomePage />;
  if (route.kind === "show") {
    const show = findShow(route.showId);
    if (show?.available) return <ShowPage key={show.id} show={show} photoId={route.photoId} />;
  }
  return <NotFound />;
}

function NotFound() {
  return (
    <main className="flex min-h-full flex-col items-stretch justify-center gap-5 px-safe">
      <TogetherMark word="top" className="mx-auto w-[min(70vw,320px)]" />
      <div className="box-ink mx-auto w-full max-w-md px-4 pt-3 pb-2.5">
        <h1 className="text-[clamp(2.2rem,11vw,3.2rem)] leading-[0.9] font-bold tracking-tight">
          THIS SHOW
          <br />
          ISN'T HERE
        </h1>
      </div>
      <a href="/" className="box-white mx-auto block h-14 w-full max-w-md px-4 pt-4 text-sm font-bold">
        <Spaced text="SEE ALL SHOWS" />
      </a>
    </main>
  );
}
