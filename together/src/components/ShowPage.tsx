import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ShowConfig } from "../config/shows";
import { copyText } from "../lib/clipboard";
import { COLOURWAYS } from "../config/palette";
import { readFlag, readString, writeFlag, writeString } from "../lib/storage";
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
const COLOURWAY_KEY = "tt-colourway";

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

  if (failed) {
    return <p className="p-6 text-sm">The artwork couldn't load. Refresh to try again.</p>;
  }
  if (!built) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs font-bold tracking-widest text-ink/60">TOGETHER, TOGETHER</p>
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
  const [colourway, setColourway] = useState(() => {
    const saved = COLOURWAYS.findIndex((c) => c.name === readString(COLOURWAY_KEY));
    return saved >= 0 ? saved : 0;
  });
  const background = COLOURWAYS[colourway].value;
  useEffect(() => {
    document.body.style.background = background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", background);
    return () => {
      document.body.style.background = "";
    };
  }, [background]);
  const nextColourway = () => {
    const next = (colourway + 1) % COLOURWAYS.length;
    setColourway(next);
    writeString(COLOURWAY_KEY, COLOURWAYS[next].name);
  };
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
      setToast("This spot's still free. Add your photo to fill one.");
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
    setToast(ok ? "Link copied." : "Couldn't copy the link.");
  };

  const addLocalPhoto = async (urls: LocalImageUrls) => {
    const index = mosaic.fillOrder.find((i) => !localsRef.current.has(i));
    if (index === undefined) {
      [urls.full, urls.medium, urls.thumb].forEach(URL.revokeObjectURL);
      setToast("The mosaic is full!");
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
    setToast("You're in the mosaic. Demo only: not uploaded or published.");
  };

  const resetLocal = () => {
    const urls = [...localsRef.current.values()].flatMap((p) => [p.thumbnailUrl, p.mediumUrl ?? "", p.fullImageUrl]);
    cache.forget(urls);
    urls.forEach((u) => u && URL.revokeObjectURL(u));
    localsRef.current = new Map();
    setLocals(new Map());
    setVersion((v) => v + 1);
    setUploadOpen(false);
    setToast("Your demo photos have been removed.");
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
      />

      <header ref={headerRef} className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between pt-safe px-safe pb-3">
        <a
          href="/"
          className="pointer-events-auto px-1.5 py-1 text-[11px] leading-[1.15] font-bold tracking-wider text-white"
          style={{ background }}
        >
          TOGETHER
          <br />
          TOGETHER
        </a>
        <p className="px-1.5 py-1 text-right text-[11px] leading-[1.15] font-bold tracking-wider text-white" style={{ background }}>
          {show.label.split(" · ")[0]}
          <br />
          {show.label.split(" · ")[1]}
        </p>
      </header>

      <div className="pointer-events-none absolute right-0 flex flex-col items-end gap-px px-safe" style={{ bottom: insets.bottom + 8 }}>
        <ZoomButton label={`Background colour: ${COLOURWAYS[colourway].name}. Tap to change`} onClick={nextColourway}>
          <span aria-hidden className="grid h-5 w-5 grid-cols-2 ring-1 ring-white">
            {COLOURWAYS.map((c) => (
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
          <p className="max-w-[calc(100%-64px)] bg-ink px-3 py-2 text-center text-xs font-bold text-paper animate-rise">{toast}</p>
        ) : hint ? (
          <p className="max-w-[calc(100%-64px)] bg-ink/85 px-3 py-2 text-center text-xs font-bold text-paper animate-rise">
            Pinch to explore. Tap a photo to see the moment.
          </p>
        ) : null}
      </div>

      <footer ref={footerRef} className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 pt-3 pb-safe px-safe">
        <p className="px-1.5 py-0.5 text-[11px] leading-[1.3] font-bold tracking-wider text-white" style={{ background }}>
          {total.toLocaleString("en-AU")} PHOTOS
          <br />
          LIVE · DEMO
        </p>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex h-12 items-center gap-2.5 rounded-full bg-ink pr-5 pl-4 text-xs font-bold tracking-[0.12em] text-paper active:bg-pink"
        >
          <span aria-hidden className="text-lg leading-none font-normal">
            +
          </span>
          ADD YOUR PHOTO
        </button>
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
        <UploadSheet localCount={locals.size} onClose={() => setUploadOpen(false)} onSubmit={addLocalPhoto} onReset={resetLocal} />
      )}
    </main>
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
