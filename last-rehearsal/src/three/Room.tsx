import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/** The original Polycam export, untouched (4.9 MB, JPEG textures). */
export const SOURCE_MODEL_URL = '/models/rehearsal-room.glb';
/** Same 4096px textures as WebP, meshopt geometry: 2.3 MB. The default. */
export const MODEL_URL = '/models/rehearsal-room.web.glb';
/** 2048px textures, about 1 MB, for low-memory devices. */
export const LITE_MODEL_URL = '/models/rehearsal-room.mobile.glb';

/**
 * Everyone gets the full-resolution scan unless the browser reports 2 GB of
 * memory or less. ?source, ?hq or ?lq in the URL forces a version.
 */
export function chooseModelUrl(): string {
  const q = new URLSearchParams(window.location.search);
  if (q.has('source')) return SOURCE_MODEL_URL;
  if (q.has('hq')) return MODEL_URL;
  if (q.has('lq')) return LITE_MODEL_URL;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return memory !== undefined && memory <= 2 ? LITE_MODEL_URL : MODEL_URL;
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
  const sharpen = SHARPEN;
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
      if (sharpen > 0) addSharpen(mat, sharpen);
      materials.push(mat);
      mesh.material = mat;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
    });
    // The scan has holes wherever its camera couldn't see: the ceiling, and
    // behind each person (they blocked the wall while being scanned). With
    // nothing behind them, the holes showed as black blobs. A plain box of
    // walls, floor and ceiling in the room's own colours sits just outside the
    // scan, so a hole now shows the wall behind it instead of a void.
    for (const panel of buildShell()) {
      root.add(panel);
      materials.push(panel.material as THREE.MeshBasicMaterial);
    }

    return { root, materials };
  }, [scene, maxAnisotropy, sharpen]);

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

/**
 * How much to crisp up the scan's textures (0 = off). Polycam textures are
 * soft, especially on people; a light screen-space unsharp mask brings back
 * edges without the crunchy look of a heavy filter.
 */
const SHARPEN = new URLSearchParams(window.location.search).has('nosharpen') ? 0 : 0.45;

function addSharpen(mat: THREE.MeshBasicMaterial, amount: number) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSharpen = { value: amount };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSharpen;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          // Neighbours one screen pixel away, so the effect is the same at any distance.
          vec2 sdx = dFdx(vMapUv);
          vec2 sdy = dFdy(vMapUv);
          vec4 sampledDiffuseColor = texture2D(map, vMapUv);
          vec3 blurred = 0.25 * (
            texture2D(map, vMapUv + sdx).rgb + texture2D(map, vMapUv - sdx).rgb +
            texture2D(map, vMapUv + sdy).rgb + texture2D(map, vMapUv - sdy).rgb);
          sampledDiffuseColor.rgb = clamp(sampledDiffuseColor.rgb + (sampledDiffuseColor.rgb - blurred) * uSharpen, 0.0, 1.0);
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      );
  };
  mat.customProgramCacheKey = () => `sharpen-${amount}`;
}

// Scan extents (from the GLB): x -1.82…1.83, y -0.44…2.30, z -2.73…2.90.
const SHELL = { x: 1.87, floor: -0.46, ceiling: 2.31, back: -2.77, front: 2.94 };

function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function panel(width: number, height: number, map: THREE.Texture, position: Vec3, rotation: Vec3) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide, toneMapped: false }),
  );
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  return mesh;
}

type Vec3 = [number, number, number];

/** Colours sampled from the scan and the reference photos. */
function buildShell(): THREE.Mesh[] {
  const width = SHELL.x * 2;
  const height = SHELL.ceiling - SHELL.floor;
  const depth = SHELL.front - SHELL.back;
  const midY = (SHELL.ceiling + SHELL.floor) / 2;
  const midZ = (SHELL.front + SHELL.back) / 2;

  // Back wall: the white mural panel in the middle, black acoustic pillars either side.
  const back = canvasTexture(512, 256, (g) => {
    const mural = 0.95 / SHELL.x; // the mural spans about x = ±0.95 m
    g.fillStyle = '#2b2a2d';
    g.fillRect(0, 0, 512, 256);
    const x0 = 256 - 256 * mural;
    // Plain off-white: most of what's hidden behind the drummer is the mural's snowy ground.
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#d9d4cd');
    grad.addColorStop(1, '#e4e0da');
    g.fillStyle = grad;
    g.fillRect(x0, 0, 512 - 2 * x0, 256);
  });

  const red = canvasTexture(64, 64, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#b8402f');
    grad.addColorStop(1, '#8f2318');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  });

  // Floor: grey carpet, with the patterned rug under the kit.
  const floor = canvasTexture(256, 512, (g) => {
    g.fillStyle = '#3f3f43';
    g.fillRect(0, 0, 256, 512);
    const toX = (x: number) => ((x + SHELL.x) / width) * 256;
    const toZ = (z: number) => ((z - SHELL.back) / depth) * 512;
    g.fillStyle = '#6e2f25';
    g.fillRect(toX(-1.38), toZ(-2.6), toX(1.38) - toX(-1.38), toZ(-0.5) - toZ(-2.6));
  });

  const ceiling = canvasTexture(128, 128, (g) => {
    const grad = g.createRadialGradient(64, 54, 4, 64, 64, 90);
    grad.addColorStop(0, '#efe6dc');
    grad.addColorStop(0.5, '#d7c3b4');
    grad.addColorStop(1, '#9c8073');
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
  });

  const door = canvasTexture(8, 8, (g) => {
    g.fillStyle = '#2a2523';
    g.fillRect(0, 0, 8, 8);
  });

  const half = Math.PI / 2;
  return [
    panel(width, height, back, [0, midY, SHELL.back], [0, 0, 0]),
    panel(width, height, door, [0, midY, SHELL.front], [0, Math.PI, 0]),
    panel(depth, height, red, [-SHELL.x, midY, midZ], [0, half, 0]),
    panel(depth, height, red, [SHELL.x, midY, midZ], [0, -half, 0]),
    panel(width, depth, floor, [0, SHELL.floor, midZ], [-half, 0, 0]),
    panel(width, depth, ceiling, [0, SHELL.ceiling, midZ], [half, 0, 0]),
  ];
}
