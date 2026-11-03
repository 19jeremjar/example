import { useEffect, useState } from 'react';
import { CHARACTERS } from '../data/characters';
import type { CharacterAsset } from '../components/Character';

export type AssetState = CharacterAsset | 'loading' | 'missing';

function tryLoad(src: string): Promise<CharacterAsset> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ src, aspect: img.naturalWidth / Math.max(1, img.naturalHeight) });
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Checks which supplied character images actually exist in /public/characters.
 * Characters without artwork stay listed but can't be added; nothing is
 * substituted for them.
 */
export function useCharacterAssets(): Record<string, AssetState> {
  const [state, setState] = useState<Record<string, AssetState>>(() =>
    Object.fromEntries(CHARACTERS.map((c) => [c.id, c.assetPaths ? 'loading' : { src: '', aspect: c.aspect }])),
  );
  useEffect(() => {
    let alive = true;
    for (const c of CHARACTERS) {
      if (!c.assetPaths) continue;
      (async () => {
        for (const p of c.assetPaths!) {
          try {
            const a = await tryLoad(import.meta.env.BASE_URL.replace(/\/$/, '') + p);
            if (alive) setState((s) => ({ ...s, [c.id]: a }));
            return;
          } catch {
            /* try next candidate */
          }
        }
        if (alive) setState((s) => ({ ...s, [c.id]: 'missing' }));
      })();
    }
    return () => {
      alive = false;
    };
  }, []);
  return state;
}
