import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

export const MODEL_URL = '/models/rehearsal-room.glb';
export const MOBILE_MODEL_URL = '/models/rehearsal-room.mobile.glb';

/**
 * Phones and low-memory devices get the optimised copy (2048px WebP
 * textures, meshopt geometry, about 1 MB). Everyone else gets the original
 * 4096px scan. Add ?hq or ?lq to the URL to force either one.
 */
export function chooseModelUrl(): string {
  const q = new URLSearchParams(window.location.search);
  if (q.has('hq')) return MODEL_URL;
  if (q.has('lq')) return MOBILE_MODEL_URL;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  const small = Math.min(window.screen.width, window.screen.height) < 820;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return coarse || small || (memory !== undefined && memory <= 4) ? MOBILE_MODEL_URL : MODEL_URL;
}

interface RoomProps {
  url: string;
  /** 0 = normal, 1 = lights down for the final reveal. */
  darkness: number;
  onLoaded?: () => void;
}

/**
 * The Polycam scan, unchanged. The scan has no normals and its colour is
 * baked from the photos, so it's drawn unlit: any added light would
 * fight the real lighting captured in the textures.
 */
export function Room({ url, darkness, onLoaded }: RoomProps) {
  const { scene } = useGLTF(url);
  const maxAnisotropy = useThree((s) => s.gl.capabilities.getMaxAnisotropy());

  const { root, materials } = useMemo(() => {
    const root = scene.clone(true);
    const materials: THREE.MeshBasicMaterial[] = [];
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const source = mesh.material as THREE.MeshStandardMaterial;
      const map = source.map ?? null;
      if (map) {
        map.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = Math.min(8, maxAnisotropy);
      }
      const mat = new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false });
      materials.push(mat);
      mesh.material = mat;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
    });
    // The scan's ceiling has holes, and on tall phone screens they show as a
    // black band. A plain plane just above the scanned ceiling fills them in
    // and is hidden wherever the scan has real ceiling.
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 5.8),
      new THREE.MeshBasicMaterial({ map: ceilingTexture(), side: THREE.DoubleSide, toneMapped: false }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 2.31, 0.1);
    root.add(ceiling);
    materials.push(ceiling.material);

    return { root, materials };
  }, [scene, maxAnisotropy]);

  useEffect(() => {
    onLoaded?.();
    return () => materials.forEach((m) => m.dispose());
  }, [materials, onLoaded]);

  useFrame((_, dt) => {
    // Ease the room brightness toward its target so the lights go down smoothly.
    const target = 1 - darkness * 0.72;
    const k = 1 - Math.exp(-dt * 3);
    for (const m of materials) {
      const v = THREE.MathUtils.lerp(m.color.r, target, k);
      m.color.setScalar(v);
    }
  });

  return <primitive object={root} />;
}

/** Warm off-white, brighter in the middle like the room's single downlight. */
function ceilingTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 54, 4, 64, 64, 90);
  grad.addColorStop(0, '#efe6dc');
  grad.addColorStop(0.5, '#d7c3b4');
  grad.addColorStop(1, '#9c8073');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
