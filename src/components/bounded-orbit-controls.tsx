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
  CAMERA_PAN_BOUNDS_Y,
} from "@/constants";

interface BoundedOrbitControlsProps {
  isDragging: boolean;
}

export function BoundedOrbitControls({
  isDragging,
}: BoundedOrbitControlsProps) {
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
