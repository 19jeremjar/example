import { KeyboardEvent, PointerEvent, useCallback, useRef } from 'react';
import { BASE_HEIGHT, findCharacter } from '../data/characters';
import type { Palette } from '../data/palettes';
import type { AssetState } from '../hooks/useCharacterAssets';
import { CharacterPlacement, clampScale, clampX } from '../lib/placement';
import { SolarState, Viewport, arcPoint } from '../lib/solar';
import { Character } from './Character';
import { Critters } from './Critters';
import { Flowers } from './Flower';
import { Grass } from './Grass';
import { GROUND_Y, Landscape } from './Landscape';
import { LightBeams, LightWash, MusicNotes } from './LightShow';
import { Moon } from './Moon';
import { Clouds, SkyBackdrop, SkyDefs, Stars } from './Sky';
import { Sun } from './Sun';

type Props = {
  solar: SolarState;
  palette: Palette;
  vp: Viewport;
  placements: CharacterPlacement[];
  assets: Record<string, AssetState>;
  editing: boolean;
  selectedUid: string | null;
  onSelect: (uid: string | null) => void;
  onMove: (uid: string, patch: Partial<CharacterPlacement>) => void;
  onRemove: (uid: string) => void;
};

export function WorldScene({ solar, palette, vp, placements, assets, editing, selectedUid, onSelect, onMove, onRemove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ uid: string; offset: number; pointerId: number } | null>(null);
  const vw = vp.x1 - vp.x0;
  const toSceneX = (x: number) => vp.x0 + x * vw;

  const clientToNorm = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const ctm = svg?.getScreenCTM();
      if (!svg || !ctm) return 0.5;
      const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
      return (pt.x - vp.x0) / vw;
    },
    [vp.x0, vw],
  );

  const onCharPointerDown = (e: PointerEvent<SVGGElement>, uid: string) => {
    e.preventDefault();
    const p = placements.find((pl) => pl.uid === uid);
    if (!p) return;
    onSelect(uid);
    drag.current = { uid, offset: clientToNorm(e.clientX, e.clientY) - p.x, pointerId: e.pointerId };
    svgRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    onMove(d.uid, { x: clampX(clientToNorm(e.clientX, e.clientY) - d.offset) });
  };

  const endDrag = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId === e.pointerId) {
      svgRef.current?.releasePointerCapture(e.pointerId);
      drag.current = null;
    }
  };

  const onCharKey = (e: KeyboardEvent<SVGGElement>, uid: string) => {
    const p = placements.find((pl) => pl.uid === uid);
    if (!p) return;
    const step = e.shiftKey ? 0.08 : 0.02;
    if (e.key === 'ArrowLeft') onMove(uid, { x: clampX(p.x - step) });
    else if (e.key === 'ArrowRight') onMove(uid, { x: clampX(p.x + step) });
    else if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') onMove(uid, { scale: clampScale(p.scale + 0.05) });
    else if (e.key === '-' || e.key === '_' || e.key === 'ArrowDown') onMove(uid, { scale: clampScale(p.scale - 0.05) });
    else if (e.key === 'Delete' || e.key === 'Backspace') onRemove(uid);
    else return;
    e.preventDefault();
  };

  // Sun follows the real solar day; it sinks behind the hills outside it.
  const sunUp = solar.dayProgress > -0.08 && solar.dayProgress < 1.08;
  const sunPt = arcPoint(solar.dayProgress, solar.today.noonAltitude, vp);
  const moonPt = solar.nightProgress != null ? arcPoint(solar.nightProgress, 55, vp, 0.85) : null;
  const dimmed = palette.light < 0.985;
  const l = palette.light;
  // Night light: darken and cool characters/flowers a little, but keep them readable.
  const matrix = `${l} 0 0 0 0  0 ${l} 0 0 0  0 0 ${Math.min(1, l + 0.08)} 0 ${((1 - l) * 0.08).toFixed(3)}  0 0 0 1 0`;

  // Where the dancers' heads are, for the music notes.
  const dancers = placements.map((p) => {
    const def = findCharacter(p.characterId);
    return { x: toSceneX(p.x), top: GROUND_Y - BASE_HEIGHT * (def?.defaultScale ?? 1) * p.scale };
  });

  // Larger characters stand slightly in front.
  const ordered = [...placements].sort((a, b) => a.scale - b.scale || a.x - b.x);

  const viewBox = `${vp.x0.toFixed(2)} ${vp.y0.toFixed(2)} ${vw.toFixed(2)} ${(vp.y1 - vp.y0).toFixed(2)}`;

  return (
    <>
    <svg
      ref={svgRef}
      className="lw-scene"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label={`A cartoon meadow at ${solar.phase === 'day' ? 'midday' : solar.phase}, with ${placements.length} character${placements.length === 1 ? '' : 's'}.`}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerDown={(e) => {
        if (editing && e.target === svgRef.current) onSelect(null);
      }}
    >
      <defs>
        <SkyDefs palette={palette} top={vp.y0} />
        <filter id="lw-nightlight" colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values={matrix} />
        </filter>
        <filter id="lw-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <SkyBackdrop vp={vp} />
      <Stars night={palette.night} />
      {moonPt && <Moon x={moonPt.x} y={moonPt.y} opacity={palette.night} outline={palette.outline} />}
      {sunUp && <Sun x={sunPt.x} y={sunPt.y} altitude={solar.altitude} outline={palette.outline} />}
      <Clouds palette={palette} vp={vp} />
      <Landscape palette={palette} />
      <Grass palette={palette} layer="back" />
      <Flowers palette={palette} light={palette.light} />
      <Critters night={palette.night} outline={palette.outline} vp={vp} />
      <g className="lw-characters">
        {ordered.map((p) => {
          const def = findCharacter(p.characterId);
          const a = assets[p.characterId];
          if (!def || a === 'missing' || a === 'loading') return null;
          return (
            <Character
              key={p.uid}
              def={def}
              asset={def.assetPaths ? a : null}
              placement={p}
              sceneX={toSceneX(p.x)}
              groundY={GROUND_Y}
              index={placements.indexOf(p)}
              outline={palette.outline}
              dimmed={dimmed}
              editing={editing}
              selected={selectedUid === p.uid}
              onPointerDown={onCharPointerDown}
              onKeyDown={onCharKey}
              onFocus={onSelect}
            />
          );
        })}
      </g>
      <Grass palette={palette} layer="front" />
      <MusicNotes dancers={dancers} outline={palette.outline} />
    </svg>
    {/* Stage lights live on their own composited layers above the artwork. */}
    <svg className="lw-lights" viewBox={viewBox} preserveAspectRatio="xMidYMax slice" aria-hidden>
      <LightBeams vp={vp} night={palette.night} />
    </svg>
    <LightWash />
    </>
  );
}
