"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { type KeyboardEvent, type PointerEvent, useRef, useState } from "react";
import { LensedGalaxyField } from "@/components/lensing/lensed-galaxy-field";
import { LensingControls } from "@/components/lensing/lensing-controls";
import { WebGLErrorBoundary } from "@/components/webgl-error-boundary";
import { SOURCE_POSITION_LIMIT } from "@/constants";
import {
  useExternalShear,
  useHaloFraction,
  useLensMass,
  useLensSourceSize,
  useLensSourceX,
  useLensSourceY,
  useSetLensSourcePosition,
  useShowLensGalaxy,
  useShowLensGuides,
  useShowSubstructure,
  useStellarEllipticity,
} from "@/store/lensing-store";
import {
  getEinsteinAngle,
  getEinsteinRadius,
  getLensingRegime,
} from "@/utils/lensing-calculations";

function clamp(value: number) {
  return Math.max(
    -SOURCE_POSITION_LIMIT,
    Math.min(SOURCE_POSITION_LIMIT, value),
  );
}

export function LensingSimulation() {
  const lensMass = useLensMass();
  const sourceX = useLensSourceX();
  const sourceY = useLensSourceY();
  const sourceSize = useLensSourceSize();
  const stellarEllipticity = useStellarEllipticity();
  const haloFraction = useHaloFraction();
  const externalShear = useExternalShear();
  const showSubstructure = useShowSubstructure();
  const showLensGalaxy = useShowLensGalaxy();
  const showGuides = useShowLensGuides();
  const setSourcePosition = useSetLensSourcePosition();
  const isDragging = useRef(false);
  const [hudOpen, setHudOpen] = useState(false);

  const einsteinRadius = getEinsteinRadius(lensMass);
  const einsteinAngle = getEinsteinAngle(lensMass);
  const regime = getLensingRegime(
    sourceX,
    sourceY,
    stellarEllipticity,
    externalShear,
  );

  function moveSource(event: PointerEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const thetaX = ((event.clientX - centerX) * 2) / bounds.height;
    const thetaY = ((centerY - event.clientY) * 2) / bounds.height;
    setSourcePosition(thetaX / einsteinRadius, thetaY / einsteinRadius);
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    isDragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveSource(event);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (isDragging.current) moveSource(event);
  }

  function handlePointerEnd(event: PointerEvent<HTMLButtonElement>) {
    isDragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const step = event.shiftKey ? 0.1 : 0.03;
    const movement = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    }[event.key];

    if (!movement) return;
    event.preventDefault();
    setSourcePosition(
      clamp(sourceX + movement[0]),
      clamp(sourceY + movement[1]),
    );
  }

  return (
    <WebGLErrorBoundary>
      <main className="lensing-shell">
        <nav
          className="lensing-topbar spacetime-topbar"
          aria-label="Simulation navigation"
        >
          <Link href="/" className="spacetime-back">
            <span aria-hidden="true">←</span>
            <span>Mission select</span>
          </Link>

          <div className="spacetime-mission-id">
            <span>03</span>
            <b>Light</b>
          </div>

          <div className="spacetime-status">
            <span aria-hidden="true" />
            Online
          </div>
        </nav>

        <LensingControls />

        <button
          type="button"
          className="spacetime-info-toggle"
          onClick={() => setHudOpen((open) => !open)}
          aria-expanded={hudOpen}
          aria-controls="lensing-instructions"
          aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
        >
          {hudOpen ? "×" : "?"}
        </button>

        <section
          id="lensing-instructions"
          className={
            hudOpen
              ? "is-open lensing-brief spacetime-brief"
              : "lensing-brief spacetime-brief"
          }
          aria-label="Simulation instructions"
        >
          <p className="spacetime-eyebrow">Interactive simulation</p>
          <h1>Gravitational Lensing</h1>
          <p className="spacetime-brief-copy">
            Shoot light backward through an elliptical galaxy, its dark-matter
            halo, and nearby tidal gravity.
          </p>

          <div className="spacetime-readout">
            <span>
              <b>{einsteinAngle.toFixed(2)}″</b>
              Einstein angle
            </span>
            <span>
              <b>{Math.round(haloFraction * 100)}%</b>
              dark halo
            </span>
          </div>

          <div className="spacetime-instructions">
            <div>
              <span className="spacetime-instruction-number">1</span>
              <p>
                <b>Drag across the sky</b>
                Move the blue source behind the golden lens
              </p>
            </div>
            <div>
              <span className="spacetime-instruction-number">2</span>
              <p>
                <b>Find perfect alignment</b>
                Compare rings, four images, and fold arcs
              </p>
            </div>
          </div>
        </section>

        <div className="lensing-observation" aria-live="polite">
          <span>Ray-traced configuration</span>
          <b>{regime}</b>
        </div>

        <div
          className="lensing-scale-key"
          role="img"
          aria-label="Gravitational lensing color key"
        >
          <span>Extended mass</span>
          <i aria-hidden="true" />
          <span>Lensed source</span>
        </div>

        <section
          className="lensing-canvas"
          aria-label="Interactive gravitational lensing observation"
        >
          <Canvas gl={{ antialias: true }} dpr={[1, 1.5]}>
            <color attach="background" args={["#01030a"]} />
            <LensedGalaxyField
              einsteinRadius={einsteinRadius}
              sourceX={sourceX}
              sourceY={sourceY}
              sourceSize={sourceSize}
              stellarEllipticity={stellarEllipticity}
              haloFraction={haloFraction}
              externalShear={externalShear}
              showSubstructure={showSubstructure}
              showLensGalaxy={showLensGalaxy}
              showGuides={showGuides}
            />
          </Canvas>
        </section>

        <button
          type="button"
          className="lensing-drag-surface"
          aria-label="Move the background galaxy. Drag, or use arrow keys."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleKeyDown}
        />

        <div
          className="lensing-vignette spacetime-vignette"
          aria-hidden="true"
        />
        <div className="lensing-grain spacetime-grain" aria-hidden="true" />
      </main>
    </WebGLErrorBoundary>
  );
}
