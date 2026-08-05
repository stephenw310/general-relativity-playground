"use client";

import { Canvas } from "@react-three/fiber";
import Link from "next/link";
import { useState } from "react";
import { BoundedOrbitControls } from "@/components/bounded-orbit-controls";
import { Controls } from "@/components/controls";
import { CurvedGrid } from "@/components/curved-grid";
import { MassHandles } from "@/components/mass-handles";
import { StarField } from "@/components/star-field";
import { WebGLErrorBoundary } from "@/components/webgl-error-boundary";
import {
  CAMERA_FOV,
  CAMERA_POSITION,
  GRID_RESOLUTION,
  GRID_SIZE,
} from "@/constants";
import { useIsDragging, useMasses } from "@/store/store";
import { useIsCompactViewport } from "@/utils/device";

export function SpacetimeSimulation() {
  const masses = useMasses();
  const isDragging = useIsDragging();
  const [hudOpen, setHudOpen] = useState(false);
  const isCompact = useIsCompactViewport();
  const totalMass = masses.reduce((total, mass) => total + mass.mass, 0);

  return (
    <WebGLErrorBoundary>
      <main className="spacetime-shell">
        <nav className="spacetime-topbar" aria-label="Simulation navigation">
          <Link href="/" className="spacetime-back">
            <span aria-hidden="true">←</span>
            <span>Mission select</span>
          </Link>

          <div className="spacetime-mission-id">
            <span>01</span>
            <b>Geometry</b>
          </div>
        </nav>

        <Controls />

        <button
          type="button"
          className="spacetime-info-toggle"
          onClick={() => setHudOpen((open) => !open)}
          aria-expanded={hudOpen}
          aria-controls="spacetime-instructions"
          aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
        >
          {hudOpen ? "×" : "?"}
        </button>

        <section
          id="spacetime-instructions"
          className={hudOpen ? "is-open spacetime-brief" : "spacetime-brief"}
          aria-label="Simulation instructions"
        >
          <p className="spacetime-eyebrow">Interactive simulation</p>
          <h1>Spacetime Curvature</h1>
          <p className="spacetime-brief-copy">
            Move objects across the field, change their mass, and see how
            spacetime responds.
          </p>

          <div className="spacetime-readout">
            <span>
              <b>{masses.length}</b>
              {masses.length === 1 ? "object" : "objects"}
            </span>
            <span>
              <b>{totalMass.toFixed(1)}</b>
              solar masses total
            </span>
          </div>

          <div className="spacetime-instructions">
            <div>
              <span className="spacetime-instruction-number">1</span>
              <p>
                <b>{isCompact ? "Touch and drag" : "Move an object"}</b>
                Drag it across the field
              </p>
            </div>
            <div>
              <span className="spacetime-instruction-number">2</span>
              <p>
                <b>{isCompact ? "Drag the field" : "Rotate the view"}</b>
                Explore the curve from every angle
              </p>
            </div>
          </div>
        </section>

        <div
          className="spacetime-depth-key"
          role="img"
          aria-label="Curvature depth key"
        >
          <span>Curvature</span>
          <i aria-hidden="true" />
          <span>Deep</span>
        </div>

        <section
          className="spacetime-canvas"
          aria-label="Interactive 3D spacetime"
        >
          <Canvas
            camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
            gl={{ antialias: true }}
            dpr={[1, 2]}
          >
            <color attach="background" args={["#03050a"]} />
            <fog attach="fog" args={["#03050a", 18, 48]} />

            <BoundedOrbitControls isDragging={isDragging} />
            <StarField />

            <ambientLight intensity={0.16} />
            <directionalLight
              position={[8, 14, 6]}
              intensity={0.8}
              color="#c6d4ff"
            />

            <CurvedGrid
              masses={masses}
              gridSize={GRID_SIZE}
              gridResolution={GRID_RESOLUTION}
            />
            <MassHandles masses={masses} />
          </Canvas>
        </section>

        <div className="spacetime-vignette" aria-hidden="true" />
        <div className="spacetime-grain" aria-hidden="true" />
      </main>
    </WebGLErrorBoundary>
  );
}
