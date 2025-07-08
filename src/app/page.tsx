"use client";

import { Canvas } from "@react-three/fiber";
import { Stats } from "@react-three/drei";
import { Leva } from "leva";
import { CurvedGrid } from "@/components/curved-grid";
import { MassHandles } from "@/components/mass-handles";
import { Controls } from "@/components/controls";
import { BoundedOrbitControls } from "@/components/bounded-orbit-controls";
import { useMasses, useIsDragging } from "@/store/store";
import {
  GRID_SIZE,
  GRID_RESOLUTION,
  CAMERA_POSITION,
  CAMERA_FOV,
} from "@/constants";
import { useState } from "react";

export default function Home() {
  const masses = useMasses();
  const isDragging = useIsDragging();
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black">
      <Leva />
      <Controls />

      {/* HUD: bottom-left on mobile, top-left on md+ */}
      <div className="absolute bottom-4 left-4 z-10 rounded-md bg-gray-900/60 p-3 text-white backdrop-blur-sm md:top-4 md:left-4 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <h1 className="mb-2 text-2xl font-bold">Relativity Playground</h1>
        <div className="space-y-1 text-sm text-gray-300">
          <p>• Drag colored spheres to move them</p>
          <p>• Masses are measured in solar masses (0.5-10 M☉)</p>
          <p>• Click &ldquo;Add Mass&rdquo; button to add masses</p>
        </div>

        <div className="mt-4 space-y-1 text-xs text-gray-400">
          <h3 className="text-sm font-semibold text-gray-300">Navigation:</h3>
          <p>• Left click + drag: Rotate camera</p>
          <p>• Right click + drag: Pan camera</p>
          <p>• Scroll wheel: Zoom in/out</p>
        </div>

        <button
          className="mt-4 cursor-pointer rounded bg-gray-700 px-2 py-1 text-xs font-medium hover:bg-gray-600"
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
      >
        <BoundedOrbitControls isDragging={isDragging} />

        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

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
  );
}
