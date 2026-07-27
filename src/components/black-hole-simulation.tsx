"use client";

import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { Leva } from "leva";
import { BoundedOrbitControls } from "@/components/bounded-orbit-controls";
import { WebGLErrorBoundary } from "@/components/webgl-error-boundary";
import { EventHorizon } from "@/components/black-hole/event-horizon";
import { AccretionDisk } from "@/components/black-hole/accretion-disk";
import { LensedStarField } from "@/components/black-hole/lensed-star-field";
import { BlackHoleControls } from "@/components/black-hole/black-hole-controls";
import {
  useBlackHoleMass,
  useShowDisk,
  useDiskSpeed,
  useShowPhotonSphere,
  useLensingStrength,
  useBlackHoleQuality,
} from "@/store/black-hole-store";
import {
  SCHWARZSCHILD_SCALE,
  BH_CAMERA_POSITION,
  BH_CAMERA_FOV,
  BH_CAMERA_MIN_DISTANCE,
  BH_CAMERA_MAX_DISTANCE,
  BH_MAX_POLAR_ANGLE,
  BH_STAR_COUNT_LOW,
  BH_STAR_COUNT_HIGH,
} from "@/constants";
import { useIsCompactViewport } from "@/utils/device";
import { useState } from "react";
import Link from "next/link";

export function BlackHoleSimulation() {
  const mass = useBlackHoleMass();
  const showDisk = useShowDisk();
  const diskSpeed = useDiskSpeed();
  const showPhotonSphere = useShowPhotonSphere();
  const lensingStrength = useLensingStrength();
  const quality = useBlackHoleQuality();

  const [showStats, setShowStats] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  // Collapsed on compact viewports until the user toggles it themselves
  const isCompact = useIsCompactViewport();
  const [levaToggled, setLevaToggled] = useState<boolean | null>(null);
  const levaCollapsed = levaToggled ?? isCompact;

  const rs = mass * SCHWARZSCHILD_SCALE;
  const starCount =
    quality === "low"
      ? BH_STAR_COUNT_LOW
      : quality === "high"
        ? BH_STAR_COUNT_HIGH
        : undefined; // auto: StarField picks by device

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

        <Leva
          collapsed={{ collapsed: levaCollapsed, onChange: setLevaToggled }}
        />
        <BlackHoleControls />

        {/* Mobile HUD toggle */}
        <button
          type="button"
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
          <h2 className="mb-3 font-bold text-xl md:text-2xl">Black Hole</h2>
          <div className="space-y-1 text-gray-200 text-sm">
            <p>• The black disk is the shadow — light that fell in</p>
            <p>• Background stars warp around the horizon</p>
            <p>• The disk&apos;s bright side spins toward you</p>
          </div>

          <div className="mt-4 pointer-coarse:hidden space-y-1 text-gray-300 text-xs">
            <h3 className="font-semibold text-gray-200 text-sm">Controls:</h3>
            <p>• Left click + drag: Orbit the black hole</p>
            <p>• Scroll wheel: Zoom in/out</p>
            <p>• Panel (top right): Mass, lensing, disk</p>
          </div>
          <div className="mt-4 pointer-coarse:block hidden space-y-1 text-gray-300 text-xs">
            <h3 className="font-semibold text-gray-200 text-sm">Controls:</h3>
            <p>• One finger drag: Orbit the black hole</p>
            <p>• Pinch: Zoom in/out</p>
            <p>• Panel (top right): Mass, lensing, disk</p>
          </div>

          <button
            type="button"
            className="mt-4 cursor-pointer rounded bg-gray-700/80 px-3 py-1.5 font-medium text-xs transition-colors hover:bg-gray-600/80"
            onClick={() => setShowStats((s) => !s)}
          >
            {showStats ? "Hide FPS" : "Show FPS"}
          </button>
        </div>

        <Canvas
          camera={{
            position: BH_CAMERA_POSITION,
            fov: BH_CAMERA_FOV,
          }}
          gl={{ antialias: true }}
          dpr={[1, 2]}
        >
          <BoundedOrbitControls
            isDragging={false}
            minDistance={BH_CAMERA_MIN_DISTANCE}
            maxDistance={BH_CAMERA_MAX_DISTANCE}
            enablePan={false}
            maxPolarAngle={BH_MAX_POLAR_ANGLE}
          />

          <LensedStarField
            rs={rs}
            lensingStrength={lensingStrength}
            starCount={starCount}
          />

          <EventHorizon rs={rs} showPhotonSphere={showPhotonSphere} />
          {showDisk && <AccretionDisk rs={rs} speed={diskSpeed} />}

          {showStats && (
            <Stats className="!fixed !top-auto !right-4 !bottom-4 !left-auto" />
          )}
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
