import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Vec3 } from '../config/hotspots';

function useGlowTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d')!;
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

interface GlowProps {
  position: Vec3;
  colour: string;
  on: boolean;
  scale: number;
  /** Pulse to an imaginary beat. */
  pulse?: boolean;
  reducedMotion: boolean;
}

/** A soft additive light blob. The scan is unlit, so "lights" are faked this way. */
export function Glow({ position, colour, on, scale, pulse = false, reducedMotion }: GlowProps) {
  const tex = useGlowTexture();
  const ref = useRef<THREE.Sprite>(null);
  const level = useRef(0);

  useFrame(({ clock }, dt) => {
    const s = ref.current;
    if (!s) return;
    level.current = THREE.MathUtils.lerp(level.current, on ? 1 : 0, 1 - Math.exp(-dt * 4));
    const beat = pulse && !reducedMotion ? 0.75 + 0.25 * Math.max(0, Math.sin(clock.elapsedTime * Math.PI * 2 * 1.9)) : 1;
    const mat = s.material as THREE.SpriteMaterial;
    mat.opacity = level.current * beat;
    s.visible = level.current > 0.01;
    s.scale.setScalar(scale * (0.85 + 0.15 * beat));
  });

  return (
    <sprite ref={ref} position={position} visible={false} renderOrder={5}>
      <spriteMaterial map={tex} color={colour} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
}
