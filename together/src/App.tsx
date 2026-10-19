import { useEffect, useState } from "react";
import { findShow } from "./config/shows";
import { HomePage } from "./components/HomePage";
import { ShowPage } from "./components/ShowPage";
import { parseRoute } from "./routes";

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
    <main className="flex min-h-full flex-col items-start justify-center gap-6 px-safe">
      <p className="text-xs font-bold tracking-widest">TOGETHER, TOGETHER</p>
      <h1 className="text-5xl leading-none font-bold">This show isn't here.</h1>
      <a href="/" className="border border-ink px-5 py-3 text-sm font-bold tracking-wider hover:bg-ink hover:text-paper">
        SEE ALL SHOWS
      </a>
    </main>
  );
}
