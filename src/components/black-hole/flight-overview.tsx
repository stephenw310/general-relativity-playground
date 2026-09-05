"use client";

import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { memo, useEffect, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { FlightView } from "@/components/black-hole/flight-view";
import { OdysseyShip } from "@/components/black-hole/odyssey-ship";
import { WebGLErrorBoundary } from "@/components/webgl-error-boundary";
import { remainingProperTime } from "@/utils/descent-physics";

const ANGLES = {
  Chase: [7, 4, 11],
  Port: [-11, 3, 1],
  Bow: [6, 4, -10],
} as const;
type Angle = keyof typeof ANGLES;

function ChaseControls({ angle, reset }: { angle: Angle; reset: number }) {
  const { camera, size } = useThree();
  const controls = useRef<OrbitControlsImpl>(null);
  useEffect(() => {
    // Reset also lets a selected preset restore its view after manual orbiting.
    if (reset < 0) return;
    const [x, y, z] = ANGLES[angle];
    // A tall expanded inset needs more distance to fit the hull and exhaust.
    const fit = Math.max(1, (1.2 * size.height) / size.width);
    camera.position.set(x * fit, y * fit, z * fit);
    camera.lookAt(0, 0, 1);
    controls.current?.target.set(0, 0, 1);
    controls.current?.update();
  }, [angle, reset, camera, size.width, size.height]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={7}
      maxDistance={40}
      target={[0, 0, 1]}
      enableDamping
      dampingFactor={0.12}
    />
  );
}

// EnvironmentPortal captures six cube faces whenever its children change.
// Keep the lighting tree stable while flight telemetry updates.
const ShipLighting = memo(function ShipLighting() {
  return (
    <>
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={0.65}
          color="#d8e8f5"
          scale={[10, 8, 1]}
          position={[0, 6, 1]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#fbd5ab"
          scale={[8, 5, 1]}
          position={[-6, 1, -4]}
          rotation={[0, Math.PI / 2, 0]}
        />
        <Lightformer
          form="rect"
          intensity={0.7}
          color="#b5d9ff"
          scale={[5, 5, 1]}
          position={[6, 2, 3]}
          rotation={[0, -Math.PI / 2, 0]}
        />
      </Environment>
      <ambientLight intensity={0.55} color="#afc5e0" />
      <directionalLight
        position={[-5, 4, -8]}
        color="#ffd0a0"
        intensity={2.2}
      />
      <directionalLight position={[5, 3, 6]} color="#adceff" intensity={1.3} />
      <directionalLight
        position={[-3, -4, 2]}
        color="#6689ad"
        intensity={0.65}
      />
    </>
  );
});

const SHIP_CAMERA = {
  position: [7, 4, 11] as [number, number, number],
  fov: 46,
  near: 0.1,
  far: 100,
};
const SHIP_DPR: [number, number] = [1, 1.5];
const SHIP_GL = { antialias: true };

export function FlightOverview({
  radius,
  time,
  disk,
  playing,
  onClose,
}: {
  radius: number;
  time: number;
  disk: boolean;
  playing: boolean;
  onClose: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [angle, setAngle] = useState<Angle>("Chase");
  const [reset, setReset] = useState(0);
  const inside = radius <= 1;
  const timeLeft = remainingProperTime(radius);
  useEffect(() => {
    if (!expanded) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [expanded]);

  return (
    <aside
      className={["descent-overview", expanded && "is-expanded"]
        .filter(Boolean)
        .join(" ")}
      aria-label="Live 3D ship view"
    >
      <header>
        <span>Odyssey</span>
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Reduce ship view" : "Enlarge ship view"}
            aria-pressed={expanded}
          >
            {expanded ? "↑" : "↗"}
          </button>
          <button type="button" onClick={onClose} aria-label="Close ship view">
            ×
          </button>
        </div>
      </header>
      <div
        className="descent-chase-canvas"
        role="img"
        aria-label={`Rendered spacecraft in free fall at ${radius.toFixed(3)} horizon radii. Drag to orbit the virtual camera.`}
      >
        <WebGLErrorBoundary
          fallback={
            <div className="descent-chase-unavailable">
              The 3D camera needs WebGL. Try reopening this page in a browser
              with graphics acceleration.
            </div>
          }
        >
          <Canvas dpr={SHIP_DPR} camera={SHIP_CAMERA} gl={SHIP_GL}>
            <FlightView radius={radius} time={time} disk={disk} sceneCamera />
            <ShipLighting />
            <OdysseyShip radius={radius} playing={playing} />
            <ChaseControls angle={angle} reset={reset} />
          </Canvas>
        </WebGLErrorBoundary>
        <span className="descent-chase-hint">
          Drag to orbit · scroll to zoom
        </span>
      </div>
      <fieldset className="descent-chase-angles" aria-label="Ship camera angle">
        {(Object.keys(ANGLES) as Angle[]).map((value) => (
          <button
            type="button"
            key={value}
            aria-pressed={angle === value}
            onClick={() => {
              setAngle(value);
              setReset((n) => n + 1);
            }}
          >
            {value}
          </button>
        ))}
      </fieldset>
      <div className="descent-overview-readout">
        <span>{inside ? "Inside the horizon" : "Free fall"}</span>
        <b>{radius.toFixed(3)} rₛ</b>
      </div>
      <p>
        {inside
          ? `${timeLeft.toFixed(timeLeft < 1 ? 3 : 1)} seconds left on your watch before the central singularity.`
          : "Virtual camera falling alongside your ship."}
      </p>
    </aside>
  );
}
