import { useCallback, useEffect, useRef, useState } from 'react';
import { AutoGain, computeRms, estimateNoiseFloor } from '../lib/audioAnalysis';

export type MicStatus = 'off' | 'requesting' | 'calibrating' | 'listening' | 'denied' | 'unavailable' | 'paused' | 'error';

const CALIBRATION_MS = 3000;

/**
 * Microphone → energy. Audio is analysed in memory, frame by frame; nothing is
 * recorded, stored or sent anywhere. The AnalyserNode is never connected to
 * the speakers.
 */
export function useMicrophone(sensitivity: number) {
  const [status, setStatusState] = useState<MicStatus>('off');
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  const statusRef = useRef<MicStatus>('off');
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufRef = useRef<Float32Array | null>(null);
  const floorRef = useRef(0.003);
  const sensRef = useRef(sensitivity);
  const calibTimer = useRef<number | null>(null);
  const startToken = useRef(0);
  const gainRef = useRef(new AutoGain());
  const lastReadRef = useRef(0);
  sensRef.current = sensitivity;

  const setStatus = (s: MicStatus) => {
    statusRef.current = s;
    setStatusState(s);
  };

  const sampleRms = useCallback((): number | null => {
    const analyser = analyserRef.current;
    const buf = bufRef.current;
    if (!analyser || !buf) return null;
    analyser.getFloatTimeDomainData(buf);
    return computeRms(buf);
  }, []);

  const teardown = useCallback(() => {
    if (calibTimer.current) clearInterval(calibTimer.current);
    calibTimer.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    analyserRef.current = null;
    bufRef.current = null;
    const ctx = ctxRef.current;
    ctxRef.current = null;
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => {});
  }, []);

  const calibrate = useCallback(() => {
    if (!analyserRef.current) return;
    if (calibTimer.current) clearInterval(calibTimer.current);
    setStatus('calibrating');
    setCalibrationProgress(0);
    const samples: number[] = [];
    const t0 = performance.now();
    calibTimer.current = window.setInterval(() => {
      const rms = sampleRms();
      if (rms != null) samples.push(rms);
      const p = (performance.now() - t0) / CALIBRATION_MS;
      setCalibrationProgress(Math.min(1, p));
      if (p >= 1) {
        clearInterval(calibTimer.current!);
        calibTimer.current = null;
        floorRef.current = estimateNoiseFloor(samples);
        gainRef.current.reset();
        if (statusRef.current === 'calibrating') setStatus('listening');
      }
    }, 50);
  }, [sampleRms]);

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'audioinput'));
    } catch {
      /* ignore */
    }
  }, []);

  const start = useCallback(
    async (wantedDevice?: string | null) => {
      const token = ++startToken.current;
      setError(null);
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError('Microphone access needs a secure (https) page in a supported browser.');
        setStatus('unavailable');
        return false;
      }
      teardown();
      setStatus('requesting');
      const dev = wantedDevice === undefined ? deviceId : wantedDevice;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            ...(dev ? { deviceId: { exact: dev } } : {}),
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        });
        if (token !== startToken.current) {
          stream.getTracks().forEach((t) => t.stop());
          return false;
        }
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyser.smoothingTimeConstant = 0;
        source.connect(analyser);
        streamRef.current = stream;
        ctxRef.current = ctx;
        analyserRef.current = analyser;
        bufRef.current = new Float32Array(analyser.fftSize);
        await ctx.resume().catch(() => {});
        const track = stream.getAudioTracks()[0];
        if (track) {
          track.onended = () => {
            if (streamRef.current === stream) {
              teardown();
              setError('The microphone was disconnected.');
              setStatus('unavailable');
            }
          };
          const settingsId = track.getSettings().deviceId;
          if (settingsId) setDeviceId(dev ?? null);
        }
        refreshDevices();
        calibrate();
        return true;
      } catch (e) {
        if (token !== startToken.current) return false;
        const name = (e as DOMException)?.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          setError('Microphone permission was blocked. You can allow it from the browser’s address bar.');
          setStatus('denied');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError') {
          setError(name === 'NotReadableError' ? 'The microphone is in use by another app.' : 'No microphone was found.');
          setStatus('unavailable');
        } else {
          setError('Something went wrong starting the microphone.');
          setStatus('error');
        }
        return false;
      }
    },
    [calibrate, deviceId, refreshDevices, teardown],
  );

  const stop = useCallback(() => {
    startToken.current++;
    teardown();
    setError(null);
    setStatus('off');
  }, [teardown]);

  const selectDevice = useCallback(
    (id: string | null) => {
      setDeviceId(id);
      if (statusRef.current !== 'off') start(id);
    },
    [start],
  );

  /** Called every animation frame. Cheap: one analyser read and a few math ops. */
  const readEnergy = useCallback((): number => {
    if (statusRef.current !== 'listening') return 0;
    const rms = sampleRms();
    if (rms == null) return 0;
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0.001, (now - lastReadRef.current) / 1000));
    lastReadRef.current = now;
    return gainRef.current.energy(rms, floorRef.current, sensRef.current, dt);
  }, [sampleRms]);

  // Suspend analysis while the tab is hidden; resume when it returns.
  useEffect(() => {
    const onVis = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (document.visibilityState === 'hidden' && statusRef.current === 'listening') {
        ctx.suspend().catch(() => {});
        setStatus('paused');
      } else if (document.visibilityState === 'visible' && statusRef.current === 'paused') {
        ctx.resume().then(() => setStatus('listening'), () => setStatus('error'));
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Browsers may start an AudioContext suspended until a user gesture.
  useEffect(() => {
    const kick = () => {
      const ctx = ctxRef.current;
      if (ctx && ctx.state === 'suspended' && statusRef.current !== 'paused') ctx.resume().catch(() => {});
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  }, []);

  useEffect(() => teardown, [teardown]);

  return {
    status,
    error,
    devices,
    deviceId,
    calibrationProgress,
    start,
    stop,
    recalibrate: calibrate,
    selectDevice,
    readEnergy,
  };
}

export type Microphone = ReturnType<typeof useMicrophone>;

/** True if the browser already remembers a microphone grant for this site. */
export async function micPermissionGranted(): Promise<boolean> {
  try {
    const p = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    return p?.state === 'granted';
  } catch {
    return false;
  }
}
