export type GestureHandlers = {
  /** Pan by a screen-space delta. */
  pan(dx: number, dy: number): void;
  /** Multiply zoom by `factor` around a screen point. */
  zoom(factor: number, sx: number, sy: number): void;
  /** Pinch: zoom so the start distance becomes the current one, following the midpoint. */
  pinch(scale: number, midX: number, midY: number, startMidX: number, startMidY: number): void;
  pinchStart(): void;
  tap(sx: number, sy: number): void;
  doubleTap(sx: number, sy: number): void;
  /** Finger lifted after a pan; velocity in CSS px per ms. */
  release(vx: number, vy: number): void;
  /** Any direct interaction, used to cancel animations and hide hints. */
  interact(): void;
};

const TAP_SLOP = 9;
const TAP_MS = 320;
const DOUBLE_TAP_MS = 280;

/**
 * Pointer, touch and wheel handling for the mosaic canvas. Uses Pointer Events throughout so
 * mouse, pen and touch share one code path. Returns a cleanup function.
 */
export function attachGestures(el: HTMLElement, h: GestureHandlers): () => void {
  const pointers = new Map<number, { x: number; y: number }>();
  let downAt = 0;
  let downX = 0;
  let downY = 0;
  let moved = false;
  let multi = false;
  let lastTap = { t: 0, x: 0, y: 0 };
  let pendingTap: ReturnType<typeof setTimeout> | undefined;
  let pinchStart: { dist: number; midX: number; midY: number } | null = null;
  let samples: { t: number; x: number; y: number }[] = [];

  const local = (e: PointerEvent | WheelEvent) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const startPinch = () => {
    const [a, b] = [...pointers.values()];
    pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 };
    h.pinchStart();
  };

  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    el.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.set(e.pointerId, p);
    h.interact();
    if (pointers.size === 1) {
      downAt = e.timeStamp;
      downX = p.x;
      downY = p.y;
      moved = false;
      multi = false;
      samples = [{ t: e.timeStamp, ...p }];
    } else if (pointers.size === 2) {
      multi = true;
      startPinch();
    }
  };

  const onMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.set(e.pointerId, p);
    if (pointers.size === 1) {
      if (!moved && !multi && Math.hypot(p.x - downX, p.y - downY) > TAP_SLOP) moved = true;
      if (moved || multi) h.pan(p.x - prev.x, p.y - prev.y);
      samples.push({ t: e.timeStamp, ...p });
      if (samples.length > 6) samples.shift();
    } else if (pointers.size >= 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      h.pinch(dist / pinchStart.dist, (a.x + b.x) / 2, (a.y + b.y) / 2, pinchStart.midX, pinchStart.midY);
    }
  };

  const onUp = (e: PointerEvent) => {
    if (!pointers.has(e.pointerId)) return;
    const p = local(e);
    pointers.delete(e.pointerId);
    if (pointers.size === 1) {
      // Pinch ended with one finger still down: continue as a pan from here, never as a tap.
      pinchStart = null;
      samples = [];
      return;
    }
    if (pointers.size > 1) {
      startPinch();
      return;
    }
    pinchStart = null;
    if (e.type === "pointercancel") return;
    if (!moved && !multi && e.timeStamp - downAt < TAP_MS) {
      const now = e.timeStamp;
      if (now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 40) {
        clearTimeout(pendingTap);
        pendingTap = undefined;
        lastTap = { t: 0, x: 0, y: 0 };
        h.doubleTap(p.x, p.y);
      } else {
        lastTap = { t: now, x: p.x, y: p.y };
        clearTimeout(pendingTap);
        pendingTap = setTimeout(() => h.tap(p.x, p.y), DOUBLE_TAP_MS);
      }
      return;
    }
    if (moved && !multi && samples.length > 1) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = Math.max(1, last.t - first.t);
      // Only fling if the finger was still moving at release.
      if (e.timeStamp - last.t < 60) h.release((last.x - first.x) / dt, (last.y - first.y) / dt);
    }
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    h.interact();
    const p = local(e);
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    const dy = e.deltaY * unit;
    // Trackpad pinch arrives as ctrl+wheel with small deltas; scale it up.
    const factor = Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0025));
    h.zoom(factor, p.x, p.y);
  };

  // Stop Safari's own page pinch-zoom from fighting ours.
  const preventGesture = (e: Event) => e.preventDefault();

  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("gesturestart", preventGesture);
  el.addEventListener("gesturechange", preventGesture);
  return () => {
    clearTimeout(pendingTap);
    el.removeEventListener("pointerdown", onDown);
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.removeEventListener("pointercancel", onUp);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("gesturestart", preventGesture);
    el.removeEventListener("gesturechange", preventGesture);
  };
}
