import { KeyboardEvent, PointerEvent, useMemo, useRef } from 'react';
import { BASE_HEIGHT, CharacterDefinition } from '../data/characters';
import { PROFILES, createMover, stepPose } from '../lib/animation';
import type { CharacterPlacement } from '../lib/placement';
import { useFrame } from '../hooks/useSoundEnergy';
import { ORIGINAL_ART } from './OriginalCharacters';

export type CharacterAsset = { src: string; aspect: number };

type Props = {
  def: CharacterDefinition;
  asset: CharacterAsset | null;
  placement: CharacterPlacement;
  sceneX: number;
  groundY: number;
  index: number;
  outline: string;
  dimmed: boolean;
  editing: boolean;
  selected: boolean;
  onPointerDown?: (e: PointerEvent<SVGGElement>, uid: string) => void;
  onKeyDown?: (e: KeyboardEvent<SVGGElement>, uid: string) => void;
  onFocus?: (uid: string) => void;
};

/**
 * One character standing on the meadow. The outer group positions it; the
 * inner group gets a per-frame pose (sway, bounce, squash) around its feet.
 */
export function Character({ def, asset, placement, sceneX, groundY, index, outline, dimmed, editing, selected, onPointerDown, onKeyDown, onFocus }: Props) {
  const poseRef = useRef<SVGGElement>(null);
  const shadowRef = useRef<SVGEllipseElement>(null);
  const eyesRef = useRef<SVGGElement>(null);
  const mover = useMemo(() => createMover(0.13 + index * 0.37 + placement.x), [index, placement.uid]); // eslint-disable-line react-hooks/exhaustive-deps
  const profile = PROFILES[def.animationProfile];

  const h = BASE_HEIGHT * def.defaultScale * placement.scale;
  const aspect = asset?.aspect ?? def.aspect;
  const w = h * aspect;
  const Art = ORIGINAL_ART[def.id];

  useFrame((f) => {
    const p = stepPose(mover, profile, f);
    poseRef.current?.setAttribute(
      'transform',
      `translate(${p.x.toFixed(2)},${p.y.toFixed(2)}) rotate(${p.rot.toFixed(2)}) scale(${p.sx.toFixed(4)},${p.sy.toFixed(4)})`,
    );
    const lift = Math.min(1, -p.y / 60);
    shadowRef.current?.setAttribute('transform', `scale(${((1 - lift * 0.35) * (0.6 + 0.4 * Math.abs(p.sx))).toFixed(3)},1)`);
    shadowRef.current?.setAttribute('opacity', (0.28 - lift * 0.12).toFixed(3));
    if (eyesRef.current) {
      const blinkCycle = (f.t + mover.seed * 7) % 4.6;
      const closed = f.motion > 0 && blinkCycle < 0.13;
      eyesRef.current.style.transform = closed ? 'scaleY(0.12)' : '';
    }
  });

  const label = `${def.name}${editing ? '. Drag, or use arrow keys to move, plus and minus to resize, Delete to remove.' : ''}`;

  return (
    <g
      transform={`translate(${sceneX.toFixed(1)},${groundY})`}
      className={`lw-character${editing ? ' is-editing' : ''}${selected ? ' is-selected' : ''}`}
      role={editing ? 'button' : 'img'}
      aria-label={label}
      tabIndex={editing ? 0 : -1}
      onPointerDown={editing ? (e) => onPointerDown?.(e, placement.uid) : undefined}
      onKeyDown={editing ? (e) => onKeyDown?.(e, placement.uid) : undefined}
      onFocus={editing ? () => onFocus?.(placement.uid) : undefined}
    >
      <ellipse ref={shadowRef} cx={0} cy={2} rx={w * 0.36} ry={10} fill="#1d2a1a" opacity={0.28} />
      {editing && (
        <g className="lw-edit-marker">
          <ellipse cx={0} cy={2} rx={w * 0.5 + 10} ry={18} fill="none" stroke={selected ? '#fff6c8' : '#ffffff'} strokeWidth={selected ? 5 : 3} strokeDasharray="10 8" />
          <rect x={-w / 2 - 14} y={-h - 14} width={w + 28} height={h + 30} fill="transparent" />
          {selected && (
            <path
              className="lw-select-arrow"
              d={`M-16,${-h - 44} L16,${-h - 44} L0,${-h - 22}Z`}
              fill="#ffd23f"
              stroke={outline}
              strokeWidth={4}
              strokeLinejoin="round"
            />
          )}
        </g>
      )}
      <g ref={poseRef} filter={dimmed ? 'url(#lw-nightlight)' : undefined}>
        {Art ? (
          <svg x={-w * def.anchorX} y={-h * def.anchorY} width={w} height={h} viewBox="0 0 200 260" overflow="visible">
            <Art eyesRef={eyesRef} outline={outline} />
          </svg>
        ) : asset ? (
          <image href={asset.src} x={-w * def.anchorX} y={-h * def.anchorY} width={w} height={h} preserveAspectRatio="xMidYMax meet" />
        ) : null}
      </g>
    </g>
  );
}
