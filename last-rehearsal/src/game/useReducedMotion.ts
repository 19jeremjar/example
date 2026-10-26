import { useEffect, useState } from 'react';
import type { MotionPref } from './state';

const QUERY = '(prefers-reduced-motion: reduce)';

/** The player's in-game choice wins; "system" follows the OS setting. */
export function useReducedMotion(pref: MotionPref): boolean {
  const [system, setSystem] = useState(() => window.matchMedia?.(QUERY).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(QUERY);
    if (!mq) return;
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const reduced = pref === 'system' ? system : pref === 'reduced';
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduced);
  }, [reduced]);
  return reduced;
}
