import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import * as sfx from './audio/sfx';
import { FACTS, MESSAGES, SECRETS, STORY } from './config/content';
import { HOME_VIEW, HOTSPOTS, getHotspot, hotspotForPuzzle, type CameraView, type Hotspot, type PuzzleId } from './config/hotspots';
import { allTasksDone, gameReducer, loadState, saveState, type TaskId } from './game/state';
import { useReducedMotion } from './game/useReducedMotion';
import { BeatPuzzle } from './ui/BeatPuzzle';
import { FactCard, InfoCard } from './ui/Cards';
import { FinalReveal, Hud } from './ui/Hud';
import { Intro } from './ui/Intro';
import { Discoveries, ObjectList, Settings } from './ui/Menus';
import { PedalPuzzle } from './ui/PedalPuzzle';
import { SetlistPuzzle } from './ui/SetlistPuzzle';

// three.js and the scene load in their own chunk so the title card appears straight away.
const Scene = lazy(() => import('./three/Scene'));
const loadModelUrl = () => import('./three/Room').then((m) => m.chooseModelUrl());

type Panel =
  | { kind: 'hotspot'; hotspot: Hotspot }
  | { kind: 'objects' }
  | { kind: 'discoveries' }
  | { kind: 'settings' }
  | null;

type RevealPhase = 'off' | 'dark' | 'line' | 'done';

const TASK_FOR_PUZZLE: Record<PuzzleId, TaskId> = { pedals: 'sound', setlist: 'setlist', beat: 'beat' };

