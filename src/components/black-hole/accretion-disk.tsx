"use client";

import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, Mesh, ShaderMaterial } from "three";
import { DISK_INNER_FACTOR, DISK_OUTER_FACTOR } from "@/constants";
import {
  diskVertexShader,
  diskFragmentShader,
} from "@/utils/black-hole-shaders";

interface AccretionDiskProps {
  /** Schwarzschild radius in world units */
  rs: number;
  speed: number;
}

export function AccretionDisk({ rs, speed }: AccretionDiskProps) {
  const meshRef = useRef<Mesh>(null);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uInner: { value: DISK_INNER_FACTOR },
          uOuter: { value: DISK_OUTER_FACTOR },
          uSpeed: { value: 1 },
          uCamAzimuth: { value: 0 },
        },
        vertexShader: diskVertexShader,
        fragmentShader: diskFragmentShader,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  );

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uSpeed.value = speed;
    // Azimuth of the camera in the disk plane (local XY maps to world XZ
    // via the -pi/2 rotation), used for Doppler beaming
    const cam = state.camera.position;
    material.uniforms.uCamAzimuth.value = Math.atan2(-cam.z, cam.x);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} scale={rs}>
      <ringGeometry args={[DISK_INNER_FACTOR, DISK_OUTER_FACTOR, 128, 8]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
