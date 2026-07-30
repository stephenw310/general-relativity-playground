"use client";

import { ScreenQuad } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { ShaderMaterial, Vector3 } from "three";
import type { BlackHoleQuality } from "@/types";
import {
  lensFragmentShader,
  lensVertexShader,
} from "@/utils/black-hole-shaders";

interface LensedStarFieldProps {
  /** Schwarzschild radius in world units */
  rs: number;
  lensingStrength: number;
  showDisk: boolean;
  diskSpeed: number;
  showPhotonSphere: boolean;
  quality: BlackHoleQuality;
}

const cameraRight = new Vector3();
const cameraUp = new Vector3();
const cameraForward = new Vector3();

export function LensedStarField({
  rs,
  lensingStrength,
  showDisk,
  diskSpeed,
  showPhotonSphere,
  quality,
}: LensedStarFieldProps) {
  const { size } = useThree();

  const lensMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uCameraPosition: { value: new Vector3() },
          uCameraRight: { value: new Vector3(1, 0, 0) },
          uCameraUp: { value: new Vector3(0, 1, 0) },
          uCameraForward: { value: new Vector3(0, 0, -1) },
          uAspect: { value: 1 },
          uTanHalfFov: { value: Math.tan(Math.PI / 6) },
          uTime: { value: 0 },
          uDiskSpeed: { value: 1 },
          uLensingStrength: { value: 1 },
          uShowDisk: { value: 1 },
          uShowPhotonSphere: { value: 0 },
          uMaxSteps: { value: 112 },
        },
        vertexShader: lensVertexShader,
        fragmentShader: lensFragmentShader,
        depthWrite: false,
        depthTest: false,
      }),
    [],
  );

  useEffect(() => {
    return () => lensMaterial.dispose();
  }, [lensMaterial]);

  useFrame((state) => {
    const { camera, clock } = state;
    cameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
    cameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    cameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);

    const uniforms = lensMaterial.uniforms;
    uniforms.uCameraPosition.value.copy(camera.position).divideScalar(rs);
    uniforms.uCameraRight.value.copy(cameraRight);
    uniforms.uCameraUp.value.copy(cameraUp);
    uniforms.uCameraForward.value.copy(cameraForward);
    uniforms.uAspect.value = size.width / size.height;
    const fov = "fov" in camera ? camera.fov : 60;
    uniforms.uTanHalfFov.value = Math.tan((fov * Math.PI) / 360);
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uDiskSpeed.value = diskSpeed;
    uniforms.uLensingStrength.value = lensingStrength;
    uniforms.uShowDisk.value = showDisk ? 1 : 0;
    uniforms.uShowPhotonSphere.value = showPhotonSphere ? 1 : 0;
    uniforms.uMaxSteps.value =
      quality === "low" ? 112 : quality === "high" ? 192 : 144;
  });

  return (
    <ScreenQuad renderOrder={-1} frustumCulled={false}>
      <primitive object={lensMaterial} attach="material" />
    </ScreenQuad>
  );
}
