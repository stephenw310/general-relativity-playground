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
  FLIGHT_CHAPTERS,
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
  const [playing, setPlaying] = useState(false);
  const [music, setMusic] = useState(true);
  const musicAudio = useRef<HTMLAudioElement>(null);
  const [details, setDetails] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [yaw, setYaw] = useState(-0.35);
  const [pitch, setPitch] = useState(0);
  const [disk, setDisk] = useState(true);
  const [trackingPlanet, setTrackingPlanet] = useState(false);
  const [showEnding, setShowEnding] = useState(true);
  const [help, setHelp] = useState(false);
  const [clean, setClean] = useState(false);
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
      setProgress(0);
      setShowEnding(true);
    }
    // Begin/Resume must call play within the user gesture, especially in Safari.
    if (!playing && music && musicAudio.current) {
      if (progress >= 1) musicAudio.current.currentTime = 0;
      void musicAudio.current.play().catch(() => {});
    }
    setPlaying((p) => !p);
  }, [progress, playing, music]);
  const reset = useCallback(() => {
    setProgress(0);
    setPlaying(false);
    setTrackingPlanet(false);
    setShowEnding(true);
    setYaw(-0.35);
    setPitch(0);
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
      if (event.key === "Escape") setHelp(false);
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
        <Link href="/" className="descent-back">
          <Icon kind="arrow" />
          <span>Mission select</span>
        </Link>
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

        <section className="descent-title descent-hud">
          <h1>{inside ? "Beyond the horizon" : "Event horizon"}</h1>
          <p className="descent-subtitle">
            {inside
              ? "Outside light still reaches you."
              : "4.3 million solar masses. A non-rotating black hole."}
          </p>
          <button
            type="button"
            className="descent-planet-button"
            aria-pressed={trackingPlanet}
            onClick={() => {
              if (trackingPlanet) releasePlanet();
              else setTrackingPlanet(true);
            }}
          >
            <span className="descent-planet-icon" aria-hidden="true" />
            <span>
              <b>{trackingPlanet ? "Stop tracking Aster" : "Track Aster ↗"}</b>
              <small>Reference planet · enlarged</small>
            </span>
          </button>
          {inside && (
            <div className="descent-countdown">
              <span>Time left to the singularity</span>
              <strong>
                {timeLeft.toFixed(timeLeft < 1 ? 3 : 1)}
                <small> s aboard</small>
              </strong>
              <p>
                Predicted onboard seconds to the center. Playback is slowed.
              </p>
            </div>
          )}
        </section>
        <FlightOverview
          radius={radius}
          time={properTime}
          disk={disk}
          playing={playing}
        />

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
          <button type="button" onClick={() => setClean((v) => !v)}>
            {clean ? "Show" : "Hide"} panels
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
              The countdown in the sky shows time still left.
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
                        : "Engines off. Gravity carries you inward. The starfield bends around the shadow."}
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
                  setProgress(Number(e.target.value));
                  setPlaying(false);
                }}
              />
              {FLIGHT_CHAPTERS.slice(0, -1).map((chapter) => (
                <i
                  key={chapter.end}
                  style={{ left: `${progressAt(chapter.end) * 100}%` }}
                />
              ))}
            </div>
            <div className="descent-timeline-labels">
              <span>6 rₛ</span>
              <button
                type="button"
                onClick={() => {
                  setProgress(progressAt(1.12));
                  setSpeed(0.25);
                  setPlaying(false);
                }}
              >
                Horizon ↓
              </button>
              <button
                type="button"
                onClick={() => {
                  setProgress(progressAt(0.35));
                  setSpeed(1);
                  setPlaying(false);
                  setTrackingPlanet(true);
                  setShowEnding(true);
                  const view = planetView(0.35);
                  setYaw(view.yaw);
                  setPitch(view.pitch);
                }}
              >
                Interior ↓
              </button>
              <span>0.015 rₛ</span>
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
                setProgress(progressAt(1));
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
          <h2>A boundary in spacetime.</h2>
          <p>
            You are in radial free fall toward a non-rotating black hole. One rₛ
            is the horizon radius. The dark shadow you see is an optical effect,
            not the surface of the horizon.
          </p>
          <p>
            Press Begin descent, then drag the window or use the arrow keys to
            look around, even while falling. This turns your view; the ship
            continues along its free-fall path. Click Horizon on the timeline to
            jump just outside it at 0.25× speed. Resume to cross slowly.
          </p>
          <h3>A planet and a view from outside</h3>
          <p>
            Aster is a fictional distant planet with exaggerated apparent size,
            added as a recognizable reference. Its image is bent by the same ray
            tracer as the stars. Use Track Aster to keep its lensed image
            centered. Dragging or using arrow keys returns to manual looking. It
            is not orbiting inside the accretion disk.
          </p>
          <p>
            The inset renders Odyssey in real time from a virtual camera falling
            alongside it. Drag to orbit the ship, scroll to zoom, or enlarge the
            view. It shares your descent time and sky. This is a local chase
            view, not a transmission to someone outside the black hole. An
            outside observer cannot receive a signal sent from inside.
          </p>
          <p>
            The Milky Way panorama is a photograph by ESO/S. Brunier, adapted
            with exposure and gravitational lensing. Its orientation is chosen
            to make the bending visible, not to reconstruct the sky at the
            Galactic center. Individual distant stars are effectively points;
            lensing changes their positions, brightness, and image count.
            Extended objects such as the Milky Way and Aster show clearer arcs.
            Thin streaks can also be texture sampling artifacts.
          </p>
          <h3>What does the countdown mean?</h3>
          <p>
            "Time left to the singularity" counts down the seconds you would
            experience before reaching the black hole's center on this path.
            Physicists write this center as r = 0. It is where this classical
            model predicts a singularity and stops describing what happens next.
            A reading of 6.2 seconds means 6.2 seconds left on your watch, even
            if the slowed playback takes much longer. It is a model prediction,
            not a timer for how long the ship would survive.
          </p>
          <h3>Whose clock stops?</h3>
          <p>
            Your clock keeps ticking normally as you cross. A distant observer
            receives your signals increasingly spread out and redshifted. You
            appear to slow and fade from view, rather than remain a visible
            frozen ship forever. No signal sent at or inside the horizon can
            reach them.
          </p>
          <p>
            Crossing does not switch off the outside sky. Light can still reach
            you from outside, with its direction, color, and brightness changed.
            Turn the camera to look behind you. Inside this non-rotating black
            hole, every future-directed path continues toward smaller radius.
          </p>
          <h3>How this differs from the JILA movie</h3>
          <p>
            Hamilton's main movie follows a path with sideways motion. Our ship
            falls straight inward. Near the singularity, that difference changes
            the apparent shape and concentration of the sky. See the radial
            “Dive to the singularity” example on the JILA page for the closer
            comparison. Our colors and brightness do not include the full
            frequency shifts in that reference.
          </p>
          <p>
            The blocky slivers in the last frames are rendering artifacts. The
            sky has finite resolution, and the ray tracer stops after a limited
            number of steps. A dark pixel can mean either no background light
            was found or the numerical search ended. The final image is
            illustrative, not a validated prediction of the exact view.
          </p>
          <h3>Music and display</h3>
          <p>
            "Far side of light" is an original instrumental generated with
            ElevenLabs Music on fal.ai. It begins with spacious organ and piano,
            turns dark at the horizon, then builds with the tidal forces. Music
            is on by default when you begin. It follows pause, reset, and
            chapter jumps. The 3 minute, 10 second score was generated at its
            full length and plays at normal speed without stretching or looping.
            Changing playback speed stretches the music while preserving its
            pitch, so the horizon and tidal cues stay aligned. The flight waits
            for audio when it buffers.
          </p>
          <label className="descent-disk-toggle">
            <input
              type="checkbox"
              checked={disk}
              onChange={(e) => setDisk(e.target.checked)}
            />
            Show accretion disk
          </label>
          <h3>What this model calculates</h3>
          <p>
            The ship follows radial free fall from rest at infinity, already
            moving inward when playback begins at 6 rₛ. The onboard clock and
            tidal readout follow that Schwarzschild model. The playback controls
            compress or stretch the presentation time; they do not make your
            local clock stop.
          </p>
          <p>
            Light paths are numerically approximated in coordinates that work
            across the horizon. The renderer has a limited number of steps and
            has not been validated against a reference ray tracer. Disk colors,
            brightness, and motion are illustrative: they do not fully account
            for the falling observer's frequency shifts or light travel times.
            Spin, gas dynamics, and radiation damage are omitted. The flight
            continues to 0.015 rₛ with progressively slower presentation time.
            The rocket exhaust is decorative and does not change the free-fall
            path. Cracks and rocket stretching illustrate tidal stress; the
            exact failure of a spacecraft is not calculated. We do not depict
            the singularity or anything beyond it.
          </p>
          <a
            href="https://science.nasa.gov/universe/black-holes/supermassive-black-holes/new-nasa-black-hole-visualization-takes-viewers-beyond-the-brink/"
            target="_blank"
            rel="noreferrer"
          >
            Explore the science at NASA ↗
          </a>
          <a
            href="https://jila.colorado.edu/~ajsh/insidebh/schw.html"
            target="_blank"
            rel="noreferrer"
          >
            See a physicist's inside view at JILA ↗
          </a>
        </aside>
      )}
    </main>
  );
}
