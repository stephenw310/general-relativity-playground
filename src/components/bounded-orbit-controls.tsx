"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  CAMERA_MIN_DISTANCE,
  CAMERA_MAX_DISTANCE,
  CAMERA_MAX_POLAR_ANGLE,
  CAMERA_PAN_BOUNDS,
} from "@/constants";

interface BoundedOrbitControlsProps {
  isDragging: boolean;
  minDistance?: number;
  maxDistance?: number;
  panBounds?: number;
  enablePan?: boolean;
}

export function BoundedOrbitControls({
  isDragging,
  minDistance = CAMERA_MIN_DISTANCE,
  maxDistance = CAMERA_MAX_DISTANCE,
  panBounds = CAMERA_PAN_BOUNDS,
  enablePan = true,
}: BoundedOrbitControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  // Clamp target and maintain relative camera offset; with
  // screenSpacePanning disabled, target.y stays on the plane by construction
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const target = controls.target;

    const clampedX = Math.max(-panBounds, Math.min(panBounds, target.x));
    const clampedZ = Math.max(-panBounds, Math.min(panBounds, target.z));

    if (clampedX !== target.x || clampedZ !== target.z) {
      const deltaX = target.x - clampedX;
      const deltaZ = target.z - clampedZ;

      // Move target to clamped position
      target.set(clampedX, target.y, clampedZ);

      // Move camera by same delta so relative view is preserved
      camera.position.set(
        camera.position.x - deltaX,
        camera.position.y,
        camera.position.z - deltaZ,
      );
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={enablePan && !isDragging}
      enableZoom={!isDragging}
      enableRotate={!isDragging}
      screenSpacePanning={false}
      maxPolarAngle={CAMERA_MAX_POLAR_ANGLE}
      minDistance={minDistance}
      maxDistance={maxDistance}
    />
  );
}
