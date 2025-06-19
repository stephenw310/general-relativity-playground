"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Leva } from "leva";
import { CurvedGrid } from "@/components/curved-grid";
import { MassHandles } from "@/components/mass-handles";
import { Controls } from "@/components/controls";
import { useMasses, useWarpStrength, useIsDragging } from "@/store/store";
import {
  GRID_SIZE,
  GRID_RESOLUTION,
  CAMERA_POSITION,
  CAMERA_FOV,
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_POLAR_ANGLE,
} from "@/constants";

export default function Home() {
  const masses = useMasses();
  const warpStrength = useWarpStrength();
  const isDragging = useIsDragging();

  return (
    <div className="h-screen w-full bg-gradient-to-b from-gray-900 to-black">
      <Leva />
      <Controls />

      <div className="absolute top-4 left-4 z-10 text-white">
        <h1 className="mb-2 text-2xl font-bold">Relativity Playground</h1>
        <div className="space-y-1 text-sm text-gray-300">
          <p>• Drag colored spheres to move them</p>
          <p>• Change warp strength to see how it affects the grid</p>
          <p>• Click &ldquo;Add Mass&rdquo; button to add masses</p>
        </div>

        <div className="mt-4 space-y-1 text-xs text-gray-400">
          <h3 className="text-sm font-semibold text-gray-300">Navigation:</h3>
          <p>• Left click + drag: Rotate camera</p>
          <p>• Right click + drag: Pan camera</p>
          <p>• Scroll wheel: Zoom in/out</p>
        </div>
      </div>

      <Canvas
        camera={{
          position: CAMERA_POSITION,
          fov: CAMERA_FOV,
        }}
        gl={{ antialias: true }}
      >
        <OrbitControls
          enablePan={!isDragging}
          enableZoom={!isDragging}
          enableRotate={!isDragging}
          maxPolarAngle={CAMERA_MAX_POLAR_ANGLE}
          minDistance={CAMERA_MIN_DISTANCE}
          maxDistance={CAMERA_MAX_DISTANCE}
        />

        <ambientLight intensity={0.3} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />

        <CurvedGrid
          masses={masses}
          warpStrength={warpStrength}
          gridSize={GRID_SIZE}
          gridResolution={GRID_RESOLUTION}
        />

        <MassHandles masses={masses} />
      </Canvas>
    </div>
  );
}
