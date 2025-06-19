"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { Leva } from "leva";
import { CurvedGrid } from "@/components/curved-grid";
import { MassHandles } from "@/components/mass-handles";
import { Controls } from "@/components/controls";
import { useMasses, useIsDragging } from "@/store/store";
import {
  GRID_SIZE,
  GRID_RESOLUTION,
  CAMERA_POSITION,
  CAMERA_FOV,
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_POLAR_ANGLE,
  CAMERA_PAN_BOUNDS,
  CAMERA_PAN_BOUNDS_Y,
} from "@/constants";
import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

function BoundedOrbitControls({ isDragging }: { isDragging: boolean }) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  // Clamp target and maintain relative camera offset
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const target = controls.target;

    const clampedX = Math.max(
      -CAMERA_PAN_BOUNDS,
      Math.min(CAMERA_PAN_BOUNDS, target.x),
    );
    const clampedZ = Math.max(
      -CAMERA_PAN_BOUNDS,
      Math.min(CAMERA_PAN_BOUNDS, target.z),
    );
    const clampedY = Math.max(
      -CAMERA_PAN_BOUNDS_Y,
      Math.min(CAMERA_PAN_BOUNDS_Y, target.y),
    );

    if (
      clampedX !== target.x ||
      clampedZ !== target.z ||
      clampedY !== target.y
    ) {
      const deltaX = target.x - clampedX;
      const deltaZ = target.z - clampedZ;
      const deltaY = target.y - clampedY;

      // Move target to clamped position
      target.set(clampedX, clampedY, clampedZ);

      // Move camera by same delta so relative view is preserved
      camera.position.set(
        camera.position.x - deltaX,
        camera.position.y - deltaY,
        camera.position.z - deltaZ,
      );
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={!isDragging}
      enableZoom={!isDragging}
      enableRotate={!isDragging}
      maxPolarAngle={CAMERA_MAX_POLAR_ANGLE}
      minDistance={CAMERA_MIN_DISTANCE}
      maxDistance={CAMERA_MAX_DISTANCE}
    />
  );
}

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
          className="mt-4 rounded bg-gray-700 px-2 py-1 text-xs font-medium"
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
          <Stats className="!fixed !bottom-4 !right-4 !top-auto !left-auto" />
        )}
      </Canvas>
    </div>
  );
}
