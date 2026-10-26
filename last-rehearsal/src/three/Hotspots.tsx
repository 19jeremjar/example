import { Billboard, Edges, Html } from '@react-three/drei';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useRef, useState } from 'react';
import * as THREE from 'three';
import type { Hotspot } from '../config/hotspots';

/** Pointer travel (px) beyond which a press counts as a drag, not a tap. */
const TAP_SLOP = 8;

interface HotspotsProps {
  hotspots: Hotspot[];
  selectedId: string | null;
  /** Briefly outline every hotspot (the "Show hotspots" setting). */
  reveal: boolean;
  debug: boolean;
  enabled: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
}

const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false });

export function Hotspots({ hotspots, selectedId, reveal, debug, enabled, reducedMotion, onSelect }: HotspotsProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  const click = (id: string) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!enabled || e.delta > TAP_SLOP) return;
    onSelect(id);
  };

  return (
    <group>
      {hotspots.map((h) => {
        const active = h.id === selectedId || (enabled && h.id === hovered);
        return (
          <group key={h.id} position={h.position}>
            <mesh
              material={hitMaterial}
              onClick={click(h.id)}
              onPointerOver={(e) => {
                e.stopPropagation();
                if (e.pointerType !== 'mouse') return;
                setHovered(h.id);
                document.body.style.cursor = enabled ? 'pointer' : '';
              }}
              onPointerOut={() => {
                setHovered((cur) => (cur === h.id ? null : cur));
                document.body.style.cursor = '';
              }}
            >
              <boxGeometry args={h.size} />
              {(debug || reveal) && (
                <Edges color={debug ? (h.approximate ? '#ff4dd8' : '#59ff7a') : '#ffd27a'} />
              )}
            </mesh>
            {debug && (
              <Html position={[0, h.size[1] / 2 + 0.05, 0]} center style={{ pointerEvents: 'none' }}>
                <span className="whitespace-nowrap rounded bg-black/70 px-1 font-mono text-[10px] text-lime-300">{h.id}</span>
              </Html>
            )}
            {active && <Indicator offsetY={h.size[1] / 2 + 0.07} reducedMotion={reducedMotion} />}
          </group>
        );
      })}
    </group>
  );
}

/** A small ring that floats above whatever is hovered or selected. */
function Indicator({ offsetY, reducedMotion }: { offsetY: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return;
    const t = clock.elapsedTime;
    ref.current.position.y = offsetY + Math.sin(t * 3) * 0.015;
    ref.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
  });
  return (
    <group ref={ref} position={[0, offsetY, 0]}>
      <Billboard>
        <mesh renderOrder={10}>
          <ringGeometry args={[0.035, 0.05, 32]} />
          <meshBasicMaterial color="#ffd27a" depthTest={false} transparent opacity={0.95} toneMapped={false} />
        </mesh>
        <mesh renderOrder={10}>
          <circleGeometry args={[0.014, 16]} />
          <meshBasicMaterial color="#ffd27a" depthTest={false} transparent toneMapped={false} />
        </mesh>
      </Billboard>
    </group>
  );
}
