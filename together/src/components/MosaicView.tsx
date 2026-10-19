import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  type Camera,
  type Insets,
  type Viewport,
  cameraForTile,
  clampCamera,
  easeInOutCubic,
  fitCamera,
  hitTest,
  interpolateCamera,
  worldToScreen,
  zoomAround,
  zoomLimits,
} from "../mosaic/camera";
import { attachGestures } from "../mosaic/gestures";
import type { ImageCache } from "../mosaic/imageCache";
import { type FrameInfo, MosaicRenderer } from "../mosaic/renderer";
import type { StencilPainter } from "../mosaic/stencil";
import type { Mosaic, MosaicPhoto } from "../mosaic/types";
import { prefersReducedMotion } from "../lib/motion";

export type MosaicViewHandle = {
  zoomBy(factor: number): void;
  fit(): void;
  /** Animates to a tile; resolves when the camera arrives. */
  flyToTile(index: number, opts?: { highlight?: boolean; duration?: number }): Promise<void>;
  highlight(index: number): void;
  getCamera(): Camera;
};

type Props = {
  mosaic: Mosaic;
  stencil: StencilPainter;
  cache: ImageCache;
  photoAt: (index: number) => MosaicPhoto | undefined;
  /** Bump to redraw after photos change. */
  version: number;
  /** Page colour around the artwork. */
  background: string;
  insets: Insets;
  onTapTile: (index: number, info: FrameInfo) => void;
  onInteract?: () => void;
  onFrame?: (info: FrameInfo, camera: Camera) => void;
  /** Element kept centred on the middle of the artwork while the whole piece is in view. */
  centreAnchor?: React.RefObject<HTMLElement | null>;
  /** Called when the anchor leaves (true) or returns to (false) the view. */
  onDockChange?: (docked: boolean) => void;
};

type Animation = { from: Camera; to: Camera; start: number; duration: number; done: () => void };

