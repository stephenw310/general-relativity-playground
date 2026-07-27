"use client";

import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { Leva } from "leva";
import { CurvedGrid } from "@/components/curved-grid";
import { MassHandles } from "@/components/mass-handles";
import { Controls } from "@/components/controls";
import { BoundedOrbitControls } from "@/components/bounded-orbit-controls";
import { StarField } from "@/components/star-field";
import { WebGLErrorBoundary } from "@/components/webgl-error-boundary";
import { useMasses, useIsDragging } from "@/store/store";
import {
  GRID_SIZE,
  GRID_RESOLUTION,
  CAMERA_POSITION,
  CAMERA_FOV,
} from "@/constants";
import { isCompactViewport } from "@/utils/device";
import { useState } from "react";
import Link from "next/link";

export function SpacetimeSimulation() {
  const masses = useMasses();
  const isDragging = useIsDragging();
  const [showStats, setShowStats] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  // Leva renders in a client-only portal, so reading media queries for its
  // initial state cannot cause a hydration mismatch
  const [levaCollapsed] = useState(isCompactViewport);

  return (
    <WebGLErrorBoundary>
      <div className="h-screen w-full bg-black">
        {/* Navigation Bar */}
        <nav className="absolute top-0 left-0 z-20 w-full bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center justify-between px-6 py-3">
            <Link
              href="/"
              className="flex items-center space-x-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-blue-800 focus:outline-none"
            >
              <span>←</span>
              <span>Back to Home</span>
            </Link>
          </div>
        </nav>

        <Leva collapsed={levaCollapsed} />
        <Controls />

        {/* Mobile HUD toggle */}
        <button
          className="absolute bottom-4 left-4 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-800/60 text-lg text-white backdrop-blur-md md:hidden"
          onClick={() => setHudOpen((o) => !o)}
          aria-expanded={hudOpen}
          aria-label={hudOpen ? "Hide instructions" : "Show instructions"}
        >
          {hudOpen ? "×" : "?"}
        </button>

        {/* HUD: collapsible bottom sheet on mobile, always visible top-left on md+ */}
        <div
          className={`absolute bottom-16 left-4 z-10 h-fit max-w-[calc(100vw-2rem)] rounded-md bg-gray-800/25 p-4 text-white backdrop-blur-md md:top-20 md:bottom-auto md:left-4 md:block md:max-w-sm ${
            hudOpen ? "block" : "hidden"
          }`}
        >
          <h2 className="mb-3 text-xl font-bold md:text-2xl">
            Relativity Playground
          </h2>
          <div className="space-y-1 text-sm text-gray-200">
            <p className="pointer-coarse:hidden">
              • Drag cosmic objects to move them in spacetime
            </p>
            <p className="hidden pointer-coarse:block">
              • Touch and drag cosmic objects to move them
            </p>
            <p>• Choose from realistic stellar types with preset masses</p>
            <p>• Watch how massive objects warp the fabric of space</p>
          </div>

          <div className="mt-4 space-y-1 text-xs text-gray-300 pointer-coarse:hidden">
            <h3 className="text-sm font-semibold text-gray-200">Controls:</h3>
            <p>• Left click + drag: Rotate view</p>
            <p>• Right click + drag: Pan camera</p>
            <p>• Scroll wheel: Zoom in/out</p>
          </div>
          <div className="mt-4 hidden space-y-1 text-xs text-gray-300 pointer-coarse:block">
            <h3 className="text-sm font-semibold text-gray-200">Controls:</h3>
            <p>• One finger drag: Rotate view</p>
            <p>• Two finger drag: Pan camera</p>
            <p>• Pinch: Zoom in/out</p>
          </div>

          <button
            className="mt-4 cursor-pointer rounded bg-gray-700/80 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-gray-600/80"
            onClick={() => setShowStats((s) => !s)}
          >
            {showStats ? "Hide FPS" : "Show FPS"}
          </button>
        </div>

        <Canvas
          camera={{
            position: CAMERA_POSITION,
            fov: CAMERA_FOV,
          }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <BoundedOrbitControls isDragging={isDragging} />

          <StarField />

          <ambientLight intensity={0.1} />
          <directionalLight position={[10, 10, 5]} intensity={0.6} />

          <CurvedGrid
            masses={masses}
            gridSize={GRID_SIZE}
            gridResolution={GRID_RESOLUTION}
          />

          <MassHandles masses={masses} />

          {showStats && (
            <Stats className="!fixed !top-auto !right-4 !bottom-4 !left-auto" />
          )}
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
