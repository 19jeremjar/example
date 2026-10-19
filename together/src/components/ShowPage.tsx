import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShowConfig } from "../config/shows";
import { copyText } from "../lib/clipboard";
import { COLOURWAYS } from "../config/palette";
import { useColourway } from "../lib/colourway";
import { readFlag, writeFlag } from "../lib/storage";
import { TogetherMark } from "./Poster";
import type { Camera, Insets } from "../mosaic/camera";
import { fitZoom } from "../mosaic/camera";
import { buildMosaic, tileIndexById } from "../mosaic/generate";
import { ImageCache } from "../mosaic/imageCache";
import { loadImage } from "../mosaic/imageLoader";
import type { FrameInfo } from "../mosaic/renderer";
import { createStencilPainter, rasteriseMask, type StencilPainter } from "../mosaic/stencil";
import type { Mosaic, MosaicPhoto } from "../mosaic/types";
import { navigate, photoPath, showPath } from "../routes";
import { MosaicView, type MosaicViewHandle } from "./MosaicView";
import { PhotoDetail } from "./PhotoDetail";
import { type LocalImageUrls, UploadSheet } from "./UploadSheet";

const HINT_KEY = "tt-hint-seen";

type Detail = { photo: MosaicPhoto | null; viaTap: boolean };

