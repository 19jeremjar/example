import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CAMERA_BOUNDS, ORBIT_LIMITS, type CameraView, type Vec3 } from '../config/hotspots';
import { clampToBounds, easeInOutCubic, fovForAspect } from './cameraMath';

interface CameraRigProps {
  /** Where the camera should be. Changing it (or `viewKey`) starts a move. */
  view: CameraView;
  /** Bump to re-run a move to the same view, e.g. "Reset view". */
  viewKey: number;
  /** Whether the player can drag and pinch. Off while inspecting. */
  interactive: boolean;
  reducedMotion: boolean;
  onUserMove?: () => void;
}

const tmp = new THREE.Vector3();

/**
 * A constrained orbit camera. The player orbits a point in the middle of the
 * room within tight angle and distance limits, and the camera position is
 * clamped inside CAMERA_BOUNDS so it never passes through a wall or shows the
 * holes in the scanned ceiling.
 */
export function CameraRig({ view, viewKey, interactive, reducedMotion, onUserMove }: CameraRigProps) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const domElement = useThree((s) => s.gl.domElement);
  const size = useThree((s) => s.size);
  const onUserMoveRef = useRef(onUserMove);
  onUserMoveRef.current = onUserMove;
  const initialTarget = useRef(view.target);

  const [controls, setControls] = useState<OrbitControls | null>(null);

  useEffect(() => {
    const c = new OrbitControls(camera, domElement);
    c.enablePan = false;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.rotateSpeed = 0.55;
    c.zoomSpeed = 0.7;
    c.minDistance = ORBIT_LIMITS.minDistance;
    c.maxDistance = ORBIT_LIMITS.maxDistance;
    c.minAzimuthAngle = -ORBIT_LIMITS.maxAzimuth;
    c.maxAzimuthAngle = ORBIT_LIMITS.maxAzimuth;
    c.minPolarAngle = ORBIT_LIMITS.minPolar;
    c.maxPolarAngle = ORBIT_LIMITS.maxPolar;
    // One finger looks around, two fingers pinch to zoom. No panning.
    c.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    c.enabled = false;
    c.target.set(...initialTarget.current);

    const clamp = () => {
      const p = clampToBounds(camera.position.toArray() as Vec3, CAMERA_BOUNDS);
      if (p[0] !== camera.position.x || p[1] !== camera.position.y || p[2] !== camera.position.z) {
        camera.position.set(...p);
        camera.lookAt(c.target);
      }
    };
    const start = () => onUserMoveRef.current?.();
    c.addEventListener('change', clamp);
    c.addEventListener('start', start);
    setControls(c);
    return () => {
      c.removeEventListener('change', clamp);
      c.removeEventListener('start', start);
      c.dispose();
    };
  }, [camera, domElement]);

  useEffect(() => {
    if (controls) controls.enableDamping = !reducedMotion;
  }, [controls, reducedMotion]);

  useEffect(() => {
    camera.fov = fovForAspect(size.width / Math.max(1, size.height));
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  // --- moves between views --------------------------------------------
  const anim = useRef<{
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
    t: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (!controls) return;
    const toPos = new THREE.Vector3(...view.position);
    const toTarget = new THREE.Vector3(...view.target);
    const distance = camera.position.distanceTo(toPos) + controls.target.distanceTo(toTarget);
    anim.current = {
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      toPos,
      toTarget,
      t: 0,
      // Long moves take a little longer; reduced motion cuts straight there.
      duration: reducedMotion ? 0 : THREE.MathUtils.clamp(0.6 + distance * 0.18, 0.7, 1.4),
    };
    controls.enabled = false;
    // reducedMotion is read when the move starts; changing it mid-move shouldn't restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, viewKey, camera, controls]);

  useFrame((_, dt) => {
    if (!controls) return;
    const a = anim.current;
    if (a) {
      a.t = a.duration === 0 ? 1 : Math.min(1, a.t + dt / a.duration);
      const k = easeInOutCubic(a.t);
      camera.position.lerpVectors(a.fromPos, a.toPos, k);
      tmp.lerpVectors(a.fromTarget, a.toTarget, k);
      controls.target.copy(tmp);
      camera.lookAt(tmp);
      if (a.t >= 1) {
        anim.current = null;
        controls.enabled = interactive;
        if (interactive) controls.update();
      }
      return;
    }
    if (controls.enabled !== interactive) controls.enabled = interactive;
    if (interactive) controls.update();
  });

  return null;
}
