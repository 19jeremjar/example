import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimationEngine, Frame, FrameCallback } from '../lib/animation';

export const EngineContext = createContext<AnimationEngine | null>(null);

/**
 * Owns the animation engine and decides where its energy comes from:
 * the preview slider when previewing, otherwise the microphone.
 */
export function useSoundEnergy(opts: { readMic: () => number; previewEnergy: number | null; staticMode: boolean }) {
  const engine = useMemo(() => new AnimationEngine(), []);
  const previewRef = useRef(opts.previewEnergy);
  previewRef.current = opts.previewEnergy;
  const readMicRef = useRef(opts.readMic);
  readMicRef.current = opts.readMic;

  useEffect(() => {
    engine.setSource(() => (previewRef.current != null ? previewRef.current : readMicRef.current()));
  }, [engine]);

  useEffect(() => {
    engine.motion = opts.staticMode ? 0 : 1;
    const sync = () => {
      if (opts.staticMode || document.visibilityState === 'hidden') {
        engine.stop();
        engine.renderOnce();
      } else {
        engine.run();
      }
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      engine.stop();
    };
  }, [engine, opts.staticMode]);

  return engine;
}

/** Subscribe to every animation frame. The callback should mutate refs, not set state. */
export function useFrame(cb: FrameCallback) {
  const engine = useContext(EngineContext);
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!engine) return;
    return engine.subscribe((f) => cbRef.current(f));
  }, [engine]);
}

/** Low-rate React state mirror of the engine, for UI meters (~8 fps). */
export function useEngineSnapshot(active: boolean): Frame | null {
  const engine = useContext(EngineContext);
  const [snap, setSnap] = useState<Frame | null>(null);
  useEffect(() => {
    if (!engine || !active) return;
    const id = window.setInterval(() => setSnap({ ...engine.latest }), 120);
    return () => clearInterval(id);
  }, [engine, active]);
  return snap;
}