const debug = new URLSearchParams(window.location.search).has('debug');

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadState());
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [view, setView] = useState<CameraView>(HOME_VIEW);
  const [viewKey, setViewKey] = useState(0);
  const [cameraMoved, setCameraMoved] = useState(false);
  const [gestureHint, setGestureHint] = useState(true);
  const [showHotspots, setShowHotspots] = useState(false);
  const [reveal, setReveal] = useState<RevealPhase>('off');
  const revealTimers = useRef<number[]>([]);
  const reducedMotion = useReducedMotion(state.motion);

  useEffect(() => {
    void loadModelUrl().then(setModelUrl);
  }, []);
  useEffect(() => saveState(state), [state]);
  useEffect(() => sfx.setEnabled(state.soundOn), [state.soundOn]);

  const goHome = useCallback(() => {
    setView(HOME_VIEW);
    setViewKey((k) => k + 1);
    setCameraMoved(false);
  }, []);

  const inspect = useCallback((h: Hotspot) => {
    setPanel({ kind: 'hotspot', hotspot: h });
    setView(h.focus);
    setViewKey((k) => k + 1);
    setGestureHint(false);
    if (h.action.type === 'secret') dispatch({ type: 'find-secret', id: h.action.secretId });
  }, []);

  const closePanel = useCallback(() => {
    const wasHotspot = panel?.kind === 'hotspot';
    setPanel(null);
    if (wasHotspot) goHome();
  }, [panel, goHome]);

  const onSelect = useCallback(
    (id: string) => {
      const h = getHotspot(id);
      if (h) inspect(h);
    },
    [inspect],
  );

  const complete = useCallback((task: TaskId) => {
    dispatch({ type: 'complete-task', task });
    if (task === 'setlist') dispatch({ type: 'add-discovery', id: 'setlist' });
  }, []);

  const clearRevealTimers = () => {
    revealTimers.current.forEach((t) => window.clearTimeout(t));
    revealTimers.current = [];
  };

  const startRehearsal = useCallback(() => {
    if (!allTasksDone(state)) return;
    clearRevealTimers();
    setPanel(null);
    goHome();
    const at = (ms: number, fn: () => void) => revealTimers.current.push(window.setTimeout(fn, ms));
    const settle = reducedMotion ? 300 : 1500;
    at(settle, () => {
      setReveal('dark');
      sfx.revealSting();
    });
    at(settle + 1600, () => setReveal('line'));
    at(settle + 4600, () => {
      setReveal('done');
      dispatch({ type: 'reveal-seen' });
    });
  }, [state, goHome, reducedMotion]);

  useEffect(() => () => clearRevealTimers(), []);

  const resetGame = useCallback(() => {
    clearRevealTimers();
    setReveal('off');
    setPanel(null);
    dispatch({ type: 'reset' });
    goHome();
  }, [goHome]);

  // Escape backs out of whatever is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !entered) return;
      if (reveal === 'done') setReveal('off');
      else if (panel) closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entered, panel, reveal, closePanel]);

  // Stop iOS Safari turning a pinch on the room into a page zoom.
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener('gesturestart', stop);
    return () => document.removeEventListener('gesturestart', stop);
  }, []);

  const enter = () => {
    sfx.unlock();
    sfx.setEnabled(state.soundOn);
    setEntered(true);
  };

  const interactive = entered && panel === null && (reveal === 'off' || reveal === 'done');
  const selectedId = panel?.kind === 'hotspot' ? panel.hotspot.id : null;
  const revealActive = reveal !== 'off';

  const onUserMove = useCallback(() => {
    setCameraMoved(true);
    setGestureHint(false);
  }, []);
  const onLoaded = useCallback(() => setLoaded(true), []);
  const onError = useCallback((e: Error) => setLoadError(e.message || 'Check your connection and try again.'), []);

  const panelContent = useMemo(() => {
    if (!panel) return null;
    switch (panel.kind) {
      case 'objects':
        return <ObjectList hotspots={HOTSPOTS} state={state} onPick={inspect} onClose={closePanel} />;
      case 'discoveries':
        return <Discoveries state={state} onClose={closePanel} />;
      case 'settings':
        return (
          <Settings
            state={state}
            showHotspots={showHotspots}
            onSound={(on) => dispatch({ type: 'set-sound', on })}
            onMotion={(motion) => dispatch({ type: 'set-motion', motion })}
            onShowHotspots={setShowHotspots}
            onReset={resetGame}
            onClose={closePanel}
          />
        );
      case 'hotspot':
        return renderHotspot(panel.hotspot);
    }

    function renderHotspot(h: Hotspot) {
      const a = h.action;
      switch (a.type) {
        case 'fact': {
          const fact = FACTS[a.factId];
          const task = fact.helpWith ? TASK_FOR_PUZZLE[fact.helpWith] : null;
          return (
            <FactCard
              key={h.id}
              fact={fact}
              helpDone={task ? state.tasks[task] : false}
              onHelp={fact.helpWith ? () => inspect(hotspotForPuzzle(fact.helpWith!)) : undefined}
              onClose={closePanel}
            />
          );
        }
        case 'puzzle': {
          const task = TASK_FOR_PUZZLE[a.puzzle];
          const props = { solved: state.tasks[task], onSolved: () => complete(task), onClose: closePanel };
          if (a.puzzle === 'pedals') return <PedalPuzzle key={h.id} {...props} />;
          if (a.puzzle === 'setlist') return <SetlistPuzzle key={h.id} {...props} />;
          return <BeatPuzzle key={h.id} {...props} />;
        }
        case 'secret': {
          const s = SECRETS[a.secretId];
          return <InfoCard key={h.id} title={s.title} eyebrow="Secret found" body={s.body} onClose={closePanel} />;
        }
        case 'message': {
          let id = a.messageId;
          if (id === 'speaker' && allTasksDone(state)) id = 'speakerLive';
          if (id === 'mixer' && state.tasks.sound) id = 'mixerLive';
          return <InfoCard key={h.id} title={h.label} eyebrow="Look closer" body={MESSAGES[id]} onClose={closePanel} />;
        }
      }
    }
  }, [panel, state, showHotspots, inspect, closePanel, complete, resetGame]);

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#1b1412]" aria-label={STORY.title}>
      {modelUrl && (
        <Suspense fallback={null}>
          <Scene
            modelUrl={modelUrl}
            view={view}
            viewKey={viewKey}
            interactive={interactive}
            selectedId={selectedId}
            showHotspots={showHotspots}
            debug={debug}
            reducedMotion={reducedMotion}
            darkness={reveal === 'dark' || reveal === 'line' ? 1 : 0}
            ampOn={state.tasks.sound}
            speakersLive={revealActive || state.revealSeen}
            onSelect={onSelect}
            onUserMove={onUserMove}
            onLoaded={onLoaded}
            onProgress={setProgress}
            onError={onError}
          />
        </Suspense>
      )}

      {!entered ? (
        <Intro progress={progress} loaded={loaded} error={loadError} onEnter={enter} />
      ) : (
        <>
          {(reveal === 'off' || reveal === 'done') && (
            <Hud
              state={state}
              panelOpen={panel !== null || reveal === 'done'}
              cameraMoved={cameraMoved}
              showGestureHint={gestureHint}
              onObjects={() => setPanel({ kind: 'objects' })}
              onDiscoveries={() => setPanel({ kind: 'discoveries' })}
              onSettings={() => setPanel({ kind: 'settings' })}
              onSound={() => dispatch({ type: 'set-sound', on: !state.soundOn })}
              onResetView={goHome}
              onStartRehearsal={startRehearsal}
            />
          )}
          {panelContent}
          {revealActive && (
            <FinalReveal
              phase={reveal}
              line={STORY.finalLine}
              speaker={STORY.finalSpeaker}
              onKeepExploring={() => setReveal('off')}
              onPlayAgain={resetGame}
            />
          )}
        </>
      )}
    </main>
  );
}