export function ShowPage({ show, photoId }: { show: ShowConfig; photoId?: string }) {
  const [built, setBuilt] = useState<{ mosaic: Mosaic; stencil: StencilPainter } | null>(null);
  const [failed, setFailed] = useState(false);
  const cache = useMemo(() => new ImageCache(loadImage, 500), []);

  useEffect(() => {
    let cancelled = false;
    createStencilPainter(show.stencil, show.cols, show.rows)
      .then((stencil) => {
        if (cancelled) return;
        setBuilt({ stencil, mosaic: buildMosaic(show, rasteriseMask(stencil, show.cols, show.rows)) });
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [show]);

  useEffect(() => {
    // Exposed for automated checks (e.g. "no image requests at low zoom").
    (window as unknown as { __mosaicStats: unknown }).__mosaicStats = cache.stats;
    return () => cache.clear();
  }, [cache]);

  if (failed || !built) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 px-safe">
        <TogetherMark word="top" className="w-[min(70vw,320px)]" />
        <p className="box-ink px-3 py-2 text-xs font-bold tracking-widest">
          {failed ? "THE ARTWORK COULDN'T LOAD. REFRESH TO TRY AGAIN." : "PUTTING IT TOGETHER…"}
        </p>
        <TogetherMark word="bottom" className="w-[min(70vw,320px)]" />
      </div>
    );
  }
  return <ShowMosaic mosaic={built.mosaic} stencil={built.stencil} cache={cache} photoId={photoId} />;
}

type ShowMosaicProps = { mosaic: Mosaic; stencil: StencilPainter; cache: ImageCache; photoId?: string };

function ShowMosaic({ mosaic, stencil, cache, photoId }: ShowMosaicProps) {
  const { show } = mosaic;
  const view = useRef<MosaicViewHandle>(null);
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [insets, setInsets] = useState<Insets>({ top: 64, right: 0, bottom: 112, left: 0 });

  // Fan photos added this session: tile index → photo. Object URLs only, never persisted.
  const [locals, setLocals] = useState<Map<number, MosaicPhoto>>(() => new Map());
  const localsRef = useRef(locals);
  localsRef.current = locals;
  const [version, setVersion] = useState(0);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hint, setHint] = useState(() => !readFlag(HINT_KEY));
  const { colourway, next: nextColourway } = useColourway();
  const background = colourway.value;
  const labelStyle = { background, color: colourway.text };
  // ADD YOUR PHOTO sits between the two words; once zoomed in it docks to the corner.
  const centreRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);
  useEffect(() => {
    document.body.style.background = background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
    return () => {
      document.body.style.background = "";
    };
  }, [background]);
  const [debug] = useState(() => new URLSearchParams(location.search).has("debug"));
  const [debugText, setDebugText] = useState("");

  const photoAt = useCallback(
    (index: number): MosaicPhoto | undefined => {
      const local = localsRef.current.get(index);
      if (local) return local;
      const id = mosaic.tiles[index]?.photoId;
      const photo = id ? mosaic.photos.get(id) : undefined;
      return photo && !photo.removed ? photo : undefined;
    },
    [mosaic],
  );

  const sampleCount = useMemo(() => [...mosaic.photos.values()].filter((p) => !p.removed).length, [mosaic]);

  useEffect(() => {
    const measure = () =>
      setInsets({
        top: headerRef.current?.offsetHeight ?? 64,
        right: 0,
        bottom: footerRef.current?.offsetHeight ?? 112,
        left: 0,
      });
    measure();
    const ro = new ResizeObserver(measure);
    if (headerRef.current) ro.observe(headerRef.current);
    if (footerRef.current) ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => dismissHint(), 8000);
    return () => clearTimeout(t);
  }, [hint]);

  function dismissHint() {
    setHint(false);
    writeFlag(HINT_KEY);
  }

  // Follow the URL: open a deep-linked photo (flying to it first), close when it's removed from the URL.
  const detailRef = useRef(detail);
  detailRef.current = detail;
  useEffect(() => {
    if (!photoId) {
      if (detailRef.current?.photo?.source === "sample") setDetail(null);
      return;
    }
    if (detailRef.current?.photo?.id === photoId) return;
    const photo = mosaic.photos.get(photoId);
    if (!photo || photo.removed) {
      setDetail({ photo: null, viaTap: false });
      return;
    }
    let cancelled = false;
    const index = tileIndexById(mosaic, photo.tileId);
    // Let the artwork show for a beat, then fly in.
    const t = setTimeout(() => {
      void view.current?.flyToTile(index, { highlight: true }).then(() => {
        if (!cancelled) setDetail({ photo, viaTap: false });
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [photoId, mosaic]);

  const onTapTile = (index: number, info: FrameInfo) => {
    dismissHint();
    if (info.mix < 0.35 || mosaic.tiles[index].region !== "letter") return;
    const photo = photoAt(index);
    if (!photo) {
      setToast("THIS SPOT'S SAVED FOR YOU. ADD YOUR PHOTO TO FILL IT.");
      return;
    }
    view.current?.highlight(index);
    setDetail({ photo, viaTap: true });
    if (photo.source === "sample") navigate(photoPath(show.id, photo.id));
  };

  const closeDetail = () => {
    const current = detail;
    setDetail(null);
    if (current?.photo?.source === "local" || !photoId) return;
    if (current?.viaTap) history.back();
    else navigate(showPath(show.id), { replace: true });
  };

  const copyLink = async () => {
    if (!detail?.photo) return;
    const ok = await copyText(location.origin + photoPath(show.id, detail.photo.id));
    setToast(ok ? "LINK COPIED. SEND IT TO WHOEVER YOU WERE WITH." : "COULDN'T COPY THE LINK.");
  };

  const addLocalPhoto = async (urls: LocalImageUrls) => {
    const index = mosaic.fillOrder.find((i) => !localsRef.current.has(i));
    if (index === undefined) {
      [urls.full, urls.medium, urls.thumb].forEach(URL.revokeObjectURL);
      setToast("THE MOSAIC IS FULL. WHAT A NIGHT.");
      setUploadOpen(false);
      return;
    }
    const n = localsRef.current.size + 1;
    const photo: MosaicPhoto = {
      id: `local-${n}`,
      thumbnailUrl: urls.thumb,
      mediumUrl: urls.medium,
      fullImageUrl: urls.full,
      showId: show.id,
      tileId: mosaic.tiles[index].id,
      source: "local",
    };
    const next = new Map(localsRef.current).set(index, photo);
    localsRef.current = next;
    setLocals(next);
    setVersion((v) => v + 1);
    setUploadOpen(false);
    await view.current?.flyToTile(index, { highlight: true });
    setToast("YOU'RE IN. TOGETHER, TOGETHER. (DEMO ONLY: NOT UPLOADED.)");
  };

  const resetLocal = () => {
    const urls = [...localsRef.current.values()].flatMap((p) => [p.thumbnailUrl, p.mediumUrl ?? "", p.fullImageUrl]);
    cache.forget(urls);
    urls.forEach((u) => u && URL.revokeObjectURL(u));
    localsRef.current = new Map();
    setLocals(new Map());
    setVersion((v) => v + 1);
    setUploadOpen(false);
    setToast("YOUR DEMO PHOTOS HAVE BEEN REMOVED.");
  };

  // Free object URLs when leaving the show.
  useEffect(
    () => () => {
      for (const p of localsRef.current.values()) [p.thumbnailUrl, p.mediumUrl, p.fullImageUrl].forEach((u) => u && URL.revokeObjectURL(u));
    },
    [],
  );

  const onFrame = useCallback(
    (info: FrameInfo, cam: Camera) => {
      if (!debug) return;
      const s = cache.stats;
      const fit = fitZoom(mosaic, { width: innerWidth, height: innerHeight, insets });
      setDebugText(
        `${(cam.zoom / fit).toFixed(2)}× · ${info.tilePx.toFixed(1)}px/tile · mix ${info.mix.toFixed(2)} · ${info.visibleTiles} tiles · ${(info.renderMs ?? 0).toFixed(1)}ms\n` +
          `img req ${s.requested} · ok ${s.loaded} · err ${s.failed} · evict ${s.evicted} · cached ${s.size}`,
      );
    },
    [debug, cache, mosaic, insets],
  );

  const total = sampleCount + locals.size;

  return (
    <main className="fixed inset-0 overflow-hidden" style={{ background }}>
      <MosaicView
        ref={view}
        mosaic={mosaic}
        stencil={stencil}
        cache={cache}
        photoAt={photoAt}
        version={version}
        background={background}
        insets={insets}
        onTapTile={onTapTile}
        onInteract={hint ? dismissHint : undefined}
        onFrame={debug ? onFrame : undefined}
        centreAnchor={centreRef}
        onDockChange={setDocked}
      />

      <div ref={centreRef} className="pointer-events-none absolute top-0 left-0" style={{ visibility: "hidden" }}>
        <PlusButton onClick={() => setUploadOpen(true)} />
      </div>

      <header ref={headerRef} className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between pt-safe px-safe pb-3">
        <a
          href="/"
          className="pointer-events-auto px-1.5 py-1 text-[11px] leading-[1.15] font-bold tracking-wider"
          style={labelStyle}
        >
          TOGETHER
          <br />
          TOGETHER
        </a>
        <p className="px-1.5 py-1 text-right text-[11px] leading-[1.15] font-bold tracking-wider" style={labelStyle}>
          {show.label.split(" · ")[0]}
          <br />
          {show.label.split(" · ")[1]}
        </p>
      </header>

      <div className="pointer-events-none absolute right-0 flex flex-col items-end gap-px px-safe" style={{ bottom: insets.bottom + 8 }}>
        <ZoomButton label={`Background colour: ${colourway.name}. Tap to change`} onClick={nextColourway}>
          <span aria-hidden className="grid h-5 w-5 grid-cols-2 ring-1 ring-white">
            {/* Four poster colours as a 2×2 swatch. */}
            {COLOURWAYS.filter((c) => c.name !== "White").map((c) => (
              <span key={c.name} style={{ background: c.value }} />
            ))}
          </span>
        </ZoomButton>
        <ZoomButton label="Zoom in" onClick={() => (dismissHint(), view.current?.zoomBy(1.8))}>
          +
        </ZoomButton>
        <ZoomButton label="Zoom out" onClick={() => (dismissHint(), view.current?.zoomBy(1 / 1.8))}>
          −
        </ZoomButton>
        <ZoomButton label="Show the whole artwork" onClick={() => view.current?.fit()}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" />
          </svg>
        </ZoomButton>
      </div>

      <div className="pointer-events-none absolute inset-x-0 flex justify-center px-safe" style={{ bottom: insets.bottom + 8 }} aria-live="polite">
        {toast ? (
          <p className="box-ink max-w-[calc(100%-64px)] px-3 py-2 text-center text-xs font-bold tracking-wider animate-rise">{toast}</p>
        ) : hint ? (
          <p className="box-ink max-w-[calc(100%-64px)] px-3 py-2 text-center text-xs font-bold tracking-wider animate-rise">
            PINCH TO EXPLORE. TAP A PHOTO TO SEE THE MOMENT.
          </p>
        ) : null}
      </div>

      <footer ref={footerRef} className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 pt-3 pb-safe px-safe">
        <p className="px-1.5 py-0.5 text-[11px] leading-[1.3] font-bold tracking-wider" style={labelStyle}>
          {total.toLocaleString("en-AU")} MOMENTS
          <br />
          SHARED TOGETHER
        </p>
        <div className={docked ? "" : "invisible"} aria-hidden={!docked}>
          <AddButton onClick={() => setUploadOpen(true)} />
        </div>
      </footer>

      {debug && (
        <pre className="pointer-events-none absolute left-2 whitespace-pre-wrap bg-white/80 p-2 text-[10px] text-green" style={{ top: insets.top }}>
          {debugText}
        </pre>
      )}

      {detail && (
        <PhotoDetail
          photo={detail.photo}
          showLabel={show.label}
          frameColor={detail.photo ? mosaic.tiles[tileIndexById(mosaic, detail.photo.tileId)]?.color : undefined}
          cache={cache}
          onClose={closeDetail}
          onCopyLink={copyLink}
        />
      )}
      {uploadOpen && (
        <UploadSheet night={show.night} localCount={locals.size} onClose={() => setUploadOpen(false)} onSubmit={addLocalPhoto} onReset={resetLocal} />
      )}
    </main>
  );
}

/** The big square + that sits between the two words. */
function PlusButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add your photo"
      title="Add your photo"
      className="box-ink plus-glow pointer-events-auto relative block h-[4.5rem] w-[4.5rem] active:bg-white active:text-[#121c16]"
    >
      <span aria-hidden className="absolute top-1/2 left-1/2 h-1.5 w-9 -translate-x-1/2 -translate-y-1/2 bg-current" />
      <span aria-hidden className="absolute top-1/2 left-1/2 h-9 w-1.5 -translate-x-1/2 -translate-y-1/2 bg-current" />
    </button>
  );
}

/** Square ink button set like the poster's date boxes: heavy, tightly set uppercase, no icon. */
function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="box-ink pointer-events-auto block px-3.5 pt-2.5 pb-2 text-[1.3rem] leading-none font-bold tracking-[-0.01em] whitespace-nowrap active:bg-white active:text-[#121c16]"
    >
      ADD YOUR PHOTO
    </button>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="pointer-events-auto flex h-11 w-11 items-center justify-center bg-ink text-xl leading-none font-bold text-white active:bg-white active:text-ink"
    >
      {children}
    </button>
  );
}
