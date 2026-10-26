import { useProgress } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { AMP_INDICATOR, HOME_VIEW, HOTSPOTS, SPEAKER_POSITIONS, type CameraView } from '../config/hotspots';
import { CameraRig } from './CameraRig';
import { Glow } from './Glows';
import { Hotspots } from './Hotspots';
import { RedStool } from './RedStool';
import { Room } from './Room';

export interface SceneProps {
  modelUrl: string;
  view: CameraView;
  viewKey: number;
  interactive: boolean;
  selectedId: string | null;
  showHotspots: boolean;
  debug: boolean;
  reducedMotion: boolean;
  darkness: number;
  ampOn: boolean;
  speakersLive: boolean;
  onSelect: (id: string) => void;
  onUserMove: () => void;
  onLoaded: () => void;
  onProgress: (pct: number) => void;
  onError: (err: Error) => void;
}

class LoadBoundary extends Component<{ onError: (e: Error) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ProgressReporter({ onProgress }: { onProgress: (pct: number) => void }) {
  const { progress } = useProgress();
  useEffect(() => onProgress(progress), [progress, onProgress]);
  return null;
}

export default function Scene(p: SceneProps) {
  return (
    <>
      <ProgressReporter onProgress={p.onProgress} />
      <Canvas
        className="!absolute inset-0"
        style={{ touchAction: 'none' }}
        dpr={[1, 1.75]}
        flat
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={{ position: HOME_VIEW.position, fov: 66, near: 0.03, far: 30 }}
        onCreated={({ gl }) => gl.setClearColor('#1b1412')}
        aria-hidden="true"
      >
        <LoadBoundary onError={p.onError}>
          <Suspense fallback={null}>
            <Room url={p.modelUrl} darkness={p.darkness} onLoaded={p.onLoaded} />
            <RedStool />
            <Hotspots
              hotspots={HOTSPOTS}
              selectedId={p.selectedId}
              reveal={p.showHotspots}
              debug={p.debug}
              enabled={p.interactive}
              reducedMotion={p.reducedMotion}
              onSelect={p.onSelect}
            />
            <Glow position={AMP_INDICATOR} colour="#ff3b2f" on={p.ampOn} scale={0.12} reducedMotion={p.reducedMotion} />
            {SPEAKER_POSITIONS.map((pos, i) => (
              <Glow key={i} position={pos} colour="#ffb45e" on={p.speakersLive} scale={0.9} pulse reducedMotion={p.reducedMotion} />
            ))}
          </Suspense>
        </LoadBoundary>
        <CameraRig
          view={p.view}
          viewKey={p.viewKey}
          interactive={p.interactive}
          reducedMotion={p.reducedMotion}
          onUserMove={p.onUserMove}
        />
      </Canvas>
    </>
  );
}
