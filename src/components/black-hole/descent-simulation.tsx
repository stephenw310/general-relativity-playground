"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlightView } from "@/components/black-hole/flight-view";
import { FlightMusic } from "@/components/black-hole/flight-music";
import { FlightOverview } from "@/components/black-hole/flight-overview";
import { planetView } from "@/utils/descent-planet";
import { WebGLErrorBoundary } from "@/components/webgl-error-boundary";
import {
  PLAYBACK_DURATION,
  RS_KM,
  properTimeAt,
  remainingProperTime,
  tidalAcceleration,
  tidalStrain,
  progressAt,
  radiusAt,
  stageAt,
} from "@/utils/descent-physics";
import "@/app/styles/descent.css";

const PITCH_LIMIT = Math.PI / 2 - 0.01;

function clampPitch(pitch: number) {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch));
}

function Icon({
  kind,
}: {
  kind: "play" | "pause" | "reset" | "expand" | "arrow";
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      {kind === "play" && (
        <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none" />
      )}
      {kind === "pause" && <path d="M8 5v14M16 5v14" strokeWidth="3" />}
      {kind === "reset" && <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />}
      {kind === "expand" && <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />}
      {kind === "arrow" && <path d="M19 12H5m6-6-6 6 6 6" />}
    </svg>
  );
}

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function DescentSimulation() {
  const [progress, setProgress] = useState(0);
  const [seek, setSeek] = useState({ id: 0, progress: 0 });
  const seekTo = useCallback((next: number) => {
    setProgress(next);
    setSeek((previous) => ({ id: previous.id + 1, progress: next }));
  }, []);
  const [playing, setPlaying] = useState(false);
  const [music, setMusic] = useState(true);
  const musicAudio = useRef<HTMLAudioElement>(null);
  const [details, setDetails] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [yaw, setYaw] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [disk, setDisk] = useState(true);
  const [trackingPlanet, setTrackingPlanet] = useState(false);
  const [showEnding, setShowEnding] = useState(true);
  const [help, setHelp] = useState(false);
  const [clean, setClean] = useState(false);
  const [shipView, setShipView] = useState(false);
  const [dragging, setDragging] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const root = useRef<HTMLElement>(null);
  const radius = radiusAt(progress);
  const trackedAim = useMemo(
    () => (trackingPlanet ? planetView(radius) : null),
    [radius, trackingPlanet],
  );
  const viewYaw = trackedAim?.yaw ?? yaw;
  const viewPitch = trackedAim?.pitch ?? pitch;
  const heading =
    (Math.atan2(Math.sin(viewYaw), Math.cos(viewYaw)) * 180) / Math.PI;
  const lookingBehind = Math.cos(viewYaw) < 0;
  const releasePlanet = useCallback(() => {
    if (!trackedAim) return;
    setYaw(trackedAim.yaw);
    setPitch(trackedAim.pitch);
    setTrackingPlanet(false);
  }, [trackedAim]);
  const properTime = properTimeAt(radius);
  const timeLeft = remainingProperTime(radius);
  const strain = tidalStrain(radius);
  const inside = radius <= 1;
  const complete = progress >= 1;
  const stage = stageAt(radius);
  const togglePlaying = useCallback(() => {
    if (progress >= 1) {
      seekTo(0);
      setShowEnding(true);
    }
    // Begin/Resume must call play within the user gesture, especially in Safari.
    if (!playing && music && musicAudio.current) {
      if (progress >= 1) musicAudio.current.currentTime = 0;
      void musicAudio.current.play().catch(() => {});
    }
    setPlaying((p) => !p);
  }, [progress, playing, music, seekTo]);
  const reset = useCallback(() => {
    seekTo(0);
    setPlaying(false);
    setTrackingPlanet(false);
    setShowEnding(true);
    setYaw(0);
    setPitch(0);
  }, [seekTo]);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 650px)");
    const adapt = () => setShipView(!mobile.matches);
    adapt();
    mobile.addEventListener("change", adapt);
    return () => mobile.removeEventListener("change", adapt);
  }, []);

  useEffect(() => {
    if (!playing || music) return;
    let frame: number;
    let previous = performance.now();
    const tick = (now: number) => {
      const delta = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      setProgress((p) => Math.min(1, p + (delta * speed) / PLAYBACK_DURATION));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed, music]);
  useEffect(() => {
    if (complete) setPlaying(false);
  }, [complete]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHelp(false);
        setDetails(false);
      }
      if (
        event.target instanceof HTMLElement &&
        (event.target.isContentEditable ||
          ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName))
      )
        return;
      if (event.code === "Space") {
        // Keep native Space activation on controls; arrow-key looking still
        // works immediately after clicking Begin descent or another button.
        if (
          event.target instanceof HTMLElement &&
          !event.target.classList.contains("descent-look") &&
          ["BUTTON", "A"].includes(event.target.tagName)
        )
          return;
        event.preventDefault();
        togglePlaying();
      }
      if (event.key.toLowerCase() === "r") reset();
      if (event.key.toLowerCase() === "h") setClean((v) => !v);
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      )
        releasePlanet();
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setYaw((v) => v - 0.1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setYaw((v) => v + 0.1);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setPitch((v) => clampPitch(v + 0.1));
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setPitch((v) => clampPitch(v - 0.1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [togglePlaying, reset, releasePlanet]);

  return (
    <main
      ref={root}
      className={["descent-shell", inside && "is-inside", clean && "is-clean"]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="descent-header">
        <Link
          href="/"
          className="descent-back"
          aria-label="Back to Universe Lab"
        >
          <Icon kind="arrow" />
          <span>Universe Lab</span>
        </Link>
        <h1 className="descent-header-title">Event horizon</h1>
        <button
          className="descent-help"
          type="button"
          onClick={() => setHelp((v) => !v)}
          aria-expanded={help}
          aria-controls="descent-guide"
        >
          Flight guide <span>?</span>
        </button>
      </header>
      <div className="descent-window">
        <div className="descent-space">
          <WebGLErrorBoundary>
            <Canvas dpr={0.8} gl={{ antialias: false }}>
              <FlightView
                radius={radius}
                time={properTime}
                yaw={viewYaw}
                pitch={viewPitch}
                disk={disk}
              />
            </Canvas>
          </WebGLErrorBoundary>
        </div>
        <div className="descent-vignette" aria-hidden="true" />
        <div
          className="descent-stress"
          style={{ opacity: strain }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 1400 700"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M0 70 140 151 168 207 272 231 292 302M140 151 198 132 246 150M168 207 124 267 152 322M1400 100 1272 170 1214 270 1150 287 1120 380M1272 170 1258 116 1198 82M1214 270 1260 320 1252 382M1400 520 1301 460 1255 470M0 600 97 506 174 488" />
          </svg>
        </div>
        <button
          type="button"
          className="descent-look"
          aria-label="Spaceship viewport. Drag to look around, or focus here and use arrow keys."
          tabIndex={0}
          onPointerDown={(e) => {
            if (!e.isPrimary || e.button !== 0) return;
            releasePlanet();
            e.currentTarget.setPointerCapture(e.pointerId);
            pointer.current = { x: e.clientX, y: e.clientY };
            setDragging(true);
          }}
          onPointerMove={(e) => {
            if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
            // React may defer these updaters until after this handler returns.
            // Capture deltas now, before advancing the mutable pointer ref.
            const deltaX = e.clientX - pointer.current.x;
            const deltaY = e.clientY - pointer.current.y;
            pointer.current = { x: e.clientX, y: e.clientY };
            setYaw((v) => v - deltaX * 0.004);
            setPitch((v) => clampPitch(v + deltaY * 0.004));
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
            setDragging(false);
          }}
          onPointerCancel={() => setDragging(false)}
          onLostPointerCapture={() => setDragging(false)}
          style={{ cursor: dragging ? "grabbing" : "grab" }}
        />

        {shipView && !clean && (
          <FlightOverview
            radius={radius}
            time={properTime}
            disk={disk}
            playing={playing}
            onClose={() => setShipView(false)}
          />
        )}

        <div className="descent-reticle descent-hud" aria-hidden="true">
          <i />
          <span>+</span>
          <i />
        </div>
        <div className="descent-view-tools">
          <span className="descent-drag-hint">Drag to look around</span>
          <output
            className="descent-view-angle"
            aria-label="Camera orientation"
            aria-live="off"
          >
            {heading.toFixed(0)}° / {((viewPitch * 180) / Math.PI).toFixed(0)}°
          </output>
          <button
            type="button"
            onClick={() => {
              setTrackingPlanet(false);
              setYaw(0);
              setPitch(0);
            }}
          >
            Center view
          </button>
          <button
            type="button"
            onClick={() => {
              setTrackingPlanet(false);
              setYaw(lookingBehind ? 0 : Math.PI);
              setPitch(0);
            }}
          >
            Look {lookingBehind ? "ahead" : "behind"}
          </button>
          <button
            type="button"
            aria-pressed={trackingPlanet}
            title="Keep Aster, the enlarged reference planet, in view"
            onClick={() => {
              if (trackingPlanet) releasePlanet();
              else setTrackingPlanet(true);
            }}
          >
            {trackingPlanet ? "Release planet" : "Track planet"}
          </button>
          <button
            type="button"
            aria-pressed={shipView && !clean}
            onClick={() => {
              setClean(false);
              setShipView((v) => !v);
            }}
          >
            Ship view
          </button>
          <button
            type="button"
            aria-label="Toggle fullscreen"
            onClick={() => {
              if (document.fullscreenElement)
                void document.exitFullscreen().catch(() => {});
              else void root.current?.requestFullscreen?.().catch(() => {});
            }}
          >
            <Icon kind="expand" />
          </button>
        </div>
      </div>

      <section className={`descent-console ${details ? "is-expanded" : ""}`}>
        <div className="descent-console-top">
          <span>
            <i className={playing ? "is-active" : ""} /> {stage}
          </span>
          <button
            type="button"
            className="descent-details-toggle"
            aria-expanded={details}
            aria-controls="flight-readings"
            onClick={() => setDetails((v) => !v)}
          >
            {details ? "Less detail" : "Details"}
          </button>
          {inside && (
            <output
              className="descent-live-countdown"
              aria-label="Onboard time left to the singularity"
            >
              {timeLeft.toFixed(timeLeft < 1 ? 3 : 1)} s to center
            </output>
          )}
          <div className="descent-sky-credit">
            Sky:{" "}
            <a
              href="https://www.eso.org/public/images/eso0932a/"
              target="_blank"
              rel="noreferrer"
            >
              ESO/S. Brunier
            </a>
            {" · "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
          </div>
          <span className="descent-flight-status" aria-live="polite">
            {complete
              ? "Flight ended"
              : inside
                ? "Signal lost beyond the horizon"
                : playing
                  ? "Falling"
                  : "Paused"}
          </span>
        </div>
        <div className="descent-instruments" id="flight-readings">
          <div className="descent-readings-header">
            <h2>Flight readings</h2>
            <button
              type="button"
              aria-label="Close flight readings"
              onClick={() => setDetails(false)}
            >
              ×
            </button>
          </div>
          <div className="descent-instrument descent-radius">
            <span>Distance to center</span>
            <strong>
              {radius.toFixed(3)}
              <small>× horizon radius</small>
            </strong>
            <p className="descent-reading-hint">
              1× is the horizon. Below 1× is inside.
            </p>
            <p className="descent-reading-detail">
              The horizon's radius is {(RS_KM / 1_000_000).toFixed(2)} million
              km. This compares your radial coordinate with that radius, not the
              distance a ruler would measure in curved space.
            </p>
          </div>
          <div className="descent-instrument">
            <span>Time aboard</span>
            <strong>
              {clock(properTime)}
              <small>min:sec</small>
            </strong>
            <p className="descent-reading-hint">
              Time on your watch since the flight began.
            </p>
            <p className="descent-reading-detail">
              {Math.floor(properTime / 60)} minutes and{" "}
              {Math.floor(properTime % 60)} seconds have passed for you. Your
              watch ticks normally, even across the horizon. We stretch the
              playback near the center, so screen time and onboard time differ.
              The countdown in the status bar shows time still left.
            </p>
          </div>
          <div className="descent-instrument descent-tidal">
            <span>Head-to-feet pull</span>
            <strong>
              {tidalAcceleration(radius).toPrecision(3)}
              <small>m/s²</small>
            </strong>
            <p className="descent-reading-hint">
              Difference in gravity across a 2 m body.
            </p>
            <p className="descent-reading-detail">
              Your feet are pulled harder than your head when they point toward
              the center. This difference stretches you. Higher means stronger
              stretching; halving the radius makes it eight times stronger. This
              measures the difference in acceleration, not your speed.
            </p>
          </div>
          <div className="descent-stage">
            <h2 aria-live="polite">{stage}</h2>
            <p>
              {complete
                ? "The flight stops at extreme tidal forces. The singularity is still ahead."
                : radius <= 0.06
                  ? "Gravity stretches the ship lengthwise and squeezes it sideways. The last fraction of a second is slowed down."
                  : radius <= 0.35
                    ? "Tidal forces grow as 1/r³. Watch the rocket stretch in the chase view as the outside sky distorts."
                    : inside
                      ? "No flash. No wall. Your clock runs on, but no signal can escape."
                      : radius <= 1.5
                        ? "The horizon is ahead. Slow playback to watch the crossing."
                        : "Gravity carries you inward. Watch the starfield bend around the shadow."}
            </p>
          </div>
        </div>
        <div className="descent-transport">
          <button
            type="button"
            className="descent-play"
            onClick={togglePlaying}
          >
            <Icon kind={playing ? "pause" : "play"} />
            {playing
              ? "Pause"
              : complete
                ? "Fly again"
                : progress === 0
                  ? "Begin"
                  : "Resume"}
          </button>
          <button
            type="button"
            className="descent-reset"
            aria-label="Reset flight"
            title="Reset flight (R)"
            onClick={reset}
          >
            <Icon kind="reset" />
          </button>
          <div className="descent-timeline">
            <label htmlFor="flight-progress">
              <span>Flight progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </label>
            <div className="descent-range-wrap">
              <input
                id="flight-progress"
                type="range"
                min="0"
                max="1"
                step="0.0001"
                value={progress}
                aria-valuetext={`${radius.toFixed(3)} Schwarzschild radii. ${stage}`}
                onChange={(e) => {
                  seekTo(Number(e.target.value));
                  setPlaying(false);
                }}
              />
              <i
                className="descent-horizon-tick"
                style={{ left: `${progressAt(1) * 100}%` }}
              />
            </div>
            <div className="descent-timeline-labels">
              <span>Outside</span>
              <button
                className="descent-horizon-marker"
                style={{ left: `${progressAt(1) * 100}%` }}
                type="button"
                title="Jump to the event horizon: exactly 1 horizon radius"
                onClick={() => {
                  seekTo(progressAt(1));
                  setPlaying(false);
                }}
              >
                Event horizon
              </button>
              <span>Inside</span>
            </div>
          </div>
          <label className="descent-speed">
            <span>Speed</span>
            <select
              aria-label="Speed"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
            >
              <option value={0.1}>0.1×</option>
              <option value={0.25}>0.25×</option>
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={2}>2×</option>
              <option value={4}>4×</option>
            </select>
          </label>
          <FlightMusic
            playing={playing}
            progress={progress}
            speed={speed}
            enabled={music}
            seek={seek}
            audioRef={musicAudio}
            onEnabledChange={setMusic}
            onProgress={setProgress}
            onPlayingChange={setPlaying}
          />
        </div>
      </section>

      {complete && showEnding && (
        <section className="descent-ending" aria-label="Flight ending">
          <button
            type="button"
            className="descent-ending-close"
            aria-label="Explore the last frame"
            onClick={() => setShowEnding(false)}
          >
            ×
          </button>
          <h2>The horizon was only the beginning.</h2>
          <p>
            At {radius.toFixed(3)} rₛ, the acceleration difference across your
            body reaches {tidalAcceleration(radius).toFixed(0)} m/s². The model
            predicts just {timeLeft.toFixed(3)} seconds on your watch before
            reaching the central singularity.
          </p>
          <p className="descent-ending-note">
            We stop before the singularity. Ship deformation is illustrative;
            this is not a structural failure calculation.
          </p>
          <div className="descent-ending-actions">
            <button
              type="button"
              onClick={() => {
                seekTo(progressAt(1));
                setSpeed(1);
                setPlaying(true);
                setTrackingPlanet(true);
                setShowEnding(true);
                const view = planetView(1);
                setYaw(view.yaw);
                setPitch(view.pitch);
              }}
            >
              Replay the interior
            </button>
            <button type="button" onClick={reset}>
              New flight
            </button>
          </div>
        </section>
      )}

      {help && (
        <aside
          id="descent-guide"
          className="descent-guide"
          aria-label="Flight guide"
        >
          <button
            className="descent-guide-close"
            type="button"
            onClick={() => setHelp(false)}
            aria-label="Close flight guide"
          >
            ×
          </button>
          <h2>Your flight into a black hole</h2>
          <p>
            You are falling straight toward a non-rotating black hole with 4.3
            million times the Sun's mass. Drag to look around as you fall. The
            highlighted stage is where you are now.
          </p>
          <ol className="descent-guide-stages">
            <li aria-current={radius > 1.5 ? "step" : undefined}>
              <h3>Approach: watch the sky bend</h3>
              <p>
                Follow the Milky Way as it curves around the dark shadow.
                Gravity bends the light reaching your eyes. The bright arcs
                above and below the hole are bent views of the gas disk.
              </p>
              <p>
                Try Track planet to follow Aster's distorted image. Aster is a
                fictional, enlarged reference planet. Turn off the disk below to
                see the sky more clearly.
              </p>
            </li>
            <li aria-current={radius <= 1.5 && radius > 1 ? "step" : undefined}>
              <h3>The horizon: a point of no return</h3>
              <p>
                The marked line on the timeline is the crossing, at exactly one
                horizon radius. The shadow's visible edge is not that boundary.
                There is no solid surface or sudden flash to see.
              </p>
              <p>
                Watch the onboard clock: it keeps ticking. A distant observer
                would see your signals slow, redden, and fade as you approach.
              </p>
            </li>
            <li aria-current={inside && radius > 0.35 ? "step" : undefined}>
              <h3>Inside: look back at the universe</h3>
              <p>
                Choose Look behind. Light from outside can still reach you,
                although your signals can no longer escape. Every possible
                future path leads toward the center in this model.
              </p>
              <p>
                The countdown shows seconds left on your own watch to the
                singularity. Playback slows to let you explore. Ship view is a
                nearby camera falling with you, not a broadcast from outside.
              </p>
            </li>
            <li aria-current={radius <= 0.35 ? "step" : undefined}>
              <h3>Final descent: feel the tidal stretch</h3>
              <p>
                Open Ship view and watch Odyssey lengthen. Gravity pulls more
                strongly on the end nearer the center. The head-to-feet reading
                measures that difference across a two-meter body.
              </p>
              <p>
                The last onboard moments are greatly slowed. We stop before the
                singularity, where this classical model cannot describe what
                happens next.
              </p>
            </li>
          </ol>
          <label className="descent-disk-toggle">
            <input
              type="checkbox"
              checked={disk}
              onChange={(e) => setDisk(e.target.checked)}
            />
            Show accretion disk
          </label>
          <details className="descent-guide-limits">
            <summary>About this model</summary>
            <p>
              The trajectory, onboard time, and tidal readings use radial
              Schwarzschild free fall. Sky colors, disk brightness, exhaust, and
              ship deformation are illustrative. Spin and radiation damage are
              omitted. The renderer's limited resolution and ray steps can
              produce streaks or dark patches near the end; those are not
              predictions of a physical boundary.
            </p>
          </details>
          <h3>Explore further</h3>
          <a
            href="https://science.nasa.gov/universe/black-holes/supermassive-black-holes/new-nasa-black-hole-visualization-takes-viewers-beyond-the-brink/"
            target="_blank"
            rel="noreferrer"
          >
            NASA: a guided journey beyond the horizon ↗
          </a>
          <a
            href="https://jila.colorado.edu/~ajsh/insidebh/schw.html"
            target="_blank"
            rel="noreferrer"
          >
            JILA: light, clocks, and the view inside ↗
          </a>
        </aside>
      )}
    </main>
  );
}
