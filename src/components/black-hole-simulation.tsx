"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useState } from "react";
import { BlackHoleControls } from "@/components/black-hole/black-hole-controls";
import { LensedStarField } from "@/components/black-hole/lensed-star-field";
import { BoundedOrbitControls } from "@/components/bounded-orbit-controls";
import { WebGLErrorBoundary } from "@/components/webgl-error-boundary";
import {
  BH_CAMERA_DISTANCE,
  BH_CAMERA_FOV,
  BH_CAMERA_POSITION,
  BH_MAX_POLAR_ANGLE,
  SCHWARZSCHILD_KM_PER_SOLAR_MASS,
  SCHWARZSCHILD_SCALE,
} from "@/constants";
import {
  useBlackHoleMass,
  useBlackHoleQuality,
  useDiskSpeed,
  useLensingStrength,
  useShowDisk,
  useShowPhotonSphere,
} from "@/store/black-hole-store";
import { useIsCompactViewport } from "@/utils/device";

export function BlackHoleSimulation() {
  const mass = useBlackHoleMass();
  const showDisk = useShowDisk();
  const diskSpeed = useDiskSpeed();
  const showPhotonSphere = useShowPhotonSphere();
  const lensingStrength = useLensingStrength();
  const quality = useBlackHoleQuality();
  const isCompact = useIsCompactViewport();
  const [hudOpen, setHudOpen] = useState(false);

  const rs = mass * SCHWARZSCHILD_SCALE;
  const radiusKm = mass * SCHWARZSCHILD_KM_PER_SOLAR_MASS;
  const pixelRatio = quality === "low" ? 0.6 : quality === "high" ? 1 : 0.78;

  return (
    <WebGLErrorBoundary>
      <main className="black-hole-shell">
        <nav
          className="black-hole-topbar spacetime-topbar"
          aria-label="Simulation navigation"
        >
          <Link href="/" className="spacetime-back">
            <span aria-hidden="true">←</span>
            <span>Mission select</span>
          </Link>

          <div className="spacetime-mission-id">
            <span>02</span>
            <b>Extreme gravity</b>
          </div>
        </nav>

        <BlackHoleControls />

        <button
          type="button"
          className="spacetime-info-toggle"
          onClick={() => setHudOpen((open) => !open)}
          aria-expanded={hudOpen}
          aria-controls="black-hole-instructions"
          aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
        >
          {hudOpen ? "×" : "?"}
        </button>

        <section
          id="black-hole-instructions"
          className={
            hudOpen
              ? "black-hole-brief is-open spacetime-brief"
              : "black-hole-brief spacetime-brief"
          }
          aria-label="Simulation instructions"
        >
          <p className="spacetime-eyebrow">Interactive simulation</p>
          <h1>Black Hole</h1>
          <p className="spacetime-brief-copy">
            Orbit a Schwarzschild black hole and watch null geodesics form its
            shadow, photon ring, and lensed accretion disk.
          </p>

          <div className="spacetime-readout">
            <span>
              <b>{mass}</b>
              solar masses
            </span>
            <span>
              <b>{radiusKm.toFixed(1)} km</b>
              horizon radius
            </span>
          </div>

          <div className="spacetime-instructions">
            <div>
              <span className="spacetime-instruction-number">1</span>
              <p>
                <b>{isCompact ? "Drag to orbit" : "Rotate the view"}</b>
                The disk tilts; the shadow scale stays fixed
              </p>
            </div>
            <div>
              <span className="spacetime-instruction-number">2</span>
              <p>
                <b>Change the mass</b>
                Compare the shadow against the galaxy and stars
              </p>
            </div>
          </div>
        </section>

        <div
          className="black-hole-scale-key"
          role="img"
          aria-label="Black hole feature key"
        >
          <span>Black-hole shadow</span>
          <i aria-hidden="true" />
          <span>Ray-traced disk</span>
        </div>

        <section
          className="black-hole-canvas"
          aria-label="Interactive 3D black hole"
        >
          <Canvas
            camera={{
              position: BH_CAMERA_POSITION,
              fov: BH_CAMERA_FOV,
            }}
            gl={{ antialias: true }}
            dpr={pixelRatio}
          >
            <color attach="background" args={["#010204"]} />

            <BoundedOrbitControls
              isDragging={false}
              minDistance={BH_CAMERA_DISTANCE}
              maxDistance={BH_CAMERA_DISTANCE}
              enablePan={false}
              enableZoom={false}
              maxPolarAngle={BH_MAX_POLAR_ANGLE}
            />

            <LensedStarField
              rs={rs}
              lensingStrength={lensingStrength}
              showDisk={showDisk}
              diskSpeed={diskSpeed}
              showPhotonSphere={showPhotonSphere || !showDisk}
              quality={quality}
            />
          </Canvas>
        </section>

        <div
          className="black-hole-vignette spacetime-vignette"
          aria-hidden="true"
        />
        <div className="black-hole-grain spacetime-grain" aria-hidden="true" />
      </main>
    </WebGLErrorBoundary>
  );
}