export const MosaicView = forwardRef<MosaicViewHandle, Props>(function MosaicView(props, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  // Mutable engine state lives in a ref so gestures never wait on React renders.
  const engine = useRef({
    renderer: null as MosaicRenderer | null,
    vp: { width: 1, height: 1, insets: props.insets } as Viewport,
    camera: { x: 0, y: 0, zoom: 1 } as Camera,
    initialised: false,
    raf: 0,
    anim: null as Animation | null,
    inertia: null as { vx: number; vy: number; last: number } | null,
    pinchFrom: null as Camera | null,
    highlight: undefined as { index: number; start: number } | undefined,
    lastInfo: { mix: 0, tilePx: 0, visibleTiles: 0, animating: false } as FrameInfo,
    docked: undefined as boolean | undefined,
    requestFrame: () => {},
  });

  useEffect(() => {
    const e = engine.current;
    const canvas = canvasRef.current!;
    const container = containerRef.current!;
    const { mosaic, stencil, cache } = propsRef.current;
    const renderer = new MosaicRenderer(canvas, mosaic, stencil, cache, (i) => propsRef.current.photoAt(i));
    e.renderer = renderer;
    renderer.background = propsRef.current.background;

    const setCamera = (cam: Camera) => {
      e.camera = clampCamera(cam, mosaic, e.vp);
    };

    const frame = (now: number) => {
      e.raf = 0;
      let busy = false;
      if (e.anim) {
        const t = e.anim.duration > 0 ? Math.min(1, (now - e.anim.start) / e.anim.duration) : 1;
        e.camera = interpolateCamera(e.anim.from, e.anim.to, easeInOutCubic(t));
        if (t >= 1) {
          e.camera = clampCamera(e.anim.to, mosaic, e.vp);
          const done = e.anim.done;
          e.anim = null;
          done();
        } else busy = true;
      } else if (e.inertia) {
        const dt = Math.min(48, now - e.inertia.last);
        e.inertia.last = now;
        setCamera({
          ...e.camera,
          x: e.camera.x - (e.inertia.vx * dt) / e.camera.zoom,
          y: e.camera.y - (e.inertia.vy * dt) / e.camera.zoom,
        });
        const decay = Math.pow(0.994, dt);
        e.inertia.vx *= decay;
        e.inertia.vy *= decay;
        if (Math.hypot(e.inertia.vx, e.inertia.vy) < 0.02) e.inertia = null;
        else busy = true;
      }
      const t0 = performance.now();
      const info = renderer.render({ camera: e.camera, highlight: e.highlight, now });
      info.renderMs = performance.now() - t0;
      e.lastInfo = info;
      propsRef.current.onFrame?.(info, e.camera);
      const anchor = propsRef.current.centreAnchor?.current;
      if (anchor) {
        const p = worldToScreen(e.camera, e.vp, mosaic.cols / 2, mosaic.rows / 2);
        const half = anchor.offsetHeight / 2;
        const docked =
          e.camera.zoom > zoomLimits(mosaic, e.vp).min * 1.35 ||
          p.y - half < e.vp.insets.top ||
          p.y + half > e.vp.height - e.vp.insets.bottom ||
          p.x < 0 ||
          p.x > e.vp.width;
        anchor.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
        anchor.style.visibility = docked ? "hidden" : "visible";
        if (docked !== e.docked) {
          e.docked = docked;
          propsRef.current.onDockChange?.(docked);
        }
      }
      if (busy || info.animating) requestFrame();
    };
    const requestFrame = () => {
      if (!e.raf) e.raf = requestAnimationFrame(frame);
    };
    e.requestFrame = requestFrame;
    cache.onLoad = requestFrame;

    const resize = () => {
      const r = container.getBoundingClientRect();
      const prev = e.vp;
      e.vp = { width: r.width, height: r.height, insets: propsRef.current.insets };
      renderer.resize(e.vp, window.devicePixelRatio || 1);
      if (!e.initialised) {
        e.camera = fitCamera(mosaic, e.vp);
        e.initialised = true;
      } else {
        // Keep whatever was centred in view; refit if the user was at the fitted view.
        const wasFit = e.camera.zoom <= zoomLimits(mosaic, prev).min * 1.001;
        setCamera(wasFit ? fitCamera(mosaic, e.vp) : e.camera);
      }
      requestFrame();
    };
    // Polaroid captions use the handwritten web font; redraw once it arrives.
    void document.fonts?.ready.then(requestFrame);
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const stopMotion = () => {
      e.inertia = null;
      if (e.anim) {
        const done = e.anim.done;
        e.anim = null;
        done();
      }
    };

    const detach = attachGestures(canvas, {
      interact() {
        stopMotion();
        propsRef.current.onInteract?.();
      },
      pan(dx, dy) {
        setCamera({ ...e.camera, x: e.camera.x - dx / e.camera.zoom, y: e.camera.y - dy / e.camera.zoom });
        requestFrame();
      },
      zoom(factor, sx, sy) {
        const { min, max } = zoomLimits(mosaic, e.vp);
        const zoom = Math.min(max, Math.max(min, e.camera.zoom * factor));
        setCamera(zoomAround(e.camera, e.vp, zoom, sx, sy));
        requestFrame();
      },
      pinchStart() {
        e.pinchFrom = e.camera;
      },
      pinch(scale, midX, midY, startMidX, startMidY) {
        const from = e.pinchFrom ?? e.camera;
        const { min, max } = zoomLimits(mosaic, e.vp);
        const zoom = Math.min(max, Math.max(min, from.zoom * scale));
        // Zoom around the starting midpoint, then follow the fingers as they move.
        const zoomed = zoomAround(from, e.vp, zoom, startMidX, startMidY);
        setCamera({ zoom, x: zoomed.x - (midX - startMidX) / zoom, y: zoomed.y - (midY - startMidY) / zoom });
        requestFrame();
      },
      release(vx, vy) {
        if (prefersReducedMotion()) return;
        e.inertia = { vx, vy, last: performance.now() };
        requestFrame();
      },
      tap(sx, sy) {
        if (e.lastInfo.mix < 0.35) {
          // Photos aren't visible yet: a tap zooms in towards that spot instead.
          const { max } = zoomLimits(mosaic, e.vp);
          animateTo(zoomAround(e.camera, e.vp, Math.min(max, e.camera.zoom * 2.4), sx, sy), 320);
          return;
        }
        const index = hitTest(e.camera, e.vp, mosaic, sx, sy);
        if (index >= 0) propsRef.current.onTapTile(index, e.lastInfo);
      },
      doubleTap(sx, sy) {
        const { min, max } = zoomLimits(mosaic, e.vp);
        const target =
          e.camera.zoom >= max * 0.95
            ? fitCamera(mosaic, e.vp)
            : clampCamera(zoomAround(e.camera, e.vp, Math.min(max, Math.max(min, e.camera.zoom * 2.4)), sx, sy), mosaic, e.vp);
        animateTo(target, 320);
      },
    });

    return () => {
      detach();
      ro.disconnect();
      cancelAnimationFrame(e.raf);
      e.raf = 0;
      cache.onLoad = () => {};
      e.renderer = null;
    };
    // The mosaic and cache are fixed for the lifetime of this view (keyed by show).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function animateTo(target: Camera, duration: number): Promise<void> {
    const e = engine.current;
    e.inertia = null;
    e.anim?.done();
    return new Promise((resolve) => {
      e.anim = {
        from: e.camera,
        to: clampCamera(target, props.mosaic, e.vp),
        start: performance.now(),
        duration: prefersReducedMotion() ? 0 : duration,
        done: resolve,
      };
      e.requestFrame();
    });
  }

  // Redraw when photos or insets change.
  useEffect(() => {
    const e = engine.current;
    e.renderer?.refreshBase();
    e.vp = { ...e.vp, insets: props.insets };
    e.requestFrame();
  }, [props.version, props.insets]);

  useEffect(() => {
    const e = engine.current;
    if (e.renderer) e.renderer.background = props.background;
    e.requestFrame();
  }, [props.background]);

  useImperativeHandle(ref, () => ({
    zoomBy(factor) {
      const e = engine.current;
      const { min, max } = zoomLimits(props.mosaic, e.vp);
      const zoom = Math.min(max, Math.max(min, e.camera.zoom * factor));
      const cx = e.vp.insets.left + (e.vp.width - e.vp.insets.left - e.vp.insets.right) / 2;
      const cy = e.vp.insets.top + (e.vp.height - e.vp.insets.top - e.vp.insets.bottom) / 2;
      void animateTo(zoomAround(e.camera, e.vp, zoom, cx, cy), 260);
    },
    fit() {
      void animateTo(fitCamera(props.mosaic, engine.current.vp), 420);
    },
    async flyToTile(index, opts = {}) {
      const e = engine.current;
      const target = cameraForTile(props.mosaic, e.vp, index);
      const distance = Math.abs(Math.log(target.zoom / e.camera.zoom));
      await animateTo(target, opts.duration ?? Math.min(1600, 500 + distance * 260));
      if (opts.highlight) this.highlight(index);
    },
    highlight(index) {
      const e = engine.current;
      e.highlight = { index, start: performance.now() };
      e.requestFrame();
    },
    getCamera() {
      return engine.current.camera;
    },
  }));

  const onKeyDown = (ev: React.KeyboardEvent) => {
    const e = engine.current;
    const step = 80 / e.camera.zoom;
    const pan = (dx: number, dy: number) => {
      e.camera = clampCamera({ ...e.camera, x: e.camera.x + dx, y: e.camera.y + dy }, props.mosaic, e.vp);
      e.requestFrame();
    };
    const handle = ref && typeof ref === "object" ? ref.current : null;
    switch (ev.key) {
      case "ArrowLeft":
        pan(-step, 0);
        break;
      case "ArrowRight":
        pan(step, 0);
        break;
      case "ArrowUp":
        pan(0, -step);
        break;
      case "ArrowDown":
        pan(0, step);
        break;
      case "+":
      case "=":
        handle?.zoomBy(1.6);
        break;
      case "-":
        handle?.zoomBy(1 / 1.6);
        break;
      case "0":
        handle?.fit();
        break;
      case "Enter": {
        const index = hitTest(e.camera, e.vp, props.mosaic, e.vp.width / 2, e.vp.height / 2);
        if (index >= 0) props.onTapTile(index, e.lastInfo);
        break;
      }
      default:
        return;
    }
    ev.preventDefault();
  };

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        tabIndex={0}
        role="img"
        aria-label={`Interactive mosaic of fan photos forming the word TOGETHER twice. Use arrow keys to pan, plus and minus to zoom, Enter to open the photo in the centre.`}
        onKeyDown={onKeyDown}
        className="block h-full w-full touch-none select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ink"
      />
    </div>
  );
});
