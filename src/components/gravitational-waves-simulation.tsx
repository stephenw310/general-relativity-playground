"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GW150914_H1_GHOST } from "@/data/gw150914-h1-ghost";
import {
  buildInspiralWaveform,
  getBinaryParameters,
  type InspiralWaveform,
} from "@/utils/relativity-calculations";

type PlaybackState = "idle" | "running" | "ringdown" | "done";

function waveformIndexAt(waveform: InspiralWaveform, playhead: number) {
  let low = 0;
  let high = waveform.playbackTime.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((waveform.playbackTime[middle] ?? 0) < playhead) low = middle + 1;
    else high = middle;
  }
  return Math.max(0, low);
}

function formatDuration(seconds: number) {
  if (seconds < 0.001) return `${(seconds * 1e6).toFixed(0)} μs`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms`;
  if (seconds < 120) return `${seconds.toFixed(1)} s`;
  return `${(seconds / 60).toFixed(1)} min`;
}

function formatStrain(value: number) {
  if (!Number.isFinite(value) || value === 0) return "0";
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  return `${(value / 10 ** exponent).toFixed(2)} × 10${String(exponent).replace("-", "⁻")}`;
}

function BinaryWaveField({
  massOne,
  massTwo,
  inclination,
  waveform,
  playheadRef,
  playbackStateRef,
}: {
  massOne: number;
  massTwo: number;
  inclination: number;
  waveform: InspiralWaveform;
  playheadRef: { current: number };
  playbackStateRef: { current: PlaybackState };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const totalMass = massOne + massTwo;
    const cosInclination = Math.cos((inclination * Math.PI) / 180);
    const initialSeparation = waveform.separation[0] ?? 3;
    let width = 0;
    let height = 0;
    let frame = 0;
    const startTime = performance.now();

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const render = (now: number) => {
      const playhead = playheadRef.current;
      const sampleIndex = waveformIndexAt(waveform, playhead);
      const state = playbackStateRef.current;
      const afterMerger = sampleIndex >= waveform.mergerIndex;
      const separation = afterMerger
        ? 0
        : (waveform.separation[sampleIndex] ?? initialSeparation);
      const idlePhase = ((now - startTime) / 1000) * 0.72 - 0.65;
      const phase =
        state === "idle"
          ? reduceMotion
            ? -0.65
            : idlePhase
          : (waveform.orbitalPhase[sampleIndex] ?? 0);
      const frequency = waveform.fGW[sampleIndex] ?? 0;

      context.clearRect(0, 0, width, height);
      const centerX = width * (width < 768 ? 0.5 : 0.51);
      const centerY = height * (width < 768 ? 0.44 : 0.46);
      const background = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.max(width, height) * 0.75,
      );
      background.addColorStop(0, "#210916");
      background.addColorStop(0.4, "#0b030a");
      background.addColorStop(1, "#030104");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(255, 186, 219, 0.47)";
      for (let index = 0; index < 155; index += 1) {
        const x = (((index * 787) % 997) / 997) * width;
        const y = (((index * 523) % 991) / 991) * height;
        context.globalAlpha = 0.12 + (index % 9) / 25;
        context.fillRect(x, y, index % 19 === 0 ? 1.4 : 0.65, 0.65);
      }
      context.globalAlpha = 1;

      const waveExtent = Math.min(width, height) * 0.46;
      const waveFade = afterMerger
        ? Math.exp(-Math.max(0, playhead - waveform.mergerPlaybackTime) / 0.7)
        : 1;
      const wavelength = Math.max(
        18,
        Math.min(
          74,
          66 * ((waveform.fGW[0] ?? frequency) / Math.max(frequency, 0.01)),
        ),
      );
      const spiralGradient = context.createRadialGradient(
        centerX,
        centerY,
        20,
        centerX,
        centerY,
        waveExtent,
      );
      spiralGradient.addColorStop(0, `rgba(255, 89, 166, ${0.28 * waveFade})`);
      spiralGradient.addColorStop(
        0.72,
        `rgba(255, 89, 166, ${0.12 * waveFade})`,
      );
      spiralGradient.addColorStop(1, "rgba(255, 89, 166, 0)");
      for (let arm = 0; arm < 2; arm += 1) {
        context.strokeStyle = spiralGradient;
        context.lineWidth = 1.2;
        context.beginPath();
        for (let step = 0; step <= 260; step += 1) {
          const theta = (step / 260) * Math.PI * 6;
          const radius = 26 + (wavelength / (2 * Math.PI)) * theta;
          const angle = theta + phase + arm * Math.PI;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (step === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.stroke();
      }

      const mergerSeparation = waveform.separation[waveform.mergerIndex] ?? 3;
      const visualSeparation = afterMerger
        ? 0
        : 38 +
          ((separation - mergerSeparation) /
            Math.max(initialSeparation - mergerSeparation, 1)) *
            Math.min(105, width * 0.11);
      const orbitYScale = Math.abs(cosInclination);
      const oneDistance = visualSeparation * (massTwo / totalMass);
      const twoDistance = visualSeparation * (massOne / totalMass);
      const cosPhase = Math.cos(phase);
      const sinPhase = Math.sin(phase) * orbitYScale;
      const oneX = centerX + cosPhase * oneDistance;
      const oneY = centerY + sinPhase * oneDistance;
      const twoX = centerX - cosPhase * twoDistance;
      const twoY = centerY - sinPhase * twoDistance;

      if (!afterMerger) {
        context.strokeStyle = "rgba(255, 133, 189, 0.18)";
        context.setLineDash([4, 6]);
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          oneDistance,
          oneDistance * orbitYScale,
          0,
          0,
          Math.PI * 2,
        );
        context.stroke();
        context.beginPath();
        context.ellipse(
          centerX,
          centerY,
          twoDistance,
          twoDistance * orbitYScale,
          0,
          0,
          Math.PI * 2,
        );
        context.stroke();
        context.setLineDash([]);
      }

      const body = (x: number, y: number, mass: number, color: string) => {
        // Schwarzschild radius is proportional to mass. The shared additive
        // radius keeps both horizons visible without changing their ordering.
        const radius = 6 + (mass / Math.max(totalMass, 1)) * 24;
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * 2.4);
        glow.addColorStop(0, "#fff");
        glow.addColorStop(0.14, color);
        glow.addColorStop(0.42, "rgba(255, 82, 159, 0.3)");
        glow.addColorStop(1, "rgba(255, 50, 135, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, radius * 2.4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#020102";
        context.strokeStyle = color;
        context.lineWidth = 1.3;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        context.stroke();
      };
      if (afterMerger) {
        const flashAge = Math.max(0, playhead - waveform.mergerPlaybackTime);
        const flashRadius = 42 + flashAge * 170;
        const flashAlpha = Math.exp(-flashAge * 3.4);
        context.strokeStyle = `rgba(255, 225, 239, ${flashAlpha * 0.8})`;
        context.lineWidth = 2;
        context.beginPath();
        context.arc(centerX, centerY, flashRadius, 0, Math.PI * 2);
        context.stroke();
        body(centerX, centerY, waveform.finalMass, "#ffc1dd");
        context.fillStyle = "rgba(255, 211, 230, 0.78)";
        context.font = "500 10px ui-monospace, monospace";
        context.textAlign = "center";
        context.fillText(
          `REMNANT · ${waveform.finalMass.toFixed(1)} M☉`,
          centerX,
          centerY + 58,
        );
      } else {
        body(oneX, oneY, massOne, "#ff93c4");
        body(twoX, twoY, massTwo, "#ffd0e5");
      }

      context.fillStyle = "rgba(255, 184, 216, 0.62)";
      context.textAlign = "center";
      context.font = "500 10px ui-monospace, monospace";
      context.fillText(
        `${frequency.toFixed(frequency < 10 ? 2 : 1)} Hz · ${afterMerger ? "RINGDOWN" : "TWO STRAIN POLARIZATIONS"}`,
        centerX,
        centerY - waveExtent * 0.77,
      );

      if (!reduceMotion) frame = requestAnimationFrame(render);
    };

    render(startTime);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [inclination, massOne, massTwo, playbackStateRef, playheadRef, waveform]);

  return <canvas ref={canvasRef} />;
}

function DetectorRing({
  waveform,
  playhead,
  state,
  inclination,
}: {
  waveform: InspiralWaveform;
  playhead: number;
  state: PlaybackState;
  inclination: number;
}) {
  const [idleTime, setIdleTime] = useState(0);
  useEffect(() => {
    if (state !== "idle") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setIdleTime((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [state]);
  const index = waveformIndexAt(waveform, playhead);
  const cosInclination = Math.cos((inclination * Math.PI) / 180);
  const idlePhase =
    Math.PI * 2 * (waveform.fGW[0] ?? 0) * Math.max(idleTime, 0);
  const hPlus =
    state === "idle"
      ? (waveform.amplitude[0] ?? 0) *
        ((1 + cosInclination ** 2) / 2) *
        Math.cos(idlePhase)
      : (waveform.hPlus[index] ?? 0);
  const hCross =
    state === "idle"
      ? (waveform.amplitude[0] ?? 0) * cosInclination * Math.sin(idlePhase)
      : (waveform.hCross[index] ?? 0);
  const peak = Math.max(...waveform.amplitude, Number.MIN_VALUE);
  const exaggeration = 0.3 / peak;
  const masses = Array.from({ length: 16 }, (_, massIndex) => {
    const angle = (massIndex / 16) * Math.PI * 2;
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const displacedX = x + (exaggeration * (hPlus * x + hCross * y)) / 2;
    const displacedY = y + (exaggeration * (hCross * x - hPlus * y)) / 2;
    return {
      id: `test-mass-${massIndex}`,
      x: Number((50 + displacedX * 34).toFixed(4)),
      y: Number((50 + displacedY * 34).toFixed(4)),
    };
  });

  return (
    <div className="physics-detector-ring">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="Test masses displaced by plus and cross strain"
      >
        <circle cx="50" cy="50" r="34" className="physics-detector-guide" />
        {masses.map((mass) => (
          <circle key={mass.id} cx={mass.x} cy={mass.y} r="2.4" />
        ))}
      </svg>
      <small className="physics-detector-caption">
        test masses · exaggerated ×10²⁰
      </small>
    </div>
  );
}

function WaveTimeline({
  waveform,
  playhead,
  state,
  showGhost,
  inclination,
  onReplay,
}: {
  waveform: InspiralWaveform;
  playhead: number;
  state: PlaybackState;
  showGhost: boolean;
  inclination: number;
  onReplay: () => void;
}) {
  const paths = useMemo(() => {
    const peak = Math.max(
      ...waveform.hPlus.map((value) => Math.abs(value)),
      ...waveform.hCross.map((value) => Math.abs(value)),
      Number.MIN_VALUE,
    );
    const toPoints = (values: number[]) =>
      values
        .filter((_, index) => index % 2 === 0)
        .map((value, pointIndex) => {
          const sourceIndex = pointIndex * 2;
          const x =
            ((waveform.playbackTime[sourceIndex] ?? 0) / waveform.duration) *
            1000;
          const y = 70 - (value / peak) * 51;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");
    return { plus: toPoints(waveform.hPlus), cross: toPoints(waveform.hCross) };
  }, [waveform]);
  const ghostPoints = useMemo(
    () =>
      GW150914_H1_GHOST.map((value, index) => {
        const x = (index / (GW150914_H1_GHOST.length - 1)) * 1000;
        return `${x.toFixed(2)},${(70 - value * 42).toFixed(2)}`;
      }).join(" "),
    [],
  );
  const mergerX = (waveform.mergerPlaybackTime / waveform.duration) * 1000;
  const playheadX =
    (Math.min(playhead, waveform.duration) / waveform.duration) * 1000;
  const index = waveformIndexAt(waveform, playhead);

  return (
    <section
      className="physics-wave-timeline"
      aria-label="Full inspiral merger and ringdown timeline"
    >
      <header>
        <b>Strain timeline · h(t)</b>
        <span className="physics-instrument-meta">
          {formatStrain(waveform.amplitude[index] ?? 0)} ·{" "}
          {waveform.fGW[index]?.toFixed(0) ?? 0} Hz
        </span>
      </header>
      <div className="physics-wave-timeline-body">
        <DetectorRing
          waveform={waveform}
          playhead={playhead}
          state={state}
          inclination={inclination}
        />
        <div className="physics-wave-chart">
          <svg
            viewBox="0 0 1000 140"
            preserveAspectRatio="none"
            role="img"
            aria-label="Plus and cross strain through inspiral, merger, and ringdown"
          >
            <line
              x1="0"
              y1="70"
              x2="1000"
              y2="70"
              className="physics-wave-axis"
            />
            {showGhost && (
              <polyline points={ghostPoints} className="physics-wave-ghost" />
            )}
            <polyline points={paths.cross} className="physics-wave-cross" />
            <polyline points={paths.plus} className="physics-wave-plus" />
            <line
              x1={mergerX}
              y1="4"
              x2={mergerX}
              y2="136"
              className="physics-wave-merger"
            />
            <line
              x1={playheadX}
              y1="0"
              x2={playheadX}
              y2="140"
              className="physics-wave-playhead"
            />
          </svg>
          <div className="physics-wave-labels">
            <span>inspiral · {waveform.fGW[0]?.toFixed(0)} Hz</span>
            <b className="physics-wave-merger-label">
              merger · {waveform.ringdownFrequencyHz.toFixed(0)} Hz
            </b>
            <span className="physics-wave-ringdown-label">ringdown</span>
          </div>
          <div className="physics-wave-scrub">
            <button type="button" onClick={onReplay}>
              {state === "idle" ? "Release" : "Replay"}
            </button>
            <progress
              max={waveform.duration}
              value={Math.min(playhead, waveform.duration)}
            />
            <span className="physics-wave-time">
              t = {(waveform.t[index] ?? 0).toFixed(3)} s
            </span>
          </div>
          {showGhost && (
            <small className="physics-wave-credit">
              dim trace: GWOSC H1 GW150914 open strain data · CC BY 4.0
            </small>
          )}
        </div>
      </div>
    </section>
  );
}

export function GravitationalWavesSimulation() {
  const [massOne, setMassOne] = useState(36);
  const [massTwo, setMassTwo] = useState(29);
  const [separation, setSeparation] = useState(14);
  const [distance, setDistance] = useState(410);
  const [inclination, setInclination] = useState(35);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [playhead, setPlayhead] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const playheadRef = useRef(0);
  const playbackStateRef = useRef<PlaybackState>("idle");
  const playbackEpochRef = useRef(0);
  const playbackFrameRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioGainRef = useRef<GainNode | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);

  const binary = useMemo(
    () => getBinaryParameters(massOne, massTwo, separation, distance),
    [distance, massOne, massTwo, separation],
  );
  const waveform = useMemo(
    () =>
      buildInspiralWaveform(
        massOne,
        massTwo,
        separation,
        distance,
        inclination,
      ),
    [distance, inclination, massOne, massTwo, separation],
  );
  const isGW150914 =
    massOne === 36 &&
    massTwo === 29 &&
    separation === 14 &&
    distance === 410 &&
    inclination === 35;
  const currentWaveIndex = waveformIndexAt(waveform, playhead);
  const playbackActive =
    playbackState === "running" || playbackState === "ringdown";

  const stopAudio = useCallback(() => {
    const context = audioContextRef.current;
    const gain = audioGainRef.current;
    const source = audioSourceRef.current;
    if (context && gain) {
      gain.gain.cancelScheduledValues(context.currentTime);
      gain.gain.setValueAtTime(gain.gain.value, context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.025);
    }
    if (source && context) {
      try {
        source.stop(context.currentTime + 0.03);
      } catch {
        // The source may already have ended naturally.
      }
    }
    audioSourceRef.current = null;
    audioGainRef.current = null;
  }, []);

  const startAudio = useCallback(() => {
    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    void context.resume();
    const sampleRate = 22_050;
    const length = Math.ceil(waveform.duration * sampleRate);
    const buffer = context.createBuffer(1, length, sampleRate);
    const channel = buffer.getChannelData(0);
    const peakAmplitude = Math.max(...waveform.amplitude, Number.MIN_VALUE);
    let sourceIndex = 0;
    let phase = 0;
    for (let index = 0; index < length; index += 1) {
      const displayTime = index / sampleRate;
      while (
        sourceIndex < waveform.playbackTime.length - 1 &&
        (waveform.playbackTime[sourceIndex + 1] ?? 0) < displayTime
      ) {
        sourceIndex += 1;
      }
      const frequency = (waveform.fGW[sourceIndex] ?? 0) * 2;
      phase += (Math.PI * 2 * frequency) / sampleRate;
      const envelope = (waveform.amplitude[sourceIndex] ?? 0) / peakAmplitude;
      const fadeIn = Math.min(1, displayTime / 0.04);
      const mergerAge = displayTime - waveform.mergerPlaybackTime;
      const thud =
        mergerAge >= 0
          ? 0.11 *
            Math.exp(-mergerAge / 0.16) *
            Math.sin(Math.PI * 2 * 58 * mergerAge)
          : 0;
      channel[index] = Math.max(
        -1,
        Math.min(1, Math.sin(phase) * envelope * fadeIn * 0.24 + thud),
      );
    }
    const source = context.createBufferSource();
    const gain = context.createGain();
    gain.gain.value = 0.9;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(context.destination);
    source.start();
    audioSourceRef.current = source;
    audioGainRef.current = gain;
  }, [waveform]);

  const releaseBinary = useCallback(() => {
    stopAudio();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      playheadRef.current = waveform.duration;
      playbackStateRef.current = "done";
      setPlayhead(waveform.duration);
      setPlaybackState("done");
      return;
    }
    playheadRef.current = 0;
    playbackStateRef.current = "running";
    playbackEpochRef.current = performance.now();
    setPlayhead(0);
    setPlaybackState("running");
    if (audioEnabled) startAudio();
  }, [audioEnabled, startAudio, stopAudio, waveform.duration]);

  useEffect(() => {
    if (waveform.playbackTime.length === 0) return;
    stopAudio();
    playheadRef.current = 0;
    playbackStateRef.current = "idle";
    setPlayhead(0);
    setPlaybackState("idle");
  }, [stopAudio, waveform]);

  useEffect(() => {
    const tick = (now: number) => {
      const state = playbackStateRef.current;
      if (state === "running" || state === "ringdown") {
        const nextPlayhead = Math.min(
          waveform.duration,
          (now - playbackEpochRef.current) / 1000,
        );
        playheadRef.current = nextPlayhead;
        setPlayhead(nextPlayhead);
        const nextState: PlaybackState =
          nextPlayhead >= waveform.duration
            ? "done"
            : nextPlayhead >= waveform.mergerPlaybackTime
              ? "ringdown"
              : "running";
        if (nextState !== playbackStateRef.current) {
          playbackStateRef.current = nextState;
          setPlaybackState(nextState);
        }
      }
      playbackFrameRef.current = requestAnimationFrame(tick);
    };
    playbackFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(playbackFrameRef.current);
  }, [waveform.duration, waveform.mergerPlaybackTime]);

  useEffect(() => {
    if (!audioEnabled) stopAudio();
  }, [audioEnabled, stopAudio]);

  useEffect(
    () => () => {
      stopAudio();
      void audioContextRef.current?.close();
    },
    [stopAudio],
  );

  function loadPreset(preset: "gw150914" | "unequal" | "neutron") {
    if (preset === "gw150914") {
      setMassOne(36);
      setMassTwo(29);
      setSeparation(14);
      setDistance(410);
      setInclination(35);
    } else if (preset === "unequal") {
      setMassOne(55);
      setMassTwo(12);
      setSeparation(18);
      setDistance(700);
      setInclination(68);
    } else {
      setMassOne(1.4);
      setMassTwo(1.4);
      setSeparation(24);
      setDistance(40);
      setInclination(25);
    }
  }

  return (
    <main className="physics-shell waves-shell">
      <nav className="spacetime-topbar" aria-label="Simulation navigation">
        <Link href="/" className="spacetime-back">
          <span aria-hidden="true">←</span>
          <span>Mission select</span>
        </Link>
        <div className="spacetime-mission-id">
          <span>06</span>
          <b>Waves</b>
        </div>
      </nav>

      <button
        type="button"
        className="physics-controls-toggle spacetime-objects-toggle"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        aria-controls="wave-controls"
      >
        <span>Binary setup</span>
        <b aria-hidden="true">∿</b>
      </button>

      <aside
        id="wave-controls"
        className={
          panelOpen
            ? "physics-controls is-open spacetime-controls"
            : "physics-controls spacetime-controls"
        }
        aria-label="Gravitational wave parameters"
      >
        <header className="spacetime-controls-header">
          <div>
            <span className="spacetime-panel-kicker">
              Change the conditions
            </span>
            <h2>Binary setup</h2>
          </div>
          <button
            type="button"
            className="spacetime-panel-close"
            onClick={() => setPanelOpen(false)}
            aria-label="Close binary parameters"
          >
            ×
          </button>
        </header>
        <div className="spacetime-controls-summary">
          <span>
            <b>
              {(waveform.fGW[currentWaveIndex] ?? 0).toFixed(
                (waveform.fGW[currentWaveIndex] ?? 0) < 10 ? 2 : 1,
              )}{" "}
              Hz
            </b>
            GW frequency
          </span>
          <span>
            <b>{binary.chirpMass.toFixed(2)} M☉</b>chirp mass
          </span>
        </div>

        <div className="black-hole-control-list">
          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">01</span>
              <div>
                <h3>Observed systems</h3>
                <p>Load representative compact binaries.</p>
              </div>
            </div>
            <fieldset className="physics-preset-grid">
              <legend className="sr-only">Binary presets</legend>
              <button
                type="button"
                className={isGW150914 ? "is-active" : undefined}
                onClick={() => loadPreset("gw150914")}
              >
                GW150914
              </button>
              <button type="button" onClick={() => loadPreset("unequal")}>
                Unequal
              </button>
              <button type="button" onClick={() => loadPreset("neutron")}>
                Neutron
              </button>
            </fieldset>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">02</span>
              <div>
                <h3>Source frame</h3>
                <p>Set component masses and orbital separation.</p>
              </div>
            </div>
            <label className="black-hole-range-field">
              <span>
                Primary mass <b>{massOne.toFixed(1)} M☉</b>
              </span>
              <input
                type="range"
                min={1.2}
                max={80}
                step={0.2}
                value={massOne}
                onChange={(event) => setMassOne(Number(event.target.value))}
              />
            </label>
            <label className="black-hole-range-field">
              <span>
                Secondary mass <b>{massTwo.toFixed(1)} M☉</b>
              </span>
              <input
                type="range"
                min={1.2}
                max={80}
                step={0.2}
                value={massTwo}
                onChange={(event) => setMassTwo(Number(event.target.value))}
              />
            </label>
            <label className="black-hole-range-field">
              <span>
                Separation <b>{separation.toFixed(1)} GM/c²</b>
              </span>
              <input
                type="range"
                min={8}
                max={40}
                step={0.2}
                value={separation}
                onChange={(event) => setSeparation(Number(event.target.value))}
              />
              <small>
                {binary.separationKm.toFixed(0)} km center-to-center;
                quasi-circular leading-order model.
              </small>
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">03</span>
              <div>
                <h3>Playback</h3>
                <p>One-shot inspiral, merger flash, and damped ringdown.</p>
              </div>
            </div>
            <button
              type="button"
              className="physics-primary-action"
              onClick={releaseBinary}
            >
              {playbackState === "idle"
                ? "Release the binary"
                : playbackActive
                  ? playbackState === "ringdown"
                    ? "Ringdown…"
                    : "Binary released…"
                  : "Replay"}
            </button>
            <label className="black-hole-switch-row">
              <span>
                <b>Chirp audio · pitch ×2</b>
                <small>
                  Uses the same waveform arrays; starts only on click.
                </small>
              </span>
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(event) => setAudioEnabled(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">04</span>
              <div>
                <h3>Observer</h3>
                <p>Projection changes polarization; distance scales strain.</p>
              </div>
            </div>
            <label className="black-hole-range-field">
              <span>
                Distance <b>{distance.toFixed(0)} Mpc</b>
              </span>
              <input
                type="range"
                min={10}
                max={1000}
                step={10}
                value={distance}
                onChange={(event) => setDistance(Number(event.target.value))}
              />
            </label>
            <label className="black-hole-range-field">
              <span>
                Inclination <b>{inclination.toFixed(0)}°</b>
              </span>
              <input
                type="range"
                min={0}
                max={90}
                step={1}
                value={inclination}
                onChange={(event) => setInclination(Number(event.target.value))}
              />
              <small>0° is face-on; h× vanishes at 90° edge-on.</small>
            </label>
          </section>

          <section className="black-hole-control-section">
            <div className="black-hole-control-heading">
              <span aria-hidden="true">05</span>
              <div>
                <h3>Leading-order signal</h3>
                <p>Quadrupole strain for a circular binary.</p>
              </div>
            </div>
            <p className="physics-equation">h₀ = 4(Gℳ)⁵ᐟ³(πf)²ᐟ³ / c⁴D</p>
            <div className="physics-data-row">
              <span>Optimal strain h₀</span>
              <b>{formatStrain(binary.strainAmplitude)}</b>
            </div>
            <div className="physics-data-row">
              <span>Peters inspiral to 3 GM/c²</span>
              <b>{formatDuration(waveform.physicalInspiralDuration)}</b>
            </div>
            <div className="physics-data-row">
              <span>Remnant / radiated energy</span>
              <b>
                {waveform.finalMass.toFixed(1)} M☉ / ≈{" "}
                {waveform.radiatedMass.toFixed(1)} M☉c²
              </b>
            </div>
          </section>
        </div>
        <footer className="black-hole-controls-actions spacetime-controls-actions">
          <button type="button" onClick={() => loadPreset("gw150914")}>
            <span aria-hidden="true">↺</span>Reset parameters
          </button>
        </footer>
      </aside>

      <button
        type="button"
        className="spacetime-info-toggle"
        onClick={() => setHudOpen((open) => !open)}
        aria-expanded={hudOpen}
        aria-controls="waves-instructions"
        aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
      >
        {hudOpen ? "×" : "?"}
      </button>

      <section
        id="waves-instructions"
        className={
          hudOpen
            ? "is-open physics-brief spacetime-brief"
            : "physics-brief spacetime-brief"
        }
        aria-label="Simulation instructions"
      >
        <p className="spacetime-eyebrow">Quadrupole radiation laboratory</p>
        <h1>Gravitational Waves</h1>
        <p className="spacetime-brief-copy">
          Orbiting compact objects radiate two tensor polarizations at twice
          their orbital frequency. Release the binary and ride its chirp through
          merger into ringdown.
        </p>
        <div className="spacetime-readout">
          <span>
            <b>{binary.chirpMass.toFixed(2)} M☉</b>chirp mass
          </span>
          <span>
            <b>
              {waveform.fGW[0]?.toFixed(0)}→
              {waveform.ringdownFrequencyHz.toFixed(0)} Hz
            </b>
            chirp band · audible
          </span>
        </div>
        <div className="spacetime-instructions">
          <div>
            <span className="spacetime-instruction-number">1</span>
            <p>
              <b>Tune the binary</b>Masses and separation set the pitch
            </p>
          </div>
          <div>
            <span className="spacetime-instruction-number">2</span>
            <p>
              <b>Release it</b>Inspiral → merger flash → ringdown, once
            </p>
          </div>
          <div>
            <span className="spacetime-instruction-number">3</span>
            <p>
              <b>Listen</b>The same strain timeline plays as sound, pitch ×2
            </p>
          </div>
        </div>
      </section>

      <section
        className="physics-canvas"
        aria-label="Binary inspiral and gravitational waveform"
      >
        <BinaryWaveField
          massOne={massOne}
          massTwo={massTwo}
          inclination={inclination}
          waveform={waveform}
          playheadRef={playheadRef}
          playbackStateRef={playbackStateRef}
        />
      </section>
      <WaveTimeline
        waveform={waveform}
        playhead={playhead}
        state={playbackState}
        showGhost={isGW150914}
        inclination={inclination}
        onReplay={releaseBinary}
      />
      <div className="physics-formula-strip" aria-live="polite">
        <span>
          {playbackState === "idle" ? "Wave model" : "Playback phase"}
        </span>
        <b>
          {playbackState === "idle"
            ? "Quadrupole + Peters + damped ringdown"
            : playbackState}
        </b>
      </div>
      <div className="spacetime-vignette" aria-hidden="true" />
      <div className="spacetime-grain" aria-hidden="true" />
    </main>
  );
}
